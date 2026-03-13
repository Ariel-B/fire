import type { Currency, PortfolioAllocation, PortfolioChartData } from '../types/index.js';

interface RetirementCoordinatorState {
  retirementAllocation: PortfolioAllocation[];
  displayCurrency: Currency;
  useRetirementPortfolio: boolean;
}

type RetirementCoordinatorDependencies = {
  state: RetirementCoordinatorState;
  getElement: <T extends HTMLElement = HTMLElement>(id: string) => T | null;
  setTextContent: (elementId: string, value: string) => void;
  escapeHtml: (value: string) => string;
  updateDonutChart: (
    chartId: string,
    data: PortfolioChartData[],
    year: number,
    currency: Currency,
    usdIlsRate: number
  ) => void;
  getUsdIlsRate: () => number;
  getEarlyRetirementYear: () => number;
  calculateAndUpdate: () => void | Promise<void>;
};

function applyRetirementAllocationFieldUpdate(
  allocation: PortfolioAllocation,
  field: keyof PortfolioAllocation,
  value: unknown
): boolean {
  switch (field) {
    case 'assetType':
    case 'description':
      if (typeof value !== 'string') {
        return false;
      }
      allocation[field] = value;
      return true;
    case 'targetPercentage':
    case 'expectedAnnualReturn':
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return false;
      }
      allocation[field] = value;
      return true;
    case 'id':
      return false;
    default:
      return false;
  }
}

