/**
 * RSU Chart Module
 * Dedicated chart component for RSU Value Over Time visualization
 */

import type { Currency } from '../types/index.js';
import type { RsuYearlyData, RsuChartOptions, RsuChartDataPoint } from '../types/rsu-types.js';
import type { GrantTimelineData } from '../services/rsu-state.js';
import { formatCurrency, safeFormatCurrency } from '../utils/formatter.js';
import { convertToDisplayCurrency } from '../utils/currency.js';
import { getChartInstance } from './chart-manager.js';
import { calculateCanonicalMonthlyTimeline, type MonthlyValueData } from '../services/rsu-state.js';

// Chart.js is loaded via CDN
declare const Chart: any;

// ============================================================================
// Chart Colors
// ============================================================================

export const RSU_CHART_COLORS = {
  /** Total RSU market value (vested + unvested) */
  totalValue: 'rgba(59, 130, 246, 0.8)',     // Blue
  /** Vested shares value */
  vestedValue: 'rgba(16, 185, 129, 0.8)',    // Green
  /** Held shares value (vested but not sold) */
  heldValue: 'rgba(245, 158, 11, 0.8)',      // Yellow/Amber
  /** Sold shares value (cumulative) */
  soldValue: 'rgba(239, 68, 68, 0.8)',       // Red
  /** Cumulative proceeds from sales */
  cumulativeProceeds: 'rgba(139, 92, 246, 0.8)', // Purple
  /** Forfeited shares value */
  forfeitedValue: 'rgba(239, 68, 68, 0.8)',  // Red
  /** Retirement line */
  retirementLine: 'rgba(239, 68, 68, 0.6)',   // Red (lighter)
  /** Grid lines */
  grid: 'rgba(156, 163, 175, 0.2)',
  /** Per-grant colors - distinct from main colors (blue, purple) */
  grantColors: [
    'rgba(249, 115, 22, 0.9)',  // Orange - distinct
    'rgba(6, 182, 212, 0.9)',   // Cyan/Teal - distinct
    'rgba(236, 72, 153, 0.9)',  // Pink/Magenta - distinct
    'rgba(132, 204, 22, 0.9)',  // Lime green - distinct from emerald
    'rgba(244, 63, 94, 0.9)',   // Rose/Coral - distinct
    'rgba(251, 191, 36, 0.9)',  // Amber/Gold - distinct
    'rgba(20, 184, 166, 0.9)',  // Teal - distinct
    'rgba(217, 70, 239, 0.9)',  // Fuchsia - distinct from purple
  ]
};

// ============================================================================
// Chart Instance Registry
// ============================================================================

const rsuChartInstances: Map<string, any> = new Map();

/**
 * Get or create an RSU chart instance
 */
export function getRsuChartInstance(canvasId: string): any | null {
  return rsuChartInstances.get(canvasId) || null;
}

/**
 * Destroy an RSU chart instance
 */
export function destroyRsuChart(canvasId: string): void {
  const chart = rsuChartInstances.get(canvasId);
  if (chart) {
    chart.destroy();
    rsuChartInstances.delete(canvasId);
  }
}

/**
 * Destroy all RSU chart instances
 */
export function destroyAllRsuCharts(): void {
  rsuChartInstances.forEach((chart) => chart.destroy());
  rsuChartInstances.clear();
}

// ============================================================================
// Data Transformation
// ============================================================================

/**
 * Transform RSU timeline data for chart display
 */
