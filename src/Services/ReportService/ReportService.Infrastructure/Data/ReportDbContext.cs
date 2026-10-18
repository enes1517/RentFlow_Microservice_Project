using Microsoft.EntityFrameworkCore;
using MassTransit;
using ReportService.Domain.Entities;

namespace ReportService.Infrastructure.Data;

public class ReportDbContext : DbContext
{
    public ReportDbContext(DbContextOptions<ReportDbContext> options) : base(options)
    {
    }

    public DbSet<MonthlyIncomeReport> MonthlyIncomeReports { get; set; } = null!;
    public DbSet<PropertyReportProjection> Properties { get; set; } = null!;
    public DbSet<LeaseReportProjection> Leases { get; set; } = null!;
    public DbSet<PaymentReportProjection> Payments { get; set; } = null!;
    public DbSet<MaintenanceReportProjection> MaintenanceRequests { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<MonthlyIncomeReport>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TotalIncome).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TotalLateFees).HasColumnType("decimal(18,2)");
            entity.Property(e => e.TotalMaintenanceCosts).HasColumnType("decimal(18,2)");
            // Year and Month composite index for fast lookups
            entity.HasIndex(e => new { e.LandlordId, e.Year, e.Month }).IsUnique();
        });

        modelBuilder.Entity<PropertyReportProjection>(entity =>
        {
            entity.ToTable("ReportProperties");
            entity.HasKey(x => x.PropertyId);
            entity.HasIndex(x => x.LandlordId);
        });
        modelBuilder.Entity<LeaseReportProjection>(entity =>
        {
            entity.ToTable("ReportLeases");
            entity.HasKey(x => x.LeaseId);
            entity.Property(x => x.Status).HasMaxLength(32).IsRequired();
            entity.HasIndex(x => x.LandlordId);
        });
        modelBuilder.Entity<PaymentReportProjection>(entity =>
        {
            entity.ToTable("ReportPayments");
            entity.HasKey(x => x.PaymentId);
            entity.Property(x => x.Amount).HasColumnType("decimal(18,2)");
            entity.Property(x => x.PaymentType).HasMaxLength(32).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(32).IsRequired();
            entity.Property(x => x.Currency).HasMaxLength(3).IsRequired();
            entity.HasIndex(x => x.LeaseId);
        });
        modelBuilder.Entity<MaintenanceReportProjection>(entity =>
        {
            entity.ToTable("ReportMaintenanceRequests");
            entity.HasKey(x => x.MaintenanceId);
            entity.Property(x => x.Status).HasMaxLength(32).IsRequired();
            entity.Property(x => x.EstimatedCost).HasColumnType("decimal(18,2)");
            entity.HasIndex(x => x.PropertyId);
        });

        modelBuilder.AddInboxStateEntity();
        modelBuilder.AddOutboxMessageEntity();
        modelBuilder.AddOutboxStateEntity();
    }
}
