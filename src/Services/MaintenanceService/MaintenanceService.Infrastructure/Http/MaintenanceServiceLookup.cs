using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using MaintenanceService.Application.Interfaces;

namespace MaintenanceService.Infrastructure.Http;

public sealed class MaintenanceServiceLookup(IHttpClientFactory clients) : IMaintenanceServiceLookup
{
    public async Task<IReadOnlyList<MaintenanceLeaseLookup>?> GetTenantLeasesAsync(
        Guid tenantId, string authorization, CancellationToken cancellationToken)
    {
        if (!TryGetBearer(authorization, out var bearer)) return null;
        try
        {
            var leases = new List<MaintenanceLeaseLookup>();
            for (var page = 1; ; page++)
            {
                using var request = new HttpRequestMessage(
                    HttpMethod.Get, $"api/leases/tenant/{tenantId}?page={page}&pageSize=100");
                request.Headers.Authorization = bearer;
                using var response = await clients.CreateClient("LeaseService").SendAsync(request, cancellationToken);
                if (!response.IsSuccessStatusCode) return null;

                var pageItems = await response.Content.ReadFromJsonAsync<List<MaintenanceLeaseLookup>>(cancellationToken);
                if (pageItems is null) return null;
                leases.AddRange(pageItems);
                if (!response.Headers.TryGetValues("X-Total-Pages", out var values) ||
                    !int.TryParse(values.FirstOrDefault(), out var totalPages) ||
                    page >= totalPages)
                    return leases;
            }
        }
        catch (HttpRequestException)
        {
            return null;
        }
    }

    public async Task<bool?> LandlordOwnsPropertyAsync(
        Guid landlordId, Guid propertyId, string authorization, CancellationToken cancellationToken)
    {
        if (!TryGetBearer(authorization, out var bearer)) return false;
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"api/properties/{propertyId}");
            request.Headers.Authorization = bearer;
            using var response = await clients.CreateClient("PropertyService").SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
                return response.StatusCode is HttpStatusCode.Forbidden or HttpStatusCode.Unauthorized ? false : null;
            var property = await response.Content.ReadFromJsonAsync<PropertyOwnershipLookup>(cancellationToken);
            return property?.LandlordId == landlordId;
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

    private sealed record PropertyOwnershipLookup(Guid LandlordId);
}
