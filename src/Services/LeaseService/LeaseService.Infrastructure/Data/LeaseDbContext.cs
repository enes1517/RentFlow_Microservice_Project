using Microsoft.EntityFrameworkCore;
using LeaseService.Domain.Entities;
using SharedKernel.Messaging;

namespace LeaseService.Infrastructure.Data;

public class LeaseDbContext : DbContext
{
    public LeaseDbContext(DbContextOptions<LeaseDbContext> options) : base(options)
    {
    }

    public DbSet<LeaseAgreement> LeaseAgreements { get; set; } = null!;
    public DbSet<OutboxMessage> OutboxMessages { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<LeaseAgreement>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
            entity.Property(e => e.MonthlyRentAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.DepositAmount).HasColumnType("decimal(18,2)");
        });

        modelBuilder.Entity<OutboxMessage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.MessageType).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Payload).IsRequired().HasColumnType("nvarchar(max)");
            entity.Property<Guid?>("ClaimToken");
            entity.Property<DateTime?>("ClaimedUntil");
            entity.Property<DateTime?>("NextAttemptAt");
        });
    }
}
