import type { Currency } from '../types/index.js';
import type { RsuConfiguration, RsuGrant } from '../types/rsu-types.js';

type RsuState = {
  includeInCalculations: boolean;
};

type RsuCoordinatorDependencies = {
  getElement: <T extends HTMLElement = HTMLElement>(id: string) => T | null;
  setTextContent: (elementId: string, value: string) => void;
  getRsuGrants: () => RsuGrant[];
  getRsuConfiguration: () => RsuConfiguration;
  getRsuState: () => RsuState;
  updateRsuConfiguration: (updates: Partial<RsuConfiguration>) => void;
  setRsuIncludeInCalculations: (include: boolean) => void;
  calculateRsuSummary: (earlyRetirementYear: number) => {
    projectedNetValue?: number;
    projectedTax?: number;
  };
  fetchAssetPriceResponse: (symbol: string) => Promise<{ price: number; currency: string } | null>;
  getEarlyRetirementYear: () => number;
  calculateAndUpdate: () => void | Promise<void>;
};

function getSurtaxCheckbox(
  getElement: RsuCoordinatorDependencies['getElement']
): HTMLInputElement | null {
  return getElement<HTMLInputElement>('rsuSurtax')
    ?? getElement<HTMLInputElement>('rsuSubjectToSurtax');
}

function toDisplayCurrency(currency?: string | Currency): '$' | '₪' {
  return currency === 'ILS' || currency === '₪' ? '₪' : '$';
}

