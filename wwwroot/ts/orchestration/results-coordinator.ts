import type { FireCalculationResult, Currency, PlannedExpense, PortfolioAsset, PortfolioChartData, MainChartOptions } from '../types/index.js';
import type { RsuNestedDonutData } from '../components/rsu-chart.js';
import type { SankeyChartManager } from '../components/sankey-chart.js';
import type { RsuGrant, RsuChartOptions, RsuYearlyData } from '../types/rsu-types.js';

interface ResultsCoordinatorState {
  accumulationPortfolio: PortfolioAsset[];
  displayCurrency: Currency;
  useRetirementPortfolio: boolean;
  expenses: PlannedExpense[];
}

type ResultsCoordinatorDependencies = {
  state: ResultsCoordinatorState;
  convertFromUSD: (valueInUSD: number, displayCurrency: Currency, usdIlsRate: number) => number;
  formatCurrency: (amount: number, currency: Currency) => string;
  setTextContent: (elementId: string, value: string) => void;
  getElement: <T extends HTMLElement = HTMLElement>(id: string) => T | null;
  getUsdIlsRate: () => number;
  getEarlyRetirementYear: () => number;
  getInputNumber: (id: string, defaultValue?: number) => number;
  getTargetMonthlyExpenseCurrency: () => Currency;
  convertPortfolioToChartData: (portfolio: PortfolioAsset[], usdIlsRate: number) => PortfolioChartData[];
  updateDonutChart: (
    chartId: string,
    data: PortfolioChartData[],
    year: number,
    currency: Currency,
    usdIlsRate: number
  ) => void;
  updateMainChart: (options: MainChartOptions) => void;
  updateExpensesChart: () => void;
  getRsuGrants: () => RsuGrant[];
  calculateRsuTimeline: (startYear: number, endYear: number, earlyRetirementYear: number) => RsuYearlyData[];
  calculatePerGrantTimelines: (
    startYear: number,
    endYear: number,
    earlyRetirementYear: number
  ) => NonNullable<RsuChartOptions['grantTimelines']>;
  calculateVestedShares: (grant: RsuGrant, asOfDate: Date) => number;
  calculateSection102EligibleShares: (grant: RsuGrant, asOfDate: Date) => number;
  getRsuConfiguration: () => { currentPricePerShare: number };
  updateRsuValueChart: (options: RsuChartOptions) => void;
  updateRsuSharesChart: (options: { canvasId: string; earlyRetirementYear: number }) => void;
  updateRsuNestedDonutChart: (chartId: string, data: RsuNestedDonutData) => void;
  getSankeyManager: () => SankeyChartManager | null;
};

const DEFAULT_RESULTS_PROJECTION_AGE = 100;

