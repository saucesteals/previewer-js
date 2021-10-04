import BigNumber from "bignumber.js";
import { MessageEmbed, MessageOptions } from "discord.js";
import BaseProvider from "../structures/provider";
import { Colors, PreviewerUA } from "../utils/branding";
import {
  formatDecimalPrice,
  shortenText,
  toTitleCase,
  usdFormatter,
} from "../utils/formatting";

export const OpenSeaMatch = {
  baseDomain: /http[s]?:\/\/(.+\.)?opensea\.io\/\S+/,
};

export enum Chain {
  Ethereum = "Ethereum",
  Polygon = "Polygon",
}

export default class OpenSeaProvider extends BaseProvider {
  constructor() {
    super("opensea", OpenSeaMatch.baseDomain, {
      baseURL: "https://api.opensea.io/api/v1/",
      headers: { "user-agent": PreviewerUA },
    });

    this.logger.info("Opensea ready!");
  }

  private async parseCollection(
    slug: string
  ): Promise<MessageOptions | undefined> {
    const resp = await this.http({
      url: "events",
      params: { collection_slug: slug, limit: 1 },
    });

    const collection = resp.data?.asset_events?.[0]?.asset?.collection;

    if (!collection) return;

    const {
      banner_image_url,
      description,
      large_image_url,
      image_url,
      name,
      discord_url,
      external_url,
      twitter_username,
      instagram_username,
    } = collection;

    const socials = [
      external_url,
      discord_url,
      twitter_username && "https://twitter.com/" + twitter_username,
      instagram_username && "https://www.instagram.com/" + instagram_username,
    ].filter((social) => social);

    const embed = new MessageEmbed({
      title: name,
      color: Colors.Aqua,
      url: "https://opensea.io/collection/" + slug,
    });

    if (banner_image_url) {
      embed.setImage(banner_image_url);
    }

    if (large_image_url || image_url) {
      embed.setThumbnail(large_image_url || image_url);
    }

    if (description) {
      embed.setDescription(shortenText(description, 150));
    }

    if (socials.length > 0) {
      embed.addField("Socials", socials.join("\n"));
    }

    return { embeds: [embed] };
  }

  private async parseAsset(
    chain: Chain,
    contractAddress: string,
    token: string
  ): Promise<MessageOptions | undefined> {
    if (chain === Chain.Polygon) return;

    const resp = await this.http({
      url: `/asset/${contractAddress}/${token}/`,
    });

    if (typeof resp.data !== "object" || resp.data?.success === false) {
      this.logger.error(
        `Failed to parse ${contractAddress} ${token} token on chain ${chain} with status code ${resp.status}`
      );
      return;
    }

    const {
      token_id,
      image_url,
      traits,
      owner,
      collection,
      name,
      description,
      last_sale,
      orders,
      top_ownerships,
    } = resp.data;

    const ownerOrders = orders?.filter(
      (order: any) =>
        order.side === 1 &&
        !order.cancelled &&
        !order.finalized &&
        !order.marked_invalid
    );

    const ownerName =
      top_ownerships.length > 0
        ? top_ownerships.length === 1
          ? top_ownerships[0]?.owner?.user?.username ??
            top_ownerships[0]?.owner?.address
          : undefined
        : owner.user?.username ?? owner.address;

    const slug = collection.slug;

    const supply = collection.stats.total_supply;

    const embed = new MessageEmbed({
      title: `[${token_id}] ${name ?? "#" + token_id}`,
      url: `https://opensea.io/assets/${contractAddress}/${token}`,
      color: Colors.Aqua,
    });

    if (image_url) {
      embed.setThumbnail(image_url);
    }

    if (description) {
      embed.setDescription(shortenText(description, 100));
    }

    embed.addField(
      "Collection",
      `[${slug}](https://opensea.io/collection/${slug})`,
      true
    );

    embed.addField(
      "Owner",
      ownerName
        ? `[${ownerName}](https://opensea.io/${ownerName})`
        : `[Multiple](${embed.url})`,
      true
    );

    if (ownerOrders && ownerOrders.length > 0) {
      const { current_price, payment_token_contract } = ownerOrders.reduce(
        (prev: any, current: any): any =>
          formatDecimalPrice(
            new BigNumber(current.current_price),
            current.payment_token_contract.decimals
          )
            .times(current.payment_token_contract.usd_price)
            .lt(
              formatDecimalPrice(
                new BigNumber(prev.current_price),
                prev.payment_token_contract.decimals
              ).times(prev.payment_token_contract.usd_price)
            )
            ? current
            : prev
      );
      const price = formatDecimalPrice(
        new BigNumber(current_price),
        payment_token_contract.decimals
      );
      embed.addField(
        "Current Price",
        `${price} ${payment_token_contract.symbol} (${usdFormatter.format(
          price
            .times(new BigNumber(payment_token_contract.usd_price))
            .decimalPlaces(3)
            .toNumber()
        )} USD)`
      );
    }

    if (last_sale) {
      const txnHash = last_sale.transaction.transaction_hash;
      const price = formatDecimalPrice(
        new BigNumber(last_sale.total_price),
        last_sale.payment_token.decimals
      );

      embed.addField(
        "Last Sale",
        `[${price} ${
          last_sale.payment_token.symbol
        }](https://etherscan.io/tx/${txnHash}) (${usdFormatter.format(
          price
            .times(new BigNumber(last_sale.payment_token.usd_price))
            .decimalPlaces(3)
            .toNumber()
        )} USD)`,
        true
      );
    }

    embed.addField("Floor", collection.stats.floor_price.toString() + " ETH");

    embed.addField(
      "Traits",
      traits && traits.length > 0
        ? traits
            .map(
              (trait: any) =>
                `**${toTitleCase(trait.trait_type)}**: ${trait.value} *(${
                  Math.round((trait.trait_count / supply) * 100 * 100) / 100
                }%)*`
            )
            .join("\n")
        : "No Traits"
    );

    return { embeds: [embed] };
  }

  public async parse(url: URL): Promise<MessageOptions | undefined> {
    const paths = url.pathname.split("/").slice(1);

    switch (paths[0].toLowerCase()) {
      case "assets":
        if (!paths[1] || !paths[2]) return;
        if (paths[1].startsWith("0x")) {
          return await this.parseAsset(Chain.Ethereum, paths[1], paths[2]);
        } else {
          return await this.parseAsset(Chain.Polygon, paths[2], paths[3]);
        }
      case "collection":
        return await this.parseCollection(paths[1]);
      default:
        return;
    }
  }
}
