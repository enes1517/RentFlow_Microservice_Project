using MassTransit;
using MassTransit.Testing;
using Microsoft.Extensions.DependencyInjection;
using SagaOrchestrator.API.SagaStates;
using SagaOrchestrator.API.StateMachines;
using SharedKernel.Contracts;

namespace SagaOrchestrator.Tests;

public sealed class SagaStateMachineTests
{
    [Fact]
    public async Task Rent_payment_terminal_event_is_not_reversed_by_late_opposite_event()
    {
        await using var provider = CreateProvider<RentPaymentSagaState, RentPaymentSaga>();
        var harness = provider.GetRequiredService<ITestHarness>();
        var machine = provider.GetRequiredService<RentPaymentSaga>();
        var saga = harness.GetSagaStateMachineHarness<RentPaymentSaga, RentPaymentSagaState>();
        var paymentId = Guid.NewGuid();

        await harness.Start();
        try
        {
            await harness.Bus.Publish<IRentPaymentCompletedEvent>(new
            {
                PaymentId = paymentId,
                LeaseId = Guid.NewGuid(),
                TenantId = Guid.NewGuid(),
                Amount = 1250m
            });
            Assert.NotNull(await saga.Exists(paymentId, machine.ProcessingSuccess));

            await harness.Bus.Publish<IRentPaymentFailedEvent>(new
            {
                PaymentId = paymentId,
                LeaseId = Guid.NewGuid(),
                TenantId = Guid.NewGuid(),
                Amount = 1250m,
                Reason = "late duplicate failure"
            });
            Assert.NotNull(await saga.Exists(paymentId, machine.ProcessingSuccess));
            Assert.Null(await saga.Exists(paymentId, machine.ProcessingFailure, TimeSpan.FromMilliseconds(200)));
        }
        finally
        {
            await harness.Stop();
        }
    }

    [Fact]
    public async Task Rent_payment_failure_remains_terminal_after_late_success()
    {
        await using var provider = CreateProvider<RentPaymentSagaState, RentPaymentSaga>();
        var harness = provider.GetRequiredService<ITestHarness>();
        var machine = provider.GetRequiredService<RentPaymentSaga>();
        var saga = harness.GetSagaStateMachineHarness<RentPaymentSaga, RentPaymentSagaState>();
        var paymentId = Guid.NewGuid();

        await harness.Start();
        try
        {
            await harness.Bus.Publish<IRentPaymentFailedEvent>(new
            {
                PaymentId = paymentId,
                LeaseId = Guid.NewGuid(),
                TenantId = Guid.NewGuid(),
                Amount = 1250m,
                Reason = "processor declined"
            });
            Assert.NotNull(await saga.Exists(paymentId, machine.ProcessingFailure));

            await harness.Bus.Publish<IRentPaymentCompletedEvent>(new
            {
                PaymentId = paymentId,
                LeaseId = Guid.NewGuid(),
                TenantId = Guid.NewGuid(),
                Amount = 1250m
            });
            Assert.NotNull(await saga.Exists(paymentId, machine.ProcessingFailure));
            Assert.Null(await saga.Exists(paymentId, machine.ProcessingSuccess, TimeSpan.FromMilliseconds(200)));
        }
        finally
        {
            await harness.Stop();
        }
    }

    [Fact]
    public async Task Late_property_reservation_after_timeout_is_released_not_advanced()
    {
        await using var provider = CreateProvider<LeaseAgreementSagaState, LeaseAgreementSaga>();
        var harness = provider.GetRequiredService<ITestHarness>();
        var machine = provider.GetRequiredService<LeaseAgreementSaga>();
        var saga = harness.GetSagaStateMachineHarness<LeaseAgreementSaga, LeaseAgreementSagaState>();
        var leaseId = Guid.NewGuid();
        var propertyId = Guid.NewGuid();
        var unitId = Guid.NewGuid();

        await harness.Start();
        try
        {
            await harness.Bus.Publish<ILeaseAgreementCreatedEvent>(new
            {
                LeaseId = leaseId,
                TenantId = Guid.NewGuid(),
                LandlordId = Guid.NewGuid(),
                PropertyId = propertyId,
                UnitId = unitId,
                MonthlyRentAmount = 1250m,
                DepositAmount = 2500m
            });
            Assert.NotNull(await saga.Exists(leaseId, machine.ReservingProperty));

            await harness.Bus.Publish(new LeaseAgreementSagaStageTimedOut(
                leaseId, nameof(LeaseAgreementSaga.ReservingProperty)));
            Assert.NotNull(await saga.Exists(leaseId, machine.PropertyReservationTimedOut));

            await harness.Bus.Publish<IPropertyReservedEvent>(new
            {
                LeaseId = leaseId,
                PropertyId = propertyId
            });
            Assert.NotNull(await saga.Exists(leaseId, machine.PropertyReservationTimedOut));
            Assert.Null(await saga.Exists(leaseId, machine.GeneratingContract, TimeSpan.FromMilliseconds(200)));
            Assert.Equal(2, await harness.Published.SelectAsync<ILeaseCancelledEvent>().Count());
            Assert.Empty(await harness.Published.SelectAsync<IGenerateLeaseContractCommand>().ToListAsync());
        }
        finally
        {
            await harness.Stop();
        }
    }

