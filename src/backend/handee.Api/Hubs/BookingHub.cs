using System.Security.Claims;
using handee.API.Common.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace handee.API.Hubs;

[Authorize]
public class BookingHub : Hub<IBookingClient>
{
    public override async Task OnConnectedAsync()
    {
        var userId = Context.User.GetUserId();
        if (userId.HasValue)
        {
            var user = Context.User;
            if (user != null)
            {
                if (user.IsInRole("Customer"))
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, $"Customer_{userId.Value}");
                }

                if (user.IsInRole("Provider"))
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, $"Provider_{userId.Value}");
                }

                if (user.IsInRole("Admin"))
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, "Admin");
                }
            }
        }

        await base.OnConnectedAsync();
    }
}
