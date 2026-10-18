using MediatR;
using SharedKernel.Common;
using LeaseService.Application.ReadModels;
using LeaseService.Application.Interfaces;

namespace LeaseService.Application.Queries;

// ─── GetAllLeases ─────────────────────────────────────────────────────────────

public record GetAllLeasesQuery(PagedQuery Pagination) : IRequest<Result<PagedResult<LeaseReadModel>>>;

public class GetAllLeasesQueryHandler : IRequestHandler<GetAllLeasesQuery, Result<PagedResult<LeaseReadModel>>>
{
    private readonly ILeaseReadRepository _repository;
    public GetAllLeasesQueryHandler(ILeaseReadRepository repository) => _repository = repository;

    public async Task<Result<PagedResult<LeaseReadModel>>> Handle(GetAllLeasesQuery request, CancellationToken cancellationToken) =>
        Result.Success(await _repository.GetAllAsync(request.Pagination, cancellationToken));
}

// ─── GetLeaseById ─────────────────────────────────────────────────────────────

public record GetLeaseByIdQuery(Guid Id) : IRequest<Result<LeaseReadModel>>;

public class GetLeaseByIdQueryHandler : IRequestHandler<GetLeaseByIdQuery, Result<LeaseReadModel>>
{
    private readonly ILeaseReadRepository _repository;
    public GetLeaseByIdQueryHandler(ILeaseReadRepository repository) => _repository = repository;

    public async Task<Result<LeaseReadModel>> Handle(GetLeaseByIdQuery request, CancellationToken cancellationToken)
    {
        var lease = await _repository.GetByIdAsync(request.Id, cancellationToken);
        return lease != null ? Result.Success(lease) : Result.Failure<LeaseReadModel>(Error.NotFound);
    }
}

// ─── GetLeasesByTenant ────────────────────────────────────────────────────────

public record GetLeasesByTenantQuery(Guid TenantId, PagedQuery Pagination) : IRequest<Result<PagedResult<LeaseReadModel>>>;

public class GetLeasesByTenantQueryHandler : IRequestHandler<GetLeasesByTenantQuery, Result<PagedResult<LeaseReadModel>>>
{
    private readonly ILeaseReadRepository _repository;
    public GetLeasesByTenantQueryHandler(ILeaseReadRepository repository) => _repository = repository;

    public async Task<Result<PagedResult<LeaseReadModel>>> Handle(GetLeasesByTenantQuery request, CancellationToken cancellationToken) =>
        Result.Success(await _repository.GetByTenantAsync(request.TenantId, request.Pagination, cancellationToken));
}

// ─── GetLeasesByLandlord ──────────────────────────────────────────────────────

public record GetLeasesByLandlordQuery(Guid LandlordId, PagedQuery Pagination) : IRequest<Result<PagedResult<LeaseReadModel>>>;

public class GetLeasesByLandlordQueryHandler : IRequestHandler<GetLeasesByLandlordQuery, Result<PagedResult<LeaseReadModel>>>
{
    private readonly ILeaseReadRepository _repository;
    public GetLeasesByLandlordQueryHandler(ILeaseReadRepository repository) => _repository = repository;

    public async Task<Result<PagedResult<LeaseReadModel>>> Handle(GetLeasesByLandlordQuery request, CancellationToken cancellationToken) =>
        Result.Success(await _repository.GetByLandlordAsync(request.LandlordId, request.Pagination, cancellationToken));
}

// ─── FilterRelatedTenants ─────────────────────────────────────────────────────

public record FilterRelatedTenantsQuery(Guid LandlordId, IEnumerable<Guid> TenantIds) : IRequest<Result<List<Guid>>>;

public class FilterRelatedTenantsQueryHandler : IRequestHandler<FilterRelatedTenantsQuery, Result<List<Guid>>>
{
    private readonly ILeaseReadRepository _repository;
    public FilterRelatedTenantsQueryHandler(ILeaseReadRepository repository) => _repository = repository;

    public async Task<Result<List<Guid>>> Handle(FilterRelatedTenantsQuery request, CancellationToken cancellationToken) =>
        Result.Success(await _repository.FilterRelatedTenantsAsync(request.LandlordId, request.TenantIds, cancellationToken));
}
