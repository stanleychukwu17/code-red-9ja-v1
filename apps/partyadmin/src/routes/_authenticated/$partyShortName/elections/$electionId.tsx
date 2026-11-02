/**
 * @file Single Election Race & Candidates View
 * @description Renders a comprehensive overview of an individual contested election instance:
 * Displays election race metadata, geographic scope, office, schedule, and the complete roster
 * of fielded candidates across all political parties with joint-ticket (running mate) support.
 */

import { useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout, PageHeader, PageSearchLayer } from "@repo/ui/components/custom/AdminLayouts";
import { formatISODate } from "@repo/ui/lib/date";
import { getPageHeader } from "#/lib/shared/meta";
import { APP_URL } from "#/lib/config";
import { getElectionByFakeId, getElectionCandidates } from "#/lib/server/elections";
import { useUserParty } from "#/hooks/useUserParty";
import { ManageCandidateTicketDialog, getTicketConfig } from "#/components/dialogs/ManageCandidateTicketDialog";
import { ElectionMetaStatsGrid, PartyNominationBanner, ElectionCandidateRow } from "./-components";
import { Users, UserCheck, Loader2, Sparkles } from "lucide-react";

export type ElectionDetailsSearch = {
  election_group_id?: number;
  scope?: string;
};

export const Route = createFileRoute("/_authenticated/$partyShortName/elections/$electionId")({
  validateSearch: (search: Record<string, unknown>): ElectionDetailsSearch => {
    const rawGroup = search.election_group_id;
    const groupNum =
      rawGroup !== undefined && rawGroup !== null && rawGroup !== ""
        ? Number(rawGroup)
        : undefined;
    const rawScope = typeof search.scope === "string" ? search.scope : undefined;
    return {
      election_group_id: groupNum && !isNaN(groupNum) ? groupNum : undefined,
      scope: rawScope,
    };
  },
  head: () => getPageHeader({ title: "Election Race Candidates" }),
  component: ElectionCandidatesPage,
});

