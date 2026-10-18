using MediatR;
using SharedKernel.Common;
using PropertyService.Application.ReadModels;
using PropertyService.Application.Interfaces;

namespace PropertyService.Application.Queries;

public record GetAllPropertiesQuery(PagedQuery Pagination) : IRequest<Result<PagedResult<PropertyReadModel>>>;

public class GetAllPropertiesQueryHandler : IRequestHandler<GetAllPropertiesQuery, Result<PagedResult<PropertyReadModel>>>
{
    private readonly IPropertyReadRepository _repository;
    public GetAllPropertiesQueryHandler(IPropertyReadRepository repository) => _repository = repository;
    public async Task<Result<PagedResult<PropertyReadModel>>> Handle(GetAllPropertiesQuery request, CancellationToken cancellationToken) =>
        Result.Success(await _repository.GetAllAsync(request.Pagination, cancellationToken));
}

public record GetPropertyByIdQuery(Guid Id) : IRequest<Result<PropertyReadModel>>;

public class GetPropertyByIdQueryHandler : IRequestHandler<GetPropertyByIdQuery, Result<PropertyReadModel>>
{
    private readonly IPropertyReadRepository _repository;
    public GetPropertyByIdQueryHandler(IPropertyReadRepository repository) => _repository = repository;
    public async Task<Result<PropertyReadModel>> Handle(GetPropertyByIdQuery request, CancellationToken cancellationToken)
    {
        var property = await _repository.GetByIdAsync(request.Id, cancellationToken);
        return property != null ? Result.Success(property) : Result.Failure<PropertyReadModel>(Error.NotFound);
    }
}

public record GetPropertiesByLandlordQuery(Guid LandlordId, PagedQuery Pagination) : IRequest<Result<PagedResult<PropertyReadModel>>>;

public class GetPropertiesByLandlordQueryHandler : IRequestHandler<GetPropertiesByLandlordQuery, Result<PagedResult<PropertyReadModel>>>
{
    private readonly IPropertyReadRepository _repository;
    public GetPropertiesByLandlordQueryHandler(IPropertyReadRepository repository) => _repository = repository;
    public async Task<Result<PagedResult<PropertyReadModel>>> Handle(GetPropertiesByLandlordQuery request, CancellationToken cancellationToken) =>
        Result.Success(await _repository.GetByLandlordAsync(request.LandlordId, request.Pagination, cancellationToken));
}