export function createRetirementCoordinator(dependencies: RetirementCoordinatorDependencies) {
  function getNextRetirementAllocationId(): number {
    return dependencies.state.retirementAllocation.reduce(
      (maxId, allocation) => (allocation.id > maxId ? allocation.id : maxId),
      0
    ) + 1;
  }

  function updateRetirementTabContent(): void {
    const disabledState = dependencies.getElement('retirement-disabled-state');
    const enabledContent = dependencies.getElement('retirement-enabled-content');

    if (disabledState && enabledContent) {
      if (dependencies.state.useRetirementPortfolio) {
        disabledState.classList.add('hidden');
        enabledContent.classList.remove('hidden');
      } else {
        disabledState.classList.remove('hidden');
        enabledContent.classList.add('hidden');
      }
    }
  }

  function updateRetirementTabInfo(): void {
    const tabInfo = dependencies.getElement('retirement-tab-info');
    if (!tabInfo) return;

    if (dependencies.state.retirementAllocation.length === 0) {
      tabInfo.textContent = '';
      return;
    }

    const totalPercentage = dependencies.state.retirementAllocation.reduce(
      (sum, allocation) => sum + (allocation.targetPercentage || 0),
      0
    );

    if (totalPercentage === 0) {
      tabInfo.textContent = '';
      return;
    }

    const weightedReturn = dependencies.state.retirementAllocation.reduce((sum, allocation) => {
      const weight = (allocation.targetPercentage || 0) / 100;
      const expectedReturn = allocation.expectedAnnualReturn || 0;
      return sum + (weight * expectedReturn);
    }, 0);

    tabInfo.textContent = `(תשואה: ${weightedReturn.toFixed(1)}%)`;
  }

  function updateRetirementAllocationChart(): void {
    if (dependencies.state.retirementAllocation.length === 0) {
      return;
    }

    const chartData = dependencies.state.retirementAllocation
      .filter((allocation) => allocation.targetPercentage > 0)
      .map((allocation) => ({
        symbol: allocation.assetType,
        value: allocation.targetPercentage,
        percentage: allocation.targetPercentage,
        currency: dependencies.state.displayCurrency
      }));

    dependencies.updateDonutChart(
      'retirementPortfolioChart',
      chartData,
      dependencies.getEarlyRetirementYear(),
      dependencies.state.displayCurrency,
      dependencies.getUsdIlsRate()
    );
  }

  function updateRetirementAllocationTable(): void {
    const table = dependencies.getElement<HTMLTableElement>('retirementAllocationTable');
    if (!table) return;

    table.innerHTML = '';

    dependencies.state.retirementAllocation.forEach((allocation) => {
      const row = table.insertRow();
      row.setAttribute('data-testid', 'retirement-allocation-row');
      row.dataset.allocationId = String(allocation.id);
      const safeAssetType = dependencies.escapeHtml(allocation.assetType);
      row.innerHTML = `
      <td class="px-3 py-2">
     <input type="text" value="${safeAssetType}" data-retirement-action="update-field" data-allocation-id="${allocation.id}" data-allocation-field="assetType"
                class="w-full border rounded px-2 py-1 text-sm"
       >
      </td>
      <td class="px-3 py-2">
     <input type="number" value="${allocation.targetPercentage}" data-retirement-action="update-field" data-allocation-id="${allocation.id}" data-allocation-field="targetPercentage"
               class="w-full border rounded px-2 py-1 text-sm"
               min="0" max="100" step="1"
       >
      </td>
      <td class="px-3 py-2">
     <input type="number" value="${allocation.expectedAnnualReturn}" data-retirement-action="update-field" data-allocation-id="${allocation.id}" data-allocation-field="expectedAnnualReturn"
               class="w-full border rounded px-2 py-1 text-sm"
               step="0.1"
       >
       </td>
       <td class="px-2 py-2 text-center">
      <button type="button" data-retirement-action="remove" data-allocation-id="${allocation.id}" 
                data-testid="retirement-remove-allocation"
                 class="text-red-600 hover:text-red-800 p-1">🗑️</button>
       </td>
     `;
    });

    const totalPercentage = dependencies.state.retirementAllocation.reduce(
      (sum, allocation) => sum + (allocation.targetPercentage || 0),
      0
    );
    const weightedReturn = dependencies.state.retirementAllocation.reduce((sum, allocation) => {
      return sum + (allocation.targetPercentage / 100) * allocation.expectedAnnualReturn;
    }, 0);

    dependencies.setTextContent('retirementTotalAllocation', `${totalPercentage.toFixed(0)}%`);
    dependencies.setTextContent('retirementWeightedReturn', `${weightedReturn.toFixed(2)}%`);

    updateRetirementTabInfo();
    updateRetirementAllocationChart();
  }

  function addRetirementAllocationRow(): void {
    dependencies.state.retirementAllocation.push({
      id: getNextRetirementAllocationId(),
      assetType: '',
      targetPercentage: 0,
      expectedAnnualReturn: 0,
      description: ''
    });
    updateRetirementAllocationTable();
    void dependencies.calculateAndUpdate();
  }

  function updateRetirementAllocationField(
    id: number,
    field: keyof PortfolioAllocation,
    value: unknown
  ): void {
    const allocation = dependencies.state.retirementAllocation.find((entry) => entry.id === id);
    if (allocation && applyRetirementAllocationFieldUpdate(allocation, field, value)) {
      updateRetirementAllocationTable();
      void dependencies.calculateAndUpdate();
    }
  }

  function removeRetirementAllocation(id: number): void {
    dependencies.state.retirementAllocation = dependencies.state.retirementAllocation.filter(
      (allocation) => allocation.id !== id
    );
    updateRetirementAllocationTable();
    void dependencies.calculateAndUpdate();
  }

  function updateRetirementPortfolioCheckbox(): void {
    const checkbox = dependencies.getElement<HTMLInputElement>('useRetirementPortfolio');
    if (checkbox) {
      checkbox.checked = dependencies.state.useRetirementPortfolio;
    }
    updateRetirementTabContent();
  }

  function onRetirementPortfolioCheckboxChange(): void {
    const checkbox = dependencies.getElement<HTMLInputElement>('useRetirementPortfolio');
    if (checkbox) {
      dependencies.state.useRetirementPortfolio = checkbox.checked;
      updateRetirementTabContent();
      void dependencies.calculateAndUpdate();
    }
  }

  return {
    addRetirementAllocationRow,
    updateRetirementAllocationField,
    removeRetirementAllocation,
    updateRetirementAllocationTable,
    updateRetirementPortfolioCheckbox,
    onRetirementPortfolioCheckboxChange
  };
}