function ElectionCandidatesPage() {
  const { partyShortName, electionId: eFID } = Route.useParams();
  const { election_group_id, scope: scopeParam } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const electionFakeID = Number(eFID);

  const { party } = useUserParty();
  const [searchQuery, setSearchQuery] = useState("");
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);

  // 1. Fetch Election instance details (accepts either id or fake_id)
  const { data: electionRes, isLoading: isElectionLoading } = useQuery({
    queryKey: ["election-details", electionFakeID, election_group_id, scopeParam],
    queryFn: async () => {
      const res = await getElectionByFakeId({
        data: {
          electionId: electionFakeID,
          electionGroupId: election_group_id,
          scope: scopeParam,
        },
      });
      if (!res || !res.success) {
        throw new Error(res?.message || "Failed to fetch election details");
      }
      return res.data?.election;
    },
    enabled: !isNaN(electionFakeID),
    staleTime: Infinity,
  });

  // Database ID for election mutations and candidate queries
  const electionId = electionRes?.id;
  const resolvedGroupId = election_group_id || electionRes?.election_group_id;
  const resolvedScope = scopeParam || electionRes?.scope;

  // 2. Fetch full candidates roster for this election (requires group and scope)
  const { data: candidatesRes, isLoading: isCandidatesLoading } = useQuery({
    queryKey: ["election-candidates", electionFakeID, resolvedGroupId, resolvedScope],
    queryFn: async () => {
      if (!resolvedGroupId || !resolvedScope) return [];
      const res = await getElectionCandidates({
        data: {
          electionId: electionFakeID,
          limit: 100,
          electionGroupId: resolvedGroupId,
          scope: resolvedScope,
        },
      });
      if (!res || !res.success) {
        throw new Error(res?.message || "Failed to fetch candidates");
      }
      return (res.data?.candidates as any[]) || [];
    },
    enabled: !isNaN(electionFakeID) && Boolean(resolvedGroupId && resolvedScope),
    staleTime: Infinity,
  });

  const election = electionRes;
  const candidates = candidatesRes || [];

  // Identify current party's candidate if fielded
  const myPartyCandidate = useMemo(() => {
    if (!party?.short_name || !candidates.length) return null;
    return (
      candidates.find((c) =>
        (c.party_short_name || "").toLowerCase() === party.short_name?.toLowerCase(),
      ) || null
    );
  }, [candidates, party?.short_name]);

  // Joint ticket roles configuration
  const electionName = election?.name || "Election Contest";
  const officeName = election?.office_name || "Office";
  const scopeName = election?.scope || "";
  const ticketConfig = useMemo(
    () => getTicketConfig(electionName, officeName, scopeName),
    [electionName, officeName, scopeName],
  );

  // Filter candidates by candidate name or party name
  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return candidates;
    const q = searchQuery.toLowerCase();
    return candidates.filter((c) => {
      const candidateName = (c.full_name || `${c.first_name || ""} ${c.last_name || ""}`).toLowerCase();
      const runningMateName = (c.running_mate_full_name || `${c.running_mate_first_name || ""} ${c.running_mate_last_name || ""}`).toLowerCase();
      const partyShort = (c.party_short_name || "").toLowerCase();
      return (
        candidateName.includes(q) ||
        runningMateName.includes(q) ||
        partyShort.includes(q)
      );
    });
  }, [candidates, searchQuery]);

  const formattedDate = election?.election_date ? formatISODate(election.election_date) : "—";
  const status = election?.status || "upcoming";
  const nominationsOpen = election?.nominations_open ?? true;

  const handleBack = () => {
    navigate({
      to: APP_URL.partyRoutes.electionInstances(partyShortName) as any,
      search: (election_group_id ? { election_group_id } : {}) as any,
    });
  };

  const handleDialogClose = () => {
    setIsManageDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["election-candidates"] });
    queryClient.invalidateQueries({ queryKey: ["election-details"] });
    queryClient.invalidateQueries({ queryKey: ["elections"] });
  };

  const isLoading = isElectionLoading || isCandidatesLoading;

  return (
    <Layout>
      <PageHeader
        title={electionName}
        activeTab="instances"
        onBackClick={handleBack}
        rightComponent={
          <button
            onClick={() => setIsManageDialogOpen(true)}
            className="flex items-center gap-2 bg-black text-white rounded-full h-11 px-5 font-medium shadow-sm transition"
          >
            {myPartyCandidate ? (
              <>
                <UserCheck className="size-4.5" />
                <span>Manage Ticket</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4.5" />
                <span>Field Candidate</span>
              </>
            )}
          </button>
        }
      />

      {/* Meta & Stats Overview Grid */}
      <ElectionMetaStatsGrid
        isLoading={isLoading}
        formattedDate={formattedDate}
        officeName={officeName}
        scopeName={scopeName}
        status={status}
        nominationsOpen={nominationsOpen}
        candidatesCount={candidates.length}
      />

      {/* Your Party's Nomination Banner */}
      <PartyNominationBanner
        party={party}
        myPartyCandidate={myPartyCandidate}
        ticketConfig={ticketConfig}
        onManageTicket={() => setIsManageDialogOpen(true)}
      />

      {/* Roster Table Search */}
      <PageSearchLayer
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Filter by candidate, running mate, or party..."
        rightComponent={
          <span className="text-sm text-c-50 font-medium">
            Showing {filteredCandidates.length} of {candidates.length} candidates
          </span>
        }
        inputClassName={`rounded-full [&_input]:placeholder:text-c-50 [&_input]:placeholder:text-sm [&_input]:placeholder:italic `}
      />

      {/* Candidates Roster Grid */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6 py-5">
        {isLoading ? (
          <div className="col-span-full h-48 flex flex-col items-center justify-center gap-3 text-c-50 rounded-3xl bg-sidebar-softer/70 dark:bg-card border border-sidebar-mobile dark:border-border">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm">Loading candidates roster...</p>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="col-span-full h-48 flex flex-col items-center justify-center gap-2 text-c-50 rounded-3xl bg-sidebar-softer/70 dark:bg-card border border-sidebar-mobile dark:border-border">
            <Users className="size-8 text-c-40" />
            <p className="text-base font-medium text-c-80">No candidates found</p>
            <p className="text-sm text-c-40">
              {searchQuery ? "No candidate matches your search criteria." : "No candidates have been fielded for this election yet."}
            </p>
          </div>
        ) : (
          filteredCandidates.map((c) => (
            <ElectionCandidateRow
              key={c.id}
              candidate={c}
              ticketConfig={ticketConfig}
            />
          ))
        )}
      </div>

      {/* Ticket Management Dialog */}
      {isManageDialogOpen && (
        <ManageCandidateTicketDialog
          open={isManageDialogOpen}
          onClose={handleDialogClose}
          election={{
            id: electionId,
            fake_id: election?.fake_id ? Number(election.fake_id) : undefined,
            name: electionName,
            office_name: officeName,
            scope: scopeName,
          }}
          candidate={
            myPartyCandidate?.candidate_id
              ? {
                id: myPartyCandidate.candidate_id,
                name:
                  myPartyCandidate.candidate_name ||
                  `${myPartyCandidate.first_name || ""} ${myPartyCandidate.last_name || ""}`.trim(),
                avatar: myPartyCandidate.avatar || undefined,
              }
              : undefined
          }
          running_mate={
            myPartyCandidate?.running_mate_id
              ? {
                id: myPartyCandidate.running_mate_id,
                name:
                  myPartyCandidate.running_mate_name ||
                  `${myPartyCandidate.running_mate_first_name || ""} ${myPartyCandidate.running_mate_last_name || ""}`.trim(),
                avatar: myPartyCandidate.running_mate_avatar || undefined,
              }
              : undefined
          }
        />
      )}
    </Layout>
  );
}
