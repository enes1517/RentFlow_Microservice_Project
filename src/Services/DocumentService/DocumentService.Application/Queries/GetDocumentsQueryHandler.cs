using DocumentService.Application.Interfaces;
using DocumentService.Application.ReadModels;
using MediatR;
using SharedKernel.Common;

namespace DocumentService.Application.Queries;

public sealed class GetDocumentsQueryHandler(IDocumentReadRepository repository)
    : IRequestHandler<GetDocumentsQuery, PagedResult<DocumentReadModel>>
{
    public Task<PagedResult<DocumentReadModel>> Handle(GetDocumentsQuery request, CancellationToken cancellationToken) =>
        repository.GetAllAsync(request.Pagination, cancellationToken);
}
