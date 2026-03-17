/**
 * Calculator Service
 * Frontend calculation utilities for immediate UI feedback
 * 
 * IMPORTANT: The backend (FireCalculator.cs) is the SINGLE SOURCE OF TRUTH for all
 * FIRE calculations. This frontend module provides:
 * 
 * 1. Portfolio display calculations (market value, cost basis, exposure %)
 * 2. Immediate UI feedback before API calls complete
 * 3. Chart data preparation and formatting
 * 
 * For authoritative FIRE simulation results (retirement projections, withdrawal amounts,
 * tax calculations), always use the backend API via fire-plan-api.ts.
 * 
 * If calculation logic changes, update FireCalculator.cs first, then sync any
 * necessary display logic here. The backend handles:
 * - Accumulation and retirement phase simulation
 * - Tax calculations and profit ratio updates
 * - Expense handling with inflation adjustments
 * - Currency conversion for final results
 */

import type {
  PortfolioAsset,
  PortfolioAllocation,
  PlannedExpense,
  FirePlanInput,
  FireCalculationResult,
  YearlyData,
  PortfolioChartData,
  Currency
} from '../types/index.js';
import { getMoneySymbol } from '../types/index.js';
import { convertToUSD } from '../utils/currency.js';

// ============================================================================
// Portfolio Display Calculations (for immediate UI feedback)
// ============================================================================

/**
 * Calculate total market value of a portfolio
 * Note: Used for display purposes. Backend is source of truth for final calculations.
 */
export function calculatePortfolioValue(
  portfolio: PortfolioAsset[],
  usdIlsRate: number
): number {
  return portfolio.reduce((total, asset) => {
    return total + calculateMarketValue(asset, usdIlsRate);
  }, 0);
}

/**
 * Calculate cost basis of a single asset
 */
export function calculateCostBasis(
  asset: PortfolioAsset,
  usdIlsRate: number
): number {
  const quantity = asset.quantity || 0;
  const averageCost = asset.averageCost?.amount || 0;
  const costInUSD = convertToUSD(averageCost, asset.averageCost ? getMoneySymbol(asset.averageCost) : '$', usdIlsRate);
  return quantity * costInUSD;
}

/**
 * Calculate total cost basis of a portfolio
 */
export function calculatePortfolioCostBasis(
  portfolio: PortfolioAsset[],
  usdIlsRate: number
): number {
  return portfolio.reduce((total, asset) => {
    return total + calculateCostBasis(asset, usdIlsRate);
  }, 0);
}

/**
 * Calculate market value of a single asset
 */
export function calculateMarketValue(
  asset: PortfolioAsset,
  usdIlsRate: number
): number {
  const quantity = asset.quantity || 0;
  const currentPrice = asset.currentPrice?.amount || 0;
  const priceInUSD = convertToUSD(currentPrice, asset.currentPrice ? getMoneySymbol(asset.currentPrice) : '$', usdIlsRate);
  return quantity * priceInUSD;
}

/**
 * Calculate unrealized gain/loss for an asset
 */
export function calculateUnrealizedGainLoss(
  asset: PortfolioAsset,
  usdIlsRate: number
): number {
  const marketValue = calculateMarketValue(asset, usdIlsRate);
  const costBasis = calculateCostBasis(asset, usdIlsRate);
  return marketValue - costBasis;
}

/**
 * Calculate exposure percentage for an asset
 */
export function calculateExposure(
  asset: PortfolioAsset,
  portfolioTotalValue: number,
  usdIlsRate: number
): number {
  if (portfolioTotalValue === 0 || isNaN(portfolioTotalValue)) return 0;
  const marketValue = calculateMarketValue(asset, usdIlsRate);
  if (marketValue === 0 || isNaN(marketValue)) return 0;
  return (marketValue / portfolioTotalValue) * 100;
}

/**
 * Calculate profit ratio (unrealized gains / portfolio value)
 */
export function calculateProfitRatio(
  portfolioValue: number,
  totalContributions: number
): number {
  if (portfolioValue <= totalContributions) return 0;
  return (portfolioValue - totalContributions) / portfolioValue;
}

// ============================================================================
// Return Calculations
// ============================================================================

/**
 * Calculate weighted return for a portfolio based on asset returns
 */
