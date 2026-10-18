using SharedKernel.Security;
using SharedKernel.Api;
using SharedKernel.Tracing;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRentFlowAuthentication(builder.Configuration);
builder.Services.AddCustomOpenTelemetry(builder.Configuration, "ApiGateway");
builder.Services.AddHealthChecks();
builder.Services.AddRentFlowRateLimiting();

// Clear FallbackPolicy on ApiGateway so that Swagger UI and public documentation routes
// are accessible without requiring a token upfront, while each downstream microservice
// continues to enforce its own authentication and authorization.
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = null;
});

// Enable CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

var app = builder.Build();
app.UseRentFlowExceptionHandling();

app.UseCors();

if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled", true))
{
    app.UseSwaggerUI(c =>
    {
        c.RoutePrefix = "swagger";
        c.DocumentTitle = "RentFlow API Gateway - Swagger UI";
        c.SwaggerEndpoint("/swagger/user/v1/swagger.json", "User Service API");
        c.SwaggerEndpoint("/swagger/property/v1/swagger.json", "Property Service API");
        c.SwaggerEndpoint("/swagger/lease/v1/swagger.json", "Lease Service API");
        c.SwaggerEndpoint("/swagger/payment/v1/swagger.json", "Payment Service API");
        c.SwaggerEndpoint("/swagger/maintenance/v1/swagger.json", "Maintenance Service API");
        c.SwaggerEndpoint("/swagger/document/v1/swagger.json", "Document Service API");
        c.SwaggerEndpoint("/swagger/notification/v1/swagger.json", "Notification Service API");
        c.SwaggerEndpoint("/swagger/report/v1/swagger.json", "Report Service API");
        c.SwaggerEndpoint("/swagger/saga/v1/swagger.json", "Saga Orchestrator API");
        c.DisplayRequestDuration();
        c.EnablePersistAuthorization();
    });
}

app.UseAuthentication();
app.UseAuthorization();
app.UseRentFlowRateLimiting();

// Redirect root to /swagger for convenience
app.MapGet("/", () => Results.Redirect("/swagger")).AllowAnonymous();

app.MapReverseProxy();
app.MapHealthChecks("/health").AllowAnonymous();

app.Run();