    [Fact]
    public async Task Property_reservation_failure_is_terminal_and_compensates_reservation()
    {
        await using var provider = CreateProvider<LeaseAgreementSagaState, LeaseAgreementSaga>();
        var harness = provider.GetRequiredService<ITestHarness>();
        var machine = provider.GetRequiredService<LeaseAgreementSaga>();
        var saga = harness.GetSagaStateMachineHarness<LeaseAgreementSaga, LeaseAgreementSagaState>();
        var leaseId = Guid.NewGuid();
        var propertyId = Guid.NewGuid();

        await harness.Start();
        try
        {
            await harness.Bus.Publish<ILeaseAgreementCreatedEvent>(new
            {
                LeaseId = leaseId,
                TenantId = Guid.NewGuid(),
                LandlordId = Guid.NewGuid(),
                PropertyId = propertyId,
                UnitId = Guid.NewGuid(),
                MonthlyRentAmount = 1250m,
                DepositAmount = 2500m
            });
            await saga.Exists(leaseId, machine.ReservingProperty);
            await harness.Bus.Publish<IPropertyReservationFailedEvent>(new
            {
                LeaseId = leaseId,
                PropertyId = propertyId,
                Reason = "unit unavailable"
            });

            Assert.NotNull(await saga.Exists(leaseId, machine.PropertyReservationFailure));
            var cancellation = Assert.Single(await harness.Published.SelectAsync<ILeaseCancelledEvent>().ToListAsync());
            Assert.Equal(leaseId, cancellation.Context.Message.LeaseId);
            Assert.Equal("unit unavailable", cancellation.Context.Message.Reason);
            Assert.Empty(await harness.Published.SelectAsync<IGenerateLeaseContractCommand>().ToListAsync());
        }
        finally
        {
            await harness.Stop();
        }
    }

    [Fact]
    public async Task Activation_timeout_does_not_cancel_lease_and_late_activation_finishes_property_step()
    {
        await using var provider = CreateProvider<LeaseAgreementSagaState, LeaseAgreementSaga>();
        var harness = provider.GetRequiredService<ITestHarness>();
        var machine = provider.GetRequiredService<LeaseAgreementSaga>();
        var saga = harness.GetSagaStateMachineHarness<LeaseAgreementSaga, LeaseAgreementSagaState>();
        var leaseId = Guid.NewGuid();
        var propertyId = Guid.NewGuid();
        var unitId = Guid.NewGuid();

        await harness.Start();
        try
        {
            await harness.Bus.Publish<ILeaseAgreementCreatedEvent>(new
            {
                LeaseId = leaseId,
                TenantId = Guid.NewGuid(),
                LandlordId = Guid.NewGuid(),
                PropertyId = propertyId,
                UnitId = unitId,
                MonthlyRentAmount = 1250m,
                DepositAmount = 2500m
            });
            await saga.Exists(leaseId, machine.ReservingProperty);
            await harness.Bus.Publish<IPropertyReservedEvent>(new { LeaseId = leaseId, PropertyId = propertyId });
            await saga.Exists(leaseId, machine.GeneratingContract);
            await harness.Bus.Publish<ILeaseContractGeneratedEvent>(new { LeaseId = leaseId, DocumentId = Guid.NewGuid() });
            await saga.Exists(leaseId, machine.ActivatingLease);
            await harness.Bus.Publish(new LeaseAgreementSagaStageTimedOut(
                leaseId, nameof(LeaseAgreementSaga.ActivatingLease)));
            Assert.NotNull(await saga.Exists(leaseId, machine.LeaseActivationTimedOut));

            await harness.Bus.Publish<ILeaseActivatedEvent>(new { LeaseId = leaseId });
            Assert.NotNull(await saga.Exists(leaseId, machine.LeaseActivationTimedOut));
            Assert.Equal(1, await harness.Published.SelectAsync<IMarkUnitRentedCommand>().Count());
            Assert.Empty(await harness.Published.SelectAsync<ILeaseCancelledEvent>().ToListAsync());

            await harness.Bus.Publish<IUnitMarkedRentedEvent>(new { LeaseId = leaseId });
            Assert.NotNull(await saga.Exists(leaseId, machine.Completed));
        }
        finally
        {
            await harness.Stop();
        }
    }

