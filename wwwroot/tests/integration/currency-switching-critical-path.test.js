/* eslint-env jest */

import {
  createAppTestHarness,
  createCalculationResult,
  flushPromises,
  loadAppModule
} from '../helpers/app-test-harness.js';

describe('Currency switching critical path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initializeApp applies the default currency, refreshes the exchange rate, and triggers a recalculation', async () => {
    const harness = createAppTestHarness();
    const { appModule, mocks } = loadAppModule(harness, {
      assetsApi: {
        fetchUsdIlsRate: jest.fn(async () => 4.18)
      },
      firePlanApi: {
        calculateFirePlanAPI: jest.fn(async () => createCalculationResult({
          totalContributions: 111000,
          netAnnualWithdrawal: 36000,
          netMonthlyExpense: 3000
        }))
      }
    });

    await appModule.initializeApp();
    await flushPromises(3);

    expect(harness.getElement('currencyILS').classList.contains('active')).toBe(true);
    expect(harness.getElement('currencyUSD').classList.contains('active')).toBe(false);
    expect(harness.getElement('usdIlsRate').value).toBe('4.18');
    expect(mocks.portfolioTable.renderPortfolioTable).toHaveBeenCalled();
    expect(mocks.expenseTable.renderExpenseTable).toHaveBeenCalled();
    expect(mocks.firePlanApi.calculateFirePlanAPI).toHaveBeenCalled();
    expect(harness.getElement('totalContributions').textContent).toContain('₪');
  });

  test('clicking the USD button fully refreshes display currency side effects', async () => {
    const harness = createAppTestHarness();
    const { appModule, mocks } = loadAppModule(harness, {
      firePlanApi: {
        calculateFirePlanAPI: jest.fn(async () => createCalculationResult({
          totalContributions: 200000,
          netAnnualWithdrawal: 48000,
          netMonthlyExpense: 4000
        }))
      }
    });
    const fireApp = appModule.default || appModule;

    await appModule.initializeApp();
    await flushPromises(3);

    harness.click('currencyUSD');
    await flushPromises(3);

    expect(fireApp.getState().displayCurrency).toBe('$');
    expect(harness.getElement('currencyUSD').classList.contains('active')).toBe(true);
    expect(harness.getElement('currencyILS').classList.contains('active')).toBe(false);
    expect(mocks.portfolioTable.renderPortfolioTable).toHaveBeenCalled();
    expect(mocks.expenseTable.renderExpenseTable).toHaveBeenCalled();
    expect(mocks.firePlanApi.calculateFirePlanAPI.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(harness.getElement('displayCurrencyMenu').classList.contains('hidden')).toBe(true);
  });

  test('failed exchange-rate refresh preserves the current rate and avoids a recalculation', async () => {
    const harness = createAppTestHarness();
    const originalRate = harness.getElement('usdIlsRate').value;
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { appModule, mocks } = loadAppModule(harness, {
      assetsApi: {
        fetchUsdIlsRate: jest.fn(async () => {
          throw new Error('network down');
        })
      }
    });

    await appModule.fetchAndUpdateExchangeRate();
    await flushPromises(2);

    expect(harness.getElement('usdIlsRate').value).toBe(originalRate);
    expect(mocks.firePlanApi.calculateFirePlanAPI).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch exchange rate from API:', expect.any(Error));

    consoleErrorSpy.mockRestore();
  });
});
