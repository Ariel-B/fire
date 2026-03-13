using FluentValidation;

namespace FirePlanningTool.Validators
{
    /// <summary>
    /// Request model for JSON string validation in LoadPlan endpoint.
    /// </summary>
    public class JsonLoadRequest
    {
        /// <summary>
        /// Gets or sets the JSON string containing the FIRE plan data.
        /// </summary>
        public string JsonData { get; set; } = string.Empty;
    }

    /// <summary>
    /// Validator for JSON string used in LoadPlan endpoint.
    /// Validates that JSON is not empty and within size limits.
    /// </summary>
    public class JsonLoadRequestValidator : AbstractValidator<JsonLoadRequest>
    {
        private const int MaxJsonSize = 5_000_000;

        /// <summary>
        /// Initializes a new instance of the JsonLoadRequestValidator with validation rules.
        /// </summary>
        public JsonLoadRequestValidator()
        {
            RuleFor(x => x.JsonData)
                .NotEmpty()
                .WithMessage("JSON data is required");

            RuleFor(x => x.JsonData)
                .Must(json => json.Length <= MaxJsonSize)
                .WithMessage("JSON data too large")
                .When(x => !string.IsNullOrWhiteSpace(x.JsonData));
        }
    }
}
