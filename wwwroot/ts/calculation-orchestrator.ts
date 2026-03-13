import type { Currency, FireCalculationResult, FirePlanInput } from './types/index.js';
import { Money } from './types/index.js';
import type { RsuConfiguration, RsuGrant } from './types/rsu-types.js';
import { getElement, getInputNumber, getInputValue, setTextContent } from './utils/dom.js';
import { getRsuConfiguration, getRsuGrants, getRsuState } from './services/rsu-state.js';

const CALCULATION_ERROR_PREFIX = 'שגיאה:';
const GENERIC_CALCULATION_ERROR_MESSAGE = 'שגיאה בחישוב התוכנית';

export interface CalculationOrchestratorState {
  displayCurrency: Currency;
  accumulationPortfolio: FirePlanInput['accumulationPortfolio'];
  retirementAllocation: FirePlanInput['retirementAllocation'];
  expenses: FirePlanInput['expenses'];
  useRetirementPortfolio: boolean;
  lastCalculationResult: FireCalculationResult | null;
  lastSuccessfulCalculationInput: FirePlanInput | null;
}

interface CalculationInputDependencies {
  state: CalculationOrchestratorState;
  getEarlyRetirementYear: () => number;
  getTargetMonthlyExpenseCurrency: () => Currency;
  getUsdIlsRate: () => number;
}

interface CalculationOrchestratorDependencies {
  state: CalculationOrchestratorState;
  gatherInputData: () => FirePlanInput;
  cloneFirePlanInput: (input: FirePlanInput) => FirePlanInput;
  calculateFirePlanAPI: (input: FirePlanInput) => Promise<FireCalculationResult>;
  displayResults: (result: FireCalculationResult) => void;
  updateCharts: (result: FireCalculationResult) => void;
  showCalculationError: (message: string) => void;
  isFirePlanApiError: (error: unknown) => boolean;
  getFirePlanApiErrorMessage: (error: unknown) => string;
  getFirePlanApiStatusCode: (error: unknown) => number | undefined;
}

type ApiRsuGrant = Omit<RsuGrant, 'priceAtGrant'> & {
  priceAtGrant: Money;
};

type ApiRsuConfiguration = Omit<RsuConfiguration, 'currentPricePerShare' | 'grants'> & {
  currentPricePerShare: Money;
  grants: ApiRsuGrant[];
};

export function gatherInputData({
  state,
  getEarlyRetirementYear,
  getTargetMonthlyExpenseCurrency,
  getUsdIlsRate
}: CalculationInputDependencies): FirePlanInput {
  const rsuConfig = getRsuConfiguration();
  const rsuGrants = getRsuGrants();
  const rsuState = getRsuState();

  const birthDateInput = getInputValue('birthDate');
  const birthYear = getInputNumber('birthYear', 1990);
  const birthDate = birthDateInput || `${birthYear}-01-01`;

  const monthlyContributionCurrency = (getInputValue('monthlyContributionCurrency') || '$') as '$' | '₪';
  const pensionCurrency = (getInputValue('pensionCurrency') || '$') as '$' | '₪';
  const targetExpenseCurrency = getTargetMonthlyExpenseCurrency();

  let transformedRsuConfig: ApiRsuConfiguration | undefined;
  if (rsuState.includeInCalculations && rsuGrants.length > 0) {
    const validGrants = rsuGrants.filter((grant) => grant.priceAtGrant > 0);
    const hasValidCurrentPrice = rsuConfig.currentPricePerShare > 0;
    const hasValidGrants = validGrants.length > 0;

    if (hasValidCurrentPrice || hasValidGrants) {
      const currentPriceMoney = rsuConfig.currency === '$'
        ? Money.usd(rsuConfig.currentPricePerShare)
        : Money.ils(rsuConfig.currentPricePerShare);

      transformedRsuConfig = {
        ...rsuConfig,
        currentPricePerShare: currentPriceMoney,
        grants: validGrants.map((grant) => {
          const grantPriceMoney = grant.currency === '$'
            ? Money.usd(grant.priceAtGrant)
            : Money.ils(grant.priceAtGrant);

          return {
            ...grant,
            priceAtGrant: grantPriceMoney
          };
        })
      };
    }
  }

  return {
    birthDate,
    birthYear,
    earlyRetirementYear: getEarlyRetirementYear(),
    fullRetirementAge: getInputNumber('fullRetirementAge', 67),
    monthlyContribution: monthlyContributionCurrency === '$'
      ? Money.usd(getInputNumber('monthlyContribution', 0))
      : Money.ils(getInputNumber('monthlyContribution', 0)),
    adjustContributionsForInflation: getElement<HTMLInputElement>('adjustContributionsForInflation')?.checked ?? false,
    withdrawalRate: getInputNumber('withdrawalRate', 4),
    inflationRate: getInputNumber('inflationRate', 2),
    capitalGainsTax: getInputNumber('capitalGainsTax', 25),
    pensionNetMonthly: pensionCurrency === '$'
      ? Money.usd(getInputNumber('pensionNetMonthlyAmount', 0))
      : Money.ils(getInputNumber('pensionNetMonthlyAmount', 0)),
    targetMonthlyExpense: targetExpenseCurrency === '$'
      ? Money.usd(getInputNumber('targetMonthlyExpense', 20000))
      : Money.ils(getInputNumber('targetMonthlyExpense', 20000)),
    usdIlsRate: getUsdIlsRate(),
    accumulationPortfolio: state.accumulationPortfolio,
    retirementAllocation: state.retirementAllocation,
    expenses: state.expenses,
    useRetirementPortfolio: state.useRetirementPortfolio,
    rsuConfiguration: transformedRsuConfig as FirePlanInput['rsuConfiguration'],
    includeRsuInCalculations: rsuState.includeInCalculations,
    currency: state.displayCurrency
  };
}

