/**
 * Inflation Info Panel
 * Modal component that shows Israel CPI historical bar chart + CAGR stats cards.
 * Opens on clicking #inflationInfoTrigger, lazy-loads data on first open.
 */

import { fetchIsraelInflationHistory, type InflationHistoryResponse } from '../api/inflation-api.js';

// Chart.js is loaded via CDN
declare const Chart: any;

let inflationChart: any = null;
let dataLoaded = false;
let isLoading = false;

/**
 * Determine bar color by severity:
 *  ≤3%  → green
 *  3-5% → amber
 *  >5%  → red
 */
function barColor(rate: number): string {
  if (rate <= 3) return 'rgba(34, 197, 94, 0.75)';   // green-500
  if (rate <= 5) return 'rgba(245, 158, 11, 0.75)';  // amber-500
  return 'rgba(239, 68, 68, 0.75)';                   // red-500
}

/** Map period length → Hebrew label. */
const periodLabels: Record<number, string> = {
  1: 'שנה אחרונה',
  5: '5 שנים',
  10: '10 שנים',
  15: '15 שנים',
  20: '20 שנים',
  30: '30 שנים',
};

function createStatCard(stat: InflationHistoryResponse['stats'][number]): HTMLElement {
  const card = document.createElement('div');
  card.className = 'bg-gray-50 rounded-lg p-3 text-center border border-gray-200';

  const labelEl = document.createElement('div');
  labelEl.className = 'text-xs text-gray-500 mb-1';
  labelEl.textContent = periodLabels[stat.periodYears] ?? `${stat.periodYears} שנים`;

  const pct = (stat.averageInflation * 100).toFixed(2);
  const color =
    stat.averageInflation <= 0.03
      ? 'text-green-600'
      : stat.averageInflation <= 0.05
        ? 'text-amber-600'
        : 'text-red-600';
  const valueEl = document.createElement('div');
  valueEl.className = `text-xl font-bold ${color}`;
  valueEl.textContent = `${pct}%`;

  const rangeEl = document.createElement('div');
  rangeEl.className = 'text-xs text-gray-400';
  rangeEl.textContent = `${stat.startYear}–${stat.endYear}`;

  card.appendChild(labelEl);
  card.appendChild(valueEl);
  card.appendChild(rangeEl);
  return card;
}

function renderStats(stats: InflationHistoryResponse['stats'], container: HTMLElement): void {
  container.replaceChildren(...stats.map(createStatCard));
}

function renderChart(data: InflationHistoryResponse, canvas: HTMLCanvasElement): void {
  if (inflationChart) {
    inflationChart.destroy();
    inflationChart = null;
  }

  const labels = data.dataPoints.map(d => String(d.year));
  const rates = data.dataPoints.map(d => d.inflationRate);
  const colors = rates.map(r => barColor(r));

  inflationChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'אינפלציה שנתית (%)',
          data: rates,
          backgroundColor: colors,
          borderColor: colors.map((c: string) => c.replace('0.75', '1')),
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => ` ${ctx.parsed.y.toFixed(2)}%`,
          },
        },
      },
      scales: {
        x: {
          ticks: { maxRotation: 45, font: { size: 10 } },
          grid: { color: 'rgba(156,163,175,0.2)' },
        },
        y: {
          ticks: {
            callback: (v: number) => `${v}%`,
            font: { size: 11 },
          },
          grid: { color: 'rgba(156,163,175,0.2)' },
        },
      },
    },
  });
}

async function loadAndRender(modal: HTMLElement): Promise<void> {
  if (dataLoaded || isLoading) return;
  isLoading = true;

  const loadingEl = modal.querySelector<HTMLElement>('#inflationLoadingState');
  const errorEl = modal.querySelector<HTMLElement>('#inflationErrorState');
  const contentEl = modal.querySelector<HTMLElement>('#inflationContentState');
  const statsContainer = modal.querySelector<HTMLElement>('#inflationStatsGrid');
  const canvas = modal.querySelector<HTMLCanvasElement>('#inflationHistoryChart');

  if (loadingEl) loadingEl.classList.remove('hidden');
  if (errorEl) errorEl.classList.add('hidden');
  if (contentEl) contentEl.classList.add('hidden');

  try {
    const data = await fetchIsraelInflationHistory();

    if (loadingEl) loadingEl.classList.add('hidden');

    if (!data || !data.dataPoints.length) {
      if (errorEl) errorEl.classList.remove('hidden');
      return;
    }

    if (statsContainer) renderStats(data.stats, statsContainer);
    if (canvas) renderChart(data, canvas);
    if (contentEl) contentEl.classList.remove('hidden');

    dataLoaded = true;
  } catch {
    if (loadingEl) loadingEl.classList.add('hidden');
    if (errorEl) errorEl.classList.remove('hidden');
  } finally {
    isLoading = false;
  }
}

export function initializeInflationInfoPanel(): void {
  const trigger = document.getElementById('inflationInfoTrigger');
  const modal = document.getElementById('inflationInfoModal');
  const closeBtn = modal?.querySelector<HTMLElement>('#inflationInfoModalClose');
  const overlay = modal?.querySelector<HTMLElement>('#inflationInfoModalOverlay');

  if (!trigger || !modal) return;

  function openModal(): void {
    modal!.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    loadAndRender(modal!);
  }

  function closeModal(): void {
    modal!.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }

  trigger.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', closeModal);

  // Global listener is acceptable for this one-time init pattern since the
  // modal lives for the entire page lifetime and the guard check is cheap.
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !modal!.classList.contains('hidden')) closeModal();
  });
}
