import type { Page, Route } from '@playwright/test';

type AssetQuote = {
  symbol: string;
  price: number;
  name: string;
  marketCapUsd: number;
  cagRs: Array<{ years: number; value: number }>;
};

const DEFAULT_EXCHANGE_RATE = 3.62;

const ASSET_QUOTES: Record<string, AssetQuote> = {
  SPY: {
    symbol: 'SPY',
    price: 672.38,
    name: 'SPDR S&P 500 ETF Trust',
    marketCapUsd: 612_000_000_000,
    cagRs: [
      { years: 1, value: 20.2 },
      { years: 3, value: 17.98 },
      { years: 5, value: 11.15 },
      { years: 10, value: 12.58 },
      { years: 15, value: 11.43 },
      { years: 20, value: 8.57 }
    ]
  },
  QQQ: {
    symbol: 'QQQ',
    price: 599.75,
    name: 'Invesco QQQ Trust (Nasdaq-100)',
    marketCapUsd: 332_000_000_000,
    cagRs: [
      { years: 1, value: 27.9 },
      { years: 3, value: 23.17 },
      { years: 5, value: 13.45 },
      { years: 10, value: 18.57 },
      { years: 15, value: 16.93 },
      { years: 20, value: 14.23 }
    ]
  },
  VTI: {
    symbol: 'VTI',
    price: 250.12,
    name: 'Vanguard Total Stock Market ETF',
    marketCapUsd: 402_000_000_000,
    cagRs: [
      { years: 1, value: 18.4 },
      { years: 3, value: 14.1 },
      { years: 5, value: 10.7 },
      { years: 10, value: 12.2 },
      { years: 15, value: 10.8 },
      { years: 20, value: 8.9 }
    ]
  },
  MSFT: {
    symbol: 'MSFT',
    price: 418.32,
    name: 'Microsoft Corporation',
    marketCapUsd: 3_100_000_000_000,
    cagRs: [
      { years: 1, value: 24.7 },
      { years: 3, value: 21.5 },
      { years: 5, value: 18.9 },
      { years: 10, value: 25.1 },
      { years: 15, value: 21.4 },
      { years: 20, value: 18.3 }
    ]
  },
  GOOGL: {
    symbol: 'GOOGL',
    price: 172.34,
    name: 'Alphabet Inc.',
    marketCapUsd: 2_200_000_000_000,
    cagRs: [
      { years: 1, value: 21.3 },
      { years: 3, value: 16.4 },
      { years: 5, value: 14.9 },
      { years: 10, value: 18.6 },
      { years: 15, value: 17.4 },
      { years: 20, value: 15.1 }
    ]
  },
  BND: {
    symbol: 'BND',
    price: 72.41,
    name: 'Vanguard Total Bond Market ETF',
    marketCapUsd: 110_000_000_000,
    cagRs: [
      { years: 1, value: 3.1 },
      { years: 3, value: 2.7 },
      { years: 5, value: 2.4 },
      { years: 10, value: 2.1 },
      { years: 15, value: 2.5 },
      { years: 20, value: 3.0 }
    ]
  }
};

function json(route: Route, body: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body)
  });
}

export class ApiMocks {
  private exchangeRateShouldFail = false;
  private failedSymbols = new Set<string>();

  constructor(private readonly page: Page) {}

  async install(): Promise<void> {
    await this.page.route('**/api/ExchangeRate/**', (route) => this.handleExchangeRate(route));
    await this.page.route('**/api/AssetPrices/**', (route) => this.handleAssetPrices(route));
  }

  failExchangeRate(): void {
    this.exchangeRateShouldFail = true;
  }

  restoreExchangeRate(): void {
    this.exchangeRateShouldFail = false;
  }

  failAsset(symbol: string): void {
    this.failedSymbols.add(symbol.trim().toUpperCase());
  }

  restoreAsset(symbol: string): void {
    this.failedSymbols.delete(symbol.trim().toUpperCase());
  }

  private async handleExchangeRate(route: Route): Promise<void> {
    if (this.exchangeRateShouldFail) {
      await json(route, { error: 'mocked exchange rate failure' }, 503);
      return;
    }

    await json(route, {
      baseCurrency: 'USD',
      targetCurrency: 'ILS',
      rate: DEFAULT_EXCHANGE_RATE,
      timestamp: '2026-03-08T00:00:00Z',
      source: 'playwright-mock'
    });
  }

  private async handleAssetPrices(route: Route): Promise<void> {
    const url = new URL(route.request().url());
    const pathname = url.pathname.replace('/api/AssetPrices/', '');

    if (pathname === 'batch') {
      const postData = route.request().postDataJSON() as { symbols?: string[] } | null;
      const symbols = postData?.symbols ?? [];
      const prices = symbols
        .map((symbol) => symbol.toUpperCase())
        .filter((symbol) => !this.failedSymbols.has(symbol))
        .map((symbol) => {
          const quote = ASSET_QUOTES[symbol];
          return quote
            ? { symbol, price: quote.price, currency: 'USD' }
            : null;
        })
        .filter(Boolean);

      await json(route, { prices });
      return;
    }

    if (pathname.endsWith('/cagr')) {
      const symbol = decodeURIComponent(pathname.replace(/\/cagr$/, '')).toUpperCase();
      if (this.failedSymbols.has(symbol) || !ASSET_QUOTES[symbol]) {
        await json(route, { error: 'mocked CAGR failure' }, 503);
        return;
      }

      await json(route, {
        symbol,
        cagRs: ASSET_QUOTES[symbol].cagRs
      });
      return;
    }

    if (pathname.endsWith('/name')) {
      const symbol = decodeURIComponent(pathname.replace(/\/name$/, '')).toUpperCase();
      if (this.failedSymbols.has(symbol) || !ASSET_QUOTES[symbol]) {
        await json(route, { error: 'mocked profile failure' }, 503);
        return;
      }

      const quote = ASSET_QUOTES[symbol];
      await json(route, {
        symbol,
        name: quote.name,
        marketCapUsd: quote.marketCapUsd,
        marketCapCurrency: 'USD'
      });
      return;
    }

    const symbol = decodeURIComponent(pathname).toUpperCase();
    if (this.failedSymbols.has(symbol) || !ASSET_QUOTES[symbol]) {
      await json(route, { error: 'mocked quote failure' }, 503);
      return;
    }

    const quote = ASSET_QUOTES[symbol];
    await json(route, {
      symbol,
      price: quote.price,
      currency: 'USD'
    });
  }
}
