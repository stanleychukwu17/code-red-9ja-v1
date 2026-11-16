import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Users, UserCheck, ShieldCheck, UserCog, Phone } from "lucide-react";
import { ScrollableNavTabs, type ScrollableTabItem } from "@repo/ui/components/custom/ScrollableNavTabs";
import { TeamRoleBadge, type TeamRoleType } from "@repo/ui/components/custom/team-role-badge";
import { AppAvatar } from "@repo/ui/components/avatar";
import { SelectState, type State } from "@repo/ui/components/selects/state-select";
import { SelectLga, type Lga } from "@repo/ui/components/selects/lga-select";
import { SelectWard, type Ward } from "@repo/ui/components/selects/ward-select";
import { SelectPollingUnit, type PollingUnit } from "@repo/ui/components/selects/polling-unit-select";
import { getStates } from "#/lib/server/states";
import { getLGAs } from "#/lib/server/countries";
import { getWards } from "#/lib/server/wards";
import { getPollingUnits } from "#/lib/server/polling_units";
import { PageHeader } from "#/components/Headers";
import { getPageHeader } from "#/lib/shared/meta";
import { useAssignments } from "#/hooks/useAssignments";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTeamMembers } from "#/lib/server/team";

export const Route = createFileRoute("/_authenticated/team/")({
  head: () => getPageHeader({ title: "Your Team" }),
  component: TeamPage,
});

const TEAM_TABS = [
  { id: "polling_agent", label: "PU agents", icon: UserCheck },
  { id: "ward_election_supervisor", label: "Ward supervisors", icon: ShieldCheck },
  { id: "lga_election_supervisor", label: "LGA supervisors", icon: ShieldCheck },
  { id: "state_election_supervisor", label: "State supervisors", icon: ShieldCheck },
];

export type TeamMember = {
  id: string | number;
  name: string;
  role: TeamRoleType;
  avatar?: string;
  phone?: string;
  pollingUnit?: string;
  puCode?: string;
  ward?: string;
  lga?: string;
  state?: string;
};