    [Fact]
    public async Task Lease_completion_keeps_terminal_saga_and_ignores_duplicate_start()
    {
        await using var provider = CreateProvider<LeaseAgreementSagaState, LeaseAgreementSaga>();
        var harness = provider.GetRequiredService<ITestHarness>();
        var machine = provider.GetRequiredService<LeaseAgreementSaga>();
        var saga = harness.GetSagaStateMachineHarness<LeaseAgreementSaga, LeaseAgreementSagaState>();
        var leaseId = Guid.NewGuid();
        var propertyId = Guid.NewGuid();
        var unitId = Guid.NewGuid();
        var created = new
        {
            LeaseId = leaseId,
            TenantId = Guid.NewGuid(),
            LandlordId = Guid.NewGuid(),
            PropertyId = propertyId,
            UnitId = unitId,
            MonthlyRentAmount = 1250m,
            DepositAmount = 2500m
        };

        await harness.Start();
        try
        {
            await harness.Bus.Publish<ILeaseAgreementCreatedEvent>(created);
            Assert.NotNull(await saga.Exists(leaseId, machine.ReservingProperty));
            await harness.Bus.Publish<IPropertyReservedEvent>(new { LeaseId = leaseId, PropertyId = propertyId });
            Assert.NotNull(await saga.Exists(leaseId, machine.GeneratingContract));
            await harness.Bus.Publish<ILeaseContractGeneratedEvent>(new { LeaseId = leaseId, DocumentId = Guid.NewGuid() });
            Assert.NotNull(await saga.Exists(leaseId, machine.ActivatingLease));
            await harness.Bus.Publish<ILeaseActivatedEvent>(new { LeaseId = leaseId });
            Assert.NotNull(await saga.Exists(leaseId, machine.MarkingUnitRented));
            await harness.Bus.Publish<IUnitMarkedRentedEvent>(new { LeaseId = leaseId });
            Assert.NotNull(await saga.Exists(leaseId, machine.Completed));

            await harness.Bus.Publish<ILeaseAgreementCreatedEvent>(created);
            Assert.NotNull(await saga.Exists(leaseId, machine.Completed));
            Assert.Equal(1, await harness.Published.SelectAsync<IReservePropertyCommand>().Count());
        }
        finally
        {
            await harness.Stop();
        }
    }

    [Fact]
    public void Lease_timeout_policy_is_bounded_for_every_waiting_stage()
    {
        Assert.Equal(TimeSpan.FromMinutes(2), LeaseAgreementSagaTimeoutPolicy.GetTimeout(nameof(LeaseAgreementSaga.ReservingProperty)));
        Assert.Equal(TimeSpan.FromMinutes(5), LeaseAgreementSagaTimeoutPolicy.GetTimeout(nameof(LeaseAgreementSaga.GeneratingContract)));
        Assert.Equal(TimeSpan.FromMinutes(2), LeaseAgreementSagaTimeoutPolicy.GetTimeout(nameof(LeaseAgreementSaga.ActivatingLease)));
        Assert.Equal(TimeSpan.FromMinutes(2), LeaseAgreementSagaTimeoutPolicy.GetTimeout(nameof(LeaseAgreementSaga.MarkingUnitRented)));
        Assert.Null(LeaseAgreementSagaTimeoutPolicy.GetTimeout(nameof(LeaseAgreementSaga.Completed)));

        var now = DateTime.UtcNow;
        Assert.False(LeaseAgreementSagaTimeoutPolicy.IsExpired(
            nameof(LeaseAgreementSaga.GeneratingContract),
            now - TimeSpan.FromMinutes(5) + TimeSpan.FromSeconds(1),
            now));
        Assert.True(LeaseAgreementSagaTimeoutPolicy.IsExpired(
            nameof(LeaseAgreementSaga.GeneratingContract),
            now - TimeSpan.FromMinutes(5),
            now));
        Assert.False(LeaseAgreementSagaTimeoutPolicy.IsExpired(
            nameof(LeaseAgreementSaga.Completed),
            now - TimeSpan.FromDays(1),
            now));
    }

    private static ServiceProvider CreateProvider<TSaga, TStateMachine>()
        where TSaga : class, SagaStateMachineInstance
        where TStateMachine : MassTransitStateMachine<TSaga>
    {
        var services = new ServiceCollection();
        services.AddMassTransitTestHarness(configurator =>
        {
            configurator.AddSagaStateMachine<TStateMachine, TSaga>().InMemoryRepository();
        });

        return services.BuildServiceProvider(true);
    }
}
