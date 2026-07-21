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
import { MapPin } from "lucide-react";
import { VerificationBadge } from "@repo/ui/components/custom/verification-badge";

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
  gender?: string;
  date_of_birth?: string;
  current_country?: number;
  current_state?: number;
  current_city?: number;
  state_of_origin?: number;
  is_politician?: boolean;
  is_verified?: boolean;
  verifications?: any[];
  roles?: string[];
  account_status?: string;
  party_id?: number;
  created_at?: string;
  country_name?: string;
  state_name?: string;
  city_name?: string;

  // Frontend-specific fallback fields
  role?: any;
  avatar_url?: string;
  name?: string;
  status?: string;
  dateAdded?: string;
};

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

export function UserTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <span className="text-c-90">User</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-[140px] hidden md:block">
          Role level
        </span>
        <span className="text-c-50 text-[14px] w-[150px]">Date added</span>
        <div className="ml-2 w-8 shrink-0" />
      </TileRight>
    </TileHeader>
  );
}

export function UserTableTile({ data, refetch }: { data: UserType; refetch?: () => void; }) {
  const firstName = getPgString(data.first_name);
  const lastName = getPgString(data.last_name);
  const username = getPgString(data.username);
  const is_verified = data.is_verified as boolean;
  const verifications = data.verifications as any[];



  const name = data.name || [firstName, lastName].filter(Boolean).join(" ") || username;

  const rawRoleLevel = data.role || "user";
  const formattedRoleLevel = rawRoleLevel.charAt(0).toUpperCase() + rawRoleLevel.slice(1);

  const createdTime = data.created_at || "";
  const dateAdded = data.dateAdded || formatDate(createdTime);

  const avatar = data.avatar || data.avatar_url;

  const state = getPgString(data.state_name);
  const country = getPgString(data.country_name);
  const location = [state, country].filter(Boolean).join(", ");

  return (
    <TileRow className="py-10 border-b">
      <TileLeft>
        {avatar ? (
          <img src={avatar} alt={name} className="size-12 rounded-full object-cover shrink-0 border border-c-100/30" />
        ) : (
          <NoProfileImageIcon className="size-12 rounded-full " />
        )}
        <div className="flex flex-col w-full min-w-0">
          <div className="flex items-center w-full overflow-hidden">
            <Link
              to={WEB_URL.users.profile(username) as any} target="_blank"
              className="capitalize truncate flex items-center gap-1 font-semibold text-[14px] text-c-90 hover:underline hover:text-c-100 transition-colors"
            >
              <span className="truncate">{name}</span>
            </Link>
            {is_verified && verifications.length > 0 && (
              verifications.map((v: any, i: number) => (
                <VerificationBadge key={`${v.id}-${v.verification_type_id}`} id={v.verification_type_id} title={v.verification_title} />
              ))
            )}
          </div>
          <div className="truncate pt-1 pb-[2px] w-full text-[11px] text-c-50">
            @{username}
          </div>
          {location && (
            <div className="flex items-center gap-1 mt-1 text-[11px] text-c-50 w-full overflow-hidden">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          )}
        </div>
      </TileLeft>
      <TileRight>
        <span className="text-[14px] text-c-80 w-[140px]">
          {formattedRoleLevel || "-"}
        </span>
        <span className="text-[14px] text-c-70 w-[150px]">{dateAdded}</span>
        <UserDropdown data={data} refetch={refetch} className="ml-2" />
      </TileRight>
    </TileRow>
  );
}
