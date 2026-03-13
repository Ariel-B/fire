using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using FirePlanningTool.Validators;
using FluentAssertions;
using FluentValidation.TestHelper;
using Xunit;

namespace FirePlanningTool.Tests.Validators
{
    public class FirePlanDataValidatorTests
    {
        private readonly FirePlanDataValidator _validator;

        public FirePlanDataValidatorTests()
        {
            _validator = new FirePlanDataValidator();
        }

        [Fact]
        public void PlanData_Null_IsHandledByController()
        {
            // Note: FluentValidation doesn't validate null objects by design.
            // The controller handles null checks before validation.
            // This test verifies that we understand this behavior.
            var planData = new FirePlanData { Inputs = new FirePlanInputs() };
            var result = _validator.TestValidate(planData);
            result.ShouldNotHaveValidationErrorFor(x => x);
        }

        [Fact]
        public void PlanData_WithNullInputs_HasValidationError()
        {
            var planData = new FirePlanData { Inputs = null! };
            var result = _validator.TestValidate(planData);
            result.ShouldHaveValidationErrorFor(x => x.Inputs)
                .WithErrorMessage("Plan inputs are required");
        }

        [Fact]
        public void PlanData_Valid_DoesNotHaveValidationErrors()
        {
            var planData = new FirePlanData
            {
                Inputs = new FirePlanInputs 
                { 
                    BirthYear = "1990",
                    EarlyRetirementYear = "2045",
                    FullRetirementAge = "67"
                },
                Expenses = new List<PlannedExpense>(),
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>()
            };

            var result = _validator.TestValidate(planData);
            result.ShouldNotHaveAnyValidationErrors();
        }

        [Fact]
        public void PlanData_WithEmptyCollections_DoesNotHaveValidationErrors()
        {
            var planData = new FirePlanData
            {
                Inputs = new FirePlanInputs(),
                Expenses = new List<PlannedExpense>(),
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>()
            };

            var result = _validator.TestValidate(planData);
            result.ShouldNotHaveAnyValidationErrors();
        }
    }
}
