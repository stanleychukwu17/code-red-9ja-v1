import { HeaderAccent } from "@repo/ui/components/header-accent";
import { VacantPositionAvatar } from "@repo/ui/components/vacant-avatar";
import { Skeleton } from "@repo/ui/components/skeleton";
import type { PartyLeader } from "./types";

type PartyLeadersCardProps = {
  title?: string;
  leaders?: PartyLeader[];
  isLoading?: boolean;
  href?: string;
};

export function PartyLeadersCard({
  title = "National leaders",
  leaders = [],
  isLoading = false,
  href,
}: PartyLeadersCardProps) {
  // Ensure we display 3 slots
  const slots: (PartyLeader | null)[] = isLoading
    ? [null, null, null]
    : leaders.length > 0
      ? leaders.slice(0, 3)
      : [null, null, null];

  return (
    <div className="space-y-4">
      {/* Header with underline accent mark & optional navigation arrow */}
      <HeaderAccent
        as="div"
        title={title}
        titleClassName="text-base sm:text-xl font-bold tracking-wide text-foreground"
        href={href}
      />

      {/* Card container */}
      <div className="bg-sidebar-mobile/50 rounded-[50px] p-6 sm:p-8">
        <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center">
          {slots.map((leader, idx) => {
            if (isLoading || !leader) {
              return (
                <div key={`leader-skeleton-${idx}`} className="flex flex-col items-center">
                  <Skeleton className="size-16 sm:size-20 md:size-35 rounded-full" />
                  <Skeleton className="mt-3 h-4 w-16 sm:w-20 rounded" />
                  <Skeleton className="mt-1.5 h-3 w-12 sm:w-16 rounded" />
                </div>
              );
            }

            const isVacant = leader.isVacant ?? leader.is_vacant ?? !leader.avatar;

            return (
              <div key={`${leader.id || "leader"}-${idx}`} className="flex flex-col items-center group">
                <div className="size-16 sm:size-20 md:size-35 rounded-full overflow-hidden bg-muted shadow-xs transition-transform duration-300 group-hover:scale-105 flex items-center justify-center shrink-0">
                  {isVacant ? (
                    <VacantPositionAvatar className="size-full rounded-full" />
                  ) : (
                    <img
                      src={leader.avatar || ""}
                      alt={leader.name || leader.role}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <span className="mt-3 text-xs sm:text-sm font-bold text-foreground line-clamp-1">
                  {leader.role}
                </span>
                <span
                  className={`text-[10px] sm:text-[11px] mt-0.5 line-clamp-1 ${isVacant ? "text-muted-foreground/70 italic" : "text-muted-foreground font-medium"
                    }`}
                >
                  {isVacant ? "Unassigned" : leader.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
