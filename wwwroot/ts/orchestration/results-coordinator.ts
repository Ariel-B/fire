import type {
  FireCalculationResult,
  Currency,
  PlannedExpense,
  PortfolioAsset,
  PortfolioChartData,
  MainChartOptions
} from '../types/index.js';
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
  escapeHtml?: (value: string | number | null | undefined) => string;
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
const FORMULA_CLOSE_DELAY_MS = 100;

type ResultsFormulaVariable = {
  label: string;
  value: string;
};

type ResultsFormulaExplanation = {
  formula: string;
  variables: ResultsFormulaVariable[];
  notes: string[];
};

type ResultsFormulaPanelKey =
  | 'totalContributions'
  | 'annualWithdrawalNet'
  | 'monthlyExpenseNet'
  | 'startValue'
  | 'peakValue'
  | 'endValue';

type BuildResultsFormulaExplanationsOptions = {
  result: FireCalculationResult;
  displayCurrency: Currency;
  usdIlsRate: number;
  useRetirementPortfolio: boolean;
  convertFromUSD: (valueInUSD: number, displayCurrency: Currency, usdIlsRate: number) => number;
  formatCurrency: (amount: number, currency: Currency) => string;
};

const RESULTS_FORMULA_PANEL_CONFIG: ReadonlyArray<{
  key: ResultsFormulaPanelKey;
  triggerId: string;
  panelId: string;
  contentId: string;
}> = [
  {
    key: 'totalContributions',
    triggerId: 'resultsFormulaTriggerTotalContributions',
    panelId: 'resultsFormulaPanelTotalContributions',
    contentId: 'resultsFormulaContentTotalContributions'
  },
  {
    key: 'annualWithdrawalNet',
    triggerId: 'resultsFormulaTriggerAnnualWithdrawal',
    panelId: 'resultsFormulaPanelAnnualWithdrawal',
    contentId: 'resultsFormulaContentAnnualWithdrawal'
  },
  {
    key: 'monthlyExpenseNet',
    triggerId: 'resultsFormulaTriggerMonthlyExpense',
    panelId: 'resultsFormulaPanelMonthlyExpense',
    contentId: 'resultsFormulaContentMonthlyExpense'
  },
  {
    key: 'startValue',
    triggerId: 'resultsFormulaTriggerStartValue',
    panelId: 'resultsFormulaPanelStartValue',
    contentId: 'resultsFormulaContentStartValue'
  },
  {
    key: 'peakValue',
    triggerId: 'resultsFormulaTriggerPeakValue',
    panelId: 'resultsFormulaPanelPeakValue',
    contentId: 'resultsFormulaContentPeakValue'
  },
  {
    key: 'endValue',
    triggerId: 'resultsFormulaTriggerEndValue',
    panelId: 'resultsFormulaPanelEndValue',
    contentId: 'resultsFormulaContentEndValue'
  }
];