export function transformRsuTimelineForChart(
  timeline: RsuYearlyData[],
  currency: Currency,
  usdIlsRate: number,
  earlyRetirementYear: number,
  costBasisPerShare: number = 0
): RsuChartDataPoint[] {
  let cumulativeProceeds = 0;
  const section102TaxRate = 0.25; // 25% capital gains tax

  return timeline.map(yearData => {
    cumulativeProceeds += yearData.netSaleProceeds;

    // Convert values to display currency
    const totalValue = convertToDisplayCurrency(yearData.marketValue, '$', currency, usdIlsRate);
    const heldValue = convertToDisplayCurrency(yearData.sharesHeld * yearData.projectedStockPrice, '$', currency, usdIlsRate);
    const proceedsConverted = convertToDisplayCurrency(cumulativeProceeds, '$', currency, usdIlsRate);
    
    // Calculate net value of held shares (after estimated tax)
    const heldGrossValue = yearData.sharesHeld * yearData.projectedStockPrice;
    const heldCostBasis = yearData.sharesHeld * costBasisPerShare;
    const heldCapitalGain = Math.max(0, heldGrossValue - heldCostBasis);
    const heldNetValue = heldGrossValue - (heldCapitalGain * section102TaxRate);
    
    // Total net value = net value of held shares + cumulative proceeds from sales
    const totalNetValueUsd = heldNetValue + cumulativeProceeds;
    const totalNetValue = convertToDisplayCurrency(totalNetValueUsd, '$', currency, usdIlsRate);

    return {
      year: yearData.year,
      totalValue,
      vestedValue: totalValue, // For now, same as total pre-retirement
      heldValue,
      cumulativeProceeds: proceedsConverted,
      totalNetValue,
      isRetirementYear: yearData.year === earlyRetirementYear
    };
  });
}

// ============================================================================
// Chart Creation
// ============================================================================

/**
 * Create or update RSU Value Over Time chart (Monthly Resolution)
 */
export function updateRsuValueChart(options: RsuChartOptions): void {
  const { canvasId, currency, usdIlsRate, earlyRetirementYear } = options;

  // Check if Chart.js is available
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded');
    return;
  }

  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) {
    console.error(`Canvas element '${canvasId}' not found`);
    return;
  }

  // Calculate monthly data
  const monthlyData = calculateCanonicalMonthlyTimeline(earlyRetirementYear);
  
  if (monthlyData.length === 0) {
    // No data - clear chart
    destroyRsuChart(canvasId);
    return;
  }

  // Convert values to display currency
  const labels = monthlyData.map(d => d.label);
  const totalValues = monthlyData.map(d => convertToDisplayCurrency(d.totalValue, '$', currency, usdIlsRate));
  const totalNetValues = monthlyData.map(d => convertToDisplayCurrency(d.totalNetValue, '$', currency, usdIlsRate));
  const cumulativeProceeds = monthlyData.map(d => convertToDisplayCurrency(d.cumulativeProceeds, '$', currency, usdIlsRate));

  // Find retirement year start index for annotation (January of retirement year)
  const retirementIndex = monthlyData.findIndex(d => 
    d.date.getFullYear() === earlyRetirementYear && d.date.getMonth() === 0
  );

  // Build datasets array
  const datasets: any[] = [
    {
      label: 'שווי RSU כולל',
      data: totalValues,
      borderColor: RSU_CHART_COLORS.totalValue,
      backgroundColor: RSU_CHART_COLORS.totalValue.replace('0.8', '0.1'),
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointRadius: 0,  // No points for monthly data (too many)
      pointHoverRadius: 4
    },
    {
      label: 'שווי נטו צפוי',
      data: totalNetValues,
      borderColor: RSU_CHART_COLORS.heldValue,
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderDash: [8, 4],
      fill: false,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4
    },
    {
      label: 'הכנסות מצטברות נטו',
      data: cumulativeProceeds,
      borderColor: RSU_CHART_COLORS.cumulativeProceeds,
      backgroundColor: RSU_CHART_COLORS.cumulativeProceeds.replace('0.8', '0.1'),
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4
    }
  ];

  // Destroy existing chart
  destroyRsuChart(canvasId);

  // Create new chart
  const chart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        title: {
          display: false
        },
        legend: {
          display: true,
          position: 'bottom',
          rtl: true,
          labels: {
            usePointStyle: true,
            padding: 15
          }
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
        },
        // Retirement year annotation
        ...(retirementIndex >= 0 ? {
          annotation: {
            annotations: {
              retirementLine: {
                type: 'line',
                xMin: retirementIndex,
                xMax: retirementIndex,
                borderColor: RSU_CHART_COLORS.retirementLine,
                borderWidth: 2,
                borderDash: [6, 6],
                label: {
                  display: true,
                  content: 'פרישה',
                  position: 'start',
                  backgroundColor: RSU_CHART_COLORS.retirementLine,
                  color: 'white',
                  font: {
                    size: 11,
                    weight: 'bold'
                  },
                  padding: 4
                }
              }
            }
          }
        } : {})
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'תאריך',
            font: {
              size: 12
            }
          },
          grid: {
            color: RSU_CHART_COLORS.grid
          },
          ticks: {
            // Show fewer labels on x-axis to avoid crowding
            maxTicksLimit: 12,
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          title: {
            display: true,
            text: `שווי (${currency})`,
            font: {
              size: 12
            }
          },
          ticks: {
            callback: function(value: number) {
              return safeFormatCurrency(value, currency);
            }
          },
          grid: {
            color: RSU_CHART_COLORS.grid
          },
          beginAtZero: true
        }
      }
    }
  });

  rsuChartInstances.set(canvasId, chart);
  
  // Set up copy-to-clipboard button if it exists
  setupChartCopyButton(canvasId);
}

