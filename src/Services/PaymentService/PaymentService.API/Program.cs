using Microsoft.EntityFrameworkCore;
using PaymentService.Infrastructure.Data;
using PaymentService.Application.Interfaces;
using PaymentService.Infrastructure.Repositories;
using MassTransit;
using Prometheus;
using SharedKernel.Tracing;
using SharedKernel.Security;
using SharedKernel.Api;
using PaymentService.API.Messaging;
using PaymentService.API.Payments;
using Hangfire;
using Hangfire.SqlServer;
using SharedKernel.Http;
using PaymentService.Infrastructure.Http;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddRentFlowAuthentication(builder.Configuration);
builder.Services.AddCurrentUserProfileResolver();
builder.Services.AddHttpClient("LeaseService", client =>
    client.BaseAddress = new Uri((builder.Configuration["LeaseService:BaseUrl"] ?? "http://leaseservice").TrimEnd('/') + "/"))
    .AddRentFlowResilience(TimeSpan.FromSeconds(5));

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddRentFlowSwagger("RentFlow - Payment Service API", "v1", "Payment transactions, rent collection, deposit payment, and Stripe/simulated processors");

// MediatR - CQRS
builder.Services.AddMediatR(cfg =>
    cfg.RegisterServicesFromAssembly(typeof(PaymentService.Application.Commands.PayRentCommand).Assembly));

// Repository kayıtları (DIP)
builder.Services.AddScoped<IPaymentReadRepository, PaymentReadRepository>();
builder.Services.AddScoped<IPaymentWriteRepository, PaymentWriteRepository>();
builder.Services.AddScoped<IPaymentLeaseLookup, PaymentService.Infrastructure.Http.PaymentLeaseLookup>();
var paymentMode = builder.Configuration["Payments:Mode"] ?? "Disabled";
if (paymentMode == "Simulated" && !builder.Environment.IsDevelopment())
{
    throw new InvalidOperationException("Simulated payments are available only in the Development environment.");
}

builder.Services.AddSingleton<IPaymentProcessor>(sp => paymentMode switch
{
    "Disabled" => new DisabledPaymentProcessor(),
    "Simulated" => new SimulatedPaymentProcessor(),
    "Stripe" => new StripePaymentProcessor(sp.GetRequiredService<IConfiguration>()),
    _ => throw new InvalidOperationException("Payments:Mode must be Disabled, Simulated, or Stripe.")
});

// SQL Server Database with Polly Resiliency
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection must be configured.");
builder.Services.AddDbContext<PaymentDbContext>(options =>
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
builder.Services.AddCustomOpenTelemetry(builder.Configuration, "PaymentService");

// Hangfire
builder.Services.AddHangfire(configuration => configuration
    .SetDataCompatibilityLevel(Hangfire.CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseSqlServerStorage(connectionString));
builder.Services.AddHangfireServer();

// MassTransit
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<PayDepositConsumer>();
    x.AddConsumer<RefundDepositCommandConsumer>();
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
builder.Services.AddHostedService<PaymentOutboxDispatcher>();

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
    var db = scope.ServiceProvider.GetRequiredService<PaymentDbContext>();
    await db.Database.MigrateAsync();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled", true))
{
    app.UseRentFlowSwagger("RentFlow - Payment Service API");
}

app.UseRouting();
app.UseHttpMetrics();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapMetrics().AllowAnonymous();
app.MapHealthChecks("/health").AllowAnonymous();

app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = [new PaymentDashboardAuthorizationFilter()]
});
var recurringJobManager = app.Services.GetRequiredService<Hangfire.IRecurringJobManager>();
recurringJobManager.AddOrUpdate(
    "warm-up-cache",
    Hangfire.Common.Job.FromExpression<PaymentService.API.Jobs.WarmUpCacheJob>(job => job.ExecuteAsync()),
    Hangfire.Cron.Daily(),
    new RecurringJobOptions());

app.Run();
