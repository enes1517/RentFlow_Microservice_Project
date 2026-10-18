using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PaymentService.Application.Commands;
using PaymentService.Application.Queries;
using SharedKernel.Security;
using SharedKernel.Api;

namespace PaymentService.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<PaymentsController> _logger;
    private readonly ICurrentUserProfileResolver _currentUser;
    private readonly bool _isSimulated;

    public PaymentsController(
        IMediator mediator,
        ILogger<PaymentsController> logger,
        ICurrentUserProfileResolver currentUser,
        IConfiguration configuration)
    {
        _mediator = mediator;
        _logger = logger;
        _currentUser = currentUser;
        _isSimulated = string.Equals(configuration["Payments:Mode"], "Simulated", StringComparison.Ordinal);
    }

    /// <summary>Tüm ödeme işlemlerini listeler.</summary>
    [HttpGet]
    [Authorize(Policy = "AdministratorsOnly")]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var pagination = new SharedKernel.Common.PagedQuery(page, pageSize);
        if (!pagination.IsValid)
            return BadRequest(new { message = "Page must be positive and pageSize must be between 1 and 100." });
        var result = await _mediator.Send(new GetAllPaymentsQuery(pagination), HttpContext.RequestAborted);
        return result.IsSuccess ? OkPaged(result.Value) : BadRequest(result.Error);
    }

    /// <summary>ID'ye göre ödeme getirir.</summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetPaymentByIdQuery(id));
        if (result.IsFailure) return NotFound(result.Error);
        var lease = await GetPayableLeaseAsync(result.Value.LeaseId);
        if (lease is null)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Lease ownership could not be verified." });
        var profile = await _currentUser.GetRequiredAsync(HttpContext.RequestAborted);
        if (!CanAccessPayment(profile, result.Value.TenantId, lease.LandlordId)) return Forbid();
        return Ok(result.Value);
    }

    /// <summary>Bir kira sözleşmesine ait ödemeleri listeler.</summary>
    [HttpGet("lease/{leaseId}")]
    public async Task<IActionResult> GetByLease(
        Guid leaseId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var pagination = new SharedKernel.Common.PagedQuery(page, pageSize);
        if (!pagination.IsValid)
            return BadRequest(new { message = "Page must be positive and pageSize must be between 1 and 100." });
        var lease = await GetPayableLeaseAsync(leaseId);
        if (lease is null)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Lease ownership could not be verified." });
        var profile = await _currentUser.GetRequiredAsync(HttpContext.RequestAborted);
        if (!CanAccessPayment(profile, lease.TenantId, lease.LandlordId)) return Forbid();

        var result = await _mediator.Send(new GetPaymentsByLeaseQuery(leaseId, pagination));
        if (result.IsFailure) return BadRequest(result.Error);
        if (await _mediator.Send(
                new HasPaymentTenantMismatchQuery(leaseId, lease.TenantId), HttpContext.RequestAborted))
            return Conflict(new { message = "Payment records do not match their lease tenant." });
        return OkPaged(result.Value);
    }

    /// <summary>Bir kiracıya ait ödemeleri listeler.</summary>
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

        var result = await _mediator.Send(new GetPaymentsByTenantQuery(tenantId, pagination));
        return result.IsSuccess ? OkPaged(result.Value) : BadRequest(result.Error);
    }

    /// <summary>Kira ödemesi yapar. Simulated Development modu gerçek tahsilat yapmaz.</summary>
    [HttpPost("rent")]
    [Authorize(Roles = "ROLE_ADMIN,ROLE_TENANT")]
    [IdempotentRequest]
    public async Task<IActionResult> PayRent([FromBody] PaymentRequest request)
    {
        var profile = await _currentUser.GetRequiredAsync(HttpContext.RequestAborted);
        if (profile.Role != "ADMIN" && profile.Role != "TENANT") return Forbid();
        var lease = await GetPayableLeaseAsync(request.LeaseId);
        if (lease is null)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Lease could not be verified." });
        if (lease.Status != "ACTIVE" || lease.TenantId == Guid.Empty) return Conflict(new { message = "Only an active lease can be paid." });
        if (profile.Role != "ADMIN" && profile.Id != lease.TenantId) return Forbid();
        var result = await _mediator.Send(new PayRentCommand(
            request.LeaseId, lease.TenantId, lease.MonthlyRentAmount, "TRY"), HttpContext.RequestAborted);
        if (result.IsFailure)
        {
            return result.Error.Code == "PAYMENTS_DISABLED"
                ? StatusCode(StatusCodes.Status503ServiceUnavailable, result.Error)
                : BadRequest(result.Error);
        }

        return Ok(new
        {
            paymentId = result.Value.Id,
            status = result.Value.Status,
            reason = result.Value.Details,
            isSimulated = _isSimulated
        });
    }

    /// <summary>Depozito ödemesi yapar.</summary>
    [HttpPost("deposit")]
    [Authorize(Roles = "ROLE_ADMIN,ROLE_TENANT")]
    [IdempotentRequest]
    public async Task<IActionResult> PayDeposit([FromBody] PaymentRequest request)
    {
        var profile = await _currentUser.GetRequiredAsync(HttpContext.RequestAborted);
        if (profile.Role != "ADMIN" && profile.Role != "TENANT") return Forbid();
        var lease = await GetPayableLeaseAsync(request.LeaseId);
        if (lease is null)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Lease could not be verified." });
        if (lease.Status != "ACTIVE" || lease.DepositAmount <= 0)
            return Conflict(new { message = "This lease has no payable deposit." });
        if (profile.Role != "ADMIN" && profile.Id != lease.TenantId) return Forbid();
        var result = await _mediator.Send(new PayDepositCommand(
            request.LeaseId, lease.TenantId, lease.DepositAmount, "TRY"), HttpContext.RequestAborted);
        if (result.IsFailure)
        {
            return result.Error.Code == "PAYMENTS_DISABLED"
                ? StatusCode(StatusCodes.Status503ServiceUnavailable, result.Error)
                : BadRequest(result.Error);
        }

        return Ok(new
        {
            paymentId = result.Value.Id,
            status = result.Value.Status,
            reason = result.Value.Details,
            isSimulated = _isSimulated
        });
    }

    private static bool CanAccessPayment(CurrentUserProfile profile, Guid tenantId, Guid landlordId) =>
        profile.Role == "ADMIN" ||
        profile.Role == "TENANT" && profile.Id == tenantId ||
        profile.Role == "LANDLORD" && profile.Id == landlordId;

    private IActionResult OkPaged<T>(SharedKernel.Common.PagedResult<T> result)
    {
        Response.Headers["X-Total-Count"] = result.TotalCount.ToString();
        Response.Headers["X-Page"] = result.Page.ToString();
        Response.Headers["X-Page-Size"] = result.PageSize.ToString();
        Response.Headers["X-Total-Pages"] = result.TotalPages.ToString();
        return Ok(result.Items);
    }

    private Task<PaymentService.Application.Interfaces.PaymentLeaseLookup?> GetPayableLeaseAsync(Guid leaseId) =>
        _mediator.Send(new GetPaymentLeaseQuery(
            leaseId, Request.Headers.Authorization.ToString()), HttpContext.RequestAborted);

    public sealed record PaymentRequest(Guid LeaseId);
}
