/**
 * Chart Manager
 * Wrapper for Chart.js chart management
 */

import type {
  PortfolioAsset,
  PortfolioChartData,
  FireCalculationResult,
  Currency,
  PlannedExpense,
  MainChartOptions
} from '../types/index.js';
import type { RsuYearlyData } from '../types/rsu-types.js';
import { getMoneySymbol } from '../types/index.js';
import { formatCurrency, safeFormatCurrency } from '../utils/formatter.js';
import { convertToDisplayCurrency } from '../utils/currency.js';
import { getBaseYear, CALCULATION_CONFIG } from '../config/calculation-constants.js';

// Chart.js is loaded via CDN, declare global
declare const Chart: any;

/**
 * Minimal interface for Chart.js instance methods we use.
 * Chart.js v4+ is loaded via CDN, so we define the methods we need
 * to provide better type documentation than `any`.
 * 
 * This is not a complete Chart.js type definition - it only covers
 * the methods actually used in this module.
 */
interface ChartInstance {
  /** Update the chart to reflect data/config changes. Optional mode parameter for animation control. */
  update(mode?: string): void;
  /** Destroy the chart instance and remove listeners */
  destroy(): void;
  /** Reset zoom to original state (requires chartjs-plugin-zoom) */
  resetZoom?(): void;
  /** Zoom in/out by a factor (requires chartjs-plugin-zoom) */
  zoom?(factor: number): void;
  /** Pan the chart (requires chartjs-plugin-zoom) */
  pan?(delta: { x?: number; y?: number }, scales?: any, mode?: string): void;
  /** Chart data object */
  data: {
    labels?: (string | number)[];
    datasets: Array<{
      label?: string;
      data: (number | null)[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      [key: string]: any;
    }>;
  };
  /** Chart options */
  options: {
    scales?: Record<string, any>;
    plugins?: Record<string, any>;
    [key: string]: any;
  };
  /** Scale references for zoom/pan sync */
  scales: Record<string, {
    min: number;
    max: number;
    options: {
      min?: number;
      max?: number;
    };
  }>;
  /** Custom property for storing age axis sync data */
  _ageAxisData?: {
    minAge: number;
    maxAge: number;
    yearlyData: Array<{ age: number }>;
    totalYears: number;
    defaultMinIndex: number;
    defaultMaxIndex: number;
    defaultMinAge: number;
    defaultMaxAge: number;
  };
}

const DEFAULT_MAIN_CHART_FUTURE_YEARS = 30;

// ============================================================================
// Chart Color Palettes
// ============================================================================

export const CHART_COLORS = {
  portfolio: [
    'rgba(59, 130, 246, 0.8)',   // Blue
    'rgba(16, 185, 129, 0.8)',   // Green
    'rgba(245, 158, 11, 0.8)',   // Yellow
    'rgba(239, 68, 68, 0.8)',    // Red
    'rgba(139, 92, 246, 0.8)',   // Purple
    'rgba(236, 72, 153, 0.8)',   // Pink
    'rgba(20, 184, 166, 0.8)',   // Teal
    'rgba(251, 146, 60, 0.8)',   // Orange
  ],
  expenses: [
    'rgba(239, 68, 68, 0.8)',
    'rgba(59, 130, 246, 0.8)',
    'rgba(16, 185, 129, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(139, 92, 246, 0.8)',
    'rgba(236, 72, 153, 0.8)',
    'rgba(20, 184, 166, 0.8)',
    'rgba(251, 146, 60, 0.8)',
  ],
  accumulation: 'rgba(59, 130, 246, 0.6)',
  retirement: 'rgba(16, 185, 129, 0.6)',
  contributions: 'rgba(156, 163, 175, 0.4)',
};

// ============================================================================
// Chart Instances Registry
// ============================================================================

const chartInstances: Map<string, ChartInstance> = new Map();

/**

 * Get or create a chart instance
 */
export function getChartInstance(canvasId: string): any | null {
  return chartInstances.get(canvasId) || null;
}

/**
 * Destroy a chart instance
 */
export function destroyChart(canvasId: string): void {
  const chart = chartInstances.get(canvasId);
  if (chart) {
    chart.destroy();
    chartInstances.delete(canvasId);
  }
}

/**
 * Destroy all chart instances
 */
export function destroyAllCharts(): void {
  chartInstances.forEach((chart) => chart.destroy());
  chartInstances.clear();
}

/**
 * Reset zoom on a chart instance
 */
export function resetChartZoom(canvasId: string): void {
  const chart = chartInstances.get(canvasId);
  if (chart && chart.resetZoom) {
    chart.resetZoom();
    if (chart._ageAxisData && chart.scales.xAge) {
      chart.scales.xAge.options.min = chart._ageAxisData.defaultMinAge;
      chart.scales.xAge.options.max = chart._ageAxisData.defaultMaxAge;
      chart.update('none');
    }
  }
}

/**
 * Zoom in on a chart instance
 */
export function zoomChartIn(canvasId: string): void {
  const chart = chartInstances.get(canvasId);
  if (chart && chart.zoom) {
    chart.zoom(1.2); // Zoom in by 20%
    syncChartAgeAxis(chart);
  }
}

/**
 * Zoom out on a chart instance
 */
export function zoomChartOut(canvasId: string): void {
  const chart = chartInstances.get(canvasId);
  if (chart && chart.zoom) {
    chart.zoom(0.8); // Zoom out by 20%
    syncChartAgeAxis(chart);
  }
}

/**
 * Pan chart left
 */
export function panChartLeft(canvasId: string): void {
  const chart = chartInstances.get(canvasId);
  if (chart && chart.pan) {
    chart.pan({ x: 50 }, undefined, 'default'); // Pan left (positive x in RTL context)
    syncChartAgeAxis(chart);
  }
}

/**
 * Pan chart right
 */
export function panChartRight(canvasId: string): void {
  const chart = chartInstances.get(canvasId);
  if (chart && chart.pan) {
    chart.pan({ x: -50 }, undefined, 'default'); // Pan right (negative x in RTL context)
    syncChartAgeAxis(chart);
  }
}

/**
 * Sync age axis with the current zoom/pan state
 */
function syncChartAgeAxis(chart: any): void {
  if (!chart._ageAxisData || !chart.scales.xAge || !chart.scales.x) return;
  
  const { yearlyData, minAge, maxAge, totalYears } = chart._ageAxisData;
  const xScale = chart.scales.x;
  
  const xMin = Math.max(0, Math.floor(xScale.min));
  const xMax = Math.min(totalYears - 1, Math.ceil(xScale.max));
  
  const visibleMinAge = yearlyData[xMin]?.age || minAge;
  const visibleMaxAge = yearlyData[xMax]?.age || maxAge;
  
  chart.scales.xAge.options.min = visibleMinAge;
  chart.scales.xAge.options.max = visibleMaxAge;
  chart.update('none');
}

function getDefaultMainChartViewport(totalYears: number): { minIndex: number; maxIndex: number } {
  return {
    minIndex: 0,
    maxIndex: Math.min(totalYears - 1, DEFAULT_MAIN_CHART_FUTURE_YEARS)
  };
}

// ============================================================================
// Target Portfolio Calculation
// ============================================================================

/**
 * Calculate the target portfolio value needed to achieve a target net monthly expense.
 * 
 * Formula: targetPortfolio = 12 × monthlyExpense / (1 - taxRate) / withdrawalRate
 * 
 * @param targetMonthlyExpense - Target net monthly expense
 * @param capitalGainsTaxRate - Capital gains tax rate as decimal (e.g., 0.25 for 25%)
 * @param withdrawalRate - Annual withdrawal rate as decimal (e.g., 0.04 for 4%)
 * @param inflationRate - Annual inflation rate as decimal (e.g., 0.03 for 3%)
 * @param yearsFromBase - Number of years from base year (for inflation adjustment)
 * @returns Target portfolio value with inflation adjustment
 * 
 * @example
 * // For ₪20,000/month target, 25% tax, 4% withdrawal, no inflation:
 * // Net Annual = 20,000 × 12 = 240,000
 * // Gross Annual = 240,000 / 0.75 = 320,000
 * // Target Portfolio = 320,000 / 0.04 = 8,000,000
 * calculateTargetPortfolioValue(20000, 0.25, 0.04, 0, 0) // Returns 8,000,000
 */
export function calculateTargetPortfolioValue(
  targetMonthlyExpense: number,
  capitalGainsTaxRate: number,
  withdrawalRate: number,
  inflationRate: number = 0,
  yearsFromBase: number = 0
): number {
  if (targetMonthlyExpense <= 0 || withdrawalRate <= 0) {
    return 0;
  }
  
  // Apply inflation adjustment
  const inflatedMonthlyExpense = targetMonthlyExpense * Math.pow(1 + inflationRate, yearsFromBase);
  
  // Calculate target portfolio value
  // Net annual expense = monthly * 12
  // Gross annual expense = net / (1 - taxRate) [accounting for capital gains tax on withdrawal]
  // Target portfolio = gross annual expense / withdrawal rate
  const netAnnualExpense = inflatedMonthlyExpense * 12;
  const grossAnnualExpense = netAnnualExpense / (1 - capitalGainsTaxRate);
  const targetPortfolioValue = grossAnnualExpense / withdrawalRate;
  
  return targetPortfolioValue;
}

// ============================================================================
// Data Conversion Functions
// ============================================================================

/**
 * Convert portfolio assets to chart data format
 */
export function convertPortfolioToChartData(
  portfolio: PortfolioAsset[],
  usdIlsRate: number
): PortfolioChartData[] {
  if (!portfolio || portfolio.length === 0) return [];

  const totalValue = portfolio.reduce((total, asset) => {
    const quantity = asset.quantity || 0;
    const price = asset.currentPrice?.amount || 0;
    return total + quantity * price;
  }, 0);

  if (totalValue === 0) return [];

  return portfolio.map(asset => {
    const quantity = asset.quantity || 0;
    const price = asset.currentPrice?.amount || 0;
    const value = quantity * price;
    return {
      symbol: asset.symbol,
      value,
      percentage: (value / totalValue) * 100
    };
  }).filter(item => item.value > 0);
}

/**
 * Convert retirement allocation to chart data format
 */
export function convertRetirementPortfolioToChartData(
  portfolio: PortfolioChartData[]
): PortfolioChartData[] {
  if (!portfolio || portfolio.length === 0) return [];
  return portfolio.filter(item => item.value > 0 || item.percentage > 0);
}

// ============================================================================
// Donut Chart
// ============================================================================

/**
 * Create or update a donut chart
 */
export function updateDonutChart(
  canvasId: string,
  data: PortfolioChartData[],
  year: number,
  currency: Currency,
  usdIlsRate: number
): any {
  const ctx = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!ctx) {
    console.warn(`Canvas element ${canvasId} not found`);
    return null;
  }

