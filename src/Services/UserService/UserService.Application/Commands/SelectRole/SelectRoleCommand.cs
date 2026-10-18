using MediatR;
using SharedKernel.Common;

namespace UserService.Application.Commands.SelectRole;

public record SelectRoleCommand(string IdentityId, string Role) : IRequest<Result<CommandOutcome>>;
