using Microsoft.Extensions.DependencyInjection;

namespace SharedKernel.Http;

public static class RentFlowHttpClientExtensions
{
    public static IHttpClientBuilder AddRentFlowResilience(
        this IHttpClientBuilder clientBuilder,
        TimeSpan totalRequestTimeout)
    {
        ArgumentNullException.ThrowIfNull(clientBuilder);
        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(totalRequestTimeout, TimeSpan.Zero);

        clientBuilder.ConfigureHttpClient(client => client.Timeout = Timeout.InfiniteTimeSpan);
        clientBuilder.AddStandardResilienceHandler(options =>
        {
            options.TotalRequestTimeout.Timeout = totalRequestTimeout;
            options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(
                Math.Min(5, totalRequestTimeout.TotalSeconds));
            options.Retry.MaxRetryAttempts = 2;
        });
        return clientBuilder;
    }
}
