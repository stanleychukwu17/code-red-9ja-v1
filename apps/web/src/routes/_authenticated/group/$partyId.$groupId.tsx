import { useMemo, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, ShieldCheck, CheckCircle2, Radio, Search, ArrowLeft, RefreshCw, Share2, Crown, Calendar, Building2, Sparkles, MessageSquare, AlertTriangle, FileText, UserCheck, Award } from "lucide-react";
import { AppAvatar } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { HeaderAccent } from "@repo/ui/components/header-accent";
import { QUERY_KEYS, APP_URL } from "@/lib/config";
import { getPageHeader } from "@/lib/shared/meta";
import { useParties, type Party } from "#/hooks";
import { CampaignGroupHero, CampaignGroupNavTabs, type CampaignGroupTabId } from "#/components/campaign-group";
import { getCampaignGroup, getCampaignGroupMembers, syncCampaignGroupOfficials, type CampaignGroupMemberItem, type CampaignGroupDetails } from "@/lib/server/campaign_groups";

export const Route = createFileRoute("/_authenticated/group/$partyId/$groupId")({
  head: () => getPageHeader({
    title: "Campaign Group",
  }),
  component: CampaignGroupPageComponent,
});

// Role visual configurations & badges
const ROLE_CONFIG: Record<
  string,
  { label: string; badgeColor: string; icon: typeof Crown }
> = {
  candidate: {
    label: "Fielded Candidate",
    badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    icon: Crown,
  },
  party_official: {
    label: "Party Official",
    badgeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    icon: Award,
  },
  state_election_supervisor: {
    label: "State Election Supervisor",
    badgeColor: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
    icon: ShieldCheck,
  },
  state_supervisor: {
    label: "State Election Supervisor",
    badgeColor: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
    icon: ShieldCheck,
  },
  lga_election_supervisor: {
    label: "LGA Election Supervisor",
    badgeColor: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
    icon: ShieldCheck,
  },
  lga_supervisor: {
    label: "LGA Election Supervisor",
    badgeColor: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
    icon: ShieldCheck,
  },
  ward_election_supervisor: {
    label: "Ward Election Supervisor",
    badgeColor: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
    icon: ShieldCheck,
  },
  ward_supervisor: {
    label: "Ward Election Supervisor",
    badgeColor: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
    icon: ShieldCheck,
  },
  polling_agent: {
    label: "Polling Agent",
    badgeColor: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    icon: UserCheck,
  },
  agent: {
    label: "Polling Agent",
    badgeColor: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    icon: UserCheck,
  },
};

function getRoleMeta(role: string) {
  return (
    ROLE_CONFIG[role] || {
      label: role.replace(/_/g, " "),
      badgeColor: "bg-neutral-500/15 text-neutral-700 dark:text-neutral-400 border-neutral-500/30",
      icon: Users,
    }
  );
}

