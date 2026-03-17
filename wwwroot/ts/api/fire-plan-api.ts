/**
 * Fire Plan API
 * API client for backend FIRE calculations
 *
 * This module handles all communication with the backend for FIRE plan calculations.
 * All projection calculations are done server-side to ensure consistency.
 */

import type { FirePlanInput, FireCalculationResult, YearlyData, PortfolioChartData } from '../types/index.js';
import { getMoneySymbol } from '../types/index.js';
import { Money } from '../types/money.js';

const API_BASE = '/api/fireplan';

/**
 * Convert currency symbol to ISO code for backend API
 * Backend expects "USD" or "ILS", not "$" or "₪"
 */
function getCurrencyCode(symbol: '$' | '₪'): 'USD' | 'ILS' {
  return symbol === '$' ? 'USD' : 'ILS';
}

/**
 * Get ISO currency code from Money object
 * Money objects already store currency as ISO codes ('USD' or 'ILS')
 */
function getMoneyCurrencyCode(money: Money): 'USD' | 'ILS' {
  // Money.currency is already an ISO code ('USD' or 'ILS')
  return money.currency as 'USD' | 'ILS';
}

/**
 * API error class for better error handling
 */
export class FirePlanApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'FirePlanApiError';
  }
}

/**
 * Helper to extract Money value and currency from various formats
 */
function extractMoneyValue(value: any, legacyCurrencyField?: string): { amount: number; currency: 'USD' | 'ILS' } {
  if (value && typeof value === 'object' && 'amount' in value) {
    // Money object format
    return {
      amount: Number(value.amount) || 0,
      currency: value.currency === 'ILS' || value.currency === '₪' ? 'ILS' : 'USD'
    };
  } else if (typeof value === 'number') {
    // Legacy number format
    return {
      amount: value,
      currency: legacyCurrencyField === '₪' || legacyCurrencyField === 'ILS' ? 'ILS' : 'USD'
    };
  }
  return { amount: 0, currency: 'USD' };
}

/**
 * Convert frontend FirePlanInput to backend format
 * Handles property name conversions (camelCase in frontend, PascalCase in backend)
 * Extracts values from Money types for backend compatibility
 * Handles both new Money object format and legacy number formats
 */
