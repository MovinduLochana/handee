using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace handee.API.Common;

public static class HubAuthExtensions
{
    public static void ConfigureHubJwtBearer(JwtBearerOptions options)
    {
        options.Events ??= new JwtBearerEvents();
        var originalOnMessageReceived = options.Events.OnMessageReceived;

        options.Events.OnMessageReceived = async context =>
        {
            if (originalOnMessageReceived != null)
            {
                await originalOnMessageReceived(context);
            }

            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
        };
    }
}
