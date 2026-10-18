namespace SharedKernel.Common;

public sealed record CommandOutcome(Guid Id, string Status, string? Details = null);
