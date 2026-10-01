/**
 * @file Party Member Row Action Dropdown
 * @description Provides edit, suspend, and block actions for party members in directory tables and member tiles.
 * Connects to `UserFormDialog` in update mode and manages member status actions.
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TileOptions } from "@repo/ui/components/tiles";
import type { TDropdownGroup } from "@repo/ui/lib/types";
import { Pencil, Ban, UserX, UserCheck } from "lucide-react";
import { DropdownGroupList } from "@repo/ui/components/custom/AppDropdown";
import { ConfirmAlertDialog } from "../alerts/confirm-alert-dialog";
import { UserFormDialog } from "@repo/ui/components/custom/UserFormDialog";
import type { UserType } from "../tiles/user-tile";
import { toast } from "sonner";

// Server Functions for UserFormDialog and Actions
import { getAllCountries, getStates, getCities } from "#/lib/server/countries";
import {
  getParties,
  getPresignedUploadURL,
  confirmFileUpload,
  suspendPartyMember,
  unsuspendPartyMember,
  blockPartyMember,
} from "#/lib/server/parties";
import { registerCandidate } from "#/lib/server/auth/auth";
import { updateUser } from "#/lib/server/users";

interface UserDropdownProps {
  data: UserType;
  partyId?: number;
  className?: string;
  refetch?: () => void;
}

/**
 * UserDropdown Component
 * Contextual popover menu offering Edit (via UserFormDialog), Suspend/Unsuspend, and Block actions.
 * Only members of the active party can be suspended or unsuspended.
 */