export function createResultsCoordinator(dependencies: ResultsCoordinatorDependencies) {
  function getGainColorClass(gain: number, centerClass: boolean = false): string {
    const baseClass = centerClass ? 'text-xs text-center' : 'text-xs';
    return gain >= 0 ? `${baseClass} text-green-600` : `${baseClass} text-red-600`;
  }

  function displayResults(result: FireCalculationResult): void {
    const usdIlsRate = dependencies.getUsdIlsRate();
    const convertValue = (valueInUSD: number): number => {
      return dependencies.convertFromUSD(valueInUSD, dependencies.state.displayCurrency, usdIlsRate);
    };

    dependencies.setTextContent(
      'totalContributions',
      dependencies.formatCurrency(convertValue(result.totalContributions), dependencies.state.displayCurrency)
    );

    dependencies.setTextContent(
      'annualWithdrawalNet',
      dependencies.formatCurrency(convertValue(result.netAnnualWithdrawal), dependencies.state.displayCurrency)
    );
    const annualGrossElement = dependencies.getElement('annualWithdrawalGross');
    if (annualGrossElement) {
      annualGrossElement.textContent = `ברוטו: ${dependencies.formatCurrency(
        convertValue(result.grossAnnualWithdrawal),
        dependencies.state.displayCurrency
      )}`;
    }

    dependencies.setTextContent(
      'monthlyExpenseNet',
      dependencies.formatCurrency(convertValue(result.netMonthlyExpense), dependencies.state.displayCurrency)
    );
    const monthlyGrossElement = dependencies.getElement('monthlyExpenseGross');
    if (monthlyGrossElement) {
      monthlyGrossElement.textContent = `ברוטו: ${dependencies.formatCurrency(
        convertValue(result.grossMonthlyExpense),
        dependencies.state.displayCurrency
      )}`;
    }

    const resultsTabInfo = dependencies.getElement('results-tab-info');
    if (resultsTabInfo) {
      resultsTabInfo.textContent = `(${dependencies.formatCurrency(
        convertValue(result.netMonthlyExpense),
        dependencies.state.displayCurrency
      )}/חודש)`;
    }

    const contributionsBreakdownElement = dependencies.getElement('contributionsBreakdown');
    if (contributionsBreakdownElement) {
      if (result.totalMonthlyContributions > 0) {
        contributionsBreakdownElement.textContent = `מתוכם הפקדות חודשיות: ${dependencies.formatCurrency(
          convertValue(result.totalMonthlyContributions),
          dependencies.state.displayCurrency
        )}`;
        contributionsBreakdownElement.className = 'text-xs text-gray-500 mt-1';
      } else {
        contributionsBreakdownElement.textContent = '';
      }
    }

    const startValue = result.currentValue || 0;
    const peakValue = result.peakValue || 0;
    const grossPeakValue = result.grossPeakValue || peakValue;
    const retirementTaxToPay = result.retirementTaxToPay || 0;
    const endValue = result.yearlyData.length > 0
      ? result.yearlyData[result.yearlyData.length - 1].portfolioValue
      : 0;

    dependencies.setTextContent(
      'startValue',
      dependencies.formatCurrency(convertValue(startValue), dependencies.state.displayCurrency)
    );
    dependencies.setTextContent(
      'endValue',
      dependencies.formatCurrency(convertValue(endValue), dependencies.state.displayCurrency)
    );

    const startUnrealizedGain = startValue - (result.currentCostBasis || 0);
    const grossPeakUnrealizedGain = grossPeakValue
      - (result.currentCostBasis || 0)
      - (result.totalMonthlyContributions || 0);
    const endUnrealizedGain = endValue - (result.totalContributions || 0);

    const formatGain = (gain: number): string => {
      const formattedGain = dependencies.formatCurrency(
        Math.abs(convertValue(gain)),
        dependencies.state.displayCurrency
      );
      return gain >= 0 ? `רווח לא ממומש: +${formattedGain}` : `הפסד לא ממומש: -${formattedGain}`;
    };

    const startGainElement = dependencies.getElement('startUnrealizedGain');
    if (startGainElement) {
      startGainElement.textContent = formatGain(startUnrealizedGain);
      startGainElement.className = getGainColorClass(startUnrealizedGain);
    }

    const endGainElement = dependencies.getElement('endUnrealizedGain');
    if (endGainElement) {
      endGainElement.textContent = formatGain(endUnrealizedGain);
      endGainElement.className = getGainColorClass(endUnrealizedGain);
    }

    const displayPeakWithTax = (
      valueElementId: string,
      gainElementId: string,
      taxElementId: string,
      centerClass: boolean = false
    ): void => {
      if (dependencies.state.useRetirementPortfolio) {
        dependencies.setTextContent(
          valueElementId,
          dependencies.formatCurrency(convertValue(grossPeakValue), dependencies.state.displayCurrency)
        );

        const taxElement = dependencies.getElement(taxElementId);
        if (taxElement) {
          taxElement.textContent = `מס לתשלום: ${dependencies.formatCurrency(
            convertValue(retirementTaxToPay),
            dependencies.state.displayCurrency
          )}`;
          taxElement.classList.remove('hidden');
        }

        const gainElement = dependencies.getElement(gainElementId);
        if (gainElement) {
          gainElement.classList.add('hidden');
        }
      } else {
        dependencies.setTextContent(
          valueElementId,
          dependencies.formatCurrency(convertValue(peakValue), dependencies.state.displayCurrency)
        );

        const taxElement = dependencies.getElement(taxElementId);
        if (taxElement) {
          taxElement.classList.add('hidden');
        }

        const gainElement = dependencies.getElement(gainElementId);
        if (gainElement) {
          gainElement.textContent = formatGain(grossPeakUnrealizedGain);
          gainElement.className = getGainColorClass(grossPeakUnrealizedGain, centerClass);
          gainElement.classList.remove('hidden');
        }
      }
    };

    displayPeakWithTax('peakValue', 'peakUnrealizedGain', 'peakTaxToPay', false);
    displayPeakWithTax('accumulationEndValue', 'accumulationEndUnrealizedGain', 'accumulationEndTaxToPay', true);
  }

  function updateCharts(result: FireCalculationResult): void {
    const usdIlsRate = dependencies.getUsdIlsRate();
    const earlyRetirementYear = dependencies.getEarlyRetirementYear();
    const birthYear = dependencies.getInputNumber('birthYear', 1990);
    const fullRetirementAge = dependencies.getInputNumber('fullRetirementAge', 67);
    const targetRetirementAge = Math.max(fullRetirementAge, DEFAULT_RESULTS_PROJECTION_AGE);
    const plannedRetirementEndYear = birthYear + targetRetirementAge;
    const finalProjectionYear = result.yearlyData?.length
      ? result.yearlyData[result.yearlyData.length - 1].year
      : plannedRetirementEndYear;
    const currentYear = new Date().getFullYear();

    const currentPortfolioData = dependencies.convertPortfolioToChartData(
      dependencies.state.accumulationPortfolio,
      usdIlsRate
    );
    const preRetirementData = result.preRetirementPortfolio || [];
    const retirementData = result.retirementPortfolio || [];

    dependencies.updateDonutChart(
      'startAccumulationChart',
      currentPortfolioData,
      currentYear,
      dependencies.state.displayCurrency,
      usdIlsRate
    );
    dependencies.updateDonutChart(
      'startRetirementChart',
      preRetirementData.length > 0 ? preRetirementData : currentPortfolioData,
      earlyRetirementYear,
      dependencies.state.displayCurrency,
      usdIlsRate
    );
    dependencies.updateDonutChart(
      'endRetirementChart',
      retirementData.length > 0 ? retirementData : currentPortfolioData,
      finalProjectionYear,
      dependencies.state.displayCurrency,
      usdIlsRate
    );
    dependencies.updateDonutChart(
      'accumulationEndChart',
      preRetirementData.length > 0 ? preRetirementData : currentPortfolioData,
      earlyRetirementYear,
      dependencies.state.displayCurrency,
      usdIlsRate
    );

    // Compute RSU grants and timeline once – used by both the main chart annotation and the RSU charts.
    const rsuGrants = dependencies.getRsuGrants();
    let rsuTimeline: RsuYearlyData[] | undefined;
    let rsuEndYear: number | undefined;

    if (rsuGrants.length > 0) {
      const rsuStartYear = new Date().getFullYear();
      // +2 accounts for the Section 102 holding period that extends sales beyond the vesting cliff
      let rsuLastSellYear = earlyRetirementYear;
      for (const grant of rsuGrants) {
        const grantYear = new Date(grant.grantDate).getFullYear();
        const sellYear = grantYear + grant.vestingPeriodYears + 2;
        if (sellYear > rsuLastSellYear) {
          rsuLastSellYear = sellYear;
        }
      }
      rsuEndYear = Math.max(rsuLastSellYear + 1, earlyRetirementYear);
      rsuTimeline = dependencies.calculateRsuTimeline(rsuStartYear, rsuEndYear, earlyRetirementYear);
    }

    if (result.yearlyData && result.yearlyData.length > 0) {
      const mainChartRsuTimeline = result.rsuTimeline && result.rsuTimeline.length > 0
        ? result.rsuTimeline
        : rsuTimeline;

      dependencies.updateMainChart({
        canvasId: 'mainChart',
        data: result,
        currency: dependencies.state.displayCurrency,
        usdIlsRate,
        earlyRetirementYear,
        expenses: dependencies.state.expenses,
        inflationRate: dependencies.getInputNumber('inflationRate', 2),
        capitalGainsTax: dependencies.getInputNumber('capitalGainsTax', 25),
        targetMonthlyExpense: dependencies.getInputNumber('targetMonthlyExpense', 0),
        targetMonthlyExpenseCurrency: dependencies.getTargetMonthlyExpenseCurrency(),
        withdrawalRate: dependencies.getInputNumber('withdrawalRate', 4),
        birthYear,
        fullRetirementAge,
        rsuTimeline: mainChartRsuTimeline
      });
    }

    if (rsuGrants.length > 0 && rsuTimeline && rsuEndYear != null) {
      const rsuStartYear = new Date().getFullYear();
      const grantTimelines = dependencies.calculatePerGrantTimelines(rsuStartYear, rsuEndYear, earlyRetirementYear);

      const totalRemainingShares = rsuGrants.reduce(
        (sum, grant) => sum + grant.numberOfShares - (grant.sharesSold || 0),
        0
      );
      const totalCostBasis = rsuGrants.reduce((sum, grant) => {
        const remaining = grant.numberOfShares - (grant.sharesSold || 0);
        return sum + grant.priceAtGrant * remaining;
      }, 0);
      const avgCostBasisPerShare = totalRemainingShares > 0
        ? totalCostBasis / totalRemainingShares
        : 0;

      if (rsuTimeline.length > 0) {
        dependencies.updateRsuValueChart({
          canvasId: 'rsuTimelineChart',
          data: rsuTimeline,
          grantTimelines,
          currency: dependencies.state.displayCurrency,
          usdIlsRate,
          earlyRetirementYear,
          costBasisPerShare: avgCostBasisPerShare
        });
        dependencies.updateRsuSharesChart({
          canvasId: 'rsuSharesChart',
          earlyRetirementYear
        });

        const now = new Date();
        let totalShares = 0;
        let vestedShares = 0;
        let soldShares = 0;
        let section102Eligible = 0;

        for (const grant of rsuGrants) {
          totalShares += grant.numberOfShares;
          vestedShares += dependencies.calculateVestedShares(grant, now);
          soldShares += grant.sharesSold || 0;
          section102Eligible += dependencies.calculateSection102EligibleShares(grant, now);
        }

        const nestedDonutData: RsuNestedDonutData = {
          totalShares,
          vestedShares,
          unvestedShares: totalShares - vestedShares,
          soldShares,
          section102Eligible,
          currentPrice: dependencies.getRsuConfiguration().currentPricePerShare
        };

        dependencies.updateRsuNestedDonutChart('rsuNestedDonutChart', nestedDonutData);
      }
    }

    dependencies.updateExpensesChart();

    const sankeyManager = dependencies.getSankeyManager();
    if (sankeyManager) {
      sankeyManager.update(result, dependencies.state.displayCurrency, usdIlsRate);
    }
  }

  return {
    displayResults,
    updateCharts
  };
}
