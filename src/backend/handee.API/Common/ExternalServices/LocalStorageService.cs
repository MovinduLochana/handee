using handee.API.Interfaces;

namespace handee.API.Common.ExternalServices;

/// <summary>
/// Development-only local disk storage. Swap for Azure Blob / S3 by implementing IStorageService.
/// </summary>
public class LocalStorageService(
    IWebHostEnvironment env,
    IConfiguration config,
    ILogger<LocalStorageService> logger)
    : IStorageService
{
    public async Task<string> UploadAsync(IFormFile file, string folder, CancellationToken ct = default)
    {
        var uploadRoot = Path.Combine(StoragePathResolver.GetUploadRootDirectory(env, config), folder);
        Directory.CreateDirectory(uploadRoot);

        var ext = Path.GetExtension(file.FileName);
        var fileName = $"{Guid.NewGuid()}{ext}";
        var fullPath = Path.Combine(uploadRoot, fileName);

        await using var stream = new FileStream(fullPath, FileMode.Create);
        await file.CopyToAsync(stream, ct);

        logger.LogInformation("Stored file {FileName} → {Path}", file.FileName, fullPath);

        // Return a URL path that the API can serve as a static file
        return $"/uploads/{folder}/{fileName}";
    }
}
