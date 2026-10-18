using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using LeaseService.Application.Commands;
using LeaseService.Application.Queries;
using SharedKernel.Security;

namespace LeaseService.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LeasesController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<LeasesController> _logger;
    private readonly ICurrentUserProfileResolver _currentUser;

    public LeasesController(
        IMediator mediator,
        ILogger<LeasesController> logger,
        ICurrentUserProfileResolver currentUser)
    {
        _mediator = mediator;
        _logger = logger;
        _currentUser = currentUser;
    }

    /// <summary>Tüm kira sözleşmelerini listeler.</summary>
    [HttpGet]
    [Authorize(Policy = "AdministratorsOnly")]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var pagination = new SharedKernel.Common.PagedQuery(page, pageSize);
        if (!pagination.IsValid)
            return BadRequest(new { message = "Page must be positive and pageSize must be between 1 and 100." });
        var result = await _mediator.Send(new GetAllLeasesQuery(pagination), HttpContext.RequestAborted);
        return result.IsSuccess ? OkPaged(result.Value) : BadRequest(result.Error);
    }

    /// <summary>ID'ye göre kira sözleşmesi getirir.</summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetLeaseByIdQuery(id));
        if (result.IsFailure) return NotFound(result.Error);
        if (!await CanAccessAsync(result.Value.TenantId, result.Value.LandlordId)) return Forbid();
        return Ok(result.Value);
    }

    /// <summary>Kiracıya ait sözleşmeleri listeler.</summary>
    [HttpGet("tenant/{tenantId}")]
    public async Task<IActionResult> GetByTenant(
        Guid tenantId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var pagination = new SharedKernel.Common.PagedQuery(page, pageSize);
        if (!pagination.IsValid)
            return BadRequest(new { message = "Page must be positive and pageSize must be between 1 and 100." });
        var profile = await _currentUser.GetRequiredAsync(HttpContext.RequestAborted);
        if (profile.Role != "ADMIN" && (profile.Role != "TENANT" || profile.Id != tenantId))
            return Forbid();

        var result = await _mediator.Send(new GetLeasesByTenantQuery(tenantId, pagination));
        return result.IsSuccess ? OkPaged(result.Value) : BadRequest(result.Error);
    }

    /// <summary>Ev sahibine ait sözleşmeleri listeler.</summary>
    [HttpGet("landlord/{landlordId}")]
    public async Task<IActionResult> GetByLandlord(
        Guid landlordId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var pagination = new SharedKernel.Common.PagedQuery(page, pageSize);
        if (!pagination.IsValid)
            return BadRequest(new { message = "Page must be positive and pageSize must be between 1 and 100." });
        var profile = await _currentUser.GetRequiredAsync(HttpContext.RequestAborted);
        if (profile.Role != "ADMIN" && (profile.Role != "LANDLORD" || profile.Id != landlordId))
            return Forbid();

        var result = await _mediator.Send(new GetLeasesByLandlordQuery(landlordId, pagination));
        return result.IsSuccess ? OkPaged(result.Value) : BadRequest(result.Error);
    }

    /// <summary>İki kullanıcı arasında (landlord - tenant) kira ilişkisi olup olmadığını döndürür (Internal).</summary>
    [HttpPost("relation/filter")]
    [AllowAnonymous]
    public async Task<IActionResult> FilterRelatedTenants([FromBody] FilterRelatedTenantsRequest request)
    {
        var result = await _mediator.Send(new FilterRelatedTenantsQuery(request.LandlordId, request.TenantIds));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    public record FilterRelatedTenantsRequest(Guid LandlordId, List<Guid> TenantIds);

    /// <summary>Yeni kira sözleşmesi oluşturur ve Saga'yı başlatır.</summary>
    [HttpPost]
    [Authorize(Roles = "ROLE_ADMIN,ROLE_LANDLORD")]
    public async Task<IActionResult> CreateLease([FromBody] CreateLeaseCommand command)
    {
        var profile = await _currentUser.GetRequiredAsync(HttpContext.RequestAborted);
        if (command.TenantId == Guid.Empty || command.PropertyId == Guid.Empty || command.UnitId == Guid.Empty)
            return BadRequest(new { message = "Tenant, property, and unit are required." });

        var landlordId = profile.Role == "ADMIN" ? command.LandlordId : profile.Id;
        if (landlordId == Guid.Empty)
            return BadRequest(new { message = "A landlord is required." });
        var verification = await _mediator.Send(new VerifyLeaseCreationQuery(
            command.TenantId,
            command.PropertyId,
            command.UnitId,
            landlordId,
            Request.Headers.Authorization.ToString()), HttpContext.RequestAborted);
        switch (verification.Failure)
        {
            case LeaseCreationVerificationFailure.TenantUnavailable:
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Tenant identity could not be verified." });
            case LeaseCreationVerificationFailure.TenantIsNotTenant:
                return BadRequest(new { message = "The selected user is not a tenant." });
            case LeaseCreationVerificationFailure.PropertyUnavailable:
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Property and unit ownership could not be verified." });
            case LeaseCreationVerificationFailure.LandlordMismatch:
                return Forbid();
            case LeaseCreationVerificationFailure.UnitUnavailable:
                return Conflict(new { message = "The selected unit is not available." });
            case LeaseCreationVerificationFailure.UnsupportedCurrency:
                return Conflict(new { message = "Leases currently support Turkish lira units only." });
        }

        var result = await _mediator.Send(command with
        {
            LandlordId = landlordId,
            MonthlyRentAmount = verification.MonthlyRentAmount
        }, HttpContext.RequestAborted);
        if (result.IsFailure) return BadRequest(result.Error);

        _logger.LogInformation("Lease created (PENDING) and Saga started: {LeaseId}", result.Value.Id);
        return CreatedAtAction(nameof(GetById), new { id = result.Value.Id },
            new { message = "Lease creation saga started.", leaseId = result.Value.Id, status = result.Value.Status });
    }

    /// <summary>Kira sözleşmesini aktifleştirir (Saga tarafından çağrılır).</summary>
    [HttpPut("{id}/activate")]
    [Authorize(Policy = "AdministratorsOnly")]
    public async Task<IActionResult> Activate(Guid id)
    {
        var result = await _mediator.Send(new ActivateLeaseCommand(id));
        return result.IsSuccess ? Ok(result.Value) : NotFound(result.Error);
    }

    /// <summary>Kira sözleşmesini iptal eder.</summary>
    [HttpPut("{id}/cancel")]
    [Authorize(Roles = "ROLE_ADMIN,ROLE_LANDLORD")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var existing = await _mediator.Send(new GetLeaseByIdQuery(id));
        if (existing.IsFailure) return NotFound(existing.Error);
        if (!await CanAccessAsync(existing.Value.TenantId, existing.Value.LandlordId)) return Forbid();
        if (existing.Value.Status != "ACTIVE")
            return Conflict(new { message = "Only an active lease can be cancelled directly." });

        var result = await _mediator.Send(new CancelLeaseCommand(id));
        return result.IsSuccess ? Ok(result.Value) : NotFound(result.Error);
    }

    private IActionResult OkPaged<T>(SharedKernel.Common.PagedResult<T> result)
    {
        Response.Headers["X-Total-Count"] = result.TotalCount.ToString();
        Response.Headers["X-Page"] = result.Page.ToString();
        Response.Headers["X-Page-Size"] = result.PageSize.ToString();
        Response.Headers["X-Total-Pages"] = result.TotalPages.ToString();
        return Ok(result.Items);
    }

    private async Task<bool> CanAccessAsync(Guid tenantId, Guid landlordId)
    {
        var profile = await _currentUser.GetRequiredAsync(HttpContext.RequestAborted);
        return profile.Role == "ADMIN" ||
               profile.Role == "TENANT" && profile.Id == tenantId ||
               profile.Role == "LANDLORD" && profile.Id == landlordId;
    }

}
