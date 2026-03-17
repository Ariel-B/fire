/**
 * Fire Plan API Unit Tests
 * Tests FirePlanApiError, calculateFirePlanAPI, and isApiAvailable
 * from wwwroot/ts/api/fire-plan-api.ts
 * Uses global.fetch mocking (Node 18+ native fetch)
 */

import {
  FirePlanApiError,
  calculateFirePlanAPI,
  isApiAvailable
} from '../../../js/api/fire-plan-api.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeFetchOk(payload) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue(payload)
  });
}

function makeFetchFail(statusCode, errorPayload) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: statusCode,
    json: jest.fn().mockResolvedValue(errorPayload)
  });
}

function makeFetchError(message = 'Network error') {
  global.fetch = jest.fn().mockRejectedValue(new Error(message));
}

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

// ── minimal test data ─────────────────────────────────────────────────────────

const MIN_INPUT = {
  birthDate: '1990-01-01',
  birthYear: 1990,
  earlyRetirementYear: 2050,
  fullRetirementAge: 67,
  monthlyContribution: { amount: 1000, currency: 'USD' },
  withdrawalRate: 4,
  inflationRate: 2,
  capitalGainsTax: 25,
  pensionNetMonthly: { amount: 0, currency: 'USD' },
  usdIlsRate: 3.6,
  accumulationPortfolio: [],
  retirementAllocation: [],
  expenses: [],
  useRetirementPortfolio: false
};

const MIN_BACKEND_RESULT = {
  yearlyData: [
    { year: 2051, portfolioValue: 500000, totalContributions: 100000, annualWithdrawal: 20000, phase: 'retirement', flowData: null }
  ],
  endValue: 500000,
  peakValue: 600000,
  grossPeakValue: 620000,
  retirementTaxToPay: 20000,
  totalContributions: 100000,
  totalAccumulationContributions: 80000,
  totalMonthlyContributions: 12345,
  grossAnnualWithdrawal: 24000,
  netAnnualWithdrawal: 18000,
  grossMonthlyExpense: 2000,
  netMonthlyExpense: 1500,
  currentValue: 25000,
  currentCostBasis: 20000,
  formulaMetadata: {
    totalContributions: {
      currentCostBasis: 20000,
      accumulationContributions: 80000,
      computedTotalContributions: 100000,
      usesManualTaxBasis: false,
      manualTaxBasis: null
    },
    annualWithdrawal: {
      peakValueForWithdrawal: 600000,
      withdrawalRate: 4,
      effectiveTaxRate: 25
    },
    peakValue: {
      usesRetirementPortfolio: false,
      displayedValueIsGross: false,
      taxAdjustedPeakValue: 600000,
      retirementTaxToPay: 0
    }
  }
};

// ============================================================================
// FirePlanApiError
// ============================================================================

describe('FirePlanApiError', () => {
  test('name is FirePlanApiError', () => {
    const err = new FirePlanApiError('test error', 400);
    expect(err.name).toBe('FirePlanApiError');
  });

  test('message is set correctly', () => {
    const err = new FirePlanApiError('bad request', 400);
    expect(err.message).toBe('bad request');
  });

  test('statusCode is stored', () => {
    const err = new FirePlanApiError('not found', 404);
    expect(err.statusCode).toBe(404);
  });

  test('statusCode 0 for network errors', () => {
    const err = new FirePlanApiError('network error', 0);
    expect(err.statusCode).toBe(0);
  });

  test('originalError is stored when provided', () => {
    const original = new TypeError('failed to fetch');
    const err = new FirePlanApiError('wrapped', 0, original);
    expect(err.originalError).toBe(original);
  });

  test('is an instance of Error', () => {
    const err = new FirePlanApiError('test', 500);
    expect(err).toBeInstanceOf(Error);
  });
});

// ============================================================================
// calculateFirePlanAPI — success path
// ============================================================================

