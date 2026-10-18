using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using UserService.Application.Interfaces;

namespace UserService.Infrastructure.Services;

public class KeycloakAdminService : IKeycloakAdminService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<KeycloakAdminService> _logger;

    public KeycloakAdminService(HttpClient httpClient, IConfiguration configuration, ILogger<KeycloakAdminService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task AssignRoleToUserAsync(string identityId, string roleName, CancellationToken cancellationToken)
    {
        var adminToken = await GetAdminTokenAsync(cancellationToken);
        
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var keycloakUrl = _configuration["Keycloak:AdminUrl"] ?? "http://keycloak:8080";
        var realm = "rent-management";

        // 1. Get role details (we need the Role ID to assign it)
        var roleResponse = await _httpClient.GetAsync($"{keycloakUrl}/admin/realms/{realm}/roles/{roleName}", cancellationToken);
        if (!roleResponse.IsSuccessStatusCode)
        {
            var err = await roleResponse.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Failed to get role details for {RoleName}. Status: {StatusCode}, Error: {Error}", roleName, roleResponse.StatusCode, err);
            throw new Exception($"Could not find role {roleName} in Keycloak.");
        }

        var roleJson = await roleResponse.Content.ReadAsStringAsync(cancellationToken);
        using var doc = JsonDocument.Parse(roleJson);
        var roleId = doc.RootElement.GetProperty("id").GetString();
        var roleNameInResponse = doc.RootElement.GetProperty("name").GetString();

        // 2. Assign the role to the user
        var roleMappingPayload = new[]
        {
            new
            {
                id = roleId,
                name = roleNameInResponse
            }
        };

        var content = new StringContent(JsonSerializer.Serialize(roleMappingPayload), System.Text.Encoding.UTF8, "application/json");
        var assignResponse = await _httpClient.PostAsync($"{keycloakUrl}/admin/realms/{realm}/users/{identityId}/role-mappings/realm", content, cancellationToken);
        
        if (!assignResponse.IsSuccessStatusCode)
        {
            var err = await assignResponse.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Failed to assign role {RoleName} to user {IdentityId}. Status: {StatusCode}, Error: {Error}", roleName, identityId, assignResponse.StatusCode, err);
            throw new Exception($"Could not assign role {roleName} to user.");
        }
        
        // 3. Remove ROLE_USER since they now have a concrete role
        try 
        {
            var oldRoleResponse = await _httpClient.GetAsync($"{keycloakUrl}/admin/realms/{realm}/roles/ROLE_USER", cancellationToken);
            if (oldRoleResponse.IsSuccessStatusCode)
            {
                var oldRoleJson = await oldRoleResponse.Content.ReadAsStringAsync(cancellationToken);
                using var oldDoc = JsonDocument.Parse(oldRoleJson);
                var oldRoleId = oldDoc.RootElement.GetProperty("id").GetString();
                
                var oldRoleMappingPayload = new[] { new { id = oldRoleId, name = "ROLE_USER" } };
                var removeRequest = new HttpRequestMessage(HttpMethod.Delete, $"{keycloakUrl}/admin/realms/{realm}/users/{identityId}/role-mappings/realm")
                {
                    Content = new StringContent(JsonSerializer.Serialize(oldRoleMappingPayload), System.Text.Encoding.UTF8, "application/json")
                };
                
                await _httpClient.SendAsync(removeRequest, cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to remove ROLE_USER from user {IdentityId}, ignoring.", identityId);
        }
    }

    private async Task<string> GetAdminTokenAsync(CancellationToken cancellationToken)
    {
        var keycloakUrl = _configuration["Keycloak:AdminUrl"] ?? "http://keycloak:8080";
        var adminUser = _configuration["Keycloak:AdminUser"] ?? _configuration["KEYCLOAK_ADMIN"] ?? "admin";
        var adminPass = _configuration["Keycloak:AdminPassword"] ?? _configuration["KEYCLOAK_ADMIN_PASSWORD"] ?? "admin";

        var request = new HttpRequestMessage(HttpMethod.Post, $"{keycloakUrl}/realms/master/protocol/openid-connect/token")
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                { "client_id", "admin-cli" },
                { "username", adminUser },
                { "password", adminPass },
                { "grant_type", "password" }
            })
        };

        var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.GetProperty("access_token").GetString()!;
    }
}
