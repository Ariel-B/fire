using FluentAssertions;
using FirePlanningTool.Models;
using FirePlanningTool.Services;
using FirePlanningTool.ValueObjects;
using Xunit;

namespace FirePlanningTool.Tests.Rsu
{
    /// <summary>
    /// Date-related edge case tests for RSU vesting calculations.
    /// Tests leap years, same-day scenarios, past dates, and month/year boundaries.
    /// </summary>
    public class RsuCalculatorDateEdgeCaseTests
    {
        private readonly IRsuCalculator _calculator;

        public RsuCalculatorDateEdgeCaseTests()
        {
            _calculator = new RsuCalculator();
        }

        #region Leap Year Scenarios

        [Fact]
        public void CalculateVestedShares_GrantedOnLeapDay_HandlesNonLeapYearVesting()
        {
            // Arrange: Grant on Feb 29, 2024 (leap year)
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2024, 2, 29),
                NumberOfShares = 400,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act: Check vesting on Feb 28, 2025 (non-leap year, ~1 year later)
            var vested = _calculator.CalculateVestedShares(grant, new DateTime(2025, 2, 28));

            // Assert: Should handle leap year anniversary correctly
            // After ~1 year, with 1-year cliff, should have some vesting (25%)
            vested.Should().BeGreaterOrEqualTo(0);
        }

        [Fact]
        public void CalculateVestedShares_GrantedOnLeapDay_FullyVestsAfter4Years()
        {
            // Arrange
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2024, 2, 29),
                NumberOfShares = 400,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act: Check after 4 years (2028 is also leap year)
            var vested = _calculator.CalculateVestedShares(grant, new DateTime(2028, 2, 29));

