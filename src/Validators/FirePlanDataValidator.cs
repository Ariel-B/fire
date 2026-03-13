using FluentValidation;
using FirePlanningTool.Models;

namespace FirePlanningTool.Validators
{
    /// <summary>
    /// Validator for FirePlanData model used for saving FIRE plans.
    /// Validates that plan data is not null/empty.
    /// </summary>
    public class FirePlanDataValidator : AbstractValidator<FirePlanData>
    {
        /// <summary>
        /// Initializes a new instance of the FirePlanDataValidator with validation rules.
        /// </summary>
        public FirePlanDataValidator()
        {
            RuleFor(x => x)
                .NotNull()
                .WithMessage("Plan data is required");

            RuleFor(x => x.Inputs)
                .NotNull()
                .WithMessage("Plan inputs are required");
        }
    }
}
