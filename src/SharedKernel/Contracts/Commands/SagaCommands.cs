namespace SharedKernel.Contracts.Commands;

// ================================================================
// LEASE AGREEMENT SAGA — Komutlar
// ================================================================

/// <summary>Mülk müsaitlik kontrolü komutu (PropertyService tüketir)</summary>
public sealed record CheckPropertyAvailabilityCommand(
    Guid CorrelationId,
    Guid PropertyId,
    Guid TenantId,
    Guid LandlordId);

/// <summary>Kira sözleşmesi PDF oluşturma komutu (DocumentService tüketir)</summary>
public sealed record CreateLeaseContractCommand(
    Guid CorrelationId,
    Guid LeaseId,
    Guid PropertyId,
    Guid TenantId,
    Guid LandlordId,
    decimal MonthlyRent,
    decimal DepositAmount,
    DateTime StartDate,
    DateTime EndDate,
    string PropertyAddress,
    string TenantName,
    string LandlordName);

/// <summary>Depozito tahsilatı komutu (PaymentService tüketir)</summary>
public sealed record CollectDepositCommand(
    Guid CorrelationId,
    Guid LeaseId,
    Guid TenantId,
    decimal Amount);

/// <summary>Mülk durumunu güncelleme komutu (PropertyService tüketir)</summary>
public sealed record UpdatePropertyStatusCommand(
    Guid CorrelationId,
    Guid PropertyId,
    string NewStatus);

/// <summary>Mülkü serbest bırakma komutu — Compensating Transaction</summary>
public sealed record ReleasePropertyCommand(
    Guid CorrelationId,
    Guid PropertyId);

/// <summary>Sözleşme PDF silme komutu — Compensating Transaction</summary>
public sealed record DeleteLeaseContractCommand(
    Guid CorrelationId,
    Guid LeaseId);

// ================================================================
// RENT PAYMENT SAGA — Komutlar
// ================================================================

/// <summary>Kira sözleşmesi doğrulama komutu (LeaseService tüketir)</summary>
public sealed record ValidateLeaseCommand(
    Guid CorrelationId,
    Guid LeaseId,
    Guid TenantId);

/// <summary>Ödeme işleme komutu (PaymentService tüketir)</summary>
public sealed record ProcessPaymentCommand(
    Guid CorrelationId,
    Guid PaymentId,
    Guid LeaseId,
    Guid TenantId,
    decimal Amount,
    string PaymentType);

/// <summary>Makbuz oluşturma komutu (DocumentService tüketir)</summary>
public sealed record GenerateReceiptCommand(
    Guid CorrelationId,
    Guid PaymentId,
    Guid LeaseId,
    Guid TenantId,
    decimal Amount,
    DateTime PaymentDate,
    string TransactionRef);

// ================================================================
// LEASE TERMINATION SAGA — Komutlar
// ================================================================

/// <summary>Hasar değerlendirmesi komutu (MaintenanceService tüketir)</summary>
public sealed record AssessDamageCommand(
    Guid CorrelationId,
    Guid LeaseId,
    Guid PropertyId,
    Guid TenantId);

/// <summary>Depozito iadesi komutu (PaymentService tüketir)</summary>
public sealed record RefundDepositCommand(
    Guid CorrelationId,
    Guid LeaseId,
    Guid TenantId,
    decimal DepositAmount,
    decimal DamageCost,
    decimal RefundAmount);

// ================================================================
// ORTAK KOMUTLAR
// ================================================================

/// <summary>Bildirim gönderme komutu (NotificationService tüketir)</summary>
public sealed record SendNotificationCommand(
    Guid CorrelationId,
    Guid RecipientId,
    string RecipientEmail,
    string NotificationType,
    Dictionary<string, string> TemplateData);
