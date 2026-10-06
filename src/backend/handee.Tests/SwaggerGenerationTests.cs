using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.Swagger;
using Xunit;

namespace handee.Tests;

public class SwaggerGenerationTests
{
    [Fact]
    public void SwaggerDocument_GeneratesSuccessfully_WithoutExceptions()
    {
        // Arrange
        var services = new ServiceCollection();
        var mockEnv = new Moq.Mock<Microsoft.AspNetCore.Hosting.IWebHostEnvironment>();
        mockEnv.Setup(m => m.EnvironmentName).Returns("Development");
        services.AddSingleton(mockEnv.Object);
        services.AddSingleton<Microsoft.Extensions.Hosting.IHostEnvironment>(mockEnv.Object);
        services.AddLogging();
        services.AddControllers()
            .AddApplicationPart(typeof(handee.API.Controllers.AuthController).Assembly);
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Handee API",
                Version = "v1",
                Description = "API documentation for the Handee service platform"
            });

            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Description = "Enter JWT Bearer token format: Bearer {token}",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.Http,
                Scheme = "Bearer",
                BearerFormat = "JWT"
            });

            options.AddSecurityRequirement(_ => new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecuritySchemeReference("Bearer"),
                    new List<string>()
                }
            });
        });

        var serviceProvider = services.BuildServiceProvider();
        var swaggerProvider = serviceProvider.GetRequiredService<ISwaggerProvider>();

        // Act
        var doc = swaggerProvider.GetSwagger("v1");

        // Assert
        Assert.NotNull(doc);
        Assert.Equal("Handee API", doc.Info.Title);
        Assert.NotEmpty(doc.Paths);
    }
}
