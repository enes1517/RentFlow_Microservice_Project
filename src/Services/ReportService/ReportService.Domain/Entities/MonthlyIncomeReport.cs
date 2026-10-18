using SharedKernel.Entities;

namespace ReportService.Domain.Entities;

public class MonthlyIncomeReport : BaseEntity
{
    public Guid LandlordId { get; private set; }
    public int Year { get; private set; }
    public int Month { get; private set; }
    
    public decimal TotalIncome { get; private set; }
    public decimal TotalLateFees { get; private set; }
    public decimal TotalMaintenanceCosts { get; private set; }
    
    public decimal NetIncome => TotalIncome + TotalLateFees - TotalMaintenanceCosts;

    protected MonthlyIncomeReport() { }

    public static MonthlyIncomeReport Create(Guid landlordId, int year, int month, decimal totalIncome, decimal totalLateFees, decimal maintenanceCosts)
    {
        return new MonthlyIncomeReport
        {
            Id = Guid.NewGuid(),
            LandlordId = landlordId,
            Year = year,
            Month = month,
            TotalIncome = totalIncome,
            TotalLateFees = totalLateFees,
            TotalMaintenanceCosts = maintenanceCosts,
            CreatedAt = DateTime.UtcNow
        };
    }
}
