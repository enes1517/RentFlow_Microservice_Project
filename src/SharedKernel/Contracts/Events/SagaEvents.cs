namespace SharedKernel.Contracts.Events;

// ================================================================
// LEASE AGREEMENT SAGA — Eventler
// ================================================================

/// <summary>Kira sözleşmesi oluşturuldu — Saga başlatır</summary>
public sealed record LeaseAgreementCreatedEvent(
    Guid CorrelationId,
    Guid LeaseId,
    Guid PropertyId,
    Guid TenantId,
    Guid LandlordId,
    decimal MonthlyRent,
    decimal DepositAmount,
    DateTime StartDate,
    DateTime EndDate,
    int PaymentDayOfMonth);

/// <summary>Mülk müsait — Saga devam eder</summary>
public sealed record PropertyAvailabilityConfirmedEvent(
    Guid CorrelationId,
    Guid PropertyId);

/// <summary>Mülk müsait değil — Saga Failed'a geçer</summary>
public sealed record PropertyNotAvailableEvent(
    Guid CorrelationId,
    Guid PropertyId,
    string Reason);

/// <summary>Sözleşme PDF oluşturuldu — Saga devam eder</summary>
public sealed record LeaseContractCreatedEvent(
    Guid CorrelationId,
    Guid LeaseId,
    string ContractPdfUrl);

/// <summary>Depozito tahsil edildi — Saga devam eder</summary>
public sealed record DepositCollectedEvent(
    Guid CorrelationId,
    Guid LeaseId,
    Guid PaymentId,
    decimal Amount);

/// <summary>Depozito tahsil edilemedi — Compensating Transaction başlar</summary>
public sealed record DepositCollectionFailedEvent(
    Guid CorrelationId,
    Guid LeaseId,
    string Reason);

/// <summary>Mülk durumu güncellendi</summary>
public sealed record PropertyStatusUpdatedEvent(
    Guid CorrelationId,
    Guid PropertyId,
    string NewStatus);

/// <summary>Sözleşme PDF silindi — Compensating Transaction adımı</summary>
public sealed record LeaseContractDeletedEvent(
    Guid CorrelationId,
    Guid LeaseId);

/// <summary>Mülk serbest bırakıldı — Compensating Transaction adımı</summary>
public sealed record PropertyReleasedEvent(
    Guid CorrelationId,
    Guid PropertyId);

// ================================================================
// RENT PAYMENT SAGA — Eventler
// ================================================================

/// <summary>Kira ödemesi başlatıldı — Saga başlatır</summary>
public sealed record RentPaymentInitiatedEvent(
    Guid CorrelationId,
    Guid PaymentId,
    Guid LeaseId,
    Guid TenantId,
    decimal Amount,
    DateTime DueDate);

/// <summary>Kira sözleşmesi geçerli — Saga devam eder</summary>
public sealed record LeaseValidatedEvent(
    Guid CorrelationId,
    Guid LeaseId,
    Guid TenantId);

/// <summary>Kira sözleşmesi geçersiz — Saga Failed'a geçer</summary>
public sealed record LeaseValidationFailedEvent(
    Guid CorrelationId,
    Guid LeaseId,
    string Reason);

/// <summary>Ödeme başarılı — Saga devam eder</summary>
public sealed record PaymentProcessedEvent(
    Guid CorrelationId,
    Guid PaymentId,
    string TransactionRef,
    decimal Amount);

/// <summary>Ödeme başarısız — Saga Failed'a geçer</summary>
public sealed record PaymentFailedEvent(
    Guid CorrelationId,
    Guid PaymentId,
    string Reason);

/// <summary>Makbuz oluşturuldu — Saga devam eder</summary>
public sealed record ReceiptGeneratedEvent(
    Guid CorrelationId,
    Guid PaymentId,
    string ReceiptUrl);

// ================================================================
// LEASE TERMINATION SAGA — Eventler
// ================================================================

/// <summary>Kira sözleşmesi sonlandırma talebi — Saga başlatır</summary>
public sealed record LeaseTerminationRequestedEvent(
    Guid CorrelationId,
    Guid LeaseId,
    Guid PropertyId,
    Guid TenantId,
    Guid LandlordId,
    decimal DepositAmount,
    DateTime TerminationDate,
    string Reason);

/// <summary>Hasar değerlendirmesi tamamlandı</summary>
public sealed record DamageAssessedEvent(
    Guid CorrelationId,
    Guid LeaseId,
    decimal DamageCost,
    string DamageDescription);

/// <summary>Depozito iadesi işlendi</summary>
public sealed record DepositRefundedEvent(
    Guid CorrelationId,
    Guid LeaseId,
    decimal RefundAmount);

// ================================================================
// ORTAK EVENTLER
// ================================================================

/// <summary>Bildirim gönderildi</summary>
public sealed record NotificationSentEvent(
    Guid CorrelationId,
    Guid RecipientId,
    string NotificationType);

/// <summary>Ödeme geç olarak işaretlendi (faiz yok — sadece durum)</summary>
public sealed record PaymentMarkedAsLateEvent(
    Guid PaymentId,
    Guid LeaseId,
    Guid TenantId,
    DateTime DueDate);

/// <summary>Kiracı platforma davet edildi</summary>
public sealed record TenantInvitedEvent(
    string Email,
    string FirstName,
    string LastName,
    Guid LandlordId,
    Guid PropertyId,
    Guid UnitId,
    string InvitationToken);
