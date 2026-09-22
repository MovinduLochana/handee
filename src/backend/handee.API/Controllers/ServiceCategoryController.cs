using Microsoft.AspNetCore.Mvc;
using handee.API.Interfaces;

namespace handee.API.Controllers;

[ApiController]
[Route("service-categories")]
public class ServiceCategoryController : ControllerBase
{
    private readonly IServiceCategoryService _serviceCategoryService;

    public ServiceCategoryController(IServiceCategoryService serviceCategoryService)
    {
        _serviceCategoryService = serviceCategoryService;
    }

    // GET /service-categories
    // No [Authorize]: reference data a customer needs to see before even
    // submitting a request.
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _serviceCategoryService.GetAllAsync();
        return Ok(result);
    }
}
