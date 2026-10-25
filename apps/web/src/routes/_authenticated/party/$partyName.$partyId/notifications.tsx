import React, { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  CheckCheck,
  Search,
  Filter,
  UserPlus,
  Crown,
  Vote,
  ShieldAlert,
  Wallet,
  Megaphone,
  AlertTriangle,
  Flag,
  Calendar,
  Clock,
  ChevronRight,
  Sparkles,
  Check,
  Layers,
  CircleAlert,
  BadgeAlert,
  Eye,
} from "lucide-react";
import { Input } from "@repo/ui/components/input";

export const Route = createFileRoute(
  "/_authenticated/party/$partyName/$partyId/notifications",
)({
  component: PartyNotificationsTabComponent,
});

// Category and Priority types aligning with backend constants
export type PartyNotificationCategory =
  | "all"
  | "membership"
  | "election_ops"
  | "agent_recruitment"
  | "finance"
  | "campaign"
  | "system";

export type NotificationPriority = "urgent" | "high" | "normal" | "low";

export interface PartyNotificationItem {
  id: string;
  category: "membership" | "election_ops" | "agent_recruitment" | "finance" | "campaign" | "system";
  type: string;
  priority: NotificationPriority;
  title: string;
  description: string;
  timeAgo: string;
  isRead: boolean;
  eventCount?: number;
  actor?: {
    name: string;
    avatar?: string;
    role?: string;
  };
  metadata?: {
    chapterName?: string;
    chapterLevel?: string;
    positionTitle?: string;
    electionTitle?: string;
    amount?: string;
    reason?: string;
  };
  actionUrl?: string;
  actionLabel?: string;
}

// Realistic sample notifications matching the Go backend event triggers & rollups
const INITIAL_PARTY_NOTIFICATIONS: PartyNotificationItem[] = [
  {
    id: "notif-1",
    category: "election_ops",
    type: "candidate_nominated",
    priority: "urgent",
    title: "Gubernatorial Candidate Officially Fielded",
    description: "The National Working Committee approved and accredited the primary candidate for the upcoming 2027 Lagos State Governorship Election.",
    timeAgo: "15m ago",
    isRead: false,
    actor: {
      name: "Dr. Oladipo Adeleke",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop",
      role: "Fielded Candidate",
    },
    metadata: {
      chapterName: "Lagos State Chapter",
      chapterLevel: "State",
      electionTitle: "2027 Governorship Election",
    },
    actionLabel: "View Candidate Details",
  },
  {
    id: "notif-2",
    category: "membership",
    type: "new_member_joined",
    priority: "normal",
    title: "18 New Verified Members Joined",
    description: "Daily rollup: 18 eligible citizens completed online chapter verification and received party membership credential cards.",
    timeAgo: "1h ago",
    isRead: false,
    eventCount: 18,
    metadata: {
      chapterName: "Ikeja LGA Chapter",
      chapterLevel: "LGA",
    },
    actionLabel: "View Member Roster",
  },
  {
    id: "notif-3",
    category: "membership",
    type: "party_official_appointed",
    priority: "high",
    title: "New Deputy State Chairman Appointed",
    description: "Adejoke Martins Otse was ratified and assigned as the active Deputy State Chairman following state congress executive resolution.",
    timeAgo: "3h ago",
    isRead: false,
    actor: {
      name: "Adejoke Martins Otse",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&auto=format&fit=crop",
      role: "Deputy State Chairman",
    },
    metadata: {
      chapterName: "Lagos State Executive",
      chapterLevel: "State",
      positionTitle: "Deputy Chairman",
    },
    actionLabel: "View Leadership Structure",
  },
  {
    id: "notif-4",
    category: "agent_recruitment",
    type: "agent_application_approved",
    priority: "normal",
    title: "35 Polling Unit Agents Verified & Approved",
    description: "Accredited polling agent applications for Alimosho LGA have completed BVAS training and passed security vetting.",
    timeAgo: "6h ago",
    isRead: true,
    metadata: {
      chapterName: "Alimosho LGA",
      chapterLevel: "LGA",
    },
    actionLabel: "Manage Field Agents",
  },
  {
    id: "notif-5",
    category: "finance",
    type: "agent_payout_credited",
    priority: "normal",
    title: "Chapter Mobilization Fund Disbursed",
    description: "Operational logistics allowance and voter mobilization stipends have been successfully credited to the local ward treasuries.",
    timeAgo: "1d ago",
    isRead: true,
    metadata: {
      amount: "₦1,500,000",
      chapterName: "Ward 04 Executive Council",
      chapterLevel: "Ward",
    },
    actionLabel: "View Ledger Transaction",
  },
  {
    id: "notif-6",
    category: "election_ops",
    type: "pu_result_flagged",
    priority: "urgent",
    title: "Result Anomaly Flagged at Polling Unit 024",
    description: "Observer app telemetry detected an EC8A tally discrepancy requiring immediate collation supervisor attention and legal log review.",
    timeAgo: "2d ago",
    isRead: true,
    metadata: {
      chapterName: "Surulere LGA",
      chapterLevel: "LGA",
    },
    actionLabel: "Review Incident Report",
  },
  {
    id: "notif-7",
    category: "campaign",
    type: "campaign_rally_broadcast",
    priority: "normal",
    title: "Zonal Grassroots Townhall Scheduled",
    description: "Official advisory issued for the South-West Zonal Campaign Townhall taking place next Saturday at the Civic Event Center.",
    timeAgo: "3d ago",
    isRead: true,
    metadata: {
      chapterName: "South-West Zonal Chapter",
      chapterLevel: "Zonal",
    },
    actionLabel: "View Event Schedule",
  },
];

