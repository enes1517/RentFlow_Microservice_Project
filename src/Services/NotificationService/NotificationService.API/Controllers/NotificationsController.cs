using Microsoft.AspNetCore.Mvc;
using MediatR;
using NotificationService.Application.Commands;
using NotificationService.Application.Queries;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using SharedKernel.Security;

namespace NotificationService.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<NotificationsController> _logger;
    private readonly ICurrentUserProfileResolver _currentUser;

    public NotificationsController(
        IMediator mediator,
        ILogger<NotificationsController> logger,
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
        return OkPaged(await _mediator.Send(new GetNotificationsQuery(pagination), HttpContext.RequestAborted));
    }

    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetForUser(
        Guid userId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var pagination = new SharedKernel.Common.PagedQuery(page, pageSize);
        if (!pagination.IsValid)
            return BadRequest(new { message = "Page must be positive and pageSize must be between 1 and 100." });
        var profile = await _currentUser.GetRequiredAsync(HttpContext.RequestAborted);
        if (profile.Role != "ADMIN" && profile.Id != userId) return Forbid();
        return OkPaged(await _mediator.Send(
            new GetNotificationsQuery(pagination, userId), HttpContext.RequestAborted));
    }

    [HttpPost("send")]
    [Authorize(Roles = "ROLE_ADMIN,ROLE_LANDLORD")]
    public async Task<IActionResult> SendNotification([FromBody] SendNotificationDto dto)
    {
        var profile = await _currentUser.GetRequiredAsync(HttpContext.RequestAborted);
        if (profile.Role != "ADMIN" && profile.Role != "LANDLORD") return Forbid();
        if (dto.UserId == Guid.Empty)
            return BadRequest(new { message = "A recipient account is required." });

        var verification = await _mediator.Send(new VerifyNotificationRecipientQuery(
            dto.UserId,
            Request.Headers.Authorization.ToString(),
            dto.ToEmail,
            profile.Role == "LANDLORD" ? profile.Id : null), HttpContext.RequestAborted);
        var recipient = verification.Recipient;
        if (verification.RecipientUnavailable || recipient is null)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Recipient identity could not be verified." });
        if (recipient.Role != "TENANT")
            return BadRequest(new { message = "Notifications may only target an active tenant account." });
        if (!string.Equals(recipient.Email, dto.ToEmail, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "The recipient email does not match the selected account." });

        if (profile.Role == "LANDLORD")
        {
            var hasLease = verification.LandlordHasLease;
            if (hasLease is null)
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Lease ownership could not be verified." });
            if (!hasLease.Value) return Forbid();
        }

        var result = await _mediator.Send(new SendNotificationCommand(
            dto.UserId, dto.ToEmail, dto.Type, dto.Subject, dto.Content), HttpContext.RequestAborted);
        _logger.LogInformation("Notification processed for user {UserId}: {Status}", dto.UserId, result.Status);
        if (result.Status == "FAILED")
            return StatusCode(StatusCodes.Status502BadGateway, new { status = result.Status, message = result.Details });
        return Ok(new { message = "Notification processed.", status = result.Status });
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

public class SendNotificationDto
{
    public Guid UserId { get; set; }
    [Required, EmailAddress]
    public string ToEmail { get; set; } = string.Empty;
    [RegularExpression("(?i)^EMAIL$")]
    public string Type { get; set; } = "EMAIL";
    [Required, StringLength(255)]
    public string Subject { get; set; } = string.Empty;
    [Required]
    public string Content { get; set; } = string.Empty;
}
