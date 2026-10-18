using MediatR;
using ReportService.Application.Interfaces;
using SharedKernel.Common;

namespace ReportService.Application.Commands;

public sealed record CreateMonthlyIncomeReportCommand(
    Guid LandlordId, int Year, int Month, decimal TotalIncome, decimal TotalLateFees, decimal MaintenanceCosts)
    : IRequest<CommandOutcome>;

public sealed class CreateMonthlyIncomeReportCommandHandler(IReportWriteRepository repository)
    : IRequestHandler<CreateMonthlyIncomeReportCommand, CommandOutcome>
{
    public Task<CommandOutcome> Handle(CreateMonthlyIncomeReportCommand request, CancellationToken cancellationToken) =>
        repository.CreateMonthlyIncomeReportAsync(request.LandlordId, request.Year, request.Month,
            request.TotalIncome, request.TotalLateFees, request.MaintenanceCosts, cancellationToken);
}