  destroyChart(canvasId);

  const hasData = data && data.length > 0 && data.some(d => d.percentage > 0);

  const chartData = hasData ? {
    labels: data.map(d => d.symbol),
    datasets: [{
      data: data.map(d => d.percentage),
      backgroundColor: CHART_COLORS.portfolio.slice(0, data.length),
      borderWidth: 1
    }]
  } : {
    labels: ['אין נתונים'],
    datasets: [{
      data: [100],
      backgroundColor: ['rgba(156, 163, 175, 0.3)'],
      borderWidth: 1
    }]
  };

  const chart = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false  // Hide legend - tooltip is enough
        },
        title: {
          display: false  // Moved to center of donut
        },
        tooltip: {
          rtl: true,
          callbacks: {
            label: function(context: any) {
              const label = context.label || '';
              const value = context.parsed || 0;
              return `${label}: ${value.toFixed(1)}%`;
            }
          }
        }
      },
      cutout: '50%'
    },
    plugins: [{
      id: 'centerText',
      afterDraw: function(chart: any) {
        const ctx = chart.ctx;
        const width = chart.width;
        const height = chart.height;
        
        ctx.save();
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#374151';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(year.toString(), width / 2, height / 2);
        ctx.restore();
      }
    }]
  });

  chartInstances.set(canvasId, chart);
  return chart;
}

