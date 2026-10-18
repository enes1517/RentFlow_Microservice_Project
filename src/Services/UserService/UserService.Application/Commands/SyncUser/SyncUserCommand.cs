using MediatR;
using SharedKernel.Common;
using UserService.Domain.Entities;

namespace UserService.Application.Commands.SyncUser;

public record SyncUserCommand(
    string IdentityId,
    string Email,
    string FirstName,
    string LastName,
    string Role,
    string? PhoneNumber,
    string? IdentityNumber
) : IRequest<Result<CommandOutcome>>;