function toBackendInput(input: FirePlanInput): Record<string, unknown> {
  // Handle monthlyContribution (could be Money object or number)
  const monthlyContribution = extractMoneyValue(
    input.monthlyContribution,
    (input as any).monthlyContributionCurrency || (input as any).currency
  );

  // Handle pensionNetMonthly (could be Money object or number)
  const pensionNetMonthly = extractMoneyValue(
    input.pensionNetMonthly,
    (input as any).pensionCurrency
  );

  return {
    birthDate: input.birthDate || `${input.birthYear}-01-01`, // Convert birthYear to ISO date if birthDate not set
    birthYear: input.birthYear,
    earlyRetirementYear: input.earlyRetirementYear,
    fullRetirementAge: input.fullRetirementAge,
    monthlyContribution,
    adjustContributionsForInflation: !!input.adjustContributionsForInflation,
    usdIlsRate: input.usdIlsRate,
    withdrawalRate: input.withdrawalRate,
    inflationRate: input.inflationRate,
    capitalGainsTax: input.capitalGainsTax,
    pensionNetMonthly,
    expenses: input.expenses.map(e => {
      const netAmount = extractMoneyValue(e.netAmount, (e as any).currency);
      return {
        id: Number(e.id) || 0,
        type: String(e.type || ''),
        netAmount,
        year: Number(e.year) || new Date().getFullYear(),
        frequencyYears: Number(e.frequencyYears) || 1,
        repetitionCount: Number(e.repetitionCount) || 1
      };
    }),
    accumulationPortfolio: input.accumulationPortfolio.map(a => {
      const currentPrice = extractMoneyValue(
        a.currentPrice,
        (a as any).currentPriceCurrency || (a as any).currency
      );
      const averageCost = extractMoneyValue(
        a.averageCost || (a as any).averageCostPerShare,
        (a as any).averageCostCurrency || (a as any).currency
      );

      return {
        id: Number(a.id) || 0,
        symbol: String(a.symbol || ''),
        quantity: Number(a.quantity) || 0,
        currentPrice,
        averageCost,
        method: String(a.method || 'CAGR'),
        value1: Number(a.value1) || 0,
        value2: Number(a.value2) || 0
      };
    }),
    retirementPortfolio: [], // Backend uses allocation-based approach
    accumulationAllocation: [], // Using portfolio-based calculation
    retirementAllocation: input.retirementAllocation.map(a => ({
      id: Number(a.id) || 0,
      assetType: String(a.assetType || ''),
      targetPercentage: Number(a.targetPercentage) || 0,
      expectedAnnualReturn: Number(a.expectedAnnualReturn) || 0,
      description: String(a.description || '')
    })),
    useRetirementPortfolio: !!input.useRetirementPortfolio,
    currency: (input as any).currency || '$',
    includeRsuInCalculations: !!input.includeRsuInCalculations,
    rsuConfiguration: input.rsuConfiguration ? {
      stockSymbol: String(input.rsuConfiguration.stockSymbol || ''),
      // CurrentPricePerShare is a Money type on the backend
      // Handle both plain number (raw state) and Money object (pre-transformed by gatherInputData)
      currentPricePerShare: {
        amount: (typeof input.rsuConfiguration.currentPricePerShare === 'object' && input.rsuConfiguration.currentPricePerShare !== null
          ? (input.rsuConfiguration.currentPricePerShare as any).amount
          : Number(input.rsuConfiguration.currentPricePerShare)) || 0,
        currency: input.rsuConfiguration.currency === '₪' || input.rsuConfiguration.currency === 'ILS' ? 'ILS' : 'USD'
      },
      priceIsFromApi: !!input.rsuConfiguration.priceIsFromApi,
      currency: String(input.rsuConfiguration.currency || '$'),
      expectedAnnualReturn: Number(input.rsuConfiguration.expectedAnnualReturn) || 0,
      returnMethod: String(input.rsuConfiguration.returnMethod || 'CAGR'),
      defaultVestingPeriodYears: Number(input.rsuConfiguration.defaultVestingPeriodYears) || 4,
      liquidationStrategy: String(input.rsuConfiguration.liquidationStrategy || 'SellAfter2Years'),
      marginalTaxRate: Number(input.rsuConfiguration.marginalTaxRate) || 0,
      subjectTo3PercentSurtax: !!input.rsuConfiguration.subjectTo3PercentSurtax,
      grants: (input.rsuConfiguration.grants || []).map(g => ({
        id: Number(g.id) || 0,
        grantDate: String(g.grantDate || ''),
        numberOfShares: Number(g.numberOfShares) || 0,
        // PriceAtGrant is a Money type on the backend
        // Handle both plain number (raw state) and Money object (pre-transformed by gatherInputData)
        priceAtGrant: {
          amount: (typeof g.priceAtGrant === 'object' && g.priceAtGrant !== null
            ? (g.priceAtGrant as any).amount
            : Number(g.priceAtGrant)) || 0,
          currency: g.currency === '₪' || g.currency === 'ILS' ? 'ILS' : 'USD'
        },
        currency: String(g.currency || '$'),
        vestingPeriodYears: Number(g.vestingPeriodYears) || 4,
        vestingType: String(g.vestingType || 'Standard'),
        sharesSold: Number(g.sharesSold) || 0
      }))
    } : undefined
  };
}

/**
 * Convert backend result to frontend format
 * Handles additional frontend-specific fields
 */
