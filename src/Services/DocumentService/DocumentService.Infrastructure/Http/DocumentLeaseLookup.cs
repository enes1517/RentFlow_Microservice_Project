using System.Net.Http.Headers;
using System.Net.Http.Json;
using DocumentService.Application.Interfaces;

namespace DocumentService.Infrastructure.Http;

public sealed class DocumentLeaseLookup(IHttpClientFactory clients) : IDocumentLeaseLookup
{
    public async Task<DocumentService.Application.Interfaces.DocumentLeaseLookup?> GetLeaseAsync(
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
            return await response.Content.ReadFromJsonAsync<DocumentService.Application.Interfaces.DocumentLeaseLookup>(cancellationToken);
        }
        catch (HttpRequestException)
        {
            return null;
        }
    }
}
