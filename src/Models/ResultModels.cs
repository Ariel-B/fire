namespace FirePlanningTool.Models
{
    /// <summary>
    /// Represents an error with a code and message for Result pattern.
    /// </summary>
    public class Error
    {
        /// <summary>
        /// Error code for programmatic identification.
        /// </summary>
        public string Code { get; }

        /// <summary>
        /// Human-readable error message.
        /// </summary>
        public string Message { get; }

        /// <summary>
        /// Creates a new Error.
        /// </summary>
        public Error(string code, string message)
        {
            Code = code;
            Message = message;
        }

        /// <summary>
        /// Factory method for validation errors.
        /// </summary>
        public static Error Validation(string message) => 
            new Error("VALIDATION_ERROR", message);

        /// <summary>
        /// Factory method for not found errors.
        /// </summary>
        public static Error NotFound(string message) => 
            new Error("NOT_FOUND", message);

        /// <summary>
        /// Factory method for invalid operation errors.
        /// </summary>
        public static Error InvalidOperation(string message) => 
            new Error("INVALID_OPERATION", message);

        /// <summary>
        /// Factory method for general errors.
        /// </summary>
        public static Error General(string message) => 
            new Error("ERROR", message);
    }

    /// <summary>
    /// Represents the result of an operation that can either succeed with a value or fail with an error.
    /// This pattern eliminates the need for exception throwing in expected error scenarios,
    /// improving performance and making error handling explicit.
    /// </summary>
    /// <typeparam name="T">Type of the success value</typeparam>
    public class Result<T>
    {
        /// <summary>
        /// The success value if operation succeeded.
        /// </summary>
        private readonly T? _value;

        /// <summary>
        /// The error if operation failed.
        /// </summary>
        private readonly Error? _error;

        /// <summary>
        /// Indicates whether the operation succeeded.
        /// </summary>
        public bool IsSuccess { get; }

        /// <summary>
        /// Indicates whether the operation failed.
        /// </summary>
        public bool IsFailure => !IsSuccess;

        /// <summary>
        /// Gets the success value. Throws InvalidOperationException if result is a failure.
        /// </summary>
        /// <exception cref="InvalidOperationException">Thrown when accessing Value on a failed result</exception>
        public T Value
        {
            get
            {
                if (IsFailure)
                {
                    throw new InvalidOperationException($"Cannot access Value on a failed result. Error: {_error?.Message}");
                }
                return _value!;
            }
        }

        /// <summary>
        /// Gets the error. Throws InvalidOperationException if result is a success.
        /// </summary>
        /// <exception cref="InvalidOperationException">Thrown when accessing Error on a successful result</exception>
        public Error Error
        {
            get
            {
                if (IsSuccess)
                {
                    throw new InvalidOperationException("Cannot access Error on a successful result");
                }
                return _error!;
            }
        }

        /// <summary>
        /// Private constructor for success result.
        /// </summary>
        private Result(T value)
        {
            _value = value;
            _error = null;
            IsSuccess = true;
        }

        /// <summary>
        /// Private constructor for failure result.
        /// </summary>
        private Result(Error error)
        {
            _value = default;
            _error = error;
            IsSuccess = false;
        }

        /// <summary>
        /// Creates a success result with a value.
        /// </summary>
        public static Result<T> Success(T value) => new Result<T>(value);

        /// <summary>
        /// Creates a failure result with an error.
        /// </summary>
        public static Result<T> Failure(Error error) => new Result<T>(error);

        /// <summary>
        /// Creates a failure result with error code and message.
        /// </summary>
        public static Result<T> Failure(string code, string message) => 
            new Result<T>(new Error(code, message));

        /// <summary>
        /// Executes an action if the result is a success.
        /// </summary>
        public Result<T> OnSuccess(Action<T> action)
        {
            if (IsSuccess)
            {
                action(_value!);
            }
            return this;
        }

        /// <summary>
        /// Executes an action if the result is a failure.
        /// </summary>
        public Result<T> OnFailure(Action<Error> action)
        {
            if (IsFailure)
            {
                action(_error!);
            }
            return this;
        }

        /// <summary>
        /// Maps the success value to another type.
        /// </summary>
        public Result<TNew> Map<TNew>(Func<T, TNew> mapper)
        {
            if (IsFailure)
            {
                return Result<TNew>.Failure(_error!);
            }
            return Result<TNew>.Success(mapper(_value!));
        }

        /// <summary>
        /// Matches the result to one of two functions based on success or failure.
        /// </summary>
        public TResult Match<TResult>(
            Func<T, TResult> onSuccess,
            Func<Error, TResult> onFailure)
        {
            return IsSuccess ? onSuccess(_value!) : onFailure(_error!);
        }
    }

    /// <summary>
    /// Represents the result of an operation that doesn't return a value.
    /// </summary>
    public class Result
    {
        private readonly Error? _error;

        /// <summary>
        /// Indicates whether the operation succeeded.
        /// </summary>
        public bool IsSuccess { get; }

        /// <summary>
        /// Indicates whether the operation failed.
        /// </summary>
        public bool IsFailure => !IsSuccess;

        /// <summary>
        /// Gets the error. Throws InvalidOperationException if result is a success.
        /// </summary>
        public Error Error
        {
            get
            {
                if (IsSuccess)
                {
                    throw new InvalidOperationException("Cannot access Error on a successful result");
                }
                return _error!;
            }
        }

        /// <summary>
        /// Private constructor for success result.
        /// </summary>
        private Result()
        {
            _error = null;
            IsSuccess = true;
        }

        /// <summary>
        /// Private constructor for failure result.
        /// </summary>
        private Result(Error error)
        {
            _error = error;
            IsSuccess = false;
        }

        /// <summary>
        /// Creates a success result.
        /// </summary>
        public static Result Success() => new Result();

        /// <summary>
        /// Creates a failure result with an error.
        /// </summary>
        public static Result Failure(Error error) => new Result(error);

        /// <summary>
        /// Creates a failure result with error code and message.
        /// </summary>
        public static Result Failure(string code, string message) => 
            new Result(new Error(code, message));

        /// <summary>
        /// Executes an action if the result is a failure.
        /// </summary>
        public Result OnFailure(Action<Error> action)
        {
            if (IsFailure)
            {
                action(_error!);
            }
            return this;
        }
    }
}