// Individual team member card
export function TeamUserCard({ member }: { member: TeamMember }) {
  return (
    <div className="flex items-center gap-4 py-5">
      <AppAvatar
        src={member.avatar}
        alt={member.name}
        className="size-20 shrink-0"
      />
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xl font-bold text-foreground leading-tight truncate">
            {member.name}
          </h3>
          {member.phone && (
            <a
              href={`tel:${member.phone}`}
              className="p-2.5 rounded-full bg-sidebar-softer/50 text-muted-foreground hover:text-foreground shrink-0 transition-colors"
              title={`Call ${member.name}`}
              aria-label={`Call ${member.name}`}
            >
              <Phone className="size-4" />
            </a>
          )}
        </div>
        <TeamRoleBadge role={member.role} />
        {member.pollingUnit && (
          <div className="text-[10px] text-foreground mt-1 truncate">
            <span className="text-muted-foreground mr-2">Polling unit:</span>
            <span className="font-medium">{member.pollingUnit}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 p-2.5 rounded-lg bg-sidebar-softer/70 text-[10px]">
          {member.puCode && (
            <div className="text-foreground truncate">
              <span className="text-muted-foreground mr-1.5">PU code:</span>
              <span className="font-medium">{member.puCode}</span>
            </div>
          )}
          {member.ward && (
            <div className="text-foreground truncate">
              <span className="text-muted-foreground mr-1.5">Ward:</span>
              <span className="font-medium">{member.ward}</span>
            </div>
          )}
          {member.lga && (
            <div className="text-foreground truncate">
              <span className="text-muted-foreground mr-1.5">LGA:</span>
              <span className="font-medium">{member.lga}</span>
            </div>
          )}
          {member.state && (
            <div className="text-foreground truncate">
              <span className="text-muted-foreground mr-1.5">State:</span>
              <span className="font-medium">{member.state}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type TeamFilterValues = {
  state: string;
  stateId?: number | string | null;
  lga: string;
  lgaId?: number | string | null;
  ward: string;
  wardId?: number | string | null;
  pollingUnit: string;
  pollingUnitId?: number | string | null;
};

// 2x2 geographic territory filters
export function TeamFilters({
  filters,
  roleType,
  onStateChange,
  onLgaChange,
  onWardChange,
  onPollingUnitChange,
}: {
  filters: TeamFilterValues;
  roleType?: string | null;
  onStateChange?: (state: State | null) => void;
  onLgaChange?: (lga: Lga | null) => void;
  onWardChange?: (ward: Ward | null) => void;
  onPollingUnitChange?: (pu: PollingUnit | null) => void;
}) {
  const triggerClass =
    "w-full h-10 px-4 rounded-lg bg-sidebar-softer text-sm font-semibold text-foreground border-0 ring-0 shadow-none hover:bg-hover-10 justify-between";

  const isPollingAgent = roleType === "polling_agent";
  const isWardSupervisor = roleType === "ward_election_supervisor";
  const isLgaSupervisor = roleType === "lga_election_supervisor";
  const isStateSupervisor = roleType === "state_election_supervisor";

  const isStateDisabled = isPollingAgent || isWardSupervisor || isLgaSupervisor || isStateSupervisor;
  const isLgaDisabled = isPollingAgent || isWardSupervisor || isLgaSupervisor || !filters.stateId;
  const isWardDisabled = isPollingAgent || isWardSupervisor || !filters.lgaId;
  const isPuDisabled = isPollingAgent || !filters.wardId;

  return (
    <div className="grid grid-cols-2 gap-3 mt-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-foreground">State</label>
        <SelectState
          selectedId={filters.stateId ?? undefined}
          disabled={isStateDisabled}
          update={(stateObj) => onStateChange?.(stateObj)}
          fetchStates={getStates}
          size="sm"
          className={triggerClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-foreground">LGA</label>
        <SelectLga
          selectedId={filters.lgaId ?? undefined}
          stateId={filters.stateId ? Number(filters.stateId) : undefined}
          disabled={isLgaDisabled}
          update={(lgaObj) => onLgaChange?.(lgaObj)}
          fetchLGAs={getLGAs}
          size="sm"
          className={triggerClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-foreground">Ward</label>
        <SelectWard
          selectedId={filters.wardId ?? undefined}
          stateId={filters.stateId ? Number(filters.stateId) : undefined}
          lgaId={filters.lgaId ? Number(filters.lgaId) : undefined}
          disabled={isWardDisabled}
          update={(wardObj) => onWardChange?.(wardObj)}
          fetchWards={getWards}
          size="sm"
          className={triggerClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-foreground">Polling unit</label>
        <SelectPollingUnit
          selectedId={filters.pollingUnitId ?? undefined}
          ward_id={filters.wardId ? Number(filters.wardId) : undefined}
          disabled={isPuDisabled}
          update={(puObj) => onPollingUnitChange?.(puObj)}
          fetchPollingUnits={getPollingUnits}
          size="sm"
          className={triggerClass}
        />
      </div>
    </div>
  );
}

// Loading state view while checking user duty assignments
function TeamLoading() {
  return (
    <div className="flex flex-col flex-1 pb-24 px-4 max-w-md w-full items-center justify-center min-h-[50vh]">
      <PageHeader title="Your Team" hideBackButton />
      <p className="text-sm text-muted-foreground mt-8">Loading assignments...</p>
    </div>
  );
}

// Empty state view when user lacks an active duty assignment
function NoActiveAssignment() {
  return (
    <div className="flex flex-col flex-1 pb-24 px-4 max-w-md w-full">
      <PageHeader title="Your Team" hideBackButton />
      <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
        <p className="text-base font-medium text-foreground">You do not have an active assignment</p>
      </div>
    </div>
  );
}

// Team management page
function TeamPage() {
  // Active election duty assignments for user
  const { hasActiveAssignment, supervisorAssignment, pollingUnitAssignment, role_type, isLoading } = useAssignments();

  // Selected team role tab
  const [activeTab, setActiveTab] = useState("polling_agent");

  // Derive election group and territory location IDs from active assignment
  const election_group_id = supervisorAssignment?.data?.election_group_id ?? pollingUnitAssignment?.election_group_id;
  const state_id = supervisorAssignment?.data?.state_id ?? pollingUnitAssignment?.state_id;
  const lga_id = supervisorAssignment?.data?.lga_id ?? pollingUnitAssignment?.lga_id;
  const ward_id = supervisorAssignment?.data?.ward_id ?? pollingUnitAssignment?.ward_id;
  const polling_unit_id = pollingUnitAssignment?.polling_unit_id;

  // Territory filter selection state
  const [filters, setFilters] = useState<TeamFilterValues>({
    state: "Select state",
    stateId: null,
    lga: "Select LGA",
    lgaId: null,
    ward: "Select ward",
    wardId: null,
    pollingUnit: "Select polling unit",
    pollingUnitId: null,
  });

  // Sync initial territory filter IDs from active assignment
  useEffect(() => {
    if (state_id && filters.stateId === null) {
      setFilters((prev) => ({
        ...prev,
        stateId: state_id,
        lgaId: lga_id ?? null,
        wardId: ward_id ?? null,
        pollingUnitId: polling_unit_id ?? null,
      }));
    }
  }, [state_id, lga_id, ward_id, polling_unit_id]);

  // Query team members scoped to active tab & territory filters
  const fetchTeamMembers = useServerFn(getTeamMembers);
  const { data: teamResponse, isLoading: isTeamLoading } = useQuery({
    queryKey: [
      "teamMembers",
      activeTab,
      election_group_id,
      filters.stateId ?? state_id,
      filters.lgaId ?? lga_id,
      filters.wardId ?? ward_id,
      filters.pollingUnitId ?? polling_unit_id,
    ],
    queryFn: async () => {
      const res = await fetchTeamMembers({
        data: {
          tab: activeTab,
          election_group_id: election_group_id ?? undefined,
          state_id: filters.stateId ?? state_id ?? undefined,
          lga_id: filters.lgaId ?? lga_id ?? undefined,
          ward_id: filters.wardId ?? ward_id ?? undefined,
          polling_unit_id: filters.pollingUnitId ?? polling_unit_id ?? undefined,
        },
      });
      return res?.data ?? { items: [] };
    },
    enabled:
      !!hasActiveAssignment &&
      !!election_group_id &&
      (activeTab !== "polling_agent" || !!(filters.wardId ?? ward_id)),
    staleTime: Infinity,
  });

  // Map server response to TeamMember items
  const members: TeamMember[] = (teamResponse?.items || []).map((item: any) => ({
    id: item.id,
    name: item.user_name,
    role: item.role_type,
    avatar: item.avatar_url || "",
    phone: item.phone || "",
    pollingUnit: item.polling_unit_name || "",
    puCode: item.polling_unit_code || "",
    ward: item.ward_name || "",
    lga: item.lga_name || "",
    state: item.state_name || "",
  }));

  // Show loading while checking assignment
  if (isLoading) {
    return <TeamLoading />;
  }

  // Check if user has an active assignment
  if (!hasActiveAssignment) {
    return <NoActiveAssignment />;
  }

  // Tab configurations with active state and handlers
  const tabs: ScrollableTabItem[] = TEAM_TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    icon: tab.icon,
    isActive: activeTab === tab.id,
    onClick: () => setActiveTab(tab.id),
  }));

  return (
    <div className="flex flex-col flex-1 pb-24 px-4 max-w-md w-full">
      <PageHeader title="Your Team" hideBackButton />

      {/* NavBar */}
      <div className="mt-2">
        <ScrollableNavTabs ariaLabel="Team navigation tabs" tabs={tabs} />
      </div>

      {/* filter */}
      <TeamFilters
        filters={filters}
        roleType={role_type}
        onStateChange={(stateObj) => {
          setFilters((prev) => ({
            ...prev,
            state: stateObj?.name || "Select state",
            stateId: stateObj?.id ?? null,
            lga: "Select LGA",
            lgaId: null,
            ward: "Select ward",
            wardId: null,
            pollingUnit: "Select polling unit",
            pollingUnitId: null,
          }));
        }}
        onLgaChange={(lgaObj) => {
          setFilters((prev) => ({
            ...prev,
            lga: lgaObj?.name || "Select LGA",
            lgaId: lgaObj?.id ?? null,
            ward: "Select ward",
            wardId: null,
            pollingUnit: "Select polling unit",
            pollingUnitId: null,
          }));
        }}
        onWardChange={(wardObj) => {
          setFilters((prev) => ({
            ...prev,
            ward: wardObj?.name || "Select ward",
            wardId: wardObj?.id ?? null,
            pollingUnit: "Select polling unit",
            pollingUnitId: null,
          }));
        }}
        onPollingUnitChange={(puObj) => {
          setFilters((prev) => ({
            ...prev,
            pollingUnit: puObj?.name || "Select polling unit",
            pollingUnitId: puObj?.id ?? null,
          }));
        }}
      />

      {/* returned users here */}
      {activeTab === "polling_agent" && !(filters.wardId ?? ward_id) ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <Users className="size-10 mb-2 opacity-40" />
          <p className="font-medium text-foreground">Select a ward to view polling agents</p>
          <p className="text-xs mt-1">Polling agents are filtered per ward or polling unit.</p>
        </div>
      ) : isTeamLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Loading team members...</p>
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <Users className="size-10 mb-2 opacity-40" />
          <p className="font-medium text-foreground">No team members found</p>
          <p className="text-xs mt-1">No assigned members matched this jurisdiction.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y-2 divide-sidebar-mobile mt-6">
          {members.map((member) => (
            <TeamUserCard key={member.id} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}