// ============================================================================
// RSU Shares Count Chart (Monthly Resolution)
// ============================================================================

import { calculateMonthlySharesTimeline, type MonthlySharesData } from '../services/rsu-state.js';

/**
 * Options for the RSU Shares Chart
 */
export interface RsuSharesChartOptions {
  canvasId: string;
  earlyRetirementYear: number;
}

/**
 * Create or update RSU Shares Count Over Time chart
 * Shows both cumulative vested and cumulative sold shares at monthly resolution
 */
export function updateRsuSharesChart(options: RsuSharesChartOptions): void {
  const { canvasId, earlyRetirementYear } = options;

  // Check if Chart.js is available
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded');
    return;
  }

  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) {
    console.error(`Canvas element '${canvasId}' not found`);
    return;
  }

  // Calculate monthly data
  const monthlyData = calculateMonthlySharesTimeline(earlyRetirementYear);
  
  if (monthlyData.length === 0) {
    // No data - clear chart
    destroyRsuChart(canvasId);
    return;
  }

  // Prepare data for chart
  const labels = monthlyData.map(d => d.label);
  const vestedSharesData = monthlyData.map(d => d.cumulativeVested);
  const soldSharesData = monthlyData.map(d => d.cumulativeSold);

  // Find retirement year start index for annotation (January of retirement year)
  const retirementIndex = monthlyData.findIndex(d => 
    d.date.getFullYear() === earlyRetirementYear && d.date.getMonth() === 0
  );

  // Build datasets - only 2 lines: vested and sold
  const datasets: any[] = [
    {
      label: 'מניות שהבשילו',
      data: vestedSharesData,
      borderColor: RSU_CHART_COLORS.vestedValue,  // Green
      backgroundColor: RSU_CHART_COLORS.vestedValue.replace('0.8', '0.1'),
      borderWidth: 2,
      fill: false,
      stepped: 'before',
      pointRadius: 0,  // No points for monthly data (too many)
      pointHoverRadius: 4
    },
    {
      label: 'מניות למכירה (מצטבר)',
      data: soldSharesData,
      borderColor: RSU_CHART_COLORS.soldValue,  // Red
      backgroundColor: RSU_CHART_COLORS.soldValue.replace('0.8', '0.1'),
      borderWidth: 2,
      fill: false,
      stepped: 'before',
      pointRadius: 0,
      pointHoverRadius: 4
    }
  ];

  // Destroy existing chart
  destroyRsuChart(canvasId);

  // Create new chart
  const chart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        title: {
          display: false
        },
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 15,
            cursor: 'pointer'
          },
          onClick: function(e: any, legendItem: any, legend: any) {
            const index = legendItem.datasetIndex;
            const chart = legend.chart;
            const meta = chart.getDatasetMeta(index);
            meta.hidden = !meta.hidden;
            chart.update();
          }
        },
        tooltip: {
          callbacks: {
            label: function(context: any) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${value.toLocaleString()} מניות`;
            }
          }
        },
        // Add retirement year annotation if within chart range
        ...(retirementIndex >= 0 ? {
          annotation: {
            annotations: {
              retirementLine: {
                type: 'line',
                xMin: retirementIndex,
                xMax: retirementIndex,
                borderColor: RSU_CHART_COLORS.retirementLine,
                borderWidth: 2,
                borderDash: [6, 6],
                label: {
                  display: true,
                  content: 'פרישה',
                  position: 'start',
                  backgroundColor: RSU_CHART_COLORS.retirementLine,
                  color: 'white',
                  font: {
                    size: 11,
                    weight: 'bold'
                  },
                  padding: 4
                }
              }
            }
          }
        } : {})
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'תאריך',
            font: {
              size: 12
            }
          },
          grid: {
            color: RSU_CHART_COLORS.grid
          },
          ticks: {
            // Show fewer labels on x-axis to avoid crowding
            maxTicksLimit: 12,
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          title: {
            display: true,
            text: 'כמות מניות',
            font: {
              size: 12
            }
          },
          ticks: {
            callback: function(value: number) {
              return value.toLocaleString();
            }
          },
          grid: {
            color: RSU_CHART_COLORS.grid
          },
          beginAtZero: true
        }
      }
    }
  });

  rsuChartInstances.set(canvasId, chart);
  
  // Set up copy-to-clipboard button if it exists
  setupChartCopyButton(canvasId);
}

/**
 * Map of canvas IDs to their copy button IDs
 */
const CHART_COPY_BUTTON_MAP: Record<string, string> = {
  'rsuSharesChart': 'copyRsuSharesChartBtn',
  'rsuTimelineChart': 'copyRsuTimelineChartBtn',
  'expensesChart': 'copyExpensesChartBtn',
  'mainChart': 'copyMainChartBtn',
  'resultsExpensesChart': 'copyResultsExpensesChartBtn'
};

/**
 * Set up copy-to-clipboard functionality for a chart.
 * Can be called from any module to enable copy functionality for supported charts.
 */
export function setupChartCopyButton(canvasId: string): void {
  const buttonId = CHART_COPY_BUTTON_MAP[canvasId];
  if (!buttonId) return;
  
  const button = document.getElementById(buttonId);
  if (!button) return;
  
  // Remove existing listener to avoid duplicates
  const newButton = button.cloneNode(true) as HTMLElement;
  button.parentNode?.replaceChild(newButton, button);
  
  newButton.addEventListener('click', async () => {
    await copyChartToClipboard(canvasId, newButton);
  });
}

/**
 * Copy chart data to clipboard as tab-separated text
 */
async function copyChartToClipboard(canvasId: string, button: HTMLElement): Promise<void> {
  // Try RSU chart instances first, then fall back to main chart instances
  let chart = rsuChartInstances.get(canvasId);
  if (!chart) {
    chart = getChartInstance(canvasId);
  }
  if (!chart) return;
  
  try {
    const labels = chart.data.labels as string[];
    const datasets = chart.data.datasets as Array<{ label: string; data: number[] }>;
    
    // Build header row: Date + dataset labels
    const headers = ['תאריך', ...datasets.map(ds => ds.label)];
    
    // Build data rows
    const rows: string[] = [headers.join('\t')];
    
    for (let i = 0; i < labels.length; i++) {
      const rowData = [labels[i], ...datasets.map(ds => ds.data[i]?.toLocaleString() ?? '')];
      rows.push(rowData.join('\t'));
    }
    
    const text = rows.join('\n');
    
    await navigator.clipboard.writeText(text);
    showCopyFeedback(button, true);
  } catch (error) {
    console.error('Failed to copy chart data:', error);
    showCopyFeedback(button, false);
  }
}

/**
 * Show visual feedback after copy attempt
 */
function showCopyFeedback(button: HTMLElement, success: boolean): void {
  const originalContent = button.innerHTML;
  const originalClass = button.className;
  
  if (success) {
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    `;
    button.className = button.className.replace('text-gray-500', 'text-green-600');
  } else {
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    `;
    button.className = button.className.replace('text-gray-500', 'text-red-600');
  }
  
  // Restore original after 2 seconds
  setTimeout(() => {
    button.innerHTML = originalContent;
    button.className = originalClass;
  }, 2000);
}

// ============================================================================
// RSU Share Distribution Chart
// ============================================================================

/**
 * Create or update RSU Share Distribution stacked area chart
 */
export function updateRsuShareDistributionChart(
  canvasId: string,
  data: RsuYearlyData[],
  earlyRetirementYear: number
): void {
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded');
    return;
  }

  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) {
    console.error(`Canvas element '${canvasId}' not found`);
    return;
  }

  // Prepare data
  const labels = data.map(d => d.year);
  
  // Track cumulative sold and forfeited
  let cumulativeSold = 0;
  let cumulativeForfeited = 0;
  
  const soldShares: number[] = [];
  const heldShares: number[] = [];
  const unvestedShares: number[] = [];
  const forfeitedShares: number[] = [];

  // Calculate total shares for unvested calculation
  const totalGrantedShares = data.length > 0 ? 
    data[0].sharesHeld + data.reduce((sum, d) => sum + d.sharesVested, 0) : 0;

  let totalVestedSoFar = 0;
  
  data.forEach((yearData, index) => {
    cumulativeSold += yearData.sharesSold;
    cumulativeForfeited += yearData.sharesForfeited;
    totalVestedSoFar += yearData.sharesVested;

    soldShares.push(cumulativeSold);
    heldShares.push(yearData.sharesHeld);
    forfeitedShares.push(cumulativeForfeited);
    
    // Unvested = total granted - vested so far - forfeited
    const unvested = Math.max(0, totalGrantedShares - totalVestedSoFar - cumulativeForfeited);
    unvestedShares.push(yearData.year >= earlyRetirementYear ? 0 : unvested);
  });

  // Destroy existing chart
  destroyRsuChart(canvasId);

  const chart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'נמכרו',
          data: soldShares,
          borderColor: RSU_CHART_COLORS.cumulativeProceeds,
          backgroundColor: RSU_CHART_COLORS.cumulativeProceeds.replace('0.8', '0.6'),
          fill: true,
          tension: 0.4
        },
        {
          label: 'מוחזקות',
          data: heldShares,
          borderColor: RSU_CHART_COLORS.heldValue,
          backgroundColor: RSU_CHART_COLORS.heldValue.replace('0.8', '0.6'),
          fill: true,
          tension: 0.4
        },
        {
          label: 'ממתינות לווסטינג',
          data: unvestedShares,
          borderColor: 'rgba(156, 163, 175, 0.8)',
          backgroundColor: 'rgba(156, 163, 175, 0.4)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'אבדו בפרישה',
          data: forfeitedShares,
          borderColor: RSU_CHART_COLORS.forfeitedValue,
          backgroundColor: RSU_CHART_COLORS.forfeitedValue.replace('0.8', '0.6'),
          fill: true,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'התפלגות מניות RSU',
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        legend: {
          display: true,
          position: 'bottom',
          rtl: true
        },
        tooltip: {
          rtl: true,
          callbacks: {
            label: function(context: any) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${value.toLocaleString()} מניות`;
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'שנה'
          },
          grid: {
            color: RSU_CHART_COLORS.grid
          }
        },
        y: {
          stacked: false,
          title: {
            display: true,
            text: 'מספר מניות'
          },
          ticks: {
            callback: function(value: number) {
              return value.toLocaleString();
            }
          },
          grid: {
            color: RSU_CHART_COLORS.grid
          },
          beginAtZero: true
        }
      }
    }
  });

  rsuChartInstances.set(canvasId, chart);
}