// ============================================================================
// Main Growth Chart
// ============================================================================

// Milestone annotation color constants
const MILESTONE_COLORS = {
  earlyRetirement:  'rgb(239, 68, 68)',    // red
  fullRetirement:   'rgb(16, 185, 129)',   // green
  fireTarget:       'rgb(59, 130, 246)',   // blue
  rsuDepletion:     'rgb(139, 92, 246)',   // purple
} as const;

// Pixel offsets (yAdjust) applied to labels that share the same x-tick so
// they remain readable at the top of the chart without overlapping.
// All labels are positioned at 'end' (top of the vertical line = top of the
// chart area in chartjs-plugin-annotation v3); each subsequent overlapping
// label is shifted down by one slot (~22 px ≈ font-size + padding).
// A small initial offset (5 px) prevents the label from clipping against the
// top edge.  Supports up to 4 concurrent milestones; a fifth reuses the last.
const LABEL_Y_ADJUSTS = [5, 27, 49, 71] as const;

/**
 * Derive the RSU depletion year from the chart's yearly data when available.
 * This keeps the event aligned with the main chart timeline and data range.
 */
function deriveRsuDepletionYearFromYearlyData(
  yearlyData: Array<{ year: number; rsuSharesSold?: number; rsuHoldingsValue?: number }>
): number | undefined {
  if (yearlyData.length === 0) return undefined;

  let hadRsuExposure = false;

  for (let index = 0; index < yearlyData.length; index++) {
    const currentYear = yearlyData[index];
    const sharesSold = currentYear.rsuSharesSold ?? 0;
    const holdingsValue = currentYear.rsuHoldingsValue ?? 0;

    if (sharesSold > 0 || holdingsValue > 0) {
      hadRsuExposure = true;
    }

    if (!hadRsuExposure || holdingsValue > 0) {
      continue;
    }

    const previousYear = index > 0 ? yearlyData[index - 1] : undefined;
    const previousHoldingsValue = previousYear?.rsuHoldingsValue ?? 0;
    const previousSharesSold = previousYear?.rsuSharesSold ?? 0;

    if (sharesSold > 0 || previousHoldingsValue > 0 || previousSharesSold > 0) {
      return currentYear.year;
    }
  }

  return undefined;
}

