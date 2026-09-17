using handee.API.DTO;

namespace handee.API.Interfaces;

public interface IServiceCategoryService
{
    Task<List<ServiceCategoryResponseDto>> GetAllAsync();
}
