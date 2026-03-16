/**
 * FIRE Planning Tool - Type Definitions
 * Central type definitions for the entire application
 */

import type { RsuConfiguration } from './rsu-types.js';
import type { Money } from './money.js';

// ============================================================================
// Currency Types
// ============================================================================

// Re-export Money types for convenience (Money itself is re-exported below as both type and value)
export type { CurrencyCode, CurrencySymbol, ICurrencyConverter } from './money.js';

// Currency type supports both symbols ('$', '₪') and ISO codes ('USD', 'ILS')
// This maintains backward compatibility while enabling Money type integration
export type Currency = '$' | '₪' | 'USD' | 'ILS';

export interface ExchangeRates {
  '$': number;
  '₪': number;
}

// ============================================================================
// Portfolio Types
// ============================================================================

export type CalculationMethod = 'CAGR' | 'מחיר יעד' | 'צמיחה כוללת' | 'ידני';
export type PriceSource = 'api' | 'manual';
export type CAGRSource = 'manual' | string; // 'manual' or year number as string ('1', '3', '5', etc.)

export interface HistoricalCAGRs {
  [years: number]: number;
}

export interface PortfolioAsset {
  id: number;
  symbol: string;
  name?: string;
  assetName?: string; // Full asset name from API
  quantity: number;

  // Money type fields (type-safe)
  currentPrice: Money;
  averageCost: Money;

  method: CalculationMethod;
  value1: number; // CAGR percentage or years
  value2: number; // Target price or 0
  marketCapUsd?: number | null; // Company market cap in USD (from API)
  priceSource: PriceSource;
  historicalCAGRs: HistoricalCAGRs;
  cagrSource: CAGRSource;
  loadingCAGR: boolean;
}

export interface PortfolioAllocation {
  id: number;
  assetType: string;
  targetPercentage: number;
  expectedAnnualReturn: number;
  description?: string;
}

// ============================================================================
// Expense Types
// ============================================================================

export interface PlannedExpense {
  id: number;
  type: string;

  // Money type field (type-safe)
  netAmount: Money;

  year: number;
  frequencyYears: number;
  repetitionCount: number;
}

// ============================================================================
// Calculation Types
// ============================================================================

export interface FirePlanInput {
  /**
   * Birth date in ISO format (yyyy-MM-dd).
   * Used for precise pension start timing.
   */
  birthDate: string;
  /**
   * Birth year (derived from birthDate).
   * @deprecated Use birthDate instead.
   */
  birthYear: number;
  earlyRetirementYear: number;
  fullRetirementAge: number;

  // Money type field (type-safe)
  monthlyContribution: Money;
  adjustContributionsForInflation?: boolean;

  withdrawalRate: number;
  inflationRate: number;
  capitalGainsTax: number;

  /**
   * Net monthly pension amount (fixed nominal, not inflation-indexed).
   */
  pensionNetMonthly: Money;

  /**
   * Target net monthly expense in retirement (after tax, inflation-adjusted)
   */
  targetMonthlyExpense?: Money;

  usdIlsRate: number;
  accumulationPortfolio: PortfolioAsset[];
  retirementAllocation: PortfolioAllocation[];
  expenses: PlannedExpense[];
  useRetirementPortfolio: boolean; // When false, use accumulation portfolio returns during retirement
  /**
   * RSU configuration including grants (optional, for save/load)
   */
  rsuConfiguration?: RsuConfiguration;
  /**
   * Whether RSU should be included in FIRE calculations
   */
  includeRsuInCalculations?: boolean;
  /**
   * Display currency for results ("$" for USD, "₪" for ILS).
   * Passed to the backend so export and calculations reflect the correct currency.
   */
  currency?: string;
}

export interface YearlyData {
  year: number;
  age: number;
  portfolioValue: number;
  totalContributions?: number;
  annualWithdrawal?: number;
  phase: 'accumulation' | 'retirement';
  rsuSharesSold?: number;
  rsuHoldingsValue?: number;
  // Sankey flow data (from backend)
  flowData?: SankeyFlowData;
}

// ============================================================================
// Sankey Flow Types
// ============================================================================

/**
 * Detailed money flow breakdown for a single year (from backend)
 */
export interface SankeyFlowData {
  // Inflows
  monthlyContributions: number;  // Annual total of monthly contributions
  portfolioGrowth: number;        // Investment returns for the year
  rsuNetProceeds: number;         // RSU vesting proceeds (after tax)
  
  // Outflows
  capitalGainsTax: number;        // Tax on withdrawals and expenses
  plannedExpenses: number;        // Large one-time expenses
  retirementWithdrawals: number;  // Net retirement withdrawals
  retirementRebalancingTax: number; // One-time tax at retirement transition
  
  // Income
  pensionIncome: number;          // Annual pension income (0 during accumulation / before pension starts)
  
