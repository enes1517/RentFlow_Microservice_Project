using Microsoft.EntityFrameworkCore;
using SharedKernel.Api;
using UserService.Infrastructure.Data;
using MassTransit;
using Prometheus;
using SharedKernel.Tracing;
using SharedKernel.Security;
using SharedKernel.Http;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddRentFlowAuthentication(builder.Configuration);

builder.Services.AddHttpClient("LeaseService", client =>
    client.BaseAddress = new Uri((builder.Configuration["LeaseService:BaseUrl"] ?? "http://leaseservice").TrimEnd('/') + "/"))
    .AddRentFlowResilience(TimeSpan.FromSeconds(5));

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddRentFlowSwagger("RentFlow - User Service API", "v1", "User profiles, Keycloak synchronization, invitations, and role management");

// Application Layer (MediatR & Repositories)
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(UserService.Application.Commands.SyncUser.SyncUserCommand).Assembly));
builder.Services.AddScoped<UserService.Application.Interfaces.IUserReadRepository, UserService.Infrastructure.Repositories.UserReadRepository>();
builder.Services.AddScoped<UserService.Application.Interfaces.IUserWriteRepository, UserService.Infrastructure.Repositories.UserWriteRepository>();
builder.Services.AddHttpClient<UserService.Application.Interfaces.IKeycloakAdminService, UserService.Infrastructure.Services.KeycloakAdminService>();

// Database with Polly Resiliency
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection must be configured.");
builder.Services.AddDbContext<UserDbContext>(options =>
{
    options.UseNpgsql(connectionString, sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorCodesToAdd: null);
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
    .AddNpgSql(connectionString, name: "PostgreSQL")
    .AddRedis(redisConnectionString, name: "Redis");

// OpenTelemetry OTLP tracing
builder.Services.AddCustomOpenTelemetry(builder.Configuration, "UserService");

// MassTransit
builder.Services.AddMassTransit(x =>
{
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
    var db = scope.ServiceProvider.GetRequiredService<UserDbContext>();
    await db.Database.MigrateAsync();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled", true))
{
    app.UseRentFlowSwagger("RentFlow - User Service API");
}

app.UseRouting();
app.UseHttpMetrics();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapMetrics().AllowAnonymous();
app.MapHealthChecks("/health").AllowAnonymous();

app.Run();