describe('calculateFirePlanAPI — success', () => {
  test('calls /api/fireplan/calculate with POST', async () => {
    makeFetchOk(MIN_BACKEND_RESULT);
    await calculateFirePlanAPI(MIN_INPUT);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/fireplan/calculate',
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('sends Content-Type application/json', async () => {
    makeFetchOk(MIN_BACKEND_RESULT);
    await calculateFirePlanAPI(MIN_INPUT);
    const headers = global.fetch.mock.calls[0][1].headers;
    expect(headers['Content-Type']).toBe('application/json');
  });

  test('returns result with yearlyData array', async () => {
    makeFetchOk(MIN_BACKEND_RESULT);
    const result = await calculateFirePlanAPI(MIN_INPUT);
    expect(Array.isArray(result.yearlyData)).toBe(true);
  });

  test('maps yearlyData year and age correctly', async () => {
    makeFetchOk(MIN_BACKEND_RESULT);
    const result = await calculateFirePlanAPI(MIN_INPUT);
    const yd = result.yearlyData[0];
    expect(yd.year).toBe(2051);
    expect(yd.age).toBe(2051 - MIN_INPUT.birthYear); // 61
  });

  test('returns endValue from backend result', async () => {
    makeFetchOk(MIN_BACKEND_RESULT);
    const result = await calculateFirePlanAPI(MIN_INPUT);
    expect(result.endValue).toBe(500000);
  });

  test('returns peakValue from backend result', async () => {
    makeFetchOk(MIN_BACKEND_RESULT);
    const result = await calculateFirePlanAPI(MIN_INPUT);
    expect(result.peakValue).toBe(600000);
  });

  test('passes through backend grossMonthlyExpense when provided', async () => {
    makeFetchOk(MIN_BACKEND_RESULT);
    const result = await calculateFirePlanAPI(MIN_INPUT);
    expect(result.grossMonthlyExpense).toBe(2000);
  });

  test('returns netMonthlyExpense from backend result', async () => {
    makeFetchOk(MIN_BACKEND_RESULT);
    const result = await calculateFirePlanAPI(MIN_INPUT);
    expect(result.netMonthlyExpense).toBe(1500);
  });

  test('passes through backend netAnnualWithdrawal and formulaMetadata', async () => {
    makeFetchOk(MIN_BACKEND_RESULT);
    const result = await calculateFirePlanAPI(MIN_INPUT);
    expect(result.netAnnualWithdrawal).toBe(18000);
    expect(result.formulaMetadata).toEqual(MIN_BACKEND_RESULT.formulaMetadata);
  });

  test('prefers backend accumulation contributions fields over local recalculation', async () => {
    makeFetchOk(MIN_BACKEND_RESULT);
    const result = await calculateFirePlanAPI(MIN_INPUT);
    expect(result.totalAccumulationContributions).toBe(80000);
    expect(result.totalMonthlyContributions).toBe(80000);
  });
});

// ============================================================================
// calculateFirePlanAPI — with accumulationPortfolio items
// ============================================================================

describe('calculateFirePlanAPI — with portfolio items', () => {
  const inputWithPortfolio = {
    ...MIN_INPUT,
    accumulationPortfolio: [
      {
        id: 1,
        symbol: 'VTI',
        quantity: 100,
        currentPrice: { amount: 250, currency: 'USD' },
        averageCost: { amount: 200, currency: 'USD' },
        method: 'CAGR',
        value1: 7.0,
        value2: 0
      }
    ]
  };

  test('calculates currentValue from portfolio', async () => {
    makeFetchOk(MIN_BACKEND_RESULT);
    const result = await calculateFirePlanAPI(inputWithPortfolio);
    // 100 shares * $250 = $25,000
    expect(result.currentValue).toBeCloseTo(25000, 0);
  });

  test('calculates currentCostBasis from portfolio', async () => {
    makeFetchOk(MIN_BACKEND_RESULT);
    const result = await calculateFirePlanAPI(inputWithPortfolio);
    // 100 shares * $200 = $20,000
    expect(result.currentCostBasis).toBeCloseTo(20000, 0);
  });

  test('calculates pre-retirement portfolio with CAGR method', async () => {
    makeFetchOk(MIN_BACKEND_RESULT);
    const result = await calculateFirePlanAPI(inputWithPortfolio);
    expect(result.preRetirementPortfolio.length).toBe(1);
    expect(result.preRetirementPortfolio[0].symbol).toBe('VTI');
    expect(result.preRetirementPortfolio[0].percentage).toBeCloseTo(100, 0);
  });

  test('ILS-priced assets are converted via usdIlsRate', async () => {
    const inputIls = {
      ...MIN_INPUT,
      usdIlsRate: 3.6,
      accumulationPortfolio: [
        {
          id: 2,
          symbol: 'TEVA',
          quantity: 100,
          currentPrice: { amount: 360, currency: 'ILS' }, // = $100 USD
          averageCost: { amount: 180, currency: 'ILS' },  // = $50 USD
          method: 'CAGR',
          value1: 5.0,
          value2: 0
        }
      ]
    };
    makeFetchOk({
      ...MIN_BACKEND_RESULT,
      currentValue: undefined,
      currentCostBasis: undefined
    });
    const result = await calculateFirePlanAPI(inputIls);
    expect(result.currentValue).toBeCloseTo(10000, 0); // 100 * (360/3.6)
    expect(result.currentCostBasis).toBeCloseTo(5000, 0); // 100 * (180/3.6)
  });
});

// ============================================================================
// calculateFirePlanAPI — with expenses
// ============================================================================

describe('calculateFirePlanAPI — with expenses', () => {
  const inputWithExpenses = {
    ...MIN_INPUT,
    expenses: [
      {
        id: 1,
        type: 'car',
        netAmount: { amount: 50000, currency: 'USD' },
        year: 2035,
        frequencyYears: 5,
        repetitionCount: 2
      }
    ]
  };

  test('sends expenses in request body', async () => {
    makeFetchOk(MIN_BACKEND_RESULT);
    await calculateFirePlanAPI(inputWithExpenses);
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.expenses).toHaveLength(1);
    expect(body.expenses[0].type).toBe('car');
  });
});

// ============================================================================
// calculateFirePlanAPI — useRetirementPortfolio
// ============================================================================

describe('calculateFirePlanAPI — useRetirementPortfolio', () => {
  const inputWithRetirementPortfolio = {
    ...MIN_INPUT,
    useRetirementPortfolio: true,
    retirementAllocation: [
      { id: 1, assetType: 'Stocks', targetPercentage: 70, expectedAnnualReturn: 7, description: '' },
      { id: 2, assetType: 'Bonds',  targetPercentage: 30, expectedAnnualReturn: 3, description: '' }
    ]
  };

  test('builds retirementPortfolio from allocation', async () => {
    makeFetchOk(MIN_BACKEND_RESULT);
    const result = await calculateFirePlanAPI(inputWithRetirementPortfolio);
    expect(result.retirementPortfolio.length).toBe(2);
    expect(result.retirementPortfolio[0].symbol).toBe('Stocks');
    expect(result.retirementPortfolio[0].percentage).toBe(70);
  });

  test('calculates retirementTaxToPay on gains', async () => {
    makeFetchOk({
      ...MIN_BACKEND_RESULT,
      peakValue: 600000,
      totalContributions: 100000,
      grossPeakValue: undefined,
      retirementTaxToPay: undefined
    });
    const result = await calculateFirePlanAPI(inputWithRetirementPortfolio);
    // gains = 600000 - 100000 = 500000, tax = 500000 * 0.25 = 125000
    expect(result.retirementTaxToPay).toBeCloseTo(125000, 0);
  });
});

describe('calculateFirePlanAPI — inflation-adjusted contributions', () => {
  test('includes adjustContributionsForInflation in request body', async () => {
    makeFetchOk(MIN_BACKEND_RESULT);
    await calculateFirePlanAPI({
      ...MIN_INPUT,
      adjustContributionsForInflation: true
    });

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.adjustContributionsForInflation).toBe(true);
  });
});

