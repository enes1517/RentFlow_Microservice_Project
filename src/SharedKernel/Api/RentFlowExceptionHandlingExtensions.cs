using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace SharedKernel.Api;

public static class RentFlowExceptionHandlingExtensions
{
    public static IApplicationBuilder UseRentFlowExceptionHandling(this IApplicationBuilder app)
    {
        return app.Use(async (context, next) =>
        {
            try
            {
                await next(context);
            }
            catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
            {
                context.Response.StatusCode = 499;
            }
            catch (Exception exception)
            {
                var logger = context.RequestServices.GetRequiredService<ILoggerFactory>()
                    .CreateLogger("RentFlow.ExceptionHandling");
                logger.LogError(exception, "Request failed. TraceId: {TraceId}", context.TraceIdentifier);

                var (statusCode, title) = exception switch
                {
                    UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Authentication required"),
                    ArgumentException => (StatusCodes.Status400BadRequest, "Invalid request"),
                    InvalidOperationException => (StatusCodes.Status409Conflict, "Request conflicts with the current state"),
                    HttpRequestException => (StatusCodes.Status503ServiceUnavailable, "A required service is unavailable"),
                    _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred")
                };

                context.Response.Clear();
                context.Response.StatusCode = statusCode;
                context.Response.ContentType = "application/problem+json";
                await context.Response.WriteAsJsonAsync(new
                {
                    type = "about:blank",
                    title,
                    status = statusCode,
                    traceId = context.TraceIdentifier
                });
            }
        });
    }
}
