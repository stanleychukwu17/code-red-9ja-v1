import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getPartyAdmins } from "#/lib/server/parties";
import { APP_URL } from "#/lib/config";
import { VerificationBadge } from "@repo/ui/components/custom/verification-badge";
import { HeaderAccent } from "@repo/ui/components/header-accent";
import {
  ShieldCheck,
  Search,
  User,
  ExternalLink,
  Mail,
  Loader2,
  Lock,
} from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/party/$partyName/$partyId/party-admins",
)({
  component: PartyAdminsTabComponent,
});

/**
 * Safely extracts a string from either a plain string or a Go/sqlc `sql.NullString` object.
 */
function resolveText(val?: { String: string; Valid: boolean } | string): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  return val.Valid ? val.String : "";
}

/**
 * Safely extracts a boolean from either a boolean primitive or a Go/sqlc `sql.NullBool` object.
 */
function resolveBool(val?: { Bool: boolean; Valid: boolean } | boolean): boolean {
  if (val === undefined || val === null) return false;
  if (typeof val === "boolean") return val;
  return val.Valid ? val.Bool : false;
}

function PartyAdminsTabComponent() {
  const { partyName, partyId } = Route.useParams();
  const [searchFilter, setSearchFilter] = useState("");

  const { data: adminsRes, isLoading, error } = useQuery({
    queryKey: ["partyAdmins", partyId],
    queryFn: () => getPartyAdmins({ data: { partyId: Number(partyId) } }),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const admins = adminsRes?.success && adminsRes?.data?.admins ? adminsRes.data.admins : [];

  const filteredAdmins = admins.filter((admin: any) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    const firstName = resolveText(admin.first_name).toLowerCase();
    const lastName = resolveText(admin.last_name).toLowerCase();
    const username = resolveText(admin.username).toLowerCase();
    const fullName = `${firstName} ${lastName}`;
    return (
      firstName.includes(term) ||
      lastName.includes(term) ||
      fullName.includes(term) ||
      username.includes(term)
    );
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="relative inline-block">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShieldCheck className="size-6 text-primary" />
              Party Administrators
            </h2>
            <HeaderAccent />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Official party administrators for {partyName.toUpperCase()}. View profiles or contact them directly.
          </p>
        </div>

        {/* Search bar */}
        {admins.length > 0 && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search admins..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-full border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading party administrators...</p>
        </div>
      )}

      {/* Restricted / Forbidden state */}
      {!isLoading && adminsRes?.success === false && (
        <div className="py-16 text-center rounded-3xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-8">
          <div className="size-14 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Lock className="size-7" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            Restricted Access
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
            {adminsRes?.message ||
              "Only platform admins, party admins, and appointed officials holding a position in this party are permitted to view the party administrators list."}
          </p>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="p-6 rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive text-center">
          <p className="text-sm font-medium">Failed to load party administrators.</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && adminsRes?.success !== false && filteredAdmins.length === 0 && (
        <div className="py-16 text-center rounded-3xl border border-dashed border-border bg-card/50">
          <div className="size-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <ShieldCheck className="size-7" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            {searchFilter ? "No matching administrators" : "No party administrators found"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            {searchFilter
              ? `No administrators matched "${searchFilter}". Try adjusting your search.`
              : `There are currently no listed party administrators for ${partyName.toUpperCase()}.`}
          </p>
        </div>
      )}

      {/* Admins Grid */}
      {!isLoading && !error && filteredAdmins.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAdmins.map((admin: any) => {
            const firstName = resolveText(admin.first_name);
            const lastName = resolveText(admin.last_name);
            const fullName = `${firstName} ${lastName}`.trim() || "Administrator";
            const username = resolveText(admin.username) || `user_${admin.id}`;
            const avatar = resolveText(admin.avatar);
            const isVerified = resolveBool(admin.is_verified);
            const verifications = admin.verifications || [];
            const email = admin.email || "";
            const stateName = admin.state_name || "";
            const isSuperAdmin = Array.isArray(admin.roles)
              ? admin.roles.includes("super_party_admin") ||
                admin.roles.some((r: any) => r?.code === "super_party_admin" || r === "super_party_admin")
              : false;

            const profileUrl = APP_URL.profile(username);

            return (
              <div
                key={admin.id || username}
                className="group relative flex flex-col justify-between p-5 rounded-3xl border border-border bg-card hover:shadow-md hover:border-primary/40 transition-all duration-200"
              >
                <div>
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={fullName}
                          className="size-14 rounded-full object-cover ring-2 ring-background group-hover:scale-105 transition duration-200"
                        />
                      ) : (
                        <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg ring-2 ring-background">
                          {fullName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span
                        className="absolute -bottom-1 -right-1 size-5 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center text-white"
                        title="Party Administrator"
                      >
                        <ShieldCheck className="size-3" />
                      </span>
                    </div>

                    {/* Admin identity & details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          to={profileUrl}
                          className="font-bold text-foreground hover:text-primary transition-colors truncate"
                        >
                          {fullName}
                        </Link>
                        {isVerified && verifications.length > 0 && (
                          <div className="inline-flex items-center gap-px">
                            {verifications.map((v: any) => (
                              <VerificationBadge
                                key={`${v.id}-${v.verification_type_id}`}
                                id={v.verification_type_id}
                                title={v.verification_title}
                                className="size-4 shrink-0"
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground truncate">
                        @{username}
                      </p>

                      {stateName && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {stateName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Role badges */}
                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${
                        isSuperAdmin
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                          : "bg-primary/10 text-primary border border-primary/20"
                      }`}
                    >
                      {isSuperAdmin ? "Super Party Admin" : "Party Admin"}
                    </span>
                  </div>
                </div>

                {/* Actions footer */}
                <div className="mt-5 pt-4 border-t border-border/60 flex items-center gap-2">
                  <Link
                    to={profileUrl}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs"
                  >
                    <User className="size-3.5" />
                    <span>View Profile</span>
                    <ExternalLink className="size-3 ml-0.5 opacity-70" />
                  </Link>

                  {email && (
                    <a
                      href={`mailto:${email}`}
                      title={`Email ${fullName}`}
                      className="inline-flex items-center justify-center size-8 rounded-xl border border-border bg-secondary hover:bg-hover-5 text-foreground transition"
                      aria-label={`Send email to ${fullName}`}
                    >
                      <Mail className="size-4 text-muted-foreground" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
