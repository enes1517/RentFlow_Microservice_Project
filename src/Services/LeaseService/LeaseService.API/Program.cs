using Microsoft.EntityFrameworkCore;
using LeaseService.Infrastructure.Data;
using LeaseService.Application.Interfaces;
using LeaseService.Infrastructure.Repositories;
using MassTransit;
using Prometheus;
using SharedKernel.Tracing;
using SharedKernel.Security;
using SharedKernel.Api;
using LeaseService.API.Messaging;
using SharedKernel.Http;
using LeaseService.Infrastructure.Http;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddRentFlowAuthentication(builder.Configuration);
builder.Services.AddCurrentUserProfileResolver();
builder.Services.AddHttpClient("UserService", client =>
    client.BaseAddress = new Uri((builder.Configuration["UserService:BaseUrl"] ?? "http://userservice").TrimEnd('/') + "/"))
    .AddRentFlowResilience(TimeSpan.FromSeconds(5));
builder.Services.AddHttpClient("PropertyService", client =>
    client.BaseAddress = new Uri((builder.Configuration["PropertyService:BaseUrl"] ?? "http://propertyservice").TrimEnd('/') + "/"))
    .AddRentFlowResilience(TimeSpan.FromSeconds(5));

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddRentFlowSwagger("RentFlow - Lease Service API", "v1", "Lease agreement lifecycle, contract terms, deposit, and status transitions");

// MediatR - CQRS
builder.Services.AddMediatR(cfg =>
    cfg.RegisterServicesFromAssembly(typeof(LeaseService.Application.Commands.CreateLeaseCommand).Assembly));

// Repository kayıtları (DIP - Dependency Inversion Principle)
builder.Services.AddScoped<ILeaseReadRepository, LeaseReadRepository>();
builder.Services.AddScoped<ILeaseWriteRepository, LeaseWriteRepository>();
builder.Services.AddScoped<ILeaseServiceLookup, LeaseService.Infrastructure.Http.LeaseServiceLookup>();

// SQL Server Database with Polly Resiliency
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection must be configured.");
builder.Services.AddDbContext<LeaseDbContext>(options =>
{
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorNumbersToAdd: null);
    });
});

// Redis & Distributed Caching
var redisConnectionString = builder.Configuration.GetConnectionString("RedisConnection") ?? throw new InvalidOperationException("ConnectionStrings:RedisConnection must be configured.");

builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = redisConnectionString;
    options.InstanceName = "rent-management:";
});
builder.Services.AddSingleton<StackExchange.Redis.IConnectionMultiplexer>(sp =>
    StackExchange.Redis.ConnectionMultiplexer.Connect(redisConnectionString));
builder.Services.AddScoped<SharedKernel.Caching.ICacheService, SharedKernel.Caching.RedisCacheService>();

// Health Checks
builder.Services.AddHealthChecks()
    .AddSqlServer(connectionString, name: "SQLServer")
    .AddRedis(redisConnectionString, name: "Redis");

// OpenTelemetry / Zipkin Tracing
builder.Services.AddCustomOpenTelemetry(builder.Configuration, "LeaseService");

// MassTransit
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<ActivateLeaseConsumer>();
    x.AddConsumer<CancelLeaseConsumer>();
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
builder.Services.AddHostedService<LeaseOutboxDispatcher>();

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
    var db = scope.ServiceProvider.GetRequiredService<LeaseDbContext>();
    await db.Database.MigrateAsync();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled", true))
{
    app.UseRentFlowSwagger("RentFlow - Lease Service API");
}

app.UseRouting();
app.UseHttpMetrics();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapMetrics().AllowAnonymous();
app.MapHealthChecks("/health").AllowAnonymous();

app.Run();
