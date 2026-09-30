/**
 * @file Party Member Row Action Dropdown
 * @description Provides edit, suspend, and block actions for party members in directory tables and member tiles.
 * Connects to `UserFormDialog` in update mode and manages member status actions.
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TileOptions } from "@repo/ui/components/tiles";
import type { TDropdownGroup } from "@repo/ui/lib/types";
import { Pencil, Ban, UserX } from "lucide-react";
import { DropdownGroupList } from "@repo/ui/components/custom/AppDropdown";
import { ConfirmAlertDialog } from "../alerts/confirm-alert-dialog";
import { UserFormDialog } from "@repo/ui/components/custom/UserFormDialog";
import type { UserType } from "../tiles/user-tile";

// Server Functions for UserFormDialog
import { getAllCountries, getStates, getCities } from "#/lib/server/countries";
import { getParties, getPresignedUploadURL, confirmFileUpload } from "#/lib/server/parties";
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
 * Contextual popover menu offering Edit (via UserFormDialog), Suspend, and Block actions.
 * Only members of the active party can be suspended.
 */
export const UserDropdown = ({ data, partyId, className, refetch }: UserDropdownProps) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openBlockAlert, setOpenBlockAlert] = useState(false);
  const [openSuspendAlert, setOpenSuspendAlert] = useState(false);
  const queryClient = useQueryClient();

  // Check if target user belongs to the currently active party
  const isMemberOfCurrentParty =
    Boolean(partyId && data.party_id && Number(data.party_id) === Number(partyId));

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
      ? [
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
        <ConfirmAlertDialog
          open={openSuspendAlert}
          setOpen={setOpenSuspendAlert}
          onConfirm={() => {
            // Placeholder or mutation for suspending user
            setOpenSuspendAlert(false);
          }}
          headerTitle="Suspend User"
          title={`Are you sure you want to suspend "${name}"?`}
          subtitle={`Suspending this user will temporarily disable their party privileges and access until reactivated. Are you sure you want to continue?`}
          actionText="Suspend User"
        />
      )}

      <ConfirmAlertDialog
        open={openBlockAlert}
        setOpen={setOpenBlockAlert}
        onConfirm={() => {
          // Placeholder or mutation for blocking user
          setOpenBlockAlert(false);
        }}
        headerTitle="Block User"
        title={`Are you sure you want to block "${name}"?`}
        subtitle={`Blocking this user will restrict their access and visibility within the party. Are you sure you want to continue?`}
        actionText="Block User"
      />
    </>
  );
};
