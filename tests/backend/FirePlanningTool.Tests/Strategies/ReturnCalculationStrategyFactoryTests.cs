using FirePlanningTool.Services.Strategies;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.Strategies
{
    public class ReturnCalculationStrategyFactoryTests
    {
        private readonly ReturnCalculationStrategyFactory _factory;
        private readonly List<IReturnCalculationStrategy> _strategies;

        public ReturnCalculationStrategyFactoryTests()
        {
            _strategies = new List<IReturnCalculationStrategy>
            {
                new CagrReturnStrategy(),
                new TotalGrowthReturnStrategy(),
                new TargetPriceReturnStrategy(),
                new FixedReturnStrategy()
            };
            _factory = new ReturnCalculationStrategyFactory(_strategies);
        }

        [Fact]
        public void GetStrategy_WithCAGR_ReturnsCAGRStrategy()
        {
            var strategy = _factory.GetStrategy("CAGR");

            strategy.Should().NotBeNull();
            strategy.Name.Should().Be("CAGR");
            strategy.Should().BeOfType<CagrReturnStrategy>();
        }

        [Fact]
        public void GetStrategy_WithTotalGrowth_ReturnsTotalGrowthStrategy()
        {
            var strategy = _factory.GetStrategy("צמיחה כוללת");

            strategy.Should().NotBeNull();
            strategy.Name.Should().Be("צמיחה כוללת");
            strategy.Should().BeOfType<TotalGrowthReturnStrategy>();
        }

        [Fact]
        public void GetStrategy_WithTargetPrice_ReturnsTargetPriceStrategy()
        {
            var strategy = _factory.GetStrategy("מחיר יעד");

            strategy.Should().NotBeNull();
            strategy.Name.Should().Be("מחיר יעד");
            strategy.Should().BeOfType<TargetPriceReturnStrategy>();
        }

        [Fact]
        public void GetStrategy_CaseInsensitive_ReturnsCAGRStrategy()
        {
            var strategy = _factory.GetStrategy("cagr");

            strategy.Should().NotBeNull();
            strategy.Name.Should().Be("CAGR");
        }

        [Fact]
        public void GetStrategy_WithUnknownName_ReturnsDefaultCAGRStrategy()
        {
            var strategy = _factory.GetStrategy("UnknownMethod");

            strategy.Should().NotBeNull();
            strategy.Name.Should().Be("CAGR");
        }

        [Fact]
        public void GetStrategy_WithNull_ReturnsDefaultCAGRStrategy()
        {
            var strategy = _factory.GetStrategy(null!);

            strategy.Should().NotBeNull();
            strategy.Name.Should().Be("CAGR");
        }

        [Fact]
        public void GetStrategy_WithEmptyString_ReturnsDefaultCAGRStrategy()
        {
            var strategy = _factory.GetStrategy("");

            strategy.Should().NotBeNull();
            strategy.Name.Should().Be("CAGR");
        }

        [Fact]
        public void GetStrategy_WithWhitespace_ReturnsDefaultCAGRStrategy()
        {
            var strategy = _factory.GetStrategy("   ");

            strategy.Should().NotBeNull();
            strategy.Name.Should().Be("CAGR");
        }

        [Fact]
        public void Constructor_WithNullStrategies_ThrowsArgumentNullException()
        {
            Action act = () => new ReturnCalculationStrategyFactory(null!);

            act.Should().Throw<ArgumentNullException>()
                .WithParameterName("strategies");
        }

        [Fact]
        public void Constructor_WithEmptyStrategies_CreatesFactoryWithDefaultStrategy()
        {
            var factory = new ReturnCalculationStrategyFactory(new List<IReturnCalculationStrategy>());

            var strategy = factory.GetStrategy("anything");

            strategy.Should().NotBeNull();
            strategy.Name.Should().Be("CAGR");
        }
    }
}
