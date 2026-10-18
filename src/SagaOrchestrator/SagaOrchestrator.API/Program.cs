using MassTransit;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SagaOrchestrator.API.Data;
using SagaOrchestrator.API.SagaStates;
using SagaOrchestrator.API.StateMachines;
using SagaOrchestrator.API.Queries;
using Prometheus;
using SharedKernel.Security;
using SharedKernel.Api;
using SharedKernel.Tracing;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddRentFlowAuthentication(builder.Configuration);
builder.Services.AddCustomOpenTelemetry(builder.Configuration, "SagaOrchestrator");

builder.Services.AddRentFlowSwagger("RentFlow - Saga Orchestrator API", "v1", "MassTransit distributed transaction saga state machines: LeaseAgreement, RentPayment, LeaseTermination");
builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("DefaultConnection")!, name: "PostgreSQL");
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(GetSagaSummariesQuery).Assembly));
builder.Services.AddHostedService<LeaseAgreementSagaTimeoutService>();

// PostgreSQL for Saga States
builder.Services.AddDbContext<SagaDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection must be configured.");
    options.UseNpgsql(connectionString);
});

// MassTransit & Saga Orchestration
builder.Services.AddMassTransit(x =>
{
    // Register Sagas and tell them to use EF Core with PostgreSQL lock syntax
    x.AddSagaStateMachine<LeaseAgreementSaga, LeaseAgreementSagaState>()
        .EntityFrameworkRepository(r =>
        {
            r.ConcurrencyMode = ConcurrencyMode.Pessimistic;
            r.ExistingDbContext<SagaDbContext>();
            r.UsePostgres();
        });
        
    x.AddSagaStateMachine<RentPaymentSaga, RentPaymentSagaState>()
        .EntityFrameworkRepository(r =>
        {
            r.ConcurrencyMode = ConcurrencyMode.Pessimistic;
            r.ExistingDbContext<SagaDbContext>();
            r.UsePostgres();
        });
        
    x.AddSagaStateMachine<LeaseTerminationSaga, LeaseTerminationSagaState>()
        .EntityFrameworkRepository(r =>
        {
            r.ConcurrencyMode = ConcurrencyMode.Pessimistic;
            r.ExistingDbContext<SagaDbContext>();
            r.UsePostgres();
        });

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host("rabbitmq", "/", h =>
        {
            h.Username(builder.Configuration["RabbitMQ:Username"]
                ?? throw new InvalidOperationException("RabbitMQ:Username must be configured."));
            h.Password(builder.Configuration["RabbitMQ:Password"]
                ?? throw new InvalidOperationException("RabbitMQ:Password must be configured."));
        });

        // Use Saga endpoints
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
    var db = scope.ServiceProvider.GetRequiredService<SagaDbContext>();
    await db.Database.MigrateAsync();
}

if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled", true))
{
    app.UseRentFlowSwagger("RentFlow - Saga Orchestrator API");
}

app.UseAuthentication();
app.UseAuthorization();
app.MapGet("/api/sagas", async (IMediator mediator, CancellationToken cancellationToken) =>
    Results.Ok(await mediator.Send(new GetSagaSummariesQuery(), cancellationToken)))
    .RequireAuthorization("AdministratorsOnly")
    .WithName("GetSagaSummaries")
    .WithSummary("List active and completed saga orchestration workflows");

app.UseHttpMetrics();
app.MapMetrics().AllowAnonymous();
app.MapHealthChecks("/health").AllowAnonymous();

app.Run();
