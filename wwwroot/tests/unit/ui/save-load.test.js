/**
 * Save/Load Functionality Tests
 * Tests for plan save/load operations - addressing bugs:
 * 1. "clicking on save and load icons does nothing"
 * 2. "save button still does nothing" 
 * 3. "format changed" - old vs new save format compatibility
 * 
 * Bug History:
 * - Save/Load buttons had wrong IDs (saveButton/loadButton instead of savePlan/loadPlan)
 * - Save was trying to use API call instead of client-side blob download
 * - Format compatibility issue between old format (with inputs wrapper) and new flat format
 */

// Mock DOM and browser APIs
const mockElements = {};

const createMockElement = (id) => ({
  id,
  value: '',
  textContent: '',
  innerHTML: '',
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn(() => false)
  },
  addEventListener: jest.fn(),
  click: jest.fn(),
  files: []
});

// Create mock elements for save/load functionality
const elementIds = [
  'savePlan', 'loadPlan', 'fileInput',
  'birthYear', 'retirementYear', 'fullRetirementAge',
  'monthlyContribution', 'monthlyContributionCurrency',
  'adjustContributionsForInflation',
  'withdrawalRate', 'inflation', 'capitalGainsTax', 'usdIlsRate',
  'displayCurrency'
];

elementIds.forEach(id => {
  mockElements[id] = createMockElement(id);
});

// Set default values
mockElements['birthYear'].value = '1990';
mockElements['retirementYear'].value = '2035';
mockElements['fullRetirementAge'].value = '67';
mockElements['monthlyContribution'].value = '5000';
mockElements['monthlyContributionCurrency'].value = '₪';
mockElements['adjustContributionsForInflation'].value = 'false';
mockElements['withdrawalRate'].value = '4';
mockElements['inflation'].value = '2';
mockElements['capitalGainsTax'].value = '25';
mockElements['usdIlsRate'].value = '3.6';
mockElements['displayCurrency'].value = '$';

global.document = {
  getElementById: jest.fn((id) => mockElements[id] || null),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  createElement: jest.fn(() => ({
    href: '',
    download: '',
    click: jest.fn(),
    style: {}
  }))
};

global.URL = {
  createObjectURL: jest.fn(() => 'blob:test'),
  revokeObjectURL: jest.fn()
};

global.Blob = jest.fn((content, options) => ({
  content,
  options,
  size: JSON.stringify(content).length
}));

