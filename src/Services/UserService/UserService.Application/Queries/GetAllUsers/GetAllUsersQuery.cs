using MediatR;
using SharedKernel.Common;
using UserService.Application.ReadModels;

namespace UserService.Application.Queries.GetAllUsers;

public record GetAllUsersQuery(PagedQuery Pagination) : IRequest<Result<PagedResult<UserReadModel>>>;
