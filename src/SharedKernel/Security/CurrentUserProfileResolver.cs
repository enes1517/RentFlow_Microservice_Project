using System.Net.Http.Headers;
using System.Security.Claims;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Http;
using SharedKernel.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace SharedKernel.Security;

public sealed class CurrentUserProfileResolver(
    IHttpContextAccessor httpContextAccessor,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration) : ICurrentUserProfileResolver
{
    public async Task<CurrentUserProfile> GetRequiredAsync(CancellationToken cancellationToken = default)
    {
        var context = httpContextAccessor.HttpContext
            ?? throw new InvalidOperationException("The current HTTP context is unavailable.");
        var identityId = context.User.FindFirstValue("sub");
        var accessToken = context.Request.Headers["Authorization"].ToString();
        if (string.IsNullOrWhiteSpace(identityId) ||
            !AuthenticationHeaderValue.TryParse(accessToken, out var authorization) ||
            !string.Equals(authorization.Scheme, "Bearer", StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException("A validated user access token is required.");
        }

        var baseAddress = configuration["UserService:BaseUrl"] ?? "http://userservice";
        var client = httpClientFactory.CreateClient(nameof(CurrentUserProfileResolver));
        var profileUrl = $"{baseAddress.TrimEnd('/')}/api/users/me";
        using var request = new HttpRequestMessage(HttpMethod.Get, profileUrl);
        request.Headers.Authorization = authorization;
        using var response = await client.SendAsync(request, cancellationToken);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            using var syncRequest = new HttpRequestMessage(
                HttpMethod.Post,
                $"{baseAddress.TrimEnd('/')}/api/users/sync");
            syncRequest.Headers.Authorization = authorization;
            using var syncResponse = await client.SendAsync(syncRequest, cancellationToken);
            syncResponse.EnsureSuccessStatusCode();

            using var refreshedRequest = new HttpRequestMessage(HttpMethod.Get, profileUrl);
            refreshedRequest.Headers.Authorization = authorization;
            using var refreshedResponse = await client.SendAsync(refreshedRequest, cancellationToken);
            refreshedResponse.EnsureSuccessStatusCode();
            return await ReadProfileAsync(refreshedResponse, identityId, cancellationToken);
        }

        response.EnsureSuccessStatusCode();
        return await ReadProfileAsync(response, identityId, cancellationToken);
    }

    private static async Task<CurrentUserProfile> ReadProfileAsync(
        HttpResponseMessage response,
        string identityId,
        CancellationToken cancellationToken)
    {
        var profile = await response.Content.ReadFromJsonAsync<CurrentUserProfile>(cancellationToken);
        if (profile is null || profile.IdentityId != identityId || profile.Id == Guid.Empty)
        {
            throw new InvalidOperationException("The identity provider profile could not be resolved consistently.");
        }

        return profile;
    }
}

public static class CurrentUserProfileServiceCollectionExtensions
{
    public static IServiceCollection AddCurrentUserProfileResolver(this IServiceCollection services)
    {
        services.AddHttpContextAccessor();
        services.AddHttpClient(nameof(CurrentUserProfileResolver))
            .AddRentFlowResilience(TimeSpan.FromSeconds(5));
        services.AddScoped<ICurrentUserProfileResolver, CurrentUserProfileResolver>();
        return services;
    }
}