export function createRsuCoordinator(dependencies: RsuCoordinatorDependencies) {
  function updateRsuSummary(): void {
    const grants = dependencies.getRsuGrants();
    const config = dependencies.getRsuConfiguration();

    const totalShares = grants.reduce((sum, grant) => sum + grant.numberOfShares, 0);
    const totalSharesSold = grants.reduce((sum, grant) => sum + (grant.sharesSold || 0), 0);
    const remainingShares = totalShares - totalSharesSold;
    const currentValue = remainingShares * (config.currentPricePerShare || 0);

    const earlyRetirementYear = dependencies.getEarlyRetirementYear();
    const projectedSummary = dependencies.calculateRsuSummary(earlyRetirementYear);
    const projectedNetValue = projectedSummary.projectedNetValue || 0;
    const totalTax = projectedSummary.projectedTax || 0;

    const currencySymbol = toDisplayCurrency(config.currency);
    dependencies.setTextContent('rsuCurrentValue', `${currencySymbol}${currentValue.toLocaleString()}`);
    dependencies.setTextContent('rsuActiveGrants', grants.length.toString());

    let fullyVestedDate: Date | undefined;
    grants.forEach((grant) => {
      const vestingCompleteDate = new Date(grant.grantDate);
      vestingCompleteDate.setFullYear(vestingCompleteDate.getFullYear() + grant.vestingPeriodYears);

      if (!fullyVestedDate || vestingCompleteDate > fullyVestedDate) {
        fullyVestedDate = vestingCompleteDate;
      }
    });

    const fullyVestedDisplay = fullyVestedDate
      ? fullyVestedDate.toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })
      : '-';
    dependencies.setTextContent('rsuFullyVestedDate', fullyVestedDisplay);

    dependencies.setTextContent('rsuProjectedNet', `${currencySymbol}${Math.round(projectedNetValue).toLocaleString()}`);
    dependencies.setTextContent('rsuProjectedTax', `מס: ${currencySymbol}${Math.round(totalTax).toLocaleString()}`);

    const tabInfo = dependencies.getElement('rsu-tab-info');
    if (tabInfo && grants.length > 0 && currentValue > 0) {
      tabInfo.textContent = `(${currencySymbol}${currentValue.toLocaleString()})`;
    } else if (tabInfo) {
      tabInfo.textContent = '';
    }
  }

  async function fetchRsuStockPrice(symbol: string): Promise<void> {
    if (!symbol) {
      return;
    }

    const priceInput = dependencies.getElement<HTMLInputElement>('rsuCurrentPrice');
    const currencySelect = dependencies.getElement<HTMLSelectElement>('rsuCurrency');

    try {
      if (priceInput) {
        priceInput.placeholder = 'טוען...';
        priceInput.readOnly = true;
      }

      const response = await dependencies.fetchAssetPriceResponse(symbol);

      if (response !== null && response.price > 0) {
        if (priceInput) {
          priceInput.value = response.price.toFixed(2);
          priceInput.placeholder = '';
          priceInput.readOnly = true;
          priceInput.classList.add('bg-green-50', 'border-green-200');
          priceInput.classList.remove('bg-white', 'border-gray-300');
          priceInput.title = 'מחיר מה-API - לעריכה ידנית מחק את סימול המניה';
        }

        const currency = toDisplayCurrency(response.currency);
        if (currencySelect) {
          currencySelect.value = currency;
          currencySelect.disabled = true;
          currencySelect.classList.add('bg-green-50', 'border-green-200');
          currencySelect.classList.remove('bg-white', 'border-gray-300');
          currencySelect.title = 'מטבע מה-API - לעריכה ידנית מחק את סימול המניה';
        }

        dependencies.updateRsuConfiguration({
          currentPricePerShare: response.price,
          priceIsFromApi: true,
          currency
        });
        updateRsuSummary();
        return;
      }

      if (priceInput) {
        priceInput.placeholder = 'לא נמצא';
        priceInput.readOnly = false;
        priceInput.classList.remove('bg-green-50', 'border-green-200');
        priceInput.classList.add('bg-white');
        priceInput.title = '';
      }
      if (currencySelect) {
        currencySelect.disabled = false;
        currencySelect.classList.remove('bg-green-50', 'border-green-200');
        currencySelect.classList.add('bg-white');
        currencySelect.title = '';
      }
      dependencies.updateRsuConfiguration({ priceIsFromApi: false });
    } catch {
      if (priceInput) {
        priceInput.placeholder = 'שגיאה';
        priceInput.readOnly = false;
        priceInput.classList.remove('bg-green-50', 'border-green-200');
        priceInput.classList.add('bg-white');
        priceInput.title = '';
      }
      if (currencySelect) {
        currencySelect.disabled = false;
        currencySelect.classList.remove('bg-green-50', 'border-green-200');
        currencySelect.classList.add('bg-white');
        currencySelect.title = '';
      }
      dependencies.updateRsuConfiguration({ priceIsFromApi: false });
    }
  }

  function updateRsuUIFromState(): void {
    const config = dependencies.getRsuConfiguration();
    const rsuState = dependencies.getRsuState();

    const symbolInput = dependencies.getElement<HTMLInputElement>('rsuStockSymbol');
    if (symbolInput && config.stockSymbol) {
      symbolInput.value = config.stockSymbol;
    }

    const priceInput = dependencies.getElement<HTMLInputElement>('rsuCurrentPrice');
    if (priceInput) {
      if (config.currentPricePerShare > 0) {
        priceInput.value = config.currentPricePerShare.toFixed(2);
      }
      if (config.priceIsFromApi) {
        priceInput.readOnly = true;
        priceInput.classList.add('bg-green-50', 'border-green-200');
        priceInput.classList.remove('bg-white', 'border-gray-300');
        priceInput.title = 'מחיר מה-API - לעריכה ידנית מחק את סימול המניה';
      } else {
        priceInput.readOnly = false;
        priceInput.classList.remove('bg-green-50', 'border-green-200');
        priceInput.classList.add('bg-white');
        priceInput.title = '';
      }
    }

    const currencySelect = dependencies.getElement<HTMLSelectElement>('rsuCurrency');
    if (currencySelect) {
      currencySelect.value = toDisplayCurrency(config.currency);
      if (config.priceIsFromApi) {
        currencySelect.disabled = true;
        currencySelect.classList.add('bg-green-50', 'border-green-200');
        currencySelect.classList.remove('bg-white', 'border-gray-300');
        currencySelect.title = 'מטבע מה-API - לעריכה ידנית מחק את סימול המניה';
      } else {
        currencySelect.disabled = false;
        currencySelect.classList.remove('bg-green-50', 'border-green-200');
        currencySelect.classList.add('bg-white');
        currencySelect.title = '';
      }
    }

    const returnInput = dependencies.getElement<HTMLInputElement>('rsuExpectedReturn');
    if (returnInput) {
      returnInput.value = config.expectedAnnualReturn.toString();
    }

    const methodSelect = dependencies.getElement<HTMLSelectElement>('rsuReturnMethod');
    if (methodSelect) {
      methodSelect.value = config.returnMethod;
    }

    const taxInput = dependencies.getElement<HTMLInputElement>('rsuMarginalTaxRate');
    if (taxInput) {
      taxInput.value = config.marginalTaxRate.toString();
    }

    const surtaxCheckbox = getSurtaxCheckbox(dependencies.getElement);
    if (surtaxCheckbox) {
      surtaxCheckbox.checked = config.subjectTo3PercentSurtax;
    }

    const liquidationSelect = dependencies.getElement<HTMLSelectElement>('rsuLiquidationStrategy');
    if (liquidationSelect) {
      liquidationSelect.value = config.liquidationStrategy;
    }

    const includeCheckbox = dependencies.getElement<HTMLInputElement>('includeRsuInCalculations');
    if (includeCheckbox) {
      includeCheckbox.checked = rsuState.includeInCalculations;
    }
  }

  function resetManualPriceControls(): void {
    const priceInput = dependencies.getElement<HTMLInputElement>('rsuCurrentPrice');
    const currencySelect = dependencies.getElement<HTMLSelectElement>('rsuCurrency');

    if (priceInput) {
      priceInput.readOnly = false;
      priceInput.classList.remove('bg-green-50', 'border-green-200');
      priceInput.classList.add('bg-white');
      priceInput.title = '';
    }
    if (currencySelect) {
      currencySelect.disabled = false;
      currencySelect.classList.remove('bg-green-50', 'border-green-200');
      currencySelect.classList.add('bg-white');
      currencySelect.title = '';
    }
    dependencies.updateRsuConfiguration({ priceIsFromApi: false });
  }

  function setupEventListeners(): void {
    const priceInput = dependencies.getElement<HTMLInputElement>('rsuCurrentPrice');
    if (priceInput) {
      priceInput.addEventListener('change', () => {
        const price = parseFloat(priceInput.value) || 0;
        const currencySelect = dependencies.getElement<HTMLSelectElement>('rsuCurrency');
        const currency = (currencySelect?.value || '$') as '$' | '₪';
        dependencies.updateRsuConfiguration({ currentPricePerShare: price, currency, priceIsFromApi: false });
        priceInput.readOnly = false;
        priceInput.classList.remove('bg-green-50', 'border-green-200');
        priceInput.classList.add('bg-white');
        priceInput.title = '';
        updateRsuSummary();
        void dependencies.calculateAndUpdate();
      });
    }

    const currencySelect = dependencies.getElement<HTMLSelectElement>('rsuCurrency');
    if (currencySelect) {
      currencySelect.addEventListener('change', () => {
        const currency = currencySelect.value as '$' | '₪';
        dependencies.updateRsuConfiguration({ currency });
        updateRsuSummary();
        void dependencies.calculateAndUpdate();
      });
    }

    const returnInput = dependencies.getElement<HTMLInputElement>('rsuExpectedReturn');
    if (returnInput) {
      returnInput.addEventListener('change', () => {
        const rate = parseFloat(returnInput.value) || 10;
        dependencies.updateRsuConfiguration({ expectedAnnualReturn: rate });
        void dependencies.calculateAndUpdate();
      });
    }

    const methodSelect = dependencies.getElement<HTMLSelectElement>('rsuReturnMethod');
    if (methodSelect) {
      methodSelect.addEventListener('change', () => {
        const method = methodSelect.value as RsuConfiguration['returnMethod'];
        dependencies.updateRsuConfiguration({ returnMethod: method });
        void dependencies.calculateAndUpdate();
      });
    }

    const taxInput = dependencies.getElement<HTMLInputElement>('rsuMarginalTaxRate');
    if (taxInput) {
      taxInput.addEventListener('change', () => {
        const rate = parseFloat(taxInput.value) || 47;
        dependencies.updateRsuConfiguration({ marginalTaxRate: rate });
        updateRsuSummary();
        void dependencies.calculateAndUpdate();
      });
    }

    const surtaxCheckbox = getSurtaxCheckbox(dependencies.getElement);
    if (surtaxCheckbox) {
      surtaxCheckbox.addEventListener('change', () => {
        dependencies.updateRsuConfiguration({ subjectTo3PercentSurtax: surtaxCheckbox.checked });
        updateRsuSummary();
        void dependencies.calculateAndUpdate();
      });
    }

    const symbolInput = dependencies.getElement<HTMLInputElement>('rsuStockSymbol');
    if (symbolInput) {
      symbolInput.addEventListener('change', async () => {
        const symbol = symbolInput.value.toUpperCase().trim();
        dependencies.updateRsuConfiguration({ stockSymbol: symbol });

        if (symbol) {
          await fetchRsuStockPrice(symbol);
        } else {
          resetManualPriceControls();
        }

        void dependencies.calculateAndUpdate();
      });
    }

    const liquidationSelect = dependencies.getElement<HTMLSelectElement>('rsuLiquidationStrategy');
    if (liquidationSelect) {
      liquidationSelect.addEventListener('change', () => {
        const strategy = liquidationSelect.value as RsuConfiguration['liquidationStrategy'];
        dependencies.updateRsuConfiguration({ liquidationStrategy: strategy });
        updateRsuSummary();
        void dependencies.calculateAndUpdate();
      });
    }

    const includeCheckbox = dependencies.getElement<HTMLInputElement>('includeRsuInCalculations');
    if (includeCheckbox) {
      includeCheckbox.addEventListener('change', () => {
        dependencies.setRsuIncludeInCalculations(includeCheckbox.checked);
        void dependencies.calculateAndUpdate();
      });
    }
  }

  async function onTabActivated(): Promise<void> {
    const config = dependencies.getRsuConfiguration();
    if (config.stockSymbol) {
      await fetchRsuStockPrice(config.stockSymbol);
    }
  }

  return {
    updateRsuSummary,
    fetchRsuStockPrice,
    updateRsuUIFromState,
    setupEventListeners,
    onTabActivated
  };
}
