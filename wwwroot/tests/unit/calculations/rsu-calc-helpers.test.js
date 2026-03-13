/**
 * RSU Calculations Pure Helper Tests
 * Directly tests the exported pure functions from rsu-calculations.ts:
 * - calculateSection102Tax
 * - projectPrice
 * - aggregateMonthlyToYearly
 * - computeGrantSaleSchedule
 */

import {
  calculateSection102Tax,
  projectPrice,
  aggregateMonthlyToYearly,
  computeGrantSaleSchedule
} from '../../../js/services/rsu-calculations.js';

// ============================================================================
// calculateSection102Tax
// ============================================================================

describe('calculateSection102Tax', () => {
  test('calculates 25% tax on capital gain', () => {
    expect(calculateSection102Tax(2000, 1000)).toBe(250); // (2000-1000) * 0.25
  });

  test('respects custom tax rate', () => {
    expect(calculateSection102Tax(2000, 1000, 0.30)).toBe(300); // (2000-1000) * 0.30
  });

  test('returns 0 when grossProceeds equals costBasis (no gain)', () => {
    expect(calculateSection102Tax(1000, 1000)).toBe(0);
  });

  test('returns 0 when grossProceeds is less than costBasis (no gain)', () => {
    expect(calculateSection102Tax(500, 1000)).toBe(0); // max(0, ...) clamps negative gain
  });

  test('returns 0 for zero grossProceeds', () => {
    expect(calculateSection102Tax(0, 0)).toBe(0);
  });

  test('handles large values', () => {
    // (500000 - 100000) * 0.25 = 100000
    expect(calculateSection102Tax(500000, 100000)).toBe(100000);
  });

  test('returns 0 for zero tax rate', () => {
    expect(calculateSection102Tax(2000, 1000, 0)).toBe(0);
  });
});

// ============================================================================
// projectPrice
// ============================================================================

describe('projectPrice', () => {
  test('returns current price when monthsFromNow is 0', () => {
    expect(projectPrice(100, 10, 0)).toBe(100);
  });

  test('returns current price when expectedAnnualReturn is 0', () => {
    expect(projectPrice(100, 0, 24)).toBe(100);
  });

  test('correctly projects price for 12 months at 10% annual return', () => {
    // After 1 year: 100 * 1.10^1 = 110
    expect(projectPrice(100, 10, 12)).toBeCloseTo(110, 4);
  });

  test('correctly projects price for 24 months at 10% annual return', () => {
    // After 2 years: 100 * 1.10^2 = 121
    expect(projectPrice(100, 10, 24)).toBeCloseTo(121, 4);
  });

  test('correctly projects price for 6 months at 10% annual return', () => {
    // After 0.5 years: 100 * 1.10^0.5 ≈ 104.88
    expect(projectPrice(100, 10, 6)).toBeCloseTo(104.88, 1);
  });

  test('handles negative return (price decline)', () => {
    // After 1 year at -5%: 100 * 0.95 = 95
    expect(projectPrice(100, -5, 12)).toBeCloseTo(95, 4);
  });

  test('handles large return projection', () => {
    // After 5 years at 20%: 100 * 1.20^5 ≈ 248.83
    expect(projectPrice(100, 20, 60)).toBeCloseTo(248.83, 1);
  });

  test('returns 0 for zero current price', () => {
    expect(projectPrice(0, 10, 12)).toBe(0);
  });
});

// ============================================================================
// aggregateMonthlyToYearly
// ============================================================================

