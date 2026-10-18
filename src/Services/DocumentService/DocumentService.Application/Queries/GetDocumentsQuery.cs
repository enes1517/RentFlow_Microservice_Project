using DocumentService.Application.ReadModels;
using MediatR;
using SharedKernel.Common;

namespace DocumentService.Application.Queries;

public sealed record GetDocumentsQuery(PagedQuery Pagination) : IRequest<PagedResult<DocumentReadModel>>;
