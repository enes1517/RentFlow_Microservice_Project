using MediatR;
using SharedKernel.Common;
using UserService.Application.Interfaces;
using UserService.Application.ReadModels;

namespace UserService.Application.Queries.GetUserByIdentityId;

public class GetUserByIdentityIdQueryHandler : IRequestHandler<GetUserByIdentityIdQuery, Result<UserReadModel>>
{
    private readonly IUserReadRepository _userRepository;

    public GetUserByIdentityIdQueryHandler(IUserReadRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<Result<UserReadModel>> Handle(GetUserByIdentityIdQuery request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByIdentityIdAsync(request.IdentityId, cancellationToken);
        
        if (user == null)
        {
            return Result.Failure<UserReadModel>(Error.NotFound);
        }

        return Result.Success(user);
    }
}