/**
 * Derive the last year that had any RSU share sales from the dedicated RSU timeline.
 * Returns undefined when the timeline is empty or has no sales.
 */
function deriveRsuDepletionYearFromTimeline(rsuTimeline: RsuYearlyData[] | undefined): number | undefined {
  if (!rsuTimeline || rsuTimeline.length === 0) return undefined;
  let lastSaleYear: number | undefined;
  for (const entry of rsuTimeline) {
    if (entry.sharesSold > 0) {
      lastSaleYear = entry.year;
    }
  }
  return lastSaleYear;
}

/**
 * Derive the first year where the portfolio meets or exceeds the FIRE target.
 * Returns undefined when no target series exists or the target is never reached.
 */
function deriveFireTargetYear(
  yearlyData: Array<{ year: number }>,
  portfolioValues: Array<number | null>,
  targetPortfolioValues: Array<number | null>
): number | undefined {
  const itemCount = Math.min(yearlyData.length, portfolioValues.length, targetPortfolioValues.length);

  for (let index = 0; index < itemCount; index++) {
    const portfolioValue = portfolioValues[index];
    const targetValue = targetPortfolioValues[index];
    if (
      typeof portfolioValue === 'number' &&
      typeof targetValue === 'number' &&
      targetValue > 0 &&
      portfolioValue >= targetValue
    ) {
      return yearlyData[index]?.year;
    }
  }

  return undefined;
}

/**
 * Build the chartjs-plugin-annotation `annotations` record for the four
 * FIRE milestone events.  Only creates entries for events whose data is
 * present.  When multiple events share the same chart index the labels are
 * staggered vertically so they remain readable.
 *
 * @param yearlyData  - The chart's yearlyData array (one entry per x-tick)
 * @param opts        - Milestone source values derived from chart options
 */
export function buildMilestoneAnnotations(
  yearlyData: Array<{ year: number; rsuSharesSold?: number; rsuHoldingsValue?: number }>,
  opts: {
    earlyRetirementYear: number;
    birthYear?: number;
    fullRetirementAge?: number;
    fireTargetYear?: number;
    fireAgeReached?: number;
    rsuTimeline?: RsuYearlyData[];
  }
): Record<string, object> {
  const { earlyRetirementYear, birthYear, fullRetirementAge, fireTargetYear, fireAgeReached, rsuTimeline } = opts;

  // --- derive each milestone year ---
  const fullRetirementYear =
    birthYear != null && fullRetirementAge != null
      ? birthYear + fullRetirementAge
      : undefined;

  const fallbackFireTargetYear =
    birthYear != null && fireAgeReached != null
      ? birthYear + fireAgeReached
      : undefined;

  const rsuDepletionYear =
    deriveRsuDepletionYearFromYearlyData(yearlyData) ??
    deriveRsuDepletionYearFromTimeline(rsuTimeline);

  // --- candidate milestones in priority order ---
  const candidates: Array<{ key: string; year: number; label: string; color: string }> = [
    {
      key: 'earlyRetirementLine',
      year: earlyRetirementYear,
      label: 'פרישה מוקדמת',
      color: MILESTONE_COLORS.earlyRetirement
    },
    ...(fullRetirementYear != null
      ? [{ key: 'fullRetirementLine', year: fullRetirementYear, label: 'פרישה מלאה', color: MILESTONE_COLORS.fullRetirement }]
      : []),
    ...((fireTargetYear ?? fallbackFireTargetYear) != null
      ? [{ key: 'fireTargetLine', year: fireTargetYear ?? fallbackFireTargetYear!, label: 'יעד הושג', color: MILESTONE_COLORS.fireTarget }]
      : []),
    ...(rsuDepletionYear != null
      ? [{ key: 'rsuDepletionLine', year: rsuDepletionYear, label: 'כל ה-RSU נמכרו', color: MILESTONE_COLORS.rsuDepletion }]
      : [])
  ];

  // --- filter to only those that appear in the chart data ---
  type Candidate = { key: string; year: number; label: string; color: string; index: number };
  const visible: Candidate[] = [];
  for (const c of candidates) {
    const index = yearlyData.findIndex(d => d.year === c.year);
    if (index >= 0) {
      visible.push({ ...c, index });
    }
  }

  if (visible.length === 0) return {};

  // --- sort by index so we can stagger labels that are close to each other ---
  visible.sort((a, b) => a.index - b.index);

// --- assign staggering slots based on pixel distance at render time ---
  const MIN_PIXEL_DISTANCE = 85; // Roughly the width of a label text + padding

  // --- build annotation objects ---
  const annotations: Record<string, object> = {};

  for (const item of visible) {
    annotations[item.key] = {
      type: 'line',
      xMin: item.index,
      xMax: item.index,
      borderColor: item.color,
      borderWidth: 2,
      borderDash: [6, 6],
      label: {
        display: true,
        content: item.label,
        position: 'end',
        yAdjust: (ctx: any) => {
          const chart = ctx.chart;
          if (!chart || !chart.scales || !chart.scales.x) {
             return LABEL_Y_ADJUSTS[0];
          }
          const xScale = chart.scales.x;
          
          const slotLastUsedPixel: number[] = [];
          let mySlot = 0;
          
          for (const v of visible) {
            const pixelPos = xScale.getPixelForValue(v.index);
            
            let slot = 0;
            while (
              slot < slotLastUsedPixel.length &&
              Math.abs(pixelPos - slotLastUsedPixel[slot]) < MIN_PIXEL_DISTANCE
            ) {
              slot++;
            }
            slotLastUsedPixel[slot] = pixelPos;
            
            if (v.key === item.key) {
              mySlot = slot;
              break;
            }
          }
          
          return LABEL_Y_ADJUSTS[mySlot] ?? LABEL_Y_ADJUSTS[LABEL_Y_ADJUSTS.length - 1];
        },
        backgroundColor: item.color,
        color: 'white',
        font: { size: 11 },
        padding: { x: 4, y: 2 }
      }
    };
  }

  return annotations;
}