  // Metadata
  phase: string;                  // "accumulation" or "retirement"
  isRetirementYear: boolean;      // True for first retirement year
}

/**
 * Node in the Sankey diagram (represents a financial state)
 */
export interface SankeyNode {
  id: string;                     // Unique identifier (e.g., "Portfolio 2025")
  year: number;                   // Calendar year
  value: number;                  // Portfolio value
  phase: 'accumulation' | 'retirement';
  type: 'portfolio' | 'source' | 'destination';  // Node category
}

/**
 * Link/Flow in the Sankey diagram (represents money movement)
 */
export interface SankeyLink {
  source: string;                 // Source node ID
  target: string;                 // Target node ID
  value: number;                  // Flow amount (always positive)
  flowType: SankeyFlowType;      // Type of money flow
  year: number;                   // Year this flow occurs
  phase: 'accumulation' | 'retirement';
}

/**
 * Types of money flows in the Sankey diagram
 */
export type SankeyFlowType = 
  | 'contributions'               // Monthly savings contributions
  | 'growth'                      // Portfolio investment returns
  | 'rsu'                         // RSU vesting proceeds
  | 'tax'                         // Capital gains tax
  | 'expenses'                    // Planned large expenses
  | 'withdrawals'                 // Retirement living expenses
  | 'rebalancingTax';            // One-time retirement rebalancing tax

/**
 * Complete Sankey diagram data structure
 */
export interface SankeyDiagramData {
  nodes: SankeyNode[];
  links: SankeyLink[];
  yearRange: {
    start: number;
    end: number;
  };
  phase: 'accumulation' | 'retirement' | 'full';
}

/**
 * Configuration for Sankey chart rendering
 */
export interface SankeyChartConfig {
  width: number;
  height: number;
  nodeWidth: number;              // Width of nodes in pixels
  nodePadding: number;            // Vertical spacing between nodes
  enableTooltips: boolean;
  enableFilters: boolean;
  activeFilters: Set<SankeyFlowType>;  // Which flow types to show
  colorScheme: SankeyColorScheme;
}

/**
 * Color scheme for Sankey flows
 */
export interface SankeyColorScheme {
  contributions: string;           // Green - money coming in
  growth: string;                  // Teal - investment returns
  rsu: string;                     // Purple - RSU proceeds
  tax: string;                     // Orange - taxes paid
  expenses: string;                // Red - large expenses
  withdrawals: string;             // Pink - retirement withdrawals
  rebalancingTax: string;         // Dark orange - rebalancing tax
  portfolio: string;               // Blue - portfolio nodes
}

/**
 * Export options for Sankey diagram
 */
export interface SankeyExportOptions {
  format: 'png' | 'svg' | 'csv';
  filename?: string;
  resolution?: number;             // For PNG: 1 = normal, 2 = 2x, etc.
  includeMetadata?: boolean;       // For CSV: include flow metadata
}

export interface PortfolioChartData {
  symbol: string;
  percentage: number;
  value: number;
}

export interface TotalContributionsFormulaMetadata {
  currentCostBasis: number;
  accumulationContributions: number;
  computedTotalContributions: number;
  usesManualTaxBasis: boolean;
  manualTaxBasis: number | null;
}

export interface AnnualWithdrawalFormulaMetadata {
  peakValueForWithdrawal: number;
  withdrawalRate: number;
  effectiveTaxRate: number;
}

export interface PeakValueFormulaMetadata {
  usesRetirementPortfolio: boolean;
  displayedValueIsGross: boolean;
  taxAdjustedPeakValue: number;
  retirementTaxToPay: number;
}

export interface ResultsFormulaMetadata {
  totalContributions: TotalContributionsFormulaMetadata;
  annualWithdrawal: AnnualWithdrawalFormulaMetadata;
  peakValue: PeakValueFormulaMetadata;
}

export interface FireCalculationResult {
  totalContributions: number;
  totalMonthlyContributions: number;
  peakValue: number;
  grossPeakValue: number; // Pre-tax peak value (before retirement portfolio tax)
  retirementTaxToPay: number; // Tax paid when switching to retirement portfolio
  endValue: number;
  grossAnnualWithdrawal: number;
  netAnnualWithdrawal: number;
  grossMonthlyExpense: number;
  netMonthlyExpense: number;
  yearlyData: YearlyData[];
  accumulationPortfolio: PortfolioAsset[];
  preRetirementPortfolio: PortfolioChartData[];
  retirementPortfolio: PortfolioChartData[];
  currentValue: number;
  currentCostBasis: number;
  // Weighted returns for accumulation and retirement phases
  accumulationWeightedReturn?: number;
  retirementWeightedReturn?: number;
  // Allocation strategies
  accumulationAllocation?: PortfolioAllocation[];
  retirementAllocation?: PortfolioAllocation[];
  // RSU timeline data (from backend or calculated client-side)
  rsuTimeline?: import('./rsu-types.js').RsuYearlyData[];
  totalRsuValueAtRetirement?: number;
  totalRsuNetProceeds?: number;
  totalRsuTaxesPaid?: number;
  rsuSummary?: import('./rsu-types.js').RsuSummary | null;
  // FIRE age reached (earlyRetirementYear - birthYear)
  fireAgeReached?: number;
  formulaMetadata?: ResultsFormulaMetadata;
}

