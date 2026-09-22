using Microsoft.EntityFrameworkCore;
using handee.API.Data;
using handee.API.DTO;
using handee.API.Interfaces;

namespace handee.API.Services;

public class ServiceCategoryService : IServiceCategoryService
{
    private readonly AppDbContext _db;

    public ServiceCategoryService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<ServiceCategoryResponseDto>> GetAllAsync()
    {
        return await _db.ServiceCategories
            .OrderBy(c => c.Name)
            .Select(c => new ServiceCategoryResponseDto(c.Id, c.Name, c.PriceBandMin, c.PriceBandMax))
            .ToListAsync();
    }
}
