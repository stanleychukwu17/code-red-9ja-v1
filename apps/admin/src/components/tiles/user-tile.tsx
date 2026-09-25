import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import NoProfileImageIcon from "@repo/ui/icons/no-profile-image-icon";
import { UserDropdown } from "../dropdowns/UserDropdown";
import { WEB_URL } from "@/lib/config";
import { Link } from "@tanstack/react-router";
import { VerificationBadge } from "@repo/ui/components/custom/verification-badge";
import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";

export type UserType = {
  id: number;
  fake_id?: number;
  email?: string;
  avatar?: string;
  phone?: string;
  username?: string;
  last_name?: string;
  first_name?: string;
  middle_name?: string;
  name?: string;
  gender?: string;
  date_of_birth?: string;
  current_country?: number;
  current_state?: number;
  current_city?: number;
  state_of_origin?: number;
  is_politician?: boolean;
  is_verified?: boolean;
  verifications?: any[];
  roles?: { roles?: any[]; roles_code?: string[] };
  account_status?: string;
  party_id?: number;
  party_basic_info?: {
    logo?: string;
    [key: string]: any;
  };
  created_at?: string;
  country_name?: string;
  state_name?: string;
  city_name?: string;
};

export function UserAccountStatusBadge({ status, className }: { status?: string; className?: string; }) {
  if (!status) return null;

  const normalized = status.toLowerCase().trim();

  // do not show badge for active accounts
  if (normalized === "active") return null;

  let variant: "success" | "warning" | "destructive" | "info" | "secondary" | "outline" | "default" = "secondary";
  let label = status.replace(/_/g, " ");

  switch (normalized) {
    case "active":
      variant = "success";
      label = "Active";
      break;
    case "just_registered":
      variant = "info";
      label = "Just Registered";
      break;
    case "placeholder":
      variant = "warning";
      label = "Placeholder";
      break;
    case "inactive":
      variant = "warning";
      label = "Inactive";
      break;
    case "suspended":
      variant = "destructive";
      label = "Suspended";
      break;
    case "banned":
      variant = "destructive";
      label = "Banned";
      break;
    case "deleted":
      variant = "destructive";
      label = "Deleted";
      break;
    default:
      variant = "outline";
      break;
  }

  return (
    <Badge
      variant={variant}
      className={cn("capitalize text-[9px] px-2 py-0 h-4 font-medium leading-none shrink-0", className)}
    >
      {label}
    </Badge>
  );
}

const getPgString = (val: any) => {
  if (val && typeof val === "object" && "String" in val) {
    return val.String || "";
  }
  return val || "";
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "2-digit",
    });
  } catch (e) {
    return "N/A";
  }
};

// UserTable Tile Header 
export function UserTableHeader() {
  return (
    <TileHeader className="h-10 text-[13px] font-semibold text-c-60">
      <TileLeft>
        <span className="text-c-90">User / Citizen</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[13px] w-36 hidden md:block">
          Role level
        </span>
        <span className="text-c-50 text-[13px] w-32">Date added</span>
        <div className="ml-2 w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

// UserTable Tile 
export function UserTableTile({ data, refetch }: { data: UserType; refetch?: () => void; }) {
  const firstName = getPgString(data.first_name);
  const lastName = getPgString(data.last_name);
  const username = getPgString(data.username);
  const verifications = (data.verifications || []) as any[];

  // Full display name (first_name and last_name are guaranteed present)
  const name = `${firstName} ${lastName}`.trim();

  // Registration date formatting
  const createdTime = getPgString(data.created_at);
  const dateAdded = formatDate(createdTime);

  // Avatar URL
  const avatar = getPgString(data.avatar);

  // Combined residential location (e.g., "Lagos, Nigeria")
  const state = getPgString(data.state_name);
  const country = getPgString(data.country_name);
  const location = [state, country].filter(Boolean).join(", ");

  // Resolved user roles / permissions level
  let formattedRoleLevel: string = '';
  if (data.roles?.roles_code && data.roles.roles_code.length > 0) {
    formattedRoleLevel = data.roles.roles_code.join(", ");
  } else {
    formattedRoleLevel = "user";
  }

  // Political party affiliation details
  const partyLogo = data.party_basic_info?.logo;
  const partyName = getPgString(data.party_basic_info?.name);

  return (
    <div className="group flex items-center justify-between gap-4 py-2.5 px-3 rounded-2xl transition hover:bg-c-5">
      {/* Left side: Avatar + Identity details */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="relative shrink-0">
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className="size-13 rounded-full object-cover"
            />
          ) : (
            <NoProfileImageIcon className="size-13 rounded-full" />
          )}
          {((data.party_id && data.party_id > 0) || data.party_basic_info) && partyLogo && (
            <img
              src={partyLogo}
              alt="Party Logo"
              title={partyName || "Party"}
              className="absolute -bottom-1 -right-1 size-5 rounded-full object-cover border-2 border-background shadow-xs"
            />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-0.5">
          {/* Row 1: Full name + Verification badges + Politician tag */}
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <a
              href={WEB_URL.users.profile(encodeURIComponent(username))}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-semibold text-c-100 hover:text-primary transition-colors truncate"
            >
              <span>{name}</span>
            </a>

            {data.is_verified && verifications.length > 0 && (
              <p className="inline-flex items-center gap-0.5 shrink-0">
                {verifications.map((v: any) => (
                  <VerificationBadge
                    key={`${v.id}-${v.verification_type_id}`}
                    id={v.verification_type_id}
                    title={v.verification_title}
                    className="size-4 shrink-0"
                  />
                ))}
              </p>
            )}

            {data.is_politician && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 shrink-0 leading-tight">
                Politician
              </span>
            )}
          </div>

          {/* Row 2: Handle + Location + Account status badge */}
          <div className="flex items-center gap-2 text-[13px] text-c-50 truncate">
            <span className="truncate">@{username}</span>
            {location && (
              <>
                <span className="inline-block size-1 rounded-full bg-c-30 shrink-0" />
                <span className="truncate">{location}</span>
              </>
            )}
            <UserAccountStatusBadge status={data.account_status} />
          </div>
        </div>
      </div>

      {/* Right side: Role level + Date added + Admin action menu */}
      <div className="flex items-center justify-end gap-3 shrink-0">
        <span className="text-[13px] text-c-80 w-36 capitalize truncate hidden md:block">
          {formattedRoleLevel || "-"}
        </span>
        <span className="text-[13px] text-c-60 w-32 truncate">{dateAdded}</span>
        <UserDropdown data={data} refetch={refetch} className="ml-1" />
      </div>
    </div>
  );
}

