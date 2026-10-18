using MediatR;
using ReportService.Application.Interfaces;
using ReportService.Application.ReadModels;

namespace ReportService.Application.Queries;

public sealed record GetIncomeReportQuery(Guid LandlordId, int Year) : IRequest<IncomeReportQueryResult>;

public sealed class GetIncomeReportQueryHandler(IReportReadRepository repository)
    : IRequestHandler<GetIncomeReportQuery, IncomeReportQueryResult>
{
    public Task<IncomeReportQueryResult> Handle(GetIncomeReportQuery request, CancellationToken cancellationToken) =>
        repository.GetIncomeByLandlordAsync(request.LandlordId, request.Year, cancellationToken);
}
