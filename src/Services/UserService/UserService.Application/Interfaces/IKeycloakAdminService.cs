namespace UserService.Application.Interfaces;

public interface IKeycloakAdminService
{
    Task AssignRoleToUserAsync(string identityId, string roleName, CancellationToken cancellationToken);
}
