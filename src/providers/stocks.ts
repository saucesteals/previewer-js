import { MessageEmbed, MessageOptions } from "discord.js";
import BaseProvider from "../structures/provider";
import { PreviewerUA } from "../utils/branding";

export const StocksMatch = {
  Ticker: /\$([A-Za-z\-\=]+)/,
  YahooQuote: /finance.yahoo.com\/quote\/([A-Za-z\-\=]+)/,
};

export default class StocksProvider extends BaseProvider {
  constructor() {
    super("stocks", [StocksMatch.Ticker, StocksMatch.YahooQuote], {
      headers: { "user-agent": PreviewerUA },
    });

    this.ready();
  }

  private async getTicker(ticker: string): Promise<any> {
    const { data } = await this.http(
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

    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: result.currency,
    });

    const embed = new MessageEmbed();

    embed.setTitle(
      result.longName ?? result.shortName ?? result.displayName ?? result.symbol
    );
    embed.addField(
      "Market Price",
      result.regularMarketPrice
        ? formatter.format(result.regularMarketPrice)
        : "None"
    );

    embed.addField(
      "Market Day Range",
      formatter.format(result.regularMarketDayLow) +
        " - " +
        formatter.format(result.regularMarketDayHigh)
    );

    embed.addField(
      "Yearly Range",
      formatter.format(result.fiftyTwoWeekLow) +
        " - " +
        formatter.format(result.fiftyTwoWeekHigh)
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