// ============================================================================
// calculateFirePlanAPI — with RSU configuration
// ============================================================================

describe('calculateFirePlanAPI — with rsuConfiguration', () => {
  const inputWithRsu = {
    ...MIN_INPUT,
    includeRsuInCalculations: true,
    rsuConfiguration: {
      stockSymbol: 'AAPL',
      currentPricePerShare: 185,
      priceIsFromApi: true,
      currency: '$',
      expectedAnnualReturn: 10,
      returnMethod: 'CAGR',
      defaultVestingPeriodYears: 4,
      liquidationStrategy: 'SellAfter2Years',
      marginalTaxRate: 47,
      subjectTo3PercentSurtax: false,
      grants: [
        {
          id: 1,
          grantDate: '2022-01-01',
          numberOfShares: 100,
          priceAtGrant: 150,
          currency: '$',
          vestingPeriodYears: 4,
          vestingType: 'Standard',
          sharesSold: 0
        }
      ]
    }
  };

  test('includes rsuConfiguration in request body', async () => {
    makeFetchOk(MIN_BACKEND_RESULT);
    await calculateFirePlanAPI(inputWithRsu);
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.rsuConfiguration).toBeDefined();
    expect(body.rsuConfiguration.stockSymbol).toBe('AAPL');
    expect(body.rsuConfiguration.grants).toHaveLength(1);
  });

  test('converts currency symbol to correct format in request', async () => {
    makeFetchOk(MIN_BACKEND_RESULT);
    await calculateFirePlanAPI(inputWithRsu);
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.rsuConfiguration.currentPricePerShare.currency).toBe('USD');
  });

  test('maps RSU result fields from backend response', async () => {
    const rsuResult = { ...MIN_BACKEND_RESULT, totalRsuValueAtRetirement: 50000, totalRsuNetProceeds: 40000, totalRsuTaxesPaid: 10000 };
    makeFetchOk(rsuResult);
    const result = await calculateFirePlanAPI(inputWithRsu);
    expect(result.totalRsuValueAtRetirement).toBe(50000);
    expect(result.totalRsuNetProceeds).toBe(40000);
    expect(result.totalRsuTaxesPaid).toBe(10000);
  });
});

