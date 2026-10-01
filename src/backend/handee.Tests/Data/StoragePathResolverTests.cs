using handee.API.Common;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;

namespace handee.Tests.Data;

public class StoragePathResolverTests
{
    private readonly Mock<IWebHostEnvironment> _mockEnv;

    public StoragePathResolverTests()
    {
        _mockEnv = new Mock<IWebHostEnvironment>();
        _mockEnv.Setup(e => e.ContentRootPath).Returns(Path.GetTempPath());
    }

    [Fact]
    public void GetUploadRootDirectory_DefaultsToContentRootUploads_WhenNotInAzure()
    {
        // Ensure Azure env vars are clear
        var originalSite = Environment.GetEnvironmentVariable("WEBSITE_SITE_NAME");
        var originalInstance = Environment.GetEnvironmentVariable("WEBSITE_INSTANCE_ID");
        try
        {
            Environment.SetEnvironmentVariable("WEBSITE_SITE_NAME", null);
            Environment.SetEnvironmentVariable("WEBSITE_INSTANCE_ID", null);

            var path = StoragePathResolver.GetUploadRootDirectory(_mockEnv.Object);

            var expected = Path.Combine(Path.GetTempPath(), "uploads");
            Assert.Equal(expected, path);
        }
        finally
        {
            Environment.SetEnvironmentVariable("WEBSITE_SITE_NAME", originalSite);
            Environment.SetEnvironmentVariable("WEBSITE_INSTANCE_ID", originalInstance);
        }
    }

    [Fact]
    public void GetUploadRootDirectory_UsesAzureHomeData_WhenRunningInAzure()
    {
        var originalSite = Environment.GetEnvironmentVariable("WEBSITE_SITE_NAME");
        var originalHome = Environment.GetEnvironmentVariable("HOME");
        try
        {
            var fakeHome = Path.Combine(Path.GetTempPath(), "azure_home");
            Environment.SetEnvironmentVariable("WEBSITE_SITE_NAME", "sefproject");
            Environment.SetEnvironmentVariable("HOME", fakeHome);

            var path = StoragePathResolver.GetUploadRootDirectory(_mockEnv.Object);

            var expected = Path.Combine(fakeHome, "data", "uploads");
            Assert.Equal(expected, path);
        }
        finally
        {
            Environment.SetEnvironmentVariable("WEBSITE_SITE_NAME", originalSite);
            Environment.SetEnvironmentVariable("HOME", originalHome);
        }
    }

    [Fact]
    public void CreateUploadsFileProvider_CreatesAndReturnsProvider()
    {
        var provider = StoragePathResolver.CreateUploadsFileProvider(_mockEnv.Object);
        Assert.NotNull(provider);
    }

    [Fact]
    public void GetContentTypeProvider_ContainsImageMappings()
    {
        var provider = StoragePathResolver.GetContentTypeProvider();

        Assert.True(provider.TryGetContentType("test.jpg", out var jpgType));
        Assert.Equal("image/jpeg", jpgType);

        Assert.True(provider.TryGetContentType("test.png", out var pngType));
        Assert.Equal("image/png", pngType);

        Assert.True(provider.TryGetContentType("test.webp", out var webpType));
        Assert.Equal("image/webp", webpType);
    }
}
