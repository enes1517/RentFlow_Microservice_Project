using MediatR;
using Microsoft.AspNetCore.Mvc;
using MaintenanceService.Application.Commands;
using MaintenanceService.Application.Queries;
using Microsoft.AspNetCore.Authorization;
using SharedKernel.Security;

namespace MaintenanceService.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MaintenanceRequestsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<MaintenanceRequestsController> _logger;
    private readonly ICurrentUserProfileResolver _currentUser;

    public MaintenanceRequestsController(
        IMediator mediator,
        ILogger<MaintenanceRequestsController> logger,
        ICurrentUserProfileResolver currentUser)
    {
        _mediator = mediator;
        _logger = logger;
        _currentUser = currentUser;
    }

    /// <summary>Tüm bakım taleplerini listeler. sortByPriority=true ile öncelik sırasına göre sıralar.</summary>
    [HttpGet]
    [Authorize(Policy = "AdministratorsOnly")]
    public async Task<IActionResult> GetAll(
        [FromQuery] bool sortByPriority = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var pagination = new SharedKernel.Common.PagedQuery(page, pageSize);
        if (!pagination.IsValid)
            return BadRequest(new { message = "Page must be positive and pageSize must be between 1 and 100." });
        var result = await _mediator.Send(
            new GetAllMaintenanceRequestsQuery(sortByPriority, pagination), HttpContext.RequestAborted);
        return result.IsSuccess ? OkPaged(result.Value) : BadRequest(result.Error);
    }

    /// <summary>ID'ye göre bakım talebi getirir.</summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetMaintenanceRequestByIdQuery(id));
        if (result.IsFailure) return NotFound(result.Error);
        var access = await CanAccessRequestAsync(result.Value);
        if (access is null)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Property ownership could not be verified." });
        if (!access.Value) return Forbid();
        return Ok(result.Value);
    }

    /// <summary>Kiracıya ait bakım taleplerini listeler.</summary>
    [HttpGet("tenant/{tenantId}")]
    public async Task<IActionResult> GetByTenant(
        Guid tenantId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var pagination = new SharedKernel.Common.PagedQuery(page, pageSize);
        if (!pagination.IsValid)
            return BadRequest(new { message = "Page must be positive and pageSize must be between 1 and 100." });
        if (!await CanAccessTenantAsync(tenantId)) return Forbid();

        var result = await _mediator.Send(new GetMaintenanceRequestsByTenantQuery(tenantId, pagination));
        return result.IsSuccess ? OkPaged(result.Value) : BadRequest(result.Error);
    }

    /// <summary>Bir mülke ait bakım taleplerini listeler.</summary>
    [HttpGet("property/{propertyId}")]
    [Authorize(Roles = "ROLE_ADMIN,ROLE_LANDLORD")]
    public async Task<IActionResult> GetByProperty(
        Guid propertyId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var pagination = new SharedKernel.Common.PagedQuery(page, pageSize);
        if (!pagination.IsValid)
            return BadRequest(new { message = "Page must be positive and pageSize must be between 1 and 100." });
        var profile = await _currentUser.GetRequiredAsync(HttpContext.RequestAborted);
        if (profile.Role == "LANDLORD")
        {
            var ownership = await OwnsPropertyAsync(profile.Id, propertyId);
            if (ownership is null)
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Property ownership could not be verified." });
            if (!ownership.Value) return Forbid();
        }
        var result = await _mediator.Send(new GetMaintenanceRequestsByPropertyQuery(propertyId, pagination));
        return result.IsSuccess ? OkPaged(result.Value) : BadRequest(result.Error);
    }

    /// <summary>Yeni bakım talebi oluşturur.</summary>
    [HttpPost]
    [Authorize(Roles = "ROLE_ADMIN,ROLE_TENANT")]
    public async Task<IActionResult> Create([FromBody] CreateMaintenanceRequestCommand command)
    {
        var profile = await _currentUser.GetRequiredAsync(HttpContext.RequestAborted);
        if (profile.Role != "ADMIN" && profile.Role != "TENANT") return Forbid();
        var tenantId = profile.Role == "ADMIN" ? command.TenantId : profile.Id;
        var leases = await _mediator.Send(new GetTenantLeasesQuery(
            tenantId, Request.Headers.Authorization.ToString()), HttpContext.RequestAborted);
        if (leases is null)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Lease eligibility could not be verified." });
        if (!leases.Any(lease => lease.Status == "ACTIVE" &&
                                 lease.PropertyId == command.PropertyId &&
                                 lease.UnitId == command.UnitId))
            return Conflict(new { message = "A maintenance request requires an active lease for the selected unit." });
        var result = await _mediator.Send(command with { TenantId = tenantId });
        if (result.IsFailure)
            return result.Error.Code == "VALIDATION_FAILED"
                ? BadRequest(result.Error)
                : Conflict(result.Error);

        _logger.LogInformation("Maintenance request created: {Id}", result.Value.Id);
        return CreatedAtAction(nameof(GetById), new { id = result.Value.Id }, result.Value);
    }

    /// <summary>Bakım talebinin durumunu günceller.</summary>
    [HttpPut("{id}/status")]
    [Authorize(Roles = "ROLE_ADMIN,ROLE_LANDLORD")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateStatusRequest request)
    {
        if (!Enum.TryParse<MaintenanceStatus>(request.Status, true, out var parsedStatus) ||
            !Enum.IsDefined(parsedStatus))
            return BadRequest(new { message = "Unsupported maintenance status." });
        var existing = await _mediator.Send(new GetMaintenanceRequestByIdQuery(id));
        if (existing.IsFailure) return NotFound(existing.Error);
        var profile = await _currentUser.GetRequiredAsync(HttpContext.RequestAborted);
        if (profile.Role == "LANDLORD")
        {
            var ownership = await OwnsPropertyAsync(profile.Id, existing.Value.PropertyId);
            if (ownership is null)
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Property ownership could not be verified." });
            if (!ownership.Value) return Forbid();
        }
        var command = new UpdateMaintenanceStatusCommand(id, parsedStatus.ToString().ToUpperInvariant(), request.EstimatedCost);
        var result = await _mediator.Send(command);
        if (result.IsSuccess) return Ok(result.Value);
        return result.Error.Code switch
        {
            "NOT_FOUND" => NotFound(result.Error),
            "VALIDATION_FAILED" => BadRequest(result.Error),
            _ => Conflict(result.Error)
        };
    }

    private IActionResult OkPaged<T>(SharedKernel.Common.PagedResult<T> result)
    {
        Response.Headers["X-Total-Count"] = result.TotalCount.ToString();
        Response.Headers["X-Page"] = result.Page.ToString();
        Response.Headers["X-Page-Size"] = result.PageSize.ToString();
        Response.Headers["X-Total-Pages"] = result.TotalPages.ToString();
        return Ok(result.Items);
    }

    private async Task<bool> CanAccessTenantAsync(Guid tenantId)
    {
        var profile = await _currentUser.GetRequiredAsync(HttpContext.RequestAborted);
        return profile.Role == "ADMIN" || profile.Role == "TENANT" && profile.Id == tenantId;
    }

    private async Task<bool?> CanAccessRequestAsync(MaintenanceService.Application.ReadModels.MaintenanceReadModel request)
    {
        var profile = await _currentUser.GetRequiredAsync(HttpContext.RequestAborted);
        if (profile.Role == "ADMIN") return true;
        if (profile.Role == "TENANT") return profile.Id == request.TenantId;
        if (profile.Role != "LANDLORD") return false;
        return await OwnsPropertyAsync(profile.Id, request.PropertyId);
    }

    private Task<bool?> OwnsPropertyAsync(Guid landlordId, Guid propertyId) =>
        _mediator.Send(new CheckPropertyOwnershipQuery(
            landlordId, propertyId, Request.Headers.Authorization.ToString()), HttpContext.RequestAborted);
    private enum MaintenanceStatus { OPEN, IN_PROGRESS, RESOLVED, CLOSED }
}

public class UpdateStatusRequest
{
    public string Status { get; set; } = string.Empty;
    public decimal? EstimatedCost { get; set; }
}
