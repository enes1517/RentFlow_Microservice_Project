using MediatR;
using SharedKernel.Common;
using SharedKernel.Messaging;
using PaymentService.Domain.Entities;
using PaymentService.Application.Interfaces;
using System.Text.Json;

namespace PaymentService.Application.Commands;

// ─── PayRent ─────────────────────────────────────────────────────────────────

public record PayRentCommand(
    Guid LeaseId,
    Guid TenantId,
    decimal Amount,
    string Currency = "TRY"
) : IRequest<Result<CommandOutcome>>;

public class PayRentCommandHandler : IRequestHandler<PayRentCommand, Result<CommandOutcome>>
{
    private readonly IPaymentWriteRepository _paymentRepository;
    private readonly IPaymentProcessor _paymentProcessor;

    public PayRentCommandHandler(IPaymentWriteRepository paymentRepository, IPaymentProcessor paymentProcessor)
    {
        _paymentRepository = paymentRepository;
        _paymentProcessor = paymentProcessor;
    }

    public async Task<Result<CommandOutcome>> Handle(PayRentCommand request, CancellationToken cancellationToken)
    {
        // 1. Ödeme kaydı oluştur
        var payment = PaymentTransaction.Create(
            request.LeaseId,
            request.TenantId,
            request.Amount,
            "RENT",
            request.Currency);

        var attempt = await _paymentProcessor.ProcessAsync(
            request.LeaseId,
            request.TenantId,
            request.Amount,
            request.Currency,
            "RENT",
            cancellationToken);
        if (!attempt.IsAvailable)
        {
            return Result.Failure<CommandOutcome>(new Error("PAYMENTS_DISABLED", attempt.FailureReason!));
        }

        if (attempt.IsSuccessful)
            payment.MarkAsSuccess();
        else
            payment.MarkAsFailed(attempt.FailureReason ?? "Payment failed.");

        var eventType = attempt.IsSuccessful ? "RentPaymentCompletedEvent" : "RentPaymentFailedEvent";
        var payload = JsonSerializer.Serialize(new
        {
            PaymentId = payment.Id,
            LeaseId = payment.LeaseId,
            TenantId = payment.TenantId,
            Amount = payment.Amount,
            Currency = payment.Currency,
            CreatedAt = payment.CreatedAt,
            Reason = payment.FailureReason
        });

        var outboxMessage = OutboxMessage.Create(eventType, payload, "payment-events");
        await _paymentRepository.AddAsync(payment, outboxMessage, cancellationToken);

        return Result.Success(new CommandOutcome(payment.Id, payment.Status, payment.FailureReason));
    }
}

// ─── PayDeposit ───────────────────────────────────────────────────────────────

public record PayDepositCommand(
    Guid LeaseId,
    Guid TenantId,
    decimal Amount,
    string Currency = "TRY"
) : IRequest<Result<CommandOutcome>>;

public class PayDepositCommandHandler : IRequestHandler<PayDepositCommand, Result<CommandOutcome>>
{
    private readonly IPaymentWriteRepository _paymentRepository;
    private readonly IPaymentProcessor _paymentProcessor;

    public PayDepositCommandHandler(IPaymentWriteRepository paymentRepository, IPaymentProcessor paymentProcessor)
    {
        _paymentRepository = paymentRepository;
        _paymentProcessor = paymentProcessor;
    }

    public async Task<Result<CommandOutcome>> Handle(PayDepositCommand request, CancellationToken cancellationToken)
    {
        var payment = PaymentTransaction.Create(
            request.LeaseId,
            request.TenantId,
            request.Amount,
            "DEPOSIT",
            request.Currency);

        var attempt = await _paymentProcessor.ProcessAsync(
            request.LeaseId,
            request.TenantId,
            request.Amount,
            request.Currency,
            "DEPOSIT",
            cancellationToken);
        if (!attempt.IsAvailable)
        {
            return Result.Failure<CommandOutcome>(new Error("PAYMENTS_DISABLED", attempt.FailureReason!));
        }

        if (attempt.IsSuccessful)
            payment.MarkAsSuccess();
        else
            payment.MarkAsFailed(attempt.FailureReason ?? "Payment failed.");

        var payload = JsonSerializer.Serialize(new
        {
            PaymentId = payment.Id,
            LeaseId = payment.LeaseId,
            TenantId = payment.TenantId,
            Amount = payment.Amount,
            Currency = payment.Currency,
            CreatedAt = payment.CreatedAt,
            Reason = payment.FailureReason
        });

        var eventType = attempt.IsSuccessful ? "DepositPaymentCompletedEvent" : "DepositPaymentFailedEvent";
        var outboxMessage = OutboxMessage.Create(eventType, payload, "payment-events");
        await _paymentRepository.AddAsync(payment, outboxMessage, cancellationToken);

        return Result.Success(new CommandOutcome(payment.Id, payment.Status));
    }
}
