using Microsoft.EntityFrameworkCore;
using SharedKernel.Messaging;
using UserService.Domain.Entities;

namespace UserService.Infrastructure.Data;

public class UserDbContext : DbContext
{
    public UserDbContext(DbContextOptions<UserDbContext> options) : base(options)
    {
    }

    public DbSet<UserProfile> UserProfiles { get; set; } = null!;
    public DbSet<TenantInvitation> TenantInvitations { get; set; } = null!;
    public DbSet<OutboxMessage> OutboxMessages { get; set; } = null!; // SharedKernel'den gelen Outbox modeli

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<UserProfile>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.IdentityId).IsUnique(); // Keycloak Id eşsiz olmalı
            entity.HasIndex(e => e.Email).IsUnique();
            
            entity.Property(e => e.FirstName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.LastName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Role).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
        });

        modelBuilder.Entity<TenantInvitation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email);
            entity.HasIndex(e => e.InvitationToken).IsUnique();
            
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.Property(e => e.FirstName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.LastName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.InvitationToken).IsRequired().HasMaxLength(100);
            entity.Property(e => e.RentAmount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.DepositAmount).HasColumnType("decimal(18,2)");
        });

        modelBuilder.Entity<OutboxMessage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.MessageType).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Payload).IsRequired().HasColumnType("jsonb");
        });
    }
}
