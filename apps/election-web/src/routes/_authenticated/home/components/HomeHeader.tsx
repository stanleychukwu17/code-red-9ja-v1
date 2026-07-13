import NotificationSolidIcon from "@repo/ui/icons/navbar/notification-solid-icon";
import { AppAvatar } from "@repo/ui/components/avatar";

import { useAuth } from "#/hooks/useAuth";
import {
  SelectElectionGroupAndElection,
  type Election,
  type ElectionGroup,
} from "@repo/ui/components/selects/election-group-and-election-select";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getElectionsByGroup } from "#/lib/server/elections";
import { useServerFn } from "@tanstack/react-start";
import { TitleText } from "@repo/ui/components/custom/Texts";

interface HomeHeaderProps {
  daysLeft?: number;
}

export function HomeHeader({ daysLeft }: HomeHeaderProps) {
  const {
    user,
    selectedElectionGroup,
    setSelectedElectionGroup,
    setSelectedElection,
  } = useAuth();
  console.log({ selectedElectionGroup });
  const fetchGroups = useServerFn(getElectionGroups);
  const fetchElectionsByGroup = useServerFn(getElectionsByGroup);

  return (
    <header className="flex items-center justify-between w-full gap-2 pt-7 pb-2 px-4">
      {/* Left section: Dropdown Selector */}
      <div className="flex items-center gap-2 flex-1">
        <AppAvatar
          src={user?.avatar}
          alt={user?.first_name || "User"}
          className="size-7 shrink-0"
        />
        <div className="flex-1 min-w-0 sm:max-w-[180px]">
          <SelectElectionGroupAndElection
            fetchElectionGroups={fetchGroups}
            fetchElectionsByGroup={fetchElectionsByGroup}
            selectedId={selectedElectionGroup?.id}
            update={(group) => setSelectedElectionGroup(group)}
            onElectionSelect={(group: ElectionGroup, election: Election) => {
              setSelectedElectionGroup(group);
              setSelectedElection(election);
            }}
            className="border-none shadow-none bg-transparent hover:bg-transparent px-0 font-semibold text-c-900 p-0 h-auto"
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
        <div className="relative cursor-pointer p-1">
          <NotificationSolidIcon className="size-7 text-neutral-950 hover:text-neutral-800 transition" />
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
