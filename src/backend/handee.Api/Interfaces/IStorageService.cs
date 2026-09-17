namespace handee.API.Interfaces;

public interface IStorageService
{
    /// <summary>
    /// Uploads a file and returns the public-accessible relative URL.
    /// </summary>
    Task<string> UploadAsync(IFormFile file, string folder, CancellationToken ct = default);
}
