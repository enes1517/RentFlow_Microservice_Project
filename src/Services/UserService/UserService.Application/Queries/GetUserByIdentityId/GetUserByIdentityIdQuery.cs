using MediatR;
using SharedKernel.Common;
using UserService.Application.ReadModels;

namespace UserService.Application.Queries.GetUserByIdentityId;

public record GetUserByIdentityIdQuery(string IdentityId) : IRequest<Result<UserReadModel>>;
