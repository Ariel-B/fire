/* eslint-env jest */

const { createDeferred, createCalculationResult } = require('../../helpers/app-test-harness.js');

function loadModule() {
  return require('../../../js/calculation-orchestrator.js');
}

function getContributionAmountForRequest(requestIndex) {
  return 1000 + (requestIndex * 1500);
}

describe('calculation orchestrator', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  function createDependencies() {
    const gatheredInputs = [];
    const state = {
      displayCurrency: '$',
      lastCalculationResult: null,
      lastSuccessfulCalculationInput: null
    };

    return {
      state,
      gatherInputData: jest.fn(() => {
        const input = {
          birthDate: '1990-01-01',
          earlyRetirementYear: 2045,
          fullRetirementAge: 67,
          monthlyContribution: { amount: getContributionAmountForRequest(gatheredInputs.length), currency: 'USD' },
          pensionNetMonthly: { amount: 1500, currency: 'USD' },
          targetMonthlyExpense: { amount: 9000, currency: 'USD' },
          usdIlsRate: 4.1,
          accumulationPortfolio: [],
          retirementAllocation: [],
          expenses: [],
          useRetirementPortfolio: false,
          includeRsuInCalculations: false,
          currency: '$'
        };
        gatheredInputs.push(input);
        return input;
      }),
      cloneFirePlanInput: jest.fn((input) => JSON.parse(JSON.stringify(input))),
      calculateFirePlanAPI: jest.fn(),
      displayResults: jest.fn(),
      updateCharts: jest.fn(),
      showCalculationError: jest.fn(),
      isFirePlanApiError: jest.fn((error) => error?.name === 'FirePlanApiError'),
      getFirePlanApiErrorMessage: jest.fn((error) => error.message),
      getFirePlanApiStatusCode: jest.fn((error) => error.statusCode)
    };
  }

  test('loads the dedicated orchestration module', () => {
    expect(loadModule).not.toThrow();
  });

  test('keeps only the newest completed request and ignores stale completions', async () => {
    const { createCalculationOrchestrator } = loadModule();
    const firstResponse = createDeferred();
    const secondResponse = createDeferred();
    const dependencies = createDependencies();

    dependencies.calculateFirePlanAPI
      .mockReturnValueOnce(firstResponse.promise)
      .mockReturnValueOnce(secondResponse.promise);

    const orchestrator = createCalculationOrchestrator(dependencies);

    orchestrator.calculateAndUpdate();
    orchestrator.calculateAndUpdate();

    secondResponse.resolve(createCalculationResult({ totalContributions: 250000 }));
    await Promise.resolve();
    await Promise.resolve();

    firstResponse.resolve(createCalculationResult({ totalContributions: 100000 }));
    await Promise.resolve();
    await Promise.resolve();

    const exportSnapshot = await orchestrator.getExportInputSnapshot();

    expect(dependencies.calculateFirePlanAPI).toHaveBeenCalledTimes(2);
    expect(dependencies.displayResults).toHaveBeenCalledTimes(1);
    expect(dependencies.updateCharts).toHaveBeenCalledTimes(1);
    expect(dependencies.displayResults).toHaveBeenCalledWith(
      expect.objectContaining({ totalContributions: 250000 })
    );
    expect(dependencies.showCalculationError).not.toHaveBeenCalled();
    expect(dependencies.state.lastCalculationResult).toMatchObject({ totalContributions: 250000 });
    expect(dependencies.state.lastSuccessfulCalculationInput.monthlyContribution.amount).toBe(2500);
    expect(exportSnapshot.monthlyContribution.amount).toBe(2500);
    expect(exportSnapshot).not.toBe(dependencies.state.lastSuccessfulCalculationInput);
  });

  test('clears stale snapshots only when the latest request fails and export waits for that failure', async () => {
    const { createCalculationOrchestrator } = loadModule();
    const latestResponse = createDeferred();
    const dependencies = createDependencies();
    const apiError = Object.assign(new Error('מספר שנים לא תקין'), {
      name: 'FirePlanApiError',
      statusCode: 400
    });

    dependencies.state.lastCalculationResult = createCalculationResult({ totalContributions: 1 });
    dependencies.state.lastSuccessfulCalculationInput = {
      previous: true
    };
    dependencies.calculateFirePlanAPI.mockReturnValue(latestResponse.promise);

    const orchestrator = createCalculationOrchestrator(dependencies);

    orchestrator.calculateAndUpdate();
    const exportSnapshotPromise = orchestrator.getExportInputSnapshot();

    latestResponse.reject(apiError);
    await expect(exportSnapshotPromise).resolves.toBeNull();

    expect(dependencies.state.lastCalculationResult).toBeNull();
    expect(dependencies.state.lastSuccessfulCalculationInput).toBeNull();
    expect(dependencies.displayResults).not.toHaveBeenCalled();
    expect(dependencies.updateCharts).not.toHaveBeenCalled();
    expect(dependencies.showCalculationError).toHaveBeenCalledWith('מספר שנים לא תקין');
  });
});
