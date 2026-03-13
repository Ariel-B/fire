/**
 * Sankey Data Service Tests
 * 
 * Tests for the transformToSankeyData function which converts YearlyData
 * into Sankey diagram format with proper flow balancing.
 * 
 * Key invariant for Sankey diagrams:
 * Inflows to Portfolio N+1 = Portfolio N+1 value (the displayed portfolio value)
 * 
 * Where: Inflows = Base flow from N + Contributions N+1 + Growth N+1 + RSU N+1
 * 
 * And the accounting equation is:
 * Portfolio N+1 = Portfolio N + Contributions N+1 + Growth N+1 - Expenses N+1
 * 
 * So: Base flow from N = Portfolio N+1 - Contributions N+1 - Growth N+1
 *     = Portfolio N - Expenses N+1 (since expenses reduce what flows forward)
 */

import {
  transformToSankeyData,
  filterByFlowType,
  getSankeyStatistics,
  getDefaultColorScheme
} from '../../../js/services/sankey-data-service.js';

describe('Sankey Data Service - Flow Balancing', () => {
  
  /**
   * Create mock YearlyData with flowData for testing
   */
  function createMockYearlyData(years) {
    return years.map(y => ({
      year: y.year,
      age: 40 + (y.year - 2025),
      portfolioValue: y.portfolioValue,
      phase: y.phase || 'accumulation',
      flowData: {
        monthlyContributions: y.contributions || 0,
        portfolioGrowth: y.growth || 0,
        rsuNetProceeds: y.rsu || 0,
        capitalGainsTax: y.taxes || 0,
        plannedExpenses: y.expenses || 0,
        retirementWithdrawals: y.withdrawals || 0,
        retirementRebalancingTax: y.rebalancingTax || 0,
        phase: y.phase || 'accumulation',
        isRetirementYear: y.isRetirementYear || false
      }
    }));
  }

  /**
   * Helper to sum all link values flowing INTO a node
   */
  function sumInflowsToNode(links, nodeId) {
    return links
      .filter(link => link.target === nodeId)
      .reduce((sum, link) => sum + link.value, 0);
  }

  /**
   * Helper to sum all link values flowing OUT of a node
   */
  function sumOutflowsFromNode(links, nodeId) {
    return links
      .filter(link => link.source === nodeId)
      .reduce((sum, link) => sum + link.value, 0);
  }

  describe('Basic Flow Balance: Sum of inflows equals portfolio value', () => {
    
    test('simple case: no expenses, just portfolio growth and contributions', () => {
      // Portfolio Today (Start 2025): ~100,000
      // During 2025: contributions 10,000, growth 5,000
      // Portfolio EO 2025: 115,000 = Portfolio Today + 10,000 + 5,000
      // 
      // Inflows to Portfolio EO 2025:
      // - Portfolio Today: 100,000
      // - Contributions 2025: 10,000
      // - Growth 2025: 5,000
      // - Total: 115,000 ✓
      
      const yearlyData = createMockYearlyData([
        { year: 2025, portfolioValue: 115000, contributions: 10000, growth: 5000 },
        { year: 2026, portfolioValue: 131000, contributions: 10000, growth: 6000 }
      ]);

      const result = transformToSankeyData(yearlyData, 'accumulation');
      
      // Portfolio EO 2025 inflows should equal Portfolio EO 2025 value
      const portfolioEO2025Inflows = sumInflowsToNode(result.links, 'Portfolio EO 2025');
      expect(portfolioEO2025Inflows).toBeCloseTo(115000, 0);
    });

    test('with expenses: inflows still equal portfolio value', () => {
      // Portfolio Today (Start 2025): 100,000
      // During 2025: contributions 10,000, growth 6,000, expenses 10,000
      // Portfolio EO 2025: 106,000 = 100,000 + 10,000 + 6,000 - 10,000
      // 
      // Sankey flows:
      // - Portfolio Today → Portfolio EO 2025: 100,000 (the starting value)
      // - Contributions 2025 → Portfolio EO 2025: 10,000
      // - Growth 2025 → Portfolio EO 2025: 6,000
      // - Portfolio EO 2025 → Expenses 2025: 10,000
      // 
      // Gross inflows to Portfolio EO 2025: 100,000 + 10,000 + 6,000 = 116,000
      // Outflows from Portfolio EO 2025: 10,000 (expenses)
      // Net Portfolio EO 2025: 116,000 - 10,000 = 106,000 ✓
      
      const yearlyData = createMockYearlyData([
        { year: 2025, portfolioValue: 106000, contributions: 10000, growth: 6000, expenses: 10000 },
        { year: 2026, portfolioValue: 122600, contributions: 10000, growth: 6600, expenses: 0 }
      ]);

      const result = transformToSankeyData(yearlyData, 'accumulation');
      
      // Gross inflows to Portfolio EO 2025 should be 116,000
      const portfolioEO2025Inflows = sumInflowsToNode(result.links, 'Portfolio EO 2025');
      expect(portfolioEO2025Inflows).toBeCloseTo(116000, 0);
      
      // Should have an expense outflow from Portfolio EO 2025
      const expenseOutflow = result.links.find(l => 
        l.source === 'Portfolio EO 2025' && l.target.includes('Expenses')
      );
      expect(expenseOutflow).toBeDefined();
      expect(expenseOutflow.value).toBeCloseTo(10000, 0);
      
      // Outflows from Portfolio EO 2025 (base to EO 2026 + expenses)
      const portfolioEO2025Outflows = sumOutflowsFromNode(result.links, 'Portfolio EO 2025');
      expect(portfolioEO2025Outflows).toBeCloseTo(116000, 0); // 106,000 base + 10,000 expenses
    });

    test('three years: verify consecutive year balances', () => {
      // Portfolio Today: 100,000
      // During 2025: contributions 10,000, growth 5,000
      // Portfolio EO 2025: 115,000 = 100,000 + 10,000 + 5,000
      // During 2026: contributions 10,000, growth 8,000
      // Portfolio EO 2026: 133,000 = 115,000 + 10,000 + 8,000
      
      const yearlyData = createMockYearlyData([
        { year: 2025, portfolioValue: 115000, contributions: 10000, growth: 5000 },
        { year: 2026, portfolioValue: 133000, contributions: 10000, growth: 8000 },
        { year: 2027, portfolioValue: 151000, contributions: 10000, growth: 8000 }
      ]);

      const result = transformToSankeyData(yearlyData, 'accumulation');
      
      // Verify Portfolio EO 2025 inflows = 115,000
      const portfolioEO2025Inflows = sumInflowsToNode(result.links, 'Portfolio EO 2025');
      expect(portfolioEO2025Inflows).toBeCloseTo(115000, 0);
      
      // Verify Portfolio EO 2026 inflows = 133,000
      const portfolioEO2026Inflows = sumInflowsToNode(result.links, 'Portfolio EO 2026');
      expect(portfolioEO2026Inflows).toBeCloseTo(133000, 0);
    });

    test('with expenses in middle year: flow balances maintained', () => {
      // Portfolio EO 2026: 133,000
      // During 2027: contributions 10,000, growth 7,000, expenses 50,000
      // Portfolio EO 2027: 100,000 = 133,000 + 10,000 + 7,000 - 50,000
      // 
      // Sankey flows:
      // - Portfolio EO 2026 → Portfolio EO 2027: 133,000
      // - Contributions 2027 → Portfolio EO 2027: 10,000
      // - Growth 2027 → Portfolio EO 2027: 7,000
      // - Portfolio EO 2027 → Expenses 2027: 50,000
      // 
      // Gross inflows to Portfolio EO 2027: 133,000 + 10,000 + 7,000 = 150,000
      // Expenses outflow: 50,000
      // Net: 150,000 - 50,000 = 100,000 ✓
      
      const yearlyData = createMockYearlyData([
        { year: 2026, portfolioValue: 133000, contributions: 10000, growth: 8000, expenses: 0 },
        { year: 2027, portfolioValue: 100000, contributions: 10000, growth: 7000, expenses: 50000 },
        { year: 2028, portfolioValue: 115000, contributions: 10000, growth: 5000, expenses: 0 }
      ]);

      const result = transformToSankeyData(yearlyData, 'accumulation');
      
      // Gross inflows to Portfolio EO 2027 should be 150,000
      const portfolioEO2027Inflows = sumInflowsToNode(result.links, 'Portfolio EO 2027');
      expect(portfolioEO2027Inflows).toBeCloseTo(150000, 0);
      
      // Should have an expense outflow from Portfolio EO 2027
      const expenseOutflow = result.links.find(l => 
        l.source === 'Portfolio EO 2027' && l.target.includes('Expenses')
      );
      expect(expenseOutflow).toBeDefined();
      expect(expenseOutflow.value).toBeCloseTo(50000, 0);
      
      // Outflows from Portfolio EO 2027 (base to EO 2028 + expenses)
      const portfolioEO2027Outflows = sumOutflowsFromNode(result.links, 'Portfolio EO 2027');
      expect(portfolioEO2027Outflows).toBeCloseTo(150000, 0); // 100,000 base + 50,000 expenses
    });

    test('detailed flow breakdown matches formula', () => {
      // Portfolio EO 2025: 115,000
      // During 2026: contributions 10,000, growth 8,000, expenses 0
      // Portfolio EO 2026: 133,000 = 115,000 + 10,000 + 8,000 ✓
      // So year 2026's flowData should have contributions: 10,000, growth: 8,000
      
      const yearlyData = createMockYearlyData([
        { year: 2025, portfolioValue: 115000, contributions: 5000, growth: 10000 },
        { year: 2026, portfolioValue: 133000, contributions: 10000, growth: 8000 },
        { year: 2027, portfolioValue: 151000, contributions: 10000, growth: 8000 }
      ]);

      const result = transformToSankeyData(yearlyData, 'accumulation');
      
      // Find all links flowing into Portfolio EO 2026
      const inflowLinks = result.links.filter(l => l.target === 'Portfolio EO 2026');
      
      // Should have: Portfolio EO 2025 base flow, Contributions 2026, Growth 2026
      const portfolioBaseFlow = inflowLinks.find(l => l.source === 'Portfolio EO 2025');
      const contributionsFlow = inflowLinks.find(l => l.source.includes('Contributions'));
      const growthFlow = inflowLinks.find(l => l.source.includes('Growth'));
      
      // Verify the components
      expect(portfolioBaseFlow).toBeDefined();
      expect(contributionsFlow).toBeDefined();
      expect(growthFlow).toBeDefined();
      
      // Contributions during 2026 should be 10,000
      expect(contributionsFlow.value).toBeCloseTo(10000, 0);
      expect(contributionsFlow.source).toBe('Contributions 2026');
      
      // Growth during 2026 should be 8,000
      expect(growthFlow.value).toBeCloseTo(8000, 0);
      expect(growthFlow.source).toBe('Growth 2026');
      
      // Portfolio base flow should be 115,000 (the previous portfolio EO value)
      expect(portfolioBaseFlow.value).toBeCloseTo(115000, 0);
      
      // Total should equal Portfolio EO 2026 value: 133,000
      const totalInflows = portfolioBaseFlow.value + contributionsFlow.value + growthFlow.value;
      expect(totalInflows).toBeCloseTo(133000, 0);
    });

    test('with RSU: Portfolio N+1 = Portfolio N + Contributions N + Growth N + RSU N - Expenses N', () => {
      // Portfolio EO 2025: 100,000
      // During 2026: contributions 10,000, growth 5,000, RSU 20,000
      // Portfolio EO 2026: 135,000 = 100,000 + 10,000 + 5,000 + 20,000
      
      const yearlyData = createMockYearlyData([
        { year: 2025, portfolioValue: 100000, contributions: 5000, growth: 10000, rsu: 0 },
        { year: 2026, portfolioValue: 135000, contributions: 10000, growth: 5000, rsu: 20000 },
        { year: 2027, portfolioValue: 170000, contributions: 10000, growth: 25000, rsu: 0 }
      ]);

      const result = transformToSankeyData(yearlyData, 'accumulation');
      
      const portfolioEO2026Inflows = sumInflowsToNode(result.links, 'Portfolio EO 2026');
      expect(portfolioEO2026Inflows).toBeCloseTo(135000, 0);
    });
  });

  describe('Edge Cases', () => {
    
    test('single year returns empty links (no flows to next year)', () => {
      const yearlyData = createMockYearlyData([
        { year: 2025, portfolioValue: 115000, contributions: 10000, growth: 5000 }
      ]);

      const result = transformToSankeyData(yearlyData, 'accumulation');
      
      // Should have Portfolio Today + Portfolio EO 2025 + Contributions 2025 + Growth 2025
      expect(result.nodes.length).toBe(4);
      const portfolioNodes = result.nodes.filter(n => n.id.includes('Portfolio'));
      expect(portfolioNodes.length).toBe(2); // Portfolio Today and Portfolio EO 2025
      expect(portfolioNodes.find(n => n.id === 'Portfolio Today')).toBeDefined();
      expect(portfolioNodes.find(n => n.id === 'Portfolio EO 2025')).toBeDefined();
      
      // No links flowing to next year (since there's no next year)
      const flowsToNextYear = result.links.filter(l => l.target === 'Portfolio EO 2026');
      expect(flowsToNextYear.length).toBe(0);
    });

    test('zero contributions still balances', () => {
      // Only growth, no contributions
      // Portfolio Today: 100,000
      // During 2025: contributions 0, growth 10,000
      // Portfolio EO 2025: 110,000 = 100,000 + 0 + 10,000
      const yearlyData = createMockYearlyData([
        { year: 2025, portfolioValue: 110000, contributions: 0, growth: 10000 },
        { year: 2026, portfolioValue: 121000, contributions: 0, growth: 11000 }
      ]);

      const result = transformToSankeyData(yearlyData, 'accumulation');
      
      const portfolioEO2025Inflows = sumInflowsToNode(result.links, 'Portfolio EO 2025');
      expect(portfolioEO2025Inflows).toBeCloseTo(110000, 0);
    });

    test('negative growth (market downturn) - loss flows out of Portfolio N', () => {
      // Market loss during year 2025
      // Portfolio Today = 100,000
      // During 2025: contributions 10,000, growth -15,000
      // Portfolio EO 2025 = 100,000 + 10,000 - 15,000 = 95,000
      //
      // In Sankey diagram:
      // - Portfolio Today → Portfolio EO 2025: 100,000
      // - Contributions 2025 → Portfolio EO 2025: 10,000
      // - Portfolio EO 2025 → Loss 2025: 15,000 (outflow)
      // - Gross inflows: 110,000
      // - Outflows (loss): 15,000
      // - Net: 110,000 - 15,000 = 95,000 ✓
      
      const yearlyData = createMockYearlyData([
        { year: 2025, portfolioValue: 95000, contributions: 10000, growth: -15000 },
        { year: 2026, portfolioValue: 105000, contributions: 10000, growth: 5000 }
      ]);

      const result = transformToSankeyData(yearlyData, 'accumulation');
      
      // Gross inflows to Portfolio EO 2025 (before accounting for loss)
      const portfolioEO2025Inflows = sumInflowsToNode(result.links, 'Portfolio EO 2025');
      expect(portfolioEO2025Inflows).toBeCloseTo(110000, 0); // 100,000 + 10,000
      
      // Should have a loss outflow from Portfolio EO 2025 of 15,000
      const lossOutflow = result.links.find(l => 
        l.source === 'Portfolio EO 2025' && l.target.includes('Loss')
      );
      expect(lossOutflow).toBeDefined();
      expect(lossOutflow.value).toBeCloseTo(15000, 0);
      expect(lossOutflow.target).toBe('Loss 2025');
      
      // Contributions 2025 should flow into Portfolio EO 2025
      const contributionsLink = result.links.find(l => l.source === 'Contributions 2025');
      expect(contributionsLink).toBeDefined();
      expect(contributionsLink.target).toBe('Portfolio EO 2025');
      expect(contributionsLink.value).toBeCloseTo(10000, 0);
      
      // Outflows from Portfolio EO 2025 (to EO 2026 + loss)
      const portfolioEO2025Outflows = sumOutflowsFromNode(result.links, 'Portfolio EO 2025');
      expect(portfolioEO2025Outflows).toBeCloseTo(110000, 0); // 95,000 to 2026 + 15,000 loss
    });
  });

  describe('Temporal Flow Structure: Year N sources flow into Portfolio N+1', () => {
    
    test('contributions node is labeled with year N and flows into Portfolio N+1', () => {
      // Year 2025: Portfolio 100,000, contributions 10,000 happen DURING 2025
      // Year 2026: Portfolio 115,000 is the RESULT (at start of 2026 / end of 2025)
      // So "Contributions 2025" should flow INTO "Portfolio 2026"
      
      const yearlyData = createMockYearlyData([
        { year: 2025, portfolioValue: 100000, contributions: 10000, growth: 5000 },
        { year: 2026, portfolioValue: 115000, contributions: 10000, growth: 5000 }
      ]);

      const result = transformToSankeyData(yearlyData, 'accumulation');
      
      // Find contributions link - should be labeled 2025 and flow into Portfolio 2026
      const contributionsLink = result.links.find(l => 
        l.source.includes('Contributions') && l.target === 'Portfolio EO 2025'
      );
      
      expect(contributionsLink).toBeDefined();
      // Contributions should be labeled with year 2025 (the year they happen)
      expect(contributionsLink.source).toBe('Contributions 2025');
      expect(contributionsLink.target).toBe('Portfolio EO 2025');
      expect(contributionsLink.value).toBeCloseTo(10000, 0);
      
      // The contributions node should have year 2024.5 for positioning between portfolios
      const contributionsNode = result.nodes.find(n => n.id === 'Contributions 2025');
      expect(contributionsNode).toBeDefined();
      expect(contributionsNode.year).toBe(2024.5); // Positioned between 2024 and 2025
    });

    test('growth node is labeled with year N and flows into Portfolio N+1', () => {
      // Year 2025: Portfolio 100,000, growth 5,000 happens DURING 2025
      // Year 2026: Portfolio 115,000 is the RESULT
      // So "Growth 2025" should flow INTO "Portfolio 2026"
      
      const yearlyData = createMockYearlyData([
        { year: 2025, portfolioValue: 100000, contributions: 10000, growth: 5000 },
        { year: 2026, portfolioValue: 115000, contributions: 10000, growth: 5000 }
      ]);

      const result = transformToSankeyData(yearlyData, 'accumulation');
      
      // Find growth link - should be labeled 2025 and flow into Portfolio 2026
      const growthLink = result.links.find(l => 
        l.source.includes('Growth') && l.target === 'Portfolio EO 2025'
      );
      
      expect(growthLink).toBeDefined();
      // Growth should be labeled with year 2025 (the year it happens)
      expect(growthLink.source).toBe('Growth 2025');
      expect(growthLink.target).toBe('Portfolio EO 2025');
      expect(growthLink.value).toBeCloseTo(5000, 0);
      
      // The growth node should have year 2024.5 for positioning between portfolios
      const growthNode = result.nodes.find(n => n.id === 'Growth 2025');
      expect(growthNode).toBeDefined();
      expect(growthNode.year).toBe(2024.5); // Positioned between 2024 and 2025
    });

    test('RSU node is labeled with year N and flows into Portfolio N+1', () => {
      // Year 2025: Portfolio 100,000, RSU 20,000 vests DURING 2025
      // Year 2026: Portfolio 135,000 is the RESULT
      // So "RSU 2025" should flow INTO "Portfolio 2026"
      
      const yearlyData = createMockYearlyData([
        { year: 2025, portfolioValue: 100000, contributions: 10000, growth: 5000, rsu: 20000 },
        { year: 2026, portfolioValue: 135000, contributions: 10000, growth: 5000, rsu: 0 }
      ]);

      const result = transformToSankeyData(yearlyData, 'accumulation');
      
      // Find RSU link - should be labeled 2025 and flow into Portfolio 2026
      const rsuLink = result.links.find(l => 
        l.source.includes('RSU') && l.target === 'Portfolio EO 2025'
      );
      
      expect(rsuLink).toBeDefined();
      // RSU should be labeled with year 2025 (the year it vests)
      expect(rsuLink.source).toBe('RSU 2025');
      expect(rsuLink.target).toBe('Portfolio EO 2025');
      expect(rsuLink.value).toBeCloseTo(20000, 0);
      
      // The RSU node should have year 2024.5 for positioning between portfolios
      const rsuNode = result.nodes.find(n => n.id === 'RSU 2025');
      expect(rsuNode).toBeDefined();
      expect(rsuNode.year).toBe(2024.5); // Positioned between 2024 and 2025
    });

    test('three years: each year sources flow into their respective next portfolio', () => {
      // Verify the pattern holds across multiple years:
      // - Flows during 2025 → Portfolio 2026
      // - Flows during 2026 → Portfolio 2027
      const yearlyData = createMockYearlyData([
        { year: 2025, portfolioValue: 100000, contributions: 10000, growth: 5000 },
        { year: 2026, portfolioValue: 115000, contributions: 10000, growth: 5000 },
        { year: 2027, portfolioValue: 130000, contributions: 10000, growth: 5000 }
      ]);

      const result = transformToSankeyData(yearlyData, 'accumulation');
      
      // Check 2025 flows into Portfolio 2026
      const contributions2025 = result.links.find(l => l.source === 'Contributions 2025');
      expect(contributions2025).toBeDefined();
      expect(contributions2025.target).toBe('Portfolio EO 2025');
      
      const growth2025 = result.links.find(l => l.source === 'Growth 2025');
      expect(growth2025).toBeDefined();
      expect(growth2025.target).toBe('Portfolio EO 2025');
      
      // Check 2026 flows into Portfolio 2027
      const contributions2026 = result.links.find(l => l.source === 'Contributions 2026');
      expect(contributions2026).toBeDefined();
      expect(contributions2026.target).toBe('Portfolio EO 2026');
      
      const growth2026 = result.links.find(l => l.source === 'Growth 2026');
      expect(growth2026).toBeDefined();
      expect(growth2026.target).toBe('Portfolio EO 2026');
    });
  });

  describe('Retirement phase: capital gains tax, withdrawals, and rebalancing tax nodes', () => {

    test('capitalGainsTax > 0 creates a Tax node and link with flowType tax', () => {
      const yearlyData = createMockYearlyData([
        { year: 2040, portfolioValue: 200000, withdrawals: 10000, taxes: 2000, phase: 'retirement', isRetirementYear: true },
        { year: 2041, portfolioValue: 188000, withdrawals: 10000, taxes: 0, phase: 'retirement' }
      ]);

      const result = transformToSankeyData(yearlyData, 'retirement');

      // The link flows OUT from Portfolio EO 2040 TO Tax 2040
      const taxLink = result.links.find(l => l.target === 'Tax 2040');
      expect(taxLink).toBeDefined();
      expect(taxLink.flowType).toBe('tax');
      expect(taxLink.value).toBeCloseTo(2000, 0);
    });

    test('retirementWithdrawals > 0 creates a Withdrawals node and link', () => {
      const yearlyData = createMockYearlyData([
        { year: 2040, portfolioValue: 200000, withdrawals: 12000, phase: 'retirement', isRetirementYear: true },
        { year: 2041, portfolioValue: 188000, withdrawals: 12000, phase: 'retirement' }
      ]);

      const result = transformToSankeyData(yearlyData, 'retirement');

      // The link flows OUT from Portfolio EO 2040 TO Withdrawals 2040
      const withdrawalLink = result.links.find(l => l.target === 'Withdrawals 2040');
      expect(withdrawalLink).toBeDefined();
      expect(withdrawalLink.flowType).toBe('withdrawals');
      expect(withdrawalLink.value).toBeCloseTo(12000, 0);
    });

    test('retirementRebalancingTax > 0 creates a Rebalancing Tax node and link', () => {
      const yearlyData = createMockYearlyData([
        { year: 2040, portfolioValue: 200000, withdrawals: 10000, rebalancingTax: 500, phase: 'retirement', isRetirementYear: true },
        { year: 2041, portfolioValue: 189500, withdrawals: 10000, phase: 'retirement' }
      ]);

      const result = transformToSankeyData(yearlyData, 'retirement');

      // The link flows OUT from Portfolio EO 2040 TO Rebalancing Tax 2040
      const rebalancingLink = result.links.find(l => l.target === 'Rebalancing Tax 2040');
      expect(rebalancingLink).toBeDefined();
      expect(rebalancingLink.flowType).toBe('tax');
      expect(rebalancingLink.value).toBeCloseTo(500, 0);
    });

    test('all three retirement flows created together', () => {
      const yearlyData = createMockYearlyData([
        {
          year: 2040,
          portfolioValue: 200000,
          withdrawals: 10000,
          taxes: 2000,
          rebalancingTax: 500,
          phase: 'retirement',
          isRetirementYear: true
        },
        { year: 2041, portfolioValue: 187500, withdrawals: 10000, phase: 'retirement' }
      ]);

      const result = transformToSankeyData(yearlyData, 'retirement');

      const taxLink = result.links.find(l => l.target === 'Tax 2040');
      const withdrawalLink = result.links.find(l => l.target === 'Withdrawals 2040');
      const rebalancingLink = result.links.find(l => l.target === 'Rebalancing Tax 2040');

      expect(taxLink).toBeDefined();
      expect(withdrawalLink).toBeDefined();
      expect(rebalancingLink).toBeDefined();

      expect(taxLink.flowType).toBe('tax');
      expect(withdrawalLink.flowType).toBe('withdrawals');
      expect(rebalancingLink.flowType).toBe('tax');
    });
  });
});

