/**
 * @file Single Election Race & Candidates View
 * @description Renders a comprehensive overview of an individual contested election instance:
 * Displays election race metadata, geographic scope, office, schedule, and the complete roster
 * of fielded candidates across all political parties with joint-ticket (running mate) support.
 */

import { useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
} from "@repo/ui/components/custom/AdminLayouts";
import { Button } from "@repo/ui/components/button";
import { Badge } from "@repo/ui/components/badge";
import { AppAvatar } from "@repo/ui/components/avatar";
import { TileHeader, TileLeft, TileRight, TileRow } from "@repo/ui/components/tiles";
import { formatISODate } from "@repo/ui/lib/date";
import { cn, getVal } from "@repo/ui/lib/utils";
import { getPageHeader } from "#/lib/shared/meta";
import { APP_URL } from "#/lib/config";
import { getElectionById, getElectionCandidates } from "#/lib/server/elections";
import { useUserParty } from "#/hooks/useUserParty";
import { ManageCandidateTicketDialog, getTicketConfig } from "#/components/dialogs/ManageCandidateTicketDialog";
import type { ElectionInstanceType } from "#/components/tiles/election-instance-tile";
import {
  Calendar,
  Layers,
  Users,
  Award,
  CheckCircle2,
  Clock,
  UserCheck,
  ShieldAlert,
  Loader2,
  Sparkles,
} from "lucide-react";

export type ElectionDetailsSearch = {
  election_group_id?: number;
  scope?: string;
};

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/elections/$electionId",
)({
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

const getDateStr = (val: any): string => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null && val.Valid && val.Time) {
    return val.Time;
  }
  return "";
};

