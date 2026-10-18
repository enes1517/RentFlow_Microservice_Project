using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace SharedKernel.Api;

public static class RentFlowSwaggerExtensions
{
    public static IServiceCollection AddRentFlowSwagger(
        this IServiceCollection services,
        string apiTitle,
        string apiVersion = "v1",
        string? description = null,
        Action<SwaggerGenOptions>? configure = null)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc(apiVersion, new OpenApiInfo
            {
                Title = apiTitle,
                Version = apiVersion,
                Description = description ?? $"{apiTitle} - RentFlow Microservices Platform"
            });

            var securityScheme = new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Description = "Enter your Keycloak JWT Bearer token: Bearer {token}",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT"
            };

            options.AddSecurityDefinition("Bearer", securityScheme);

            options.AddSecurityRequirement(doc => new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecuritySchemeReference("Bearer", doc),
                    new List<string>()
                }
            });

            configure?.Invoke(options);
        });

        return services;
    }

    public static IApplicationBuilder UseRentFlowSwagger(
        this IApplicationBuilder app,
        string apiTitle,
        string apiVersion = "v1")
    {
        app.UseSwagger();
        app.UseSwaggerUI(options =>
        {
            options.SwaggerEndpoint($"/swagger/{apiVersion}/swagger.json", $"{apiTitle} {apiVersion.ToUpperInvariant()}");
            options.RoutePrefix = "swagger";
            options.DisplayRequestDuration();
            options.EnablePersistAuthorization();
        });

        return app;
    }
}
