using handee.API.Common;
using handee.API.Hubs;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace handee.Tests.Hubs;

public class HubAuthenticationPipelineTests
{
    [Fact]
    public void BookingHub_Requires_AuthorizeAttribute()
    {
        var authAttribute = typeof(BookingHub)
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true);

        Assert.NotEmpty(authAttribute);
    }

    [Fact]
    public async Task ConfigureHubJwtBearer_ExtractsTokenFromQuery_WhenPathStartsWithHubs()
    {
        // Arrange
        var options = new JwtBearerOptions();
        HubAuthExtensions.ConfigureHubJwtBearer(options);

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Path = "/hubs/booking";
        httpContext.Request.QueryString = new QueryString("?access_token=my-secret-jwt-token");

        var scheme = new AuthenticationScheme(
            JwtBearerDefaults.AuthenticationScheme,
            null,
            typeof(JwtBearerHandler));
        var context = new MessageReceivedContext(httpContext, scheme, options);

        // Act
        Assert.NotNull(options.Events?.OnMessageReceived);
        await options.Events.OnMessageReceived(context);

        // Assert
        Assert.Equal("my-secret-jwt-token", context.Token);
    }

    [Fact]
    public async Task ConfigureHubJwtBearer_DoesNotExtractTokenFromQuery_WhenPathDoesNotStartWithHubs()
    {
        // Arrange
        var options = new JwtBearerOptions();
        HubAuthExtensions.ConfigureHubJwtBearer(options);

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Path = "/api/bookings";
        httpContext.Request.QueryString = new QueryString("?access_token=my-secret-jwt-token");

        var scheme = new AuthenticationScheme(
            JwtBearerDefaults.AuthenticationScheme,
            null,
            typeof(JwtBearerHandler));
        var context = new MessageReceivedContext(httpContext, scheme, options);

        // Act
        Assert.NotNull(options.Events?.OnMessageReceived);
        await options.Events.OnMessageReceived(context);

        // Assert
        Assert.Null(context.Token);
    }
}
