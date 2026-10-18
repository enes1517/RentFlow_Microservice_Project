using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediatR;
using SharedKernel.Security;
using ReportService.Application.Queries;

namespace ReportService.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ReportsController : ControllerBase
{
    private readonly ICurrentUserProfileResolver _currentUser;
    private readonly IMediator _mediator;

    public ReportsController(
        ICurrentUserProfileResolver currentUser,
        IMediator mediator)
    {
        _currentUser = currentUser;
        _mediator = mediator;
    }

    [HttpGet("income/{landlordId:guid}")]
    [Authorize(Roles = "ROLE_ADMIN,ROLE_LANDLORD")]
    public async Task<IActionResult> GetIncomeReport(Guid landlordId, [FromQuery] int year)
    {
        if (landlordId == Guid.Empty)
            return BadRequest(new { message = "A landlord is required." });
        if (year is < 2000 or > 2100)
            return BadRequest(new { message = "Year must be between 2000 and 2100." });

        var cancellationToken = HttpContext.RequestAborted;
        var profile = await _currentUser.GetRequiredAsync(cancellationToken);
        if (profile.Role != "ADMIN" && (profile.Role != "LANDLORD" || profile.Id != landlordId))
            return Forbid();

        var result = await _mediator.Send(new GetIncomeReportQuery(landlordId, year), cancellationToken);
        if (!result.HasProjectedProperties)
            return Problem(
                statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "Income report projection is not ready",
                detail: "No property events have been projected for this landlord yet. Please retry after source events are processed.");

        if (result.HasUnclassifiedRentCurrency)
            return Problem(
                statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "Income report projection is incomplete",
                detail: "The rent payment event contract does not include currency, so projected income cannot be safely classified as TRY.");

        return Ok(result.Report);
    }
}
