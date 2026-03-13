import type { Currency, PortfolioAsset, PortfolioChartData } from '../types/index.js';
import type { PortfolioType } from '../components/portfolio-table.js';

interface PortfolioCoordinatorState {
  accumulationPortfolio: PortfolioAsset[];
  exchangeRates: { usdToIls: number; ilsToUsd: number };
  displayCurrency: Currency;
}

interface SortState {
  column: string | null;
  direction: 'asc' | 'desc';
}

type PortfolioCoordinatorDependencies = {
  state: PortfolioCoordinatorState;
  createPortfolioAsset: () => PortfolioAsset;
  renderPortfolioTable: (
    tableId: string,
    portfolio: PortfolioAsset[],
    type: PortfolioType,
    exchangeRates: { usdToIls: number; ilsToUsd: number },
    displayCurrency: Currency,
    yearsToRetirement?: number
  ) => void;
  calculatePortfolioValue: (portfolio: PortfolioAsset[], usdIlsRate: number) => number;
  calculatePortfolioCostBasis: (portfolio: PortfolioAsset[], usdIlsRate: number) => number;
  setTextContent: (elementId: string, value: string) => void;
  getElement: <T extends HTMLElement = HTMLElement>(id: string) => T | null;
  formatCurrency: (amount: number, currency: Currency) => string;
  convertPortfolioToChartData: (portfolio: PortfolioAsset[], usdIlsRate: number) => PortfolioChartData[];
  updateDonutChart: (
    chartId: string,
    data: PortfolioChartData[],
    year: number,
    currency: Currency,
    usdIlsRate: number
  ) => void;
  getUsdIlsRate: () => number;
  getEarlyRetirementYear: () => number;
  updateAssetSymbol: (
    portfolio: PortfolioAsset[],
    id: number,
    symbol: string,
    onUpdate: () => void
  ) => Promise<void>;
  updateAssetField: (
    portfolio: PortfolioAsset[],
    id: number,
    field: keyof PortfolioAsset,
    value: unknown
  ) => void;
  updateAssetCurrency: (portfolio: PortfolioAsset[], id: number, currency: '$' | '₪') => void;
  updateAssetPrice: (portfolio: PortfolioAsset[], id: number, amount: number) => void;
  updateAssetCost: (portfolio: PortfolioAsset[], id: number, amount: number) => void;
  handleAssetMethodChange: (portfolio: PortfolioAsset[], id: number, value: string) => void;
  removeAssetFromPortfolio: (portfolio: PortfolioAsset[], id: number) => PortfolioAsset[];
  calculateAndUpdate: () => void | Promise<void>;
};

function getPortfolioForType(
  state: PortfolioCoordinatorState,
  type: PortfolioType
): PortfolioAsset[] {
  // Only the accumulation portfolio is editable in this coordinator today.
  // Keeping the empty-array fallback preserves the current app.ts behavior
  // for any unexpected callers without mutating unrelated state.
  return type === 'accumulation' ? state.accumulationPortfolio : [];
}

