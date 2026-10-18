using DocumentService.Application.Interfaces;
using DocumentService.Application.ReadModels;
using MediatR;

namespace DocumentService.Application.Queries;

public sealed record GetDocumentByIdQuery(Guid Id) : IRequest<DocumentReadModel?>;

public sealed class GetDocumentByIdQueryHandler(IDocumentReadRepository repository)
    : IRequestHandler<GetDocumentByIdQuery, DocumentReadModel?>
{
    public Task<DocumentReadModel?> Handle(
        GetDocumentByIdQuery request,
        CancellationToken cancellationToken) =>
        repository.GetByIdAsync(request.Id, cancellationToken);
}
