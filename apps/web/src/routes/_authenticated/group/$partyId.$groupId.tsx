import { useMemo, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  Radio,
  Search,
  ArrowLeft,
  RefreshCw,
  Share2,
  Crown,
  Calendar,
  Building2,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  FileText,
  UserCheck,
  Award,
} from "lucide-react";
import { AppAvatar } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { QUERY_KEYS, APP_URL } from "@/lib/config";
import { getParties, type Party } from "@/lib/server/parties";
import {
  getCampaignGroup,
  getCampaignGroupMembers,
  syncCampaignGroupOfficials,
  type CampaignGroupMemberItem,
  type CampaignGroupDetails,
} from "@/lib/server/campaign_groups";

export const Route = createFileRoute(
  "/_authenticated/group/$partyId/$groupId",
)({
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
  state_supervisor: {
    label: "State Supervisor",
    badgeColor: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
    icon: ShieldCheck,
  },
  lga_supervisor: {
    label: "LGA Supervisor",
    badgeColor: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
    icon: ShieldCheck,
  },
  ward_supervisor: {
    label: "Ward Supervisor",
    badgeColor: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
    icon: ShieldCheck,
  },
  agent: {
    label: "Polling Unit Agent",
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
  const [activeTab, setActiveTab] = useState<"members" | "timeline" | "talks" | "issues" | "assets">("members");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // 1. Fetch parties list to resolve party identity
  const { data: partiesRes } = useQuery({
    queryKey: QUERY_KEYS.parties,
    queryFn: () => getParties(),
    staleTime: Infinity,
  });

  const parties: Party[] = (partiesRes as any)?.data?.parties || [];
  const activeParty = useMemo(() => {
    const pid = Number(partyId);
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
    `${partyShortName.toUpperCase()} ${group?.scope ? group.scope.toUpperCase() : ""} Campaign Command`;

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Role filter
      if (roleFilter !== "all" && m.role !== roleFilter) {
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

  // Member role counts for badge filters
  const roleCounts = useMemo(() => {
    const counts = {
      all: members.length,
      candidate: 0,
      party_official: 0,
      supervisor: 0,
      agent: 0,
    };
    for (const m of members) {
      if (m.role === "candidate") counts.candidate += 1;
      else if (m.role === "party_official") counts.party_official += 1;
      else if (m.role.includes("supervisor")) counts.supervisor += 1;
      else if (m.role === "agent") counts.agent += 1;
    }
    return counts;
  }, [members]);

  // Copy share link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Campaign group URL copied to clipboard");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back to Party Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          to={activeParty ? APP_URL.party(activeParty.short_name, activeParty.id) : (APP_URL.parties as any)}
          className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="size-4" />
          <span>Back to {partyShortName.toUpperCase()} Profile</span>
        </Link>
      </div>

      {/* Hero Command Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card/95 to-accent/10 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-4 max-w-3xl">
            {/* Pill badges */}
            <div className="flex flex-wrap items-center gap-2">
              {activeParty?.logo && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background border border-border/60 shadow-2xs">
                  <img
                    src={activeParty.logo}
                    alt={activeParty.short_name}
                    className="size-4 rounded-full object-cover"
                  />
                  <span className="text-xs font-bold text-foreground uppercase">{activeParty.short_name}</span>
                </div>
              )}
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                {group?.scope || "National"} Scope
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                Active Command
              </span>
              {group?.officials_added && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                  <ShieldCheck className="size-3" />
                  Officials Synced
                </span>
              )}
            </div>

            {/* Title & Description */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {groupTitle}
              </h1>
              <p className="mt-1.5 text-sm sm:text-base text-muted-foreground leading-relaxed">
                Central mobilization command and field operations team for {activeParty?.name || partyShortName.toUpperCase()}{" "}
                during this election cycle.
              </p>
            </div>

            {/* Geo & Sync Meta Tags */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground pt-1">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="size-3.5 text-primary" />
                <span className="capitalize">{group?.scope || "National"} Jurisdiction</span>
              </span>
              <span className="text-border">&bull;</span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" />
                <span>Formed {group?.created_at ? new Date(group.created_at).toLocaleDateString() : "Active Cycle"}</span>
              </span>
              <span className="text-border">&bull;</span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-3.5 text-primary" />
                <span>{members.length} Enrolled Operatives</span>
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex sm:flex-row md:flex-col gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="flex items-center gap-2 h-9 text-xs"
            >
              <RefreshCw className={`size-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              <span>{syncMutation.isPending ? "Syncing..." : "Sync Chapter Officials"}</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyLink}
              className="flex items-center gap-2 h-9 text-xs"
            >
              <Share2 className="size-3.5" />
              <span>Share Group</span>
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-border/50">
          <div className="p-3.5 rounded-2xl bg-background/60 border border-border/40">
            <p className="text-xs font-semibold text-muted-foreground">Total Personnel</p>
            <p className="text-xl sm:text-2xl font-black text-foreground mt-0.5">{members.length}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-background/60 border border-border/40">
            <p className="text-xs font-semibold text-muted-foreground">Fielded Nominees</p>
            <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {roleCounts.candidate}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-background/60 border border-border/40">
            <p className="text-xs font-semibold text-muted-foreground">Chapter Officials</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {roleCounts.party_official}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-background/60 border border-border/40">
            <p className="text-xs font-semibold text-muted-foreground">Field Supervisors</p>
            <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
              {roleCounts.supervisor}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-px overflow-x-auto custom-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("members")}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === "members"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
        >
          <Users className="size-4" />
          <span>Members Roster</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs bg-muted text-muted-foreground font-bold">
            {members.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("timeline")}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === "timeline"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
        >
          <Sparkles className="size-4" />
          <span>Announcements & Feed</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("talks")}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === "talks"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
        >
          <MessageSquare className="size-4" />
          <span>Talks Room</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("issues")}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === "issues"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
        >
          <AlertTriangle className="size-4" />
          <span>Challenges & BVAS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("assets")}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${activeTab === "assets"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
        >
          <FileText className="size-4" />
          <span>Campaign Media</span>
        </button>
      </div>

      {/* Tab 1: Members Roster */}
      {activeTab === "members" && (
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
                { id: "state_supervisor", label: "Supervisors", count: roleCounts.supervisor },
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
                const fakeId = member.fake_id || "";
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
                          #{fakeId.slice(-6)}
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

      {/* Placeholder Tabs: Timeline, Talks, Challenges, Assets */}
      {activeTab !== "members" && (
        <div className="py-16 text-center rounded-3xl border border-dashed border-border/60 bg-card/40 p-8 space-y-3">
          <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            {activeTab === "timeline" && <Sparkles className="size-6" />}
            {activeTab === "talks" && <MessageSquare className="size-6" />}
            {activeTab === "issues" && <AlertTriangle className="size-6" />}
            {activeTab === "assets" && <FileText className="size-6" />}
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