export function calculateWeightedReturn(
  portfolio: PortfolioAsset[],
  usdIlsRate: number
): number {
  const totalValue = calculatePortfolioValue(portfolio, usdIlsRate);
  if (totalValue === 0) return 0;

  let weightedReturn = 0;

  portfolio.forEach(asset => {
    const quantity = asset.quantity || 0;
    const currentPrice = asset.currentPrice?.amount || 0;
    const assetValue = quantity * currentPrice;
    const assetWeight = assetValue / totalValue;

    let annualReturn = 0;

    switch (asset.method) {
      case 'CAGR':
        annualReturn = asset.value1 || 0;
        break;
      case 'מחיר יעד': {
        const targetPrice = asset.value2 || currentPrice;
        const years = 10; // Assume 10 years for target price calculation
        annualReturn = (Math.pow(targetPrice / currentPrice, 1 / years) - 1) * 100;
        break;
      }
      default:
        annualReturn = asset.value1 || 0;
    }

    weightedReturn += assetWeight * annualReturn;
  });

  return weightedReturn;
}

/**
 * Calculate weighted return for allocation-based portfolio
 */
export function calculateAllocationWeightedReturn(
  allocations: PortfolioAllocation[]
): number {
  if (!allocations || allocations.length === 0) return 0;

  const totalPercentage = allocations.reduce((sum, alloc) => sum + alloc.targetPercentage, 0);
  if (totalPercentage === 0) return 0;

  const weightedReturn = allocations.reduce((sum, alloc) => {
    const normalizedWeight = alloc.targetPercentage / totalPercentage;
    return sum + normalizedWeight * alloc.expectedAnnualReturn;
  }, 0);

  return weightedReturn;
}

// ============================================================================
// Pre-Retirement Portfolio Calculation
// ============================================================================

/**
 * Calculate how accumulation portfolio grows to pre-retirement
 */
export function calculatePreRetirementPortfolio(
  accumulationPortfolio: PortfolioAsset[],
  yearsOfGrowth: number,
  usdIlsRate: number
): PortfolioChartData[] {
  const preRetirementPortfolio: PortfolioChartData[] = [];
  let totalGrowthValue = 0;

  accumulationPortfolio.forEach(asset => {
    const quantity = asset.quantity || 0;
    const currentPrice = asset.currentPrice?.amount || 0;

    if (quantity === 0 || currentPrice === 0) return;

    let annualReturn = 0;

    switch (asset.method) {
      case 'CAGR':
        annualReturn = asset.value1 || 0;
        break;
      case 'מחיר יעד': {
        const targetPrice = asset.value2 || currentPrice;
        const years = 10;
        annualReturn = (Math.pow(targetPrice / currentPrice, 1 / years) - 1) * 100;
        break;
      }
      default:
        annualReturn = asset.value1 || 0;
    }

    // Calculate the final value of this asset after growth
    const initialValue = quantity * convertToUSD(currentPrice, asset.currentPrice ? getMoneySymbol(asset.currentPrice) : '$', usdIlsRate);
    const finalValue = initialValue * Math.pow(1 + annualReturn / 100, yearsOfGrowth);

    preRetirementPortfolio.push({
      symbol: asset.symbol,
      value: finalValue,
      percentage: 0 // Will be calculated below
    });

    totalGrowthValue += finalValue;
  });

  // Calculate actual percentages based on grown values
  preRetirementPortfolio.forEach(asset => {
    asset.percentage = totalGrowthValue > 0 ? (asset.value / totalGrowthValue) * 100 : 0;
  });

  return preRetirementPortfolio;
}

// ============================================================================
// Main FIRE Calculation (Fallback/Preview Only)
// ============================================================================

/**
 * Main FIRE plan calculation - FRONTEND FALLBACK ONLY
 * 
 * IMPORTANT: This function exists for offline/preview scenarios only.
 * For production use, ALWAYS call the backend API via fire-plan-api.ts.
 * The backend FireCalculator.cs is the authoritative source of truth.
 * 
 * Any discrepancies between this function and the backend should be
 * reported and the backend takes precedence.
 */
