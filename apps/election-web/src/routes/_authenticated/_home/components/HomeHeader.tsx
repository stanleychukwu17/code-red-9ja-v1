import { AppAvatar } from "@repo/ui/components/avatar";
import { useSidebar } from "@repo/ui/components/sidebar";

import { useUser } from "#/hooks/useUser";
import { useElection } from "#/hooks/useElection";
import { SelectElectionGroupAndElection } from "@repo/ui/components/selects/election-group-and-election-select";
import { getElectionGroups } from "#/lib/server/election_groups";
import { useServerFn } from "@tanstack/react-start";
import { TitleText } from "@repo/ui/components/custom/Texts";
import { cn } from "@repo/ui/lib/utils";

interface HomeHeaderProps {
  /** Days remaining until scheduled election day */
  daysLeft?: number;
  /** Custom avatar image URL override */
  avatarImage?: string;
  /** Custom CSS classes for text elements */
  textClassName?: string;
  /** Custom CSS classes for the header container */
  containerClassName?: string;
  /** Optional practice simulation click interceptor */
  onPracticeClick?: () => void;
}

/**
 * Main Top Navigation Header for Dashboard.
 *
 * Rendered across all role home dashboards:
 * - Left: User/Agent profile avatar and inline election selector dropdown (`SelectElectionGroupAndElection`).
 * - Right: Real-time election status badge ("LIVE" pulsing badge on election day vs "X days left" countdown)
 *   and notification bell with unread count badge.
 */
export function HomeHeader({ daysLeft, textClassName, avatarImage, containerClassName, onPracticeClick }: HomeHeaderProps) {
  const user = useUser();
  const sidebar = useSidebar();
  const isMobile = sidebar?.isMobile ?? false;
  const setOpenMobile = sidebar?.setOpenMobile ?? (() => { });
  const { selectedElectionGroup, setSelectedElectionGroup } = useElection();
  const fetchGroups = useServerFn(getElectionGroups);

  return (
    <header
      className={cn(
        "flex items-center justify-between w-full gap-2 pt-7 pb-2 px-4",
        containerClassName,
      )}
    >
      {/* Left section: Avatar & Election Group/Ballot Dropdown Selector */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className={cn(
            "shrink-0",
            isMobile && "cursor-pointer hover:opacity-80 active:scale-95 transition",
          )}
          onClick={(e) => {
            if (onPracticeClick) {
              e.preventDefault();
              e.stopPropagation();
              onPracticeClick();
              return;
            }

            // Open the mobile sidebar when tapping the avatar (skipped above if practice mode intercepts)
            if (isMobile) {
              setOpenMobile(true);
            }
          }}
        >
          <AppAvatar
            src={avatarImage ?? user?.avatar}
            alt={user?.first_name || "User"}
            className="size-7"
          />
        </div>
        <div
          className="flex-1 min-w-0 sm:max-w-xs md:max-w-sm"
          onClickCapture={(e) => {
            if (onPracticeClick) {
              e.preventDefault();
              e.stopPropagation();
              onPracticeClick();
            }
          }}
        >
          <SelectElectionGroupAndElection
            fetchElectionGroups={fetchGroups}
            queryKey={["election-groups"]}
            queryParams={{ limit: 50 }}
            selectedId={selectedElectionGroup?.id}
            selectedItem={selectedElectionGroup}
            update={(group) => setSelectedElectionGroup(group)}
            className={`border-none ring-0 text-sm shadow-none bg-transparent hover:bg-transparent px-0 font-semibold p-0 h-auto ${textClassName || "text-c-900"}`}
          />
        </div>
      </div>

      {/* Right section: Countdown Badge & Notification Bell */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Pulsing LIVE tag on election day, or remaining days countdown */}
        {daysLeft !== undefined &&
          (daysLeft === 0 ? (
            <span className="text-blue-500 text-sm font-bold animate-pulse">
              LIVE
            </span>
          ) : (
            <span className="text-[#c59e35] text-sm font-bold animate-pulse">
              {daysLeft} {daysLeft === 1 ? "day" : "days"} left
            </span>
          ))}
      </div>
    </header>
  );
}

/**
 * Secondary Section Subheader.
 *
 * Displays the active carousel card title (e.g. "Objectives", "Readiness")
 * alongside the right-aligned metric or completion percentage.
 */
export function HomeHeader2({
  title,
  rightText,
}: {
  title: string;
  rightText: string;
}) {
  return (
    <div className="flex items-center justify-between mb-2 px-4">
      <TitleText text={title} size="xs" />
      <p className="text-c-80 font-bold text-90">{rightText}</p>
    </div>
  );
}
