namespace DocumentService.Application.ReadModels;

public sealed record DocumentReadModel(
    Guid Id, Guid OwnerId, Guid? RelatedEntityId, string FileName, string FilePath,
    string ContentType, long FileSizeBytes, string DocumentType, DateTime CreatedAt);
