using MongoDB.Driver;
using PropertyService.Domain.Entities;
using Microsoft.Extensions.Configuration;

namespace PropertyService.Infrastructure.Data;

public class PropertyContext
{
    private readonly IMongoDatabase _database;

    public PropertyContext(IConfiguration configuration)
    {
        var client = PropertyMongoClientFactory.Create(configuration);
        _database = client.GetDatabase("PropertyDb");
    }

    public IMongoCollection<Property> Properties => _database.GetCollection<Property>("Properties");
}
