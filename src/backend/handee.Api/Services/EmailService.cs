using System.Net.Mail;
using handee.API.Common;
using handee.API.Interfaces;
using MailKit.Net.Smtp;
using Microsoft.Extensions.Options;
using MimeKit;
using MimeKit.Text;

namespace handee.API.Services;

public class EmailService : IEmailService
{
    private readonly EmailSettings _emailSettings;

    public EmailService(IOptions<EmailSettings> options)
    {
        _emailSettings = options.Value;
    }

    public async Task SendEmailAsync(string to, string subject, string body)
    {
        var email = new MimeMessage();
        email.From.Add(MailboxAddress.Parse(_emailSettings.SmtpUser));
        email.To.Add(MailboxAddress.Parse(to));
        email.Subject = subject;
        email.Body = new TextPart(TextFormat.Html) { Text = body };

        using var smtp = new MailKit.Net.Smtp.SmtpClient();
        await smtp.ConnectAsync(_emailSettings.SmtpHost, _emailSettings.SmtpPort, MailKit.Security.SecureSocketOptions.StartTls);
        await smtp.AuthenticateAsync(_emailSettings.SmtpUser, _emailSettings.SmtpPass);
        await smtp.SendAsync(email);
        await smtp.DisconnectAsync(true);
    }
}
