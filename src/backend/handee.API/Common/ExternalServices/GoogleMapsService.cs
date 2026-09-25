using System.Text.Json;
using handee.API.Interfaces;
using Polly;
using Polly.CircuitBreaker;

namespace handee.API.Common.ExternalServices;

public class GoogleMapsService(IHttpClientFactory httpClientFactory, IConfiguration config, ILogger<GoogleMapsService> logger)
    : IGoogleMapsService
{
    private readonly string _apiKey = config["GoogleMaps:ApiKey"]
        ?? throw new InvalidOperationException("GoogleMaps:ApiKey is not configured.");

    private readonly AsyncCircuitBreakerPolicy<HttpResponseMessage> _circuitBreaker =
        Policy<HttpResponseMessage>
            .Handle<HttpRequestException>()
            .OrResult(r => !r.IsSuccessStatusCode)
            .CircuitBreakerAsync(
                handledEventsAllowedBeforeBreaking: 5,
                durationOfBreak: TimeSpan.FromSeconds(30),
                onBreak: (_, ts) => logger.LogWarning("Google Maps circuit breaker OPEN for {Duration}s", ts.TotalSeconds),
                onReset: () => logger.LogInformation("Google Maps circuit breaker RESET"),
                onHalfOpen: () => logger.LogInformation("Google Maps circuit breaker HALF-OPEN")
            );

    private readonly AsyncPolicy<HttpResponseMessage> _retryPolicy =
        Policy<HttpResponseMessage>
            .Handle<HttpRequestException>()
            .OrResult(r => !r.IsSuccessStatusCode)
            .WaitAndRetryAsync(
                retryCount: 3,
                sleepDurationProvider: attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)),
                onRetry: (_, ts, attempt, _) =>
                    logger.LogWarning("Google Maps retry {Attempt} after {Delay}s", attempt, ts.TotalSeconds)
            );

    public async Task<(double Lat, double Lng, string DisplayName)?> GeocodeAsync(
        string address, CancellationToken ct = default)
    {
        var client = httpClientFactory.CreateClient("GoogleMaps");
        var url = $"https://maps.googleapis.com/maps/api/geocode/json?address={Uri.EscapeDataString(address)}&key={_apiKey}";

        HttpResponseMessage response;
        try
        {
            var policy = Policy.WrapAsync(_retryPolicy, _circuitBreaker);
            response = await policy.ExecuteAsync(() => client.GetAsync(url, ct));
        }
        catch (BrokenCircuitException)
        {
            logger.LogError("Google Maps circuit is open — returning null for geocode");
            return null;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Google Maps geocode failed after retries");
            return null;
        }

        if (!response.IsSuccessStatusCode) return null;

        var body = await response.Content.ReadAsStreamAsync(ct);
        using var doc = await JsonDocument.ParseAsync(body, cancellationToken: ct);

        var results = doc.RootElement.GetProperty("results");
        if (results.GetArrayLength() == 0) return null;

        var first = results[0];
        var geometry = first.GetProperty("geometry").GetProperty("location");
        var lat = geometry.GetProperty("lat").GetDouble();
        var lng = geometry.GetProperty("lng").GetDouble();
        var displayName = first.GetProperty("formatted_address").GetString() ?? address;

        return (lat, lng, displayName);
    }
}
