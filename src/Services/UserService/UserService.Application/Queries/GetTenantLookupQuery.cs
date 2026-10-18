using MediatR;
using SharedKernel.Common;
using UserService.Application.Interfaces;
using UserService.Application.ReadModels;

namespace UserService.Application.Queries;

public sealed record GetTenantLookupQuery(string? Search, PagedQuery Pagination)
    : IRequest<Result<PagedResult<TenantLookupReadModel>>>;

public sealed class GetTenantLookupQueryHandler(IUserReadRepository repository)
    : IRequestHandler<GetTenantLookupQuery, Result<PagedResult<TenantLookupReadModel>>>
{
    public async Task<Result<PagedResult<TenantLookupReadModel>>> Handle(
        GetTenantLookupQuery request,
        CancellationToken cancellationToken) =>
        Result.Success(await repository.GetTenantsAsync(request.Search, request.Pagination, cancellationToken));
}

public sealed record GetTenantsByIdsQuery(IReadOnlyCollection<Guid> Ids)
    : IRequest<Result<IReadOnlyList<TenantLookupReadModel>>>;

public sealed class GetTenantsByIdsQueryHandler(IUserReadRepository repository)
    : IRequestHandler<GetTenantsByIdsQuery, Result<IReadOnlyList<TenantLookupReadModel>>>
{
    public async Task<Result<IReadOnlyList<TenantLookupReadModel>>> Handle(
        GetTenantsByIdsQuery request,
        CancellationToken cancellationToken) =>
        Result.Success(await repository.GetTenantsByIdsAsync(request.Ids, cancellationToken));
}
