using MassTransit;
using MassTransit.Testing;
using Microsoft.Extensions.DependencyInjection;
using SagaOrchestrator.API.SagaStates;
using SagaOrchestrator.API.StateMachines;
using SharedKernel.Contracts.Commands;
using SharedKernel.Contracts.Events;
using Xunit;

namespace SagaOrchestrator.IntegrationTests;

public class LeaseTerminationSagaTests
{
    [Fact]
    public async Task Should_Process_Lease_Termination_End_To_End()
    {
        var services = new ServiceCollection();
        
        services.AddMassTransitTestHarness(x =>
        {
            x.AddSagaStateMachine<LeaseTerminationSaga, LeaseTerminationSagaState>().InMemoryRepository();
        });
        
        var provider = services.BuildServiceProvider(true);
        var harness = provider.GetRequiredService<ITestHarness>();
        var sagaHarness = harness.GetSagaStateMachineHarness<LeaseTerminationSaga, LeaseTerminationSagaState>();
        var machine = provider.GetRequiredService<LeaseTerminationSaga>();
        
        await harness.Start();
        
        try
        {
            var correlationId = Guid.NewGuid();
            var leaseId = Guid.NewGuid();
            var propertyId = Guid.NewGuid();
            var tenantId = Guid.NewGuid();
            var landlordId = Guid.NewGuid();
            var depositAmount = 5000m;
            var damageCost = 1000m;
            var refundAmount = 4000m;
            
            // 1. Publish LeaseTerminationRequestedEvent
            await harness.Bus.Publish(new LeaseTerminationRequestedEvent(
                correlationId,
                leaseId,
                propertyId,
                tenantId,
                landlordId,
                depositAmount,
                DateTime.UtcNow,
                "Tenant moving out"
            ));
            
            // Wait for Saga to advance to AssessingDamage
            Assert.NotNull(await sagaHarness.Exists(correlationId, machine.AssessingDamage));
            Assert.True(await harness.Published.Any<AssessDamageCommand>());
            
            // 2. Simulate MaintenanceService responding with DamageAssessedEvent
            await harness.Bus.Publish(new DamageAssessedEvent(
                correlationId,
                leaseId,
                damageCost,
                "Wall paint damage"
            ));
            
            // Wait for Saga to advance to RefundingDeposit
            Assert.NotNull(await sagaHarness.Exists(correlationId, machine.RefundingDeposit));
            Assert.True(await harness.Published.Any<RefundDepositCommand>());
            
            // 3. Simulate PaymentService responding with DepositRefundedEvent
            await harness.Bus.Publish(new DepositRefundedEvent(
                correlationId,
                leaseId,
                refundAmount
            ));
            
            // Wait for Saga to advance to ReleasingProperty
            Assert.NotNull(await sagaHarness.Exists(correlationId, machine.ReleasingProperty));
            Assert.True(await harness.Published.Any<ReleasePropertyCommand>());
            
            // 4. Simulate PropertyService responding with PropertyReleasedEvent
            await harness.Bus.Publish(new PropertyReleasedEvent(
                correlationId,
                propertyId
            ));
            
            // Wait for Saga to reach Completed
            Assert.NotNull(await sagaHarness.Exists(correlationId, machine.Completed));
        }
        finally
        {
            await harness.Stop();
        }
    }
}