// ============================================================================
// filterByFlowType
// ============================================================================

describe('filterByFlowType', () => {
  function buildSankeyData(linkDefs) {
    const nodeIds = new Set();
    const links = linkDefs.map(({ source, target, flowType, value }) => {
      nodeIds.add(source);
      nodeIds.add(target);
      return { source, target, flowType, value, year: 2025, phase: 'accumulation' };
    });
    const nodes = Array.from(nodeIds).map(id => ({
      id,
      year: 2025,
      value: 100,
      phase: 'accumulation',
      type: id.startsWith('Portfolio') ? 'portfolio' : 'destination'
    }));
    return { nodes, links, yearRange: { start: 2025, end: 2025 }, phase: 'accumulation' };
  }

  test('keeps only links matching active flow types', () => {
    const data = buildSankeyData([
      { source: 'Portfolio Today', target: 'Portfolio EO 2025', flowType: 'portfolio', value: 100 },
      { source: 'Contributions 2025', target: 'Portfolio EO 2025', flowType: 'contributions', value: 10 },
      { source: 'Portfolio EO 2025', target: 'Tax 2025', flowType: 'tax', value: 5 }
    ]);

    const result = filterByFlowType(data, new Set(['contributions']));
    expect(result.links).toHaveLength(1);
    expect(result.links[0].flowType).toBe('contributions');
  });

  test('always keeps portfolio nodes regardless of filter', () => {
    const data = buildSankeyData([
      { source: 'Portfolio Today', target: 'Portfolio EO 2025', flowType: 'portfolio', value: 100 },
      { source: 'Portfolio EO 2025', target: 'Tax 2025', flowType: 'tax', value: 5 }
    ]);

    const result = filterByFlowType(data, new Set(['contributions']));
    const portfolioNodes = result.nodes.filter(n => n.type === 'portfolio');
    expect(portfolioNodes.length).toBeGreaterThan(0);
  });

  test('returns empty links for empty active set', () => {
    const data = buildSankeyData([
      { source: 'Contributions 2025', target: 'Portfolio EO 2025', flowType: 'contributions', value: 10 }
    ]);

    const result = filterByFlowType(data, new Set([]));
    expect(result.links).toHaveLength(0);
  });

  test('preserves yearRange and phase from original data', () => {
    const data = buildSankeyData([
      { source: 'Contributions 2025', target: 'Portfolio EO 2025', flowType: 'contributions', value: 10 }
    ]);

    const result = filterByFlowType(data, new Set(['contributions']));
    expect(result.yearRange).toEqual(data.yearRange);
    expect(result.phase).toBe(data.phase);
  });
});

