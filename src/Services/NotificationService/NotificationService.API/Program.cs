using Microsoft.EntityFrameworkCore;
using NotificationService.Infrastructure.Data;
using NotificationService.Application.Interfaces;
using NotificationService.Infrastructure.Email;
using NotificationService.Infrastructure.Options;
using NotificationService.Infrastructure.Repositories;
using Prometheus;
using SharedKernel.Security;
using SharedKernel.Api;
using SharedKernel.Http;
using SharedKernel.Tracing;
using NotificationService.Infrastructure.Http;
using NotificationService.Infrastructure.Sms;
using NotificationService.Infrastructure.Push;
using MassTransit;
using NotificationService.API.Messaging;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddRentFlowAuthentication(builder.Configuration);
builder.Services.AddCurrentUserProfileResolver();
builder.Services.AddCustomOpenTelemetry(builder.Configuration, "NotificationService");
builder.Services.AddHttpClient("UserService", client =>
    client.BaseAddress = new Uri((builder.Configuration["UserService:BaseUrl"] ?? "http://userservice").TrimEnd('/') + "/"))
    .AddRentFlowResilience(TimeSpan.FromSeconds(5));
builder.Services.AddHttpClient("LeaseService", client =>
    client.BaseAddress = new Uri((builder.Configuration["LeaseService:BaseUrl"] ?? "http://leaseservice").TrimEnd('/') + "/"))
    .AddRentFlowResilience(TimeSpan.FromSeconds(5));

builder.Services.AddControllers();
builder.Services.AddRentFlowSwagger("RentFlow - Notification Service API", "v1", "Multi-channel notifications: email (MailKit/MailHog), SMS, and push dispatch");
builder.Services.AddHealthChecks()
    .AddSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")!, name: "SQLServer");
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(NotificationService.Application.Commands.SendNotificationCommand).Assembly));

// SQL Server for Logs
builder.Services.AddDbContext<NotificationDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection must be configured.");
    options.UseSqlServer(connectionString);
});
builder.Services.AddScoped<INotificationReadRepository, NotificationReadRepository>();
builder.Services.AddScoped<INotificationWriteRepository, NotificationWriteRepository>();
builder.Services.AddScoped<INotificationRecipientLookup, NotificationService.Infrastructure.Http.NotificationRecipientLookup>();
builder.Services.AddOptions<SmtpOptions>()
    .BindConfiguration(SmtpOptions.SectionName)
    .Validate(options => !string.IsNullOrWhiteSpace(options.Host), "Email:Smtp:Host is required.")
    .Validate(options => options.Port is > 0 and <= 65535, "Email:Smtp:Port must be a valid TCP port.")
    .Validate(options => System.Net.Mail.MailAddress.TryCreate(options.SenderAddress, out _),
        "Email:Smtp:SenderAddress must be a valid email address.")
    .Validate(options => string.IsNullOrWhiteSpace(options.Username)
        || !string.IsNullOrWhiteSpace(options.Password), "Email:Smtp:Password is required when a username is configured.")
    .ValidateOnStart();
builder.Services.AddTransient<IEmailSender, MailKitEmailSender>();
builder.Services.AddTransient<ISmsSender, SimulatedSmsSender>();
builder.Services.AddTransient<IPushSender, SimulatedPushSender>();

// MassTransit
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<SendNotificationCommandConsumer>();
    x.AddConsumer<TenantInvitedEventConsumer>();
    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host("rabbitmq", "/", h =>
        {
            h.Username(builder.Configuration["RabbitMQ:Username"] ?? "guest");
            h.Password(builder.Configuration["RabbitMQ:Password"] ?? "guest");
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
    var db = scope.ServiceProvider.GetRequiredService<NotificationDbContext>();
    await db.Database.MigrateAsync();
}

if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled", true))
{
    app.UseRentFlowSwagger("RentFlow - Notification Service API");
}

app.UseAuthentication();
app.UseAuthorization();
app.UseHttpMetrics();
app.MapControllers();
app.MapMetrics().AllowAnonymous();
app.MapHealthChecks("/health").AllowAnonymous();

app.Run();
