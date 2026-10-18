using System.Net.Http.Headers;
using System.Net.Http.Json;
using LeaseService.Application.Interfaces;

namespace LeaseService.Infrastructure.Http;

public sealed class LeaseServiceLookup(IHttpClientFactory clients) : ILeaseServiceLookup
{
    public async Task<UserRoleLookup?> GetUserRoleAsync(
        Guid userId, string authorization, CancellationToken cancellationToken)
    {
        if (!TryGetBearer(authorization, out var bearer)) return null;
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"api/users/{userId}/role");
            request.Headers.Authorization = bearer;
            using var response = await clients.CreateClient("UserService").SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode) return null;
            return await response.Content.ReadFromJsonAsync<UserRoleLookup>(cancellationToken);
        }
        catch (HttpRequestException)
        {
            return null;
        }
    }

    public async Task<PropertyLeaseLookup?> GetPropertyAsync(
        Guid propertyId, string authorization, CancellationToken cancellationToken)
    {
        if (!TryGetBearer(authorization, out var bearer)) return null;
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"api/properties/{propertyId}");
            request.Headers.Authorization = bearer;
            using var response = await clients.CreateClient("PropertyService").SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode) return null;
            return await response.Content.ReadFromJsonAsync<PropertyLeaseLookup>(cancellationToken);
        }
        catch (HttpRequestException)
        {
            return null;
        }
    }

    private static bool TryGetBearer(string value, out AuthenticationHeaderValue bearer)
    {
        if (AuthenticationHeaderValue.TryParse(value, out var parsed) &&
            string.Equals(parsed.Scheme, "Bearer", StringComparison.OrdinalIgnoreCase))
        {
            bearer = parsed;
            return true;
        }

        bearer = null!;
        return false;
    }
}
