using SharedKernel.Common;

namespace DocumentService.Application.Interfaces;

public interface IDocumentWriteRepository
{
    Task<CommandOutcome> GenerateLeaseContractAsync(
        Guid leaseId,
        Guid tenantId,
        Guid propertyId,
        decimal monthlyRent,
        decimal depositAmount,
        Guid? landlordId = null,
        DateTime? startDate = null,
        DateTime? endDate = null,
        CancellationToken cancellationToken = default);
}
