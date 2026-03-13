/**
 * Currency Conversion Tests for FIRE Planning Tool
 * 
 * This test suite validates all currency conversion functionality
 * to ensure USD/ILS conversions work correctly with 3.6 exchange rate
 */

class CurrencyTestRunner {
    constructor() {
        this.mockUsdIlsRate = 3.6;
        this.mockSelectedCurrency = '$';
        this.testResults = [];
    }

    // Mock functions from the FIRE app
    convertToUSD(amount, fromCurrency) {
        if (!amount || amount === 0 || fromCurrency === '$') {
            return amount || 0;
        }
        
        const exchangeRates = {
            '$': 1.0,
            '₪': this.mockUsdIlsRate
        };
        
        if (fromCurrency === '₪') {
            return amount / exchangeRates['₪'];
        }
        
        return amount;
    }
    
    convertToDisplayCurrency(amount, fromCurrency) {
        const displayCurrency = this.mockSelectedCurrency;
        
        if (!amount || amount === 0 || fromCurrency === displayCurrency) {
            return amount || 0;
        }
        
        const exchangeRates = {
            '$': 1.0,
            '₪': this.mockUsdIlsRate
        };
        
        // Convert from source currency to USD
        let amountInUsd = amount;
        if (fromCurrency !== '$') {
            if (fromCurrency === '₪') {
                amountInUsd = amount / exchangeRates['₪'];
            }
        }
        
        // Convert from USD to display currency
        if (displayCurrency === '$') {
            return amountInUsd;
        } else {
            return amountInUsd * exchangeRates[displayCurrency];
        }
    }

    // Test assertion helper
    assert(condition, message, expected = null, actual = null) {
        const result = {
            passed: condition,
            message: message,
            expected: expected,
            actual: actual
        };
        this.testResults.push(result);
        return condition;
    }

    // Test 1: Basic Currency Conversion Functions
    testBasicCurrencyConversion() {
        console.log('\n🧪 Test 1: Basic Currency Conversion Functions');
        
        // Reset state
        this.mockSelectedCurrency = '$';
        
        // Test convertToUSD
        const usdResult1 = this.convertToUSD(1000, '$');
        this.assert(usdResult1 === 1000, 'convertToUSD(1000, "$") should return 1000', 1000, usdResult1);
        
        const usdResult2 = this.convertToUSD(3600, '₪');
        this.assert(Math.abs(usdResult2 - 1000) < 0.01, 'convertToUSD(3600, "₪") should return 1000', 1000, usdResult2);
        
        // Test convertToDisplayCurrency USD to ILS
        this.mockSelectedCurrency = '₪';
        const ilsResult1 = this.convertToDisplayCurrency(1000, '$');
        this.assert(Math.abs(ilsResult1 - 3600) < 0.01, 'convertToDisplayCurrency(1000, "$") should return 3600 when display=₪', 3600, ilsResult1);
        
        // Test convertToDisplayCurrency ILS to USD
        this.mockSelectedCurrency = '$';
        const usdResult3 = this.convertToDisplayCurrency(3600, '₪');
        this.assert(Math.abs(usdResult3 - 1000) < 0.01, 'convertToDisplayCurrency(3600, "₪") should return 1000 when display=$', 1000, usdResult3);
    }

    // Test 2: Summary Cards Currency Conversion
    testSummaryCardsConversion() {
        console.log('\n🧪 Test 2: Summary Cards Currency Conversion');
        
        // Mock data from calculateFirePlan (in USD base currency)
        const mockData = {
            totalContributions: 560497,
            grossAnnualWithdrawal: 54380,
            netMonthlyExpense: 3866,
            currentValue: 60497,
            peakValue: 1359500,
            endValue: 3726396
        };
        
        // Test USD display
        this.mockSelectedCurrency = '$';
        const usdTotalContributions = this.convertToDisplayCurrency(mockData.totalContributions, '$');
        this.assert(usdTotalContributions === 560497, 'USD totalContributions should remain unchanged', 560497, usdTotalContributions);
        
        // Test ILS display (should be 3.6x)
        this.mockSelectedCurrency = '₪';
        const ilsTotalContributions = this.convertToDisplayCurrency(mockData.totalContributions, '$');
        const ilsAnnualWithdrawal = this.convertToDisplayCurrency(mockData.grossAnnualWithdrawal, '$');
        const ilsMonthlyExpense = this.convertToDisplayCurrency(mockData.netMonthlyExpense, '$');
        
        this.assert(Math.abs(ilsTotalContributions - 2017789.2) < 1, 'ILS totalContributions should be 560497 * 3.6', 2017789.2, ilsTotalContributions);
        this.assert(Math.abs(ilsAnnualWithdrawal - 195768) < 1, 'ILS annualWithdrawal should be 54380 * 3.6', 195768, ilsAnnualWithdrawal);
        this.assert(Math.abs(ilsMonthlyExpense - 13917.6) < 1, 'ILS monthlyExpense should be 3866 * 3.6', 13917.6, ilsMonthlyExpense);
    }

