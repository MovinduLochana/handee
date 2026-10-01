using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;

namespace handee.API.Common;

public static class StoragePathResolver
{
    private const string DefaultUploadsFolder = "uploads";

    /// <summary>
    /// Returns the primary root directory where uploaded files should be saved.
    /// On Azure App Service, uses the persistent %HOME%/data/uploads directory so files
    /// persist across zip deployments. Locally or in containers, defaults to ContentRootPath/uploads.
    /// </summary>
    public static string GetUploadRootDirectory(IHostEnvironment env, IConfiguration? config = null)
    {
        var configuredPath = config?["Storage:UploadPath"];

        // Explicit absolute path configured
        if (!string.IsNullOrWhiteSpace(configuredPath) && Path.IsPathRooted(configuredPath))
        {
            return configuredPath;
        }

        var folderName = string.IsNullOrWhiteSpace(configuredPath) ? DefaultUploadsFolder : configuredPath;

        // Check for Azure App Service environment
        var home = Environment.GetEnvironmentVariable("HOME");
        var isAzure = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("WEBSITE_SITE_NAME")) ||
                      !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("WEBSITE_INSTANCE_ID"));

        if (isAzure && !string.IsNullOrEmpty(home))
        {
            return Path.Combine(home, "data", folderName);
        }

        return Path.Combine(env.ContentRootPath, folderName);
    }

    /// <summary>
    /// Returns all distinct candidate directories where uploaded files might reside
    /// (e.g. persistent Azure storage, ContentRootPath, or WebRootPath).
    /// </summary>
    public static IReadOnlyList<string> GetAllUploadDirectories(IHostEnvironment env, IConfiguration? config = null)
    {
        var primaryDir = GetUploadRootDirectory(env, config);
        var configuredPath = config?["Storage:UploadPath"];
        var folderName = string.IsNullOrWhiteSpace(configuredPath) ? DefaultUploadsFolder : configuredPath;

        var dirs = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            primaryDir,
            Path.Combine(env.ContentRootPath, folderName)
        };

        if (env is IWebHostEnvironment webEnv && !string.IsNullOrEmpty(webEnv.WebRootPath))
        {
            dirs.Add(Path.Combine(webEnv.WebRootPath, folderName));
        }

        var home = Environment.GetEnvironmentVariable("HOME");
        if (!string.IsNullOrEmpty(home))
        {
            dirs.Add(Path.Combine(home, "data", folderName));
        }

        return dirs.ToList();
    }

    /// <summary>
    /// Creates an IFileProvider that searches all candidate upload directories.
    /// The primary directory is ensured to exist.
    /// </summary>
    public static IFileProvider CreateUploadsFileProvider(IHostEnvironment env, IConfiguration? config = null)
    {
        var primaryDir = GetUploadRootDirectory(env, config);
        Directory.CreateDirectory(primaryDir);

        var candidateDirs = GetAllUploadDirectories(env, config);
        var providers = new List<IFileProvider>();

        foreach (var dir in candidateDirs)
        {
            if (Directory.Exists(dir))
            {
                providers.Add(new PhysicalFileProvider(dir));
            }
        }

        if (providers.Count == 0)
        {
            providers.Add(new PhysicalFileProvider(primaryDir));
        }

        return providers.Count == 1 ? providers[0] : new CompositeFileProvider(providers);
    }

    /// <summary>
    /// Returns a ContentTypeProvider supporting common image, video, and document formats.
    /// </summary>
    public static FileExtensionContentTypeProvider GetContentTypeProvider()
    {
        var provider = new FileExtensionContentTypeProvider();
        provider.Mappings[".webp"] = "image/webp";
        provider.Mappings[".jpg"] = "image/jpeg";
        provider.Mappings[".jpeg"] = "image/jpeg";
        provider.Mappings[".png"] = "image/png";
        provider.Mappings[".gif"] = "image/gif";
        provider.Mappings[".svg"] = "image/svg+xml";
        provider.Mappings[".pdf"] = "application/pdf";
        provider.Mappings[".mp4"] = "video/mp4";
        return provider;
    }
}
