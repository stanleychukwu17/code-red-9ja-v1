import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Ellipsis, Check, X } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { cn } from "@repo/ui/lib/utils";
import { PartyApplicationDialog } from "#/components/dialogs/party-application-dialog";
import {
  approveApplication,
  rejectApplication,
} from "#/lib/server/applications";

export type ApplicationType = {
  // Database fields
  id?: number;
  user_id?: number;
  party_id?: number;
  election_group_id?: number;
  status?: string;
  rejected_reason?: any;
  created_at?: any;
  updated_at?: any;
  first_name?: any;
  last_name?: any;
  email?: any;
  phone?: any;
  username?: any;
  avatar?: any;
  voters_card_image?: any;
  current_country?: number;
  current_state?: number;
  current_lga?: any;
  current_ward?: any;
  current_city?: any;
  election_group_name?: string;
  election_date?: any;
  party_name?: string;
  party_short_name?: string;
  state_name?: any;
  lga_name?: any;
  city_name?: any;
  polling_unit_id?: any;
  polling_unit_name?: any;
  agents_count?: number;
  party_logo?: any;
  whatsapp_phone?: any;
  data_phone?: any;
  educational_status?: any;
  highest_degree?: any;
  graduation_year?: any;
  school_name?: any;
  ward_name?: any;
  address?: any;
  role?: string;
  app_state_id?: number;
  app_lga_id?: number;
  app_ward_id?: number;
  degree_certificate_url?: any;

  // Mock data fields
  name?: string;
  avatar_url?: string;
  election?: string;
  residence?: string;
  appliedOn?: string;
  decisionLabel?: string;
  decisionVariant?: "accept" | "reject" | "pending";
  voterId?: string;
  stateId?: number;
  lgaId?: number;
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

export function ApplicationTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <p className="truncate w-full text-[16px]">User</p>
      </TileLeft>

      <TileRight>
        <p className="text-c-50 text-[14px] w-35 hidden lg:block">
          Election
        </p>
        <p className="text-c-50 text-[14px] w-[130px] hidden md:block">
          Role
        </p>
        <p className="text-c-50 text-[14px] w-[160px] hidden md:block">
          Assignment / PU
        </p>
        <p className="text-c-50 text-[14px] w-25 hidden xl:block">
          Agents Count
        </p>
        <p className="text-c-50 text-[14px] w-[160px]">Make decision</p>
      </TileRight>
    </TileHeader>
  );
}

