namespace PaymentService.Application.ReadModels;

public sealed record PaymentReadModel(
    Guid Id, Guid LeaseId, Guid TenantId, decimal Amount, string Currency, string PaymentType,
    string Status, string? FailureReason, DateTime CreatedAt, DateTime? UpdatedAt);
