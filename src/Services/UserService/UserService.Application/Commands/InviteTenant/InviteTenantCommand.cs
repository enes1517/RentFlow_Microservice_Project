using SharedKernel.Common;
using MediatR;
using System;

namespace UserService.Application.Commands.InviteTenant;

public sealed record InviteTenantCommand(
    string Email,
    string FirstName,
    string LastName,
    Guid LandlordId,
    Guid PropertyId,
    Guid UnitId,
    decimal RentAmount,
    decimal DepositAmount) : IRequest<Result<bool>>;
