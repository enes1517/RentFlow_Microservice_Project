using PropertyService.Infrastructure.Data;
using MassTransit;
using Prometheus;
using SharedKernel.Tracing;
using SharedKernel.Security;
using SharedKernel.Api;
using PropertyService.API.Messaging;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddRentFlowAuthentication(builder.Configuration);
builder.Services.AddCurrentUserProfileResolver();

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddRentFlowSwagger("RentFlow - Property Service API", "v1", "Real estate, property units, address, and rental unit reservation management");

// MongoDB Context
builder.Services.AddSingleton<PropertyContext>();
builder.Services.AddScoped<PropertyService.Application.Interfaces.IPropertyReadRepository, PropertyService.Infrastructure.Repositories.PropertyReadRepository>();
builder.Services.AddScoped<PropertyService.Application.Interfaces.IPropertyWriteRepository, PropertyService.Infrastructure.Repositories.PropertyWriteRepository>();

// MediatR
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(PropertyService.Application.Commands.CreatePropertyCommand).Assembly));

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
    .AddMongoDb(sp => PropertyMongoClientFactory.Create(builder.Configuration), name: "MongoDB")
    .AddRedis(redisConnectionString, name: "Redis");

// OpenTelemetry OTLP tracing
builder.Services.AddCustomOpenTelemetry(builder.Configuration, "PropertyService");

// MassTransit
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<ReservePropertyConsumer>();
    x.AddConsumer<ReleasePropertyReservationConsumer>();
    x.AddConsumer<MarkUnitRentedConsumer>();
    x.AddConsumer<ReleasePropertyCommandConsumer>();
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

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled", true))
{
    app.UseRentFlowSwagger("RentFlow - Property Service API");
}

app.UseRouting();
app.UseHttpMetrics();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapMetrics().AllowAnonymous();
app.MapHealthChecks("/health").AllowAnonymous();

app.Run();
