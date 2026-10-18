using MaintenanceService.Domain.Entities;

namespace MaintenanceService.Application.Interfaces;

public interface IMaintenanceWriteRepository
{
    Task<MaintenanceRequest?> GetForUpdateAsync(Guid id, CancellationToken cancellationToken = default);
    Task AddAsync(MaintenanceRequest request, CancellationToken cancellationToken = default);
    Task UpdateAsync(MaintenanceRequest request, CancellationToken cancellationToken = default);
}
