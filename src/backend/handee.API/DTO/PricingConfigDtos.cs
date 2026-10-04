using System.ComponentModel.DataAnnotations;

namespace handee.API.DTO;

public record UrgencyMultiplierConfigDto(
    [Range(0.70, 1.10, ErrorMessage = "Low/Flexible multiplier must be between 0.70 and 1.10")]
    double Low,

    [Range(0.95, 1.05, ErrorMessage = "Normal multiplier must be anchored to 1.00")]
    double Normal,

    [Range(1.00, 1.40, ErrorMessage = "Medium multiplier must be between 1.00 and 1.40")]
    double Medium,

    [Range(1.10, 1.80, ErrorMessage = "High multiplier must be between 1.10 and 1.80")]
    double High,

    [Range(1.20, 3.00, ErrorMessage = "Emergency multiplier must be between 1.20 and 3.00")]
    double Emergency,

    DateTimeOffset? LastUpdatedAt = null
);
