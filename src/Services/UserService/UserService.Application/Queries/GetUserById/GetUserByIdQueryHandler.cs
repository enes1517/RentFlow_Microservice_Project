using MediatR;
using SharedKernel.Common;
using UserService.Application.Interfaces;
using UserService.Application.ReadModels;

namespace UserService.Application.Queries.GetUserById;

public class GetUserByIdQueryHandler : IRequestHandler<GetUserByIdQuery, Result<UserReadModel>>
{
    private readonly IUserReadRepository _userRepository;

    public GetUserByIdQueryHandler(IUserReadRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<Result<UserReadModel>> Handle(GetUserByIdQuery request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByIdAsync(request.Id, cancellationToken);
        
        if (user == null)
        {
            return Result.Failure<UserReadModel>(Error.NotFound);
        }

        return Result.Success(user);
    }
}
