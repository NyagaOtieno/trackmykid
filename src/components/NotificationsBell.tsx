import { Bell, Bus, MapPin, AlertTriangle } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getNotifications, getUnreadNotificationCount, markNotificationRead } from "@/pages/api";

function fmt(d?: string) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

// Backend sometimes embeds an internal reference tag like "[student:245]"
// at the end of the message — confirmed from a real response. Strip it
// for display; it's not meant for the parent to see.
function cleanMessage(msg?: string) {
  if (!msg) return "";
  return msg.replace(/\s*\[\w+:\d+\]\s*$/i, "").trim();
}

type NotifKind = "ONBOARD" | "OFFBOARD" | "PROXIMITY" | "PANIC" | "OTHER";

// Backend confirms notifications carry a `type` field with 4 possible
// values (onboarding, offboarding, proximity alert, panic alert) — exact
// enum string casing isn't confirmed, so this matches on substrings of
// whatever `type` actually contains, and only falls back to scanning
// title/message if `type` is missing entirely. OFFBOARD/CHECKED_OUT is
// checked before ONBOARD/CHECKED_IN since "OFFBOARD" contains the
// substring "BOARD" and would otherwise false-match first.
function detectKind(n: any): NotifKind {
  const typeField = (n.type ?? n.eventType ?? n.category ?? n.kind ?? "").toString().toUpperCase();
  const haystack = typeField || [n.title, n.message, n.body].filter(Boolean).join(" ").toUpperCase();

  if (haystack.includes("PANIC") || haystack.includes("SOS") || haystack.includes("EMERGENCY")) {
    return "PANIC";
  }
  if (haystack.includes("PROXIM") || haystack.includes("NEARBY") || haystack.includes("APPROACHING")) {
    return "PROXIMITY";
  }
  if (
    haystack.includes("OFFBOARD") ||
    haystack.includes("CHECKED_OUT") ||
    haystack.includes("CHECKED OUT") ||
    haystack.includes("DROPPED OFF") ||
    haystack.includes("ALIGHT")
  ) {
    return "OFFBOARD";
  }
  if (
    haystack.includes("ONBOARD") ||
    haystack.includes("CHECKED_IN") ||
    haystack.includes("CHECKED IN") ||
    haystack.includes("BOARDED")
  ) {
    return "ONBOARD";
  }
  return "OTHER";
}

function KindIcon({ kind }: { kind: NotifKind }) {
  switch (kind) {
    case "PANIC":
      return <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />;
    case "PROXIMITY":
      return <MapPin className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />;
    case "OFFBOARD":
      return <Bus className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />;
    case "ONBOARD":
      return <Bus className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />;
  }
}

// Generic — used by both ParentPortal (onboard/offboard/proximity/panic
// for their own children) and the admin Navbar (same 4 types, scoped
// tenant-wide by the backend based on the authenticated user's role).
export function NotificationsBell() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications(),
    refetchInterval: 30_000,
  });

  // Dedicated lightweight endpoint for the badge — cheaper to poll more
  // often than re-fetching the full list every time.
  const { data: unreadCountData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadNotificationCount,
    refetchInterval: 15_000,
  });

  const list = Array.isArray(notifications) ? notifications : [];
  // Confirmed from a real response: GET /notifications/unread-count
  // returns { success, unreadCount }. Keeping the other fallbacks in case
  // this ever changes, but unreadCount is the real, confirmed key now.
  const unreadCount =
    unreadCountData?.unreadCount ??
    unreadCountData?.count ??
    unreadCountData?.data?.unreadCount ??
    list.filter((n: any) => !n.read && !n.readAt).length;

  // Active toast pop-up for new notifications — previously only proximity
  // alerts would naturally feel "urgent" since they're the only ones a
  // person might actively be watching for; onboard/offboard now get the
  // same immediate pop-up treatment instead of silently waiting in the
  // bell until someone happens to open it. Fires only for notifications
  // that weren't already present on a previous poll, and specifically
  // skips the very first load, so opening the app doesn't dump a toast
  // for every pre-existing unread item — only genuinely new ones.
  const seenIdsRef = useRef<Set<string | number>>(new Set());
  const firstLoadRef = useRef(true);

  useEffect(() => {
    if (!Array.isArray(notifications)) return;

    if (firstLoadRef.current) {
      for (const n of notifications) {
        if (n?.id != null) seenIdsRef.current.add(n.id);
      }
      firstLoadRef.current = false;
      return;
    }

    for (const n of notifications) {
      if (n?.id == null || seenIdsRef.current.has(n.id)) continue;
      seenIdsRef.current.add(n.id);

      const kind = detectKind(n);
      const message = `${n.title ?? "Notification"}: ${cleanMessage(n.message ?? n.body)}`;

      switch (kind) {
        case "PANIC":
          toast.error(message, { duration: 15_000 });
          break;
        case "PROXIMITY":
          toast.warning(message, { duration: 8_000 });
          break;
        case "ONBOARD":
          toast.success(message, { duration: 6_000 });
          break;
        case "OFFBOARD":
          toast(message, { duration: 6_000 });
          break;
        default:
          toast(message);
      }
    }
  }, [notifications]);

  const markReadMutation = useMutation({
    mutationFn: (id: number | string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleItemClick = (n: any) => {
    if (n.id != null && !n.read && !n.readAt) {
      markReadMutation.mutate(n.id);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative flex items-center gap-1.5 px-3 py-1 border rounded-lg text-sm hover:bg-muted transition-colors">
          <Bell className="h-4 w-4" />
          Notifications
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center">
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
            list.map((n: any, i: number) => {
              const kind = detectKind(n);
              const unread = !n.read && !n.readAt;
              return (
                <button
                  key={n.id ?? i}
                  onClick={() => handleItemClick(n)}
                  className={`w-full text-left p-3 border-b last:border-b-0 text-sm flex gap-2 hover:bg-muted/50 transition-colors ${
                    unread ? "bg-primary/5" : ""
                  }`}
                >
                  <KindIcon kind={kind} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{n.title ?? "Notification"}</p>
                      {unread && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-muted-foreground">{cleanMessage(n.message ?? n.body)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {fmt(n.sentAt ?? n.createdAt ?? n.timestamp)}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
