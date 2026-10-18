using Microsoft.EntityFrameworkCore;
using MaintenanceService.Infrastructure.Data;
using MaintenanceService.Application.Interfaces;
using MaintenanceService.Infrastructure.Repositories;
using Prometheus;
using SharedKernel.Security;
using SharedKernel.Api;
using SharedKernel.Http;
using MaintenanceService.Infrastructure.Http;
using SharedKernel.Tracing;
using MassTransit;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddRentFlowAuthentication(builder.Configuration);
builder.Services.AddCurrentUserProfileResolver();
builder.Services.AddCustomOpenTelemetry(builder.Configuration, "MaintenanceService");
builder.Services.AddHttpClient("LeaseService", client =>
    client.BaseAddress = new Uri((builder.Configuration["LeaseService:BaseUrl"] ?? "http://leaseservice").TrimEnd('/') + "/"))
    .AddRentFlowResilience(TimeSpan.FromSeconds(5));
builder.Services.AddHttpClient("PropertyService", client =>
    client.BaseAddress = new Uri((builder.Configuration["PropertyService:BaseUrl"] ?? "http://propertyservice").TrimEnd('/') + "/"))
    .AddRentFlowResilience(TimeSpan.FromSeconds(5));

builder.Services.AddControllers();
builder.Services.AddRentFlowSwagger("RentFlow - Maintenance Service API", "v1", "Maintenance requests, damage assessments, repair status, and cost estimation");
builder.Services.AddHealthChecks()
    .AddSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")!, name: "SQLServer");

// SQL Server
builder.Services.AddDbContext<MaintenanceDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection must be configured.");
    options.UseSqlServer(connectionString);
});

// MediatR - CQRS
builder.Services.AddMediatR(cfg =>
    cfg.RegisterServicesFromAssembly(typeof(MaintenanceService.Application.Commands.CreateMaintenanceRequestCommand).Assembly));

// Repository kayıtları (DIP)
builder.Services.AddScoped<IMaintenanceReadRepository, MaintenanceReadRepository>();
builder.Services.AddScoped<IMaintenanceWriteRepository, MaintenanceWriteRepository>();
builder.Services.AddScoped<IMaintenanceServiceLookup, MaintenanceService.Infrastructure.Http.MaintenanceServiceLookup>();
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<MaintenanceService.API.Messaging.AssessDamageCommandConsumer>();
    x.AddEntityFrameworkOutbox<MaintenanceDbContext>(options =>
    {
        options.UseSqlServer();
        options.UseBusOutbox();
    });
    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host("rabbitmq", "/", host =>
        {
            host.Username(builder.Configuration["RabbitMQ:Username"]
                ?? throw new InvalidOperationException("RabbitMQ:Username must be configured."));
            host.Password(builder.Configuration["RabbitMQ:Password"]
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
    var db = scope.ServiceProvider.GetRequiredService<MaintenanceDbContext>();
    await db.Database.MigrateAsync();
}

if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled", true))
{
    app.UseRentFlowSwagger("RentFlow - Maintenance Service API");
}

app.UseHttpMetrics();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapMetrics().AllowAnonymous();
app.MapHealthChecks("/health").AllowAnonymous();

app.Run();
