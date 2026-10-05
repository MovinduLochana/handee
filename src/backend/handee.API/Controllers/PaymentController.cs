using System.Globalization;
using System.Security.Claims;
using handee.API.Common;
using handee.API.Common.Extensions;
using handee.API.DTO;
using handee.API.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace handee.API.Controllers;

[ApiController]
[Route("payments")]
[Route("api/payments")]
[Authorize]
public class PaymentController : ControllerBase
{
    private readonly IPaymentService _paymentService;
    private readonly IConfiguration _configuration;

    public PaymentController(IPaymentService paymentService, IConfiguration configuration)
    {
        _paymentService = paymentService;
        _configuration = configuration;
    }

    [HttpPost]
    [HttpPost("process")]
    public async Task<IActionResult> Process([FromBody] ProcessPaymentRequestDto dto)
    {
        var customerId = User.GetUserId();
        if (customerId is null) return Unauthorized();

        try
        {
            var result = await _paymentService.ProcessPaymentAsync(dto, customerId.Value);
            return StatusCode(StatusCodes.Status201Created, result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var payment = await _paymentService.GetPaymentByIdAsync(id);
        return payment == null ? NotFound() : Ok(payment);
    }

    [HttpGet("invoice/{invoiceId:guid}")]
    public async Task<IActionResult> GetByInvoiceId(Guid invoiceId)
    {
        var payment = await _paymentService.GetPaymentByInvoiceIdAsync(invoiceId);
        return payment == null ? NotFound() : Ok(payment);
    }

    [HttpGet("mine")]
    public async Task<IActionResult> GetMine()
    {
        var customerId = User.GetUserId();
        if (customerId is null) return Unauthorized();

        var payments = await _paymentService.GetCustomerPaymentsAsync(customerId.Value);
        return Ok(payments);
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAll()
    {
        var payments = await _paymentService.GetAllPaymentsAsync();
        return Ok(payments);
    }

    /// <summary>
    /// Generates PayHere checkout parameters and secure MD5 checksum for an invoice.
    /// </summary>
    [HttpGet("{invoiceId:guid}/payhere-params")]
    public async Task<IActionResult> GetPayHereParams(Guid invoiceId)
    {
        var customerId = User.GetUserId();
        if (customerId is null) return Unauthorized();

        try
        {
            var p = await _paymentService.GetPayHereParamsAsync(invoiceId, customerId.Value);
            return Ok(p);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Returns a self-submitting HTML checkout page for mobile apps or external redirects.
    /// </summary>
    [HttpGet("{invoiceId:guid}/payhere-checkout-html")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPayHereCheckoutHtml(Guid invoiceId, [FromQuery] bool reset = false)
    {
        try
        {
            if (reset)
            {
                await _paymentService.ResetInvoiceForTestingAsync(invoiceId);
            }

            var p = await _paymentService.GetPayHereParamsAsync(invoiceId, null);
            var html = $@"<!DOCTYPE html>
<html>
<head>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <meta name='referrer' content='unsafe-url'>
    <title>Redirecting to PayHere Sandbox...</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; }}
        .card {{ background: white; padding: 32px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; max-width: 400px; width: 90%; }}
        .spinner {{ width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top: 4px solid #0284c7; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }}
        @keyframes spin {{ 0% {{ transform: rotate(0deg); }} 100% {{ transform: rotate(360deg); }} }}
        button {{ background: #0284c7; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 16px; width: 100%; }}
    </style>
</head>
<body>
    <div class='card'>
        <div class='spinner'></div>
        <h2>Connecting to PayHere</h2>
        <p style='color: #64748b; font-size: 14px;'>Redirecting to secure PayHere Sandbox checkout for <strong>{p.Currency} {p.AmountFormatted}</strong>...</p>
        <form id='payhereForm' method='POST' action='{p.CheckoutUrl}'>
            <input type='hidden' name='merchant_id' value='{p.MerchantId}' />
            <input type='hidden' name='return_url' value='{p.ReturnUrl}' />
            <input type='hidden' name='cancel_url' value='{p.CancelUrl}' />
            <input type='hidden' name='notify_url' value='{p.NotifyUrl}' />
            <input type='hidden' name='order_id' value='{p.OrderId}' />
            <input type='hidden' name='items' value='{p.Items}' />
            <input type='hidden' name='currency' value='{p.Currency}' />
            <input type='hidden' name='amount' value='{p.AmountFormatted}' />
            <input type='hidden' name='first_name' value='{p.FirstName}' />
            <input type='hidden' name='last_name' value='{p.LastName}' />
            <input type='hidden' name='email' value='{p.Email}' />
            <input type='hidden' name='phone' value='{p.Phone}' />
            <input type='hidden' name='address' value='{p.Address}' />
            <input type='hidden' name='city' value='{p.City}' />
            <input type='hidden' name='country' value='{p.Country}' />
            <input type='hidden' name='hash' value='{p.Hash}' />
            <button type='submit'>Click here if not redirected automatically</button>
        </form>
    </div>
    <script>
        document.getElementById('payhereForm').submit();
    </script>
</body>
</html>";
            return Content(html, "text/html");
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("already been paid"))
        {
            var baseAppUrl = _configuration["PayHere:BaseAppUrl"] ?? "http://localhost:5173";
            var paidHtml = $@"<!DOCTYPE html>
<html>
<head>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Invoice Already Paid</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }}
        .card {{ background: white; padding: 36px; border-radius: 16px; box-shadow: 0 4px 25px rgba(0,0,0,0.08); text-align: center; max-width: 440px; width: 90%; }}
        .icon {{ width: 56px; height: 56px; background: #dcfce7; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 16px; font-weight: bold; }}
        h2 {{ margin: 0 0 8px; color: #0f172a; font-size: 22px; }}
        p {{ color: #64748b; font-size: 14px; line-height: 1.5; margin: 0 0 24px; }}
        .btn {{ display: block; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-bottom: 12px; }}
        .btn-primary {{ background: #0284c7; color: white; }}
        .btn-outline {{ background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }}
    </style>
</head>
<body>
    <div class='card'>
        <div class='icon'>✓</div>
        <h2>Invoice Already Settled</h2>
        <p>This invoice has already been settled in full. You can view the receipt or reset the invoice to test PayHere Sandbox again.</p>
        <a href='{baseAppUrl}/invoices/{invoiceId}' class='btn btn-primary'>View Receipt in Handee</a>
        <a href='/api/payments/{invoiceId}/payhere-checkout-html?reset=true' class='btn btn-outline'>Reset to Unpaid & Test PayHere Gateway Again</a>
    </div>
</body>
</html>";
            return Content(paidHtml, "text/html");
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Resets an invoice back to Issued status and clears existing test payments for re-testing.
    /// </summary>
    [HttpPost("{invoiceId:guid}/reset")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetInvoice(Guid invoiceId)
    {
        var success = await _paymentService.ResetInvoiceForTestingAsync(invoiceId);
        return success ? Ok(new { message = "Invoice reset to Issued" }) : NotFound();
    }

    /// <summary>
    /// IPN notification webhook called directly by PayHere servers upon payment authorization.
    /// Verifies MD5 signature and updates invoice status to Paid.
    /// </summary>
    [HttpPost("payhere-notify")]
    [AllowAnonymous]
    [Consumes("application/x-www-form-urlencoded")]
    public async Task<IActionResult> PayHereNotify([FromForm] PayHereNotificationDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.order_id) || string.IsNullOrWhiteSpace(dto.md5sig))
        {
            return BadRequest("Missing required PayHere notification parameters.");
        }

        var merchantId = _configuration["PayHere:MerchantId"]
            ?? Environment.GetEnvironmentVariable("PayHere__MerchantId")
            ?? "1238506";

        var merchantSecret = _configuration["PayHere:MerchantSecret"]
            ?? Environment.GetEnvironmentVariable("PayHere__MerchantSecret")
            ?? "MTEwNDM5MzQzMTEzMTk4MzUwOTYzOTY5NjgyNjM2MjgyMTk3NjgxNw==";

        var isValid = PayHereSecurity.VerifyNotificationHash(
            dto.merchant_id ?? merchantId,
            dto.order_id,
            dto.payhere_amount ?? "0.00",
            dto.payhere_currency ?? "LKR",
            dto.status_code ?? "0",
            merchantSecret,
            dto.md5sig
        );

        if (!isValid)
        {
            return BadRequest("Invalid PayHere MD5 signature checksum.");
        }

        // status_code == 2 indicates payment successfully authorized in PayHere
        if (dto.status_code == "2" && Guid.TryParse(dto.order_id, out var invoiceId))
        {
            decimal.TryParse(dto.payhere_amount, NumberStyles.Any, CultureInfo.InvariantCulture, out var amount);
            await _paymentService.ConfirmPayHerePaymentAsync(
                invoiceId,
                dto.payment_id,
                amount,
                dto.payhere_currency,
                dto.card_no,
                dto.method
            );
        }

        return Ok();
    }

    /// <summary>
    /// Authenticated client-side confirmation endpoint called after PayHere modal completion.
    /// </summary>
    [HttpPost("payhere-confirm")]
    public async Task<IActionResult> PayHereConfirm([FromBody] PayHereConfirmRequestDto dto)
    {
        try
        {
            var result = await _paymentService.ConfirmPayHerePaymentAsync(
                dto.InvoiceId,
                dto.PaymentId,
                dto.Amount,
                dto.Currency,
                dto.CardLast4,
                dto.Method
            );
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

