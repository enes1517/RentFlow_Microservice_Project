using MediatR;
using PaymentService.Application.Interfaces;

namespace PaymentService.Application.Queries;

public sealed record GetPaymentLeaseQuery(Guid LeaseId, string Authorization) : IRequest<PaymentLeaseLookup?>;

public sealed class GetPaymentLeaseQueryHandler(IPaymentLeaseLookup lookup)
    : IRequestHandler<GetPaymentLeaseQuery, PaymentLeaseLookup?>
{
    public Task<PaymentLeaseLookup?> Handle(GetPaymentLeaseQuery request, CancellationToken cancellationToken) =>
        request.LeaseId == Guid.Empty
            ? Task.FromResult<PaymentLeaseLookup?>(null)
            : lookup.GetLeaseAsync(request.LeaseId, request.Authorization, cancellationToken);
}
