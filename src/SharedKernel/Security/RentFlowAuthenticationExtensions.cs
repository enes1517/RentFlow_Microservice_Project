using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace SharedKernel.Security;

public static class RentFlowAuthenticationExtensions
{
    public static IServiceCollection AddRentFlowAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var authority = configuration["Authentication:Authority"]
            ?? throw new InvalidOperationException("Authentication:Authority must be configured.");
        var metadataAddress = configuration["Authentication:MetadataAddress"]
            ?? throw new InvalidOperationException("Authentication:MetadataAddress must be configured.");
        var audience = configuration["Authentication:Audience"]
            ?? throw new InvalidOperationException("Authentication:Audience must be configured.");

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.MetadataAddress = metadataAddress;
                options.RequireHttpsMetadata = configuration.GetValue<bool>("Authentication:RequireHttpsMetadata");
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = authority,
                    ValidateAudience = true,
                    ValidAudience = audience,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    NameClaimType = "preferred_username"
                };
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var logger = context.HttpContext.RequestServices
                            .GetRequiredService<ILoggerFactory>()
                            .CreateLogger("RentFlowAuthentication");
                        logger.LogDebug(
                            "Bearer token received for {Path}: {HasToken}.",
                            context.HttpContext.Request.Path,
                            context.Request.Headers.Authorization.Count > 0);
                        return Task.CompletedTask;
                    },
                    OnAuthenticationFailed = context =>
                    {
                        var logger = context.HttpContext.RequestServices
                            .GetRequiredService<ILoggerFactory>()
                            .CreateLogger("RentFlowAuthentication");
                        logger.LogWarning(context.Exception, "Bearer token validation failed.");
                        return Task.CompletedTask;
                    },
                    OnChallenge = context =>
                    {
                        var logger = context.HttpContext.RequestServices
                            .GetRequiredService<ILoggerFactory>()
                            .CreateLogger("RentFlowAuthentication");
                        logger.LogWarning(
                            "Bearer authentication challenged for {Path}: {Error} {Description}.",
                            context.HttpContext.Request.Path,
                            context.Error,
                            context.ErrorDescription);
                        return Task.CompletedTask;
                    },
                    OnTokenValidated = context =>
                    {
                        var realmAccess = context.Principal?.FindFirst("realm_access")?.Value;
                        if (realmAccess is null || context.Principal?.Identity is not ClaimsIdentity identity)
                        {
                            return Task.CompletedTask;
                        }

                        using var document = JsonDocument.Parse(realmAccess);
                        if (document.RootElement.TryGetProperty("roles", out var roles) &&
                            roles.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var role in roles.EnumerateArray())
                            {
                                if (role.ValueKind == JsonValueKind.String && role.GetString() is { } roleName)
                                {
                                    identity.AddClaim(new Claim(ClaimTypes.Role, roleName));
                                }
                            }
                        }

                        return Task.CompletedTask;
                    }
                };
            });

        services.AddAuthorization(options =>
        {
            options.AddPolicy("AdministratorsOnly", policy =>
                policy.RequireRole("ROLE_ADMIN"));
            options.FallbackPolicy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();
        });

        return services;
    }
}
