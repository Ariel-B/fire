namespace FirePlanningTool.Services.Strategies
{
    /// <summary>
    /// Factory for resolving return calculation strategies by name.
    /// Supports dependency injection and strategy registration.
    /// </summary>
    public interface IReturnCalculationStrategyFactory
    {
        /// <summary>
        /// Get a strategy by its name.
        /// </summary>
        /// <param name="strategyName">Name of the strategy to retrieve</param>
        /// <returns>Strategy instance, or default strategy if not found</returns>
        IReturnCalculationStrategy GetStrategy(string strategyName);
    }

    /// <summary>
    /// Default implementation of strategy factory.
    /// Resolves strategies from DI container and falls back to CAGR if strategy not found.
    /// </summary>
    public class ReturnCalculationStrategyFactory : IReturnCalculationStrategyFactory
    {
        private readonly IEnumerable<IReturnCalculationStrategy> _strategies;
        private readonly IReturnCalculationStrategy _defaultStrategy;

        /// <summary>
        /// Initializes a new instance of the ReturnCalculationStrategyFactory class.
        /// </summary>
        /// <param name="strategies">Collection of available return calculation strategies</param>
        public ReturnCalculationStrategyFactory(IEnumerable<IReturnCalculationStrategy> strategies)
        {
            _strategies = strategies ?? throw new ArgumentNullException(nameof(strategies));
            _defaultStrategy = _strategies.FirstOrDefault(s => s.Name == "CAGR") 
                ?? new CagrReturnStrategy();
        }

        /// <inheritdoc />
        public IReturnCalculationStrategy GetStrategy(string strategyName)
        {
            if (string.IsNullOrWhiteSpace(strategyName))
            {
                return _defaultStrategy;
            }

            var strategy = _strategies.FirstOrDefault(s => 
                s.Name.Equals(strategyName, StringComparison.OrdinalIgnoreCase));
            
            return strategy ?? _defaultStrategy;
        }
    }
}
