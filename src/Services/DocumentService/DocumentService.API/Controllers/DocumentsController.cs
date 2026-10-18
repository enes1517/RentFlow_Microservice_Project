using Microsoft.AspNetCore.Mvc;
using MediatR;
using DocumentService.Application.Commands;
using DocumentService.Application.Queries;
using Microsoft.AspNetCore.Authorization;
using SharedKernel.Security;

namespace DocumentService.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DocumentsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly Amazon.S3.IAmazonS3 _objectStorage;
    private readonly IConfiguration _configuration;
    private readonly ICurrentUserProfileResolver _currentUser;

    public DocumentsController(
        IMediator mediator,
        Amazon.S3.IAmazonS3 objectStorage,
        IConfiguration configuration,
        ICurrentUserProfileResolver currentUser)
    {
        _mediator = mediator;
        _objectStorage = objectStorage;
        _configuration = configuration;
        _currentUser = currentUser;
    }

    [HttpGet]
    [Authorize(Policy = "AdministratorsOnly")]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var pagination = new SharedKernel.Common.PagedQuery(page, pageSize);
        if (!pagination.IsValid)
            return BadRequest(new { message = "Page must be positive and pageSize must be between 1 and 100." });
        return OkPaged(await _mediator.Send(
            new GetDocumentsQuery(pagination), HttpContext.RequestAborted));
    }

    [HttpPost("generate-lease")]
    [Authorize(Roles = "ROLE_ADMIN,ROLE_TENANT,ROLE_LANDLORD")]
    public async Task<IActionResult> GenerateLeaseContract([FromBody] GenerateContractDto dto)
    {
        var profile = await _currentUser.GetRequiredAsync(HttpContext.RequestAborted);
        if (dto.LeaseId == Guid.Empty)
            return BadRequest(new { message = "Lease ID is required." });
        var lease = await GetLeaseAsync(dto.LeaseId, HttpContext.RequestAborted);
        if (lease is null)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Lease could not be verified." });
        if (lease.Status != "ACTIVE")
            return Conflict(new { message = "A lease contract can only be downloaded after the lease becomes active." });
        if (profile.Role != "ADMIN" &&
            (profile.Id != lease.TenantId && profile.Id != lease.LandlordId))
            return Forbid();

        var document = await _mediator.Send(new GenerateLeaseContractCommand(
            dto.LeaseId, lease.TenantId, lease.PropertyId, lease.MonthlyRentAmount, lease.DepositAmount,
            lease.LandlordId, lease.StartDate, lease.EndDate));
        return Ok(new { message = "Sözleşme PDF başarıyla oluşturuldu.", documentId = document.Id, url = $"/api/documents/{document.Id}/download" });
    }

    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> Download(Guid id, CancellationToken cancellationToken)
    {
        var document = await _mediator.Send(new GetDocumentByIdQuery(id), cancellationToken);
        if (document is null) return NotFound();
        var profile = await _currentUser.GetRequiredAsync(cancellationToken);
        if (profile.Role != "ADMIN")
        {
            if (profile.Role == "TENANT" && profile.Id == document.OwnerId)
            {
                return await DownloadFileAsync(document, cancellationToken);
            }

            if (profile.Role != "LANDLORD" || document.RelatedEntityId is null)
                return Forbid();
            var lease = await GetLeaseAsync(document.RelatedEntityId.Value, cancellationToken);
            if (lease is null)
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Lease ownership could not be verified." });
            if (lease.LandlordId != profile.Id) return Forbid();
        }

        return await DownloadFileAsync(document, cancellationToken);
    }

    private async Task<IActionResult> DownloadFileAsync(
        DocumentService.Application.ReadModels.DocumentReadModel document,
        CancellationToken cancellationToken)
    {
        var bucket = _configuration["Storage:Bucket"]
            ?? throw new InvalidOperationException("Storage:Bucket must be configured.");
        var response = await _objectStorage.GetObjectAsync(bucket, document.FilePath, cancellationToken);
        HttpContext.Response.RegisterForDispose(response);
        return File(response.ResponseStream, document.ContentType, document.FileName);
    }

    private Task<DocumentService.Application.Interfaces.DocumentLeaseLookup?> GetLeaseAsync(
        Guid leaseId, CancellationToken cancellationToken) =>
        _mediator.Send(new GetDocumentLeaseQuery(
            leaseId, Request.Headers.Authorization.ToString()), cancellationToken);

    private IActionResult OkPaged<T>(SharedKernel.Common.PagedResult<T> result)
    {
        Response.Headers["X-Total-Count"] = result.TotalCount.ToString();
        Response.Headers["X-Page"] = result.Page.ToString();
        Response.Headers["X-Page-Size"] = result.PageSize.ToString();
        Response.Headers["X-Total-Pages"] = result.TotalPages.ToString();
        return Ok(result.Items);
    }
}

public class GenerateContractDto
{
    public Guid LeaseId { get; set; }
}