/**
 * Create or update the main portfolio growth chart
 * @param options - Chart configuration options
 * @returns Chart.js instance or null if canvas not found
 */
export function updateMainChart(options: MainChartOptions): ChartInstance | null;

/**
 * Create or update the main portfolio growth chart (legacy signature for backward compatibility)
 * @deprecated Use the options object signature instead
 */
export function updateMainChart(
  canvasId: string,
  data: FireCalculationResult,
  currency: Currency,
  usdIlsRate: number,
  earlyRetirementYear: number,
  expenses?: PlannedExpense[],
  inflationRate?: number,
  capitalGainsTax?: number,
  targetMonthlyExpense?: number,
  targetMonthlyExpenseCurrency?: Currency,
  withdrawalRate?: number
): ChartInstance | null;

/**
 * Implementation of updateMainChart supporting both signatures
 */
export function updateMainChart(
  optionsOrCanvasId: MainChartOptions | string,
  data?: FireCalculationResult,
  currency?: Currency,
  usdIlsRate?: number,
  earlyRetirementYear?: number,
  expenses: PlannedExpense[] = [],
  inflationRate: number = 2,
  capitalGainsTax: number = 25,
  targetMonthlyExpense: number = 0,
  targetMonthlyExpenseCurrency: Currency = '₪',
  withdrawalRate: number = 4
): ChartInstance | null {
  // Normalize to options object
  const opts: MainChartOptions = typeof optionsOrCanvasId === 'string'
    ? {
        canvasId: optionsOrCanvasId,
        data: data!,
        currency: currency!,
        usdIlsRate: usdIlsRate!,
        earlyRetirementYear: earlyRetirementYear!,
        expenses,
        inflationRate,
        capitalGainsTax,
        targetMonthlyExpense,
        targetMonthlyExpenseCurrency,
        withdrawalRate
      }
    : optionsOrCanvasId;

  // Extract options with defaults
  const {
    canvasId,
    data: chartData,
    currency: displayCurrency,
    usdIlsRate: exchangeRate,
    earlyRetirementYear: retirementYear,
    expenses: plannedExpenses = [],
    inflationRate: inflation = 2,
    capitalGainsTax: taxRate = 25,
    targetMonthlyExpense: targetExpense = 0,
    targetMonthlyExpenseCurrency: targetCurrency = '₪',
    withdrawalRate: withdrawal = 4,
    birthYear,
    fullRetirementAge,
    rsuTimeline
  } = opts;

  const ctx = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!ctx) {
    console.warn(`Canvas element ${canvasId} not found`);
    return null;
  }

  destroyChart(canvasId);

  const labels = chartData.yearlyData.map(d => d.year.toString());
  const portfolioValues = chartData.yearlyData.map(d => 
    convertToDisplayCurrency(d.portfolioValue, '$', displayCurrency, exchangeRate)
  );
  const contributionValues = chartData.yearlyData.map(d => {
    if (d.totalContributions) {
      return convertToDisplayCurrency(d.totalContributions, '$', displayCurrency, exchangeRate);
    }
    return null;
  });

  // Calculate withdrawals including planned expenses (matching original behavior)
  const inflationRateDecimal = inflation / 100;
  const capitalGainsTaxDecimal = taxRate / 100;
  const baseYear = getBaseYear(); // Use centralized base year function
  
  const withdrawalsData = chartData.yearlyData.map(d => {
    let withdrawalAmount = 0;
    
    // Add regular retirement withdrawals
    if (d.phase === 'retirement' && d.annualWithdrawal) {
      withdrawalAmount += d.annualWithdrawal;
    }
    
    // Add planned expenses for this year (including repeated expenses)
    const yearExpenses = plannedExpenses.filter(expense => {
      const frequencyYears = expense.frequencyYears || 1;
      const repetitionCount = expense.repetitionCount || 1;
      const startYear = expense.year;
      
      // Check if this year matches any occurrence of the repeated expense
      for (let i = 0; i < repetitionCount; i++) {
        const occurrenceYear = startYear + (i * frequencyYears);
        if (occurrenceYear === d.year) {
          return true;
        }
      }
      return false;
    });
    
    if (yearExpenses.length > 0) {
      yearExpenses.forEach(expense => {
        // Convert expense to USD if needed
        const expenseCurrency = getMoneySymbol(expense.netAmount);
        let netAmountUSD = expense.netAmount.amount;
        if (expenseCurrency === '₪') {
          netAmountUSD = expense.netAmount.amount / exchangeRate;
        }

        // Apply inflation based on years from base year (dynamic current year)
        const yearsFromBase = d.year - baseYear;
        const inflatedAmount = netAmountUSD * Math.pow(1 + inflationRateDecimal, yearsFromBase);
        
        // Apply tax implications
        let grossAmount: number;
        if (d.phase === 'retirement' && d.totalContributions) {
          const profitRatio = Math.max(0, Math.min(1, 
            (d.portfolioValue - d.totalContributions) / d.portfolioValue
          ));
          grossAmount = inflatedAmount / (1 - (profitRatio * capitalGainsTaxDecimal));
        } else {
          grossAmount = inflatedAmount;
        }
        
        withdrawalAmount += grossAmount;
      });
    }
    
    // Convert to display currency and return null if zero
    if (withdrawalAmount > 0) {
      return convertToDisplayCurrency(withdrawalAmount, '$', displayCurrency, exchangeRate);
    }
    return null;
  });

  // Calculate taxes paid for each year
  // Use the overall totalContributions for profit ratio calculation during retirement
  const overallTotalContributions = chartData.totalContributions || 0;
  const retirementTaxToPay = chartData.retirementTaxToPay || 0;
  
  const taxesPaidData = chartData.yearlyData.map(d => {
    let taxAmount = 0;
    
    // Add retirement portfolio switch tax in the first retirement year
    if (d.year === retirementYear && retirementTaxToPay > 0) {
      taxAmount += retirementTaxToPay;
    }
    
    // Calculate tax on retirement withdrawals
    if (d.phase === 'retirement' && d.annualWithdrawal) {
      // Use totalContributions from yearlyData if available, otherwise use overall
      const contributions = d.totalContributions || overallTotalContributions;
      const profitRatio = contributions > 0 && d.portfolioValue > contributions
        ? Math.max(0, Math.min(1, (d.portfolioValue - contributions) / d.portfolioValue))
        : 0.5; // Default to 50% profit ratio if we can't calculate
      // Tax is the difference between gross and net: grossWithdrawal * profitRatio * taxRate
      taxAmount += d.annualWithdrawal * profitRatio * capitalGainsTaxDecimal;
    }
    
    // Calculate tax on planned expenses
    const yearExpenses = plannedExpenses.filter(expense => {
      const frequencyYears = expense.frequencyYears || 1;
      const repetitionCount = expense.repetitionCount || 1;
      const startYear = expense.year;
      
      for (let i = 0; i < repetitionCount; i++) {
        const occurrenceYear = startYear + (i * frequencyYears);
        if (occurrenceYear === d.year) {
          return true;
        }
      }
      return false;
    });
    
    if (yearExpenses.length > 0 && d.phase === 'retirement') {
      const contributions = d.totalContributions || overallTotalContributions;
      const profitRatio = contributions > 0 && d.portfolioValue > contributions
        ? Math.max(0, Math.min(1, (d.portfolioValue - contributions) / d.portfolioValue))
        : 0.5;
        
      yearExpenses.forEach(expense => {
        const expenseCurrency = getMoneySymbol(expense.netAmount);
        let netAmountUSD = expense.netAmount.amount;
        if (expenseCurrency === '₪') {
          netAmountUSD = expense.netAmount.amount / exchangeRate;
        }

        const yearsFromBase = d.year - baseYear;
        const inflatedAmount = netAmountUSD * Math.pow(1 + inflationRateDecimal, yearsFromBase);

        const grossAmount = inflatedAmount / (1 - (profitRatio * capitalGainsTaxDecimal));
        taxAmount += grossAmount - inflatedAmount;
      });
    }
    
    if (taxAmount > 0) {
      return convertToDisplayCurrency(taxAmount, '$', displayCurrency, exchangeRate);
    }
    return null;
  });

  // Calculate target portfolio value for each year using the extracted helper function
  const withdrawalRateDecimal = withdrawal / 100;
  const targetPortfolioData = chartData.yearlyData.map(d => {
    if (targetExpense <= 0) {
      return null;
    }
    
    // Convert target monthly expense to USD if needed
    let targetMonthlyUSD = targetExpense;
    if (targetCurrency === '₪') {
      targetMonthlyUSD = targetExpense / exchangeRate;
    }
    
    // Use the extracted helper function for calculation
    const yearsFromBase = d.year - baseYear;
    const targetPortfolioValue = calculateTargetPortfolioValue(
      targetMonthlyUSD,
      capitalGainsTaxDecimal,
      withdrawalRateDecimal,
      inflationRateDecimal,
      yearsFromBase
    );
    
    return convertToDisplayCurrency(targetPortfolioValue, '$', displayCurrency, exchangeRate);
  });

  const fireTargetYear = deriveFireTargetYear(
    chartData.yearlyData,
    portfolioValues,
    targetPortfolioData
  );

  // Get age data for secondary axis
  const minAge = chartData.yearlyData[0]?.age || 0;
  const maxAge = chartData.yearlyData[chartData.yearlyData.length - 1]?.age || 100;
  const totalYears = chartData.yearlyData.length;
  const defaultViewport = getDefaultMainChartViewport(totalYears);
  const defaultMinLabel = labels[defaultViewport.minIndex];
  const defaultMaxLabel = labels[defaultViewport.maxIndex];
  const defaultMinAge = chartData.yearlyData[defaultViewport.minIndex]?.age || minAge;
  const defaultMaxAge = chartData.yearlyData[defaultViewport.maxIndex]?.age || maxAge;

  // Build milestone annotations for all four events
  const milestoneAnnotations = buildMilestoneAnnotations(chartData.yearlyData, {
    earlyRetirementYear: retirementYear,
    birthYear,
    fullRetirementAge,
    fireTargetYear,
    fireAgeReached: chartData.fireAgeReached,
    rsuTimeline
  });

  // Helper function to sync age axis with year axis on zoom/pan
  const syncAgeAxis = (chart: ChartInstance) => {
    const xScale = chart.scales.x;
    const xAgeScale = chart.scales.xAge;
    if (xScale && xAgeScale) {
      // Get the visible range of the x axis (index-based for category scale)
      const xMin = Math.max(0, Math.floor(xScale.min));
      const xMax = Math.min(totalYears - 1, Math.ceil(xScale.max));
      
      // Map to corresponding ages
      const visibleMinAge = chartData.yearlyData[xMin]?.age || minAge;
      const visibleMaxAge = chartData.yearlyData[xMax]?.age || maxAge;
      
      xAgeScale.options.min = visibleMinAge;
      xAgeScale.options.max = visibleMaxAge;
      chart.update('none');
    }
  };

  // Build datasets array, conditionally including target portfolio
  const datasets: any[] = [
    {
      label: 'שווי תיק כולל',
      data: portfolioValues,
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
      borderWidth: 2
    },
    {
      label: 'סה"כ הפקדות',
      data: contributionValues,
      borderColor: '#374151',
      borderDash: [5, 5],
      fill: false,
      borderWidth: 2
    },
    {
      label: 'משיכות + הוצאות מתוכננות',
      data: withdrawalsData,
      borderColor: '#EF4444',
      borderDash: [3, 3],
      fill: false,
      borderWidth: 2
    },
    {
      label: 'מסים ששולמו',
      data: taxesPaidData,
      borderColor: '#F59E0B',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderDash: [2, 2],
      fill: false,
      borderWidth: 2
    }
  ];

  // Add target portfolio series if target monthly expense is set
  if (typeof targetExpense !== 'undefined' && targetExpense > 0) {
    datasets.push({
      label: 'תיק יעד בהתאם להוצאה חודשית נטו',
      data: targetPortfolioData,
      borderColor: '#10B981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderDash: [8, 4],
      fill: false,
      tension: 0.4,
      borderWidth: 2.5
    });
  }

  const chart = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 200
      },
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 15
          }
        },
        tooltip: {
          rtl: true,
          callbacks: {
            title: function(context: any) {
              const yearIndex = context[0].dataIndex;
              const yearData = chartData.yearlyData[yearIndex];
              return `שנה ${yearData.year} (גיל ${yearData.age})`;
            },
            label: function(context: any) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              if (value === null || value === undefined) return '';
              return `${label}: ${safeFormatCurrency(value, displayCurrency)}`;
            },
            afterBody: function(context: any) {
              const yearIndex = context[0].dataIndex;
              const year = chartData.yearlyData[yearIndex].year;
              
              // Find planned expenses for this year (including repeated expenses)
              const yearExpenses = plannedExpenses.filter(expense => {
                const frequencyYears = expense.frequencyYears || 1;
                const repetitionCount = expense.repetitionCount || 1;
                const startYear = expense.year;
                
                for (let i = 0; i < repetitionCount; i++) {
                  const occurrenceYear = startYear + (i * frequencyYears);
                  if (occurrenceYear === year) {
                    return true;
                  }
                }
                return false;
              });
              
              if (yearExpenses.length > 0) {
                const expenseLines: string[] = ['', 'הוצאות מתוכננות השנה:'];
                yearExpenses.forEach(expense => {
                  const expenseCurrency = getMoneySymbol(expense.netAmount);
                  let netAmountDisplay = expense.netAmount.amount;
                  if (expenseCurrency !== displayCurrency) {
                    netAmountDisplay = convertToDisplayCurrency(expense.netAmount.amount, expenseCurrency, displayCurrency, exchangeRate);
                  }

                  const yearsFromBase = year - baseYear;
                  const inflatedAmount = netAmountDisplay * Math.pow(1 + inflationRateDecimal, yearsFromBase);

                  const repetitionCount = expense.repetitionCount || 1;
                  const repetitionInfo = repetitionCount > 1 ? ` (חוזר ${repetitionCount} פעמים)` : '';
                  expenseLines.push(`• ${expense.type}${repetitionInfo}: ${safeFormatCurrency(inflatedAmount, displayCurrency)}`);
                });
                return expenseLines;
              }
              
              return [];
            }
          }
        },
        annotation: Object.keys(milestoneAnnotations).length > 0 ? {
          annotations: milestoneAnnotations
        } : undefined,
        zoom: {
          pan: {
            enabled: true,
            mode: 'x',
            onPan: function({ chart }: { chart: any }) {
              syncAgeAxis(chart);
            }
          },
          zoom: {
            wheel: {
              enabled: false,
              speed: 0.1
            },
            pinch: {
              enabled: false,
              speed: 0.005
            },
            drag: {
              enabled: false
            },
            mode: 'x',
            onZoom: function({ chart }: { chart: any }) {
              syncAgeAxis(chart);
            }
          },
          limits: {
            x: {
              min: 0,
              max: totalYears - 1
            },
            y: {
              min: 'original',
              max: 'original'
            }
          }
        }
      },
      scales: {
        x: {
          position: 'bottom',
          min: defaultMinLabel,
          max: defaultMaxLabel,
          title: {
            display: true,
            text: 'שנה'
          },
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            maxTicksLimit: 15
          }
        },
        xAge: {
          type: 'linear',
          position: 'top',
          title: {
            display: true,
            text: 'גיל'
          },
          grid: {
            display: false
          },
          min: defaultMinAge,
          max: defaultMaxAge,
          ticks: {
            stepSize: 5,
            maxTicksLimit: 15,
            callback: function(value: number) {
              return Math.round(value);
            }
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            callback: function(value: number) {
              return safeFormatCurrency(value, displayCurrency);
            }
          }
        }
      }
    }
  });

  // Store age axis data for reset functionality
  chart._ageAxisData = {
    minAge,
    maxAge,
    yearlyData: chartData.yearlyData,
    totalYears,
    defaultMinIndex: defaultViewport.minIndex,
    defaultMaxIndex: defaultViewport.maxIndex,
    defaultMinAge,
    defaultMaxAge
  };

  chartInstances.set(canvasId, chart);
  return chart;
}

