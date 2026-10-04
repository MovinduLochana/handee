import { BellDot, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function Notifications() {
  const notifications: any[] = [
    // Empty state for no notifications
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">Notifications</h1>
        <p className="text-muted-foreground text-sm">
          Stay updated with your latest alerts and activities.
        </p>
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (
          <Card
            key={n.id}
            className={`border-border transition-shadow hover:shadow-xs ${
              n.unread ? "border-l-4 border-l-primary bg-accent/20" : "bg-card"
            }`}
          >
            <CardContent className="p-4 flex items-start gap-4">
              <BellDot
                className={`h-5 w-5 mt-0.5 shrink-0 ${n.unread ? "text-primary" : "text-muted-foreground"}`}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm text-foreground mb-1 ${n.unread ? "font-semibold" : "font-normal"}`}
                >
                  {n.text}
                </p>
                <span className="text-xs text-muted-foreground">{n.time}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border bg-card/40 animate-fade-up">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
              <Inbox className="h-8 w-8" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">All caught up!</h3>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              Your dashboard is totally clear. When something needs your attention, it will appear
              right here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
