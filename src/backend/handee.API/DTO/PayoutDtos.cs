namespace handee.API.DTO;

public record PayoutResponseDto(
    Guid Id,
    Guid ProviderId,
    string? ProviderName,
    Guid? BookingId,
    decimal GrossAmount,
    decimal PlatformFeeDeducted,
    decimal NetAmount,
    string Currency,
    string Status,
    string? PayoutBatchId,
    DateTimeOffset? DisbursedAt,
    DateTimeOffset CreatedAt,
    Guid? InvoiceId = null
)
{
    public DateTimeOffset? ProcessedAt => DisbursedAt;
    public string? PayoutReference => PayoutBatchId;
}

public record ProviderEarningsSummaryDto(
    Guid ProviderId,
    decimal TotalEarnings,
    decimal AvailableBalance,
    decimal PendingPayouts,
    int CompletedJobsCount,
    List<PayoutResponseDto> RecentPayouts
);

public record AdminPayoutsOverviewDto(
    decimal TotalGrossVolume,
    decimal TotalPlatformFees,
    decimal TotalPaidOut,
    int PendingPayoutCount,
    List<PayoutResponseDto> RecentPayouts
);