// ============================================================================
// RSU Multi-Level Donut Chart (Nested Pie)
// ============================================================================

/**
 * Colors for the nested donut chart
 */
const NESTED_DONUT_COLORS = {
  // Inner ring - main categories
  vested: 'rgba(34, 197, 94, 0.85)',       // Bright green - vested
  unvested: 'rgba(107, 114, 128, 0.7)',    // Medium gray - unvested
  
  // Outer ring - subcategories (distinctly different from inner ring colors)
  sold: 'rgba(239, 68, 68, 0.85)',         // Red - sold
  section102: 'rgba(59, 130, 246, 0.9)',   // Bright blue - 102 eligible
  nonSection102: 'rgba(249, 115, 22, 0.85)', // Orange - vested but not 102
};


export interface RsuNestedDonutData {
  totalShares: number;
  vestedShares: number;
  unvestedShares: number;
  soldShares: number;
  section102Eligible: number;  // shares that are 102 eligible (vested and past 2 years)
  currentPrice?: number;  // current stock price for calculating gross value
}

/**
 * Create RSU nested donut chart showing share distribution hierarchy
 * Inner ring: Vested vs Unvested (total shares split)
 * Outer ring: Vested splits into (Sold, 102 eligible available, Non-102 available)
 *             Unvested stays as single segment
 */
