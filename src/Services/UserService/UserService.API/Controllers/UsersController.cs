using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using UserService.Application.Commands.SyncUser;
using UserService.Application.Queries.GetAllUsers;
using UserService.Application.Queries.GetUserById;
using UserService.Application.Queries.GetUserByIdentityId;
using UserService.Application.Queries;
using System.Security.Claims;

namespace UserService.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<UsersController> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    public UsersController(IMediator mediator, ILogger<UsersController> logger, IHttpClientFactory httpClientFactory)
    {
        _mediator = mediator;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
    }

    [HttpGet]
    [Authorize(Policy = "AdministratorsOnly")]
    public async Task<IActionResult> GetAllUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var pagination = new SharedKernel.Common.PagedQuery(page, pageSize);
        if (!pagination.IsValid)
            return BadRequest(new { message = "Page must be positive and pageSize must be between 1 and 100." });

        var result = await _mediator.Send(new GetAllUsersQuery(pagination), HttpContext.RequestAborted);
        
        if (result.IsFailure)
            return BadRequest(result.Error);
            
        return OkPaged(result.Value);
    }

    [HttpGet("{id}")]
    [Authorize]
    public async Task<IActionResult> GetUserById(Guid id)
    {
        if (!User.IsInRole("ROLE_ADMIN"))
        {
            var currentIdentityId = User.FindFirstValue("sub");
            if (string.IsNullOrWhiteSpace(currentIdentityId))
                return Unauthorized();

            var currentUser = await _mediator.Send(new GetUserByIdentityIdQuery(currentIdentityId));
            if (currentUser.IsFailure || !currentUser.Value.IsActive || currentUser.Value.Id != id)
                return Forbid();
        }

        var result = await _mediator.Send(new GetUserByIdQuery(id));
        
        if (result.IsFailure)
            return NotFound(result.Error);

        return Ok(result.Value);
    }

    [HttpGet("{id:guid}/role")]
    [Authorize(Roles = "ROLE_ADMIN,ROLE_LANDLORD")]
    public async Task<IActionResult> GetUserRole(Guid id)
    {
        var result = await _mediator.Send(new GetUserByIdQuery(id));
        if (result.IsFailure)
            return NotFound(result.Error);
        if (!result.Value.IsActive)
            return NotFound();

        if (User.IsInRole("ROLE_LANDLORD") && !User.IsInRole("ROLE_ADMIN"))
        {
            // Landlords are permitted to verify candidate tenants for lease creation or inspect themselves
            if (result.Value.Role != "TENANT")
            {
                var currentIdentityId = User.FindFirstValue("sub");
                if (string.IsNullOrEmpty(currentIdentityId)) return Unauthorized();
                var currentUser = await _mediator.Send(new GetUserByIdentityIdQuery(currentIdentityId));
                if (currentUser.IsFailure || currentUser.Value.Id != id)
                    return Forbid();
            }
        }

        return Ok(new { result.Value.Id, result.Value.Role, result.Value.Email });
    }

    [HttpGet("tenants")]
    [Authorize(Roles = "ROLE_ADMIN,ROLE_LANDLORD")]
    public async Task<IActionResult> GetTenants(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int? pageSize = null,
        [FromQuery] int limit = 50)
    {
        if (search?.Length > 100)
            return BadRequest(new { message = "Search text cannot exceed 100 characters." });
        if (User.IsInRole("ROLE_LANDLORD") && (search?.Trim().Length ?? 0) < 2)
            return BadRequest(new { message = "Landlord tenant searches must contain at least 2 characters." });

        var effectivePageSize = pageSize ?? Math.Clamp(limit, 1, 100);
        var pagination = new SharedKernel.Common.PagedQuery(page, effectivePageSize);
        if (!pagination.IsValid)
            return BadRequest(new { message = "Page must be positive and pageSize must be between 1 and 100." });

        var result = await _mediator.Send(
            new GetTenantLookupQuery(search, pagination), HttpContext.RequestAborted);
        if (result.IsFailure)
            return BadRequest(result.Error);
        return OkPaged(result.Value);
    }

    [HttpGet("tenants/by-ids")]
    [Authorize(Roles = "ROLE_ADMIN,ROLE_LANDLORD")]
    public async Task<IActionResult> GetTenantsByIds([FromQuery] Guid[] ids)
    {
        if (ids.Length > 100 || ids.Any(id => id == Guid.Empty))
            return BadRequest(new { message = "At most 100 valid tenant IDs may be requested." });

        Guid[] allowedIds = ids;
        if (User.IsInRole("ROLE_LANDLORD") && !User.IsInRole("ROLE_ADMIN"))
        {
            var currentIdentityId = User.FindFirstValue("sub");
            if (string.IsNullOrEmpty(currentIdentityId)) return Unauthorized();
            var currentUser = await _mediator.Send(new GetUserByIdentityIdQuery(currentIdentityId));
            if (currentUser.IsFailure) return Forbid();

            var relatedTenants = await FilterRelatedTenants(currentUser.Value.Id, ids);
            allowedIds = relatedTenants.ToArray();
        }

        if (allowedIds.Length == 0) return Ok(Array.Empty<object>());

        var result = await _mediator.Send(
            new GetTenantsByIdsQuery(allowedIds.Distinct().ToArray()), HttpContext.RequestAborted);
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
    }

    [HttpGet("identity/{identityId}")]
    [Authorize]
    public async Task<IActionResult> GetUserByIdentityId(string identityId)
    {
        var currentIdentityId = User.FindFirstValue("sub");
        if (!User.IsInRole("ROLE_ADMIN") && !string.Equals(identityId, currentIdentityId, StringComparison.Ordinal))
            return Forbid();

        var result = await _mediator.Send(new GetUserByIdentityIdQuery(identityId));
        
        if (result.IsFailure)
            return NotFound(result.Error);

        return Ok(result.Value);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
            var identityId = User.FindFirstValue("sub");
            if (string.IsNullOrWhiteSpace(identityId))
                return Unauthorized();

            var result = await _mediator.Send(new GetUserByIdentityIdQuery(identityId));
            if (result.IsFailure)
                return NotFound(result.Error);
            if (!result.Value.IsActive)
                return Forbid();

            return Ok(new SharedKernel.Security.CurrentUserProfile(
                result.Value.Id,
                result.Value.IdentityId,
                result.Value.Email,
                result.Value.Role));
    }

    [HttpPost("sync")]
    [Authorize]
    public async Task<IActionResult> SyncUserFromKeycloak()
    {
        var identityId = User.FindFirstValue("sub");
        var email = User.FindFirstValue("email");
        if (string.IsNullOrWhiteSpace(identityId) || string.IsNullOrWhiteSpace(email))
            return Unauthorized();

        var role = User.IsInRole("ROLE_ADMIN") ? "ADMIN"
            : User.IsInRole("ROLE_LANDLORD") ? "LANDLORD"
            : User.IsInRole("ROLE_TENANT") ? "TENANT"
            : User.IsInRole("ROLE_USER") ? "USER"
            : null;
        if (role is null)
            return Forbid();

        var command = new SyncUserCommand(
            identityId,
            email,
            User.FindFirstValue("given_name") ?? string.Empty,
            User.FindFirstValue("family_name") ?? string.Empty,
            role,
            User.FindFirstValue("phone_number"),
            null);
        var result = await _mediator.Send(command);
        
        if (result.IsFailure)
            return BadRequest(result.Error);

        _logger.LogInformation("New user synced from Keycloak: {UserId}", result.Value.Id);

        return CreatedAtAction(nameof(GetUserById), new { id = result.Value.Id }, result.Value);
    }

    public record InviteTenantRequest(
        string Email,
        string FirstName,
        string LastName,
        Guid PropertyId,
        Guid UnitId,
        decimal RentAmount,
        decimal DepositAmount);

    [HttpPost("invite-tenant")]
    [Authorize(Roles = "ROLE_ADMIN,ROLE_LANDLORD")]
    public async Task<IActionResult> InviteTenant([FromBody] InviteTenantRequest request)
    {
        var identityId = User.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(identityId))
            return Unauthorized();

        var currentUser = await _mediator.Send(new GetUserByIdentityIdQuery(identityId));
        if (currentUser.IsFailure || !currentUser.Value.IsActive)
            return Forbid();

        var landlordId = currentUser.Value.Id;

        var command = new UserService.Application.Commands.InviteTenant.InviteTenantCommand(
            request.Email,
            request.FirstName,
            request.LastName,
            landlordId,
            request.PropertyId,
            request.UnitId,
            request.RentAmount,
            request.DepositAmount
        );

        var result = await _mediator.Send(command);
        
        if (result.IsFailure)
            return BadRequest(result.Error);

        return Ok(new { message = "Davetiye gönderildi." });
    }

    private IActionResult OkPaged<T>(SharedKernel.Common.PagedResult<T> result)
    {
        Response.Headers["X-Total-Count"] = result.TotalCount.ToString();
        Response.Headers["X-Page"] = result.Page.ToString();
        Response.Headers["X-Page-Size"] = result.PageSize.ToString();
        Response.Headers["X-Total-Pages"] = result.TotalPages.ToString();
        return Ok(result.Items);
    }

    private async Task<bool> HasRelationWithTenant(Guid landlordId, Guid tenantId)
    {
        var related = await FilterRelatedTenants(landlordId, new[] { tenantId });
        return related.Contains(tenantId);
    }

    private async Task<List<Guid>> FilterRelatedTenants(Guid landlordId, IEnumerable<Guid> tenantIds)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("LeaseService");
            var response = await client.PostAsJsonAsync("api/leases/relation/filter", new { LandlordId = landlordId, TenantIds = tenantIds });
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadFromJsonAsync<List<Guid>>() ?? new List<Guid>();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch related tenants from LeaseService.");
        }
        return new List<Guid>();
    }

    [HttpPost("select-role")]
    [Authorize] // Must be logged in, but not restricted by specific role
    public async Task<IActionResult> SelectRole([FromBody] SelectRoleRequest request)
    {
        var identityId = User.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(identityId))
            return Unauthorized();

        var command = new UserService.Application.Commands.SelectRole.SelectRoleCommand(identityId, request.Role);
        var result = await _mediator.Send(command);

        if (result.IsSuccess)
        {
            return Ok(result.Value);
        }

        return BadRequest(result.Error);
    }
    
    public record SelectRoleRequest(string Role);
}
