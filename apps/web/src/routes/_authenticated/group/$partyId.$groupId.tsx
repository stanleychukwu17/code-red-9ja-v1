import { useMemo } from "react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HeaderAccent } from "@repo/ui/components/header-accent";
import { QUERY_KEYS } from "@/lib/config";
import { getPageHeader } from "@/lib/shared/meta";
import { useParties } from "#/hooks";
import {
  CampaignGroupHero,
  CampaignGroupNavTabs,
} from "#/components/campaign-group";
import {
  getCampaignGroup,
  getCampaignGroupMembers,
  syncCampaignGroupOfficials,
  type CampaignGroupMemberItem,
  type CampaignGroupDetails,
} from "@/lib/server/campaign_groups";

export const Route = createFileRoute("/_authenticated/group/$partyId/$groupId")({
  head: () =>
    getPageHeader({
      title: "Campaign Group",
    }),
  component: CampaignGroupLayoutComponent,
});

function CampaignGroupLayoutComponent() {
  const { partyId, groupId } = Route.useParams();
  const queryClient = useQueryClient();

  // 1. Fetch parties list to resolve party identity
  const { parties } = useParties();
  const activeParty = useMemo(() => {
    const pid = Number(partyId);
    if (!Array.isArray(parties)) return null;
    return parties.find((p) => p.id === pid) || null;
  }, [parties, partyId]);

  // 2. Fetch group metadata
  const { data: groupRes } = useQuery({
    queryKey: QUERY_KEYS.campaignGroup(groupId),
    queryFn: () => getCampaignGroup({ data: { groupId } }),
    enabled: Boolean(groupId),
    staleTime: Infinity,
  });

  // 3. Fetch group members roster
  const { data: membersRes } = useQuery({
    queryKey: QUERY_KEYS.campaignGroupMembers(groupId),
    queryFn: () => getCampaignGroupMembers({ data: { groupId } }),
    enabled: Boolean(groupId),
    staleTime: Infinity,
  });

  // 4. Official sync mutation
  const syncMutation = useMutation({
    mutationFn: () => syncCampaignGroupOfficials({ data: { groupId } }),
    onSuccess: (res) => {
      if (res && "success" in res && res.success) {
        toast.success("Party officials synchronized to group successfully");
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.campaignGroupMembers(groupId),
        });
      } else {
        toast.error((res as any)?.message || "Failed to sync officials");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to sync party officials");
    },
  });

  const group: CampaignGroupDetails | undefined = groupRes?.data?.group;
  const members: CampaignGroupMemberItem[] = membersRes?.data?.members || [];

  // Group display name fallback
  const partyShortName = activeParty?.short_name || "Party";
  const groupTitle =
    group?.name ||
    `${partyShortName.toUpperCase()} ${group?.scope ? group.scope.toUpperCase() : ""} Campaign Group`;

  // Member role counts for badge filters and hero stat grid
  const roleCounts = useMemo(() => {
    const counts = {
      all: members.length,
      candidate: 0,
      party_official: 0,
      supervisor: 0,
      agent: 0,
      polling_agent: 0,
      ward_supervisor: 0,
      lga_supervisor: 0,
      state_supervisor: 0,
    };
    for (const m of members) {
      if (m.role === "candidate") counts.candidate += 1;
      else if (m.role === "party_official") counts.party_official += 1;
      else if (m.role === "agent" || m.role === "polling_agent") {
        counts.agent += 1;
        counts.polling_agent += 1;
      } else if (m.role === "ward_supervisor" || m.role === "ward_election_supervisor") {
        counts.supervisor += 1;
        counts.ward_supervisor += 1;
      } else if (m.role === "lga_supervisor" || m.role === "lga_election_supervisor") {
        counts.supervisor += 1;
        counts.lga_supervisor += 1;
      } else if (m.role === "state_supervisor" || m.role === "state_election_supervisor") {
        counts.supervisor += 1;
        counts.state_supervisor += 1;
      } else if (m.role.includes("supervisor")) {
        counts.supervisor += 1;
      }
    }
    return counts;
  }, [members]);

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header with underline accent mark */}
      <div className="flex items-center justify-center">
        <HeaderAccent
          as="h1"
          title={groupTitle}
          titleClassName="text-base sm:text-[30px] font-bold tracking-wide text-foreground"
          accentClassName="top-4 sm:top-7"
        />
      </div>

      {/* Campaign Group Navigation Tabs */}
      <CampaignGroupNavTabs
        partyId={partyId}
        groupId={groupId}
        membersCount={members.length}
      />

      {/* Hero Command Banner */}
      <CampaignGroupHero
        activeParty={activeParty}
        group={group}
        groupTitle={groupTitle}
        partyShortName={partyShortName}
        totalMembers={members.length}
        roleCounts={roleCounts}
        isSyncing={syncMutation.isPending}
        onSync={() => syncMutation.mutate()}
      />

      {/* Nested Tab Route Content */}
      <Outlet />
    </div>
  );
}
