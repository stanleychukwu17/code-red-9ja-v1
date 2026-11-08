import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Search, Crown, Radio } from "lucide-react";
import { AppAvatar } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { QUERY_KEYS } from "@/lib/config";
import {
  getCampaignGroupMembers,
  type CampaignGroupMemberItem,
} from "@/lib/server/campaign_groups";
import { getRoleMeta } from "#/components/campaign-group";

export const Route = createFileRoute(
  "/_authenticated/group/$partyId/$groupId/home",
)({
  component: CampaignGroupHomeTabComponent,
});

function CampaignGroupHomeTabComponent() {
  const { groupId } = Route.useParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Fetch group members roster (cached with parent layout via React Query)
  const { data: membersRes, isLoading: isMembersLoading } = useQuery({
    queryKey: QUERY_KEYS.campaignGroupMembers(groupId),
    queryFn: () => getCampaignGroupMembers({ data: { groupId } }),
    enabled: Boolean(groupId),
    staleTime: Infinity,
  });

  const members: CampaignGroupMemberItem[] = membersRes?.data?.members || [];

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
      else if (m.role === "agent" || m.role === "polling_agent") counts.agent += 1;
      else if (m.role.includes("supervisor")) counts.supervisor += 1;
    }
    return counts;
  }, [members]);

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

  return (
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                roleFilter === pill.id
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
            <div
              key={i}
              className="p-4 rounded-2xl border border-border/50 bg-card animate-pulse flex items-center gap-3.5"
            >
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
  );
}
