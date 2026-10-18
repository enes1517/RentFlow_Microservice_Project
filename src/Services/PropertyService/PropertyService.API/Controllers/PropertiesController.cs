using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PropertyService.Application.Commands;
using PropertyService.Application.Queries;
using PropertyService.Domain.Entities;
using SharedKernel.Security;

namespace PropertyService.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PropertiesController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<PropertiesController> _logger;
    private readonly ICurrentUserProfileResolver _currentUser;

    public PropertiesController(
        IMediator mediator,
        ILogger<PropertiesController> logger,
        ICurrentUserProfileResolver currentUser)
    {
        _mediator = mediator;
        _logger = logger;
        _currentUser = currentUser;
    }

    [HttpGet]
    [Authorize(Policy = "AdministratorsOnly")]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var pagination = new SharedKernel.Common.PagedQuery(page, pageSize);
        if (!pagination.IsValid)
            return BadRequest(new { message = "Page must be positive and pageSize must be between 1 and 100." });
        var result = await _mediator.Send(new GetAllPropertiesQuery(pagination), HttpContext.RequestAborted);
        return result.IsSuccess ? OkPaged(result.Value) : BadRequest(result.Error);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetPropertyByIdQuery(id));
        if (result.IsFailure) return NotFound(result.Error);
        if (!await CanAccessAsync(result.Value.LandlordId)) return Forbid();
        return Ok(result.Value);
    }

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

        var result = await _mediator.Send(new GetPropertiesByLandlordQuery(landlordId, pagination));
        return result.IsSuccess ? OkPaged(result.Value) : BadRequest(result.Error);
    }

    [HttpPost]
    [Authorize(Roles = "ROLE_ADMIN,ROLE_LANDLORD")]
    public async Task<IActionResult> Create([FromBody] CreatePropertyCommand command)
    {
        var profile = await _currentUser.GetRequiredAsync(HttpContext.RequestAborted);
        var landlordId = profile.Role == "ADMIN" ? command.LandlordId : profile.Id;
        var result = await _mediator.Send(command with { LandlordId = landlordId });
        if (result.IsFailure) return BadRequest(result.Error);
        
        _logger.LogInformation("Created new property: {PropertyId}", result.Value.Id);
        return CreatedAtAction(nameof(GetById), new { id = result.Value.Id }, result.Value);
    }

    [HttpPost("{id}/units")]
    [Authorize(Roles = "ROLE_ADMIN,ROLE_LANDLORD")]
    public async Task<IActionResult> AddUnit(Guid id, [FromBody] PropertyService.API.Controllers.AddUnitRequest request)
    {
        var existing = await _mediator.Send(new GetPropertyByIdQuery(id));
        if (existing.IsFailure) return NotFound(existing.Error);
        if (!await CanAccessAsync(existing.Value.LandlordId)) return Forbid();

        var command = new AddUnitCommand(id, request.UnitNumber, request.Floor, request.SquareMeters, request.RentAmount, request.Currency);
        var result = await _mediator.Send(command);
        return result.IsSuccess ? Ok(result.Value) : NotFound(result.Error);
    }

    private async Task<bool> CanAccessAsync(Guid landlordId)
    {
        var profile = await _currentUser.GetRequiredAsync(HttpContext.RequestAborted);
        return profile.Role == "ADMIN" || profile.Role == "LANDLORD" && profile.Id == landlordId;
    }

    private IActionResult OkPaged<T>(SharedKernel.Common.PagedResult<T> result)
    {
        Response.Headers["X-Total-Count"] = result.TotalCount.ToString();
        Response.Headers["X-Page"] = result.Page.ToString();
        Response.Headers["X-Page-Size"] = result.PageSize.ToString();
        Response.Headers["X-Total-Pages"] = result.TotalPages.ToString();
        return Ok(result.Items);
    }
}

public class CreatePropertyRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid LandlordId { get; set; }
    public Address Address { get; set; } = null!;
}

public class AddUnitRequest
{
    public string UnitNumber { get; set; } = string.Empty;
    public int Floor { get; set; }
    public decimal SquareMeters { get; set; }
    public decimal RentAmount { get; set; }
    public string Currency { get; set; } = "TRY";
}
