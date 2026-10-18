using System.Net.Http.Headers;
using System.Net.Http.Json;
using NotificationService.Application.Interfaces;

namespace NotificationService.Infrastructure.Http;

public sealed class NotificationRecipientLookup(IHttpClientFactory clients) : INotificationRecipientLookup
{
    public async Task<NotificationService.Application.Interfaces.NotificationRecipientLookup?> GetRecipientAsync(
        Guid userId, string authorization, CancellationToken cancellationToken)
    {
        if (!TryGetBearer(authorization, out var bearer)) return null;
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"api/users/{userId}/role");
            request.Headers.Authorization = bearer;
            using var response = await clients.CreateClient("UserService").SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode) return null;
            return await response.Content.ReadFromJsonAsync<NotificationService.Application.Interfaces.NotificationRecipientLookup>(cancellationToken);
        }
        catch (HttpRequestException)
        {
            return null;
        }
    }

    public async Task<bool?> HasTenantLeaseAsync(
        Guid landlordId, Guid tenantId, string authorization, CancellationToken cancellationToken)
    {
        if (!TryGetBearer(authorization, out var bearer)) return false;
        try
        {
            for (var page = 1; ; page++)
            {
                using var request = new HttpRequestMessage(
                    HttpMethod.Get, $"api/leases/landlord/{landlordId}?page={page}&pageSize=100");
                request.Headers.Authorization = bearer;
                using var response = await clients.CreateClient("LeaseService").SendAsync(request, cancellationToken);
                if (!response.IsSuccessStatusCode) return null;

                var leases = await response.Content.ReadFromJsonAsync<List<LeaseTenantLookup>>(cancellationToken);
                if (leases is null) return false;
                if (leases.Any(lease => lease.TenantId == tenantId)) return true;
                if (!response.Headers.TryGetValues("X-Total-Pages", out var values) ||
                    !int.TryParse(values.FirstOrDefault(), out var totalPages) ||
                    page >= totalPages)
                    return false;
            }
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

    private sealed record LeaseTenantLookup(Guid TenantId);
}
