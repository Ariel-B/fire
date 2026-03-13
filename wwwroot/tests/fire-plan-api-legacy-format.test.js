/**
 * Tests for fire-plan-api.ts handling of legacy (pre-Money type) file formats
 * 
 * This test reproduces the issue where loading a pre-Money-type file causes:
 * "Expected start of object for Money type" error from the backend
 */

// Mock the Money class
const Money = {
  create: (amount, currency) => ({ amount, currency: currency === '₪' || currency === 'ILS' ? 'ILS' : 'USD' }),
  usd: (amount) => ({ amount, currency: 'USD' }),
  ils: (amount) => ({ amount, currency: 'ILS' })
};

// Helper function copied from fire-plan-api.ts
function extractMoneyValue(value, legacyCurrencyField) {
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

describe('extractMoneyValue', () => {
  describe('handles Money object format', () => {
    test('USD Money object', () => {
      const money = { amount: 100, currency: 'USD' };
      const result = extractMoneyValue(money);
      expect(result).toEqual({ amount: 100, currency: 'USD' });
    });

    test('ILS Money object', () => {
      const money = { amount: 100, currency: 'ILS' };
      const result = extractMoneyValue(money);
      expect(result).toEqual({ amount: 100, currency: 'ILS' });
    });

    test('Money object with symbol currency (₪)', () => {
      const money = { amount: 100, currency: '₪' };
      const result = extractMoneyValue(money);
      expect(result).toEqual({ amount: 100, currency: 'ILS' });
    });

    test('Money object with symbol currency ($)', () => {
      const money = { amount: 100, currency: '$' };
      const result = extractMoneyValue(money);
      expect(result).toEqual({ amount: 100, currency: 'USD' });
    });
  });

  describe('handles legacy number format', () => {
    test('legacy number with ILS symbol currency field', () => {
      const result = extractMoneyValue(120000, '₪');
      expect(result).toEqual({ amount: 120000, currency: 'ILS' });
    });

    test('legacy number with ILS code currency field', () => {
      const result = extractMoneyValue(120000, 'ILS');
      expect(result).toEqual({ amount: 120000, currency: 'ILS' });
    });

    test('legacy number with USD symbol currency field', () => {
      const result = extractMoneyValue(40000, '$');
      expect(result).toEqual({ amount: 40000, currency: 'USD' });
    });

    test('legacy number with USD code currency field', () => {
      const result = extractMoneyValue(40000, 'USD');
      expect(result).toEqual({ amount: 40000, currency: 'USD' });
    });

    test('legacy number without currency field defaults to USD', () => {
      const result = extractMoneyValue(100);
      expect(result).toEqual({ amount: 100, currency: 'USD' });
    });
  });

  describe('handles edge cases', () => {
    test('null value', () => {
      const result = extractMoneyValue(null);
      expect(result).toEqual({ amount: 0, currency: 'USD' });
    });

    test('undefined value', () => {
      const result = extractMoneyValue(undefined);
      expect(result).toEqual({ amount: 0, currency: 'USD' });
    });

    test('empty object (no amount field)', () => {
      const result = extractMoneyValue({});
      expect(result).toEqual({ amount: 0, currency: 'USD' });
    });

    test('object with only currency', () => {
      const result = extractMoneyValue({ currency: 'ILS' });
      expect(result).toEqual({ amount: 0, currency: 'USD' });
    });
  });
});

describe('toBackendInput expense serialization', () => {
  // Simulate the expense serialization from toBackendInput
  function serializeExpense(expense) {
    const netAmount = extractMoneyValue(expense.netAmount, expense.currency);
    return {
      id: Number(expense.id) || 0,
      type: String(expense.type || ''),
      netAmount,
      year: Number(expense.year) || new Date().getFullYear(),
      frequencyYears: Number(expense.frequencyYears) || 1,
      repetitionCount: Number(expense.repetitionCount) || 1
    };
  }

  test('serializes legacy expense format (from user file)', () => {
    // This is the exact format from the user's pre-Money-type file
    const legacyExpense = {
      id: 1763301897043,
      type: "לימודים של נועה",
      netAmount: 120000,  // Number, not Money object!
      currency: "₪",      // Separate currency field
      year: 2041,
      frequencyYears: 1,
      repetitionCount: 3
    };

    const result = serializeExpense(legacyExpense);

    expect(result.netAmount).toEqual({
      amount: 120000,
      currency: 'ILS'
    });
    expect(result.type).toBe("לימודים של נועה");
    expect(result.year).toBe(2041);
  });

  test('serializes new Money object expense format', () => {
    const newExpense = {
      id: 1763301897043,
      type: "Education",
      netAmount: { amount: 120000, currency: 'ILS' },
      year: 2041,
      frequencyYears: 1,
      repetitionCount: 3
    };

    const result = serializeExpense(newExpense);

    expect(result.netAmount).toEqual({
      amount: 120000,
      currency: 'ILS'
    });
  });

  test('serializes USD expense from legacy format', () => {
    const legacyExpense = {
      id: 1763304875430,
      type: "Tesla Optimus",
      netAmount: 40000,
      currency: "$",
      year: 2033,
      frequencyYears: 5,
      repetitionCount: 10
    };

    const result = serializeExpense(legacyExpense);

    expect(result.netAmount).toEqual({
      amount: 40000,
      currency: 'USD'
    });
  });
});

describe('toBackendInput portfolio asset serialization', () => {
  // Simulate the portfolio asset serialization from toBackendInput
  function serializePortfolioAsset(asset) {
    const currentPrice = extractMoneyValue(
      asset.currentPrice,
      asset.currentPriceCurrency || asset.currency
    );
    const averageCost = extractMoneyValue(
      asset.averageCost || asset.averageCostPerShare,
      asset.averageCostCurrency || asset.currency
    );

    return {
      id: Number(asset.id) || 0,
      symbol: String(asset.symbol || ''),
      quantity: Number(asset.quantity) || 0,
      currentPrice,
      averageCost,
      method: String(asset.method || 'CAGR'),
      value1: Number(asset.value1) || 0,
      value2: Number(asset.value2) || 0
    };
  }

  test('serializes portfolio asset with Money objects (new format)', () => {
    const asset = {
      id: 1763300027149,
      symbol: "TSLA",
      quantity: 2262,
      currentPrice: { amount: 449.06, currency: "USD" },
      averageCost: { amount: 62.56, currency: "USD" },
      method: "CAGR",
      value1: 30,
      value2: 0
    };

    const result = serializePortfolioAsset(asset);

    expect(result.currentPrice).toEqual({ amount: 449.06, currency: 'USD' });
    expect(result.averageCost).toEqual({ amount: 62.56, currency: 'USD' });
  });

  test('serializes portfolio asset with legacy number format', () => {
    const legacyAsset = {
      id: 1763300476090,
      symbol: "איילון כספית",
      quantity: 298877,
      currentPrice: 1.1201,
      currentPriceCurrency: "₪",
      averageCostPerShare: 1.0877,  // Legacy field name
      averageCostCurrency: "₪",
      method: "CAGR",
      value1: 4.25,
      value2: 0
    };

    const result = serializePortfolioAsset(legacyAsset);

    expect(result.currentPrice).toEqual({ amount: 1.1201, currency: 'ILS' });
    expect(result.averageCost).toEqual({ amount: 1.0877, currency: 'ILS' });
  });

  test('serializes portfolio asset with mixed format (Money object with symbol currency)', () => {
    // This can happen if the file was partially migrated
    const mixedAsset = {
      id: 1763300476090,
      symbol: "Test",
      quantity: 100,
      currentPrice: { amount: 1.12, currency: "₪" },  // Symbol instead of code
      averageCost: { amount: 1.08, currency: "₪" },
      method: "CAGR",
      value1: 4,
      value2: 0
    };

    const result = serializePortfolioAsset(mixedAsset);

    // Should normalize to ISO codes
    expect(result.currentPrice).toEqual({ amount: 1.12, currency: 'ILS' });
    expect(result.averageCost).toEqual({ amount: 1.08, currency: 'ILS' });
  });
});

describe('Full input serialization simulation', () => {
  test('serializes complete legacy format input like user file', () => {
    // Simulate the exact user file structure
    const legacyInput = {
      birthYear: 1979,
      earlyRetirementYear: 2030,
      fullRetirementAge: 60,
      monthlyContribution: { amount: 20000, currency: "ILS" },
      pensionNetMonthly: { amount: 14000, currency: "ILS" },
      withdrawalRate: 4,
      inflationRate: 3,
      capitalGainsTax: 25,
      usdIlsRate: 3.23,
      expenses: [
        {
          id: 1763301897043,
          type: "לימודים של נועה",
          netAmount: 120000,  // Legacy: number
          currency: "₪",
          year: 2041,
          frequencyYears: 1,
          repetitionCount: 3
        },
        {
          id: 1763304875430,
          type: "Tesla Optimus",
          netAmount: 40000,  // Legacy: number
          currency: "$",
          year: 2033,
          frequencyYears: 5,
          repetitionCount: 10
        }
      ],
      accumulationPortfolio: [
        {
          id: 1763300027149,
          symbol: "TSLA",
          quantity: 2262,
          currentPrice: { amount: 449.06, currency: "USD" },
          averageCost: { amount: 62.56, currency: "USD" },
          method: "CAGR",
          value1: 30,
          value2: 0
        }
      ]
    };

    // Simulate toBackendInput
    const monthlyContribution = extractMoneyValue(legacyInput.monthlyContribution);
    const pensionNetMonthly = extractMoneyValue(legacyInput.pensionNetMonthly);
    
    const expenses = legacyInput.expenses.map(e => ({
      id: Number(e.id) || 0,
      type: String(e.type || ''),
      netAmount: extractMoneyValue(e.netAmount, e.currency),
      year: Number(e.year) || new Date().getFullYear(),
      frequencyYears: Number(e.frequencyYears) || 1,
      repetitionCount: Number(e.repetitionCount) || 1
    }));

    const accumulationPortfolio = legacyInput.accumulationPortfolio.map(a => ({
      id: Number(a.id) || 0,
      symbol: String(a.symbol || ''),
      quantity: Number(a.quantity) || 0,
      currentPrice: extractMoneyValue(a.currentPrice, a.currentPriceCurrency || a.currency),
      averageCost: extractMoneyValue(a.averageCost || a.averageCostPerShare, a.averageCostCurrency || a.currency),
      method: String(a.method || 'CAGR'),
      value1: Number(a.value1) || 0,
      value2: Number(a.value2) || 0
    }));

    // Verify all Money fields are proper objects
    expect(monthlyContribution).toEqual({ amount: 20000, currency: 'ILS' });
    expect(pensionNetMonthly).toEqual({ amount: 14000, currency: 'ILS' });
    
    expect(expenses[0].netAmount).toEqual({ amount: 120000, currency: 'ILS' });
    expect(expenses[1].netAmount).toEqual({ amount: 40000, currency: 'USD' });
    
    expect(accumulationPortfolio[0].currentPrice).toEqual({ amount: 449.06, currency: 'USD' });
    expect(accumulationPortfolio[0].averageCost).toEqual({ amount: 62.56, currency: 'USD' });

    // Verify JSON serialization produces correct format for backend
    const jsonOutput = JSON.stringify({ 
      monthlyContribution, 
      pensionNetMonthly, 
      expenses, 
      accumulationPortfolio 
    });
    
    // Backend expects Money as object with amount and currency
    expect(jsonOutput).toContain('"netAmount":{"amount":120000,"currency":"ILS"}');
    expect(jsonOutput).toContain('"netAmount":{"amount":40000,"currency":"USD"}');
  });
});

describe('RSU Money field serialization', () => {
  test('serializes RSU currentPricePerShare as Money object', () => {
    const rsuConfig = {
      stockSymbol: "NVMI",
      currentPricePerShare: 460.91,
      currency: "$",
      grants: []
    };

    // Simulate the serialization logic
    const serialized = {
      stockSymbol: rsuConfig.stockSymbol,
      currentPricePerShare: {
        amount: Number(rsuConfig.currentPricePerShare) || 0,
        currency: rsuConfig.currency === '₪' || rsuConfig.currency === 'ILS' ? 'ILS' : 'USD'
      }
    };

    expect(serialized.currentPricePerShare).toEqual({
      amount: 460.91,
      currency: 'USD'
    });
  });

  test('serializes RSU grant priceAtGrant as Money object', () => {
    const grant = {
      id: 1,
      priceAtGrant: 240,
      currency: "$",
      numberOfShares: 100
    };

    // Simulate the serialization logic
    const serialized = {
      id: grant.id,
      priceAtGrant: {
        amount: Number(grant.priceAtGrant) || 0,
        currency: grant.currency === '₪' || grant.currency === 'ILS' ? 'ILS' : 'USD'
      },
      numberOfShares: grant.numberOfShares
    };

    expect(serialized.priceAtGrant).toEqual({
      amount: 240,
      currency: 'USD'
    });
  });

  test('serializes RSU grant with ILS currency', () => {
    const grant = {
      id: 1,
      priceAtGrant: 500,
      currency: "₪",
      numberOfShares: 50
    };

    const serialized = {
      priceAtGrant: {
        amount: Number(grant.priceAtGrant) || 0,
        currency: grant.currency === '₪' || grant.currency === 'ILS' ? 'ILS' : 'USD'
      }
    };

    expect(serialized.priceAtGrant).toEqual({
      amount: 500,
      currency: 'ILS'
    });
  });
});