function PartyNotificationsTabComponent() {
  const { partyName } = Route.useParams();

  // State management for notifications
  const [notifications, setNotifications] = useState<PartyNotificationItem[]>(
    INITIAL_PARTY_NOTIFICATIONS
  );
  const [selectedCategory, setSelectedCategory] = useState<PartyNotificationCategory>("all");
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Categories configuration with icons
  const categories: { id: PartyNotificationCategory; label: string; icon: typeof Bell }[] = [
    { id: "all", label: "All Activity", icon: Bell },
    { id: "membership", label: "Membership", icon: UserPlus },
    { id: "election_ops", label: "Election Ops", icon: Vote },
    { id: "agent_recruitment", label: "Agent Corps", icon: Flag },
    { id: "finance", label: "Finance & Dues", icon: Wallet },
    { id: "campaign", label: "Campaigns", icon: Megaphone },
  ];

  // Calculate unread count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // Mark a single notification as read
  const handleToggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: !item.isRead } : item))
    );
  };

  // Mark all notifications as read
  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
  };

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // Category filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }

      // Unread only filter
      if (unreadOnly && item.isRead) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesChapter = item.metadata?.chapterName?.toLowerCase().includes(query) ?? false;
        return matchesTitle || matchesDesc || matchesChapter;
      }

      return true;
    });
  }, [notifications, selectedCategory, unreadOnly, searchQuery]);

  // Priority badge helper
  const getPriorityBadge = (priority: NotificationPriority) => {
    switch (priority) {
      case "urgent":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            <CircleAlert className="size-3" />
            Urgent
          </span>
        );
      case "high":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="size-3" />
            High
          </span>
        );
      default:
        return null;
    }
  };

  // Category visual icon & color style helper
  const getCategoryIconInfo = (category: PartyNotificationCategory) => {
    switch (category) {
      case "membership":
        return {
          icon: UserPlus,
          bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        };
      case "election_ops":
        return {
          icon: Vote,
          bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        };
      case "agent_recruitment":
        return {
          icon: Flag,
          bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
        };
      case "finance":
        return {
          icon: Wallet,
          bg: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
        };
      case "campaign":
        return {
          icon: Megaphone,
          bg: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
        };
      default:
        return {
          icon: Bell,
          bg: "bg-primary/10 text-primary border-primary/20",
        };
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {partyName.toUpperCase()} Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-xs animate-pulse">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time activity feed, official appointments, candidate fieldings, and chapter notices.
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-card border border-border/80 hover:bg-muted text-foreground transition-all cursor-pointer shadow-xs"
            >
              <CheckCheck className="size-3.5 text-primary" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-card border border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search Bar & Unread Filter Switch */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications by title, keyword, or chapter..."
            className="pl-10 h-10 bg-card border-border/60 rounded-xl text-sm"
          />
        </div>

        {/* Unread Only Pill Button */}
        <button
          type="button"
          onClick={() => setUnreadOnly((prev) => !prev)}
          className={`inline-flex items-center justify-center gap-2 px-4 h-10 rounded-xl text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
            unreadOnly
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-card border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <span
            className={`size-2 rounded-full transition-colors ${
              unreadOnly ? "bg-primary" : "bg-muted-foreground/40"
            }`}
          />
          <span>Unread Only</span>
        </button>
      </div>

      {/* Notification List Cards */}
      {filteredNotifications.length > 0 ? (
        <div className="space-y-3">
          {filteredNotifications.map((item) => {
            const { icon: CatIcon, bg: catBg } = getCategoryIconInfo(item.category);

            return (
              <div
                key={item.id}
                className={`relative rounded-2xl border transition-all duration-200 p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-4 ${
                  item.isRead
                    ? "bg-card/70 border-border/50 opacity-90 hover:opacity-100 hover:border-border"
                    : "bg-card border-primary/30 shadow-xs hover:border-primary/50"
                }`}
              >
                {/* Left Visual: Actor Avatar or Category Badge */}
                <div className="relative shrink-0">
                  {item.actor?.avatar ? (
                    <div className="size-11 sm:size-12 rounded-full overflow-hidden border-2 border-border/80 bg-muted shrink-0">
                      <img
                        src={item.actor.avatar}
                        alt={item.actor.name}
                        className="size-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className={`size-11 sm:size-12 rounded-2xl border flex items-center justify-center shrink-0 ${catBg}`}
                    >
                      <CatIcon className="size-5" />
                    </div>
                  )}

                  {/* Unread indicator dot */}
                  {!item.isRead && (
                    <span className="absolute -top-1 -right-1 size-3 bg-primary rounded-full ring-2 ring-card" />
                  )}
                </div>

                {/* Main Content Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Header Row: Title, Category, Priority, and Timestamp */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm sm:text-base font-bold text-foreground">
                        {item.title}
                      </h4>
                      {getPriorityBadge(item.priority)}
                    </div>

                    <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1 shrink-0">
                      <Clock className="size-3" />
                      {item.timeAgo}
                    </span>
                  </div>

                  {/* Notification Description */}
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>

                  {/* Metadata Tags Row */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {item.metadata?.chapterName && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-muted text-muted-foreground">
                        <Layers className="size-3" />
                        {item.metadata.chapterName}
                      </span>
                    )}

                    {item.metadata?.positionTitle && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-muted text-muted-foreground">
                        <Crown className="size-3 text-amber-500" />
                        {item.metadata.positionTitle}
                      </span>
                    )}

                    {item.metadata?.electionTitle && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-muted text-muted-foreground">
                        <Vote className="size-3 text-blue-500" />
                        {item.metadata.electionTitle}
                      </span>
                    )}

                    {item.metadata?.amount && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Wallet className="size-3" />
                        {item.metadata.amount}
                      </span>
                    )}

                    {item.eventCount && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-primary/10 text-primary">
                        +{item.eventCount} members
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 shrink-0">
                  {item.actionLabel && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground transition-colors cursor-pointer"
                    >
                      <span>{item.actionLabel}</span>
                      <ChevronRight className="size-3" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleToggleRead(item.id)}
                    title={item.isRead ? "Mark as unread" : "Mark as read"}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 px-2 py-1 transition-colors cursor-pointer"
                  >
                    <Check className={`size-3.5 ${item.isRead ? "text-primary" : "text-muted-foreground/60"}`} />
                    <span className="text-[11px]">{item.isRead ? "Read" : "Mark read"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-3xl border border-dashed border-border/80 bg-card/40 p-10 sm:p-14 text-center">
          <div className="mx-auto size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
            <Bell className="size-7" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            No Notifications Found
          </h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            {unreadOnly
              ? "You have no unread notifications matching your current filters."
              : "There are no notifications in this category yet. Check back soon for official party updates."}
          </p>
        </div>
      )}
    </div>
  );
}