function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function buildResultsFormulaExplanations({
  result,
  displayCurrency,
  usdIlsRate,
  useRetirementPortfolio,
  convertFromUSD,
  formatCurrency
}: BuildResultsFormulaExplanationsOptions): Record<ResultsFormulaPanelKey, ResultsFormulaExplanation> {
  const convertValue = (valueInUSD: number): string =>
    formatCurrency(convertFromUSD(valueInUSD, displayCurrency, usdIlsRate), displayCurrency);

  const contributionsMetadata = result.formulaMetadata?.totalContributions;
  const annualMetadata = result.formulaMetadata?.annualWithdrawal;
  const peakMetadata = result.formulaMetadata?.peakValue;

  const currentCostBasis = contributionsMetadata?.currentCostBasis ?? result.currentCostBasis ?? 0;
  const accumulationContributions = contributionsMetadata?.accumulationContributions ?? result.totalMonthlyContributions ?? 0;
  const computedTotalContributions =
    contributionsMetadata?.computedTotalContributions ?? (currentCostBasis + accumulationContributions);
  const usesManualTaxBasis = contributionsMetadata?.usesManualTaxBasis ?? false;
  const manualTaxBasis = contributionsMetadata?.manualTaxBasis ?? null;

  const peakValueForWithdrawal = annualMetadata?.peakValueForWithdrawal ?? result.peakValue ?? 0;
  const withdrawalRate = annualMetadata?.withdrawalRate ?? 0;
  const effectiveTaxRate = annualMetadata?.effectiveTaxRate
    ?? (result.grossAnnualWithdrawal > 0
      ? (1 - ((result.netAnnualWithdrawal ?? result.netMonthlyExpense * 12) / result.grossAnnualWithdrawal)) * 100
      : 0);
  const netAnnualWithdrawal = result.netAnnualWithdrawal ?? result.netMonthlyExpense * 12;
  const grossMonthlyExpense = result.grossMonthlyExpense ?? result.grossAnnualWithdrawal / 12;
  const endYearData = result.yearlyData.length > 0 ? result.yearlyData[result.yearlyData.length - 1] : null;
  const endValue = endYearData?.portfolioValue ?? result.endValue ?? 0;
  const displayedPeakValueIsGross = peakMetadata?.displayedValueIsGross ?? useRetirementPortfolio;
  const retirementTaxToPay = peakMetadata?.retirementTaxToPay ?? result.retirementTaxToPay ?? 0;
  const taxAdjustedPeakValue = peakMetadata?.taxAdjustedPeakValue ?? result.peakValue ?? 0;

  return {
    totalContributions: {
      formula: usesManualTaxBasis
        ? 'סה"כ הפקדות מוצג = בסיס המס הידני שנבחר'
        : 'סה"כ הפקדות = בסיס עלות נוכחי + הפקדות בתקופת הצבירה',
      variables: [
        { label: 'בסיס עלות נוכחי', value: convertValue(currentCostBasis) },
        { label: 'הפקדות בתקופת הצבירה', value: convertValue(accumulationContributions) },
        { label: 'סה"כ הפקדות מחושב', value: convertValue(computedTotalContributions) },
        ...(usesManualTaxBasis && manualTaxBasis != null
          ? [{ label: 'בסיס מס ידני בשימוש', value: convertValue(manualTaxBasis) }]
          : [])
      ],
      notes: usesManualTaxBasis && manualTaxBasis != null
        ? ['הערה: הוזן בסיס מס ידני ולכן הערך המוצג מבוסס עליו במקום הסכום המחושב.']
        : []
    },
    annualWithdrawalNet: {
      formula: 'משיכה שנתית נטו = (שווי בסיס למשיכה × שיעור משיכה) × (1 - שיעור מס אפקטיבי)',
      variables: [
        { label: 'שווי בסיס למשיכה', value: convertValue(peakValueForWithdrawal) },
        { label: 'שיעור משיכה', value: formatPercentage(withdrawalRate) },
        { label: 'משיכה שנתית ברוטו', value: convertValue(result.grossAnnualWithdrawal) },
        { label: 'שיעור מס אפקטיבי', value: formatPercentage(effectiveTaxRate) },
        { label: 'משיכה שנתית נטו', value: convertValue(netAnnualWithdrawal) }
      ],
      notes: displayedPeakValueIsGross && retirementTaxToPay > 0
        ? ['הערה: המשיכה מחושבת לפי שווי התיק לאחר מס איזון בפרישה, גם אם כרטיס השיא מציג ערך ברוטו.']
        : []
    },
    monthlyExpenseNet: {
      formula: 'הוצאה חודשית נטו = משיכה שנתית נטו ÷ 12',
      variables: [
        { label: 'משיכה שנתית ברוטו', value: convertValue(result.grossAnnualWithdrawal) },
        { label: 'הוצאה חודשית ברוטו', value: convertValue(grossMonthlyExpense) },
        { label: 'משיכה שנתית נטו', value: convertValue(netAnnualWithdrawal) },
        { label: 'הוצאה חודשית נטו', value: convertValue(result.netMonthlyExpense) }
      ],
      notes: displayedPeakValueIsGross && retirementTaxToPay > 0
        ? ['הערה: ההוצאה החודשית נגזרת ממשיכה שנתית המבוססת על שווי התיק לאחר מס איזון בפרישה.']
        : []
    },
    startValue: {
      formula: 'שווי תחילת צבירה = שווי השוק הנוכחי של התיק',
      variables: [
        { label: 'שווי שוק נוכחי', value: convertValue(result.currentValue ?? 0) },
        { label: 'בסיס עלות נוכחי', value: convertValue(currentCostBasis) }
      ],
      notes: []
    },
    peakValue: {
      formula: displayedPeakValueIsGross
        ? 'שווי שיא מוצג = שווי התיק לפני מס איזון בפרישה'
        : 'שווי שיא מוצג = שווי התיק הזמין בתחילת הפרישה',
      variables: [
        { label: 'שווי שיא ברוטו', value: convertValue(result.grossPeakValue ?? result.peakValue ?? 0) },
        { label: 'מס איזון בפרישה', value: convertValue(retirementTaxToPay) },
        { label: 'שווי שיא לאחר מס', value: convertValue(taxAdjustedPeakValue) }
      ],
      notes: displayedPeakValueIsGross && retirementTaxToPay > 0
        ? ['הערה: בעת המעבר לתיק פרישה מחושב גם מס איזון חד-פעמי, ולכן מוצגים גם הערך ברוטו וגם הערך לאחר מס.']
        : []
    },
    endValue: {
      formula: 'שווי סוף פרישה = נקודת הנתונים האחרונה בגרף השנתי',
      variables: [
        { label: 'שנת סיום', value: endYearData ? String(endYearData.year) : '—' },
        { label: 'שווי סופי', value: convertValue(endValue) }
      ],
      notes: []
    }
  };
}

