using Handee.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Handee.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }
}