// ============================================================================
// Expenses Bar Chart
// ============================================================================

export interface ExpenseChartData {
  years: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
  }>;
}

/**
 * Create or update expenses bar chart
 */
export function updateExpensesBarChart(
  canvasId: string,
  data: ExpenseChartData | null,
  currency: Currency,
  title: string = 'הוצאות מתוכננות'
): any {
  const ctx = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!ctx) {
    console.warn(`Canvas element ${canvasId} not found`);
    return null;
  }

  destroyChart(canvasId);

  const chartData = data ? {
    labels: data.years,
    datasets: data.datasets
  } : {
    labels: ['אין נתונים'],
    datasets: [{
      label: 'הוסף הוצאות',
      data: [100],
      backgroundColor: 'rgba(156, 163, 175, 0.3)',
      borderColor: 'rgba(156, 163, 175, 0.5)',
      borderWidth: 1
    }]
  };

  const chart = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          rtl: true
        },
        title: {
          display: true,
          text: title,
          font: { size: 14 }
        },
        tooltip: {
          rtl: true,
          callbacks: {
            label: function(context: any) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${safeFormatCurrency(value, currency)}`;
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          title: {
            display: true,
            text: 'שנה'
          }
        },
        y: {
          stacked: true,
          title: {
            display: true,
            text: `סכום (${currency})`
          },
          ticks: {
            callback: function(value: number) {
              return safeFormatCurrency(value, currency);
            }
          }
        }
      }
    }
  });

  chartInstances.set(canvasId, chart);
  return chart;
}
