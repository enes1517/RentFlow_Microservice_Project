using MaintenanceService.Application.Interfaces;
using MaintenanceService.Domain.Entities;
using MaintenanceService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace MaintenanceService.Infrastructure.Repositories;

public sealed class MaintenanceWriteRepository(MaintenanceDbContext context) : IMaintenanceWriteRepository
{
    public Task<MaintenanceRequest?> GetForUpdateAsync(Guid id, CancellationToken cancellationToken = default) =>
        context.MaintenanceRequests.FirstOrDefaultAsync(request => request.Id == id, cancellationToken);

    public async Task AddAsync(MaintenanceRequest request, CancellationToken cancellationToken = default)
    {
        context.MaintenanceRequests.Add(request);
        await context.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(MaintenanceRequest request, CancellationToken cancellationToken = default)
    {
        context.MaintenanceRequests.Update(request);
        await context.SaveChangesAsync(cancellationToken);
    }
}
