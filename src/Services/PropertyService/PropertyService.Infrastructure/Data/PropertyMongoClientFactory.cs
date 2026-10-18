using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;
using MongoDB.Driver;
using Microsoft.Extensions.Configuration;
using PropertyService.Domain.Entities;

namespace PropertyService.Infrastructure.Data;

public static class PropertyMongoClientFactory
{
    private static readonly object BsonMappingLock = new();

    public static MongoClient Create(IConfiguration configuration)
    {
        EnsureGuidMappings();

        var connectionString = configuration.GetConnectionString("MongoConnection");
        if (!string.IsNullOrWhiteSpace(connectionString))
            return new MongoClient(connectionString);

        var host = configuration["Mongo:Host"] ?? "mongodb:27017";
        var settings = MongoClientSettings.FromConnectionString($"mongodb://{host}");
        var username = configuration["Mongo:Username"];
        if (!string.IsNullOrWhiteSpace(username))
        {
            var password = configuration["Mongo:Password"]
                ?? throw new InvalidOperationException("Mongo:Password is required when Mongo:Username is configured.");
            var authenticationSource = configuration["Mongo:AuthenticationSource"] ?? "admin";
            settings.Credential = MongoCredential.CreateCredential(authenticationSource, username, password);
        }

        return new MongoClient(settings);
    }

    private static void EnsureGuidMappings()
    {
        lock (BsonMappingLock)
        {
            if (!BsonClassMap.IsClassMapRegistered(typeof(Unit)))
            {
                BsonClassMap.RegisterClassMap<Unit>(classMap =>
                {
                    classMap.AutoMap();
                    classMap.GetMemberMap(nameof(Unit.UnitId))
                        .SetElementName("Id")
                        .SetSerializer(new GuidSerializer(GuidRepresentation.Standard));
                    classMap.GetMemberMap(nameof(Unit.ReservedForLeaseId))
                        .SetSerializer(new NullableSerializer<Guid>(
                            new GuidSerializer(GuidRepresentation.Standard)));
                });
            }

            if (!BsonClassMap.IsClassMapRegistered(typeof(Property)))
            {
                BsonClassMap.RegisterClassMap<Property>(classMap =>
                {
                    classMap.AutoMap();
                    classMap.GetMemberMap(nameof(Property.Id))
                        .SetSerializer(new GuidSerializer(GuidRepresentation.Standard));
                    classMap.GetMemberMap(nameof(Property.LandlordId))
                        .SetSerializer(new GuidSerializer(GuidRepresentation.Standard));
                });
            }
        }
    }
}
