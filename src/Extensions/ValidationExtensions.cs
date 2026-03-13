using FluentValidation.Results;
using FirePlanningTool.Models;

namespace FirePlanningTool.Extensions
{
    /// <summary>
    /// Extension methods for converting FluentValidation results to Result pattern.
    /// Bridges between FluentValidation and Result pattern for consistent error handling.
    /// </summary>
    public static class ValidationExtensions
    {
        /// <summary>
        /// Converts FluentValidation ValidationResult to Result pattern.
        /// </summary>
        /// <typeparam name="T">Type of the validated object</typeparam>
        /// <param name="validationResult">FluentValidation result</param>
        /// <param name="value">The validated value (if validation succeeded)</param>
        /// <returns>Result containing the value or validation errors</returns>
        public static Result<T> ToResult<T>(this ValidationResult validationResult, T value)
        {
            if (validationResult.IsValid)
            {
                return Result<T>.Success(value);
            }

            var errors = string.Join("; ", validationResult.Errors.Select(e => e.ErrorMessage));
            return Result<T>.Failure(Error.Validation(errors));
        }
    }
}
