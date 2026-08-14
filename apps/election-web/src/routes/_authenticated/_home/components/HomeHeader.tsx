import NotificationSolidIcon from "@repo/ui/icons/navbar/notification-solid-icon";
import { AppAvatar } from "@repo/ui/components/avatar";

import { useAppContext } from "#/hooks/useAppContext";
import {
  SelectElectionGroupAndElection,
  type Election,
  type ElectionGroup,
} from "@repo/ui/components/selects/election-group-and-election-select";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getElectionsByGroup } from "#/lib/server/elections";
import { useServerFn } from "@tanstack/react-start";
import { TitleText } from "@repo/ui/components/custom/Texts";
import { cn } from "@repo/ui/lib/utils";

interface HomeHeaderProps {
  daysLeft?: number;
  avatarImage?: string;
  textClassName?: string;
  containerClassName?: string;
  onPracticeClick?: () => void;
}

export function HomeHeader({
  daysLeft,
  textClassName,
  avatarImage,
  containerClassName,
  onPracticeClick,
}: HomeHeaderProps) {
  const {
    user,
    selectedElectionGroup,
    selectedElection,
    setSelectedElectionGroup,
    setSelectedElection,
  } = useAppContext();
  const fetchGroups = useServerFn(getElectionGroups);
  const fetchElectionsByGroup = useServerFn(getElectionsByGroup);

  const interceptClick = (e: React.MouseEvent, action?: () => void) => {
    if (onPracticeClick) {
      e.preventDefault();
      e.stopPropagation();
      onPracticeClick();
      return;
    }
    if (action) action();
  };

  return (
    <header
      className={cn(
        "flex items-center justify-between w-full gap-2 pt-7 pb-2 px-4",
        containerClassName,
      )}
    >
      {/* Left section: Dropdown Selector */}
      <div className="flex items-center gap-2 flex-1">
        <AppAvatar
          src={avatarImage ?? user?.avatar}
          alt={user?.first_name || "User"}
          className="size-7 shrink-0"
        />
        <div
          className="flex-1 min-w-0 sm:max-w-[180px]"
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
            fetchElectionsByGroup={fetchElectionsByGroup}
            selectedId={selectedElectionGroup?.id}
            update={(group) => setSelectedElectionGroup(group)}
            partyId={user?.party?.id ?? user?.party_id}
            onElectionSelect={(group: ElectionGroup, election: Election) => {
              setSelectedElectionGroup(group);
              setSelectedElection(election);
            }}
            className={`border-none ring-0 text-sm shadow-none bg-transparent hover:bg-transparent px-0 font-semibold p-0 h-auto ${textClassName || "text-c-900"}`}
          />
        </div>
      </div>
      {/* Right section: Countdown & Notifications */}
      <div className="flex items-center gap-3 shrink-0">
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
        <div
          className="relative cursor-pointer p-1"
          onClick={(e) => interceptClick(e)}
        >
          <NotificationSolidIcon
            className={`size-7 transition ${textClassName || "text-neutral-950 hover:text-neutral-800"}`}
          />
          {/* Red notification badge */}
          <div className="absolute -top-1 -right-1 bg-red text-white text-sm font-medium rounded-lg px-1 min-w-6 h-5 flex items-center justify-center border-background">
            3
          </div>
        </div>
      </div>
    </header>
  );
}

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