export function updateRsuNestedDonutChart(
  canvasId: string,
  data: RsuNestedDonutData
): void {
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded');
    return;
  }

  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) {
    console.error(`Canvas element '${canvasId}' not found`);
    return;
  }

  const { totalShares, vestedShares, unvestedShares, soldShares, section102Eligible } = data;
  
  // Calculate available shares (vested but not sold)
  const vestedAvailable = Math.max(0, vestedShares - soldShares);
  
  // Calculate held shares: vested shares not sold PLUS unvested shares (total shares you currently hold)
  const vestedHeld = Math.max(0, vestedShares - soldShares);
  const heldShares = vestedHeld + unvestedShares; // Total held = vested not sold + unvested
  
  // For held shares, determine how many are 102-eligible vs non-102
  // section102Eligible represents available 102-eligible shares from held portion
  const held102Eligible = Math.min(section102Eligible, vestedHeld);
  const heldNon102 = Math.max(0, vestedHeld - held102Eligible);
  
  // Inner ring: Vested vs Unvested
  const innerData = [vestedShares, unvestedShares];
  const innerLabels = ['הבשילו', 'לא הבשילו'];
  const innerColors = [
    NESTED_DONUT_COLORS.vested,
    NESTED_DONUT_COLORS.unvested
  ];
  
  // Middle ring: Sold vs Held (held = vested not sold + unvested)
  const middleData = [soldShares, heldShares];
  const middleLabels = ['נמכרו', 'מוחזקות'];
  const middleColors = [
    NESTED_DONUT_COLORS.sold,
    '#8B6FA8' // Purple for held shares
  ];
  
  // Outer ring: Only expands the vested-held portion into 102-eligible vs non-102
  // The unvested portion of held doesn't have 102 distinction yet
  const outerData = [
    soldShares, // Spacer to align with sold in middle ring
    held102Eligible, // Vested held splits into 102-eligible
    heldNon102, // Vested held splits into non-102
    unvestedShares // Unvested portion of held (no 102 split yet)
  ];
  const outerLabels = ['', 'זכאיות ל-102', 'לא זכאיות ל-102', ''];
  const outerColors = [
    'rgba(0, 0, 0, 0)', // Transparent - sold doesn't expand
    NESTED_DONUT_COLORS.section102, // Blue for 102-eligible
    NESTED_DONUT_COLORS.nonSection102, // Orange for non-102
    'rgba(0, 0, 0, 0)' // Transparent - unvested already shown in inner ring
  ];

  // Destroy existing chart
  destroyRsuChart(canvasId);

  // Register a plugin to draw text in the center of the donut
  const centerTextPlugin = {
    id: 'centerText',
    afterDatasetsDraw(chart: any) {
      const { ctx, chartArea: { left, top, width, height } } = chart;
      ctx.save();
      
      const centerX = left + width / 2;
      const centerY = top + height / 2;
      
      // Draw main text (total shares)
      ctx.font = 'bold 16px Arial';
      ctx.fillStyle = '#1f2937';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${totalShares.toLocaleString()}`, centerX, centerY - 5);
      
      // Draw subtitle
      ctx.font = '10px Arial';
      ctx.fillStyle = '#6b7280';
      ctx.fillText('מניות', centerX, centerY + 10);
      
      ctx.restore();
    }
  };

  const chart = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: [...innerLabels, ...middleLabels, ...outerLabels],
      datasets: [
        // Outer ring (first dataset = outermost)
        {
          data: outerData,
          backgroundColor: outerColors,
          borderWidth: 2,
          borderColor: 'white',
          weight: 1
        },
        // Middle ring
        {
          data: middleData,
          backgroundColor: middleColors,
          borderWidth: 2,
          borderColor: 'white',
          weight: 1.5
        },
        // Inner ring (innermost)
        {
          data: innerData,
          backgroundColor: innerColors,
          borderWidth: 2,
          borderColor: 'white',
          weight: 2
        }
      ]
    },
    plugins: [centerTextPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '30%',
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          rtl: true,
          labels: {
            generateLabels: function(chart: any) {
              // Custom labels showing the breakdown
              const customLabels = [
                { text: `הבשילו (${vestedShares.toLocaleString()})`, fillStyle: NESTED_DONUT_COLORS.vested, hidden: false, index: 0, datasetIndex: 2 },
                { text: `לא הבשילו (${unvestedShares.toLocaleString()})`, fillStyle: NESTED_DONUT_COLORS.unvested, hidden: false, index: 1, datasetIndex: 2 },
                { text: `נמכרו (${soldShares.toLocaleString()})`, fillStyle: NESTED_DONUT_COLORS.sold, hidden: false, index: 0, datasetIndex: 1 },
                { text: `מוחזקות (${heldShares.toLocaleString()})`, fillStyle: '#8B6FA8', hidden: false, index: 1, datasetIndex: 1 },
                { text: `זכאיות ל-102 (${held102Eligible.toLocaleString()})`, fillStyle: NESTED_DONUT_COLORS.section102, hidden: false, index: 1, datasetIndex: 0 },
                { text: `לא זכאיות ל-102 (${heldNon102.toLocaleString()})`, fillStyle: NESTED_DONUT_COLORS.nonSection102, hidden: false, index: 2, datasetIndex: 0 },
              ];
              return customLabels;
            }
          }
        },
        tooltip: {
          rtl: true,
          callbacks: {
            title: function(context: any) {
              if (context.length === 0) return '';
              const ctx = context[0];
              const datasetIndex = ctx.datasetIndex;
              const dataIndex = ctx.dataIndex;
              
              if (datasetIndex === 0) {
                // Outer ring - only 102/non-102 segments show tooltip
                if (dataIndex === 1 || dataIndex === 2) {
                  return 'מוחזקות'; // Held (parent of 102/non-102)
                }
              } else if (datasetIndex === 1) {
                // Middle ring - sold shows vested parent
                if (dataIndex === 0) {
                  return 'הבשילו'; // Sold comes from vested
                }
              }
              return '';
            },
            label: function(context: any) {
              const datasetIndex = context.datasetIndex;
              const dataIndex = context.dataIndex;
              const value = context.parsed;
              
              let label = '';
              let percentage = 0;
              const currentPrice = data.currentPrice || 0;
              const grossValue = value * currentPrice;
              const grossValueStr = currentPrice > 0 ? ` | $${grossValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '';
              
              if (datasetIndex === 0) {
                // Outer ring - only show tooltip for 102/non-102 segments
                if (dataIndex === 1 || dataIndex === 2) {
                  label = outerLabels[dataIndex];
                  percentage = heldShares > 0 ? (value / heldShares) * 100 : 0;
                  return `${label}: ${value.toLocaleString()} מניות (${percentage.toFixed(1)}% מהמוחזקות)${grossValueStr}`;
                }
                return ''; // Transparent spacers (sold, unvested) - no tooltip
              } else if (datasetIndex === 1) {
                // Middle ring - sold and held
                label = middleLabels[dataIndex];
                if (label === '') return ''; // Skip spacer
                
                if (dataIndex === 0) {
                  // Sold - show as % of vested
                  percentage = vestedShares > 0 ? (value / vestedShares) * 100 : 0;
                  return `${label}: ${value.toLocaleString()} מניות (${percentage.toFixed(1)}% מההבשילו)${grossValueStr}`;
                } else {
                  // Held - show as % of total
                  percentage = totalShares > 0 ? (value / totalShares) * 100 : 0;
                  return `${label}: ${value.toLocaleString()} מניות (${percentage.toFixed(1)}%)${grossValueStr}`;
                }
              } else if (datasetIndex === 2) {
                // Inner ring - vested and unvested
                label = innerLabels[dataIndex];
                percentage = totalShares > 0 ? (value / totalShares) * 100 : 0;
                return `${label}: ${value.toLocaleString()} מניות (${percentage.toFixed(1)}%)${grossValueStr}`;
              }
              
              return '';
            }
          }
        }
      }
    }
  });

  rsuChartInstances.set(canvasId, chart);
}

