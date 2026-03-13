import * as rsuState from '../wwwroot/js/services/rsu-state.js';

function runScenario() {
  const today = new Date();
  rsuState.clearRsuGrants();
  rsuState.setRsuCurrentPrice(150, '$');
  rsuState.setRsuExpectedReturn(0);
  rsuState.setRsuLiquidationStrategy('SellAfter2Years');
  rsuState.setRsuMarginalTaxRate(47);
  rsuState.setRsuSurtaxEligibility(true);

  const grant1 = {
    id: 1,
    grantDate: new Date(today.getFullYear() - 3, today.getMonth(), 1).toISOString(),
    numberOfShares: 200,
    priceAtGrant: 10,
    vestingPeriodYears: 4,
    sharesSold: 0
  };
  const grant2 = {
    id: 2,
    grantDate: new Date(today.getFullYear() - 2, today.getMonth(), 1).toISOString(),
    numberOfShares: 300,
    priceAtGrant: 20,
    vestingPeriodYears: 4,
    sharesSold: 0
  };

  rsuState.addRsuGrant(grant1);
  rsuState.addRsuGrant(grant2);

  const retirementYear = today.getFullYear() + 1;
  const timeline = rsuState.calculateCanonicalMonthlyTimeline(retirementYear);

  for (const m of timeline) {
    if (m.perGrant && m.perGrant.length > 0) {
      const sumPer = m.perGrant.reduce((s,p)=> s + (p.cumulativeTaxes || 0), 0);
      if (sumPer > 0 && (!m.cumulativeTaxes || m.cumulativeTaxes === 0)) {
        console.log('DEBUG found mismatch', m.label, sumPer, m.cumulativeTaxes, 'type', typeof m.cumulativeTaxes, 'keys', Object.keys(m), m.perGrant);
      }
    }
  }
}

runScenario();
