using DocumentService.Application.Interfaces;
using MediatR;

namespace DocumentService.Application.Queries;

public sealed record GetDocumentLeaseQuery(Guid LeaseId, string Authorization) : IRequest<DocumentLeaseLookup?>;

public sealed class GetDocumentLeaseQueryHandler(IDocumentLeaseLookup lookup)
    : IRequestHandler<GetDocumentLeaseQuery, DocumentLeaseLookup?>
{
    public Task<DocumentLeaseLookup?> Handle(GetDocumentLeaseQuery request, CancellationToken cancellationToken) =>
        request.LeaseId == Guid.Empty
            ? Task.FromResult<DocumentLeaseLookup?>(null)
            : lookup.GetLeaseAsync(request.LeaseId, request.Authorization, cancellationToken);
}