export const UserDropdown = ({ data, partyId, className, refetch }: UserDropdownProps) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openBlockAlert, setOpenBlockAlert] = useState(false);
  const [openSuspendAlert, setOpenSuspendAlert] = useState(false);
  const [openUnsuspendAlert, setOpenUnsuspendAlert] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);
  const [isUnsuspending, setIsUnsuspending] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const queryClient = useQueryClient();

  // Check if target user belongs to the currently active party
  const isMemberOfCurrentParty =
    Boolean(partyId && data.party_id && Number(data.party_id) === Number(partyId));

  const isSuspended =
    data.account_status === "suspended" ||
    data.status === "suspended";

  const handleSuspend = async () => {
    if (!partyId) return;
    setIsSuspending(true);
    try {
      const res = await suspendPartyMember({
        data: {
          partyId,
          userId: data.id,
        },
      });
      if (res && res.success) {
        toast.success("Member suspended successfully");
        setOpenSuspendAlert(false);
        queryClient.invalidateQueries({ queryKey: ["party-members"] });
        refetch?.();
      } else {
        toast.error(res?.message || "Failed to suspend member");
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred while suspending member");
    } finally {
      setIsSuspending(false);
    }
  };

  const handleUnsuspend = async () => {
    if (!partyId) return;
    setIsUnsuspending(true);
    try {
      const res = await unsuspendPartyMember({
        data: {
          partyId,
          userId: data.id,
        },
      });
      if (res && res.success) {
        toast.success("Member reinstated successfully");
        setOpenUnsuspendAlert(false);
        queryClient.invalidateQueries({ queryKey: ["party-members"] });
        refetch?.();
      } else {
        toast.error(res?.message || "Failed to reinstate member");
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred while reinstating member");
    } finally {
      setIsUnsuspending(false);
    }
  };

  const handleBlock = async () => {
    if (!partyId) return;
    setIsBlocking(true);
    try {
      const res = await blockPartyMember({
        data: {
          partyId,
          userId: data.id,
        },
      });
      if (res && res.success) {
        toast.success("User blocked from party successfully");
        setOpenBlockAlert(false);
        queryClient.invalidateQueries({ queryKey: ["party-members"] });
        refetch?.();
      } else {
        toast.error(res?.message || "Failed to block user");
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred while blocking user");
    } finally {
      setIsBlocking(false);
    }
  };

  const group1: TDropdownGroup = [
    {
      title: "Edit",
      icon: <Pencil className="size-4" />,
      action: () => {
        setOpenMenu(false);
        setOpenEditDialog(true);
      },
    },
    ...(isMemberOfCurrentParty
      ? isSuspended
        ? [
            {
              title: "Reactivate User",
              icon: <UserCheck className="size-4" />,
              action: () => {
                setOpenMenu(false);
                setOpenUnsuspendAlert(true);
              },
              className: "[&_svg]:text-emerald-500 text-emerald-500",
            },
          ]
        : [
            {
              title: "Suspend User",
              icon: <UserX className="size-4" />,
              action: () => {
                setOpenMenu(false);
                setOpenSuspendAlert(true);
              },
              className: "[&_svg]:text-amber-500 text-amber-500",
            },
          ]
      : []),
    {
      title: "Block User",
      icon: <Ban className="size-4" />,
      action: () => {
        setOpenMenu(false);
        setOpenBlockAlert(true);
      },
      className: "[&_svg]:text-orange-500 text-orange-500",
    },
  ];
  const dropdownData: TDropdownGroup[] = [group1];

  const userForDialog = {
    id: data.id,
    fake_id: data.fake_id,
    first_name: data.first_name,
    last_name: data.last_name,
    middle_name: data.middle_name,
    gender: data.gender,
    date_of_birth: data.date_of_birth,
    current_country: data.current_country,
    current_state: data.current_state,
    current_city: data.current_city,
    state_of_origin: data.state_of_origin,
    party_id: data.party_id,
    email: data.email,
    role: data.role,
    role_level: data.role_level,
    avatar: data.avatar || data.avatar_url,
  };

  const name = [data.first_name, data.last_name].filter(Boolean).join(" ");

  return (
    <>
      <TileOptions
        open={openMenu}
        onOpenChange={setOpenMenu}
        dropdown={<DropdownGroupList groups={dropdownData} />}
        className={className}
      />

      <UserFormDialog
        mode="update"
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        user={userForDialog}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["party-members"] });
          refetch?.();
        }}
        getAllCountries={getAllCountries}
        getStates={getStates}
        getCities={getCities}
        getParties={getParties}
        getPresignedUploadURL={getPresignedUploadURL}
        confirmFileUpload={confirmFileUpload}
        registerCandidate={registerCandidate}
        updateUser={updateUser}
      />

      {isMemberOfCurrentParty && (
        <>
          <ConfirmAlertDialog
            open={openSuspendAlert}
            setOpen={setOpenSuspendAlert}
            onConfirm={handleSuspend}
            isPending={isSuspending}
            headerTitle="Suspend User"
            title={`Are you sure you want to suspend "${name}"?`}
            subtitle={`Suspending this user will remove them from all party positions they hold and temporarily disable their party privileges and access until reactivated. Are you sure you want to continue?`}
            actionText={isSuspending ? "Suspending..." : "Suspend User"}
            actionVariant="red"
          />

          <ConfirmAlertDialog
            open={openUnsuspendAlert}
            setOpen={setOpenUnsuspendAlert}
            onConfirm={handleUnsuspend}
            isPending={isUnsuspending}
            headerTitle="Reactivate User"
            title={`Are you sure you want to reactivate "${name}"?`}
            subtitle={`Reactivating this user will restore their active party membership. Any previously vacated positions will need to be re-appointed.`}
            actionText={isUnsuspending ? "Reactivating..." : "Reactivate User"}
            actionVariant="primary"
          />
        </>
      )}

      <ConfirmAlertDialog
        open={openBlockAlert}
        setOpen={setOpenBlockAlert}
        onConfirm={handleBlock}
        isPending={isBlocking}
        headerTitle="Block User"
        title={`Are you sure you want to block "${name}"?`}
        subtitle={`Blocking this user will remove them from the party entirely and revoke all party positions they hold. Are you sure you want to continue?`}
        actionText={isBlocking ? "Blocking..." : "Block User"}
        actionVariant="red"
      />
    </>
  );
};