export function ApplicationTableTile({
  data,
  refetch,
}: {
  data: ApplicationType;
  refetch?: () => void;
}) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const approveMutation = useMutation({
    mutationFn: (variables: { id: number; pollingUnitID: number }) =>
      approveApplication({ data: variables }),
    onSuccess: (res) => {
      if (res && res.success) {
        if (refetch) refetch();
      } else {
        throw new Error(res?.message || "Failed to approve application");
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (variables: { id: number; reason: string }) =>
      rejectApplication({ data: variables }),
    onSuccess: (res) => {
      if (res && res.success) {
        if (refetch) refetch();
      } else {
        throw new Error(res?.message || "Failed to reject application");
      }
    },
  });

  const firstName = getPgString(data.first_name);
  const lastName = getPgString(data.last_name);
  const name = data.name || `${firstName} ${lastName}`.trim() || "Unknown User";

  const avatar =
    data.avatar_url ||
    getPgString(data.avatar) ||
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop";
  const election =
    data.election || data.election_group_name || "Upcoming Election";

  const stateName = getPgString(data.state_name);
  const lgaName = getPgString(data.lga_name);
  const cityName = getPgString(data.city_name);

  const lgaVal =
    data.current_lga &&
      typeof data.current_lga === "object" &&
      "Int32" in data.current_lga &&
      data.current_lga.Valid
      ? data.current_lga.Int32
      : data.current_lga;

  let formattedResidence = "";
  if (stateName) formattedResidence += stateName;
  if (lgaName)
    formattedResidence += formattedResidence ? `, ${lgaName}` : lgaName;
  if (cityName)
    formattedResidence += formattedResidence ? `, ${cityName}` : cityName;

  if (!formattedResidence) {
    formattedResidence = `State: ${data.current_state || ""}, LGA: ${lgaVal || ""}`;
  }

  const residence = data.residence || formattedResidence;

  const createdTime = data.created_at?.Time || data.created_at || "";
  const appliedOn = data.appliedOn || formatDate(createdTime);

  const pollingUnitName =
    getPgString(data.polling_unit_name) || "Not Specified";
  const agentsCount = data.agents_count ?? 0;

  const partyLogo = getPgString(data.party_logo);
  const partyShortName = data.party_short_name || "NDC";

  const voterId = data.voterId || "";
  const phone = getPgString(data.phone);

  let decisionLabel = data.decisionLabel || "Accept";
  if (!data.decisionLabel && data.status) {
    if (data.status === "accepted") {
      decisionLabel = "Approved";
    } else if (data.status === "rejected") {
      decisionLabel = "Rejected";
    }
  }
  const decisionVariant =
    data.decisionVariant ||
    (data.status === "pending"
      ? "pending"
      : data.status === "accepted"
        ? "accept"
        : "reject");

  const roleType = data.role || "polling_agent";
  const isSupervisor = roleType !== "polling_agent";
  const wardName = getPgString(data.ward_name);

  let assignmentLocation = pollingUnitName;
  if (isSupervisor) {
    if (roleType === "ward_election_supervisor" || roleType === "ward_supervisor") {
      assignmentLocation = wardName ? `${wardName} Ward` : lgaName ? `${lgaName} LGA` : stateName || "Ward Supervisor";
    } else if (roleType === "lga_election_supervisor" || roleType === "lga_supervisor") {
      assignmentLocation = lgaName ? `${lgaName} LGA` : stateName || "LGA Supervisor";
    } else if (roleType === "state_election_supervisor" || roleType === "state_supervisor") {
      assignmentLocation = stateName ? `${stateName} State` : "State Supervisor";
    }
  }

  const getRoleBadge = (r: string) => {
    switch (r) {
      case "state_election_supervisor":
      case "state_supervisor":
        return {
          label: "State Supervisor",
          className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
        };
      case "lga_election_supervisor":
      case "lga_supervisor":
        return {
          label: "LGA Supervisor",
          className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
        };
      case "ward_election_supervisor":
      case "ward_supervisor":
        return {
          label: "Ward Supervisor",
          className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800",
        };
      default:
        return {
          label: "Polling Agent",
          className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
        };
    }
  };
  const roleBadge = getRoleBadge(roleType);

  const applicationDetails = {
    id: data.id,
    userId: data.user_id,
    status: data.status,
    role: roleType,
    name,
    avatar,
    location: residence,
    election,
    voterId,
    phone: phone || undefined,
    callingPhone: phone || undefined,
    whatsappPhone: getPgString(data.whatsapp_phone) || undefined,
    dataPhone: getPgString(data.data_phone) || undefined,
    schoolName: getPgString(data.school_name) || undefined,
    degree: getPgString(data.highest_degree) || undefined,
    graduationYear: getPgString(data.graduation_year) || undefined,
    educationalStatus: getPgString(data.educational_status) || undefined,
    address: getPgString(data.address) || undefined,
    stateName: stateName || undefined,
    lgaName: lgaName || undefined,
    wardName: wardName || undefined,
    pollingUnitName: pollingUnitName || undefined,
    degreeCertificateUrl: getPgString(data.degree_certificate_url) || undefined,
    wardId: data.app_ward_id || data.current_ward?.Int32 || data.current_ward || undefined,
    pollingUnitId:
      data.polling_unit_id?.Int32 || data.polling_unit_id || undefined,
    electionGroupId: data.election_group_id || undefined,
    partyId: data.party_id || undefined,
    stateId: data.app_state_id || data.current_state || data.stateId,
    lgaId: data.app_lga_id || Number(lgaVal) || data.lgaId || undefined,
    partyLogo: partyLogo,
    partyShortName: partyShortName,
  };

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleTileAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.id === undefined) {
      alert("Application ID is missing");
      return;
    }

    const pollingUnitID =
      data.polling_unit_id &&
        typeof data.polling_unit_id === "object" &&
        "Int32" in data.polling_unit_id &&
        data.polling_unit_id.Valid
        ? data.polling_unit_id.Int32
        : typeof data.polling_unit_id === "number"
          ? data.polling_unit_id
          : undefined;

    if (!pollingUnitID) {
      handleOpenDialog();
      return;
    }

    try {
      await approveMutation.mutateAsync({ id: data.id, pollingUnitID });
    } catch (err: any) {
      alert(err.message || "Failed to approve application");
    }
  };

  const handleTileReject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.id === undefined) {
      alert("Application ID is missing");
      return;
    }
    const reason = window.prompt("Enter rejection reason:");
    if (reason === null) return;
    if (reason.trim() === "") {
      alert("A rejection reason is required.");
      return;
    }
    try {
      await rejectMutation.mutateAsync({ id: data.id, reason });
    } catch (err: any) {
      alert(err.message || "Failed to reject application");
    }
  };

  return (
    <TileRow onClick={handleOpenDialog}>
      <TileLeft>
        <div className="flex items-center gap-4 w-full min-w-0">
          <img
            src={avatar}
            alt={name}
            className="size-9 rounded-full object-cover shrink-0"
          />
          <p className="truncate w-full text-[16px] text-[#222]">{name}</p>
        </div>
      </TileLeft>

      <TileRight>
        <p className="w-35 truncate hidden lg:block text-[#313131]">
          {election}
        </p>
        <div className="w-[130px] hidden md:flex items-center">
          <span
            className={cn(
              "px-2.5 py-0.5 text-xs font-semibold rounded-full border",
              roleBadge.className,
            )}
          >
            {roleBadge.label}
          </span>
        </div>
        <p
          className="w-[160px] truncate hidden md:block text-[#313131]"
          title={assignmentLocation}
        >
          {assignmentLocation}
        </p>
        <p className="w-25 hidden xl:block text-[#313131]">
          {isSupervisor ? "—" : agentsCount}
        </p>
        <div
          className="w-[160px] flex gap-2 justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {decisionVariant === "pending" ? (
            <>
              <Button
                onClick={handleTileAccept}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className="rounded-full bg-[#10dd84] hover:bg-[#08cf79] text-c-80 p-0 size-8 border-none"
              >
                <Check className="size-4 stroke-[3]" />
              </Button>
              <Button
                onClick={handleTileReject}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className="rounded-full bg-[#ececec] hover:bg-[#e6e6e6] text-c-80 p-0 size-8 border-none"
              >
                <X className="size-4 stroke-[3]" />
              </Button>
            </>
          ) : (
            <DecisionPill
              variant={decisionVariant}
              className="w-full max-w-35"
              disabled={true}
            >
              {decisionLabel}
            </DecisionPill>
          )}
        </div>
      </TileRight>

      {isDialogOpen && (
        <PartyApplicationDialog
          open={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            if (refetch) refetch();
          }}
          application={applicationDetails as any}
        />
      )}
    </TileRow>
  );
}

function DecisionPill({
  children,
  variant,
  className,
  onClick,
  disabled,
}: {
  children: string;
  variant: "accept" | "reject" | "pending";
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-8 rounded-[10px] px-3 text-[14px] font-semibold transition truncate text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "accept" &&
        "bg-[#10dd84] text-[#083b25] hover:bg-[#08cf79]",
        variant === "reject" &&
        "bg-[#ececec] text-[#5e6a64] hover:bg-[#e6e6e6]",
        variant === "pending" &&
        "bg-[#ececec] text-[#5e6a64] hover:bg-[#e6e6e6]",
        className,
      )}
    >
      {children}
    </button>
  );
}
