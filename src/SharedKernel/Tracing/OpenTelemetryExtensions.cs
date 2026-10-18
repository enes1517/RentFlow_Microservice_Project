using Microsoft.Extensions.DependencyInjection;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

using Microsoft.Extensions.Configuration;

namespace SharedKernel.Tracing;

public static class OpenTelemetryExtensions
{
    public static IServiceCollection AddCustomOpenTelemetry(this IServiceCollection services, IConfiguration configuration, string serviceName)
    {
        services.AddOpenTelemetry()
            .ConfigureResource(resource => resource.AddService(serviceName))
            .WithTracing(tracing =>
            {
                tracing.AddAspNetCoreInstrumentation(options =>
                {
                    options.RecordException = true;
                });
                
                tracing.AddHttpClientInstrumentation(options =>
                {
                    options.RecordException = true;
                });
                
                // Entity Framework / DB tracing (via MassTransit or generic SQL client)
                tracing.AddSource("MassTransit");
                
                tracing.AddOtlpExporter(options =>
                {
                    var endpoint = configuration["OTEL_EXPORTER_OTLP_ENDPOINT"] ?? "http://localhost:4317";
                    options.Endpoint = new Uri(endpoint);
                });
            });

        return services;
    }
}
