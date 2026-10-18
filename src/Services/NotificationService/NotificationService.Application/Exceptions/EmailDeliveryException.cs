namespace NotificationService.Application.Exceptions;

public sealed class EmailDeliveryException(string message, Exception innerException)
    : Exception(message, innerException);
