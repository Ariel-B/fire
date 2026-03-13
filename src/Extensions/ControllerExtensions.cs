using Microsoft.AspNetCore.Mvc;
using FirePlanningTool.Models;

namespace FirePlanningTool.Extensions
{
    /// <summary>
    /// Extension methods for converting Result pattern to ASP.NET Core ActionResult.
    /// Enables clean Result-based error handling in API controllers.
    /// </summary>
    public static class ControllerExtensions
    {
        /// <summary>
        /// Converts a Result to an ActionResult with appropriate HTTP status codes.
        /// Success returns 200 OK, validation errors return 400 Bad Request,
        /// not found errors return 404 Not Found, others return 500 Internal Server Error.
        /// </summary>
        public static ActionResult<T> ToActionResult<T>(this Result<T> result, ControllerBase controller)
        {
            if (result.IsSuccess)
            {
                return controller.Ok(result.Value);
            }

            var errorResponse = new ApiErrorResponse(result.Error.Message);

            return result.Error.Code switch
            {
                "VALIDATION_ERROR" => controller.BadRequest(errorResponse),
                "NOT_FOUND" => controller.NotFound(errorResponse),
                "INVALID_OPERATION" => controller.BadRequest(errorResponse),
                _ => controller.StatusCode(500, errorResponse)
            };
        }

        /// <summary>
        /// Converts a non-generic Result to an IActionResult with appropriate HTTP status codes.
        /// Success returns 200 OK, validation errors return 400 Bad Request,
        /// not found errors return 404 Not Found, others return 500 Internal Server Error.
        /// </summary>
        public static IActionResult ToActionResult(this Result result, ControllerBase controller)
        {
            if (result.IsSuccess)
            {
                return controller.Ok();
            }

            var errorResponse = new ApiErrorResponse(result.Error.Message);

            return result.Error.Code switch
            {
                "VALIDATION_ERROR" => controller.BadRequest(errorResponse),
                "NOT_FOUND" => controller.NotFound(errorResponse),
                "INVALID_OPERATION" => controller.BadRequest(errorResponse),
                _ => controller.StatusCode(500, errorResponse)
            };
        }
    }
}
