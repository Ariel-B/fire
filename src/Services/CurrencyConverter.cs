using FirePlanningTool.ValueObjects;
using System;
using System.Collections.Generic;
using System.Linq;

namespace FirePlanningTool.Services
{
    /// <summary>
    /// Interface for currency conversion operations
    /// </summary>
    public interface ICurrencyConverter
    {
        /// <summary>
        /// Convert an amount from one currency to another
        /// </summary>
        decimal ConvertToDisplayCurrency(decimal amount, string fromCurrency, string displayCurrency);

        /// <summary>
        /// Convert an amount to USD (base currency)
        /// </summary>
        decimal ConvertToUsd(decimal amount, string currency);

        /// <summary>
        /// Convert an amount to ILS (for Israeli tax calculations)
        /// </summary>
        decimal ConvertToIls(decimal amount, string currency);

        /// <summary>
        /// Convert an amount from ILS to another currency
        /// </summary>
        decimal ConvertFromIls(decimal amount, string targetCurrency);

        /// <summary>
        /// Convert an amount from USD to another currency
        /// </summary>
        decimal ConvertFromUsd(decimal amount, string targetCurrency);

        /// <summary>
        /// Update the USD/ILS exchange rate (backward compatibility)
        /// </summary>
        void UpdateUsdIlsRate(decimal newRate);

        /// <summary>
        /// Update or set an exchange rate between two currencies
        /// </summary>
        void UpdateExchangeRate(string fromCurrency, string toCurrency, decimal rate);

        /// <summary>
        /// Get the exchange rate for a currency (relative to USD)
        /// </summary>
        decimal GetExchangeRate(string currency);

        /// <summary>
        /// Get the exchange rate between two currencies
        /// </summary>
        decimal GetExchangeRate(string fromCurrency, string toCurrency);

        /// <summary>
        /// Get the current USD/ILS exchange rate
        /// </summary>
        decimal GetUsdIlsRate();

        /// <summary>
        /// Get list of supported currencies
        /// </summary>
        IEnumerable<string> GetSupportedCurrencies();

        /// <summary>
        /// Convert a Money value to another currency (type-safe)
        /// </summary>
        Money Convert(Money amount, string targetCurrency);

        /// <summary>
        /// Convert a Money value to USD (type-safe)
        /// </summary>
        Money ConvertToUsd(Money amount);

        /// <summary>
        /// Convert a Money value to ILS (type-safe)
        /// </summary>
        Money ConvertToIls(Money amount);
    }

    /// <summary>
    /// Currency converter supporting multiple currencies with extensible exchange rates.
    /// USD is the base currency, and all conversions go through USD as an intermediate.
    /// </summary>
    public class CurrencyConverter : ICurrencyConverter
    {
        // Exchange rates stored as: fromCurrency -> toCurrency -> rate
        private readonly Dictionary<string, Dictionary<string, decimal>> _exchangeRates;
        private const string USD_SYMBOL = "$";
        private const string ILS_SYMBOL = "₪";

        /// <summary>
        /// Initializes a new instance of the CurrencyConverter.
        /// </summary>
        /// <param name="usdIlsRate">USD to ILS exchange rate (default: 3.6)</param>
        public CurrencyConverter(decimal usdIlsRate = 3.6m)
        {
            _exchangeRates = new Dictionary<string, Dictionary<string, decimal>>
            {
                // USD as base currency
                ["USD"] = new Dictionary<string, decimal>
                {
                    ["USD"] = 1.0m,
                    ["ILS"] = usdIlsRate
                },
                // ILS rates
                ["ILS"] = new Dictionary<string, decimal>
                {
                    ["USD"] = usdIlsRate > 0 ? 1m / usdIlsRate : 0,
                    ["ILS"] = 1.0m
                }
            };

            // Add symbol mappings for backward compatibility
            _exchangeRates[USD_SYMBOL] = _exchangeRates["USD"];
            _exchangeRates[ILS_SYMBOL] = _exchangeRates["ILS"];
        }