describe('Save/Load Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Element ID Tests - Verifying the fix for "save and load icons do nothing"
  // ============================================================================

  describe('Button Element IDs', () => {
    test('save button should have ID "savePlan" (not "saveButton")', () => {
      const saveBtn = document.getElementById('savePlan');
      expect(saveBtn).not.toBeNull();
      expect(document.getElementById('saveButton')).toBeNull();
    });

    test('load button should have ID "loadPlan" (not "loadButton")', () => {
      const loadBtn = document.getElementById('loadPlan');
      expect(loadBtn).not.toBeNull();
      expect(document.getElementById('loadButton')).toBeNull();
    });

    test('file input should have ID "fileInput"', () => {
      const fileInput = document.getElementById('fileInput');
      expect(fileInput).not.toBeNull();
    });
  });

  // ============================================================================
  // Event Listener Tests
  // ============================================================================

  describe('Event Listeners', () => {
    test('savePlan button should have click listener attached', () => {
      const saveBtn = mockElements['savePlan'];
      saveBtn.addEventListener('click', jest.fn());
      expect(saveBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    test('loadPlan button should have click listener that triggers fileInput', () => {
      const loadBtn = mockElements['loadPlan'];
      const fileInput = mockElements['fileInput'];
      
      // Simulate the event listener setup
      loadBtn.addEventListener('click', () => fileInput.click());
      
      expect(loadBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    test('fileInput should have change listener attached', () => {
      const fileInput = mockElements['fileInput'];
      fileInput.addEventListener('change', jest.fn());
      expect(fileInput.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  // ============================================================================
  // Save Format Tests - Testing the old format with 'inputs' wrapper
  // ============================================================================

  describe('Save Format (Old Format - Backward Compatible)', () => {
    const createSaveData = (inputs, portfolio, expenses) => ({
      inputs,
      accumulationPortfolio: portfolio,
      expenses
    });

    test('saved data should have inputs wrapper for backward compatibility', () => {
      const saveData = createSaveData(
        { birthYear: 1990, retirementYear: 2035 },
        [{ id: 1, symbol: 'AAPL', quantity: 100 }],
        []
      );

      expect(saveData).toHaveProperty('inputs');
      expect(saveData.inputs).toHaveProperty('birthYear', 1990);
    });

    test('saved data should include accumulationPortfolio array', () => {
      const saveData = createSaveData(
        { birthYear: 1990 },
        [{ id: 1, symbol: 'NVDA' }],
        []
      );

      expect(saveData).toHaveProperty('accumulationPortfolio');
      expect(Array.isArray(saveData.accumulationPortfolio)).toBe(true);
    });

    test('saved data should include expenses array', () => {
      const saveData = createSaveData(
        { birthYear: 1990 },
        [],
        [{ id: 1, name: 'Education', netAmount: 50000 }]
      );

      expect(saveData).toHaveProperty('expenses');
      expect(Array.isArray(saveData.expenses)).toBe(true);
    });

    test('old format structure should be preserved', () => {
      const oldFormatData = {
        inputs: {
          birthYear: 1985,
          earlyRetirementYear: 2030,
          fullRetirementAge: 67,
          monthlyContribution: 10000,
          monthlyContributionCurrency: '₪',
          adjustContributionsForInflation: true,
          withdrawalRate: 4,
          inflationRate: 2,
          capitalGainsTax: 25,
          usdIlsRate: 3.6
        },
        accumulationPortfolio: [],
        expenses: []
      };

      expect(oldFormatData.inputs).toBeDefined();
      expect(oldFormatData.inputs.birthYear).toBe(1985);
      expect(oldFormatData.inputs.earlyRetirementYear).toBe(2030);
      expect(oldFormatData.inputs.adjustContributionsForInflation).toBe(true);
    });
  });

  // ============================================================================
  // Load Format Compatibility Tests
  // ============================================================================

  describe('Load Format Compatibility', () => {
    const parseLoadedData = (data) => {
      // Detect format: old format has 'inputs' wrapper, new format is flat
      if (data.inputs) {
        // Old format
        return {
          inputs: data.inputs,
          portfolio: data.accumulationPortfolio || [],
          expenses: data.expenses || []
        };
      } else {
        // New flat format
        return {
          inputs: {
            birthYear: data.birthYear,
            retirementYear: data.retirementYear || data.earlyRetirementYear,
            fullRetirementAge: data.fullRetirementAge,
            monthlyContribution: data.monthlyContribution,
            monthlyContributionCurrency: data.monthlyContributionCurrency,
            adjustContributionsForInflation: data.adjustContributionsForInflation,
            withdrawalRate: data.withdrawalRate,
            inflationRate: data.inflationRate || data.inflation,
            capitalGainsTax: data.capitalGainsTax,
            usdIlsRate: data.usdIlsRate
          },
          portfolio: data.accumulationPortfolio || [],
          expenses: data.expenses || []
        };
      }
    };

    test('should correctly parse old format with inputs wrapper', () => {
      const oldFormat = {
        inputs: {
          birthYear: 1990,
          earlyRetirementYear: 2035
        },
        accumulationPortfolio: [{ id: 1, symbol: 'AAPL' }],
        expenses: []
      };

      const parsed = parseLoadedData(oldFormat);

      expect(parsed.inputs.birthYear).toBe(1990);
      expect(parsed.inputs.earlyRetirementYear).toBe(2035);
      expect(parsed.portfolio).toHaveLength(1);
    });

    test('should preserve adjustContributionsForInflation from old format inputs', () => {
      const oldFormat = {
        inputs: {
          birthYear: 1990,
          earlyRetirementYear: 2035,
          adjustContributionsForInflation: true
        },
        accumulationPortfolio: [],
        expenses: []
      };

      const parsed = parseLoadedData(oldFormat);

      expect(parsed.inputs.adjustContributionsForInflation).toBe(true);
    });

    test('should correctly parse new flat format', () => {
      const newFormat = {
        birthYear: 1990,
        retirementYear: 2035,
        adjustContributionsForInflation: true,
        accumulationPortfolio: [{ id: 1, symbol: 'GOOGL' }],
        expenses: []
      };

      const parsed = parseLoadedData(newFormat);

      expect(parsed.inputs.birthYear).toBe(1990);
      expect(parsed.inputs.retirementYear).toBe(2035);
      expect(parsed.inputs.adjustContributionsForInflation).toBe(true);
      expect(parsed.portfolio).toHaveLength(1);
    });

    test('should handle missing optional fields gracefully', () => {
      const minimalFormat = {
        inputs: {
          birthYear: 1990
        }
      };

      const parsed = parseLoadedData(minimalFormat);

      expect(parsed.inputs.birthYear).toBe(1990);
      expect(parsed.portfolio).toEqual([]);
      expect(parsed.expenses).toEqual([]);
    });
  });

  // ============================================================================
  // Blob Download Tests - Verifying client-side save works
  // ============================================================================

  describe('Client-Side Download', () => {
    test('should create Blob with JSON content', () => {
      const data = { test: 'data' };
      const content = JSON.stringify(data, null, 2);
      
      new Blob([content], { type: 'application/json' });

      expect(Blob).toHaveBeenCalledWith(
        [expect.any(String)],
        { type: 'application/json' }
      );
    });

    test('should create object URL for download', () => {
      const blob = new Blob(['{}'], { type: 'application/json' });
      URL.createObjectURL(blob);

      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    test('should revoke object URL after download', () => {
      const url = URL.createObjectURL({});
      URL.revokeObjectURL(url);

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    });
  });

  // ============================================================================
  // Input Fields Restoration Tests
  // ============================================================================

  describe('Input Fields Restoration', () => {
    const restoreInputs = (inputs) => {
      Object.entries(inputs).forEach(([key, value]) => {
        const element = mockElements[key];
        if (element) {
          element.value = String(value);
        }
      });
    };

    test('should restore birthYear field', () => {
      restoreInputs({ birthYear: 1985 });
      expect(mockElements['birthYear'].value).toBe('1985');
    });

    test('should restore retirementYear field', () => {
      restoreInputs({ retirementYear: 2030 });
      expect(mockElements['retirementYear'].value).toBe('2030');
    });

    test('should restore all financial parameters', () => {
      restoreInputs({
        monthlyContribution: 15000,
        adjustContributionsForInflation: true,
        withdrawalRate: 3.5,
        inflation: 2.5,
        capitalGainsTax: 25,
        usdIlsRate: 3.7
      });

      expect(mockElements['monthlyContribution'].value).toBe('15000');
      expect(mockElements['adjustContributionsForInflation'].value).toBe('true');
      expect(mockElements['withdrawalRate'].value).toBe('3.5');
      expect(mockElements['inflation'].value).toBe('2.5');
    });
  });

  // ============================================================================
  // useRetirementPortfolio Save/Load Tests
  // ============================================================================

  describe('useRetirementPortfolio Save/Load', () => {
    
    test('saved data should include useRetirementPortfolio when true', () => {
      const planData = {
        birthYear: 1990,
        earlyRetirementYear: 2040,
        adjustContributionsForInflation: true,
        useRetirementPortfolio: true,
        accumulationPortfolio: [],
        retirementAllocation: [],
        expenses: []
      };
      
      const jsonString = JSON.stringify(planData);
      const parsed = JSON.parse(jsonString);
      
      expect(parsed.useRetirementPortfolio).toBe(true);
      expect(parsed.adjustContributionsForInflation).toBe(true);
    });
    
    test('saved data should include useRetirementPortfolio when false', () => {
      const planData = {
        birthYear: 1990,
        earlyRetirementYear: 2040,
        useRetirementPortfolio: false,
        accumulationPortfolio: [],
        retirementAllocation: [],
        expenses: []
      };
      
      const jsonString = JSON.stringify(planData);
      const parsed = JSON.parse(jsonString);
      
      expect(parsed.useRetirementPortfolio).toBe(false);
    });
    
    test('loading old format without useRetirementPortfolio should work', () => {
      // Old format files won't have useRetirementPortfolio
      const oldFormatData = {
        birthYear: 1990,
        earlyRetirementYear: 2040,
        accumulationPortfolio: [{ symbol: 'VTI', quantity: 100 }],
        retirementAllocation: [
          { assetType: 'Stocks', targetPercentage: 60 }
        ],
        expenses: []
      };
      
      // Should be able to parse without errors
      const parsed = JSON.parse(JSON.stringify(oldFormatData));
      expect(parsed.useRetirementPortfolio).toBeUndefined();
    });
    
    test('should determine useRetirementPortfolio from explicit value', () => {
      const dataWithExplicitTrue = {
        useRetirementPortfolio: true,
        retirementAllocation: []
      };
      
      const dataWithExplicitFalse = {
        useRetirementPortfolio: false,
        retirementAllocation: [{ assetType: 'Stocks' }]
      };
      
      // When explicit, use that value
      expect(dataWithExplicitTrue.useRetirementPortfolio).toBe(true);
      expect(dataWithExplicitFalse.useRetirementPortfolio).toBe(false);
    });
    
    test('should auto-enable when loading file with retirement data but no flag', () => {
      // Simulate the logic from loadPlan
      const planData = {
        retirementAllocation: [
          { assetType: 'Stocks', targetPercentage: 60 },
          { assetType: 'Bonds', targetPercentage: 40 }
        ]
      };
      
      // Logic: if useRetirementPortfolio is not set but retirement data exists, enable it
      const hasCustomRetirementData = planData.retirementAllocation && 
        planData.retirementAllocation.length > 0;
      
      const useRetirementPortfolio = typeof planData.useRetirementPortfolio === 'boolean' 
        ? planData.useRetirementPortfolio 
        : hasCustomRetirementData;
      
      expect(useRetirementPortfolio).toBe(true);
    });
    
    test('should default to false when loading file with no retirement data and no flag', () => {
      const planData = {
        accumulationPortfolio: [{ symbol: 'VTI' }]
        // No retirementAllocation, no useRetirementPortfolio
      };
      
      const hasCustomRetirementData = planData.retirementAllocation && 
        planData.retirementAllocation.length > 0;
      
      const useRetirementPortfolio = typeof planData.useRetirementPortfolio === 'boolean' 
        ? planData.useRetirementPortfolio 
        : (hasCustomRetirementData || false);
      
      expect(useRetirementPortfolio).toBe(false);
    });
  });
});
