using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using System.IO;

namespace Handee.Infrastructure.Persistence;

public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        // Path to the API project's appsettings.json
        var apiPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "Handee.Api");

        var configuration = new ConfigurationBuilder()
            .AddJsonFile(Path.Combine(apiPath, "appsettings.json"), optional: false)
            .AddJsonFile(Path.Combine(apiPath, "appsettings.Development.json"), optional: true)
            .Build();

        var builder = new DbContextOptionsBuilder<AppDbContext>();
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        // Use Npgsql for PostgreSQL
        builder.UseNpgsql(connectionString);

        return new AppDbContext(builder.Options);
    }
}