// ============================================================================
// Chart Types
// ============================================================================

/**
 * Options for the main growth chart
 * Consolidates all parameters into a single options object
 */
export interface MainChartOptions {
  canvasId: string;
  data: FireCalculationResult;
  currency: Currency;
  usdIlsRate: number;
  earlyRetirementYear: number;
  expenses?: PlannedExpense[];
  inflationRate?: number;
  capitalGainsTax?: number;
  targetMonthlyExpense?: number;
  targetMonthlyExpenseCurrency?: Currency;
  withdrawalRate?: number;
  /** Birth year of the user – used to derive full-retirement year and FIRE target year */
  birthYear?: number;
  /** Age at which full (state/pension) retirement begins – used with birthYear */
  fullRetirementAge?: number;
  /** RSU yearly timeline – used to derive the last RSU sale (RSU depletion) year */
  rsuTimeline?: import('./rsu-types.js').RsuYearlyData[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
}

export interface DonutChartData {
  labels: string[];
  values: number[];
  colors: string[];
}

// ============================================================================
// API Types
// ============================================================================

// API returns currency codes like 'USD', 'ILS', etc.
export type ApiCurrency = 'USD' | 'ILS' | string;

export interface AssetPriceResponse {
  symbol: string;
  price: number;
  currency: ApiCurrency;
  name?: string;
}

export interface AssetProfileResponse {
  symbol: string;
  name?: string;
  marketCapUsd?: number;
  marketCapCurrency?: Currency | 'USD';
}

export interface AssetCAGRResponse {
  symbol: string;
  cagr: number;
  period: string;
}

export interface BatchPriceRequest {
  symbols: string[];
}

export interface BatchPriceResponse {
  prices: Record<string, number>;
}

export interface ExchangeRateResponse {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  timestamp: string;
  source: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export type TabId = 'accumulation' | 'rsu' | 'expenses' | 'retirement' | 'results' | 'money-flow';

export interface SortState {
  column: string | null;
  direction: 'asc' | 'desc';
}

export interface AppState {
  accumulationPortfolio: PortfolioAsset[];
  retirementAllocation: PortfolioAllocation[];
  expenses: PlannedExpense[];
  exchangeRates: { usdToIls: number; ilsToUsd: number };
  displayCurrency: Currency;
  activeTab: TabId;
  lastCalculationResult: FireCalculationResult | null;
  lastSuccessfulCalculationInput: FirePlanInput | null;
  useRetirementPortfolio: boolean; // When false, use accumulation portfolio till end
  currentFileHandle: FileSystemFileHandle | null;
  currentFileName: string | null;
}

// ============================================================================
// File I/O Types
// ============================================================================

export interface SavedPlan {
  version: string;
  savedAt: string;
  inputs: {
    birthYear: number;
    earlyRetirementYear: number;
    fullRetirementAge: number;
    monthlyContribution: number;
    monthlyContributionCurrency: Currency;
    adjustContributionsForInflation?: boolean;
    withdrawalRate: number;
    inflationRate: number;
    capitalGainsTax: number;
    usdIlsRate: number;
  };
  accumulationPortfolio: PortfolioAsset[];
  retirementAllocation: PortfolioAllocation[];
  expenses: PlannedExpense[];
  useRetirementPortfolio?: boolean; // Optional for backward compatibility
}

// ============================================================================
// Event Types
// ============================================================================

export type StateChangeCallback = (state: AppState) => void;
export type CalculationCallback = (result: FireCalculationResult) => void;

// ============================================================================
// Money Type Helpers
// ============================================================================

import { Money as MoneyFactory, toMoney, fromMoney, normalizeCurrency, getCurrencySymbol } from './money.js';

// Re-export Money factory and helpers for convenience
export { MoneyFactory as Money, toMoney, fromMoney, normalizeCurrency, getCurrencySymbol };

/**
 * Get display symbol from Money type
 * Converts ISO code to display symbol ('$' or '₪')
 */
export function getMoneySymbol(money: Money): '$' | '₪' {
  return getCurrencySymbol(money.currency);
}

/**
 * Create Money from amount and display symbol
 */
export function createMoney(amount: number, symbol: Currency): Money {
  return toMoney(amount, symbol);
}
