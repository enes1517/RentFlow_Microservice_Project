using Amazon.S3;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace DocumentService.API.Health;

public sealed class MinioStorageHealthCheck(IAmazonS3 s3, IConfiguration configuration) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var bucketName = configuration["Storage:Bucket"];
        if (string.IsNullOrWhiteSpace(bucketName))
            return HealthCheckResult.Unhealthy("Storage:Bucket is not configured.");

        try
        {
            var response = await s3.ListBucketsAsync(cancellationToken);
            var bucketExists = response.Buckets.Any(bucket =>
                string.Equals(bucket.BucketName, bucketName, StringComparison.Ordinal));
            return bucketExists
                ? HealthCheckResult.Healthy()
                : HealthCheckResult.Unhealthy("The configured object-storage bucket is unavailable.");
        }
        catch (Exception exception)
        {
            return HealthCheckResult.Unhealthy("The object-storage service is unavailable.", exception);
        }
    }
}
