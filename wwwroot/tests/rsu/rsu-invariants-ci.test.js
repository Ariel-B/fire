/* eslint-env jest */
// CI-invariant tests for RSU; these assert key financial invariants across randomized scenarios
const rsuState = require('../../js/services/rsu-state.js');

describe('RSU Financial Invariants (CI)', () => {
  beforeEach(() => {
    if (typeof rsuState.clearRsuGrants === 'function') rsuState.clearRsuGrants();
  });

  test('per-grant sums equal totals and gross - net == tax (simple scenario)', () => {
    const today = new Date();
    const grant = {
      id: 101,
      grantDate: new Date(today.getFullYear() - 3, today.getMonth(), 1).toISOString(),
      numberOfShares: 100,
      priceAtGrant: 10,
      vestingPeriodYears: 1,
      sharesSold: 0
    };

    rsuState.clearRsuGrants();
    rsuState.addRsuGrant(grant);
    rsuState.setRsuCurrentPrice(100, '$');
    rsuState.setRsuExpectedReturn(0);
    rsuState.setRsuLiquidationStrategy('SellAfter2Years');
    rsuState.setRsuMarginalTaxRate(47);
    rsuState.setRsuSurtaxEligibility(true);

    const retirementYear = today.getFullYear() + 1;
    const monthly = rsuState.calculateCanonicalMonthlyTimeline(retirementYear);
    const final = monthly[monthly.length - 1];

    // Sum perGrant arrays
    const sumPerGrantGross = final.perGrant.reduce((s,p)=> s + (p.cumulativeGrossProceeds || 0), 0);
    const sumPerGrantNet = final.perGrant.reduce((s,p)=> s + (p.cumulativeProceeds || 0), 0);
    const sumPerGrantTax = final.perGrant.reduce((s,p)=> s + (p.cumulativeTaxes || 0), 0);

    expect(Math.round(sumPerGrantGross)).toEqual(Math.round(final.totalGrossProceeds || 0));
    expect(Math.round(sumPerGrantNet)).toEqual(Math.round(final.cumulativeProceeds || 0));
    expect(Math.round(sumPerGrantTax)).toEqual(Math.round(final.cumulativeTaxes || 0));

    expect(Math.round(final.totalGrossProceeds - final.cumulativeProceeds)).toEqual(Math.round(final.cumulativeTaxes));
  });

  test('randomized scenarios maintain invariants across grants', () => {
    const today = new Date();
    const iterations = 20; // small but effective sample size for CI

    for (let i=0;i<iterations;i++) {
      // Random number of grants 1..4
      const count = Math.floor(Math.random() * 4) + 1;
      rsuState.clearRsuGrants();
      rsuState.setRsuCurrentPrice(100 + Math.random() * 200, '$');
      rsuState.setRsuExpectedReturn(Math.floor(Math.random()*10));
      rsuState.setRsuLiquidationStrategy(Math.random() > 0.5 ? 'SellAfter2Years' : 'HoldUntilRetirement');
      rsuState.setRsuMarginalTaxRate(10 + Math.floor(Math.random() * 50));
      rsuState.setRsuSurtaxEligibility(Math.random() > 0.5);

      for (let g=0; g<count; g++) {
        const yearsAgo = Math.floor(Math.random() * 4);
        const grantDate = new Date(today.getFullYear() - yearsAgo, Math.max(0, today.getMonth() - Math.floor(Math.random()*3)), 1).toISOString();
        const grant = {
          id: i*10 + g + 1,
          grantDate,
          numberOfShares: Math.floor(50 + Math.random() * 500),
          priceAtGrant: Math.floor(5 + Math.random() * 150),
          vestingPeriodYears: Math.floor(1 + Math.random() * 4),
          sharesSold: 0
        };
        rsuState.addRsuGrant(grant);
      }

      const retirementYear = today.getFullYear() + 1 + Math.floor(Math.random() * 5);
      const monthly = rsuState.calculateCanonicalMonthlyTimeline(retirementYear);
      const final = monthly[monthly.length - 1];

      // Simple invariants: per-grant sums must equal aggregated totals
      const sumPerGrantGross = final.perGrant.reduce((s,p)=> s + (p.cumulativeGrossProceeds || 0), 0);
      const sumPerGrantNet = final.perGrant.reduce((s,p)=> s + (p.cumulativeProceeds || 0), 0);
      const sumPerGrantTax = final.perGrant.reduce((s,p)=> s + (p.cumulativeTaxes || 0), 0);

      expect(Math.round(sumPerGrantGross)).toEqual(Math.round(final.totalGrossProceeds || 0));
      expect(Math.round(sumPerGrantNet)).toEqual(Math.round(final.cumulativeProceeds || 0));
      expect(Math.round(sumPerGrantTax)).toEqual(Math.round(final.cumulativeTaxes || 0));

      // Net invariants
      expect(Math.round(final.totalGrossProceeds - final.cumulativeProceeds)).toEqual(Math.round(final.cumulativeTaxes));
    }
  });

  // Monthly per-grant invariants are complex across intermediate months. The canonical
  // invariant is enforced at the final month and randomized scenario checks above.
});
