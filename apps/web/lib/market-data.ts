export type MarketCategory = "indices" | "forex" | "crypto";

export type MarketItem = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number | null;
  suffix?: string;
};

export type MarketOverview = {
  updatedAt: string;
  categories: Record<MarketCategory, MarketItem[]>;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
      };
    }>;
  };
};

type ExchangeRatesResponse = {
  time_last_update_utc?: string;
  rates?: Record<string, number>;
};

type BinanceTickerResponse = {
  lastPrice?: string;
  priceChangePercent?: string;
};

const indexSymbols = [
  { name: "S&P 500", symbol: "^GSPC" },
  { name: "Nasdaq Composite", symbol: "^IXIC" },
  { name: "DAX", symbol: "^GDAXI" },
  { name: "Nikkei 225", symbol: "^N225" }
] as const;

const cryptoSymbols = [
  { name: "BTC/USDT", symbol: "BTCUSDT" },
  { name: "ETH/USDT", symbol: "ETHUSDT" },
  { name: "SOL/USDT", symbol: "SOLUSDT" },
  { name: "XRP/USDT", symbol: "XRPUSDT" },
  { name: "BNB/USDT", symbol: "BNBUSDT" }
] as const;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 VectorNews"
    },
    next: { revalidate: 300 }
  });

  if (!response.ok) {
    throw new Error(`Ошибка запроса: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function getYahooIndexQuote(
  symbol: string,
  name: string
): Promise<MarketItem | null> {
  try {
    const data = await fetchJson<YahooChartResponse>(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`
    );
    const meta = data.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    const previousClose = meta?.chartPreviousClose;

    if (typeof price !== "number") {
      return null;
    }

    return {
      name,
      symbol,
      price,
      changePercent:
        typeof previousClose === "number" && previousClose !== 0
          ? ((price - previousClose) / previousClose) * 100
          : null
    };
  } catch {
    return null;
  }
}

async function getMoexIndexQuote(): Promise<MarketItem | null> {
  try {
    const data = await fetchJson<{
      marketdata?: { columns?: string[]; data?: Array<Array<string | number | null>> };
    }>("https://iss.moex.com/iss/engines/stock/markets/index/securities/IMOEX.json?iss.meta=off");

    const columns = data.marketdata?.columns ?? [];
    const row = data.marketdata?.data?.[0] ?? [];
    const currentIndex = columns.indexOf("CURRENTVALUE");
    const changeIndex = columns.indexOf("LASTCHANGEPRC");
    const price = Number(row[currentIndex]);

    if (!Number.isFinite(price)) {
      return null;
    }

    const rawChange = row[changeIndex];
    const changePercent =
      typeof rawChange === "number"
        ? rawChange
        : typeof rawChange === "string" && rawChange.length > 0
          ? Number(rawChange)
          : null;

    return {
      name: "IMOEX",
      symbol: "IMOEX",
      price,
      changePercent: Number.isFinite(changePercent as number) ? Number(changePercent) : null,
      suffix: "пт"
    };
  } catch {
    return null;
  }
}

async function getExchangeRates(): Promise<{ items: MarketItem[]; updatedAt: string | null }> {
  try {
    const [usdData, eurData, gbpData] = await Promise.all([
      fetchJson<ExchangeRatesResponse>("https://open.er-api.com/v6/latest/USD"),
      fetchJson<ExchangeRatesResponse>("https://open.er-api.com/v6/latest/EUR"),
      fetchJson<ExchangeRatesResponse>("https://open.er-api.com/v6/latest/GBP")
    ]);

    const usdRates = usdData.rates ?? {};
    const eurRates = eurData.rates ?? {};
    const gbpRates = gbpData.rates ?? {};
    const items: MarketItem[] = [];

    if (typeof eurRates.USD === "number") {
      items.push({ name: "EUR/USD", symbol: "EUR/USD", price: eurRates.USD, changePercent: null });
    }

    if (typeof usdRates.JPY === "number") {
      items.push({ name: "USD/JPY", symbol: "USD/JPY", price: usdRates.JPY, changePercent: null });
    }

    if (typeof gbpRates.USD === "number") {
      items.push({ name: "GBP/USD", symbol: "GBP/USD", price: gbpRates.USD, changePercent: null });
    }

    if (typeof usdRates.RUB === "number") {
      items.push({ name: "USD/RUB", symbol: "USD/RUB", price: usdRates.RUB, changePercent: null });
    }

    if (typeof usdRates.CNY === "number") {
      items.push({ name: "USD/CNY", symbol: "USD/CNY", price: usdRates.CNY, changePercent: null });
    }

    return {
      items,
      updatedAt: usdData.time_last_update_utc ?? null
    };
  } catch {
    return { items: [], updatedAt: null };
  }
}

