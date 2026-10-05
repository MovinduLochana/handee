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

public record ProviderBankAccountDto(
    string BankName,
    string BranchName,
    string? BranchCode,
    string AccountNumber,
    string AccountHolderName,
    DateTimeOffset? UpdatedAt = null
);

public record WithdrawalRequestDto(
    decimal? Amount = null
);

public record WithdrawalResponseDto(
    bool Success,
    string Message,
    decimal AmountRequested,
    string BatchReference,
    int PayoutsProcessed
);

public record ProviderEarningsSummaryDto(
    Guid ProviderId,
    decimal TotalEarnings,
    decimal AvailableBalance,
    decimal PendingPayouts,
    int CompletedJobsCount,
    List<PayoutResponseDto> RecentPayouts,
    ProviderBankAccountDto? BankAccount = null
);

public record AdminPayoutsOverviewDto(
    decimal TotalGrossVolume,
    decimal TotalPlatformFees,
    decimal TotalPaidOut,
    int PendingPayoutCount,
    List<PayoutResponseDto> RecentPayouts
);

