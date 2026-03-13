/**
 * Sankey Data Service
 * Transforms FIRE calculation results into Sankey diagram format
 */

import type {
  YearlyData,
  SankeyNode,
  SankeyLink,
  SankeyDiagramData,
  SankeyFlowType,
  SankeyFlowData
} from '../types/index.js';

/**
 * Transform YearlyData array into Sankey diagram data
 * @param yearlyData Array of yearly financial data with flow information
 * @param phase Filter by phase: 'accumulation', 'retirement', or 'full'
 * @param yearRange Optional year range filter
 * @returns Complete Sankey diagram data structure
 */
export function transformToSankeyData(
  yearlyData: YearlyData[],
  phase: 'accumulation' | 'retirement' | 'full' = 'full',
  yearRange?: { start: number; end: number }
): SankeyDiagramData {
  // Filter data by phase and year range
  let filteredData = yearlyData.filter(year => {
    const phaseMatch = phase === 'full' || year.phase === phase;
    const yearMatch = !yearRange || (year.year >= yearRange.start && year.year <= yearRange.end);
    return phaseMatch && yearMatch && year.flowData;
  });

  if (filteredData.length === 0) {
    return {
      nodes: [],
      links: [],
      yearRange: { start: 0, end: 0 },
      phase
    };
  }

  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];

  // Calculate and create the initial "Portfolio Today" node
  // This is the portfolio at the START of the first year (before any activities)
  if (filteredData.length > 0) {
    const firstYear = filteredData[0];
    const firstFlowData = firstYear.flowData!;
    
    // Portfolio Today = Portfolio EO Year1 - Contributions Year1 - Growth Year1 - RSU Year1 + Expenses Year1
    const portfolioToday = firstYear.portfolioValue 
      - firstFlowData.monthlyContributions 
      - firstFlowData.portfolioGrowth 
      - firstFlowData.rsuNetProceeds
      + firstFlowData.plannedExpenses;
    
    // Determine label: "Portfolio Today" if it's the very first year of data, otherwise "Portfolio EO [PrevYear]"
    const isFirstYearOfSimulation = yearlyData.length > 0 && firstYear.year === yearlyData[0].year;
    const startNodeId = isFirstYearOfSimulation ? 'Portfolio Today' : `Portfolio EO ${firstYear.year - 1}`;

    nodes.push({
      id: startNodeId,
      year: firstYear.year - 1, // Treat as "previous year" for positioning
      value: portfolioToday,
      phase: firstYear.phase as 'accumulation' | 'retirement',
      type: 'portfolio'
    });
  }

  // Create nodes and links for each year
  filteredData.forEach((yearData, index) => {
    const year = yearData.year;
    const flowData = yearData.flowData!;
    
    // Create portfolio node for END of this year
    const portfolioNodeId = `Portfolio EO ${year}`;
    nodes.push({
      id: portfolioNodeId,
      year,
      value: yearData.portfolioValue,
      phase: yearData.phase as 'accumulation' | 'retirement',
      type: 'portfolio'
    });

    // Determine the source portfolio node
    let sourcePortfolioId: string;
    if (index === 0) {
      const isFirstYearOfSimulation = yearlyData.length > 0 && filteredData[0].year === yearlyData[0].year;
      sourcePortfolioId = isFirstYearOfSimulation ? 'Portfolio Today' : `Portfolio EO ${filteredData[0].year - 1}`;
    } else {
      sourcePortfolioId = `Portfolio EO ${filteredData[index - 1].year}`;
    }
    
    // Get the starting portfolio value for this year
    let startingPortfolio: number;
    if (index === 0) {
      // For first year, calculate backwards from end value
      startingPortfolio = yearData.portfolioValue 
        - flowData.monthlyContributions 
        - flowData.portfolioGrowth 
        - flowData.rsuNetProceeds
        + flowData.plannedExpenses;
    } else {
      // For subsequent years, use previous year's end value
      startingPortfolio = filteredData[index - 1].portfolioValue;
    }
    
    // Base flow: starting portfolio flows into end-of-year portfolio
    if (startingPortfolio > 0) {
      links.push({
        source: sourcePortfolioId,
        target: portfolioNodeId,
        value: startingPortfolio,
        flowType: 'growth',
        year,
        phase: yearData.phase as 'accumulation' | 'retirement'
      });
    }
    
    // Create contribution/growth/RSU inflows during year N into Portfolio EO N
    // These flows happen during year N and result in Portfolio EO N
    
    // Contributions during year N flow into Portfolio EO N
    if (flowData.monthlyContributions > 0) {
      const sourceId = `Contributions ${year}`;
      nodes.push({
        id: sourceId,
        year: year - 0.5, // Position between previous portfolio and Portfolio EO N
        value: flowData.monthlyContributions,
        phase: yearData.phase as 'accumulation' | 'retirement',
        type: 'source'
      });
      links.push({
        source: sourceId,
        target: portfolioNodeId,
        value: flowData.monthlyContributions,
        flowType: 'contributions',
        year: year,
        phase: yearData.phase as 'accumulation' | 'retirement'
      });
    }
    
    // Growth during year N flows into Portfolio EO N
    if (flowData.portfolioGrowth > 0) {
      const sourceId = `Growth ${year}`;
      nodes.push({
        id: sourceId,
        year: year - 0.5, // Position between previous portfolio and Portfolio EO N
        value: flowData.portfolioGrowth,
        phase: yearData.phase as 'accumulation' | 'retirement',
        type: 'source'
      });
      links.push({
        source: sourceId,
        target: portfolioNodeId,
        value: flowData.portfolioGrowth,
        flowType: 'growth',
        year: year,
        phase: yearData.phase as 'accumulation' | 'retirement'
      });
    }
    
    // Handle negative growth (losses) during year N - outflow from Portfolio EO N
    if (flowData.portfolioGrowth < 0) {
      const targetId = `Loss ${year}`;
      nodes.push({
        id: targetId,
        year: year + 0.5, // Position after Portfolio EO N
        value: Math.abs(flowData.portfolioGrowth),
        phase: yearData.phase as 'accumulation' | 'retirement',
        type: 'destination'
      });
      links.push({
        source: portfolioNodeId,
        target: targetId,
        value: Math.abs(flowData.portfolioGrowth),
        flowType: 'growth',
        year: year,
        phase: yearData.phase as 'accumulation' | 'retirement'
      });
    }
      
    // RSU proceeds during year N flow into Portfolio EO N
    if (flowData.rsuNetProceeds > 0) {
      const sourceId = `RSU ${year}`;
      nodes.push({
        id: sourceId,
        year: year - 0.5, // Position between previous portfolio and Portfolio EO N
        value: flowData.rsuNetProceeds,
        phase: yearData.phase as 'accumulation' | 'retirement',
        type: 'source'
      });
      links.push({
        source: sourceId,
        target: portfolioNodeId,
        value: flowData.rsuNetProceeds,
        flowType: 'rsu',
        year: year,
        phase: yearData.phase as 'accumulation' | 'retirement'
      });
    }
      
    // Expenses during year N flow out from Portfolio EO N
    if (flowData.plannedExpenses > 0) {
      const targetId = `Expenses ${year}`;
      nodes.push({
        id: targetId,
        year: year + 0.5, // Position after Portfolio EO N
        value: flowData.plannedExpenses,
        phase: yearData.phase as 'accumulation' | 'retirement',
        type: 'destination'
      });
      links.push({
        source: portfolioNodeId,
        target: targetId,
        value: flowData.plannedExpenses,
        flowType: 'expenses',
        year,
        phase: yearData.phase as 'accumulation' | 'retirement'
      });
    }
    
    // Capital gains tax during year N flows out from Portfolio EO N
    if (flowData.capitalGainsTax > 0) {
      const targetId = `Tax ${year}`;
      nodes.push({
        id: targetId,
        year: year + 0.5, // Position after Portfolio EO N
        value: flowData.capitalGainsTax,
        phase: yearData.phase as 'accumulation' | 'retirement',
        type: 'destination'
      });
      links.push({
        source: portfolioNodeId,
        target: targetId,
        value: flowData.capitalGainsTax,
        flowType: 'tax',
        year,
        phase: yearData.phase as 'accumulation' | 'retirement'
      });
    }
    
    // Retirement withdrawals during year N flow out from Portfolio EO N
    if (flowData.retirementWithdrawals > 0) {
      const targetId = `Withdrawals ${year}`;
      nodes.push({
        id: targetId,
        year: year + 0.5, // Position after Portfolio EO N
        value: flowData.retirementWithdrawals,
        phase: yearData.phase as 'accumulation' | 'retirement',
        type: 'destination'
      });
      links.push({
        source: portfolioNodeId,
        target: targetId,
        value: flowData.retirementWithdrawals,
        flowType: 'withdrawals',
        year,
        phase: yearData.phase as 'accumulation' | 'retirement'
      });
    }
    
    // Retirement rebalancing tax during year N flows out from Portfolio EO N
    if (flowData.retirementRebalancingTax > 0) {
      const targetId = `Rebalancing Tax ${year}`;
      nodes.push({
        id: targetId,
        year: year + 0.5, // Position after Portfolio EO N
        value: flowData.retirementRebalancingTax,
        phase: yearData.phase as 'accumulation' | 'retirement',
        type: 'destination'
      });
      links.push({
        source: portfolioNodeId,
        target: targetId,
        value: flowData.retirementRebalancingTax,
        flowType: 'tax',
        year,
        phase: yearData.phase as 'accumulation' | 'retirement'
      });
    }
  });

  return {
    nodes,
    links,
    yearRange: {
      start: filteredData[0].year,
      end: filteredData[filteredData.length - 1].year
    },
    phase
  };
}