export function createResultsCoordinator(dependencies: ResultsCoordinatorDependencies) {
  const escape = dependencies.escapeHtml ?? ((value: string | number | null | undefined) => String(value ?? ''));
  let formulaPanelsInitialized = false;
  let activeFormulaPanelKey: ResultsFormulaPanelKey | null = null;
  let pinnedFormulaPanelKey: ResultsFormulaPanelKey | null = null;
  let formulaCloseTimeout: ReturnType<typeof setTimeout> | null = null;

  function getGainColorClass(gain: number, centerClass: boolean = false): string {
    const baseClass = centerClass ? 'text-xs text-center' : 'text-xs';
    return gain >= 0 ? `${baseClass} text-green-600` : `${baseClass} text-red-600`;
  }

  function clearFormulaCloseTimeout(): void {
    if (formulaCloseTimeout != null) {
      clearTimeout(formulaCloseTimeout);
      formulaCloseTimeout = null;
    }
  }

  function getFormulaPanelConfig(key: ResultsFormulaPanelKey) {
    return RESULTS_FORMULA_PANEL_CONFIG.find((config) => config.key === key) ?? null;
  }

  function setFormulaPanelOpen(key: ResultsFormulaPanelKey, isOpen: boolean): void {
    const config = getFormulaPanelConfig(key);
    if (!config) {
      return;
    }

    const trigger = dependencies.getElement<HTMLButtonElement>(config.triggerId);
    const panel = dependencies.getElement<HTMLDivElement>(config.panelId);
    if (!trigger || !panel) {
      return;
    }

    if (isOpen) {
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }

    if (typeof trigger.setAttribute === 'function') {
      trigger.setAttribute('aria-expanded', String(isOpen));
    }
  }

  function closeAllFormulaPanels(): void {
    clearFormulaCloseTimeout();
    RESULTS_FORMULA_PANEL_CONFIG.forEach((config) => setFormulaPanelOpen(config.key, false));
    activeFormulaPanelKey = null;
    pinnedFormulaPanelKey = null;
  }

  function openFormulaPanel(key: ResultsFormulaPanelKey, pinned: boolean = false): void {
    clearFormulaCloseTimeout();
    RESULTS_FORMULA_PANEL_CONFIG
      .filter((config) => config.key !== key)
      .forEach((config) => setFormulaPanelOpen(config.key, false));
    setFormulaPanelOpen(key, true);
    activeFormulaPanelKey = key;
    pinnedFormulaPanelKey = pinned ? key : null;
  }

  function scheduleFormulaPanelClose(key: ResultsFormulaPanelKey): void {
    clearFormulaCloseTimeout();
    if (pinnedFormulaPanelKey === key) {
      return;
    }

    formulaCloseTimeout = setTimeout(() => {
      if (activeFormulaPanelKey === key && pinnedFormulaPanelKey !== key) {
        setFormulaPanelOpen(key, false);
        activeFormulaPanelKey = null;
      }
      formulaCloseTimeout = null;
    }, FORMULA_CLOSE_DELAY_MS);
  }

  function renderFormulaExplanationMarkup(explanation: ResultsFormulaExplanation): string {
    const variablesMarkup = explanation.variables
      .map(({ label, value }) => (
        `<div class="flex items-start justify-between gap-3 rounded-md bg-gray-50 px-2 py-1">
          <span class="text-gray-600">${escape(label)}</span>
          <span class="font-medium text-gray-900 text-left" dir="ltr">${escape(value)}</span>
        </div>`
      ))
      .join('');

    const notesMarkup = explanation.notes.length > 0
      ? `<div class="mt-2 space-y-1">${explanation.notes
        .map((note) => `<p class="text-[11px] leading-4 text-amber-700">${escape(note)}</p>`)
        .join('')}</div>`
      : '';

    return `
      <div class="space-y-2 text-xs text-right">
        <p class="font-semibold text-gray-800">נוסחה: ${escape(explanation.formula)}</p>
        <div class="space-y-1">${variablesMarkup}</div>
        ${notesMarkup}
      </div>
    `;
  }

  function renderFormulaPanels(result: FireCalculationResult): void {
    const explanations = buildResultsFormulaExplanations({
      result,
      displayCurrency: dependencies.state.displayCurrency,
      usdIlsRate: dependencies.getUsdIlsRate(),
      useRetirementPortfolio: dependencies.state.useRetirementPortfolio,
      convertFromUSD: dependencies.convertFromUSD,
      formatCurrency: dependencies.formatCurrency
    });

    RESULTS_FORMULA_PANEL_CONFIG.forEach((config) => {
      const contentElement = dependencies.getElement<HTMLDivElement>(config.contentId);
      if (contentElement) {
        contentElement.innerHTML = renderFormulaExplanationMarkup(explanations[config.key]);
      }
    });
  }

  function initializeFormulaPanels(): void {
    if (formulaPanelsInitialized) {
      return;
    }

    formulaPanelsInitialized = true;

    RESULTS_FORMULA_PANEL_CONFIG.forEach((config) => {
      const trigger = dependencies.getElement<HTMLButtonElement>(config.triggerId);
      const panel = dependencies.getElement<HTMLDivElement>(config.panelId);

      if (!trigger || !panel) {
        return;
      }

      trigger.addEventListener('mouseenter', () => openFormulaPanel(config.key));
      trigger.addEventListener('mouseleave', () => scheduleFormulaPanelClose(config.key));
      trigger.addEventListener('focus', () => openFormulaPanel(config.key));
      trigger.addEventListener('blur', () => scheduleFormulaPanelClose(config.key));
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (pinnedFormulaPanelKey === config.key) {
          closeAllFormulaPanels();
          return;
        }

        openFormulaPanel(config.key, true);
      });

      panel.addEventListener('mouseenter', () => clearFormulaCloseTimeout());
      panel.addEventListener('mouseleave', () => scheduleFormulaPanelClose(config.key));
      panel.addEventListener('click', (event) => event.stopPropagation());
    });

    if (typeof document !== 'undefined') {
      document.addEventListener('click', (event) => {
        const target = event.target as Node | null;
        const clickInsideFormulaPanel = RESULTS_FORMULA_PANEL_CONFIG.some((config) => {
          const trigger = dependencies.getElement<HTMLButtonElement>(config.triggerId);
          const panel = dependencies.getElement<HTMLDivElement>(config.panelId);
          return Boolean(
            target
            && ((trigger && trigger.contains(target)) || (panel && panel.contains(target)))
          );
        });

        if (!clickInsideFormulaPanel) {
          closeAllFormulaPanels();
        }
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          closeAllFormulaPanels();
        }
      });
    }
  }

  function displayResults(result: FireCalculationResult): void {
    initializeFormulaPanels();
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
    renderFormulaPanels(result);
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
