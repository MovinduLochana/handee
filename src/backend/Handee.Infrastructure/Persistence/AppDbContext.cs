<<<<<<< Updated upstream
using Handee.Infrastructure.Persistence;
=======
using Handee.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
>>>>>>> Stashed changes
using Microsoft.EntityFrameworkCore;

namespace Handee.Infrastructure.Persistence;

<<<<<<< Updated upstream
public class AppDbContext : DbContext
=======
public class AppDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, string>
>>>>>>> Stashed changes
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }
<<<<<<< Updated upstream
=======

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Your application entity configurations
        // builder.ApplyConfigurationsFromAssembly(...);
    }
>>>>>>> Stashed changes
}