namespace NotificationService.Application.ReadModels;

public sealed record NotificationReadModel(
    Guid Id, Guid UserId, string Type, string Subject, string Content, string Status,
    string? ErrorMessage, DateTime CreatedAt, DateTime? UpdatedAt);
