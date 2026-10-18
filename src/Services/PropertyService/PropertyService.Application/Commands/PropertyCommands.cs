using MediatR;
using SharedKernel.Common;
using PropertyService.Domain.Entities;
using PropertyService.Application.Interfaces;
using MassTransit;
using SharedKernel.Contracts.Events;

namespace PropertyService.Application.Commands;

public record CreatePropertyCommand(string Name, string Description, Guid LandlordId, Address Address) : IRequest<Result<CommandOutcome>>;

public class CreatePropertyCommandHandler : IRequestHandler<CreatePropertyCommand, Result<CommandOutcome>>
{
    private readonly IPropertyWriteRepository _repository;
    private readonly IPublishEndpoint _publisher;
    public CreatePropertyCommandHandler(IPropertyWriteRepository repository, IPublishEndpoint publisher)
    {
        _repository = repository;
        _publisher = publisher;
    }
    public async Task<Result<CommandOutcome>> Handle(CreatePropertyCommand request, CancellationToken cancellationToken)
    {
        var property = Property.Create(request.Name, request.Description, request.LandlordId, request.Address);
        await _repository.AddAsync(property, cancellationToken);
        await _publisher.Publish(new PropertyReportDataChangedEvent(
            property.Id, property.Id, property.LandlordId, property.CreatedAt), cancellationToken);
        return Result.Success(new CommandOutcome(property.Id, "CREATED"));
    }
}

public record AddUnitCommand(Guid PropertyId, string UnitNumber, int Floor, decimal SquareMeters, decimal RentAmount, string Currency) : IRequest<Result<CommandOutcome>>;

public class AddUnitCommandHandler : IRequestHandler<AddUnitCommand, Result<CommandOutcome>>
{
    private readonly IPropertyWriteRepository _repository;
    public AddUnitCommandHandler(IPropertyWriteRepository repository) => _repository = repository;
    public async Task<Result<CommandOutcome>> Handle(AddUnitCommand request, CancellationToken cancellationToken)
    {
        var property = await _repository.GetForUpdateAsync(request.PropertyId, cancellationToken);
        if (property == null) return Result.Failure<CommandOutcome>(Error.NotFound);
        
        var unit = PropertyService.Domain.Entities.Unit.Create(request.UnitNumber, request.Floor, request.SquareMeters, request.RentAmount, request.Currency);
        property.AddUnit(unit);
        await _repository.UpdateAsync(property, cancellationToken);
        return Result.Success(new CommandOutcome(property.Id, "UPDATED"));
    }
}