describe('aggregateMonthlyToYearly', () => {
  test('returns empty array for empty input', () => {
    expect(aggregateMonthlyToYearly([])).toEqual([]);
  });

  test('aggregates single entry to yearly bucket', () => {
    const monthly = [{ date: new Date('2025-03-15'), totalValue: 1000, totalNetValue: 800, cumulativeProceeds: 500 }];
    const result = aggregateMonthlyToYearly(monthly);
    expect(result).toHaveLength(1);
    expect(result[0].year).toBe(2025);
    expect(result[0].totalValue).toBe(1000);
  });

  test('keeps max totalValue within same year', () => {
    const monthly = [
      { date: new Date('2025-01-01'), totalValue: 1000, totalNetValue: 800, cumulativeProceeds: 100 },
      { date: new Date('2025-06-01'), totalValue: 2000, totalNetValue: 1600, cumulativeProceeds: 200 },
      { date: new Date('2025-12-01'), totalValue: 1500, totalNetValue: 1200, cumulativeProceeds: 300 }
    ];
    const result = aggregateMonthlyToYearly(monthly);
    expect(result).toHaveLength(1);
    expect(result[0].totalValue).toBe(2000);      // max
    expect(result[0].totalNetValue).toBe(1600);   // max
    expect(result[0].cumulativeProceeds).toBe(300); // max
  });

  test('creates separate buckets for different years', () => {
    const monthly = [
      { date: new Date('2025-06-01'), totalValue: 1000, totalNetValue: 800, cumulativeProceeds: 100 },
      { date: new Date('2026-06-01'), totalValue: 2000, totalNetValue: 1600, cumulativeProceeds: 200 },
      { date: new Date('2027-06-01'), totalValue: 3000, totalNetValue: 2400, cumulativeProceeds: 300 }
    ];
    const result = aggregateMonthlyToYearly(monthly);
    expect(result).toHaveLength(3);
    expect(result.map(r => r.year)).toEqual([2025, 2026, 2027]);
  });

  test('sorts result by year ascending', () => {
    const monthly = [
      { date: new Date('2027-01-01'), totalValue: 3000, totalNetValue: 2400, cumulativeProceeds: 300 },
      { date: new Date('2025-01-01'), totalValue: 1000, totalNetValue: 800, cumulativeProceeds: 100 },
      { date: new Date('2026-01-01'), totalValue: 2000, totalNetValue: 1600, cumulativeProceeds: 200 }
    ];
    const result = aggregateMonthlyToYearly(monthly);
    expect(result[0].year).toBe(2025);
    expect(result[1].year).toBe(2026);
    expect(result[2].year).toBe(2027);
  });

  test('handles missing fields (defaults to 0)', () => {
    const monthly = [{ date: new Date('2025-01-01') }];
    const result = aggregateMonthlyToYearly(monthly);
    expect(result[0].totalValue).toBe(0);
    expect(result[0].totalNetValue).toBe(0);
    expect(result[0].cumulativeProceeds).toBe(0);
  });

  test('handles Date objects and date strings equally', () => {
    const monthly = [{ date: '2025-06-01', totalValue: 500, totalNetValue: 400, cumulativeProceeds: 100 }];
    const result = aggregateMonthlyToYearly(monthly);
    expect(result[0].year).toBe(2025);
  });
});

// ============================================================================
// computeGrantSaleSchedule
// ============================================================================

describe('computeGrantSaleSchedule', () => {
  test('correctly identifies grant as eligible after 2 years', () => {
    const grantDate = new Date();
    grantDate.setFullYear(grantDate.getFullYear() - 3); // 3 years ago
    const grant = { id: 1, grantDate: grantDate.toISOString().split('T')[0] };
    const schedule = computeGrantSaleSchedule(grant);
    expect(schedule.isEligibleNow).toBe(true);
  });

  test('correctly identifies grant as not eligible before 2 years', () => {
    const grantDate = new Date();
    grantDate.setFullYear(grantDate.getFullYear() - 1); // 1 year ago
    const grant = { id: 2, grantDate: grantDate.toISOString().split('T')[0] };
    const schedule = computeGrantSaleSchedule(grant);
    expect(schedule.isEligibleNow).toBe(false);
  });

  test('includes grantId in result', () => {
    const grantDate = new Date();
    grantDate.setFullYear(grantDate.getFullYear() - 3);
    const grant = { id: 42, grantDate: grantDate.toISOString().split('T')[0] };
    const schedule = computeGrantSaleSchedule(grant);
    expect(schedule.grantId).toBe(42);
  });

  test('includes eligibleDate as YYYY-MM-DD string', () => {
    const grantDate = new Date('2020-06-15');
    const grant = { id: 1, grantDate: '2020-06-15' };
    const schedule = computeGrantSaleSchedule(grant);
    expect(schedule.eligibleDate).toBe('2022-06-15'); // 2 years after grant
  });

  test('respects custom "now" date parameter', () => {
    const grantDate = '2020-01-01';
    const grant = { id: 1, grantDate };
    // Before eligibility: now = Jan 2021 (1 year after grant)
    const resultBefore = computeGrantSaleSchedule(grant, new Date('2021-01-01'));
    expect(resultBefore.isEligibleNow).toBe(false);
    // After eligibility: now = Jan 2023 (3 years after grant)
    const resultAfter = computeGrantSaleSchedule(grant, new Date('2023-01-01'));
    expect(resultAfter.isEligibleNow).toBe(true);
  });

  test('is eligible on exactly the 2-year anniversary', () => {
    const grantDateStr = '2022-03-01';
    const grant = { id: 1, grantDate: grantDateStr };
    const twoYearsLater = new Date('2024-03-01');
    const schedule = computeGrantSaleSchedule(grant, twoYearsLater);
    expect(schedule.isEligibleNow).toBe(true); // now >= eligibleDate
  });
});
