using MediatR;
using SharedKernel.Common;
using UserService.Application.Interfaces;
using UserService.Application.ReadModels;

namespace UserService.Application.Queries.GetAllUsers;

public class GetAllUsersQueryHandler : IRequestHandler<GetAllUsersQuery, Result<PagedResult<UserReadModel>>>
{
    private readonly IUserReadRepository _userRepository;

    public GetAllUsersQueryHandler(IUserReadRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<Result<PagedResult<UserReadModel>>> Handle(GetAllUsersQuery request, CancellationToken cancellationToken)
    {
        var users = await _userRepository.GetAllAsync(request.Pagination, cancellationToken);
        return Result.Success(users);
    }
}
