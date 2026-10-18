using Microsoft.EntityFrameworkCore;
using ReportService.Infrastructure.Data;
using ReportService.Application.Interfaces;
using ReportService.Infrastructure.Repositories;
using Prometheus;
using SharedKernel.Security;
using SharedKernel.Api;
using MassTransit;
using ReportService.API.Messaging;
using SharedKernel.Tracing;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddRentFlowAuthentication(builder.Configuration);
builder.Services.AddCurrentUserProfileResolver();
builder.Services.AddCustomOpenTelemetry(builder.Configuration, "ReportService");

builder.Services.AddControllers();
builder.Services.AddRentFlowSwagger("RentFlow - Report Service API", "v1", "CQRS read-model projections, monthly landlord income metrics, and financial reporting");
builder.Services.AddHealthChecks()
    .AddSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")!, name: "SQLServer");
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(ReportService.Application.Commands.CreateMonthlyIncomeReportCommand).Assembly));

// SQL Server for Reports
builder.Services.AddDbContext<ReportDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection must be configured.");
    options.UseSqlServer(connectionString);
});
builder.Services.AddScoped<IReportReadRepository, ReportReadRepository>();
builder.Services.AddScoped<IReportWriteRepository, ReportWriteRepository>();
builder.Services.AddMassTransit(x =>
{
    x.AddEntityFrameworkOutbox<ReportDbContext>(options => options.UseSqlServer());
    x.AddConfigureEndpointsCallback((context, _, endpoint) =>
    {
        endpoint.UseMessageRetry(retry => retry.Interval(5, TimeSpan.FromSeconds(1)));
        endpoint.UseEntityFrameworkOutbox<ReportDbContext>(context);
    });
    x.AddConsumer<PropertyReportProjectionConsumer>();
    x.AddConsumer<MaintenanceReportProjectionConsumer>();
    x.AddConsumer<LeaseCreatedReportProjectionConsumer>();
    x.AddConsumer<LeaseCancelledReportProjectionConsumer>();
    x.AddConsumer<RentPaymentCompletedReportProjectionConsumer>();
    x.AddConsumer<RentPaymentFailedReportProjectionConsumer>();
    x.AddConsumer<DepositPaymentCompletedReportProjectionConsumer>();
    x.AddConsumer<DepositPaymentFailedReportProjectionConsumer>();
    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host("rabbitmq", "/", h =>
        {
            h.Username(builder.Configuration["RabbitMQ:Username"]
                ?? throw new InvalidOperationException("RabbitMQ:Username must be configured."));
            h.Password(builder.Configuration["RabbitMQ:Password"]
                ?? throw new InvalidOperationException("RabbitMQ:Password must be configured."));
        });
        cfg.ConfigureEndpoints(context);
    });
});

var app = builder.Build();
app.UseRentFlowExceptionHandling();

var migrateOnStartup = app.Configuration.GetValue<bool>("Database:MigrateOnStartup");
if (migrateOnStartup && !app.Environment.IsDevelopment())
{
    throw new InvalidOperationException(
        "Automatic database migrations are development-only. Apply a reviewed migration bundle during the production release.");
}

if (migrateOnStartup)
{
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<ReportDbContext>();
    await db.Database.MigrateAsync();
}

if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled", true))
{
    app.UseRentFlowSwagger("RentFlow - Report Service API");
}

app.UseAuthentication();
app.UseAuthorization();
app.UseHttpMetrics();
app.MapControllers();
app.MapMetrics().AllowAnonymous();
app.MapHealthChecks("/health").AllowAnonymous();

app.Run();
