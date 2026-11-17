import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  MoreVertical,
  Check,
  Vote,
  Shield,
  UserPlus,
  Users,
  Wallet,
  MessageCircle,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  type NotificationItem,
} from "@/hooks/useNotifications";
import { APP_URL } from "@/lib/config";

export const Route = createFileRoute("/_authenticated/notifications/")({
  component: NotificationsPage,
});

type NotificationTab = "all" | "unread" | "party" | "election" | "social" | "other";

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<NotificationTab>("all");
  const { data, isLoading, isError, refetch } = useNotifications(1, 50);

  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const deleteMutation = useDeleteNotification();

  const notifications = data?.notifications || [];
  const unreadCount = data?.unread_count ?? 0;

  // Filter items according to the active tab
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const isUnread = !item.read_at;
      if (activeTab === "unread") return isUnread;
      if (activeTab === "party") return item.category === "party";
      if (activeTab === "election") return item.category === "election";
      if (activeTab === "social") return item.category === "social";
      if (activeTab === "other") return ["wallet", "system", "security", "campaign"].includes(item.category);
      return true;
    });
  }, [notifications, activeTab]);

  // Group items by relative timeframe (Today, Yesterday, Earlier)
  const groupedSections = useMemo(() => {
    const groups: { title: string; items: NotificationItem[] }[] = [
      { title: "Today", items: [] },
      { title: "Yesterday", items: [] },
      { title: "Earlier", items: [] },
    ];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    for (const item of filteredNotifications) {
      const itemTime = new Date(item.created_at).getTime();
      if (itemTime >= startOfToday) {
        groups[0].items.push(item);
      } else if (itemTime >= startOfYesterday) {
        groups[1].items.push(item);
      } else {
        groups[2].items.push(item);
      }
    }

    return groups.filter((g) => g.items.length > 0);
  }, [filteredNotifications]);

  const handleMarkAllRead = () => {
    if (unreadCount > 0 && !markAllReadMutation.isPending) {
      markAllReadMutation.mutate();
    }
  };

  return (
    <div className="flex-1 px-4 pb-12 pt-6 md:px-10 md:pt-8 min-h-screen bg-neutral-50/50 dark:bg-neutral-950/40">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200/80 dark:border-neutral-800 pb-5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e44b77]/10 text-[#e44b77] border border-[#e44b77]/20">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={unreadCount === 0 || markAllReadMutation.isPending}
              onClick={handleMarkAllRead}
              className="gap-2 text-xs font-medium border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCheck className="size-3.5 text-neutral-500" />
              )}
              Mark all as read
            </Button>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-neutral-200/60 dark:border-neutral-800/80">
          {(
            [
              { id: "all", label: "All" },
              { id: "unread", label: `Unread (${unreadCount})` },
              { id: "party", label: "Party" },
              { id: "election", label: "Elections" },
              { id: "social", label: "Social" },
              { id: "other", label: "System & Wallet" },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3.5 py-2 text-xs md:text-sm font-medium rounded-lg whitespace-nowrap transition-colors duration-150 cursor-pointer",
                  isActive
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900/60"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        {isLoading ? (
          <NotificationSkeletons />
        ) : isError ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <AlertTriangle className="size-8 mx-auto text-amber-500 mb-2" />
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Failed to load notifications
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-4 text-xs"
            >
              Retry
            </Button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <EmptyNotificationState activeTab={activeTab} />
        ) : (
          <div className="space-y-7">
            {groupedSections.map((section) => (
              <section key={section.title} className="space-y-3">
                <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  {section.title}
                </h2>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <NotificationRow
                      key={item.id}
                      item={item}
                      onMarkRead={() => markReadMutation.mutate(item.id)}
                      onDelete={() => deleteMutation.mutate(item.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationRow({
  item,
  onMarkRead,
  onDelete,
}: {
  item: NotificationItem;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const isUnread = !item.read_at;
  const timeAgo = formatTimeAgo(item.created_at);
  const { title, details, actionUrl, actionLabel, icon: IconComponent, iconBg, iconColor } =
    formatNotificationContent(item);

  const actorName =
    item.actor_first_name || item.actor_last_name
      ? `${item.actor_first_name || ""} ${item.actor_last_name || ""}`.trim()
      : item.actor_username || "A member";

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3.5 rounded-xl border p-4 transition-all duration-200",
        isUnread
          ? "bg-white dark:bg-neutral-900 border-[#e44b77]/20 dark:border-[#e44b77]/30 shadow-xs"
          : "bg-white/70 dark:bg-neutral-900/60 border-neutral-200/70 dark:border-neutral-800/70 hover:bg-white dark:hover:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700"
      )}
    >
      {/* Avatar or Event Category Icon */}
      <div className="relative shrink-0">
        {item.actor_avatar ? (
          <img
            src={item.actor_avatar}
            alt={actorName}
            className="size-10 rounded-full object-cover ring-2 ring-neutral-100 dark:ring-neutral-800"
          />
        ) : (
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-full text-xs font-semibold ring-2 ring-neutral-100 dark:ring-neutral-800",
              iconBg,
              iconColor
            )}
          >
            {IconComponent ? (
              <IconComponent className="size-5" />
            ) : (
              actorName.charAt(0).toUpperCase()
            )}
          </div>
        )}

        {/* Small icon badge overlay on avatar */}
        {IconComponent && item.actor_avatar && (
          <span
            className={cn(
              "absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full shadow-xs text-white",
              iconBg
            )}
          >
            <IconComponent className="size-2.5" />
          </span>
        )}
      </div>

      {/* Main Notification Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[13px] md:text-[14px] leading-snug text-neutral-800 dark:text-neutral-200">
              {item.actor_username ? (
                <Link
                  to={APP_URL.profile(item.actor_username)}
                  className="font-semibold text-neutral-950 dark:text-white hover:underline mr-1"
                >
                  {actorName}
                </Link>
              ) : (
                <span className="font-semibold text-neutral-950 dark:text-white mr-1">
                  {actorName}
                </span>
              )}
              <span className="text-neutral-600 dark:text-neutral-400">{title}</span>
            </p>

            {details && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                {details}
              </p>
            )}

            {/* Quick Action Link */}
            {actionUrl && actionLabel && (
              <div className="pt-1">
                <Link
                  to={actionUrl as any}
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  {actionLabel}
                  <ExternalLink className="size-3" />
                </Link>
              </div>
            )}
          </div>

          {/* Time & Unread Indicator */}
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-neutral-400 whitespace-nowrap">{timeAgo}</span>
            {isUnread && (
              <span
                className="size-2 rounded-full bg-[#e44b77] shrink-0"
                title="Unread"
              />
            )}

            {/* Actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Notification actions"
                  className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <MoreVertical className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl">
                {isUnread && (
                  <DropdownMenuItem onClick={onMarkRead} className="gap-2 text-xs">
                    <Check className="size-3.5 text-neutral-500" />
                    Mark as read
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={onDelete}
                  className="gap-2 text-xs text-red-600 dark:text-red-400 focus:text-red-600"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyNotificationState({ activeTab }: { activeTab: NotificationTab }) {
  const messages: Record<NotificationTab, { title: string; desc: string }> = {
    all: {
      title: "No notifications yet",
      desc: "When you receive election alerts, party updates, or social interactions, they will show up here.",
    },
    unread: {
      title: "You're all caught up!",
      desc: "There are no unread notifications at the moment.",
    },
    party: {
      title: "No party notifications",
      desc: "Updates regarding your party memberships, appointments, and activities will appear here.",
    },
    election: {
      title: "No election alerts",
      desc: "Polling unit results, nominations, and agent assignments will appear here.",
    },
    social: {
      title: "No social interactions",
      desc: "When someone follows you or replies to your posts, you will be notified here.",
    },
    other: {
      title: "No system or finance updates",
      desc: "Wallet deposits and system messages will be displayed here.",
    },
  };

  const current = messages[activeTab] || messages.all;

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80">
      <div className="size-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3 text-neutral-400">
        <Bell className="size-6" />
      </div>
      <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
        {current.title}
      </h3>
      <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mt-1">
        {current.desc}
      </p>
    </div>
  );
}

function NotificationSkeletons() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-start gap-3.5 rounded-xl border border-neutral-200/70 dark:border-neutral-800/70 bg-white dark:bg-neutral-900 p-4 animate-pulse"
        >
          <div className="size-10 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4" />
            <div className="h-3 bg-neutral-100 dark:bg-neutral-800/60 rounded w-1/2" />
          </div>
          <div className="size-3 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function formatNotificationContent(item: NotificationItem): {
  title: string;
  details?: string;
  actionUrl?: string;
  actionLabel?: string;
  icon?: any;
  iconBg: string;
  iconColor: string;
} {
  const meta = item.metadata || {};

  switch (item.type) {
    case "candidate_nominated":
      return {
        title: `was nominated as candidate for ${meta.slot || "the election"}.`,
        details: meta.election_title || meta.reason,
        icon: Vote,
        iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
        iconColor: "text-emerald-600 dark:text-emerald-400",
      };

    case "candidate_withdrawn":
      return {
        title: `candidacy withdrawn for ${meta.slot || "the election"}.`,
        details: meta.reason,
        icon: AlertTriangle,
        iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
        iconColor: "text-amber-600 dark:text-amber-400",
      };

    case "agent_application_approved":
      return {
        title: "approved your polling agent application!",
        details: meta.role ? `Role: ${meta.role}` : undefined,
        icon: Shield,
        iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
        iconColor: "text-emerald-600 dark:text-emerald-400",
      };

    case "agent_application_rejected":
      return {
        title: "updated your polling agent application status.",
        details: meta.reason ? `Reason: ${meta.reason}` : undefined,
        icon: AlertTriangle,
        iconBg: "bg-rose-500/10 dark:bg-rose-500/20",
        iconColor: "text-rose-600 dark:text-rose-400",
      };

    case "party_official_appointed":
      return {
        title: `appointed you as ${meta.position_name || "a party official"}.`,
        details: meta.chapter_name,
        icon: Sparkles,
        iconBg: "bg-purple-500/10 dark:bg-purple-500/20",
        iconColor: "text-purple-600 dark:text-purple-400",
      };

    case "party_official_vacated":
      return {
        title: `vacated appointment from ${meta.position_name || "party official"}.`,
        details: meta.reason,
        icon: Shield,
        iconBg: "bg-neutral-500/10 dark:bg-neutral-500/20",
        iconColor: "text-neutral-600 dark:text-neutral-400",
      };

    case "party_member_suspended":
      return {
        title: "suspended party membership.",
        details: meta.reason ? `Reason: ${meta.reason}` : undefined,
        icon: AlertTriangle,
        iconBg: "bg-rose-500/10 dark:bg-rose-500/20",
        iconColor: "text-rose-600 dark:text-rose-400",
      };

    case "party_member_reinstated":
      return {
        title: "reinstated your party membership.",
        icon: Shield,
        iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
        iconColor: "text-emerald-600 dark:text-emerald-400",
      };

    case "new_follower":
      return {
        title: "started following you.",
        icon: UserPlus,
        iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
        iconColor: "text-blue-600 dark:text-blue-400",
      };

    case "post_comment":
      return {
        title: "commented on your post.",
        details: meta.comment_text || meta.text,
        icon: MessageCircle,
        iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
        iconColor: "text-blue-600 dark:text-blue-400",
      };

    case "party_wallet_deposited":
      return {
        title: "deposited funds into party wallet.",
        details: meta.narration,
        icon: Wallet,
        iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
        iconColor: "text-emerald-600 dark:text-emerald-400",
      };

    case "new_member_joined":
      return {
        title: "joined the party chapter.",
        icon: Users,
        iconBg: "bg-purple-500/10 dark:bg-purple-500/20",
        iconColor: "text-purple-600 dark:text-purple-400",
      };

    default:
      return {
        title: meta.title || meta.message || "sent an update.",
        details: meta.description || meta.text || meta.reason,
        icon: Bell,
        iconBg: "bg-neutral-500/10 dark:bg-neutral-500/20",
        iconColor: "text-neutral-600 dark:text-neutral-400",
      };
  }
}

function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHrs < 24) return `${diffHrs}h`;
    if (diffDays === 1) return "1d";
    if (diffDays < 7) return `${diffDays}d`;
    return new Date(isoString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