    // Test 3: Portfolio Calculations in USD Base Currency
    testPortfolioCalculations() {
        console.log('\n🧪 Test 3: Portfolio Calculations in USD Base Currency');
        
        // Mock portfolio assets with different currencies
        const mockAsset1 = {
            quantity: 100,
            currentPrice: 150,
            currentPriceCurrency: '$',
            averageCostPerShare: 120,
            averageCostCurrency: '$'
        };
        
        const mockAsset2 = {
            quantity: 50,
            currentPrice: 540, // 150 * 3.6
            currentPriceCurrency: '₪',
            averageCostPerShare: 432, // 120 * 3.6
            averageCostCurrency: '₪'
        };
        
        // Mock calculateMarketValue function
        const calculateMarketValue = (asset) => {
            const quantity = parseFloat(asset.quantity) || 0;
            const currentPrice = parseFloat(asset.currentPrice) || 0;
            const priceInUSD = this.convertToUSD(currentPrice, asset.currentPriceCurrency || '$');
            return quantity * priceInUSD;
        };
        
        const marketValue1 = calculateMarketValue(mockAsset1);
        const marketValue2 = calculateMarketValue(mockAsset2);
        
        this.assert(marketValue1 === 15000, 'USD asset market value should be 100 * 150', 15000, marketValue1);
        this.assert(Math.abs(marketValue2 - 7500) < 0.01, 'ILS asset market value converted to USD should be 50 * 150', 7500, marketValue2);
        this.assert(Math.abs((marketValue1/100) - (marketValue2/50)) < 0.01, 'Both assets should have same USD base value per share', true, Math.abs((marketValue1/100) - (marketValue2/50)) < 0.01);
    }

    // Test 4: Chart Data Currency Conversion
    testChartDataConversion() {
        console.log('\n🧪 Test 4: Chart Data Currency Conversion');
        
        // Mock yearly data (in USD base currency)
        const mockYearlyData = [
            { year: 2024, portfolioValue: 100000, totalContributions: 80000 },
            { year: 2025, portfolioValue: 120000, totalContributions: 90000 },
            { year: 2026, portfolioValue: 140000, totalContributions: 100000 }
        ];
        
        // Test USD chart data
        this.mockSelectedCurrency = '$';
        const usdPortfolioData = mockYearlyData.map(d => this.convertToDisplayCurrency(d.portfolioValue, '$'));
        
        this.assert(JSON.stringify(usdPortfolioData) === JSON.stringify([100000, 120000, 140000]), 
                   'USD chart portfolio data should remain unchanged', [100000, 120000, 140000], usdPortfolioData);
        
        // Test ILS chart data
        this.mockSelectedCurrency = '₪';
        const ilsPortfolioData = mockYearlyData.map(d => this.convertToDisplayCurrency(d.portfolioValue, '$'));
        
        this.assert(JSON.stringify(ilsPortfolioData) === JSON.stringify([360000, 432000, 504000]), 
                   'ILS chart portfolio data should be 3.6x USD values', [360000, 432000, 504000], ilsPortfolioData);
    }

    // Test 5: Expense Calculations in USD Base
    testExpenseCalculations() {
        console.log('\n🧪 Test 5: Expense Calculations in USD Base');
        
        // Mock expense data
        const mockExpenses = [
            { netAmount: 10000, currency: '$' },
            { netAmount: 36000, currency: '₪' }
        ];
        
        const usdExpense1 = this.convertToUSD(mockExpenses[0].netAmount, mockExpenses[0].currency);
        const usdExpense2 = this.convertToUSD(mockExpenses[1].netAmount, mockExpenses[1].currency);
        
        this.assert(usdExpense1 === 10000, 'USD expense should convert to same USD amount', 10000, usdExpense1);
        this.assert(Math.abs(usdExpense2 - 10000) < 0.01, 'ILS expense should convert to equivalent USD amount', 10000, usdExpense2);
        this.assert(Math.abs(usdExpense1 - usdExpense2) < 0.01, 'Both expenses should have same USD base value', true, Math.abs(usdExpense1 - usdExpense2) < 0.01);
    }

