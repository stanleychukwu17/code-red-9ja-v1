import { Link } from "@tanstack/react-router";
import { cn } from "@repo/ui/lib/utils";
import { HeaderAccent } from "@repo/ui/components/header-accent";
import { AppAvatar } from "@repo/ui/components/avatar";

export type CampaignGroupActivityItem = {
  id: string | number;
  userName: string;
  userAvatar?: string | null;
  actionText: string;
  message: string;
  postUrl?: string;
  createdAt?: string;
};

export type CampaignGroupActivitiesProps = {
  partyId?: string | number;
  groupId?: string | number;
  activities?: CampaignGroupActivityItem[];
  isLoading?: boolean;
  className?: string;
};

const DEFAULT_ACTIVITIES: CampaignGroupActivityItem[] = [
  {
    id: "act-1",
    userName: "Tony spark",
    userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop",
    actionText: "Commented on anayo post",
    message:
      "i love the way you people are talking about these things i who are the ones that will pay for the local campaign because alhaji is not responding",
    postUrl: "#",
  },
  {
    id: "act-2",
    userName: "Tony spark",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop",
    actionText: "Commented on anayo post",
    message:
      "i love the way you people are talking about these things i who are the ones that will pay for the local campaign because alhaji is not responding",
    postUrl: "#",
  },
  {
    id: "act-3",
    userName: "Tony spark",
    userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop",
    actionText: "Commented on anayo post",
    message:
      "i love the way you people are talking about these things i who are the ones that will pay for the local campaign because alhaji is not responding",
    postUrl: "#",
  },
];

export function CampaignGroupActivities({
  activities,
  isLoading,
  className,
}: CampaignGroupActivitiesProps) {
  const displayActivities = activities && activities.length > 0 ? activities : DEFAULT_ACTIVITIES;

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Title with accent underline */}
      <div>
        <HeaderAccent
          as="h3"
          title="Activities"
          titleClassName="text-xl sm:text-2xl font-bold tracking-tight text-foreground"
          accentClassName="top-3 sm:top-5 h-3.5 w-32"
        />
      </div>

      {/* Card Container */}
      <div className="rounded-3xl bg-[#f8f9fc] dark:bg-card/50 border border-slate-100 dark:border-border/60 p-5 sm:p-6 space-y-5 shadow-xs">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Loading activities...
          </div>
        ) : displayActivities.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            No recent activity recorded yet.
          </div>
        ) : (
          displayActivities.map((activity) => (
            <div
              key={activity.id}
              className="pb-5 border-b border-border/40 space-y-2"
            >
              <div className="flex items-start gap-3.5 sm:gap-4">
                <AppAvatar
                  src={activity.userAvatar || undefined}
                  alt={activity.userName}
                  className="size-11 sm:size-12 rounded-full shrink-0 ring-2 ring-background"
                />

                <div className="flex-1 min-w-0">
                  {/* Name and See Post link */}
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-sm sm:text-base text-foreground tracking-tight truncate">
                      {activity.userName}
                    </h4>

                    <Link
                      to={(activity.postUrl || "#") as any}
                      className="text-xs sm:text-sm font-semibold text-blue-500 hover:text-blue-600 dark:text-blue-400 inline-flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <span>see post</span>
                      <span>→</span>
                    </Link>
                  </div>

                  {/* Context subtitle */}
                  <p className="text-[11px] sm:text-xs text-muted-foreground font-medium mt-0.5">
                    {activity.actionText}
                  </p>

                  {/* Comment/Activity Body */}
                  <p className="text-xs sm:text-[13px] text-foreground/80 leading-relaxed mt-2 font-normal">
                    {activity.message}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

