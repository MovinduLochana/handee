using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace handee.API.Common;

public static class PayHereSecurity
{
    public static string CreateMd5(string input)
    {
        using var md5 = MD5.Create();
        var inputBytes = Encoding.UTF8.GetBytes(input);
        var hashBytes = md5.ComputeHash(inputBytes);
        return Convert.ToHexString(hashBytes).ToUpperInvariant();
    }

    /// <summary>
    /// Generates PayHere checkout checksum:
    /// UPPERCASE(MD5(merchant_id + order_id + formatted_amount + currency + UPPERCASE(MD5(merchant_secret))))
    /// </summary>
    public static string GenerateCheckoutHash(
        string merchantId,
        string orderId,
        decimal amount,
        string currency,
        string merchantSecret)
    {
        var formattedAmount = amount.ToString("0.00", CultureInfo.InvariantCulture);
        var hashedSecret = CreateMd5(merchantSecret);
        var rawString = $"{merchantId}{orderId}{formattedAmount}{currency}{hashedSecret}";
        return CreateMd5(rawString);
    }

    /// <summary>
    /// Verifies PayHere IPN notification callback checksum:
    /// UPPERCASE(MD5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + UPPERCASE(MD5(merchant_secret))))
    /// </summary>
    public static bool VerifyNotificationHash(
        string merchantId,
        string orderId,
        string payhereAmount,
        string payhereCurrency,
        string statusCode,
        string merchantSecret,
        string receivedMd5Sig)
    {
        if (string.IsNullOrWhiteSpace(receivedMd5Sig)) return false;

        var hashedSecret = CreateMd5(merchantSecret);
        var rawString = $"{merchantId}{orderId}{payhereAmount}{payhereCurrency}{statusCode}{hashedSecret}";
        var computedHash = CreateMd5(rawString);
        return string.Equals(computedHash, receivedMd5Sig.Trim(), StringComparison.OrdinalIgnoreCase);
    }
}
