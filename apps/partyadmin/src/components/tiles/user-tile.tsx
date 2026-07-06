import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import NoProfileImageIcon from "@repo/ui/icons/no-profile-image-icon";
import { UserDropdown } from "../dropdowns/UserDropdown"; // Trigger reload

export type UserType = {
  id: number;
  fake_id?: any;
  first_name?: any;
  last_name?: any;
  middle_name?: any;
  gender?: any;
  date_of_birth?: any;
  current_country?: any;
  current_state?: any;
  current_city?: any;
  state_of_origin?: any;
  party_id?: any;
  role?: any;
  email?: any;
  phone?: any;
  username?: any;
  role_level?: string;
  created_at?: any;
  avatar_url?: string;
  name?: string;
  avatar?: string;
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

export function UserTableTile({
  data,
  refetch,
}: {
  data: UserType;
  refetch?: () => void;
}) {
  const firstName = getPgString(data.first_name);
  const lastName = getPgString(data.last_name);
  const username = getPgString(data.username);
  const email = getPgString(data.email);

  const name =
    data.name ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    username ||
    email ||
    "Admin User";

  const rawRoleLevel = data.role_level || "user";
  const formattedRoleLevel =
    rawRoleLevel.charAt(0).toUpperCase() + rawRoleLevel.slice(1);

  const createdTime = data.created_at?.Time || data.created_at || "";
  const dateAdded = data.dateAdded || formatDate(createdTime);

  const avatar = data.avatar || data.avatar_url;

  return (
    <TileRow>
      <TileLeft>
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="size-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <NoProfileImageIcon className="size-10" />
        )}
        <p className="truncate w-full text-[16px] text-c-90">{name}</p>
      </TileLeft>
      <TileRight>
        <span className="text-[15px] text-c-80 w-[140px]">
          {formattedRoleLevel || "-"}
        </span>
        <span className="text-[15px] text-c-70 w-[150px]">{dateAdded}</span>
        <UserDropdown data={data} refetch={refetch} className="ml-2" />
      </TileRight>
    </TileRow>
  );
}
