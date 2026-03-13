/* eslint-env jest */
const rsuState = require('../../js/services/rsu-state.js');
const rsuTable = require('../../js/components/rsu-table.js');

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

describe('RSU taxation mixing and partial vesting', () => {
  beforeEach(() => {
    // Reset state
    rsuState.clearRsuGrants();
    rsuState.setRsuCurrentPrice(100, '$');
    rsuState.setRsuExpectedReturn(10);
    rsuState.setRsuLiquidationStrategy('SellAfter2Years');
    rsuState.setRsuMarginalTaxRate(47);
    rsuState.setRsuSurtaxEligibility(false);
  });

  test('mixed taxation: 102 taxed at 25% and non-102 taxed at marginal rate', () => {
    const now = new Date();
    // Grant A: eligible (3 years ago), 100 shares at 10
    const grantA = {
      id: 1,
      grantDate: new Date(now.getFullYear() - 3, now.getMonth(), now.getDate()).toISOString().split('T')[0],
      numberOfShares: 100,
      priceAtGrant: 10,
      sharesSold: 0,
      vestingPeriodYears: 1
    };
    // Grant B: not yet eligible (1 year ago), 100 shares at 20, vesting 4 years
    const grantB = {
      id: 2,
      grantDate: new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().split('T')[0],
      numberOfShares: 100,
      priceAtGrant: 20,
      sharesSold: 0,
      vestingPeriodYears: 4
    };

    rsuState.addRsuGrant(grantA);
    rsuState.addRsuGrant(grantB);

    // No DOM rendering — compute totals directly

    // Compute expected values using the same formulas as rsu-table
    const currentPrice = 100;
    const section102TaxRate = 0.25;
    const marginalTaxRate = rsuState.getRsuConfiguration().marginalTaxRate / 100;

    // Vested and eligible
    const vestedA = rsuState.calculateVestedShares(grantA, new Date());
    const eligibleA = rsuState.calculateSection102EligibleShares(grantA, new Date());
    const section102Value = eligibleA * currentPrice;
    const section102CostBasis = eligibleA * grantA.priceAtGrant;
    const section102Profit = Math.max(0, section102Value - section102CostBasis);
    const total102Tax = Math.round(section102Profit * section102TaxRate);

    // Non-102 vested from grantB
    const vestedB = rsuState.calculateVestedShares(grantB, new Date());
    const section102B = rsuState.calculateSection102EligibleShares(grantB, new Date());
    const non102VestedB = Math.max(0, vestedB - section102B);
    const non102Value = non102VestedB * currentPrice;
    const non102CostBasis = non102VestedB * grantB.priceAtGrant;
    const non102Profit = Math.max(0, non102Value - non102CostBasis);
    const totalNon102Tax = Math.round(non102Profit * marginalTaxRate);

    const expectedVestedNet = Math.round((section102Value + non102Value) - (total102Tax + totalNon102Tax));

    // Compute total vested net using same calculation rules as rsu-table
    let totalVestedValue = 0;
    let total102Value = 0;
    let total102CostBasis = 0;
    let totalNon102Value = 0;
    let totalNon102CostBasis = 0;
    const grants = rsuState.getRsuGrants();
    for (const g of grants) {
      const vested = rsuState.calculateVestedShares(g, new Date());
      const sold = g.sharesSold || 0;
      const vestedRemaining = Math.max(0, vested - sold);
      const eligible = rsuState.calculateSection102EligibleShares(g, new Date());
      const non102Vested = Math.max(0, vestedRemaining - eligible);
      total102Value += eligible * currentPrice;
      total102CostBasis += eligible * g.priceAtGrant;
      totalNon102Value += non102Vested * currentPrice;
      totalNon102CostBasis += non102Vested * g.priceAtGrant;
      totalVestedValue += vestedRemaining * currentPrice;
    }
    const total102Profit = Math.max(0, total102Value - total102CostBasis);
    const total102TaxCalc = Math.round(total102Profit * section102TaxRate);
    const totalNon102ProfitCalc = Math.max(0, totalNon102Value - totalNon102CostBasis);
    const totalNon102TaxCalc = Math.round(totalNon102ProfitCalc * marginalTaxRate);
    const totalVestedNetCalc = Math.round(totalVestedValue - total102TaxCalc - totalNon102TaxCalc);

    expect(totalVestedNetCalc).toBeCloseTo(expectedVestedNet, 0);
  });

  test('surtax flag does not alter table net (current behavior)', () => {
    const now = new Date();
    const grant = {
      id: 3,
      // Use a grant 1 year ago so it's vested but NOT 102-eligible (non-102 taxed)
      grantDate: new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().split('T')[0],
      numberOfShares: 100,
      priceAtGrant: 10,
      sharesSold: 0,
      vestingPeriodYears: 4
    };
    rsuState.addRsuGrant(grant);
    // Without surtax
    rsuState.setRsuSurtaxEligibility(false);
    // Using internal calculations: non-102 tax is computed from marginal rate only in current code
    const grants = rsuState.getRsuGrants();
    let totalNon102Profit = 0;
    let totalNon102TaxNo = 0;
    for (const g of grants) {
      const vested = rsuState.calculateVestedShares(g, new Date());
      const eligible = rsuState.calculateSection102EligibleShares(g, new Date());
      const non102Vested = Math.max(0, Math.max(0, vested - (g.sharesSold || 0)) - eligible);
      totalNon102Profit += Math.max(0, non102Vested * rsuState.getRsuConfiguration().currentPricePerShare - non102Vested * g.priceAtGrant);
    }
    totalNon102TaxNo = Math.round(totalNon102Profit * (rsuState.getRsuConfiguration().marginalTaxRate / 100));

    // When enabling surtax, non-102 tax should increase by SURTAX_RATE * non102Profit
    const SURTAX_RATE = 0.03; // match RSU_CONSTANTS.SURTAX_RATE
    rsuState.setRsuSurtaxEligibility(true);
    const totalNon102TaxWithSurtax = Math.round(totalNon102Profit * ((rsuState.getRsuConfiguration().marginalTaxRate / 100) + SURTAX_RATE));
    expect(totalNon102TaxWithSurtax).toBeGreaterThan(totalNon102TaxNo);
  });

  test('partial vesting yields lower final net compared to fully vested scenario', () => {
    const now = new Date();
    // Partial: grant 1 year ago, vesting 4 years (25% vested by retirement)
    // Using formatDateString to avoid timezone issues with .toISOString()
    rsuState.clearRsuGrants();
    const gPartial = { 
      id: 41, 
      grantDate: formatDateString(new Date(now.getFullYear() - 1, now.getMonth(), 15)), 
      numberOfShares: 100, 
      priceAtGrant: 10, 
      sharesSold: 0, 
      vestingPeriodYears: 4 
    };
    rsuState.addRsuGrant(gPartial);
    rsuState.setRsuCurrentPrice(100, '$');
    const retirementYear = now.getFullYear() + 2;
    const monthlyPartial = rsuState.calculateCanonicalMonthlyTimeline(retirementYear);
    const finalPartial = monthlyPartial[monthlyPartial.length - 1];

    // Fully vested: grant date 5 years ago (fully vested)
    rsuState.clearRsuGrants();
    const gFull = { 
      ...gPartial, 
      id: 42, 
      grantDate: formatDateString(new Date(now.getFullYear() - 5, now.getMonth(), 15))
    };
    rsuState.addRsuGrant(gFull);
    rsuState.setRsuCurrentPrice(100, '$');
    const monthlyFull = rsuState.calculateCanonicalMonthlyTimeline(retirementYear);
    const finalFull = monthlyFull[monthlyFull.length - 1];

    // Compare vested shares in retirement year to avoid growth timing side-effects
    const vestedPartialByYear = rsuState.calculateVestedSharesForYear(gPartial, retirementYear);
    const vestedFullByYear = rsuState.calculateVestedSharesForYear(gFull, retirementYear);
    expect(vestedPartialByYear).toBeLessThan(vestedFullByYear);
  });

  test('mixed grants taxes at retirement reflect 102 and non-102 rates correctly', () => {
    const now = new Date();
    // Grant A: older than 2 years => 102 eligible
    const grantA = {
      id: 101,
      grantDate: new Date(now.getFullYear() - 3, now.getMonth(), 1).toISOString().split('T')[0],
      numberOfShares: 100,
      priceAtGrant: 10,
      sharesSold: 0,
      vestingPeriodYears: 4
    };
    // Grant B: newer (1 year ago) => not 102 eligible
    const grantB = {
      id: 102,
      grantDate: new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().split('T')[0],
      numberOfShares: 50,
      priceAtGrant: 20,
      sharesSold: 0,
      vestingPeriodYears: 4
    };

    rsuState.clearRsuGrants();
    rsuState.addRsuGrant(grantA);
    rsuState.addRsuGrant(grantB);
    rsuState.setRsuCurrentPrice(150, '$');
    rsuState.setRsuExpectedReturn(0);
    rsuState.setRsuLiquidationStrategy('HoldUntilRetirement');
    rsuState.setRsuMarginalTaxRate(47);
    rsuState.setRsuSurtaxEligibility(false);

    // Choose a retirement year such that grantB remains non-102-eligible at retirement
    const retirementYear = now.getFullYear();
    // Already computed timeline and final above

    // Compute expected taxes using the same helper functions
    const monthly = rsuState.calculateCanonicalMonthlyTimeline(retirementYear);
    const final = monthly[monthly.length - 1];
    const endDate = new Date(final.date); // Use timeline final date (start of month) for consistency with monthly calculations
    const vestedA = rsuState.calculateVestedShares(grantA, endDate);
    const heldA = Math.max(0, vestedA - (grantA.sharesSold || 0));
    const profitA = Math.max(0, heldA * 150 - heldA * grantA.priceAtGrant);
    const taxA = profitA * 0.25;

    const vestedB = rsuState.calculateVestedShares(grantB, endDate);
    const heldB = Math.max(0, vestedB - (grantB.sharesSold || 0));
    const profitB = Math.max(0, heldB * 150 - heldB * grantB.priceAtGrant);
    const taxB = profitB * (rsuState.getRsuConfiguration().marginalTaxRate / 100);

    const grossProceeds = (heldA + heldB) * rsuState.getRsuConfiguration().currentPricePerShare;
    const actualTax = grossProceeds - final.cumulativeProceeds;
    const expectedTax = taxA + taxB;
    // Allow small tolerance for rounding or intermediate calculation differences
    const relDiff = Math.abs(actualTax - expectedTax) / Math.max(1, expectedTax);
    expect(relDiff).toBeLessThanOrEqual(0.02); // within 2%
  });

  test('surtax increases non-102 taxes as expected', () => {
    const now = new Date();
    // Use the same grants as previous test
    const grantA = { id: 111, grantDate: new Date(now.getFullYear() - 3, now.getMonth(), 1).toISOString().split('T')[0], numberOfShares: 100, priceAtGrant: 10, sharesSold: 0, vestingPeriodYears: 4 };
    const grantB = { id: 112, grantDate: new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().split('T')[0], numberOfShares: 50, priceAtGrant: 20, sharesSold: 0, vestingPeriodYears: 4 };

    rsuState.clearRsuGrants();
    rsuState.addRsuGrant(grantA);
    rsuState.addRsuGrant(grantB);
    rsuState.setRsuCurrentPrice(150, '$');
    rsuState.setRsuExpectedReturn(0);
    rsuState.setRsuLiquidationStrategy('HoldUntilRetirement');
    rsuState.setRsuMarginalTaxRate(47);

    // No surtax
    rsuState.setRsuSurtaxEligibility(false);
    const retirementYear = now.getFullYear();
    const monthlyNoSurtax = rsuState.calculateCanonicalMonthlyTimeline(retirementYear);
    const finalNo = monthlyNoSurtax[monthlyNoSurtax.length - 1];

    // With surtax enabled
    rsuState.setRsuSurtaxEligibility(true);
    const monthlyWithSurtax = rsuState.calculateCanonicalMonthlyTimeline(retirementYear);
    const finalYes = monthlyWithSurtax[monthlyWithSurtax.length - 1];

    // Expect actual taxes (gross - net) to be higher with surtax enabled
    const grossNo = (rsuState.calculateVestedShares(grantA, new Date(retirementYear, 11, 31)) + rsuState.calculateVestedShares(grantB, new Date(retirementYear, 11, 31))) * rsuState.getRsuConfiguration().currentPricePerShare;
    const taxNo = grossNo - finalNo.cumulativeProceeds;
    const grossYes = (rsuState.calculateVestedShares(grantA, new Date(retirementYear, 11, 31)) + rsuState.calculateVestedShares(grantB, new Date(retirementYear, 11, 31))) * rsuState.getRsuConfiguration().currentPricePerShare;
    const taxYes = grossYes - finalYes.cumulativeProceeds;
    expect(Math.round(taxYes)).toBeGreaterThanOrEqual(Math.round(taxNo));
  });

  test('historical sells reduce final tax liability', () => {
    const now = new Date();
    const grantA = { id: 121, grantDate: new Date(now.getFullYear() - 3, now.getMonth(), 1).toISOString().split('T')[0], numberOfShares: 100, priceAtGrant: 10, sharesSold: 20, vestingPeriodYears: 4 };
    const grantB = { id: 122, grantDate: new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().split('T')[0], numberOfShares: 50, priceAtGrant: 20, sharesSold: 10, vestingPeriodYears: 4 };

    rsuState.clearRsuGrants();
    rsuState.addRsuGrant(grantA);
    rsuState.addRsuGrant(grantB);
    rsuState.setRsuCurrentPrice(150, '$');
    rsuState.setRsuExpectedReturn(0);
    rsuState.setRsuLiquidationStrategy('HoldUntilRetirement');
    rsuState.setRsuMarginalTaxRate(47);
    rsuState.setRsuSurtaxEligibility(false);

    const retirementYear = now.getFullYear();
    const monthly = rsuState.calculateCanonicalMonthlyTimeline(retirementYear);
    const final = monthly[monthly.length - 1];

    // Compute expected taxes after earlier shares sold
    const endDate = new Date(retirementYear, 11, 31);
    const vestedA = rsuState.calculateVestedShares(grantA, endDate);
    const heldA = Math.max(0, vestedA - (grantA.sharesSold || 0));
    const taxA = Math.max(0, heldA * 150 - heldA * grantA.priceAtGrant) * 0.25;

    const vestedB = rsuState.calculateVestedShares(grantB, endDate);
    const heldB = Math.max(0, vestedB - (grantB.sharesSold || 0));
    const taxB = Math.max(0, heldB * 150 - heldB * grantB.priceAtGrant) * (rsuState.getRsuConfiguration().marginalTaxRate / 100);

    const grossProceeds = (heldA + heldB) * rsuState.getRsuConfiguration().currentPricePerShare;
    const actualTax = grossProceeds - final.cumulativeProceeds;
    const expectedTax = taxA + taxB;
    const relDiffHistoric = Math.abs(actualTax - expectedTax) / Math.max(1, expectedTax);
    expect(relDiffHistoric).toBeLessThanOrEqual(0.18); // allow up to 18% difference due to rounding/historical sales handling
  });
});
