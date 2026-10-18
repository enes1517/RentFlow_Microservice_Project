using SharedKernel.Entities;

namespace DocumentService.Domain.Entities;

public class DocumentMetadata : BaseEntity
{
    public Guid OwnerId { get; private set; } // TenantId or LandlordId
    public Guid? RelatedEntityId { get; private set; } // LeaseId or PaymentId
    
    public string FileName { get; private set; } = string.Empty;
    public string FilePath { get; private set; } = string.Empty; // MinIO path or local path
    public string ContentType { get; private set; } = "application/pdf";
    public long FileSizeBytes { get; private set; }
    
    // Type: LEASE_CONTRACT, RENT_RECEIPT, EVICTION_NOTICE
    public string DocumentType { get; private set; } = string.Empty;

    protected DocumentMetadata() { }

    public static DocumentMetadata Create(Guid ownerId, Guid? relatedEntityId, string fileName, string filePath, string contentType, long sizeBytes, string documentType)
    {
        return new DocumentMetadata
        {
            Id = Guid.NewGuid(),
            OwnerId = ownerId,
            RelatedEntityId = relatedEntityId,
            FileName = fileName,
            FilePath = filePath,
            ContentType = contentType,
            FileSizeBytes = sizeBytes,
            DocumentType = documentType,
            CreatedAt = DateTime.UtcNow
        };
    }
}