/**
 * Filter Sankey data by flow types
 * @param data Complete Sankey diagram data
 * @param activeFlowTypes Set of flow types to include
 * @returns Filtered Sankey diagram data
 */
export function filterByFlowType(
  data: SankeyDiagramData,
  activeFlowTypes: Set<SankeyFlowType>
): SankeyDiagramData {
  const filteredLinks = data.links.filter(link => 
    activeFlowTypes.has(link.flowType)
  );

  // Keep only nodes that are connected to remaining links
  const connectedNodeIds = new Set<string>();
  filteredLinks.forEach(link => {
    connectedNodeIds.add(link.source);
    connectedNodeIds.add(link.target);
  });

  const filteredNodes = data.nodes.filter(node =>
    node.type === 'portfolio' || connectedNodeIds.has(node.id)
  );

  return {
    ...data,
    nodes: filteredNodes,
    links: filteredLinks
  };
}

/**
 * Get summary statistics for Sankey data
 * @param data Sankey diagram data
 * @returns Summary statistics
 */
export function getSankeyStatistics(data: SankeyDiagramData) {
  const totalInflows = data.links
    .filter(link => ['contributions', 'growth', 'rsu'].includes(link.flowType))
    .reduce((sum, link) => sum + link.value, 0);

  const totalOutflows = data.links
    .filter(link => ['tax', 'expenses', 'withdrawals', 'rebalancingTax'].includes(link.flowType))
    .reduce((sum, link) => sum + link.value, 0);

  const flowsByType = new Map<SankeyFlowType, number>();
  data.links.forEach(link => {
    const current = flowsByType.get(link.flowType) || 0;
    flowsByType.set(link.flowType, current + link.value);
  });

  return {
    totalInflows,
    totalOutflows,
    netFlow: totalInflows - totalOutflows,
    flowsByType: Object.fromEntries(flowsByType),
    nodeCount: data.nodes.length,
    linkCount: data.links.length,
    yearRange: data.yearRange
  };
}

/**
 * Get default color scheme for Sankey flows
 * Matches PRD specifications
 */
export function getDefaultColorScheme() {
  return {
    contributions: '#10B981',      // emerald-500 - Green (inflows)
    growth: '#06B6D4',              // cyan-500 - Teal (returns)
    rsu: '#8B5CF6',                 // violet-500 - Purple (RSU)
    tax: '#F97316',                 // orange-500 - Orange (taxes)
    expenses: '#EF4444',            // red-500 - Red (expenses)
    withdrawals: '#EC4899',         // pink-500 - Pink (withdrawals)
    rebalancingTax: '#EA580C',      // orange-600 - Dark orange (rebalancing)
    portfolio: '#3B82F6'            // blue-500 - Blue (portfolio nodes)
  };
}
