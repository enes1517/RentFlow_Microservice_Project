using DocumentService.Application.Interfaces;
using MediatR;
using SharedKernel.Common;

namespace DocumentService.Application.Commands;

public sealed record GenerateLeaseContractCommand(
    Guid LeaseId,
    Guid TenantId,
    Guid PropertyId,
    decimal MonthlyRent,
    decimal DepositAmount,
    Guid? LandlordId = null,
    DateTime? StartDate = null,
    DateTime? EndDate = null)
    : IRequest<CommandOutcome>;

public sealed class GenerateLeaseContractCommandHandler(IDocumentWriteRepository repository)
    : IRequestHandler<GenerateLeaseContractCommand, CommandOutcome>
{
    public Task<CommandOutcome> Handle(GenerateLeaseContractCommand request, CancellationToken cancellationToken) =>
        repository.GenerateLeaseContractAsync(
            request.LeaseId,
            request.TenantId,
            request.PropertyId,
            request.MonthlyRent,
            request.DepositAmount,
            request.LandlordId,
            request.StartDate,
            request.EndDate,
            cancellationToken);
}
