import NotificationSolidIcon from "@repo/ui/icons/navbar/notification-solid-icon";
import { useAuth } from "#/hooks/useAuth";
import {
  SelectElectionGroupAndElection,
  type Election,
  type ElectionGroup,
} from "@repo/ui/components/selects/election-group-and-election-select";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getElectionsByGroup } from "#/lib/server/elections";
import { useServerFn } from "@tanstack/react-start";
import TentIcon from "../../../../assets/images/logo.png"; // Just guessing standard fallback

interface SupervisorHeaderProps {
  daysLeft?: number;
  percentage?: number;
  title?: string;
}

export function SupervisorHeader({ daysLeft = 0, percentage = 22, title = "Objectives" }: SupervisorHeaderProps) {
  const {
    selectedElectionGroup,
    setSelectedElectionGroup,
    setSelectedElection,
  } = useAuth();
  
  const fetchGroups = useServerFn(getElectionGroups);
  const fetchElectionsByGroup = useServerFn(getElectionsByGroup);

  return (
    <header className="flex flex-col w-full gap-4 pt-7 pb-2">
      <div className="flex items-center justify-between w-full">
        {/* Left section: Dropdown Selector */}
        <div className="flex items-center gap-2 flex-1">
          <img src="/logo.svg" alt="logo" className="w-6 h-6 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
          <div className="w-[180px]">
            <SelectElectionGroupAndElection
              fetchElectionGroups={fetchGroups}
              fetchElectionsByGroup={fetchElectionsByGroup}
              selectedId={selectedElectionGroup?.id}
              update={(group) => setSelectedElectionGroup(group)}
              onElectionSelect={(group: ElectionGroup, election: Election) => {
                setSelectedElectionGroup(group);
                setSelectedElection(election);
              }}
              className="border-none shadow-none bg-transparent hover:bg-transparent px-0 font-semibold text-c-900 p-0 h-auto text-sm"
            />
          </div>
        </div>
        {/* Right section: Countdown & Notifications */}
        <div className="flex items-center gap-3 shrink-0">
          {daysLeft === 0 ? (
            <span className="text-[#8B5CF6] text-xs font-bold animate-pulse tracking-wide uppercase">
              LIVE
            </span>
          ) : null}
          <div className="relative cursor-pointer">
            <NotificationSolidIcon className="size-6 text-c-900" />
            <div className="absolute -top-1 -right-1 bg-[#F43F5E] text-white text-[10px] font-bold size-4 flex items-center justify-center rounded-full border border-white">
              3
            </div>
          </div>
        </div>
      </div>
      
      {/* Title Row */}
      <div className="flex items-center justify-between w-full">
        <h1 className="text-[22px] font-bold text-[#1F3D30] tracking-tight">{title}</h1>
        {percentage !== undefined && (
          <span className="text-[20px] font-bold text-[#166534]">{percentage}%</span>
        )}
      </div>
    </header>
  );
}
