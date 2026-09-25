using handee.API.Entities;

namespace handee.API.Interfaces;

public interface IVerificationService
{
    Task TransitionAsync(
        Guid profileId,
        Guid adminUserId,
        VerificationStatus newStatus,
        string? note,
        CancellationToken ct = default);

    Task ResubmitAsync(Guid profileId, CancellationToken ct = default);
}
