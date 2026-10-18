using MediatR;
using SharedKernel.Common;
using UserService.Application.Interfaces;
using UserService.Domain.Entities;

namespace UserService.Application.Commands.SyncUser;

public class SyncUserCommandHandler : IRequestHandler<SyncUserCommand, Result<CommandOutcome>>
{
    private readonly IUserWriteRepository _userRepository;

    public SyncUserCommandHandler(IUserWriteRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<Result<CommandOutcome>> Handle(SyncUserCommand request, CancellationToken cancellationToken)
    {
        var existingUser = await _userRepository.GetForUpdateByIdentityIdAsync(request.IdentityId, cancellationToken);
        
        if (existingUser != null)
        {
            existingUser.UpdateProfile(
                request.Email,
                request.FirstName,
                request.LastName,
                request.Role,
                request.PhoneNumber);
            await _userRepository.SaveChangesAsync(cancellationToken);
            return Result.Success(new CommandOutcome(existingUser.Id, "UPDATED"));
        }

        var newUser = UserProfile.Create(
            request.IdentityId, 
            request.Email, 
            request.FirstName, 
            request.LastName, 
            request.Role, 
            request.PhoneNumber, 
            request.IdentityNumber);

        await _userRepository.AddAsync(newUser, cancellationToken);
        await _userRepository.SaveChangesAsync(cancellationToken);

        return Result.Success(new CommandOutcome(newUser.Id, "CREATED"));
    }
}