async function getCryptoQuote(
  symbol: string,
  name: string
): Promise<{ item: MarketItem | null; updatedAt: string | null }> {
  try {
    const data = await fetchJson<BinanceTickerResponse>(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
    );
    const price = Number(data.lastPrice);
    const changePercent = Number(data.priceChangePercent);

    if (!Number.isFinite(price)) {
      return { item: null, updatedAt: null };
    }

    const fetchedAt = new Date().toISOString();

    return {
      item: {
        name,
        symbol: name,
        price,
        changePercent: Number.isFinite(changePercent) ? changePercent : null
      },
      updatedAt: fetchedAt
    };
  } catch {
    return { item: null, updatedAt: null };
  }
}

function getFallbackOverview(): MarketOverview {
  return {
    updatedAt: new Date().toISOString(),
    categories: {
      indices: [
        { name: "S&P 500", symbol: "^GSPC", price: 0, changePercent: null },
        { name: "Nasdaq Composite", symbol: "^IXIC", price: 0, changePercent: null },
        { name: "DAX", symbol: "^GDAXI", price: 0, changePercent: null },
        { name: "Nikkei 225", symbol: "^N225", price: 0, changePercent: null },
        { name: "IMOEX", symbol: "IMOEX", price: 0, changePercent: null, suffix: "пт" }
      ],
      forex: [
        { name: "EUR/USD", symbol: "EUR/USD", price: 0, changePercent: null },
        { name: "USD/JPY", symbol: "USD/JPY", price: 0, changePercent: null },
        { name: "GBP/USD", symbol: "GBP/USD", price: 0, changePercent: null },
        { name: "USD/RUB", symbol: "USD/RUB", price: 0, changePercent: null },
        { name: "USD/CNY", symbol: "USD/CNY", price: 0, changePercent: null }
      ],
      crypto: cryptoSymbols.map(({ name }) => ({
        name,
        symbol: name,
        price: 0,
        changePercent: null
      }))
    }
  };
}

export async function getMarketOverview(): Promise<MarketOverview> {
  try {
    const [indicesData, moexData, forexData, cryptoData] = await Promise.all([
      Promise.all(indexSymbols.map((item) => getYahooIndexQuote(item.symbol, item.name))),
      getMoexIndexQuote(),
      getExchangeRates(),
      Promise.all(cryptoSymbols.map((item) => getCryptoQuote(item.symbol, item.name)))
    ]);

    const indices = [...indicesData, moexData].filter((item): item is MarketItem => item !== null);
    const crypto = cryptoData
      .map((entry) => entry.item)
      .filter((item): item is MarketItem => item !== null);
    const updatedAt =
      forexData.updatedAt ??
      cryptoData.find((entry) => entry.updatedAt)?.updatedAt ??
      new Date().toISOString();
    const fallback = getFallbackOverview();

    return {
      updatedAt,
      categories: {
        indices: indices.length > 0 ? indices : fallback.categories.indices,
        forex: forexData.items.length > 0 ? forexData.items : fallback.categories.forex,
        crypto: crypto.length > 0 ? crypto : fallback.categories.crypto
      }
    };
  } catch {
    return getFallbackOverview();
  }
}