export function calculateFirePlan(input: FirePlanInput): FireCalculationResult {
  const {
    birthYear,
    earlyRetirementYear,
    monthlyContribution,
    adjustContributionsForInflation = false,
    withdrawalRate,
    inflationRate,
    capitalGainsTax,
    usdIlsRate,
    accumulationPortfolio,
    retirementAllocation,
    expenses
  } = input;

  // Get useRetirementPortfolio flag (default to false for backward compatibility)
  const useRetirementPortfolio = input.useRetirementPortfolio ?? false;

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const accumulationYears = Math.max(0, earlyRetirementYear - currentYear);
  const retirementYears = (birthYear + 100) - earlyRetirementYear; // Extended to age 100

  // Calculate current portfolio value from holdings
  const currentValue = calculatePortfolioValue(accumulationPortfolio, usdIlsRate);
  const currentCostBasis = calculatePortfolioCostBasis(accumulationPortfolio, usdIlsRate);

  // Convert monthly contribution to USD for internal calculations
  const monthlyContributionUSD = convertToUSD(monthlyContribution.amount, getMoneySymbol(monthlyContribution), usdIlsRate);

  // Simulate accumulation phase
  let portfolioValue = currentValue;
  let totalContributions = currentCostBasis; // Use cost basis for tax calculations
  const yearlyData: YearlyData[] = [];

  // Calculate weighted average return for accumulation
  const accumulationReturn = calculateWeightedReturn(accumulationPortfolio, usdIlsRate) / 100;
  const monthlyReturn = Math.pow(1 + accumulationReturn, 1 / 12) - 1;

  // Convert rates from percentages
  const withdrawalRateDecimal = withdrawalRate / 100;
  const inflationRateDecimal = inflationRate / 100;
  const capitalGainsTaxDecimal = capitalGainsTax / 100;

  // Accumulation simulation
  for (let year = 0; year < accumulationYears; year++) {
    const currentCalendarYear = currentYear + year;
    const monthsToSimulate = year === 0 ? 12 - currentDate.getMonth() : 12;
    const monthlyContributionForYearUSD = adjustContributionsForInflation && year > 0
      ? monthlyContributionUSD * Math.pow(1 + inflationRateDecimal, year)
      : monthlyContributionUSD;

    // Monthly simulation
    for (let month = 0; month < monthsToSimulate; month++) {
      portfolioValue *= (1 + monthlyReturn);
      portfolioValue += monthlyContributionForYearUSD;
      totalContributions += monthlyContributionForYearUSD;
    }

    // Check for planned expenses
    const yearExpenses = expenses.filter(exp => exp.year === currentCalendarYear);
    yearExpenses.forEach(expense => {
      const profitRatio = calculateProfitRatio(portfolioValue, totalContributions);
      const netAmountInUSD = convertToUSD(expense.netAmount.amount, getMoneySymbol(expense.netAmount), usdIlsRate);

      // Apply inflation to expense based on years from base year (current year)
      const yearsFromBase = currentCalendarYear - currentYear;
      const inflatedNetAmount = netAmountInUSD * Math.pow(1 + inflationRateDecimal, yearsFromBase);

      const grossAmount = inflatedNetAmount / (1 - (profitRatio * capitalGainsTaxDecimal));
      portfolioValue -= grossAmount;
    });

    yearlyData.push({
      year: currentCalendarYear,
      age: currentCalendarYear - birthYear,
      portfolioValue: portfolioValue,
      totalContributions: totalContributions,
      phase: 'accumulation'
    });
  }

  let peakValue = portfolioValue;
  const grossPeakValue = portfolioValue; // Store pre-tax peak value
  let profitRatio = calculateProfitRatio(peakValue, totalContributions);
  
  // Store original total contributions for display (before any resets)
  const originalTotalContributions = totalContributions;

  // Calculate pre-retirement portfolio composition
  const preRetirementPortfolio = calculatePreRetirementPortfolio(
    accumulationPortfolio,
    accumulationYears,
    usdIlsRate
  );

  // Retirement phase - determine which return rate to use
  let retirementReturn: number;
  let retirementMonthlyReturn: number;
  let retirementTaxToPay = 0; // Tax paid when switching to retirement portfolio
  let retirementCostBasis = totalContributions; // Cost basis for retirement phase tax calculations
  
  if (useRetirementPortfolio && retirementAllocation.length > 0) {
    // When switching to retirement portfolio, "sell" accumulation and pay taxes on gains
    const taxOnGains = (peakValue - totalContributions) * capitalGainsTaxDecimal;
    retirementTaxToPay = Math.max(0, taxOnGains);
    const afterTaxValue = peakValue - retirementTaxToPay;
    
    // Update portfolio value after paying taxes (this is what we have to "buy" retirement portfolio)
    portfolioValue = afterTaxValue;
    peakValue = afterTaxValue; // Update peak to reflect after-tax value
    
    // Reset cost basis for retirement phase (we "bought" the new portfolio at this value)
    retirementCostBasis = afterTaxValue;
    profitRatio = 0; // Fresh start with no unrealized gains
    
    // Use retirement allocation returns
    retirementReturn = calculateAllocationWeightedReturn(retirementAllocation);
  } else {
    // Continue using accumulation portfolio returns (no tax event)
    retirementReturn = accumulationReturn * 100; // Convert back to percentage for consistency
  }
  
  retirementMonthlyReturn = Math.pow(1 + retirementReturn / 100, 1 / 12) - 1;

  // Calculate initial withdrawal amount (FIRST YEAR of retirement)
  const initialGrossAnnualWithdrawal = peakValue * withdrawalRateDecimal;
  const initialAnnualWithdrawal = initialGrossAnnualWithdrawal * (1 - (profitRatio * capitalGainsTaxDecimal));

  // Working variables for simulation
  let grossAnnualWithdrawal = initialGrossAnnualWithdrawal;
  let annualWithdrawal = initialAnnualWithdrawal;

  // Retirement simulation
  for (let year = 0; year < retirementYears; year++) {
    const currentCalendarYear = earlyRetirementYear + year;

    if (year > 0) {
      // Adjust for inflation
      annualWithdrawal *= (1 + inflationRateDecimal);
      grossAnnualWithdrawal = annualWithdrawal / (1 - (profitRatio * capitalGainsTaxDecimal));
    }

    // Monthly simulation
    for (let month = 0; month < 12; month++) {
      portfolioValue *= (1 + retirementMonthlyReturn);
      portfolioValue -= grossAnnualWithdrawal / 12;
    }

    // Check for planned expenses
    const yearExpenses = expenses.filter(exp => exp.year === currentCalendarYear);
    yearExpenses.forEach(expense => {
      const netAmountInUSD = convertToUSD(expense.netAmount.amount, getMoneySymbol(expense.netAmount), usdIlsRate);

      // Apply inflation to expense based on years from base year (current year)
      const yearsFromBase = currentCalendarYear - currentYear;
      const inflatedNetAmount = netAmountInUSD * Math.pow(1 + inflationRateDecimal, yearsFromBase);

      const grossAmount = inflatedNetAmount / (1 - (profitRatio * capitalGainsTaxDecimal));
      portfolioValue -= grossAmount;
    });

    yearlyData.push({
      year: currentCalendarYear,
      age: currentCalendarYear - birthYear,
      portfolioValue: Math.max(0, portfolioValue),
      annualWithdrawal: grossAnnualWithdrawal,
      phase: 'retirement'
    });
  }

  // Create final retirement portfolio data
  // If using retirement portfolio, show allocation-based breakdown
  // Otherwise, show accumulated portfolio assets (same as pre-retirement)
  let finalRetirementPortfolio: PortfolioChartData[];
  
  if (useRetirementPortfolio && retirementAllocation.length > 0) {
    finalRetirementPortfolio = retirementAllocation.map(allocation => ({
      symbol: allocation.assetType,
      percentage: allocation.targetPercentage,
      value: (portfolioValue * allocation.targetPercentage / 100)
    }));
  } else {
    // Use accumulated portfolio structure for end state
    const totalEndValue = portfolioValue;
    finalRetirementPortfolio = preRetirementPortfolio.map(asset => ({
      symbol: asset.symbol,
      percentage: asset.percentage,
      value: (totalEndValue * asset.percentage / 100)
    }));
  }

  // Calculate total monthly contributions (excluding initial cost basis)
  const totalMonthlyContributions = originalTotalContributions - currentCostBasis;

  return {
    totalContributions: originalTotalContributions,
    totalAccumulationContributions: totalMonthlyContributions,
    totalMonthlyContributions,
    peakValue,
    grossPeakValue,
    retirementTaxToPay,
    endValue: Math.max(0, portfolioValue),
    grossAnnualWithdrawal: initialGrossAnnualWithdrawal,
    netAnnualWithdrawal: initialAnnualWithdrawal,
    grossMonthlyExpense: initialGrossAnnualWithdrawal / 12,
    netMonthlyExpense: initialAnnualWithdrawal / 12,
    yearlyData,
    accumulationPortfolio,
    preRetirementPortfolio,
    retirementPortfolio: finalRetirementPortfolio,
    currentValue,
    currentCostBasis
  };
}

/**
 * Calculate total expense with repetitions
 */
export function calculateTotalExpenseWithRepetitions(expense: PlannedExpense): number {
  return expense.netAmount.amount * expense.repetitionCount;
}

/**
 * Calculate inflated amount
 */
export function calculateInflatedAmount(
  baseAmount: number,
  yearsFromBase: number,
  inflationRate: number
): number {
  return baseAmount * Math.pow(1 + inflationRate / 100, yearsFromBase);
}
