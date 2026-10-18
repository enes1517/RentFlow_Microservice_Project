using MassTransit;
using MassTransit.EntityFrameworkCoreIntegration;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SagaOrchestrator.API.SagaStates;

namespace SagaOrchestrator.API.Data;

public class SagaDbContext : MassTransit.EntityFrameworkCoreIntegration.SagaDbContext
{
    public SagaDbContext(DbContextOptions<SagaDbContext> options) : base(options)
    {
    }

    protected override IEnumerable<ISagaClassMap> Configurations
    {
        get
        {
            yield return new LeaseAgreementSagaStateMap();
            yield return new RentPaymentSagaStateMap();
            yield return new LeaseTerminationSagaStateMap();
        }
    }
}

public class LeaseAgreementSagaStateMap : SagaClassMap<LeaseAgreementSagaState>
{
    protected override void Configure(EntityTypeBuilder<LeaseAgreementSagaState> entity, ModelBuilder model)
    {
        entity.Property(x => x.CurrentState).HasMaxLength(64);
        entity.Property(x => x.DepositAmount).HasColumnType("decimal(18,2)");
    }
}

public class RentPaymentSagaStateMap : SagaClassMap<RentPaymentSagaState>
{
    protected override void Configure(EntityTypeBuilder<RentPaymentSagaState> entity, ModelBuilder model)
    {
        entity.Property(x => x.CurrentState).HasMaxLength(64);
        entity.Property(x => x.Amount).HasColumnType("decimal(18,2)");
    }
}

public class LeaseTerminationSagaStateMap : SagaClassMap<LeaseTerminationSagaState>
{
    protected override void Configure(EntityTypeBuilder<LeaseTerminationSagaState> entity, ModelBuilder model)
    {
        entity.Property(x => x.CurrentState).HasMaxLength(64);
        entity.Property(x => x.DepositAmount).HasColumnType("decimal(18,2)");
        entity.Property(x => x.DamageCost).HasColumnType("decimal(18,2)");
        entity.Property(x => x.RefundAmount).HasColumnType("decimal(18,2)");
    }
}
