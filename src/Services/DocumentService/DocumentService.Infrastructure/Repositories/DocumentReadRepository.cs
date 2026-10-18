using DocumentService.Application.Interfaces;
using DocumentService.Application.ReadModels;
using DocumentService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using SharedKernel.Common;

namespace DocumentService.Infrastructure.Repositories;

public sealed class DocumentReadRepository(DocumentDbContext context) : IDocumentReadRepository
{
    public async Task<PagedResult<DocumentReadModel>> GetAllAsync(
        PagedQuery pagination,
        CancellationToken cancellationToken = default)
    {
        var query = context.Documents.AsNoTracking();
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(document => document.CreatedAt).ThenBy(document => document.Id)
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .Select(document => new DocumentReadModel(document.Id, document.OwnerId, document.RelatedEntityId,
                document.FileName, document.FilePath, document.ContentType, document.FileSizeBytes,
                document.DocumentType, document.CreatedAt))
            .ToListAsync(cancellationToken);
        return PagedResult<DocumentReadModel>.Create(items, totalCount, pagination.Page, pagination.PageSize);
    }

    public Task<DocumentReadModel?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        context.Documents.AsNoTracking()
            .Where(document => document.Id == id)
            .Select(document => new DocumentReadModel(document.Id, document.OwnerId, document.RelatedEntityId,
                document.FileName, document.FilePath, document.ContentType, document.FileSizeBytes,
                document.DocumentType, document.CreatedAt))
            .FirstOrDefaultAsync(cancellationToken);
}
