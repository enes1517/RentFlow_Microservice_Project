using MediatR;

namespace SagaOrchestrator.API.Queries;

public sealed record SagaStepReadModel(string Label, string Status);

public sealed record SagaSummaryReadModel(
    Guid Id, string Type, string Status, IReadOnlyList<SagaStepReadModel> Steps);

public sealed record GetSagaSummariesQuery() : IRequest<IReadOnlyList<SagaSummaryReadModel>>;