        /// <inheritdoc />
        public decimal ConvertToDisplayCurrency(decimal amount, string fromCurrency, string displayCurrency)
        {
            if (amount == 0)
                return amount;

            // Safety fallback: if either currency is null/empty, return amount unchanged
            if (string.IsNullOrEmpty(fromCurrency) || string.IsNullOrEmpty(displayCurrency))
                return amount;

            // Normalize currencies to ISO codes
            fromCurrency = NormalizeCurrency(fromCurrency);
            displayCurrency = NormalizeCurrency(displayCurrency);

            if (fromCurrency == displayCurrency)
                return amount;

            // Validate currencies are supported
            if (!SupportedCurrencies.IsSupported(fromCurrency))
                throw new ArgumentException($"Unsupported currency: {fromCurrency}");
            if (!SupportedCurrencies.IsSupported(displayCurrency))
                throw new ArgumentException($"Unsupported display currency: {displayCurrency}");

            // Try direct conversion
            if (_exchangeRates.TryGetValue(fromCurrency, out var rates) &&
                rates.TryGetValue(displayCurrency, out var rate))
            {
                // Safety fallback: if rate is invalid, return amount unchanged
                if (rate <= 0)
                    return amount;

                return amount * rate;
            }

            // Try conversion via USD (base currency)
            if (fromCurrency != "USD" && displayCurrency != "USD")
            {
                var amountInUsd = ConvertToUsd(amount, fromCurrency);
                return ConvertFromUsd(amountInUsd, displayCurrency);
            }

            throw new InvalidOperationException(
                $"No exchange rate found for {fromCurrency} to {displayCurrency}");
        }

        /// <inheritdoc />
        public decimal ConvertToUsd(decimal amount, string currency)
        {
            if (amount == 0)
                return amount;

            // Safety fallback: if currency is null/empty, return amount unchanged
            if (string.IsNullOrEmpty(currency))
                return amount;

            currency = NormalizeCurrency(currency);

            if (currency == "USD")
                return amount;

            if (_exchangeRates.TryGetValue(currency, out var rates) &&
                rates.TryGetValue("USD", out var rate))
            {
                // Safety fallback: if rate is invalid, return amount unchanged
                if (rate <= 0)
                    return amount;

                return amount * rate;
            }

            throw new ArgumentException($"Cannot convert from {currency} to USD");
        }

        /// <inheritdoc />
        public decimal ConvertFromUsd(decimal amount, string targetCurrency)
        {
            if (amount == 0)
                return amount;

            // Safety fallback: if targetCurrency is null/empty, return amount unchanged
            if (string.IsNullOrEmpty(targetCurrency))
                return amount;

            targetCurrency = NormalizeCurrency(targetCurrency);

            if (targetCurrency == "USD")
                return amount;

            if (_exchangeRates.TryGetValue("USD", out var rates) &&
                rates.TryGetValue(targetCurrency, out var rate))
            {
                // Safety fallback: if rate is invalid, return amount unchanged
                if (rate <= 0)
                    return amount;

                return amount * rate;
            }

            throw new ArgumentException($"Cannot convert from USD to {targetCurrency}");
        }

        /// <inheritdoc />
        public decimal ConvertToIls(decimal amount, string currency)
        {
            return ConvertToDisplayCurrency(amount, currency, "ILS");
        }

        /// <inheritdoc />
        public decimal ConvertFromIls(decimal amount, string targetCurrency)
        {
            return ConvertToDisplayCurrency(amount, "ILS", targetCurrency);
        }

        /// <inheritdoc />
        public void UpdateUsdIlsRate(decimal newRate)
        {
            UpdateExchangeRate("USD", "ILS", newRate);
        }