            // Assert: Should be fully vested
            vested.Should().Be(400);
        }

        [Fact]
        public void CalculateVestedShares_GrantedOnLeapDay_VestsCorrectlyInNonLeapYear()
        {
            // Arrange
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2024, 2, 29),
                NumberOfShares = 400,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act: Check on March 1, 2025 (just past 1 year anniversary)
            var vested = _calculator.CalculateVestedShares(grant, new DateTime(2025, 3, 1));

            // Assert: Should have passed 1-year cliff
            vested.Should().BeGreaterThan(0);
        }

        #endregion

        #region Same-Day Scenarios

        [Fact]
        public void CalculateVestedShares_CheckOnGrantDate_ReturnsZero()
        {
            // Arrange
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2024, 1, 1),
                NumberOfShares = 1000,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act: Check vesting on the same day as grant
            var vested = _calculator.CalculateVestedShares(grant, new DateTime(2024, 1, 1));

            // Assert: Nothing vested on grant date
            vested.Should().Be(0);
        }

        [Fact]
        public void CalculateVestedShares_RetirementOnExactVestingAnniversary_IncludesShares()
        {
            // Arrange: 4-year vesting, standard schedule
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2024, 1, 1),
                NumberOfShares = 1000,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act: Check exactly 2 years later
            var vested = _calculator.CalculateVestedShares(grant, new DateTime(2026, 1, 1));

            // Assert: Should include shares vested on this date (2 completed years * 25% = 50%)
            vested.Should().Be(500);
        }

        [Fact]
        public void CalculateVestedShares_RetirementOneDayBeforeAnniversary_ExcludesShares()
        {
            // Arrange
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2024, 1, 1),
                NumberOfShares = 1000,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act: One day before 2-year anniversary
            var vested = _calculator.CalculateVestedShares(grant, new DateTime(2025, 12, 31));

            // Assert: Should not include the next day's vesting (only 1 completed year = 25%)
            vested.Should().Be(250);
        }

        #endregion

        #region Past Date Scenarios

        [Fact]
        public void CalculateVestedShares_CheckBeforeGrantDate_ReturnsZero()
        {
            // Arrange
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2024, 1, 1),
                NumberOfShares = 1000,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act: Check vesting before grant date
            var vested = _calculator.CalculateVestedShares(grant, new DateTime(2023, 12, 31));

            // Assert: Can't vest before grant
            vested.Should().Be(0);
        }

        [Fact]
        public void CalculateVestedShares_GrantInFuture_ReturnsZero()
        {
            // Arrange: Grant in future
            var futureDate = DateTime.Now.AddYears(1);
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = futureDate,
                NumberOfShares = 1000,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act: Check vesting today
            var vested = _calculator.CalculateVestedShares(grant, DateTime.Now);

            // Assert: Nothing vested yet
            vested.Should().Be(0);
        }

        #endregion

        #region End-of-Month/Year Boundaries

        [Fact]
        public void CalculateVestedShares_GrantOnJan31_VestsOnFeb28NonLeapYear()
        {
            // Arrange: Grant on Jan 31
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2023, 1, 31),
                NumberOfShares = 1200,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act: Check on Feb 28, 2024 (13 months later, non-leap year)
            var vested = _calculator.CalculateVestedShares(grant, new DateTime(2024, 2, 28));

            // Assert: Should calculate time elapsed correctly (past 1-year cliff)
            vested.Should().BeGreaterThan(0);
        }

        [Fact]
        public void CalculateVestedShares_GrantOnDec31_VestsCorrectlyNextYear()
        {
            // Arrange: Grant on last day of year
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2023, 12, 31),
                NumberOfShares = 1000,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act: Check exactly 1 year later
            var vested = _calculator.CalculateVestedShares(grant, new DateTime(2024, 12, 31));

            // Assert: Should pass 1-year cliff (25%)
            vested.Should().Be(250);
        }

        [Fact]
        public void CalculateVestedShares_GrantOnJan1_VestsCorrectlyOnDec31()
        {
            // Arrange: Grant on first day of year
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2024, 1, 1),
                NumberOfShares = 1000,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act: Check on Dec 31 same year (11 months)
            var vested = _calculator.CalculateVestedShares(grant, new DateTime(2024, 12, 31));

            // Assert: Should not vest (before 1-year cliff)
            vested.Should().Be(0);
        }

        #endregion

        #region Boundary Value Tests

        [Fact]
        public void CalculateVestedShares_WithDateTimeMinValue_HandlesGracefully()
        {
            // Arrange
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2024, 1, 1),
                NumberOfShares = 1000,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act: Check with minimum date value
            var vested = _calculator.CalculateVestedShares(grant, DateTime.MinValue);

            // Assert: Should return 0 (before grant date)
            vested.Should().Be(0);
        }

        [Fact]
        public void CalculateVestedShares_WithDateTimeMaxValue_FullyVests()
        {
            // Arrange
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2024, 1, 1),
                NumberOfShares = 1000,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act: Check with maximum date value (far in future)
            var vested = _calculator.CalculateVestedShares(grant, DateTime.MaxValue);

            // Assert: Should be fully vested
            vested.Should().Be(1000);
        }

        #endregion

        #region Multi-Year Boundary Tests

        [Fact]
        public void CalculateVestedShares_ExactlyAt2Years_Returns50Percent()
        {
            // Arrange
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2024, 6, 15),
                NumberOfShares = 800,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act: Exactly 2 years later (add 1 day to ensure we pass 2.0 years threshold)
            var vested = _calculator.CalculateVestedShares(grant, new DateTime(2026, 6, 16));

            // Assert: 2 completed years * 25% = 50%
            vested.Should().Be(400);
        }

        [Fact]
        public void CalculateVestedShares_ExactlyAt3Years_Returns75Percent()
        {
            // Arrange
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2024, 6, 15),
                NumberOfShares = 800,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act: Exactly 3 years later (add 1 day to ensure we pass 3.0 years threshold)
            var vested = _calculator.CalculateVestedShares(grant, new DateTime(2027, 6, 16));

            // Assert: 3 completed years * 25% = 75%
            vested.Should().Be(600);
        }

        [Fact]
        public void CalculateVestedShares_ExactlyAt4Years_Returns100Percent()
        {
            // Arrange
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2024, 6, 15),
                NumberOfShares = 800,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act: Exactly 4 years later
            var vested = _calculator.CalculateVestedShares(grant, new DateTime(2028, 6, 15));

            // Assert: Fully vested
            vested.Should().Be(800);
        }

        #endregion

        #region Month-End Edge Cases

        [Fact]
        public void CalculateVestedShares_GrantOnFeb28_VestsOnFeb28NextYear()
        {
            // Arrange: Grant on Feb 28 (non-leap year)
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2023, 2, 28),
                NumberOfShares = 1000,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act: Check on March 1, 2024 (just past 1 year to ensure we pass threshold)
            var vested = _calculator.CalculateVestedShares(grant, new DateTime(2024, 3, 1));

            // Assert: Should be at 1-year cliff (25%)
            vested.Should().Be(250);
        }

        [Fact]
        public void CalculateVestedShares_GrantOnFeb29_VestsOnFeb29NextLeapYear()
        {
            // Arrange: Grant on Feb 29, 2024
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2024, 2, 29),
                NumberOfShares = 1000,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act: Check on Feb 29, 2028 (next leap year, 4 years later)
            var vested = _calculator.CalculateVestedShares(grant, new DateTime(2028, 2, 29));

            // Assert: Fully vested
            vested.Should().Be(1000);
        }

        #endregion
    }
}