// ============================================================================
// getSankeyStatistics
// ============================================================================

describe('getSankeyStatistics', () => {
  function makeLink(source, target, flowType, value) {
    return { source, target, flowType, value, year: 2025, phase: 'accumulation' };
  }

  test('returns correct totalInflows (contributions + growth + rsu)', () => {
    const data = {
      nodes: [],
      links: [
        makeLink('Contributions', 'Portfolio', 'contributions', 100),
        makeLink('Growth', 'Portfolio', 'growth', 50),
        makeLink('RSU', 'Portfolio', 'rsu', 30)
      ],
      yearRange: { start: 2025, end: 2025 },
      phase: 'accumulation'
    };

    const stats = getSankeyStatistics(data);
    expect(stats.totalInflows).toBe(180);
  });

  test('returns correct totalOutflows (tax + expenses + withdrawals)', () => {
    const data = {
      nodes: [],
      links: [
        makeLink('Portfolio', 'Tax', 'tax', 20),
        makeLink('Portfolio', 'Expenses', 'expenses', 40),
        makeLink('Portfolio', 'Withdrawals', 'withdrawals', 15)
      ],
      yearRange: { start: 2025, end: 2025 },
      phase: 'retirement'
    };

    const stats = getSankeyStatistics(data);
    expect(stats.totalOutflows).toBe(75);
  });

  test('calculates netFlow as totalInflows - totalOutflows', () => {
    const data = {
      nodes: [],
      links: [
        makeLink('Contributions', 'Portfolio', 'contributions', 100),
        makeLink('Portfolio', 'Tax', 'tax', 10)
      ],
      yearRange: { start: 2025, end: 2025 },
      phase: 'accumulation'
    };

    const stats = getSankeyStatistics(data);
    expect(stats.netFlow).toBe(90);
  });

  test('returns nodeCount and linkCount', () => {
    const data = {
      nodes: [{ id: 'A' }, { id: 'B' }],
      links: [
        makeLink('A', 'B', 'contributions', 50)
      ],
      yearRange: { start: 2025, end: 2025 },
      phase: 'accumulation'
    };

    const stats = getSankeyStatistics(data);
    expect(stats.nodeCount).toBe(2);
    expect(stats.linkCount).toBe(1);
  });

  test('returns flowsByType breakdown', () => {
    const data = {
      nodes: [],
      links: [
        makeLink('C', 'P', 'contributions', 100),
        makeLink('C', 'P', 'contributions', 50),
        makeLink('P', 'T', 'tax', 20)
      ],
      yearRange: { start: 2025, end: 2025 },
      phase: 'accumulation'
    };

    const stats = getSankeyStatistics(data);
    expect(stats.flowsByType.contributions).toBe(150);
    expect(stats.flowsByType.tax).toBe(20);
  });

  test('returns yearRange from data', () => {
    const data = {
      nodes: [],
      links: [],
      yearRange: { start: 2025, end: 2040 },
      phase: 'full'
    };

    const stats = getSankeyStatistics(data);
    expect(stats.yearRange).toEqual({ start: 2025, end: 2040 });
  });

  test('handles empty links', () => {
    const data = { nodes: [], links: [], yearRange: { start: 2025, end: 2025 }, phase: 'accumulation' };
    const stats = getSankeyStatistics(data);
    expect(stats.totalInflows).toBe(0);
    expect(stats.totalOutflows).toBe(0);
    expect(stats.netFlow).toBe(0);
    expect(stats.linkCount).toBe(0);
  });
});

// ============================================================================
// getDefaultColorScheme
// ============================================================================

describe('getDefaultColorScheme', () => {
  test('returns all required flow type keys', () => {
    const scheme = getDefaultColorScheme();
    expect(scheme).toHaveProperty('contributions');
    expect(scheme).toHaveProperty('growth');
    expect(scheme).toHaveProperty('rsu');
    expect(scheme).toHaveProperty('tax');
    expect(scheme).toHaveProperty('expenses');
    expect(scheme).toHaveProperty('withdrawals');
    expect(scheme).toHaveProperty('rebalancingTax');
    expect(scheme).toHaveProperty('portfolio');
  });

  test('all values are valid hex color strings', () => {
    const scheme = getDefaultColorScheme();
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    Object.values(scheme).forEach(color => {
      expect(color).toMatch(hexPattern);
    });
  });
});