import { useParams } from "@tanstack/react-router";
import { useUserParty } from "#/hooks/useUserParty";
import { useElection } from "#/hooks/useElection";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getElectionsByGroup } from "#/lib/server/elections";
import { useServerFn } from "@tanstack/react-start";
import {
  SelectElectionGroupAndElection,
  type Election,
  type ElectionGroup,
} from "@repo/ui/components/selects/election-group-and-election-select";
import { HeaderTabs } from "@repo/ui/components/custom/AdminLayouts";
import { APP_URL } from "#/lib/config";
import { ResultModeToggle } from "./components/-result-mode-toggle";

/**
 * HomePageHeader Component
 *
 * Sticky header toolbar displayed across party dashboard routes:
 * 1. Mode Tabs: Switches between the primary readiness dashboard ("Main") and the real-time "Election day" war room.
 * 2. Election Contest Selector: Two-tier dropdown to switch between election cycles (e.g. 2027 General Elections)
 *    and specific contests (Presidential, Governorship, etc.).
 * 3. Live/Final Result Toggle: Appears conditionally during active election day to toggle live agent tallies vs certified collation.
 */
export function HomePageHeader({
  activeTab,
}: {
  /** The currently active dashboard tab identifier */
  activeTab: "main" | "readiness" | "election-day";
}) {
  const { partyShortName } = useParams({ strict: false });
  const { party } = useUserParty();
  const {
    selectedElectionGroup,
    setSelectedElectionGroup,
    setSelectedElection,
    isLive,
    setIsLive,
    electionDay,
  } = useElection();
  const partyId = party?.id;

  const fetchGroups = useServerFn(getElectionGroups);
  const fetchElectionsByGroup = useServerFn(getElectionsByGroup);

  const tabs = [
    {
      id: "main",
      label: "Main",
      href: APP_URL.partyRoutes.home((partyShortName as string) || "party"),
    },
    {
      id: "election-day",
      label: "Election day",
      href: `${APP_URL.partyRoutes.home((partyShortName as string) || "party")}/election-day`,
    },
  ];

  return (
    <div className="flex items-center justify-between gap-4 pt-5">
      <HeaderTabs activeTab={activeTab} tabs={tabs} />

      <div className="flex items-center gap-4">
        {/* isLive toggle — only shown on election day */}
        {electionDay && (
          <ResultModeToggle isLive={isLive} setIsLive={setIsLive} />
        )}
        <SelectElectionGroupAndElection
          fetchElectionGroups={fetchGroups}
          fetchElectionsByGroup={fetchElectionsByGroup}
          selectedId={selectedElectionGroup?.id}
          update={(group) => setSelectedElectionGroup(group)}
          onElectionSelect={(group: ElectionGroup, election: Election) => {
            setSelectedElectionGroup(group);
            setSelectedElection(election);
          }}
          partyId={partyId}
        />
      </div>
    </div>
  );
}