        /// <inheritdoc />
        public void UpdateExchangeRate(string fromCurrency, string toCurrency, decimal rate)
        {
            if (rate <= 0)
                throw new ArgumentException("Exchange rate must be positive", nameof(rate));

            // Normalize currencies
            fromCurrency = NormalizeCurrency(fromCurrency);
            toCurrency = NormalizeCurrency(toCurrency);

            // Validate currencies are supported
            if (!SupportedCurrencies.IsSupported(fromCurrency))
                throw new ArgumentException($"Unsupported currency: {fromCurrency}");
            if (!SupportedCurrencies.IsSupported(toCurrency))
                throw new ArgumentException($"Unsupported currency: {toCurrency}");

            // Store both directions
            if (!_exchangeRates.ContainsKey(fromCurrency))
                _exchangeRates[fromCurrency] = new Dictionary<string, decimal>();

            _exchangeRates[fromCurrency][toCurrency] = rate;

            // Store inverse rate
            if (!_exchangeRates.ContainsKey(toCurrency))
                _exchangeRates[toCurrency] = new Dictionary<string, decimal>();

            _exchangeRates[toCurrency][fromCurrency] = rate > 0 ? 1m / rate : 0;

            // Update symbol mappings if applicable
            var fromSymbol = SupportedCurrencies.GetSymbol(fromCurrency);
            var toSymbol = SupportedCurrencies.GetSymbol(toCurrency);

            if (fromSymbol != fromCurrency)
            {
                if (!_exchangeRates.ContainsKey(fromSymbol))
                    _exchangeRates[fromSymbol] = new Dictionary<string, decimal>();
                _exchangeRates[fromSymbol][toCurrency] = rate;
            }

            if (toSymbol != toCurrency)
            {
                if (!_exchangeRates.ContainsKey(toSymbol))
                    _exchangeRates[toSymbol] = new Dictionary<string, decimal>();
                _exchangeRates[fromCurrency][toSymbol] = rate;
            }
        }

        /// <inheritdoc />
        public decimal GetExchangeRate(string currency)
        {
            currency = NormalizeCurrency(currency);
            return GetExchangeRate("USD", currency);
        }

        /// <inheritdoc />
        public decimal GetExchangeRate(string fromCurrency, string toCurrency)
        {
            fromCurrency = NormalizeCurrency(fromCurrency);
            toCurrency = NormalizeCurrency(toCurrency);

            if (fromCurrency == toCurrency)
                return 1.0m;

            if (_exchangeRates.TryGetValue(fromCurrency, out var rates) &&
                rates.TryGetValue(toCurrency, out var rate))
            {
                return rate;
            }

            // Try via USD
            if (fromCurrency != "USD" && toCurrency != "USD")
            {
                var toUsdRate = GetExchangeRate(fromCurrency, "USD");
                var fromUsdRate = GetExchangeRate("USD", toCurrency);
                if (toUsdRate > 0 && fromUsdRate > 0)
                    return toUsdRate * fromUsdRate;
            }

            return 0;
        }

        /// <inheritdoc />
        public decimal GetUsdIlsRate()
        {
            return GetExchangeRate("USD", "ILS");
        }

        /// <inheritdoc />
        public IEnumerable<string> GetSupportedCurrencies()
        {
            return _exchangeRates.Keys.Where(k => k.All(char.IsUpper)).Distinct();
        }

        /// <summary>
        /// Normalizes currency to ISO code using SupportedCurrencies registry.
        /// </summary>
        private string NormalizeCurrency(string currency)
        {
            if (string.IsNullOrEmpty(currency))
                return "USD";

            return SupportedCurrencies.GetCode(currency);
        }

        /// <inheritdoc />
        public Money Convert(Money amount, string targetCurrency)
        {
            targetCurrency = NormalizeCurrency(targetCurrency);

            if (amount.Currency == targetCurrency)
                return amount;

            var convertedAmount = ConvertToDisplayCurrency(amount.Amount, amount.Currency, targetCurrency);
            return Money.Create(convertedAmount, targetCurrency);
        }

        /// <inheritdoc />
        public Money ConvertToUsd(Money amount)
        {
            return Convert(amount, "USD");
        }

        /// <inheritdoc />
        public Money ConvertToIls(Money amount)
        {
            return Convert(amount, "ILS");
        }
    }
}