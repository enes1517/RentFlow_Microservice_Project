using MediatR;
using SharedKernel.Common;
using PaymentService.Application.ReadModels;
using PaymentService.Application.Interfaces;

namespace PaymentService.Application.Queries;

// ─── GetAllPayments ───────────────────────────────────────────────────────────

public record GetAllPaymentsQuery(PagedQuery Pagination) : IRequest<Result<PagedResult<PaymentReadModel>>>;

public class GetAllPaymentsQueryHandler : IRequestHandler<GetAllPaymentsQuery, Result<PagedResult<PaymentReadModel>>>
{
    private readonly IPaymentReadRepository _repository;
    public GetAllPaymentsQueryHandler(IPaymentReadRepository repository) => _repository = repository;

    public async Task<Result<PagedResult<PaymentReadModel>>> Handle(GetAllPaymentsQuery request, CancellationToken cancellationToken) =>
        Result.Success(await _repository.GetAllAsync(request.Pagination, cancellationToken));
}

// ─── GetPaymentById ───────────────────────────────────────────────────────────

public record GetPaymentByIdQuery(Guid Id) : IRequest<Result<PaymentReadModel>>;

public class GetPaymentByIdQueryHandler : IRequestHandler<GetPaymentByIdQuery, Result<PaymentReadModel>>
{
    private readonly IPaymentReadRepository _repository;
    public GetPaymentByIdQueryHandler(IPaymentReadRepository repository) => _repository = repository;

    public async Task<Result<PaymentReadModel>> Handle(GetPaymentByIdQuery request, CancellationToken cancellationToken)
    {
        var payment = await _repository.GetByIdAsync(request.Id, cancellationToken);
        return payment != null ? Result.Success(payment) : Result.Failure<PaymentReadModel>(Error.NotFound);
    }
}

public record HasPaymentTenantMismatchQuery(Guid LeaseId, Guid TenantId) : IRequest<bool>;

public class HasPaymentTenantMismatchQueryHandler : IRequestHandler<HasPaymentTenantMismatchQuery, bool>
{
    private readonly IPaymentReadRepository _repository;
    public HasPaymentTenantMismatchQueryHandler(IPaymentReadRepository repository) => _repository = repository;

    public Task<bool> Handle(HasPaymentTenantMismatchQuery request, CancellationToken cancellationToken) =>
        _repository.HasTenantMismatchAsync(request.LeaseId, request.TenantId, cancellationToken);
}

// ─── GetPaymentsByLease ───────────────────────────────────────────────────────

public record GetPaymentsByLeaseQuery(Guid LeaseId, PagedQuery Pagination) : IRequest<Result<PagedResult<PaymentReadModel>>>;

public class GetPaymentsByLeaseQueryHandler : IRequestHandler<GetPaymentsByLeaseQuery, Result<PagedResult<PaymentReadModel>>>
{
    private readonly IPaymentReadRepository _repository;
    public GetPaymentsByLeaseQueryHandler(IPaymentReadRepository repository) => _repository = repository;

    public async Task<Result<PagedResult<PaymentReadModel>>> Handle(GetPaymentsByLeaseQuery request, CancellationToken cancellationToken) =>
        Result.Success(await _repository.GetByLeaseAsync(request.LeaseId, request.Pagination, cancellationToken));
}

// ─── GetPaymentsByTenant ──────────────────────────────────────────────────────

public record GetPaymentsByTenantQuery(Guid TenantId, PagedQuery Pagination) : IRequest<Result<PagedResult<PaymentReadModel>>>;

public class GetPaymentsByTenantQueryHandler : IRequestHandler<GetPaymentsByTenantQuery, Result<PagedResult<PaymentReadModel>>>
{
    private readonly IPaymentReadRepository _repository;
    public GetPaymentsByTenantQueryHandler(IPaymentReadRepository repository) => _repository = repository;

    public async Task<Result<PagedResult<PaymentReadModel>>> Handle(GetPaymentsByTenantQuery request, CancellationToken cancellationToken) =>
        Result.Success(await _repository.GetByTenantAsync(request.TenantId, request.Pagination, cancellationToken));
}
