using Microsoft.EntityFrameworkCore;
using DocumentService.Infrastructure.Data;
using DocumentService.Application.Interfaces;
using DocumentService.Infrastructure.Repositories;
using QuestPDF.Infrastructure;
using Prometheus;
using SharedKernel.Security;
using SharedKernel.Api;
using SharedKernel.Http;
using DocumentService.Infrastructure.Http;
using DocumentService.API.Messaging;
using DocumentService.API.Health;
using MassTransit;
using Amazon.S3;
using Amazon.Runtime;
using SharedKernel.Tracing;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddRentFlowAuthentication(builder.Configuration);
builder.Services.AddCurrentUserProfileResolver();
builder.Services.AddCustomOpenTelemetry(builder.Configuration, "DocumentService");
builder.Services.AddHttpClient("LeaseService", client =>
    client.BaseAddress = new Uri((builder.Configuration["LeaseService:BaseUrl"] ?? "http://leaseservice").TrimEnd('/') + "/"))
    .AddRentFlowResilience(TimeSpan.FromSeconds(5));

// QuestPDF Community License Setup
QuestPDF.Settings.License = LicenseType.Community;

builder.Services.AddControllers();
builder.Services.AddRentFlowSwagger("RentFlow - Document Service API", "v1", "PDF lease contract generation, metadata tracking, and MinIO S3 storage integration");
builder.Services.AddHealthChecks()
    .AddSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")!, name: "SQLServer")
    .AddCheck<MinioStorageHealthCheck>("MinIO");
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<GenerateContractConsumer>();
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
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(DocumentService.Application.Commands.GenerateLeaseContractCommand).Assembly));

// SQL Server for Metadata
builder.Services.AddDbContext<DocumentDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection must be configured.");
    options.UseSqlServer(connectionString);
});
builder.Services.AddSingleton<IAmazonS3>(_ =>
{
    var endpoint = builder.Configuration["Storage:S3Endpoint"]
        ?? throw new InvalidOperationException("Storage:S3Endpoint must be configured.");
    var accessKey = builder.Configuration["Storage:AccessKey"]
        ?? throw new InvalidOperationException("Storage:AccessKey must be configured.");
    var secretKey = builder.Configuration["Storage:SecretKey"]
        ?? throw new InvalidOperationException("Storage:SecretKey must be configured.");
    return new AmazonS3Client(new BasicAWSCredentials(accessKey, secretKey), new AmazonS3Config
    {
        ServiceURL = endpoint,
        AuthenticationRegion = "us-east-1",
        ForcePathStyle = true
    });
});
builder.Services.AddScoped<IDocumentReadRepository, DocumentReadRepository>();
builder.Services.AddScoped<IDocumentWriteRepository, DocumentWriteRepository>();
builder.Services.AddScoped<IDocumentLeaseLookup, DocumentService.Infrastructure.Http.DocumentLeaseLookup>();

// Assuming S3 / Minio configuration goes here...

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
    var db = scope.ServiceProvider.GetRequiredService<DocumentDbContext>();
    await db.Database.MigrateAsync();
}

if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled", true))
{
    app.UseRentFlowSwagger("RentFlow - Document Service API");
}

app.UseAuthentication();
app.UseAuthorization();
app.UseHttpMetrics();
app.MapControllers();
app.MapMetrics().AllowAnonymous();
app.MapHealthChecks("/health").AllowAnonymous();

app.Run();
