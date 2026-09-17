import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getNotifications } from "@/pages/api";

function fmt(d?: string) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

// GET /api/notifications — parent's in-app feed (proximity pickup/drop-off
// alerts, etc). Polled every 30s; that's frequent enough for "your child's
// bus is nearby" without hammering the endpoint like live GPS polling does.
export function NotificationsBell() {
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    refetchInterval: 30_000,
  });

  const list = Array.isArray(notifications) ? notifications : [];
  const unreadCount = list.filter((n: any) => !n.read && !n.readAt).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b font-medium text-sm">Notifications</div>
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground text-center">Loading...</p>
          ) : list.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">
              No notifications yet.
            </p>
          ) : (
            list.map((n: any, i: number) => (
              <div
                key={n.id ?? i}
                className={`p-3 border-b last:border-b-0 text-sm ${
                  !n.read && !n.readAt ? "bg-primary/5" : ""
                }`}
              >
                <p className="font-medium">{n.title ?? "Notification"}</p>
                <p className="text-muted-foreground">{n.message ?? n.body ?? ""}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {fmt(n.createdAt ?? n.timestamp)}
                </p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
