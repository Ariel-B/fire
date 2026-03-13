/**
 * RSU calculation helpers
 * - Provides small, pure helpers to compute tax/gross/net and to aggregate monthly to yearly.
 */

import type { RsuSummary } from '../types/rsu-types.js';

/** Calculate Section 102 capital gains tax (25% by default) */
export function calculateSection102Tax(grossProceeds: number, costBasis: number, section102Rate = 0.25): number {
  const capitalGain = Math.max(0, grossProceeds - costBasis);
  return capitalGain * section102Rate;
}

/** Project stock price using CAGR projection for a number of months */
export function projectPrice(currentPrice: number, expectedAnnualReturn: number, monthsFromNow: number): number {
  const annual = expectedAnnualReturn / 100;
  return currentPrice * Math.pow(1 + annual, monthsFromNow / 12);
}

/**
 * Aggregate monthly value data to yearly buckets.
 * Accepts monthly entries with fields: { date: Date, totalValue, totalNetValue, cumulativeProceeds }
 */
export function aggregateMonthlyToYearly(monthly: any[]): any[] {
  const buckets: Map<number, any> = new Map();
  for (const m of monthly) {
    const year = new Date(m.date).getFullYear();
    const existing = buckets.get(year) || { year, totalValue: 0, totalNetValue: 0, cumulativeProceeds: 0 };
    existing.totalValue = Math.max(existing.totalValue, m.totalValue || 0); // keep the max for totalValue
    existing.totalNetValue = Math.max(existing.totalNetValue, m.totalNetValue || 0);
    existing.cumulativeProceeds = Math.max(existing.cumulativeProceeds, m.cumulativeProceeds || 0);
    buckets.set(year, existing);
  }
  return Array.from(buckets.values()).sort((a, b) => a.year - b.year);
}

/**
 * Compute sale schedule for a grant as a simple helper.
 * Not used by core engine, but can be utilized in testing.
 */
export function computeGrantSaleSchedule(grant: any, now: Date = new Date()): any {
  const eligibleDate = new Date(grant.grantDate);
  eligibleDate.setFullYear(eligibleDate.getFullYear() + 2);
  const isEligibleNow = now >= eligibleDate;
  return {
    grantId: grant.id,
    eligibleDate: eligibleDate.toISOString().split('T')[0],
    isEligibleNow
  };
}

export default {
  calculateSection102Tax,
  projectPrice,
  aggregateMonthlyToYearly,
  computeGrantSaleSchedule
};