// ============================================================================
// RSU Summary Donut Chart
// ============================================================================

/**
 * Create RSU summary donut chart showing share distribution
 */
export function updateRsuSummaryDonutChart(
  canvasId: string,
  vestedShares: number,
  unvestedShares: number,
  soldShares: number,
  forfeitedShares: number
): void {
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded');
    return;
  }

  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) {
    console.error(`Canvas element '${canvasId}' not found`);
    return;
  }

  // Calculate held = vested - sold
  const heldShares = Math.max(0, vestedShares - soldShares);

  // Destroy existing chart
  destroyRsuChart(canvasId);

  const chart = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['מוחזקות', 'נמכרו', 'ממתינות', 'אבדו'],
      datasets: [{
        data: [heldShares, soldShares, unvestedShares, forfeitedShares],
        backgroundColor: [
          RSU_CHART_COLORS.heldValue,
          RSU_CHART_COLORS.cumulativeProceeds,
          'rgba(156, 163, 175, 0.6)',
          RSU_CHART_COLORS.forfeitedValue
        ],
        borderWidth: 2,
        borderColor: 'white'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          rtl: true
        },
        tooltip: {
          rtl: true,
          callbacks: {
            label: function(context: any) {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
              return `${label}: ${value.toLocaleString()} מניות (${percentage}%)`;
            }
          }
        }
      }
    }
  });

  rsuChartInstances.set(canvasId, chart);
}

