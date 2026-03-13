/**
 * Currency Conversion Unit Tests
 * Tests for USD/ILS currency conversion functionality
 * 
 * Test Organization:
 * - Basic conversions (USD to ILS and vice versa)
 * - Summary card currency displays
 * - Portfolio value currency conversions
 * - Expense and contribution currency handling
 */

// Mock FIRE App Functions
const mockExchangeRate = 3.6;

function convertToUSD(amount, fromCurrency, exchangeRate = mockExchangeRate) {
    if (!amount || amount === 0 || fromCurrency === '$') {
        return amount || 0;
    }
    
    if (fromCurrency === '₪') {
        return amount / exchangeRate;
    }
    
    return amount;
}

function convertToDisplayCurrency(amount, fromCurrency, displayCurrency = '$', exchangeRate = mockExchangeRate) {
    if (!amount || amount === 0 || fromCurrency === displayCurrency) {
        return amount || 0;
    }
    
    // Convert from source currency to USD
    let amountInUsd = amount;
    if (fromCurrency !== '$') {
        if (fromCurrency === '₪') {
            amountInUsd = amount / exchangeRate;
        }
    }
    
    // Convert from USD to display currency
    if (displayCurrency === '$') {
        return amountInUsd;
    } else {
        return amountInUsd * exchangeRate;
    }
}

// Helper to check floating point equality
function almostEqual(actual, expected, tolerance = 0.01) {
    return Math.abs(actual - expected) < tolerance;
}

describe('Currency Conversion - Basic Functions', () => {
    test('convertToUSD: USD amount should return unchanged', () => {
        const result = convertToUSD(1000, '$');
        expect(result).toBe(1000);
    });

    test('convertToUSD: ILS amount should convert to USD correctly', () => {
        const result = convertToUSD(3600, '₪');
        expect(almostEqual(result, 1000)).toBe(true);
    });

    test('convertToUSD: Zero amount should return zero', () => {
        const result = convertToUSD(0, '₪');
        expect(result).toBe(0);
    });

    test('convertToUSD: Null amount should return zero', () => {
        const result = convertToUSD(null, '₪');
        expect(result).toBe(0);
    });

    test('convertToDisplayCurrency: USD to ILS when display is ILS', () => {
        const result = convertToDisplayCurrency(1000, '$', '₪');
        expect(almostEqual(result, 3600)).toBe(true);
    });

    test('convertToDisplayCurrency: ILS to USD when display is USD', () => {
        const result = convertToDisplayCurrency(3600, '₪', '$');
        expect(almostEqual(result, 1000)).toBe(true);
    });

    test('convertToDisplayCurrency: Same currency returns unchanged', () => {
        const result = convertToDisplayCurrency(1000, '$', '$');
        expect(result).toBe(1000);
    });
});

describe('Currency Conversion - Summary Cards', () => {
    test('Summary card contributions in USD', () => {
        const contributions = 5000;
        const currency = '$';
        const result = convertToDisplayCurrency(contributions, '$', currency);
        expect(result).toBe(5000);
    });

    test('Summary card contributions in ILS', () => {
        const contributions = 5000;
        const currency = '₪';
        const result = convertToDisplayCurrency(contributions, '$', currency);
        expect(almostEqual(result, 18000)).toBe(true);
    });

    test('Summary card withdrawals USD to ILS', () => {
        const withdrawal = 40000;
        const result = convertToDisplayCurrency(withdrawal, '$', '₪');
        expect(almostEqual(result, 144000)).toBe(true);
    });

    test('Summary card monthly expense display', () => {
        const monthlyExpense = 2000;
        const result = convertToDisplayCurrency(monthlyExpense, '$', '$');
        expect(result).toBe(2000);
    });
});

describe('Currency Conversion - Portfolio Values', () => {
    test('Portfolio market value in USD', () => {
        const assetPrice = 250;
        const quantity = 100;
        const value = assetPrice * quantity;
        expect(value).toBe(25000);
    });

    test('Portfolio market value with ILS prices', () => {
        const assetPrice = 900; // 250 * 3.6
        const quantity = 100;
        const valueInIls = assetPrice * quantity;
        const valueInUsd = convertToUSD(valueInIls, '₪');
        expect(almostEqual(valueInUsd, 25000)).toBe(true);
    });

    test('Multiple assets USD total', () => {
        const asset1 = 250 * 100; // VTI: 25000
        const asset2 = 80 * 200;  // BND: 16000
        const total = asset1 + asset2;
        expect(total).toBe(41000);
    });

    test('Multiple assets ILS conversion', () => {
        const totalUsd = 41000;
        const totalIls = totalUsd * mockExchangeRate;
        expect(almostEqual(totalIls, 147600)).toBe(true);
    });
});

describe('Currency Conversion - Expenses', () => {
    test('USD expense conversion to display USD', () => {
        const expense = 5000;
        const result = convertToDisplayCurrency(expense, '$', '$');
        expect(result).toBe(5000);
    });

    test('USD expense conversion to display ILS', () => {
        const expense = 5000;
        const result = convertToDisplayCurrency(expense, '$', '₪');
        expect(almostEqual(result, 18000)).toBe(true);
    });

    test('ILS expense conversion equivalence', () => {
        const expenseUsd = 5000;
        const expenseIls = 18000;
        
        const convertedUsdFromIls = convertToUSD(expenseIls, '₪');
        const convertedIlsFromUsd = convertToDisplayCurrency(expenseUsd, '$', '₪');
        
        expect(almostEqual(convertedUsdFromIls, expenseUsd)).toBe(true);
        expect(almostEqual(convertedIlsFromUsd, expenseIls)).toBe(true);
    });
});

describe('Currency Conversion - Edge Cases', () => {
    test('Very large amounts convert correctly', () => {
        const largeAmount = 1000000;
        const result = convertToUSD(largeAmount * mockExchangeRate, '₪');
        expect(almostEqual(result, largeAmount)).toBe(true);
    });

    test('Fractional amounts convert correctly', () => {
        const fractional = 1234.56;
        const result = convertToUSD(fractional * mockExchangeRate, '₪');
        expect(almostEqual(result, fractional, 0.1)).toBe(true);
    });

    test('Custom exchange rate overrides default', () => {
        const customRate = 4.0;
        const amount = 4000;
        const result = convertToUSD(amount, '₪', customRate);
        expect(almostEqual(result, 1000)).toBe(true);
    });

    test('Round-trip conversion USD to ILS to USD preserves value', () => {
        const original = 5000;
        const toIls = original * mockExchangeRate;
        const backToUsd = toIls / mockExchangeRate;
        expect(almostEqual(backToUsd, original)).toBe(true);
    });
});

describe('Currency Conversion - Multi-Currency Operations', () => {
    test('Add USD and ILS amounts after converting to common currency', () => {
        const usdAmount = 1000;
        const ilsAmount = 3600;
        
        const usdTotal = convertToUSD(usdAmount, '$') + convertToUSD(ilsAmount, '₪');
        expect(almostEqual(usdTotal, 2000)).toBe(true);
    });

    test('Calculate weighted currency exposure', () => {
        const usdAssets = 25000;
        const ilsAssets = 40000; // Equal to 25000 ILS converted to USD = 40000/3.6 ~= 11111
        const ilsInUsd = convertToUSD(ilsAssets, '₪');
        const totalUsd = usdAssets + ilsInUsd;
        
        const usdPercentage = (usdAssets / totalUsd) * 100;
        expect(usdPercentage).toBeGreaterThan(50);
    });
});
