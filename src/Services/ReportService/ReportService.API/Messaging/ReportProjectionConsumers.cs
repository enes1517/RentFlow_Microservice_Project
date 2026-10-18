using MassTransit;
using Microsoft.EntityFrameworkCore;
using ReportService.Domain.Entities;
using ReportService.Infrastructure.Data;
using SharedKernel.Contracts;
using SharedKernel.Contracts.Events;

namespace ReportService.API.Messaging;

public sealed class PropertyReportProjectionConsumer(ReportDbContext db) : IConsumer<PropertyReportDataChangedEvent>
{
    public async Task Consume(ConsumeContext<PropertyReportDataChangedEvent> context)
    {
        var message = context.Message;
        var projection = await db.Properties.FindAsync([message.PropertyId], context.CancellationToken);
        if (projection is null)
            db.Properties.Add(PropertyReportProjection.Create(message.PropertyId, message.LandlordId, message.ChangedAt));
        else
            projection.Update(message.LandlordId, message.ChangedAt);
        await db.SaveChangesAsync(context.CancellationToken);
    }
}

public sealed class MaintenanceReportProjectionConsumer(ReportDbContext db) : IConsumer<MaintenanceReportDataChangedEvent>
{
    public async Task Consume(ConsumeContext<MaintenanceReportDataChangedEvent> context)
    {
        var message = context.Message;
        var projection = await db.MaintenanceRequests.FindAsync([message.MaintenanceId], context.CancellationToken);
        if (projection is null)
            db.MaintenanceRequests.Add(MaintenanceReportProjection.Create(
                message.MaintenanceId, message.PropertyId, message.Status, message.EstimatedCost,
                message.CreatedAt, message.UpdatedAt));
        else
            projection.Update(message.Status, message.EstimatedCost, message.CreatedAt, message.UpdatedAt);
        await db.SaveChangesAsync(context.CancellationToken);
    }
}

public sealed class LeaseCreatedReportProjectionConsumer(ReportDbContext db) : IConsumer<ILeaseAgreementCreatedEvent>
{
    public async Task Consume(ConsumeContext<ILeaseAgreementCreatedEvent> context)
    {
        var message = context.Message;
        var changedAt = (context.SentTime ?? DateTime.UtcNow).ToUniversalTime();
        var projection = await db.Leases.FindAsync([message.LeaseId], context.CancellationToken);
        if (projection is null)
            db.Leases.Add(LeaseReportProjection.Create(message.LeaseId, message.LandlordId, message.PropertyId, "PENDING", changedAt));
        else
            projection.Update("PENDING", changedAt);
        await db.SaveChangesAsync(context.CancellationToken);
    }
}

public sealed class LeaseCancelledReportProjectionConsumer(ReportDbContext db) : IConsumer<ILeaseCancelledEvent>
{
    public async Task Consume(ConsumeContext<ILeaseCancelledEvent> context)
    {
        var projection = await db.Leases.FindAsync([context.Message.LeaseId], context.CancellationToken);
        if (projection is not null)
        {
            projection.Update("CANCELLED", (context.SentTime ?? DateTime.UtcNow).ToUniversalTime());
            await db.SaveChangesAsync(context.CancellationToken);
        }
    }
}

public sealed class RentPaymentCompletedReportProjectionConsumer(ReportDbContext db) : IConsumer<IRentPaymentCompletedEvent>
{
    public Task Consume(ConsumeContext<IRentPaymentCompletedEvent> context) =>
        UpsertPaymentAsync(db, context.Message.PaymentId, context.Message.LeaseId, context.Message.Amount, "RENT", "SUCCESS",
            ResolveOccurredAt(context.Message.CreatedAt, context.SentTime), context.Message.Currency ?? "UNKNOWN",
            context.CancellationToken);

    internal static async Task UpsertPaymentAsync(
        ReportDbContext db, Guid id, Guid leaseId, decimal amount, string type, string status, DateTime occurredAt,
        string currency,
        CancellationToken cancellationToken)
    {
        var projection = await db.Payments.FindAsync([id], cancellationToken);
        if (projection is null)
            db.Payments.Add(PaymentReportProjection.Create(id, leaseId, amount, type, status, occurredAt, currency));
        else
            projection.Update(status, occurredAt, currency);
        await db.SaveChangesAsync(cancellationToken);
    }

    internal static DateTime ResolveOccurredAt(DateTime createdAt, DateTime? sentAt) =>
        (createdAt == default ? sentAt ?? DateTime.UtcNow : createdAt).ToUniversalTime();
}

public sealed class RentPaymentFailedReportProjectionConsumer(ReportDbContext db) : IConsumer<IRentPaymentFailedEvent>
{
    public Task Consume(ConsumeContext<IRentPaymentFailedEvent> context) =>
        RentPaymentCompletedReportProjectionConsumer.UpsertPaymentAsync(
            db, context.Message.PaymentId, context.Message.LeaseId, context.Message.Amount, "RENT", "FAILED",
            RentPaymentCompletedReportProjectionConsumer.ResolveOccurredAt(context.Message.CreatedAt, context.SentTime),
            context.Message.Currency ?? "UNKNOWN", context.CancellationToken);
}

public sealed class DepositPaymentCompletedReportProjectionConsumer(ReportDbContext db) : IConsumer<IDepositPaymentCompletedEvent>
{
    public Task Consume(ConsumeContext<IDepositPaymentCompletedEvent> context) =>
        RentPaymentCompletedReportProjectionConsumer.UpsertPaymentAsync(
            db, context.Message.PaymentId, context.Message.LeaseId, context.Message.Amount, "DEPOSIT", "SUCCESS",
            RentPaymentCompletedReportProjectionConsumer.ResolveOccurredAt(context.Message.CreatedAt, context.SentTime),
            context.Message.Currency ?? "UNKNOWN", context.CancellationToken);
}

public sealed class DepositPaymentFailedReportProjectionConsumer(ReportDbContext db) : IConsumer<IDepositPaymentFailedEvent>
{
    public Task Consume(ConsumeContext<IDepositPaymentFailedEvent> context) =>
        RentPaymentCompletedReportProjectionConsumer.UpsertPaymentAsync(
            db, context.Message.PaymentId, context.Message.LeaseId, context.Message.Amount, "DEPOSIT", "FAILED",
            RentPaymentCompletedReportProjectionConsumer.ResolveOccurredAt(context.Message.CreatedAt, context.SentTime),
            context.Message.Currency ?? "UNKNOWN", context.CancellationToken);
}