// ============================================================================
// Export Helper for Integration
// ============================================================================

/**
 * Update all RSU charts with new data
 */
export function updateAllRsuCharts(
  timeline: RsuYearlyData[],
  currency: Currency,
  usdIlsRate: number,
  earlyRetirementYear: number,
  chartIds: {
    valueChartId?: string;
    distributionChartId?: string;
    summaryDonutId?: string;
  }
): void {
  if (!timeline || timeline.length === 0) {
    return;
  }

  // Update value chart
  if (chartIds.valueChartId) {
    updateRsuValueChart({
      canvasId: chartIds.valueChartId,
      data: timeline,
      currency,
      usdIlsRate,
      earlyRetirementYear
    });
  }

  // Update distribution chart
  if (chartIds.distributionChartId) {
    updateRsuShareDistributionChart(
      chartIds.distributionChartId,
      timeline,
      earlyRetirementYear
    );
  }

  // Update summary donut
  if (chartIds.summaryDonutId) {
    // Calculate totals from timeline
    const lastYear = timeline[timeline.length - 1];
    const totalVested = timeline.reduce((sum, y) => sum + y.sharesVested, 0);
    const totalSold = timeline.reduce((sum, y) => sum + y.sharesSold, 0);
    const totalForfeited = timeline.reduce((sum, y) => sum + y.sharesForfeited, 0);
    const unvested = 0; // At end of timeline, all shares are either vested, sold, or forfeited

    updateRsuSummaryDonutChart(
      chartIds.summaryDonutId,
      totalVested,
      unvested,
      totalSold,
      totalForfeited
    );
  }
}
