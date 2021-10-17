import { MessageEmbed, MessageOptions } from "discord.js";
import BaseProvider from "../structures/provider";
import { usdFormatter } from "../utils/formatting";
import axios from "axios";

export const StocksMatch = {
  Ticker: /\$([A-Za-z]{0,5})/,
};

export default class StocksProvider extends BaseProvider {
  constructor() {
    super("stocks", StocksMatch.Ticker);

    this.ready();
  }

  private async getTicker(ticker: string): Promise<any> {
    const { data } = await axios(
      // Occasional "getaddrinfo ENOTFOUND" errors when querying DNS
      // So just request ip and include host manually
      "https://209.73.190.11/v7/finance/quote?symbols=" + ticker,
      { headers: { Host: "query2.finance.yahoo.com" } }
    );

    const quoteResponse = data.quoteResponse;

    if (!quoteResponse) throw new Error(JSON.stringify(data));

    if (quoteResponse.error)
      throw new Error(JSON.stringify(quoteResponse.error));

    return quoteResponse.result[0];
  }

  public async process(
    match: RegExpExecArray
  ): Promise<MessageOptions | undefined> {
    const result = await this.getTicker(match[1]);

    if (!result) return undefined;

    const embed = new MessageEmbed();

    embed.setTitle(
      result.longName ?? result.shortName ?? result.displayName ?? result.symbol
    );
    embed.addField(
      "Market Price",
      result.regularMarketPrice
        ? usdFormatter.format(result.regularMarketPrice)
        : "None"
    );

    embed.addField(
      "Market Day Range",
      usdFormatter.format(result.regularMarketDayLow) +
        " - " +
        usdFormatter.format(result.regularMarketDayHigh)
    );

    embed.addField(
      "Yearly Range",
      usdFormatter.format(result.fiftyTwoWeekLow) +
        " - " +
        usdFormatter.format(result.fiftyTwoWeekHigh)
    );

    /* Yahoo Credits */
    embed.setColor("#720e9e");
    embed.setFooter(
      "finance.yahoo.com",
      "https://images-na.ssl-images-amazon.com/images/I/31H2tVWMSGL.jpg"
    );
    /* Yahoo Credits */

    return {
      embeds: [embed],
    };
  }
}