function ElectionCandidatesPage() {
  const { partyShortName, electionId: electionIdParam } = Route.useParams();
  const { election_group_id, scope: scopeParam } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const electionId = Number(electionIdParam);

  const { party } = useUserParty();
  const [searchQuery, setSearchQuery] = useState("");
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);

  // 1. Fetch Election instance details
  const {
    data: electionRes,
    isLoading: isElectionLoading,
  } = useQuery({
    queryKey: ["election-details", electionId, election_group_id, scopeParam],
    queryFn: async () => {
      const res = await getElectionById({
        data: {
          electionId,
          electionGroupId: election_group_id,
          scope: scopeParam,
        },
      });
      if (!res || !res.success) {
        throw new Error(res?.message || "Failed to fetch election details");
      }
      return res.data?.election;
    },
    enabled: !isNaN(electionId),
  });

  const resolvedGroupId = election_group_id || electionRes?.election_group_id;
  const resolvedScope = scopeParam || electionRes?.scope;

  // 2. Fetch full candidates roster for this election (requires group and scope)
  const { data: candidatesRes, isLoading: isCandidatesLoading, } = useQuery({
    queryKey: ["election-candidates", electionId, resolvedGroupId, resolvedScope],
    queryFn: async () => {
      if (!resolvedGroupId || !resolvedScope) return [];
      const res = await getElectionCandidates({
        data: {
          electionId,
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
    enabled: !isNaN(electionId) && Boolean(resolvedGroupId && resolvedScope),
    staleTime: Infinity,
  });

  const election = electionRes;
  const candidates = candidatesRes || [];

  // Identify current party's candidate if fielded
  const myPartyCandidate = useMemo(() => {
    if (!party?.short_name || !candidates.length) return null;
    return (
      candidates.find(
        (c) =>
          getVal(c.party_short_name).toLowerCase() ===
          party.short_name?.toLowerCase(),
      ) || null
    );
  }, [candidates, party?.short_name]);

  // Joint ticket roles configuration
  const electionName = election?.name || "Election Contest";
  const officeName = getVal(election?.office_name) || "Office";
  const scopeName = election?.scope || "";
  const ticketConfig = useMemo(
    () => getTicketConfig(electionName, officeName, scopeName),
    [electionName, officeName, scopeName],
  );

  // Map to ElectionInstanceType for dialog compatibility
  const electionInstanceData: ElectionInstanceType = useMemo(() => {
    const candidateId = myPartyCandidate?.candidate_id;
    const runningMateId = myPartyCandidate?.running_mate_id ?? undefined;

    return {
      id: electionId,
      rank: 1,
      title: electionName,
      electionDate: getDateStr(election?.election_date),
      officeName,
      scope: scopeName,
      candidate: candidateId
        ? {
          id: candidateId,
          name: myPartyCandidate.candidate_name || `${myPartyCandidate.first_name || ""} ${myPartyCandidate.last_name || ""}`.trim(),
          avatar: myPartyCandidate.avatar || undefined,
        }
        : undefined,
      runningMate: runningMateId
        ? {
          id: runningMateId,
          name: myPartyCandidate.running_mate_name || `${myPartyCandidate.running_mate_first_name || ""} ${myPartyCandidate.running_mate_last_name || ""}`.trim(),
          avatar: myPartyCandidate.running_mate_avatar || undefined,
        }
        : undefined,
    };
  }, [electionId, electionName, election?.election_date, officeName, scopeName, myPartyCandidate]);

  // Filter candidates by candidate name or party name
  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return candidates;
    const q = searchQuery.toLowerCase();
    return candidates.filter((c) => {
      const candidateName = `${getVal(c.first_name)} ${getVal(c.last_name)}`.toLowerCase();
      const runningMateName = `${getVal(c.running_mate_first_name)} ${getVal(c.running_mate_last_name)}`.toLowerCase();
      const partyShort = getVal(c.party_short_name).toLowerCase();
      return (
        candidateName.includes(q) ||
        runningMateName.includes(q) ||
        partyShort.includes(q)
      );
    });
  }, [candidates, searchQuery]);

  const rawDate = getDateStr(election?.election_date);
  const formattedDate = rawDate ? formatISODate(rawDate) : "—";
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
    queryClient.invalidateQueries({ queryKey: ["election-candidates", electionId] });
    queryClient.invalidateQueries({ queryKey: ["election-details", electionId] });
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
          <Button
            onClick={() => setIsManageDialogOpen(true)}
            variant={myPartyCandidate ? "outline" : "default"}
            className="flex items-center gap-2 rounded-xl h-11 px-5 font-medium shadow-sm transition hover:shadow-md"
          >
            {myPartyCandidate ? (
              <>
                <UserCheck className="size-4.5 text-primary" />
                <span>Manage Ticket</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4.5" />
                <span>Field Candidate</span>
              </>
            )}
          </Button>
        }
      />

      {/* Meta & Stats Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm p-4 flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between text-c-50 text-xs font-semibold uppercase tracking-wider">
            <span>Election Date</span>
            <Calendar className="size-4 text-c-40" />
          </div>
          <div className="text-xl font-semibold text-c-90">
            {isLoading ? <span className="text-c-40 text-sm">Loading...</span> : formattedDate}
          </div>
          <div className="text-xs text-c-50">Polling Day Schedule</div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm p-4 flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between text-c-50 text-xs font-semibold uppercase tracking-wider">
            <span>Scope & Office</span>
            <Layers className="size-4 text-c-40" />
          </div>
          <div className="text-xl font-semibold text-c-90 truncate">
            {isLoading ? <span className="text-c-40 text-sm">Loading...</span> : officeName}
          </div>
          <div className="text-xs text-c-50 capitalize">{scopeName || "Race Jurisdiction"}</div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm p-4 flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between text-c-50 text-xs font-semibold uppercase tracking-wider">
            <span>Status</span>
            <Clock className="size-4 text-c-40" />
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                status === "concluded"
                  ? "muted"
                  : status === "ongoing"
                    ? "success"
                    : "info"
              }
              className="capitalize px-2.5 py-1 text-xs"
            >
              {status}
            </Badge>
            {nominationsOpen && (
              <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                Nominations Open
              </Badge>
            )}
          </div>
          <div className="text-xs text-c-50">Official Contest State</div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm p-4 flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between text-c-50 text-xs font-semibold uppercase tracking-wider">
            <span>Fielded Candidates</span>
            <Users className="size-4 text-c-40" />
          </div>
          <div className="text-xl font-semibold text-c-90">
            {isLoading ? <span className="text-c-40 text-sm">Loading...</span> : candidates.length}
          </div>
          <div className="text-xs text-c-50">Parties Contesting</div>
        </div>
      </div>

      {/* Your Party's Nomination Banner */}
      <div className="rounded-2xl border border-primary/20 bg-linear-to-r from-primary/5 via-card/80 to-card/60 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0">
            {party?.logo ? (
              <img
                src={party.logo}
                alt={party.short_name || "Party"}
                className="size-10 object-contain rounded-xl"
              />
            ) : (
              <Award className="size-7 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {party?.short_name || "Your Party"} Ticket
              </span>
              {myPartyCandidate ? (
                <Badge variant="success" className="text-[11px] py-0 px-2 flex items-center gap-1">
                  <CheckCircle2 className="size-3" />
                  Fielded
                </Badge>
              ) : (
                <Badge variant="warning" className="text-[11px] py-0 px-2 flex items-center gap-1">
                  <ShieldAlert className="size-3" />
                  Vacant
                </Badge>
              )}
            </div>

            {myPartyCandidate ? (
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <AppAvatar
                    src={getVal(myPartyCandidate.avatar)}
                    alt={`${getVal(myPartyCandidate.first_name)} ${getVal(myPartyCandidate.last_name)}`}
                    className="size-6 shrink-0 ring-1 ring-border"
                  />
                  <span className="text-base font-semibold text-c-90">
                    {getVal(myPartyCandidate.first_name)} {getVal(myPartyCandidate.last_name)}
                  </span>
                  <span className="text-xs text-c-50">({ticketConfig.principalRole})</span>
                </div>

                {ticketConfig.hasRunningMate && myPartyCandidate.running_mate_id && (
                  <div className="flex items-center gap-2 border-l border-border pl-3">
                    <AppAvatar
                      src={getVal(myPartyCandidate.running_mate_avatar)}
                      alt={`${getVal(myPartyCandidate.running_mate_first_name)} ${getVal(myPartyCandidate.running_mate_last_name)}`}
                      className="size-6 shrink-0 ring-1 ring-border"
                    />
                    <span className="text-sm font-medium text-c-80">
                      {getVal(myPartyCandidate.running_mate_first_name)} {getVal(myPartyCandidate.running_mate_last_name)}
                    </span>
                    <span className="text-xs text-c-40">(Running Mate)</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-0.5 text-sm text-c-60">
                Your party does not currently have an active candidate ticket nominated for this election contest.
              </p>
            )}
          </div>
        </div>

        <Button
          onClick={() => setIsManageDialogOpen(true)}
          variant={myPartyCandidate ? "outline" : "default"}
          size="sm"
          className="rounded-xl shrink-0"
        >
          {myPartyCandidate ? "Edit Ticket" : "Nominate Ticket"}
        </Button>
      </div>

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
      />

      {/* Candidates Roster Table */}
      <div className="w-full flex flex-col rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <TileHeader>
          <TileLeft>
            <span className="text-c-90 w-28 shrink-0">Party</span>
            <span className="text-c-90 font-medium">Principal Candidate</span>
          </TileLeft>
          <TileRight>
            {ticketConfig.hasRunningMate && (
              <span className="text-c-50 text-[14px] w-60 hidden md:block">
                Running Mate
              </span>
            )}
            <span className="text-c-50 text-[14px] w-32 hidden sm:block">
              Nomination
            </span>
          </TileRight>
        </TileHeader>

        {isLoading ? (
          <div className="h-48 flex flex-col items-center justify-center gap-3 text-c-50">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm">Loading candidates roster...</p>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-c-50">
            <Users className="size-8 text-c-40" />
            <p className="text-base font-medium text-c-80">No candidates found</p>
            <p className="text-sm text-c-40">
              {searchQuery ? "No candidate matches your search criteria." : "No candidates have been fielded for this election yet."}
            </p>
          </div>
        ) : (
          filteredCandidates.map((c) => {
            const partyShort = getVal(c.party_short_name) || "IND";
            const partyLogo = getVal(c.party_logo);
            const partyColor = getVal(c.party_color_hex) || "#3b82f6";
            const isMyParty = party?.short_name && partyShort.toLowerCase() === party.short_name.toLowerCase();

            const candidateName = `${getVal(c.first_name)} ${getVal(c.last_name)}`.trim();
            const candidateAvatar = getVal(c.avatar);

            const runningMateFirstName = getVal(c.running_mate_first_name);
            const runningMateLastName = getVal(c.running_mate_last_name);
            const runningMateName = `${runningMateFirstName} ${runningMateLastName}`.trim();
            const runningMateAvatar = getVal(c.running_mate_avatar);
            const hasRunningMate = Boolean(c.running_mate_id && runningMateName);

            return (
              <TileRow
                key={c.id}
                className={cn(
                  "transition-colors",
                  isMyParty && "bg-primary/5 hover:bg-primary/10",
                )}
              >
                <TileLeft>
                  {/* Party Pill */}
                  <div className="flex items-center gap-3 w-28 shrink-0">
                    <div
                      className="size-8 rounded-lg flex items-center justify-center overflow-hidden border border-border shrink-0 bg-background"
                      style={{ borderLeftColor: partyColor, borderLeftWidth: 3 }}
                    >
                      {partyLogo ? (
                        <img
                          src={partyLogo}
                          alt={partyShort}
                          className="size-6 object-contain"
                        />
                      ) : (
                        <span className="text-[11px] font-bold text-c-80">
                          {partyShort.slice(0, 3)}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-[15px] text-c-90">
                      {partyShort}
                    </span>
                  </div>

                  {/* Principal Candidate */}
                  <div className="flex items-center gap-3 truncate">
                    <AppAvatar
                      src={candidateAvatar}
                      alt={candidateName}
                      className="size-8 shrink-0 ring-1 ring-border"
                    />
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[15px] font-medium text-c-90">
                          {candidateName || "Candidate"}
                        </p>
                        {isMyParty && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/40 text-primary">
                            Your Party
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-c-40">
                        {ticketConfig.principalRole}
                      </p>
                    </div>
                  </div>
                </TileLeft>

                <TileRight>
                  {/* Running Mate */}
                  {ticketConfig.hasRunningMate && (
                    <div className="w-60 hidden md:flex items-center gap-2.5 truncate">
                      {hasRunningMate ? (
                        <>
                          <AppAvatar
                            src={runningMateAvatar}
                            alt={runningMateName}
                            className="size-7 shrink-0 ring-1 ring-border"
                          />
                          <div className="truncate">
                            <p className="truncate text-[14px] font-medium text-c-80">
                              {runningMateName}
                            </p>
                            <p className="truncate text-[11px] text-c-40">
                              Running Mate
                            </p>
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-c-40 italic">
                          None registered
                        </span>
                      )}
                    </div>
                  )}

                  {/* Status */}
                  <div className="w-32 hidden sm:flex items-center gap-2">
                    <Badge variant="success" className="text-xs py-0.5">
                      Fielded
                    </Badge>
                  </div>
                </TileRight>
              </TileRow>
            );
          })
        )}
      </div>

      {/* Ticket Management Dialog */}
      {isManageDialogOpen && (
        <ManageCandidateTicketDialog
          open={isManageDialogOpen}
          onClose={handleDialogClose}
          data={electionInstanceData}
        />
      )}
    </Layout>
  );
}
