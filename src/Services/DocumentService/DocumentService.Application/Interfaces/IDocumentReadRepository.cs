using DocumentService.Application.ReadModels;
using SharedKernel.Common;

namespace DocumentService.Application.Interfaces;

public interface IDocumentReadRepository
{
    Task<PagedResult<DocumentReadModel>> GetAllAsync(PagedQuery pagination, CancellationToken cancellationToken = default);
    Task<DocumentReadModel?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
}