export function showCalculationError(message: string): void {
  const errorText = `${CALCULATION_ERROR_PREFIX} ${message}`;
  setTextContent('totalContributions', errorText);
  setTextContent('annualWithdrawalNet', '-');
  setTextContent('monthlyExpenseNet', '-');
  setTextContent('startValue', '-');
  setTextContent('endValue', '-');
}

export function createCalculationOrchestrator({
  state,
  gatherInputData,
  cloneFirePlanInput,
  calculateFirePlanAPI,
  displayResults,
  updateCharts,
  showCalculationError,
  isFirePlanApiError,
  getFirePlanApiErrorMessage,
  getFirePlanApiStatusCode
}: CalculationOrchestratorDependencies) {
  let pendingCalculation: Promise<void> | null = null;
  let latestCalculationRequestId = 0;

  return {
    calculateAndUpdate(): void {
      const inputSnapshot = cloneFirePlanInput(gatherInputData());
      const calculationRequestId = ++latestCalculationRequestId;

      const calculationPromise = (async () => {
        try {
          const result = await calculateFirePlanAPI(inputSnapshot);

          if (calculationRequestId !== latestCalculationRequestId) {
            return;
          }

          state.lastCalculationResult = result;
          state.lastSuccessfulCalculationInput = inputSnapshot;
          displayResults(result);
          updateCharts(result);
        } catch (error) {
          if (calculationRequestId !== latestCalculationRequestId) {
            return;
          }

          state.lastCalculationResult = null;
          state.lastSuccessfulCalculationInput = null;
          console.error('Full calculation error:', error);
          if (isFirePlanApiError(error)) {
            console.error('FIRE calculation API error:', getFirePlanApiErrorMessage(error), getFirePlanApiStatusCode(error));
            showCalculationError(getFirePlanApiErrorMessage(error));
          } else {
            console.error('FIRE calculation error:', error);
            showCalculationError(GENERIC_CALCULATION_ERROR_MESSAGE);
          }
        } finally {
          if (calculationRequestId === latestCalculationRequestId) {
            pendingCalculation = null;
          }
        }
      })();

      pendingCalculation = calculationPromise;
    },

    async getExportInputSnapshot(): Promise<FirePlanInput | null> {
      if (pendingCalculation) {
        await pendingCalculation;
      }

      return state.lastSuccessfulCalculationInput
        ? cloneFirePlanInput(state.lastSuccessfulCalculationInput)
        : null;
    }
  };
}
