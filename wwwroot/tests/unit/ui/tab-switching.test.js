/* eslint-env jest */

import {
  createAppTestHarness,
  flushPromises,
  loadAppModule
} from '../../helpers/app-test-harness.js';

describe('Tab switching UI safety net', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('module import wires DOMContentLoaded startup when the document is still loading', () => {
    const harness = createAppTestHarness({ readyState: 'loading' });

    loadAppModule(harness);

    expect(global.document.addEventListener).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
    expect(global.window.fireApp).toEqual(expect.objectContaining({
      switchTab: expect.any(Function)
    }));
  });

  test('app module configures and re-exports the dedicated app-shell entry points at runtime', () => {
    const harness = createAppTestHarness({ readyState: 'loading' });
    const mockInitializeApp = jest.fn();
    const mockSwitchTab = jest.fn();
    const { appModule, mocks } = loadAppModule(harness, {
      appShell: {
        initializeApp: mockInitializeApp,
        switchTab: mockSwitchTab
      }
    });
    const fireApp = appModule.default || appModule;

    expect(mocks.appShell.configureAppShell).toHaveBeenCalledWith(expect.objectContaining({
      state: expect.any(Object),
      calculateAndUpdate: expect.any(Function),
      setDisplayCurrency: expect.any(Function),
      setupRsuEventListeners: expect.any(Function),
      onRsuTabActivated: expect.any(Function)
    }));
    expect(appModule.initializeApp).toBe(mockInitializeApp);
    expect(fireApp.switchTab).toBe(mockSwitchTab);
  });

  test('initializeApp registers click listeners for each main tab button', async () => {
    const harness = createAppTestHarness({ readyState: 'loading' });
    const { appModule } = loadAppModule(harness);

    await appModule.initializeApp();

    [
      'tab-accumulation',
      'tab-rsu',
      'tab-expenses',
      'tab-retirement',
      'tab-results',
      'tab-money-flow'
    ].forEach((id) => {
      expect(harness.getElement(id).addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });

  test('switchTab activates the selected content and refreshes RSU price when opening the RSU tab', async () => {
    const harness = createAppTestHarness();
    const { appModule, mocks } = loadAppModule(harness, {
      rsuState: {
        getRsuConfiguration: jest.fn(() => ({
          stockSymbol: 'AAPL',
          currentPricePerShare: 0,
          priceIsFromApi: false,
          currency: '$',
          expectedAnnualReturn: 0,
          returnMethod: 'CAGR',
          defaultVestingPeriodYears: 4,
          liquidationStrategy: 'SellAfter2Years',
          marginalTaxRate: 0,
          subjectTo3PercentSurtax: false,
          grants: []
        }))
      },
      assetsApi: {
        fetchAssetPrice: jest.fn(async () => 123.45),
        fetchAssetPriceResponse: jest.fn(async () => ({ price: 123.45, currency: 'USD' }))
      }
    });
    const fireApp = appModule.default || appModule;

    fireApp.switchTab('rsu');
    await flushPromises(2);

    expect(harness.getElement('tab-rsu').classList.contains('active')).toBe(true);
    expect(harness.getElement('content-rsu').classList.contains('hidden')).toBe(false);
    expect(harness.getElement('tab-accumulation').classList.contains('active')).toBe(false);
    expect(mocks.assetsApi.fetchAssetPriceResponse).toHaveBeenCalledWith('AAPL');
  });

  test('switchTab schedules a Sankey refresh when opening the money-flow tab', () => {
    jest.useFakeTimers();
    const harness = createAppTestHarness();
    const { appModule, mocks } = loadAppModule(harness);
    const fireApp = appModule.default || appModule;

    appModule.initializeApp();
    fireApp.switchTab('money-flow');

    expect(mocks.sankeyInstances).toHaveLength(1);
    expect(mocks.sankeyInstances[0].refresh).not.toHaveBeenCalled();

    jest.advanceTimersByTime(50);

    expect(harness.getElement('tab-money-flow').classList.contains('active')).toBe(true);
    expect(harness.getElement('content-money-flow').classList.contains('hidden')).toBe(false);
    expect(mocks.sankeyInstances[0].refresh).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
});
