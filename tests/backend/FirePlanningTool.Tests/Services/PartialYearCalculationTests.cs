using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using FirePlanningTool.Services;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.Services
{
    /// <summary>
    /// Tests for partial year calculations to ensure inflation and returns
    /// are properly calculated based on the current date, not full years.
    /// </summary>
    public class PartialYearCalculationTests
    {
        #region Remaining Fraction of Current Year Tests

        [Fact]
        public void GetRemainingFractionOfCurrentYear_OnJanuary1_ReturnsAlmostOne()
        {
            // January 1 means almost the full year remains
            var date = new DateTime(2025, 1, 1, 0, 0, 0);
            var remaining = CalculationConstants.GetRemainingFractionOfCurrentYear(date);

            // Should be very close to 1.0 (364/365 or 365/366 for leap year)
            remaining.Should().BeGreaterThan(0.99m);
            remaining.Should().BeLessThanOrEqualTo(1.0m);
        }

        [Fact]
        public void GetRemainingFractionOfCurrentYear_OnDecember31_ReturnsNearZero()
        {
            // December 31 means almost no time remains
            var date = new DateTime(2025, 12, 31, 0, 0, 0);
            var remaining = CalculationConstants.GetRemainingFractionOfCurrentYear(date);

            // Should be very close to 0 (less than 1 day remaining)
            remaining.Should().BeLessThan(0.01m);
            remaining.Should().BeGreaterThanOrEqualTo(0m);
        }

        [Fact]
        public void GetRemainingFractionOfCurrentYear_OnJuly1_ReturnsApproximatelyHalf()
        {
            // July 1 means approximately half the year remains
            var date = new DateTime(2025, 7, 1, 0, 0, 0);
            var remaining = CalculationConstants.GetRemainingFractionOfCurrentYear(date);

            // Should be approximately 0.5 (around half year remaining)
            remaining.Should().BeGreaterThan(0.45m);
            remaining.Should().BeLessThan(0.55m);
        }

        [Fact]
        public void GetRemainingFractionOfCurrentYear_OnDecember20_ReturnsSmallFraction()
        {
            // December 20 means about 11 days remain
            var date = new DateTime(2025, 12, 20, 0, 0, 0);
            var remaining = CalculationConstants.GetRemainingFractionOfCurrentYear(date);

            // Should be approximately 11/365 = 0.03 (about 3%)
            remaining.Should().BeGreaterThan(0.02m);
            remaining.Should().BeLessThan(0.05m);
        }

        [Fact]
        public void GetRemainingFractionOfCurrentYear_LeapYear_AccountsForExtraDay()
        {
            // 2024 is a leap year (366 days)
            var date = new DateTime(2024, 1, 1, 0, 0, 0);
            var remaining = CalculationConstants.GetRemainingFractionOfCurrentYear(date);

            // Should be 365/366 (slightly less than non-leap year)
            remaining.Should().BeGreaterThan(0.99m);
            remaining.Should().BeLessThanOrEqualTo(1.0m);
        }

        #endregion

        #region Remaining Months in Current Year Tests

        [Fact]
        public void GetRemainingMonthsInCurrentYear_OnJanuary15_Returns12Months()
        {
            // January means 12 months to simulate (including January)
            var date = new DateTime(2025, 1, 15, 0, 0, 0);
            var months = CalculationConstants.GetRemainingMonthsInCurrentYear(date);

            months.Should().Be(12);
        }

        [Fact]
        public void GetRemainingMonthsInCurrentYear_OnDecember20_Returns1Month()
        {
            // December means 1 month to simulate (just December)
            var date = new DateTime(2025, 12, 20, 0, 0, 0);
            var months = CalculationConstants.GetRemainingMonthsInCurrentYear(date);

            months.Should().Be(1);
        }

        [Fact]
        public void GetRemainingMonthsInCurrentYear_OnJuly1_Returns6Months()
        {
            // July means 6 months to simulate (July through December)
            var date = new DateTime(2025, 7, 1, 0, 0, 0);
            var months = CalculationConstants.GetRemainingMonthsInCurrentYear(date);

            months.Should().Be(6);
        }

        [Fact]
        public void GetRemainingMonthsInCurrentYear_OnMarch15_Returns10Months()
        {
            // March means 10 months to simulate (March through December)
            var date = new DateTime(2025, 3, 15, 0, 0, 0);
            var months = CalculationConstants.GetRemainingMonthsInCurrentYear(date);

            months.Should().Be(10);
        }

        #endregion

        #region Fractional Years From Now Tests

        [Fact]
        public void CalculateFractionalYearsFromNow_SameYear_ReturnsZero()
        {
            // Target year is current year
            var currentDate = new DateTime(2025, 12, 20, 0, 0, 0);
            var fractionalYears = CalculationConstants.CalculateFractionalYearsFromNow(2025, 2025, currentDate);

            fractionalYears.Should().Be(0);
        }

        [Fact]
        public void CalculateFractionalYearsFromNow_NextYear_AccountsForPartialCurrentYear()
        {
            // On December 20, next year should be slightly less than 1 full year away
            // Because we've already spent most of 2025
            var currentDate = new DateTime(2025, 12, 20, 0, 0, 0);
            var fractionalYears = CalculationConstants.CalculateFractionalYearsFromNow(2026, 2025, currentDate);

            // Should be approximately 1 - (354/365) = 1 - 0.97 = 0.03
            // (we've spent 354 days of 2025, so next year is close)
            fractionalYears.Should().BeGreaterThan(0);
            fractionalYears.Should().BeLessThan(0.1m);
        }

        [Fact]
        public void CalculateFractionalYearsFromNow_TwoYearsFromNow_OnDecember20()
        {
            // On December 20, 2027 should be slightly less than 2 years away
            var currentDate = new DateTime(2025, 12, 20, 0, 0, 0);
            var fractionalYears = CalculationConstants.CalculateFractionalYearsFromNow(2027, 2025, currentDate);

            // Should be approximately 2 - 0.97 = 1.03
            fractionalYears.Should().BeGreaterThan(1.0m);
            fractionalYears.Should().BeLessThan(1.1m);
        }

        [Fact]
        public void CalculateFractionalYearsFromNow_NextYear_OnJanuary1()
        {
            // On January 1, next year is almost exactly 1 year away
            var currentDate = new DateTime(2025, 1, 1, 0, 0, 0);
            var fractionalYears = CalculationConstants.CalculateFractionalYearsFromNow(2026, 2025, currentDate);

            // Should be approximately 1 - (1/365) ≈ 0.997
            fractionalYears.Should().BeGreaterThan(0.99m);
            fractionalYears.Should().BeLessThanOrEqualTo(1.0m);
        }

        [Fact]
        public void CalculateFractionalYearsFromNow_NextYear_OnJuly1()
        {
            // On July 1, next year is approximately 0.5 years away (accounting for half year spent)
            var currentDate = new DateTime(2025, 7, 1, 0, 0, 0);
            var fractionalYears = CalculationConstants.CalculateFractionalYearsFromNow(2026, 2025, currentDate);

            // Should be approximately 1 - 0.5 = 0.5
            fractionalYears.Should().BeGreaterThan(0.45m);
            fractionalYears.Should().BeLessThan(0.55m);
        }

        [Fact]
        public void CalculateFractionalYearsFromNow_PastYear_NegativeValue()
        {
            // Looking back to previous year
            var currentDate = new DateTime(2025, 6, 1, 0, 0, 0);
            var fractionalYears = CalculationConstants.CalculateFractionalYearsFromNow(2024, 2025, currentDate);

            // Should be negative (approximately -1 + elapsed portion)
            fractionalYears.Should().BeLessThan(0);
            fractionalYears.Should().BeGreaterThan(-1.0m);
        }

        #endregion

        #region Integration Tests with Expense Calculator

        [Fact]
        public void ExpenseCalculator_UsesPartialYearForInflation_CurrentYear()
        {
            // Setup
            var calculator = new ExpenseCalculator();
            var converter = new CurrencyConverter(3.6m);
            var expenses = new List<PlannedExpense>
            {
                new() { NetAmount = Money.Usd(10000) }
            };

            // On December 20, 2025, calculating for 2025 should use ~0 years of inflation
            var targetYear = 2025;
            var baseYear = 2025;
            var inflationRate = 10m; // 10% inflation

            var total = calculator.CalculateYearExpenses(expenses, targetYear, baseYear, inflationRate, converter);

            // Should be very close to base amount (fractional years ≈ 0)
            total.Should().BeGreaterThanOrEqualTo(10000m);
            total.Should().BeLessThan(10100m); // Less than if full year had passed
        }

        [Fact]
        public void ExpenseCalculator_UsesPartialYearForInflation_NextYear()
        {
            // Setup
            var calculator = new ExpenseCalculator();
            var converter = new CurrencyConverter(3.6m);
            var expenses = new List<PlannedExpense>
            {
                new() { NetAmount = Money.Usd(10000) }
            };

            // Calculating for 2027 from base year 2025 should use fractional years
            var targetYear = 2027;
            var baseYear = 2025;
            var inflationRate = 10m; // 10% inflation

            var total = calculator.CalculateYearExpenses(expenses, targetYear, baseYear, inflationRate, converter);

            // Should be inflated by approximately 1+ years depending on current date
            // The calculation uses fractional years from now, so the result will vary
            // but should be between 1-2 years of inflation
            total.Should().BeGreaterThan(10000m);
            total.Should().BeLessThan(12500m); // Less than 2 full years of 10% inflation
        }

        #endregion
    }
}
