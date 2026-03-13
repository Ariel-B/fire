using FirePlanningTool.Validators;
using FluentAssertions;
using FluentValidation.TestHelper;
using Xunit;

namespace FirePlanningTool.Tests.Validators
{
    public class JsonLoadRequestValidatorTests
    {
        private readonly JsonLoadRequestValidator _validator;

        public JsonLoadRequestValidatorTests()
        {
            _validator = new JsonLoadRequestValidator();
        }

        [Fact]
        public void JsonData_Null_HasValidationError()
        {
            var request = new JsonLoadRequest { JsonData = null! };
            var result = _validator.TestValidate(request);
            result.ShouldHaveValidationErrorFor(x => x.JsonData)
                .WithErrorMessage("JSON data is required");
        }

        [Fact]
        public void JsonData_Empty_HasValidationError()
        {
            var request = new JsonLoadRequest { JsonData = "" };
            var result = _validator.TestValidate(request);
            result.ShouldHaveValidationErrorFor(x => x.JsonData)
                .WithErrorMessage("JSON data is required");
        }

        [Fact]
        public void JsonData_WhitespaceOnly_HasValidationError()
        {
            var request = new JsonLoadRequest { JsonData = "   " };
            var result = _validator.TestValidate(request);
            result.ShouldHaveValidationErrorFor(x => x.JsonData)
                .WithErrorMessage("JSON data is required");
        }

        [Fact]
        public void JsonData_TooLarge_HasValidationError()
        {
            var request = new JsonLoadRequest 
            { 
                JsonData = new string('x', 5_000_001) 
            };
            var result = _validator.TestValidate(request);
            result.ShouldHaveValidationErrorFor(x => x.JsonData)
                .WithErrorMessage("JSON data too large");
        }

        [Fact]
        public void JsonData_AtMaximumSize_DoesNotHaveValidationError()
        {
            var request = new JsonLoadRequest 
            { 
                JsonData = new string('x', 5_000_000) 
            };
            var result = _validator.TestValidate(request);
            result.ShouldNotHaveValidationErrorFor(x => x.JsonData);
        }

        [Fact]
        public void JsonData_Valid_DoesNotHaveValidationErrors()
        {
            var request = new JsonLoadRequest 
            { 
                JsonData = "{\"Inputs\":{\"BirthYear\":\"1990\"}}" 
            };
            var result = _validator.TestValidate(request);
            result.ShouldNotHaveAnyValidationErrors();
        }

        [Fact]
        public void JsonData_SmallValid_DoesNotHaveValidationErrors()
        {
            var request = new JsonLoadRequest 
            { 
                JsonData = "{}" 
            };
            var result = _validator.TestValidate(request);
            result.ShouldNotHaveAnyValidationErrors();
        }
    }
}
