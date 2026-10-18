using MediatR;
using SharedKernel.Common;
using UserService.Application.ReadModels;

namespace UserService.Application.Queries.GetUserById;

public record GetUserByIdQuery(Guid Id) : IRequest<Result<UserReadModel>>;
