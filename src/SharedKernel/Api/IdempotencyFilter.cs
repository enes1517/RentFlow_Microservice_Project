using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace SharedKernel.Api;

[AttributeUsage(AttributeTargets.Method)]
public sealed class IdempotentRequestAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (!context.HttpContext.Request.Headers.TryGetValue("Idempotency-Key", out var idempotencyKeys))
        {
            // If no idempotency key is provided, we can either enforce it or pass through.
            // For backward compatibility, let's just pass through if missing, or we could return 400.
            await next();
            return;
        }

        var key = idempotencyKeys.ToString();
        var cache = context.HttpContext.RequestServices.GetRequiredService<IDistributedCache>();
        var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<IdempotentRequestAttribute>>();

        var cacheKey = $"idempotency:{key}:{context.HttpContext.User.Identity?.Name ?? "anonymous"}";

        var existingResult = await cache.GetStringAsync(cacheKey);
        if (!string.IsNullOrEmpty(existingResult))
        {
            logger.LogInformation("Idempotency cache hit for key {Key}", key);
            
            var cachedResponse = JsonSerializer.Deserialize<CachedResponse>(existingResult);
            if (cachedResponse != null)
            {
                context.Result = new ObjectResult(cachedResponse.Value)
                {
                    StatusCode = cachedResponse.StatusCode
                };
                return;
            }
        }

        var executedContext = await next();

        if (executedContext.Result is ObjectResult objResult)
        {
            var responseToCache = new CachedResponse(objResult.StatusCode ?? 200, objResult.Value);
            await cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(responseToCache), new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24) // Hold idempotency keys for 24 hours
            });
        }
    }

    private class CachedResponse
    {
        public int StatusCode { get; set; }
        public object? Value { get; set; }

        public CachedResponse() { }
        public CachedResponse(int statusCode, object? value)
        {
            StatusCode = statusCode;
            Value = value;
        }
    }
}