// ============================================================================
// calculateFirePlanAPI — legacy / edge case input formats
// ============================================================================

describe('calculateFirePlanAPI — input format variants', () => {
  test('handles numeric monthlyContribution (legacy format)', async () => {
    makeFetchOk(MIN_BACKEND_RESULT);
    const legacyInput = { ...MIN_INPUT, monthlyContribution: 1000, currency: '$' };
    const result = await calculateFirePlanAPI(legacyInput);
    expect(result).toBeDefined();
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.monthlyContribution.amount).toBe(1000);
    expect(body.monthlyContribution.currency).toBe('USD');
  });

  test('handles ILS currency symbol in monthlyContribution', async () => {
    makeFetchOk(MIN_BACKEND_RESULT);
    const ilsInput = { ...MIN_INPUT, monthlyContribution: 5000, currency: '₪' };
    await calculateFirePlanAPI(ilsInput);
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.monthlyContribution.currency).toBe('ILS');
  });

  test('handles null/missing optional fields gracefully', async () => {
    makeFetchOk(MIN_BACKEND_RESULT);
    const minimalInput = { ...MIN_INPUT, pensionNetMonthly: null };
    await expect(calculateFirePlanAPI(minimalInput)).resolves.toBeDefined();
  });
});

// ============================================================================
// calculateFirePlanAPI — error path
// ============================================================================

describe('calculateFirePlanAPI — error handling', () => {
  test('throws FirePlanApiError on non-ok response', async () => {
    makeFetchFail(400, { error: 'Withdrawal rate must be between 0 and 100' });
    await expect(calculateFirePlanAPI(MIN_INPUT)).rejects.toBeInstanceOf(FirePlanApiError);
  });

  test('FirePlanApiError has correct statusCode from response', async () => {
    makeFetchFail(422, { error: 'Validation failed' });
    try {
      await calculateFirePlanAPI(MIN_INPUT);
    } catch (e) {
      expect(e.statusCode).toBe(422);
      expect(e.message).toBe('Validation failed');
    }
  });

  test('rethrows FirePlanApiError without wrapping', async () => {
    makeFetchFail(500, { error: 'Internal server error' });
    let thrown;
    try {
      await calculateFirePlanAPI(MIN_INPUT);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(FirePlanApiError);
    expect(thrown.statusCode).toBe(500);
  });

  test('wraps network error as FirePlanApiError with statusCode 0', async () => {
    makeFetchError('Failed to fetch');
    try {
      await calculateFirePlanAPI(MIN_INPUT);
    } catch (e) {
      expect(e).toBeInstanceOf(FirePlanApiError);
      expect(e.statusCode).toBe(0);
      expect(e.message).toBe('Failed to fetch');
    }
  });
});

// ============================================================================
// calculateFirePlanAPI — pre-retirement portfolio: target price method
// ============================================================================

describe('calculateFirePlanAPI — Target Price method', () => {
  test('calculates annualReturn from target price', async () => {
    const inputTargetPrice = {
      ...MIN_INPUT,
      earlyRetirementYear: new Date().getFullYear() + 10,
      accumulationPortfolio: [
        {
          id: 1,
          symbol: 'NVDA',
          quantity: 10,
          currentPrice: { amount: 100, currency: 'USD' },
          averageCost: { amount: 80, currency: 'USD' },
          method: 'מחיר יעד', // Target price method (Hebrew)
          value1: 0,
          value2: 200  // target price = $200
        }
      ]
    };
    makeFetchOk(MIN_BACKEND_RESULT);
    const result = await calculateFirePlanAPI(inputTargetPrice);
    expect(result.preRetirementPortfolio.length).toBe(1);
    expect(result.preRetirementPortfolio[0].symbol).toBe('NVDA');
    // Value grows from 10*100=$1000 to 10*200=$2000
    expect(result.preRetirementPortfolio[0].value).toBeGreaterThan(1000);
  });
});

// ============================================================================
// isApiAvailable
// ============================================================================

describe('isApiAvailable', () => {
  test('returns true when API call succeeds', async () => {
    makeFetchOk(MIN_BACKEND_RESULT);
    const result = await isApiAvailable();
    expect(result).toBe(true);
  });

  test('returns false when API call fails', async () => {
    makeFetchFail(503, { error: 'Service unavailable' });
    const result = await isApiAvailable();
    expect(result).toBe(false);
  });

  test('returns false on network error', async () => {
    makeFetchError('Connection refused');
    const result = await isApiAvailable();
    expect(result).toBe(false);
  });
});
