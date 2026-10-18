using MediatR;
using SharedKernel.Common;
using MaintenanceService.Application.ReadModels;
using MaintenanceService.Application.Interfaces;

namespace MaintenanceService.Application.Queries;

// ─── GetAllMaintenanceRequests ────────────────────────────────────────────────

public record GetAllMaintenanceRequestsQuery(
    bool SortByPriority,
    PagedQuery Pagination) : IRequest<Result<PagedResult<MaintenanceReadModel>>>;

public class GetAllMaintenanceRequestsQueryHandler : IRequestHandler<GetAllMaintenanceRequestsQuery, Result<PagedResult<MaintenanceReadModel>>>
{
    private readonly IMaintenanceReadRepository _repository;
    public GetAllMaintenanceRequestsQueryHandler(IMaintenanceReadRepository repository) => _repository = repository;

    public async Task<Result<PagedResult<MaintenanceReadModel>>> Handle(GetAllMaintenanceRequestsQuery request, CancellationToken cancellationToken) =>
        Result.Success(await _repository.GetAllAsync(request.SortByPriority, request.Pagination, cancellationToken));
}

// ─── GetMaintenanceRequestById ────────────────────────────────────────────────

public record GetMaintenanceRequestByIdQuery(Guid Id) : IRequest<Result<MaintenanceReadModel>>;

public class GetMaintenanceRequestByIdQueryHandler : IRequestHandler<GetMaintenanceRequestByIdQuery, Result<MaintenanceReadModel>>
{
    private readonly IMaintenanceReadRepository _repository;
    public GetMaintenanceRequestByIdQueryHandler(IMaintenanceReadRepository repository) => _repository = repository;

    public async Task<Result<MaintenanceReadModel>> Handle(GetMaintenanceRequestByIdQuery request, CancellationToken cancellationToken)
    {
        var maintenance = await _repository.GetByIdAsync(request.Id, cancellationToken);
        return maintenance != null ? Result.Success(maintenance) : Result.Failure<MaintenanceReadModel>(Error.NotFound);
    }
}

// ─── GetMaintenanceRequestsByTenant ──────────────────────────────────────────

public record GetMaintenanceRequestsByTenantQuery(Guid TenantId, PagedQuery Pagination) : IRequest<Result<PagedResult<MaintenanceReadModel>>>;

public class GetMaintenanceRequestsByTenantQueryHandler : IRequestHandler<GetMaintenanceRequestsByTenantQuery, Result<PagedResult<MaintenanceReadModel>>>
{
    private readonly IMaintenanceReadRepository _repository;
    public GetMaintenanceRequestsByTenantQueryHandler(IMaintenanceReadRepository repository) => _repository = repository;

    public async Task<Result<PagedResult<MaintenanceReadModel>>> Handle(GetMaintenanceRequestsByTenantQuery request, CancellationToken cancellationToken) =>
        Result.Success(await _repository.GetByTenantAsync(request.TenantId, request.Pagination, cancellationToken));
}

// ─── GetMaintenanceRequestsByProperty ────────────────────────────────────────

public record GetMaintenanceRequestsByPropertyQuery(Guid PropertyId, PagedQuery Pagination) : IRequest<Result<PagedResult<MaintenanceReadModel>>>;

public class GetMaintenanceRequestsByPropertyQueryHandler : IRequestHandler<GetMaintenanceRequestsByPropertyQuery, Result<PagedResult<MaintenanceReadModel>>>
{
    private readonly IMaintenanceReadRepository _repository;
    public GetMaintenanceRequestsByPropertyQueryHandler(IMaintenanceReadRepository repository) => _repository = repository;

    public async Task<Result<PagedResult<MaintenanceReadModel>>> Handle(GetMaintenanceRequestsByPropertyQuery request, CancellationToken cancellationToken) =>
        Result.Success(await _repository.GetByPropertyAsync(request.PropertyId, request.Pagination, cancellationToken));
}