function toFrontendResult(
  backendResult: Record<string, unknown>, 
  input: FirePlanInput
): FireCalculationResult {
  const yearlyData = (backendResult.yearlyData as Record<string, unknown>[])?.map(y => ({
    year: y.year as number,
    age: (y.year as number) - input.birthYear,
    portfolioValue: y.portfolioValue as number,
    totalContributions: y.totalContributions as number | undefined,
    annualWithdrawal: y.annualWithdrawal as number | undefined,
    phase: y.phase as 'accumulation' | 'retirement',
    flowData: y.flowData as any
  })) || [];

  // Calculate pre-retirement portfolio from accumulation portfolio
  const accumulationYears = Math.max(0, input.earlyRetirementYear - new Date().getFullYear());
  const preRetirementPortfolio = calculatePreRetirementPortfolioLocal(
    input.accumulationPortfolio,
    accumulationYears,
    input.usdIlsRate
  );

  const endValue = backendResult.endValue as number || 0;
  const formulaMetadata = backendResult.formulaMetadata as FireCalculationResult['formulaMetadata'] | undefined;
  const currentValue = backendResult.currentValue as number
    ?? calculatePortfolioValueLocal(input.accumulationPortfolio, input.usdIlsRate);
  const currentCostBasis = backendResult.currentCostBasis as number
    ?? calculatePortfolioCostBasisLocal(input.accumulationPortfolio, input.usdIlsRate);
  const totalContributions = backendResult.totalContributions as number || 0;
  const totalAccumulationContributions = backendResult.totalAccumulationContributions as number
    ?? backendResult.totalMonthlyContributions as number
    ?? Math.max(0, totalContributions - currentCostBasis);
  const peakValue = backendResult.peakValue as number || 0;
  const backendGrossPeakValue = backendResult.grossPeakValue as number | undefined;
  const backendRetirementTaxToPay = backendResult.retirementTaxToPay as number | undefined;
  const capitalGainsTaxRate = input.capitalGainsTax / 100;
  let grossPeakValue = backendGrossPeakValue ?? peakValue;
  let retirementTaxToPay = backendRetirementTaxToPay ?? 0;

  if (backendGrossPeakValue == null && backendRetirementTaxToPay == null && input.useRetirementPortfolio && input.retirementAllocation.length > 0) {
    const gains = Math.max(0, peakValue - totalContributions);
    retirementTaxToPay = gains * capitalGainsTaxRate;
    grossPeakValue = peakValue + retirementTaxToPay;
  }

  const netAnnualWithdrawal = backendResult.netAnnualWithdrawal as number
    ?? ((backendResult.netMonthlyExpense as number || 0) * 12);
  const grossMonthlyExpense = backendResult.grossMonthlyExpense as number
    ?? ((backendResult.grossAnnualWithdrawal as number || 0) / 12);

  // Determine retirement portfolio structure
  let retirementPortfolio: PortfolioChartData[];
  
  if (input.useRetirementPortfolio && input.retirementAllocation.length > 0) {
    // Use allocation-based retirement portfolio
    retirementPortfolio = input.retirementAllocation.map(allocation => ({
      symbol: allocation.assetType,
      percentage: allocation.targetPercentage,
      value: endValue * allocation.targetPercentage / 100
    }));
  } else {
    // Use accumulated portfolio structure for end state
    retirementPortfolio = preRetirementPortfolio.map(asset => ({
      symbol: asset.symbol,
      percentage: asset.percentage,
      value: endValue * asset.percentage / 100
    }));
  }

  return {
    totalContributions,
    totalAccumulationContributions,
    totalMonthlyContributions: totalAccumulationContributions,
    peakValue,
    grossPeakValue,
    retirementTaxToPay,
    endValue,
    grossAnnualWithdrawal: backendResult.grossAnnualWithdrawal as number || 0,
    netAnnualWithdrawal,
    grossMonthlyExpense,
    netMonthlyExpense: backendResult.netMonthlyExpense as number || 0,
    yearlyData,
    accumulationPortfolio: input.accumulationPortfolio,
    preRetirementPortfolio,
    retirementPortfolio,
    currentValue,
    currentCostBasis,
    // RSU result fields from backend
    totalRsuValueAtRetirement: backendResult.totalRsuValueAtRetirement as number | undefined,
    totalRsuNetProceeds: backendResult.totalRsuNetProceeds as number | undefined,
    totalRsuTaxesPaid: backendResult.totalRsuTaxesPaid as number | undefined,
    formulaMetadata
  };
}

/**
 * Local helper: Calculate portfolio value (for UI purposes)
 */
function calculatePortfolioValueLocal(
  portfolio: { quantity: number; currentPrice: Money }[],
  usdIlsRate: number
): number {
  return portfolio.reduce((total, asset) => {
    const priceInUSD = asset.currentPrice.currency === 'ILS'
      ? asset.currentPrice.amount / usdIlsRate
      : asset.currentPrice.amount;
    return total + asset.quantity * priceInUSD;
  }, 0);
}

