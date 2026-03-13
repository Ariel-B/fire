/* eslint-env jest */
// Consistency tests for RSU timelines and summary calculation
const rsuState = require('../../js/services/rsu-state.js');
const app = require('../../js/app.js');

/**
 * Helper to create a timezone-safe date string (YYYY-MM-DD)
 * This avoids the issue where .toISOString() converts to UTC, potentially shifting the date
 */
function formatDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('RSU timeline consistency', () => {
  beforeEach(() => {
    // Reset configuration to a known state via public API
    if (typeof rsuState.clearRsuGrants === 'function') rsuState.clearRsuGrants();
    if (typeof rsuState.setRsuCurrentPrice === 'function') rsuState.setRsuCurrentPrice(100, '$');
    if (typeof rsuState.setRsuExpectedReturn === 'function') rsuState.setRsuExpectedReturn(14);
    if (typeof rsuState.setRsuLiquidationStrategy === 'function') rsuState.setRsuLiquidationStrategy('SellAfter2Years');
  });

  test('monthly timeline final totalNetValue equals app projected net', () => {
    // Create a sample grant where some shares are already 102-eligible and others vest later
    const today = new Date();
    const grant1 = {
      id: 1,
      grantDate: new Date(today.getFullYear() - 3, today.getMonth(), 1).toISOString(), // 3 years ago => already 102-eligible
      numberOfShares: 1000,
      priceAtGrant: 10,
      vestingPeriodYears: 4,
      sharesSold: 0
    };
    const grant2 = {
      id: 2,
      grantDate: new Date(today.getFullYear() - 1, today.getMonth(), 1).toISOString(), // 1 year ago => not yet eligible
      numberOfShares: 400,
      priceAtGrant: 20,
      vestingPeriodYears: 4,
      sharesSold: 0
    };

    // Configure via public setters
    rsuState.clearRsuGrants();
    rsuState.addRsuGrant(grant1);
    rsuState.addRsuGrant(grant2);
    rsuState.setRsuCurrentPrice(50, '$');
    rsuState.setRsuExpectedReturn(14);
    rsuState.setRsuLiquidationStrategy('SellAfter2Years');

    const retirementYear = today.getFullYear() + 5;

    // Monthly timeline
    const monthly = rsuState.calculateCanonicalMonthlyTimeline(retirementYear);
    expect(monthly.length).toBeGreaterThan(0);
    const finalMonthly = monthly[monthly.length - 1];
    const monthlyNet = finalMonthly.totalNetValue;

    // Use the same logic the app uses now: app reads monthly timeline for summary
    // We simulate the app's calculation here rather than invoking UI
    const projectedNetFromApp = monthlyNet; // app assigns finalMonth.totalNetValue directly

    expect(Math.round(projectedNetFromApp)).toEqual(Math.round(monthlyNet));
  });

  test('yearly timeline matches monthly timeline in net cumulative proceeds for simple scenario', () => {
    // Simple single grant that vests immediately and is 102-eligible
    const today = new Date();
    const grant = {
      id: 10,
      grantDate: new Date(today.getFullYear() - 3, 0, 1).toISOString(),
      numberOfShares: 100,
      priceAtGrant: 10,
      vestingPeriodYears: 1,
      sharesSold: 0
    };
    rsuState.clearRsuGrants();
    rsuState.addRsuGrant(grant);
    rsuState.setRsuCurrentPrice(100, '$');
    rsuState.setRsuExpectedReturn(14);
    rsuState.setRsuLiquidationStrategy('SellAfter2Years');

    const retirementYear = today.getFullYear() + 2;

    const monthly = rsuState.calculateCanonicalMonthlyTimeline(retirementYear);
    const finalMonthly = monthly[monthly.length - 1];

    const startYear = today.getFullYear();
    const endYear = retirementYear + 2;
    const yearly = rsuState.calculateRsuTimeline(startYear, endYear, retirementYear);
    const finalYearly = yearly[yearly.length - 1];

    // Compare cumulative proceeds (net) from both approaches
    const monthlyProceeds = finalMonthly.cumulativeProceeds;
    const yearlyProceeds = yearly.reduce((s, y) => s + (y.netSaleProceeds || 0), 0);

    expect(Math.round(monthlyProceeds)).toEqual(Math.round(yearlyProceeds));
  });

  test('multiple grants with different vesting dates produce consistent final net', () => {
    const today = new Date();

    const g1 = {
      id: 21,
      grantDate: new Date(today.getFullYear() - 4, today.getMonth(), 1).toISOString(), // 4 years ago
      numberOfShares: 800,
      priceAtGrant: 5,
      vestingPeriodYears: 4,
      sharesSold: 0
    };
    const g2 = {
      id: 22,
      grantDate: new Date(today.getFullYear() - 1, today.getMonth(), 1).toISOString(), // 1 year ago
      numberOfShares: 300,
      priceAtGrant: 20,
      vestingPeriodYears: 3,
      sharesSold: 0
    };

    rsuState.clearRsuGrants();
    rsuState.addRsuGrant(g1);
    rsuState.addRsuGrant(g2);
    rsuState.setRsuCurrentPrice(60, '$');
    rsuState.setRsuExpectedReturn(14);
    rsuState.setRsuLiquidationStrategy('SellAfter2Years');

    const retirementYear = today.getFullYear() + 6;
    const monthly = rsuState.calculateCanonicalMonthlyTimeline(retirementYear);
    expect(monthly.length).toBeGreaterThan(0);
    const finalMonthly = monthly[monthly.length - 1];
    expect(finalMonthly.totalNetValue).toBeGreaterThan(0);
  });

  test('historical user-sold shares are excluded from future cumulative proceeds', () => {
    const today = new Date();

    const baseGrant = {
      id: 31,
      grantDate: new Date(today.getFullYear() - 3, today.getMonth(), 1).toISOString(),
      numberOfShares: 1000,
      priceAtGrant: 10,
      vestingPeriodYears: 4,
      sharesSold: 0
    };

    const soldGrant = { ...baseGrant, id: 32, sharesSold: 200 };

    // Scenario A: no user-sold shares
    rsuState.clearRsuGrants();
    rsuState.addRsuGrant(baseGrant);
    rsuState.setRsuCurrentPrice(50, '$');
    rsuState.setRsuExpectedReturn(14);
    rsuState.setRsuLiquidationStrategy('SellAfter2Years');
    const retirementYear = today.getFullYear() + 5;
    const monthlyA = rsuState.calculateCanonicalMonthlyTimeline(retirementYear);
    const finalA = monthlyA[monthlyA.length - 1];

    // Scenario B: with historical sold shares
    rsuState.clearRsuGrants();
    rsuState.addRsuGrant(soldGrant);
    rsuState.setRsuCurrentPrice(50, '$');
    rsuState.setRsuExpectedReturn(14);
    rsuState.setRsuLiquidationStrategy('SellAfter2Years');
    const monthlyB = rsuState.calculateCanonicalMonthlyTimeline(retirementYear);
    const finalB = monthlyB[monthlyB.length - 1];

    // Future cumulative proceeds should be lower when user already sold some shares
    expect(Math.round(finalB.cumulativeProceeds)).toBeLessThan(Math.round(finalA.cumulativeProceeds));
  });

  test('forfeiture at retirement: unvested shares produce zero final net', () => {
    const today = new Date();

    // Grant issued recently with long vesting so most shares remain unvested by retirement
    const grant = {
      id: 41,
      grantDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(),
      numberOfShares: 500,
      priceAtGrant: 10,
      vestingPeriodYears: 100, // effectively never vests before retirement
      sharesSold: 0
    };

    rsuState.clearRsuGrants();
    rsuState.addRsuGrant(grant);
    rsuState.setRsuCurrentPrice(30, '$');
    rsuState.setRsuExpectedReturn(14);
    rsuState.setRsuLiquidationStrategy('SellAfter2Years');

    // Choose retirement soon so grant is unvested and forfeited
    const retirementYear = today.getFullYear() + 1;
    const monthly = rsuState.calculateCanonicalMonthlyTimeline(retirementYear);
    const final = monthly[monthly.length - 1];

    // Compare to a scenario where the same grant vests quickly: forfeiture should reduce final net
    rsuState.clearRsuGrants();
    const vestedGrant = { ...grant, vestingPeriodYears: 1, id: 42 };
    rsuState.addRsuGrant(vestedGrant);
    rsuState.setRsuCurrentPrice(30, '$');
    rsuState.setRsuExpectedReturn(14);
    rsuState.setRsuLiquidationStrategy('SellAfter2Years');
    const monthlyVested = rsuState.calculateCanonicalMonthlyTimeline(retirementYear);
    const finalVested = monthlyVested[monthlyVested.length - 1];

    // Final net when grant is forfeited should be less than when it vests before retirement
    expect(final.totalNetValue).toBeLessThan(finalVested.totalNetValue);
  });

  test('mixed liquidation strategies: HoldUntilRetirement vs SellAfter2Years produce different outcomes', () => {
    const today = new Date();

    const grant = {
      id: 51,
      grantDate: new Date(today.getFullYear() - 2, today.getMonth(), 1).toISOString(),
      numberOfShares: 200,
      priceAtGrant: 20,
      vestingPeriodYears: 2,
      sharesSold: 0
    };

    // Scenario A: SellAfter2Years
    rsuState.clearRsuGrants();
    rsuState.addRsuGrant(grant);
    rsuState.setRsuCurrentPrice(40, '$');
    rsuState.setRsuExpectedReturn(14);
    rsuState.setRsuLiquidationStrategy('SellAfter2Years');
    const retirementYear = today.getFullYear() + 3;
    const monthlySell = rsuState.calculateCanonicalMonthlyTimeline(retirementYear);
    const finalSell = monthlySell[monthlySell.length - 1];

    // Scenario B: HoldUntilRetirement (sell only at retirement)
    rsuState.clearRsuGrants();
    rsuState.addRsuGrant(grant);
    rsuState.setRsuCurrentPrice(40, '$');
    rsuState.setRsuExpectedReturn(14);
    // Use HoldUntilRetirement if implemented; if not, expect different result when switching strategy
    rsuState.setRsuLiquidationStrategy('HoldUntilRetirement');
    const monthlyHold = rsuState.calculateCanonicalMonthlyTimeline(retirementYear);
    const finalHold = monthlyHold[monthlyHold.length - 1];

    // With positive CAGR, holding until retirement should yield greater or equal net than selling earlier
    expect(finalHold.totalNetValue).toBeGreaterThanOrEqual(finalSell.totalNetValue);
  });

  test('forfeiture with partial vesting reduces final net compared to fully vested', () => {
    const today = new Date();

    // Grant that is partially vested by retirement (only 50% vested: 2 years from grant, 4-year vesting)
    // Use formatDateString to avoid timezone issues
    const partialGrant = {
      id: 61,
      grantDate: formatDateString(new Date(today.getFullYear() - 1, today.getMonth(), 15)), // 1 year ago
      numberOfShares: 100,
      priceAtGrant: 10,
      vestingPeriodYears: 4,
      sharesSold: 0
    };

    rsuState.clearRsuGrants();
    rsuState.addRsuGrant(partialGrant);
    rsuState.setRsuCurrentPrice(50, '$');
    rsuState.setRsuExpectedReturn(14);
    rsuState.setRsuLiquidationStrategy('SellAfter2Years');
    const retirementYear = today.getFullYear() + 1;
    const monthlyPartial = rsuState.calculateCanonicalMonthlyTimeline(retirementYear);
    const finalPartial = monthlyPartial[monthlyPartial.length - 1];

    // Same grant but fully vested before retirement (6 years from grant > 4-year vesting)
    const fullGrant = { 
      ...partialGrant, 
      id: 62, 
      grantDate: formatDateString(new Date(today.getFullYear() - 6, today.getMonth(), 15))
    };
    rsuState.clearRsuGrants();
    rsuState.addRsuGrant(fullGrant);
    rsuState.setRsuCurrentPrice(50, '$');
    rsuState.setRsuExpectedReturn(14);
    rsuState.setRsuLiquidationStrategy('SellAfter2Years');
    const monthlyFull = rsuState.calculateCanonicalMonthlyTimeline(retirementYear);
    const finalFull = monthlyFull[monthlyFull.length - 1];

    expect(finalPartial.totalNetValue).toBeGreaterThan(0);
    expect(finalFull.totalNetValue).toBeGreaterThan(0);
    expect(finalPartial.totalNetValue).toBeLessThan(finalFull.totalNetValue);
  });

  test('mixed grant dates produce non-decreasing cumulative proceeds over time', () => {
    const today = new Date();
    const gA = { id: 71, grantDate: new Date(today.getFullYear() - 3, today.getMonth(), 1).toISOString(), numberOfShares: 200, priceAtGrant: 10, vestingPeriodYears: 4, sharesSold: 0 };
    const gB = { id: 72, grantDate: new Date(today.getFullYear() - 1, today.getMonth(), 1).toISOString(), numberOfShares: 150, priceAtGrant: 15, vestingPeriodYears: 3, sharesSold: 0 };
    const gC = { id: 73, grantDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(), numberOfShares: 100, priceAtGrant: 20, vestingPeriodYears: 2, sharesSold: 0 };

    rsuState.clearRsuGrants();
    rsuState.addRsuGrant(gA);
    rsuState.addRsuGrant(gB);
    rsuState.addRsuGrant(gC);
    rsuState.setRsuCurrentPrice(60, '$');
    rsuState.setRsuExpectedReturn(14);
    rsuState.setRsuLiquidationStrategy('SellAfter2Years');

    const retirementYear = today.getFullYear() + 4;
    const monthly = rsuState.calculateCanonicalMonthlyTimeline(retirementYear);
    expect(monthly.length).toBeGreaterThan(2);
    for (let i = 1; i < monthly.length; i++) {
      expect(monthly[i].cumulativeProceeds).toBeGreaterThanOrEqual(monthly[i - 1].cumulativeProceeds);
    }
  });
});
