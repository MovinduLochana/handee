namespace handee.API.Interfaces;

public interface IGoogleMapsService
{
    /// <summary>
    /// Geocodes an address string and returns (latitude, longitude, displayName), 
    /// or null if geocoding fails or returns no results.
    /// </summary>
    Task<(double Lat, double Lng, string DisplayName)?> GeocodeAsync(
        string address, CancellationToken ct = default);
}