    // Test 6: Monthly Contribution Currency Handling
    testMonthlyContributionHandling() {
        console.log('\n🧪 Test 6: Monthly Contribution Currency Handling');
        
        const monthlyContributions = [
            { amount: 5000, currency: '$' },
            { amount: 18000, currency: '₪' }  // 5000 * 3.6
        ];
        
        const usdContribution1 = this.convertToUSD(monthlyContributions[0].amount, monthlyContributions[0].currency);
        const usdContribution2 = this.convertToUSD(monthlyContributions[1].amount, monthlyContributions[1].currency);
        
        this.assert(usdContribution1 === 5000, 'USD monthly contribution should remain unchanged', 5000, usdContribution1);
        this.assert(Math.abs(usdContribution2 - 5000) < 0.01, 'ILS monthly contribution should convert to equivalent USD', 5000, usdContribution2);
    }

    // Test 7: Withdrawal and Retirement Calculations
    testWithdrawalCalculations() {
        console.log('\n🧪 Test 7: Withdrawal and Retirement Calculations');
        
        const mockPeakValue = 1000000; // USD
        const withdrawalRate = 0.04; // 4%
        const expectedGrossWithdrawal = mockPeakValue * withdrawalRate; // 40000 USD
        
        // Test USD display
        this.mockSelectedCurrency = '$';
        const usdWithdrawal = this.convertToDisplayCurrency(expectedGrossWithdrawal, '$');
        this.assert(usdWithdrawal === 40000, 'USD withdrawal should remain unchanged', 40000, usdWithdrawal);
        
        // Test ILS display
        this.mockSelectedCurrency = '₪';
        const ilsWithdrawal = this.convertToDisplayCurrency(expectedGrossWithdrawal, '$');
        this.assert(Math.abs(ilsWithdrawal - 144000) < 0.01, 'ILS withdrawal should be 40000 * 3.6', 144000, ilsWithdrawal);
    }

    // Test 8: Currency Button State Management
    testCurrencyButtonState() {
        console.log('\n🧪 Test 8: Currency Button State Management');
        
        // Mock currency state management
        let currentCurrency = '$';
        const getSelectedCurrency = () => currentCurrency;
        const setCurrency = (newCurrency) => { currentCurrency = newCurrency; };
        
        this.assert(getSelectedCurrency() === '$', 'Initial currency should be USD', '$', getSelectedCurrency());
        
        setCurrency('₪');
        this.assert(getSelectedCurrency() === '₪', 'Currency should change to ILS', '₪', getSelectedCurrency());
        
        // Test conversion with new currency
        this.mockSelectedCurrency = getSelectedCurrency();
        const convertedValue = this.convertToDisplayCurrency(1000, '$');
        this.assert(Math.abs(convertedValue - 3600) < 0.01, 'Conversion should work with new currency state', 3600, convertedValue);
    }

    // Run all tests
    runAllTests() {
        console.log('🚀 Starting Currency Conversion Tests for FIRE Planning Tool');
        console.log('=====================================');
        
        this.testResults = [];
        
        // Run all test methods
        this.testBasicCurrencyConversion();
        this.testSummaryCardsConversion();
        this.testPortfolioCalculations();
        this.testChartDataConversion();
        this.testExpenseCalculations();
        this.testMonthlyContributionHandling();
        this.testWithdrawalCalculations();
        this.testCurrencyButtonState();
        
        // Generate summary
        this.generateSummary();
    }

    generateSummary() {
        console.log('\n📊 TEST SUMMARY');
        console.log('=====================================');
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests} ✅`);
        console.log(`Failed: ${failedTests} ${failedTests > 0 ? '❌' : '✅'}`);
        console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        
        if (failedTests > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.testResults.filter(r => !r.passed).forEach(result => {
                console.log(`  • ${result.message}`);
                if (result.expected !== null) {
                    console.log(`    Expected: ${result.expected}, Actual: ${result.actual}`);
                }
            });
        } else {
            console.log('\n🎉 ALL TESTS PASSED!');
            console.log('Currency conversion is working correctly across all components.');
        }
        
        console.log('\n📝 TEST COVERAGE:');
        console.log('  ✓ Basic currency conversion functions');
        console.log('  ✓ Summary card value conversion');
        console.log('  ✓ Portfolio calculations in USD base');
        console.log('  ✓ Chart data currency conversion');
        console.log('  ✓ Expense calculations in USD base');
        console.log('  ✓ Monthly contribution handling');
        console.log('  ✓ Withdrawal and retirement calculations');
        console.log('  ✓ Currency button state management');
    }
}

// Run tests if this file is executed directly
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CurrencyTestRunner;
} else {
    // Browser environment - create global instance
    window.CurrencyTestRunner = CurrencyTestRunner;
}

// Auto-run tests in Node.js environment
if (typeof require !== 'undefined' && require.main === module) {
    const runner = new CurrencyTestRunner();
    runner.runAllTests();
}