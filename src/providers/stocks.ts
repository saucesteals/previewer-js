import { MessageEmbed, MessageOptions, MessageAttachment } from "discord.js";
import BaseProvider from "../structures/provider";
import { PreviewerUA } from "../utils/branding";
import { listenerCount } from "process";

const StocksMatch = {
  Symbol: /\$([A-Za-z0-9\-\=]+)/,
  YahooQuote: /finance.yahoo.com\/quote\/([A-Za-z0-9\-\=]+)/,
};

const ShortSymbols: Record<string, string> = {
  ETH: "ETH-USD",
  BTC: "BTC-USD",
  DOGE: "DOGE-USD",
  XRP: "XRP-USD",
};

export default class StocksProvider extends BaseProvider {
  constructor() {
    super("stocks", [StocksMatch.Symbol, StocksMatch.YahooQuote], {
      headers: { "user-agent": PreviewerUA },
    });

    this.ready();
  }

  private async getChart(symbol: string): Promise<any> {
    const { data } = await this.http(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?region=US&lang=en-US&includePrePost=false&interval=30m&useYfid=true&range=1d`
    );

    if (data.error) throw new Error(JSON.stringify(data.error));

    const priceData: number[] = Object.values(
      data.chart.result[0].indicators.quote[0].low
    );
    const priceLabels = data.chart.result[0].timestamp.map(
      (timestamp: number) =>
        new Date(timestamp * 1e3).toISOString().slice(-13, -5)
    );

    const chartData = {
      labels: priceLabels,
      datasets: [
        {
          label: symbol + " 1d Chart",
          data: priceData,
          fill: true,
          borderWidth: 1,
          pointRadius: 0,
        },
      ],
    };

    const chartOptions = {
      scales: {
        yAxes: [
          {
            display: true,
            ticks: {
              suggestedMin: Math.min(...priceData),
            },
          },
        ],
      },
    };

    const response = await this.http("https://quickchart.io/chart/create", {
      method: "POST",
      data: {
        chart: {
          type: "line",
          data: chartData,
          options: chartOptions,
        },
      },
    });

    return response.data.url;
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

    console.log(symbol);

    const result = await this.getSymbol(symbol);
    const chart = await this.getChart(symbol);

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
    embed.setImage(chart);
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
