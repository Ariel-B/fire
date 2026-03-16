/* eslint-env jest */

import {
  createAppTestHarness,
  flushPromises,
  loadAppModule
} from '../helpers/app-test-harness.js';

describe('File I/O critical path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('savePlan writes back to the existing native file handle without reopening the picker', async () => {
    const harness = createAppTestHarness();
    const write = jest.fn();
    const close = jest.fn();
    const currentFileHandle = {
      name: 'existing-fire-plan.json',
      createWritable: jest.fn(async () => ({ write, close }))
    };
    harness.getElement('monthlyContribution').value = '4321';
    harness.getElement('targetMonthlyExpense').value = '9876';
    global.window.showSaveFilePicker = jest.fn();

    const { appModule, mocks } = loadAppModule(harness);
    const fireApp = appModule.default || appModule;
    fireApp.getState().currentFileHandle = currentFileHandle;
    fireApp.getState().currentFileName = currentFileHandle.name;

    await appModule.savePlan();

    expect(global.window.showSaveFilePicker).not.toHaveBeenCalled();
    expect(currentFileHandle.createWritable).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledTimes(1);
    expect(mocks.passwordDialog.promptPassword).toHaveBeenCalledWith('encrypt');
    expect(mocks.planCrypto.encryptPlan).toHaveBeenCalledTimes(1);
    const savedEnvelope = JSON.parse(write.mock.calls[0][0]);
    const savedPlan = JSON.parse(savedEnvelope.data);
    expect(savedEnvelope.encrypted).toBe(true);
    expect(savedPlan.monthlyContribution).toEqual({ amount: 4321, currency: 'USD' });
    expect(savedPlan.targetMonthlyExpense).toEqual({ amount: 9876, currency: 'USD' });
    expect(savedPlan.displayCurrency).toBe('₪');
    expect(savedPlan.version).toBe('2.0');
    expect(close).toHaveBeenCalledTimes(1);
  });

  test('savePlanAs uses the native picker once and remembers the returned handle for future saves', async () => {
    const harness = createAppTestHarness();
    const write = jest.fn();
    const close = jest.fn();
    const pickedHandle = {
      name: 'chosen-plan.json',
      createWritable: jest.fn(async () => ({ write, close }))
    };
    global.window.showSaveFilePicker = jest.fn(async () => pickedHandle);

    const { appModule, mocks } = loadAppModule(harness);
    const fireApp = appModule.default || appModule;

    await appModule.savePlanAs();

    expect(global.window.showSaveFilePicker).toHaveBeenCalledTimes(1);
    expect(global.window.showSaveFilePicker).toHaveBeenCalledWith(expect.objectContaining({
      suggestedName: expect.stringMatching(/\.enc\.json$/i)
    }));
    expect(mocks.passwordDialog.promptPassword).toHaveBeenCalledWith('encrypt');
    expect(mocks.planCrypto.encryptPlan).toHaveBeenCalledTimes(1);
    expect(pickedHandle.createWritable).toHaveBeenCalledTimes(1);
    expect(fireApp.getState().currentFileHandle).toBe(pickedHandle);
    expect(fireApp.getState().currentFileName).toBe('chosen-plan.json');
    expect(write).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  test('savePlanAs falls back to blob download when the File System Access API is unavailable', async () => {
    const harness = createAppTestHarness();
    delete global.window.showSaveFilePicker;

    const { appModule, mocks } = loadAppModule(harness);

    await appModule.savePlanAs();

    expect(mocks.passwordDialog.promptPassword).toHaveBeenCalledWith('encrypt');
    expect(mocks.planCrypto.encryptPlan).toHaveBeenCalledTimes(1);
    expect(global.Blob).toHaveBeenCalledTimes(1);
    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    const anchor = global.document.createElement.mock.results.find((result) => result.value.tagName === 'A');
    expect(anchor).toBeDefined();
    expect(anchor.value.click).toHaveBeenCalledTimes(1);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  test('loadPlan restores the active tab after native file-handle load and refreshes currency from the API', async () => {
    const harness = createAppTestHarness();
    const loadedFile = {
      name: 'loaded-plan.json',
      text: async () => JSON.stringify({
        birthDate: '1985-02-03',
        birthYear: 1985,
        earlyRetirementYear: 2040,
        fullRetirementAge: 67,
        monthlyContribution: { amount: 8000, currency: 'USD' },
        pensionNetMonthly: { amount: 1200, currency: 'USD' },
        targetMonthlyExpense: { amount: 9000, currency: 'ILS' },
        displayCurrency: '$',
        accumulationPortfolio: [],
        expenses: []
      })
    };
    const fileHandle = {
      name: loadedFile.name,
      getFile: jest.fn(async () => loadedFile)
    };
    global.window.showSaveFilePicker = jest.fn();
    global.window.showOpenFilePicker = jest.fn(async () => [fileHandle]);

    const { appModule, mocks } = loadAppModule(harness, {
      assetsApi: {
        fetchUsdIlsRate: jest.fn(async () => 4.23)
      }
    });
    const fireApp = appModule.default || appModule;

    await appModule.initializeApp();
    harness.click('tab-results');
    await appModule.loadPlan();
    await flushPromises(3);

    expect(global.window.showOpenFilePicker).toHaveBeenCalledTimes(1);
    expect(fireApp.getState().currentFileHandle).toBe(fileHandle);
    expect(fireApp.getState().currentFileName).toBe('loaded-plan.json');
    expect(harness.getElement('usdIlsRate').value).toBe('4.23');
    expect(harness.getElement('tab-results').classList.contains('active')).toBe(true);
    expect(harness.getElement('content-results').classList.contains('hidden')).toBe(false);
    expect(mocks.portfolioTable.fetchPricesForPortfolio).toHaveBeenCalledTimes(1);
    expect(mocks.portfolioTable.fetchCAGRsForPortfolio).toHaveBeenCalledTimes(1);
    expect(mocks.portfolioTable.fetchMarketCapsForPortfolio).toHaveBeenCalledTimes(1);
  });

  test('loadPlan falls back to a temporary input element after native picker failure and clears the saved handle', async () => {
    const harness = createAppTestHarness();
    const loadedFile = {
      name: 'fallback-plan.json',
      text: async () => JSON.stringify({
        birthYear: 1992,
        earlyRetirementYear: 2047,
        fullRetirementAge: 67,
        monthlyContribution: { amount: 6100, currency: 'USD' },
        expenses: []
      })
    };

    global.window.showSaveFilePicker = jest.fn();
    global.window.showOpenFilePicker = jest.fn(async () => {
      throw new Error('picker dismissed');
    });

    const { appModule } = loadAppModule(harness);
    const fireApp = appModule.default || appModule;
    fireApp.getState().currentFileHandle = { name: 'old.json' };

    const loadPromise = appModule.loadPlan();
    await flushPromises(1);
    const createdInput = global.document.createElement.mock.results
      .map((result) => result.value)
      .find((element) => element.tagName === 'INPUT');
    createdInput.files = [loadedFile];
    await createdInput.onchange({ target: createdInput });
    await loadPromise;

    expect(global.window.showOpenFilePicker).toHaveBeenCalledTimes(1);
    expect(fireApp.getState().currentFileHandle).toBeNull();
    expect(fireApp.getState().currentFileName).toBe('fallback-plan.json');
    expect(harness.getElement('birthYear').value).toBe('1992');
    expect(harness.getElement('earlyRetirementAge').value).toBe('55');
  });

  test('loadPlan shows a clear error for unsupported encrypted envelopes instead of treating them as legacy plans', async () => {
    const harness = createAppTestHarness();
    const loadedFile = {
      name: 'encrypted-plan.json',
      text: async () => JSON.stringify({
        encrypted: true,
        version: '9.9',
        algorithm: 'AES-256-GCM',
        kdf: 'PBKDF2',
        kdfIterations: 9000000,
        salt: 'salt',
        iv: 'iv',
        data: 'cipher'
      })
    };
    const fileHandle = {
      name: loadedFile.name,
      getFile: jest.fn(async () => loadedFile)
    };
    global.window.showSaveFilePicker = jest.fn();
    global.window.showOpenFilePicker = jest.fn(async () => [fileHandle]);

    const { appModule, mocks } = loadAppModule(harness, {
      planCrypto: {
        isEncryptedPlan: jest.fn(() => false)
      }
    });
    const initialBirthYear = harness.getElement('birthYear').value;

    await appModule.loadPlan();

    expect(mocks.planCrypto.isEncryptedPlan).toHaveBeenCalled();
    expect(mocks.passwordDialog.promptPassword).not.toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('פורמט קובץ מוצפן לא נתמך'));
    expect(harness.getElement('birthYear').value).toBe(initialBirthYear);
  });
});
