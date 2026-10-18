using MediatR;
using SharedKernel.Common;
using UserService.Application.Interfaces;

namespace UserService.Application.Commands.SelectRole;

public class SelectRoleCommandHandler : IRequestHandler<SelectRoleCommand, Result<CommandOutcome>>
{
    private readonly IUserWriteRepository _userRepository;
    private readonly IKeycloakAdminService _keycloakAdminService;

    public SelectRoleCommandHandler(IUserWriteRepository userRepository, IKeycloakAdminService keycloakAdminService)
    {
        _userRepository = userRepository;
        _keycloakAdminService = keycloakAdminService;
    }

    public async Task<Result<CommandOutcome>> Handle(SelectRoleCommand request, CancellationToken cancellationToken)
    {
        var validRoles = new[] { "ROLE_LANDLORD", "ROLE_TENANT" };
        if (!validRoles.Contains(request.Role))
        {
            return Result.Failure<CommandOutcome>(new Error("Role.Invalid", "Invalid role selected."));
        }

        var existingUser = await _userRepository.GetForUpdateByIdentityIdAsync(request.IdentityId, cancellationToken);
        if (existingUser == null)
        {
            return Result.Failure<CommandOutcome>(new Error("User.NotFound", "User not found."));
        }

        // Keycloak rol güncellemesi yapılıyor.
        await _keycloakAdminService.AssignRoleToUserAsync(request.IdentityId, request.Role, cancellationToken);

        var internalRole = request.Role == "ROLE_LANDLORD" ? "LANDLORD" : "TENANT";
        existingUser.UpdateProfile(existingUser.Email, existingUser.FirstName, existingUser.LastName, internalRole, existingUser.PhoneNumber);
        
        await _userRepository.SaveChangesAsync(cancellationToken);

        return Result.Success(new CommandOutcome(existingUser.Id, "ROLE_UPDATED"));
    }
}
