using System.Net.Http.Headers;
using System.Net.Http.Json;
using PaymentService.Application.Interfaces;

namespace PaymentService.Infrastructure.Http;

public sealed class PaymentLeaseLookup(IHttpClientFactory clients) : IPaymentLeaseLookup
{
    public async Task<PaymentService.Application.Interfaces.PaymentLeaseLookup?> GetLeaseAsync(
        Guid leaseId, string authorization, CancellationToken cancellationToken)
    {
        if (!AuthenticationHeaderValue.TryParse(authorization, out var bearer) ||
            !string.Equals(bearer.Scheme, "Bearer", StringComparison.OrdinalIgnoreCase))
            return null;

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"api/leases/{leaseId}");
            request.Headers.Authorization = bearer;
            using var response = await clients.CreateClient("LeaseService").SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode) return null;
            return await response.Content.ReadFromJsonAsync<PaymentService.Application.Interfaces.PaymentLeaseLookup>(cancellationToken);
        }
        catch (HttpRequestException)
        {
            return null;
        }
    }
}
