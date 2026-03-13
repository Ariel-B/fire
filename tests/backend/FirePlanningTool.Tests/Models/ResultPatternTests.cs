using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.Models
{
    /// <summary>
    /// Tests for Result pattern implementation.
    /// Validates the core Result<T> and Error types work correctly.
    /// </summary>
    public class ResultPatternTests
    {
        #region Result<T> Success Tests

        [Fact]
        public void Result_Success_HasIsSuccessTrue()
        {
            var result = Result<int>.Success(42);

            result.IsSuccess.Should().BeTrue();
            result.IsFailure.Should().BeFalse();
        }

        [Fact]
        public void Result_Success_ReturnsValue()
        {
            var result = Result<int>.Success(42);

            result.Value.Should().Be(42);
        }

        [Fact]
        public void Result_Success_AccessingError_Throws()
        {
            var result = Result<int>.Success(42);

            Action act = () => { var _ = result.Error; };

            act.Should().Throw<InvalidOperationException>()
                .WithMessage("Cannot access Error on a successful result");
        }

        #endregion

        #region Result<T> Failure Tests

        [Fact]
        public void Result_Failure_HasIsFailureTrue()
        {
            var error = Error.Validation("Test error");
            var result = Result<int>.Failure(error);

            result.IsFailure.Should().BeTrue();
            result.IsSuccess.Should().BeFalse();
        }

        [Fact]
        public void Result_Failure_ReturnsError()
        {
            var error = Error.Validation("Test error");
            var result = Result<int>.Failure(error);

            result.Error.Should().Be(error);
            result.Error.Code.Should().Be("VALIDATION_ERROR");
            result.Error.Message.Should().Be("Test error");
        }

        [Fact]
        public void Result_Failure_AccessingValue_Throws()
        {
            var error = Error.Validation("Test error");
            var result = Result<int>.Failure(error);

            Action act = () => { var _ = result.Value; };

            act.Should().Throw<InvalidOperationException>()
                .WithMessage("Cannot access Value on a failed result*");
        }

        [Fact]
        public void Result_Failure_WithCodeAndMessage_CreatesError()
        {
            var result = Result<int>.Failure("CUSTOM_ERROR", "Custom message");

            result.IsFailure.Should().BeTrue();
            result.Error.Code.Should().Be("CUSTOM_ERROR");
            result.Error.Message.Should().Be("Custom message");
        }

        #endregion

        #region Error Factory Methods Tests

        [Fact]
        public void Error_Validation_CreatesValidationError()
        {
            var error = Error.Validation("Invalid input");

            error.Code.Should().Be("VALIDATION_ERROR");
            error.Message.Should().Be("Invalid input");
        }

        [Fact]
        public void Error_NotFound_CreatesNotFoundError()
        {
            var error = Error.NotFound("Resource not found");

            error.Code.Should().Be("NOT_FOUND");
            error.Message.Should().Be("Resource not found");
        }

        [Fact]
        public void Error_InvalidOperation_CreatesInvalidOperationError()
        {
            var error = Error.InvalidOperation("Operation not allowed");

            error.Code.Should().Be("INVALID_OPERATION");
            error.Message.Should().Be("Operation not allowed");
        }

        [Fact]
        public void Error_General_CreatesGeneralError()
        {
            var error = Error.General("Something went wrong");

            error.Code.Should().Be("ERROR");
            error.Message.Should().Be("Something went wrong");
        }

        #endregion

        #region Result<T> Functional Methods Tests

        [Fact]
        public void Result_OnSuccess_ExecutesAction_WhenSuccess()
        {
            var result = Result<int>.Success(42);
            var executed = false;

            result.OnSuccess(value =>
            {
                executed = true;
                value.Should().Be(42);
            });

            executed.Should().BeTrue();
        }

        [Fact]
        public void Result_OnSuccess_DoesNotExecuteAction_WhenFailure()
        {
            var result = Result<int>.Failure(Error.General("Error"));
            var executed = false;

            result.OnSuccess(value => executed = true);

            executed.Should().BeFalse();
        }

        [Fact]
        public void Result_OnFailure_ExecutesAction_WhenFailure()
        {
            var result = Result<int>.Failure(Error.Validation("Test error"));
            var executed = false;

            result.OnFailure(error =>
            {
                executed = true;
                error.Code.Should().Be("VALIDATION_ERROR");
            });

            executed.Should().BeTrue();
        }

        [Fact]
        public void Result_OnFailure_DoesNotExecuteAction_WhenSuccess()
        {
            var result = Result<int>.Success(42);
            var executed = false;

            result.OnFailure(error => executed = true);

            executed.Should().BeFalse();
        }

        [Fact]
        public void Result_Map_TransformsValue_WhenSuccess()
        {
            var result = Result<int>.Success(42);

            var mappedResult = result.Map(value => value.ToString());

            mappedResult.IsSuccess.Should().BeTrue();
            mappedResult.Value.Should().Be("42");
        }

        [Fact]
        public void Result_Map_PreservesError_WhenFailure()
        {
            var error = Error.Validation("Test error");
            var result = Result<int>.Failure(error);

            var mappedResult = result.Map(value => value.ToString());

            mappedResult.IsFailure.Should().BeTrue();
            mappedResult.Error.Should().Be(error);
        }

        [Fact]
        public void Result_Match_ReturnsSuccessResult_WhenSuccess()
        {
            var result = Result<int>.Success(42);

            var output = result.Match(
                onSuccess: value => $"Success: {value}",
                onFailure: error => $"Error: {error.Message}");

            output.Should().Be("Success: 42");
        }

        [Fact]
        public void Result_Match_ReturnsFailureResult_WhenFailure()
        {
            var result = Result<int>.Failure(Error.Validation("Invalid"));

            var output = result.Match(
                onSuccess: value => $"Success: {value}",
                onFailure: error => $"Error: {error.Message}");

            output.Should().Be("Error: Invalid");
        }

        #endregion

        #region Result (non-generic) Tests

        [Fact]
        public void Result_Success_CreatesSuccessResult()
        {
            var result = Result.Success();

            result.IsSuccess.Should().BeTrue();
            result.IsFailure.Should().BeFalse();
        }

        [Fact]
        public void Result_Failure_CreatesFailureResult()
        {
            var error = Error.Validation("Test error");
            var result = Result.Failure(error);

            result.IsFailure.Should().BeTrue();
            result.IsSuccess.Should().BeFalse();
            result.Error.Should().Be(error);
        }

        [Fact]
        public void Result_NonGeneric_AccessingError_WhenSuccess_Throws()
        {
            var result = Result.Success();

            Action act = () => { var _ = result.Error; };

            act.Should().Throw<InvalidOperationException>()
                .WithMessage("Cannot access Error on a successful result");
        }

        [Fact]
        public void Result_NonGeneric_OnFailure_Executes_WhenFailure()
        {
            var result = Result.Failure(Error.General("Error"));
            var executed = false;

            result.OnFailure(error => executed = true);

            executed.Should().BeTrue();
        }

        #endregion
    }
}