export function createPortfolioCoordinator(dependencies: PortfolioCoordinatorDependencies) {
  const sortState: SortState = {
    column: null,
    direction: 'asc'
  };

  function updatePortfolioSummary(): void {
    const usdIlsRate = dependencies.getUsdIlsRate();
    const totalValueUSD = dependencies.calculatePortfolioValue(
      dependencies.state.accumulationPortfolio,
      usdIlsRate
    );
    const totalCostBasisUSD = dependencies.calculatePortfolioCostBasis(
      dependencies.state.accumulationPortfolio,
      usdIlsRate
    );

    let totalValue = totalValueUSD;
    let totalCostBasis = totalCostBasisUSD;
    if (dependencies.state.displayCurrency === '₪') {
      totalValue = totalValueUSD * dependencies.state.exchangeRates.usdToIls;
      totalCostBasis = totalCostBasisUSD * dependencies.state.exchangeRates.usdToIls;
    }

    const unrealizedGainLoss = totalValue - totalCostBasis;
    const assetCount = dependencies.state.accumulationPortfolio.length;

    dependencies.setTextContent('accumulation-count', String(assetCount));
    dependencies.setTextContent(
      'accumulation-market-value',
      dependencies.formatCurrency(totalValue, dependencies.state.displayCurrency)
    );
    dependencies.setTextContent(
      'accumulation-cost-basis',
      dependencies.formatCurrency(totalCostBasis, dependencies.state.displayCurrency)
    );
    dependencies.setTextContent(
      'accumulationStartValue',
      dependencies.formatCurrency(totalValue, dependencies.state.displayCurrency)
    );
    dependencies.setTextContent(
      'accumulationEndValue',
      dependencies.formatCurrency(totalValue, dependencies.state.displayCurrency)
    );

    const startGainElement = dependencies.getElement('accumulationStartUnrealizedGain');
    if (startGainElement) {
      const formattedGain = dependencies.formatCurrency(
        Math.abs(unrealizedGainLoss),
        dependencies.state.displayCurrency
      );
      if (unrealizedGainLoss >= 0) {
        startGainElement.textContent = `רווח לא ממומש: +${formattedGain}`;
        startGainElement.className = 'text-xs text-center text-green-600';
      } else {
        startGainElement.textContent = `הפסד לא ממומש: -${formattedGain}`;
        startGainElement.className = 'text-xs text-center text-red-600';
      }
    }

    const gainLossElement = dependencies.getElement('accumulation-gain-loss');
    if (gainLossElement) {
      const sign = unrealizedGainLoss >= 0 ? '+' : '';
      gainLossElement.textContent = `${sign}${dependencies.formatCurrency(
        Math.abs(unrealizedGainLoss),
        dependencies.state.displayCurrency
      )}`;
      gainLossElement.className = unrealizedGainLoss >= 0
        ? 'text-sm font-bold text-green-600'
        : 'text-sm font-bold text-red-600';
    }

    const portfolioData = dependencies.convertPortfolioToChartData(
      dependencies.state.accumulationPortfolio,
      usdIlsRate
    );
    dependencies.updateDonutChart(
      'accumulationStartChart',
      portfolioData,
      new Date().getFullYear(),
      dependencies.state.displayCurrency,
      usdIlsRate
    );
  }

  function updateAccumulationTabInfo(): void {
    const usdIlsRate = dependencies.getUsdIlsRate();
    let totalValue = dependencies.calculatePortfolioValue(
      dependencies.state.accumulationPortfolio,
      usdIlsRate
    );
    if (dependencies.state.displayCurrency === '₪') {
      totalValue *= dependencies.state.exchangeRates.usdToIls;
    }
    const tabInfo = dependencies.getElement('accumulation-tab-total');
    if (tabInfo) {
      tabInfo.textContent = `(${dependencies.formatCurrency(totalValue, dependencies.state.displayCurrency)})`;
    }
  }

  function updatePortfolioTables(): void {
    const currentYear = new Date().getFullYear();
    const earlyRetirementYear = dependencies.getEarlyRetirementYear();
    const yearsToRetirement = Math.max(0, earlyRetirementYear - currentYear);

    dependencies.renderPortfolioTable(
      'accumulationTable',
      dependencies.state.accumulationPortfolio,
      'accumulation',
      dependencies.state.exchangeRates,
      dependencies.state.displayCurrency,
      yearsToRetirement
    );
    updatePortfolioSummary();
    updateAccumulationTabInfo();
  }

  function addAccumulationRow(): void {
    const newAsset = dependencies.createPortfolioAsset();
    dependencies.state.accumulationPortfolio.push(newAsset);
    updatePortfolioTables();
  }

  async function updatePortfolioAssetSymbol(
    type: PortfolioType,
    id: number,
    symbol: string
  ): Promise<void> {
    const portfolio = getPortfolioForType(dependencies.state, type);
    await dependencies.updateAssetSymbol(portfolio, id, symbol, () => {
      updatePortfolioTables();
      void dependencies.calculateAndUpdate();
    });
  }

  function updatePortfolioAsset(
    type: PortfolioType,
    id: number,
    field: string,
    value: unknown
  ): void {
    const portfolio = getPortfolioForType(dependencies.state, type);
    dependencies.updateAssetField(portfolio, id, field as keyof PortfolioAsset, value);
    updatePortfolioTables();
    void dependencies.calculateAndUpdate();
  }

  function updatePortfolioAssetCurrency(
    type: PortfolioType,
    id: number,
    currency: string
  ): void {
    const portfolio = getPortfolioForType(dependencies.state, type);
    dependencies.updateAssetCurrency(portfolio, id, currency as '$' | '₪');
    updatePortfolioTables();
    void dependencies.calculateAndUpdate();
  }

  function updatePortfolioAssetPrice(
    type: PortfolioType,
    id: number,
    amount: number
  ): void {
    const portfolio = getPortfolioForType(dependencies.state, type);
    dependencies.updateAssetPrice(portfolio, id, amount);
    updatePortfolioTables();
    void dependencies.calculateAndUpdate();
  }

  function updatePortfolioAssetCost(
    type: PortfolioType,
    id: number,
    amount: number
  ): void {
    const portfolio = getPortfolioForType(dependencies.state, type);
    dependencies.updateAssetCost(portfolio, id, amount);
    updatePortfolioTables();
    void dependencies.calculateAndUpdate();
  }

  function handleMethodChange(
    type: PortfolioType,
    id: number,
    value: string
  ): void {
    const portfolio = getPortfolioForType(dependencies.state, type);
    dependencies.handleAssetMethodChange(portfolio, id, value);
    updatePortfolioTables();
    void dependencies.calculateAndUpdate();
  }

  function removePortfolioAsset(type: PortfolioType, id: number): void {
    if (type === 'accumulation') {
      dependencies.state.accumulationPortfolio = dependencies.removeAssetFromPortfolio(
        dependencies.state.accumulationPortfolio,
        id
      );
      updatePortfolioTables();
      void dependencies.calculateAndUpdate();
    }
  }

  function sortPortfolioTable(column: string): void {
    if (sortState.column === column) {
      sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
      sortState.column = column;
      sortState.direction = 'asc';
    }

    dependencies.state.accumulationPortfolio.sort((a, b) => {
      let valueA = 0;
      let valueB = 0;

      switch (column) {
        case 'costBasis':
          valueA = (a.quantity || 0) * (a.averageCost?.amount || 0);
          valueB = (b.quantity || 0) * (b.averageCost?.amount || 0);
          break;
        case 'marketValue':
          valueA = (a.quantity || 0) * (a.currentPrice?.amount || 0);
          valueB = (b.quantity || 0) * (b.currentPrice?.amount || 0);
          break;
        case 'gainLoss':
          valueA = ((a.quantity || 0) * (a.currentPrice?.amount || 0))
            - ((a.quantity || 0) * (a.averageCost?.amount || 0));
          valueB = ((b.quantity || 0) * (b.currentPrice?.amount || 0))
            - ((b.quantity || 0) * (b.averageCost?.amount || 0));
          break;
        case 'exposure': {
          const totalValue = dependencies.state.accumulationPortfolio.reduce(
            (sum, asset) => sum + (asset.quantity || 0) * (asset.currentPrice?.amount || 0),
            0
          );
          valueA = totalValue > 0
            ? ((a.quantity || 0) * (a.currentPrice?.amount || 0)) / totalValue
            : 0;
          valueB = totalValue > 0
            ? ((b.quantity || 0) * (b.currentPrice?.amount || 0)) / totalValue
            : 0;
          break;
        }
      }

      const multiplier = sortState.direction === 'asc' ? 1 : -1;
      return (valueA - valueB) * multiplier;
    });

    updatePortfolioTables();
  }

  return {
    addAccumulationRow,
    updatePortfolioTables,
    updatePortfolioSummary,
    updateAccumulationTabInfo,
    updatePortfolioAssetSymbol,
    updatePortfolioAsset,
    updatePortfolioAssetCurrency,
    updatePortfolioAssetPrice,
    updatePortfolioAssetCost,
    handleMethodChange,
    removePortfolioAsset,
    sortPortfolioTable
  };
}
