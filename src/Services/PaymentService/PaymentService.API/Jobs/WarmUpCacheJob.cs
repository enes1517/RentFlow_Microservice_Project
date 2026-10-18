using Hangfire;
using SharedKernel.Caching;

namespace PaymentService.API.Jobs;

public class WarmUpCacheJob
{
    private readonly ICacheService _cacheService;
    private readonly ILogger<WarmUpCacheJob> _logger;

    public WarmUpCacheJob(ICacheService cacheService, ILogger<WarmUpCacheJob> logger)
    {
        _cacheService = cacheService;
        _logger = logger;
    }

    [AutomaticRetry(Attempts = 3)]
    public async Task ExecuteAsync()
    {
        _logger.LogInformation("WarmUpCacheJob is starting to pre-load critical data to Redis...");

        try
        {
            // Example of caching rules
            var cacheKey = "payment:late-fee-rules";
            var rules = new[] { "No late fee rule applied - LATE status tracking only" };
            
            await _cacheService.SetAsync(cacheKey, rules, TimeSpan.FromDays(1));

            _logger.LogInformation("WarmUpCacheJob completed successfully. Data loaded to Redis.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "WarmUpCacheJob encountered an error while warming up Redis cache.");
        }
    }
}