/**
 * Local helper: Calculate portfolio cost basis (for UI purposes)
 */
function calculatePortfolioCostBasisLocal(
  portfolio: { quantity: number; averageCost: Money }[],
  usdIlsRate: number
): number {
  return portfolio.reduce((total, asset) => {
    const costInUSD = asset.averageCost.currency === 'ILS'
      ? asset.averageCost.amount / usdIlsRate
      : asset.averageCost.amount;
    return total + asset.quantity * costInUSD;
  }, 0);
}

/**
 * Local helper: Calculate pre-retirement portfolio composition (for charts)
 */
function calculatePreRetirementPortfolioLocal(
  accumulationPortfolio: { symbol: string; quantity: number; currentPrice: Money; method: string; value1: number; value2: number }[],
  yearsOfGrowth: number,
  usdIlsRate: number
): PortfolioChartData[] {
  const preRetirementPortfolio: PortfolioChartData[] = [];
  let totalGrowthValue = 0;

  accumulationPortfolio.forEach(asset => {
    const quantity = asset.quantity || 0;
    const currentPriceAmount = asset.currentPrice.amount || 0;

    if (quantity === 0 || currentPriceAmount === 0) return;

    let annualReturn = 0;

    switch (asset.method) {
      case 'CAGR':
        annualReturn = asset.value1 || 0;
        break;
      case 'מחיר יעד': {
        const targetPrice = asset.value2 || currentPriceAmount;
        const years = Math.max(1, yearsOfGrowth); // Use actual years to retirement
        annualReturn = (Math.pow(targetPrice / currentPriceAmount, 1 / years) - 1) * 100;
        break;
      }
      default:
        annualReturn = asset.value1 || 0;
    }

    const priceInUSD = asset.currentPrice.currency === 'ILS'
      ? currentPriceAmount / usdIlsRate
      : currentPriceAmount;
    const initialValue = quantity * priceInUSD;
    const finalValue = initialValue * Math.pow(1 + annualReturn / 100, yearsOfGrowth);

    preRetirementPortfolio.push({
      symbol: asset.symbol,
      value: finalValue,
      percentage: 0
    });

    totalGrowthValue += finalValue;
  });

  // Calculate actual percentages based on grown values
  preRetirementPortfolio.forEach(asset => {
    asset.percentage = totalGrowthValue > 0 ? (asset.value / totalGrowthValue) * 100 : 0;
  });

  return preRetirementPortfolio;
}

/**
 * Calculate FIRE plan using backend API
 * This is the main function to use for all FIRE calculations
 */
export async function calculateFirePlanAPI(input: FirePlanInput): Promise<FireCalculationResult> {
  try {
    const backendInput = toBackendInput(input);
    
    const response = await fetch(`${API_BASE}/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendInput),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new FirePlanApiError(
        errorData.error || `API error: ${response.status}`,
        response.status
      );
    }

    const backendResult = await response.json();
    
    return toFrontendResult(backendResult, input);
  } catch (error) {
    if (error instanceof FirePlanApiError) {
      throw error;
    }
    throw new FirePlanApiError(
      error instanceof Error ? error.message : 'Network error',
      0,
      error
    );
  }
}

/**
 * Check if backend API is available
 */
export async function isApiAvailable(): Promise<boolean> {
  try {
    // Try a simple calculation to test API availability
    const testInput: FirePlanInput = {
      birthDate: '1990-01-01',
      birthYear: 1990,
      earlyRetirementYear: 2050,
      fullRetirementAge: 67,
      monthlyContribution: Money.usd(0),
      withdrawalRate: 4,
      inflationRate: 2,
      capitalGainsTax: 25,
      pensionNetMonthly: Money.usd(0),
      usdIlsRate: 3.6,
      accumulationPortfolio: [],
      retirementAllocation: [],
      expenses: [],
      useRetirementPortfolio: false
    };

    await calculateFirePlanAPI(testInput);
    return true;
  } catch {
    return false;
  }
}
