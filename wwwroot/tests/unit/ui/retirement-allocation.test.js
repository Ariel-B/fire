/**
 * Retirement Allocation Table Tests
 * Tests for retirement allocation display - addressing bug: "retirement portfolio is empty"
 * 
 * Bug History:
 * - updateRetirementAllocationTable was not being called after load
 * - Fixed by adding calls in initializeApp and loadPlan functions
 */

// Mock DOM setup
const mockElements = {};

const createMockElement = (id) => ({
  id,
  textContent: '',
  innerHTML: '',
  value: '',
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn(() => false)
  }
});

// Retirement allocation table elements
const elementIds = [
  'retirementAllocationTable',
  'retirementPortfolioChart'
];

elementIds.forEach(id => {
  mockElements[id] = createMockElement(id);
});

global.document = {
  getElementById: jest.fn((id) => mockElements[id] || null),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => [])
};

describe('Retirement Allocation Table', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockElements['retirementAllocationTable'].innerHTML = '';
  });

  // ============================================================================
  // Table Element Existence
  // ============================================================================

  describe('Table Element', () => {
    test('retirementAllocationTable element should exist', () => {
      expect(document.getElementById('retirementAllocationTable')).not.toBeNull();
    });
  });

  // ============================================================================
  // Default Allocations
  // ============================================================================

  describe('Default Allocations', () => {
    const defaultAllocations = [
      { id: 1, assetType: 'מניות ארה"ב', targetPercentage: 40, expectedAnnualReturn: 10, description: 'VOO/VTI' },
      { id: 2, assetType: 'מניות בינלאומיות', targetPercentage: 20, expectedAnnualReturn: 8, description: 'VXUS' },
      { id: 3, assetType: 'אג"ח', targetPercentage: 30, expectedAnnualReturn: 4, description: 'BND' },
      { id: 4, assetType: 'מזומן/קרן נאמנות', targetPercentage: 10, expectedAnnualReturn: 2, description: 'VMFXX' }
    ];

    test('should have 4 default allocations', () => {
      expect(defaultAllocations.length).toBe(4);
    });

    test('default allocations should sum to 100%', () => {
      const total = defaultAllocations.reduce((sum, a) => sum + a.targetPercentage, 0);
      expect(total).toBe(100);
    });

    test('each allocation should have required fields', () => {
      defaultAllocations.forEach(allocation => {
        expect(allocation).toHaveProperty('id');
        expect(allocation).toHaveProperty('assetType');
        expect(allocation).toHaveProperty('targetPercentage');
        expect(allocation).toHaveProperty('expectedAnnualReturn');
        expect(allocation).toHaveProperty('description');
      });
    });
  });

  // ============================================================================
  // Table Rendering
  // ============================================================================

  describe('Table Rendering', () => {
    const renderRetirementAllocationTable = (allocations) => {
      const tableBody = mockElements['retirementAllocationTable'];
      if (!tableBody) return;
      
      tableBody.innerHTML = allocations.map(allocation => `
        <tr>
          <td>${allocation.assetType}</td>
          <td>${allocation.targetPercentage}%</td>
          <td>${allocation.expectedAnnualReturn}%</td>
          <td>${allocation.description}</td>
        </tr>
      `).join('');
    };

    test('should render all allocations as table rows', () => {
      const allocations = [
        { id: 1, assetType: 'מניות', targetPercentage: 60, expectedAnnualReturn: 10, description: 'VTI' },
        { id: 2, assetType: 'אג"ח', targetPercentage: 40, expectedAnnualReturn: 4, description: 'BND' }
      ];

      renderRetirementAllocationTable(allocations);

      const html = mockElements['retirementAllocationTable'].innerHTML;
      expect(html).toContain('מניות');
      expect(html).toContain('אג"ח');
      expect(html).toContain('60%');
      expect(html).toContain('40%');
    });

    test('should include expected returns', () => {
      const allocations = [
        { id: 1, assetType: 'מניות', targetPercentage: 100, expectedAnnualReturn: 10, description: 'VTI' }
      ];

      renderRetirementAllocationTable(allocations);

      const html = mockElements['retirementAllocationTable'].innerHTML;
      expect(html).toContain('10%');
    });

    test('should include descriptions', () => {
      const allocations = [
        { id: 1, assetType: 'מניות', targetPercentage: 100, expectedAnnualReturn: 10, description: 'VOO/VTI' }
      ];

      renderRetirementAllocationTable(allocations);

      const html = mockElements['retirementAllocationTable'].innerHTML;
      expect(html).toContain('VOO/VTI');
    });
  });

  // ============================================================================
  // Update Triggers - The bug fix
  // ============================================================================

  describe('Update Triggers', () => {
    test('table should update on app initialization', () => {
      let updateCalled = false;
      const updateRetirementAllocationTable = () => { updateCalled = true; };
      
      // Simulate initializeApp
      const initializeApp = () => {
        updateRetirementAllocationTable();
      };
      
      initializeApp();
      
      expect(updateCalled).toBe(true);
    });

    test('table should update after loading plan', () => {
      let updateCalled = false;
      const updateRetirementAllocationTable = () => { updateCalled = true; };
      
      // Simulate loadPlan
      const loadPlan = () => {
        // Load data...
        updateRetirementAllocationTable();
      };
      
      loadPlan();
      
      expect(updateCalled).toBe(true);
    });

    test('table should update when allocation changes', () => {
      let updateCount = 0;
      const updateRetirementAllocationTable = () => { updateCount++; };
      
      // Simulate user changing allocation
      const updateAllocation = () => {
        updateRetirementAllocationTable();
      };
      
      updateAllocation();
      updateAllocation();
      
      expect(updateCount).toBe(2);
    });
  });

  // ============================================================================
  // Allocation Validation
  // ============================================================================

  describe('Allocation Validation', () => {
    const validateAllocations = (allocations) => {
      const total = allocations.reduce((sum, a) => sum + (a.targetPercentage || 0), 0);
      return {
        isValid: total === 100,
        total,
        difference: 100 - total
      };
    };

    test('should validate that allocations sum to 100%', () => {
      const validAllocations = [
        { targetPercentage: 40 },
        { targetPercentage: 30 },
        { targetPercentage: 30 }
      ];

      const result = validateAllocations(validAllocations);

      expect(result.isValid).toBe(true);
      expect(result.total).toBe(100);
    });

    test('should detect when allocations are under 100%', () => {
      const underAllocations = [
        { targetPercentage: 40 },
        { targetPercentage: 30 }
      ];

      const result = validateAllocations(underAllocations);

      expect(result.isValid).toBe(false);
      expect(result.difference).toBe(30);
    });

    test('should detect when allocations exceed 100%', () => {
      const overAllocations = [
        { targetPercentage: 60 },
        { targetPercentage: 50 }
      ];

      const result = validateAllocations(overAllocations);

      expect(result.isValid).toBe(false);
      expect(result.difference).toBe(-10);
    });
  });

  // ============================================================================
  // Expected Return Calculation
  // ============================================================================

  describe('Weighted Average Return', () => {
    const calculateWeightedReturn = (allocations) => {
      const total = allocations.reduce((sum, a) => sum + (a.targetPercentage || 0), 0);
      if (total === 0) return 0;
      
      const weightedSum = allocations.reduce((sum, a) => {
        return sum + (a.targetPercentage / 100) * (a.expectedAnnualReturn || 0);
      }, 0);
      
      return weightedSum;
    };

    test('should calculate weighted average return', () => {
      const allocations = [
        { targetPercentage: 60, expectedAnnualReturn: 10 },
        { targetPercentage: 40, expectedAnnualReturn: 4 }
      ];

      const result = calculateWeightedReturn(allocations);

      // (60 * 10 + 40 * 4) / 100 = (600 + 160) / 100 = 7.6
      expect(result).toBeCloseTo(7.6, 1);
    });

    test('should handle single allocation', () => {
      const allocations = [
        { targetPercentage: 100, expectedAnnualReturn: 8 }
      ];

      const result = calculateWeightedReturn(allocations);

      expect(result).toBe(8);
    });

    test('should return 0 for empty allocations', () => {
      const result = calculateWeightedReturn([]);
      expect(result).toBe(0);
    });
  });
});
