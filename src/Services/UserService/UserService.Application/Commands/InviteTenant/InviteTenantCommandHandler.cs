using MediatR;
using SharedKernel.Common;
using SharedKernel.Contracts.Events;
using SharedKernel.Messaging;
using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using UserService.Application.Interfaces;
using UserService.Domain.Entities;

namespace UserService.Application.Commands.InviteTenant;

public class InviteTenantCommandHandler : IRequestHandler<InviteTenantCommand, Result<bool>>
{
    private readonly IUserWriteRepository _userRepository;

    public InviteTenantCommandHandler(IUserWriteRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<Result<bool>> Handle(InviteTenantCommand request, CancellationToken cancellationToken)
    {
        var invitation = TenantInvitation.Create(
            request.Email,
            request.FirstName,
            request.LastName,
            request.LandlordId,
            request.PropertyId,
            request.UnitId,
            request.RentAmount,
            request.DepositAmount
        );

        await _userRepository.AddTenantInvitationAsync(invitation, cancellationToken);

        // Publish TenantInvitedEvent via Outbox
        var invitedEvent = new TenantInvitedEvent(
            request.Email,
            request.FirstName,
            request.LastName,
            request.LandlordId,
            request.PropertyId,
            request.UnitId,
            invitation.InvitationToken
        );

        var outboxMessage = OutboxMessage.Create(
            invitedEvent.GetType().AssemblyQualifiedName!,
            JsonSerializer.Serialize((object)invitedEvent),
            "tenant-invitations"
        );

        await _userRepository.AddOutboxMessageAsync(outboxMessage, cancellationToken);

        await _userRepository.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}