function CampaignGroupPageComponent() {
  const { partyId, groupId } = useParams({ strict: false }) as {
    partyId: string;
    groupId: string;
  };

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<CampaignGroupTabId>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // 1. Fetch parties list to resolve party identity
  const { parties } = useParties();
  const activeParty = useMemo(() => {
    const pid = Number(partyId);
    if (!Array.isArray(parties)) return null;
    return parties.find((p) => p.id === pid) || null;
  }, [parties, partyId]);

  // 2. Fetch group metadata
  const {
    data: groupRes,
    isLoading: isGroupLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.campaignGroup(groupId),
    queryFn: () => getCampaignGroup({ data: { groupId } }),
    enabled: Boolean(groupId),
  });

  // 3. Fetch group members roster
  const {
    data: membersRes,
    isLoading: isMembersLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.campaignGroupMembers(groupId),
    queryFn: () => getCampaignGroupMembers({ data: { groupId } }),
    enabled: Boolean(groupId),
  });

  // 4. Official sync mutation
  const syncMutation = useMutation({
    mutationFn: () => syncCampaignGroupOfficials({ data: { groupId } }),
    onSuccess: (res) => {
      if (res && "success" in res && res.success) {
        toast.success("Party officials synchronized to group successfully");
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.campaignGroupMembers(groupId) });
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

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Role filter
      if (roleFilter === "supervisor") {
        if (!m.role.includes("supervisor")) return false;
      } else if (roleFilter === "agent") {
        if (m.role !== "agent" && m.role !== "polling_agent") return false;
      } else if (roleFilter !== "all" && m.role !== roleFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const firstName = (m.first_name || "").toLowerCase();
        const lastName = (m.last_name || "").toLowerCase();
        const username = (m.username || "").toLowerCase();
        const fakeId = String(m.fake_id || "").toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        return fullName.includes(q) || username.includes(q) || fakeId.includes(q);
      }
      return true;
    });
  }, [members, roleFilter, searchQuery]);

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
        activeTab={activeTab}
        onTabChange={setActiveTab}
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

      {/* Tab 1: Home (Members Roster & Overview) */}
      {activeTab === "home" && (
        <div className="space-y-6">
          {/* Search & Role Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search operatives by name, username, or ID..."
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-border/60 bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>

            {/* Role Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", label: "All Members", count: roleCounts.all },
                { id: "candidate", label: "Candidates", count: roleCounts.candidate },
                { id: "party_official", label: "Officials", count: roleCounts.party_official },
                { id: "supervisor", label: "Supervisors", count: roleCounts.supervisor },
                { id: "agent", label: "Agents", count: roleCounts.agent },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setRoleFilter(pill.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${roleFilter === pill.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                >
                  <span>{pill.label}</span>
                  <span className="opacity-70 text-[10px] font-bold">({pill.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Member Cards Grid */}
          {isMembersLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-4 rounded-2xl border border-border/50 bg-card animate-pulse flex items-center gap-3.5">
                  <div className="size-12 rounded-full bg-muted shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMembers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((member) => {
                const roleMeta = getRoleMeta(member.role);
                const RoleIcon = roleMeta.icon;
                const firstName = member.first_name || "";
                const lastName = member.last_name || "";
                const username = member.username || "";
                const avatar = member.avatar || "";
                const fakeId = member.fake_id ? String(member.fake_id) : "";
                const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Campaign Member";

                return (
                  <div
                    key={member.id}
                    className="p-4 rounded-2xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-sm transition flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start gap-3.5">
                      <AppAvatar
                        src={avatar}
                        alt={fullName}
                        className="size-12 rounded-full border border-border/60 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-sm text-foreground truncate">{fullName}</p>
                          {member.role === "candidate" && (
                            <Crown className="size-3.5 text-amber-500 shrink-0" />
                          )}
                        </div>
                        {username && (
                          <p className="text-xs text-muted-foreground truncate">@{username}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${roleMeta.badgeColor}`}
                          >
                            <RoleIcon className="size-3" />
                            <span>{roleMeta.label}</span>
                          </span>
                          {member.can_broadcast && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                              <Radio className="size-2.5" />
                              Broadcast
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Joined {new Date(member.joined_at).toLocaleDateString()}</span>
                      {fakeId && (
                        <span className="font-mono text-muted-foreground/60">
                          #{String(fakeId).slice(-6)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center rounded-2xl border border-dashed border-border/60 bg-muted/20">
              <Users className="size-10 text-muted-foreground mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-foreground">No Operatives Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {searchQuery || roleFilter !== "all"
                  ? "Try adjusting your search criteria or clearing your filters."
                  : "No members have been enrolled into this campaign group yet. Click 'Sync Chapter Officials' above to populate chapter leaders."}
              </p>
              {(searchQuery || roleFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setRoleFilter("all");
                  }}
                  className="mt-4 text-xs"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Placeholder Tabs: Timeline, Talks, Challenges, Notes */}
      {activeTab !== "home" && (
        <div className="py-16 text-center rounded-3xl border border-dashed border-border/60 bg-card/40 p-8 space-y-3">
          <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            {activeTab === "timeline" && <Sparkles className="size-6" />}
            {activeTab === "talks" && <MessageSquare className="size-6" />}
            {activeTab === "issues" && <AlertTriangle className="size-6" />}
            {activeTab === "notes" && <FileText className="size-6" />}
          </div>
          <h3 className="text-lg font-bold text-foreground capitalize">
            {activeTab === "timeline"
              ? "Campaign Situation Timeline"
              : activeTab === "talks"
                ? "Secure Group Discussion Room"
                : activeTab === "issues"
                  ? "Field Challenges & BVAS Incident Board"
                  : "Campaign Field Resources"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {activeTab === "timeline"
              ? "Broadcast messages, rally announcements, and strategy directives for this campaign unit will appear here."
              : activeTab === "talks"
                ? "Real-time coordination room for accredited agents and supervisors to strategize."
                : activeTab === "issues"
                  ? "Incident logs, BVAS failures, and polling unit irregularities tracked live on election day."
                  : "Official campaign posters, speech guidelines, and accredited observer manuals."}
          </p>
          <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
            Module Configured in Schema &bull; Ready for Phase 2
          </span>
        </div>
      )}
    </div>
  );
}
