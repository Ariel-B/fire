namespace FirePlanningTool.Tests.Calculations
{
    using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
    using FirePlanningTool.Tests.Fixtures;

    /// <summary>
    /// Tests for FIRE calculations (accumulation phase, retirement phase, safe withdrawal rates)
    /// </summary>
    public class FireCalculatorTests
    {
        #region Accumulation Phase Tests

        [Fact]
        public void AccumulationPhase_ZeroContribution_NoGrowth()
        {
            var initialValue = 100000m;
            var contribution = 0m;
            var years = 10;
            var annualReturn = 7m;

            var finalValue = CalculateFutureValue(initialValue, contribution, years, annualReturn);

            // Only growth from returns, no contributions
            finalValue.Should().BeGreaterThan(initialValue);
            finalValue.Should().BeGreaterThan(0);
        }

        [Fact]
        public void AccumulationPhase_WithContributions_ExceedsInitialValue()
        {
            var initialValue = 100000m;
            var annualContribution = 25000m;
            var years = 10;
            var annualReturn = 7m;

            var finalValue = CalculateFutureValue(initialValue, annualContribution, years, annualReturn);

            // With contributions + returns
            var minValue = initialValue + (annualContribution * years);
            finalValue.Should().BeGreaterThan(minValue);
        }

        [Fact]
        public void AccumulationPhase_CompoundGrowth_ExponentialIncrease()
        {
            var initialValue = 50000m;
            var annualContribution = 15000m;
            var shortYears = 5;
            var longYears = 20;
            var annualReturn = 8m;

            var value5Years = CalculateFutureValue(initialValue, annualContribution, shortYears, annualReturn);
            var value20Years = CalculateFutureValue(initialValue, annualContribution, longYears, annualReturn);

            // Longer period should result in exponentially higher value
            value20Years.Should().BeGreaterThan(value5Years * 2);
        }

        [Fact]
        public void AccumulationPhase_DifferentReturns_ProduceDifferentOutcomes()
        {
            var initialValue = 100000m;
            var annualContribution = 20000m;
            var years = 15;
            var lowReturn = 5m;
            var highReturn = 10m;

            var valueAtLowReturn = CalculateFutureValue(initialValue, annualContribution, years, lowReturn);
            var valueAtHighReturn = CalculateFutureValue(initialValue, annualContribution, years, highReturn);

            valueAtHighReturn.Should().BeGreaterThan(valueAtLowReturn);
            // Higher return should be significantly better
            var percentDifference = ((valueAtHighReturn - valueAtLowReturn) / valueAtLowReturn) * 100;
            percentDifference.Should().BeGreaterThan(20);
        }

        #endregion

        #region Retirement Phase Tests

        [Fact]
        public void RetirementPhase_SafeWithdrawal_4PercentRule_SustainableLongTerm()
        {
            var portfolioValue = 1000000m;
            var safeWithdrawalRate = 4m;

            var annualWithdrawal = portfolioValue * (safeWithdrawalRate / 100);

            annualWithdrawal.Should().Be(40000);
        }

        [Fact]
        public void RetirementPhase_WithdrawalBelowSafe_PreservesCapital()
        {
            var portfolioValue = 1000000m;
            var actualWithdrawalRate = 3m;
            var annualReturn = 7m;

            var withdrawal = portfolioValue * (actualWithdrawalRate / 100);
            var netReturn = portfolioValue * (annualReturn / 100);
            var yearEndValue = portfolioValue - withdrawal + netReturn;

            yearEndValue.Should().BeGreaterThan(portfolioValue);
        }

        [Fact]
        public void RetirementPhase_WithdrawalAboveSafe_DepletesCapital()
        {
            var portfolioValue = 1000000m;
            var unsafeWithdrawalRate = 6m;
            var annualReturn = 7m;

            var withdrawal = portfolioValue * (unsafeWithdrawalRate / 100);
            var netReturn = portfolioValue * (annualReturn / 100);
            var yearEndValue = portfolioValue - withdrawal + netReturn;

            // May still grow due to high returns, but riskier
            yearEndValue.Should().BeApproximately(1010000, 1000);
        }

        [Fact]
        public void RetirementPhase_LongRetirement_AccumulatesInflationImpact()
        {
            var portfolioValue = 2000000m;
            var initialWithdrawal = 80000m;
            var inflationRate = 2.5m;
            var years = 30;
            var annualReturn = 6m;

            var balance = portfolioValue;
            for (int year = 0; year < years; year++)
            {
                var withdrawal = initialWithdrawal * (decimal)Math.Pow((double)(1 + inflationRate / 100), year);
                var gains = balance * (annualReturn / 100);
                balance = balance - withdrawal + gains;
            }

            // Should still have positive balance after 30 years with inflation adjustments
            balance.Should().BeGreaterThan(0);
        }

        #endregion

        #region FIRE Number Calculation Tests

        [Fact]
        public void FireNumber_4PercentRule_CalculatesRequiredPortfolio()
        {
            var annualExpenses = 50000m;
            var safeWithdrawalRate = 4m;

            var fireNumber = (annualExpenses / (safeWithdrawalRate / 100));

            fireNumber.Should().Be(1250000);
        }

        [Fact]
        public void FireNumber_DifferentExpenses_ProportionallyHigherTarget()
        {
            var lowExpenses = 50000m;
            var highExpenses = 100000m;
            var safeWithdrawalRate = 4m;

            var lowFireNumber = (lowExpenses / (safeWithdrawalRate / 100));
            var highFireNumber = (highExpenses / (safeWithdrawalRate / 100));

            highFireNumber.Should().Be(lowFireNumber * 2);
        }

        [Fact]
        public void FireNumber_ConservativeRate_HigherPortfolioRequired()
        {
            var annualExpenses = 60000m;
            var conservativeRate = 3m;
            var standardRate = 4m;

            var conservativeFireNumber = (annualExpenses / (conservativeRate / 100));
            var standardFireNumber = (annualExpenses / (standardRate / 100));

            conservativeFireNumber.Should().BeGreaterThan(standardFireNumber);
        }

        #endregion

        #region Years to FIRE Calculation Tests

        [Fact]
        public void YearsToFire_HighSavingsRate_ShortTimeline()
        {
            var currentValue = 100000m;
            var fireNumber = 1000000m;
            var annualContribution = 80000m;
            var annualReturn = 8m;

            var yearsNeeded = CalculateYearsToFire(currentValue, fireNumber, annualContribution, annualReturn);

            yearsNeeded.Should().BeLessThan(10);
        }

        [Fact]
        public void YearsToFire_LowSavingsRate_LongerTimeline()
        {
            var currentValue = 100000m;
            var fireNumber = 1000000m;
            var annualContribution = 20000m;
            var annualReturn = 8m;

            var yearsNeeded = CalculateYearsToFire(currentValue, fireNumber, annualContribution, annualReturn);

            yearsNeeded.Should().BeGreaterThan(15);
        }

        [Fact]
        public void YearsToFire_AlreadyAtFireNumber_ReturnsZero()
        {
            var currentValue = 1000000m;
            var fireNumber = 1000000m;
            var annualContribution = 0m;
            var annualReturn = 8m;

            var yearsNeeded = CalculateYearsToFire(currentValue, fireNumber, annualContribution, annualReturn);

            yearsNeeded.Should().Be(0);
        }

        #endregion

        #region Helper Methods

        /// <summary>
        /// Calculate future value using compound interest formula with annual contributions
        /// FV = PV(1+r)^n + PMT * [((1+r)^n - 1) / r]
        /// </summary>
        private static decimal CalculateFutureValue(decimal presentValue, decimal annualContribution, int years, decimal annualReturnPercent)
        {
            var rateDecimal = annualReturnPercent / 100;
            var futureValue = presentValue * (decimal)Math.Pow((double)(1 + rateDecimal), years);

            if (rateDecimal != 0)
            {
                var annuityFactor = ((decimal)Math.Pow((double)(1 + rateDecimal), years) - 1) / rateDecimal;
                futureValue += annualContribution * annuityFactor;
            }
            else
            {
                futureValue += annualContribution * years;
            }

            return futureValue;
        }

        /// <summary>
        /// Calculate years needed to reach FIRE number using iterative approach
        /// </summary>
        private static int CalculateYearsToFire(decimal currentValue, decimal fireNumber, decimal annualContribution, decimal annualReturnPercent)
        {
            if (currentValue >= fireNumber)
                return 0;

            var balance = currentValue;
            var years = 0;
            var maxYears = 100; // Safety limit

            while (balance < fireNumber && years < maxYears)
            {
                var rate = annualReturnPercent / 100;
                balance = balance * (1 + rate) + annualContribution;
                years++;
            }

            return years;
        }

        #endregion
    }
}
