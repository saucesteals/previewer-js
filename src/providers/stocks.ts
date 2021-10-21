import { MessageEmbed, MessageOptions } from "discord.js";
import BaseProvider from "../structures/provider";
import { PreviewerUA } from "../utils/branding";

const StocksMatch = {
  Symbol: /\$([A-Za-z0-9\-\=]+)/,
  YahooQuote: /finance.yahoo.com\/quote\/([A-Za-z0-9\-\=]+)/,
};

const ShortSymbols: Record<string, string> = {
  ETH: "ETH-USD",
  BTC: "BTC-USD",
  DOGE: "DOGE-USD",
  XRP: "XRP-USD",
  SOL: "SOL1-USD",
  ADA: "ADA-USD",
  MATIC: "MATIC-USD",
  BNB: "BNB-USD",
};

export default class StocksProvider extends BaseProvider {
  constructor() {
    super("stocks", [StocksMatch.Symbol, StocksMatch.YahooQuote], {
      headers: { "user-agent": PreviewerUA },
    });

    this.ready();
  }

  private async getSymbol(symbol: string): Promise<any> {
    const { data } = await this.http(
      // Occasional "getaddrinfo ENOTFOUND" errors when querying DNS
      // So just request ip and include host manually
      "https://209.73.190.11/v7/finance/quote?symbols=" + symbol,
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
    const symbolMatch = match[1].toUpperCase();
    const symbol = ShortSymbols[symbolMatch] ?? symbolMatch;

    const result = await this.getSymbol(symbol);

    if (!result || !result.regularMarketPrice) return undefined;

    const currencyFormatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: result.currency,
    });

    const currencyChangeFormatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: result.currency,
      signDisplay: "exceptZero",
    });

    const embed = new MessageEmbed();

    embed.setTitle(
      result.longName ?? result.shortName ?? result.displayName ?? result.symbol
    );
    embed.addField(
      "Market Price",
      `${currencyFormatter.format(
        result.regularMarketPrice
      )} | ${currencyChangeFormatter.format(result.regularMarketChange)} (${
        Math.floor(result.regularMarketChangePercent * 100) / 100
      }%)`
    );

    embed.addField(
      "Day's Range",
      currencyFormatter.format(result.regularMarketDayLow) +
        " - " +
        currencyFormatter.format(result.regularMarketDayHigh)
    );

    embed.addField(
      "52 Week Range",
      currencyFormatter.format(result.fiftyTwoWeekLow) +
        " - " +
        currencyFormatter.format(result.fiftyTwoWeekHigh)
    );

    /* Yahoo Credits */
    embed.setURL("https://finance.yahoo.com/quote/" + symbol);
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
