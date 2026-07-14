import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUser } from "#/lib/server/users";
import { TileOptions } from "@repo/ui/components/tiles";
import TrashcanIcon from "@repo/ui/icons/trashcan-icon";
import type { TDropdownGroup } from "@repo/ui/lib/types";
import { Pencil } from "lucide-react";
import { DropdownGroupList } from "@repo/ui/components/custom/AppDropdown";
import { DeleteAlertDialog } from "../alerts/delete-alert";
import { UserFormDialog } from "@repo/ui/components/custom/UserFormDialog";
import type { UserType } from "../tiles/user-tile";

// Server Functions for UserFormDialog
import { getAllCountries, getStates, getCities } from "#/lib/server/countries";
import { getParties, getPresignedUploadURL, confirmFileUpload } from "#/lib/server/parties";
import { registerCandidate } from "#/lib/server/auth/auth";
import { updateUser } from "#/lib/server/users";

interface UserDropdownProps {
  data: UserType;
  className?: string;
  refetch?: () => void;
}

export const UserDropdown = ({ data, className, refetch }: UserDropdownProps) => { // Reload trigger
  const [openMenu, setOpenMenu] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await deleteUser({ data: data.fake_id });
      if (!res.success) {
        throw new Error(res.message || "Failed to delete user");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["party-members"] });
      refetch?.();
      setOpenDeleteAlert(false);
    },
  });

  const group1: TDropdownGroup = [
    {
      title: "Edit",
      icon: <Pencil className="size-4" />,
      action: () => {
        setOpenMenu(false);
        setOpenEditDialog(true);
      },
    },
    {
      title: "Delete",
      icon: <TrashcanIcon />,
      action: () => {
        setOpenMenu(false);
        setOpenDeleteAlert(true);
      },
      className: "[&_svg]:text-red text-red",
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

  const name =
    data.name ||
    [data.first_name, data.last_name].filter(Boolean).join(" ") ||
    data.username ||
    data.email ||
    "User";

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

      <DeleteAlertDialog
        open={openDeleteAlert}
        setOpen={setOpenDeleteAlert}
        delete={() => deleteMutation.mutate()}
        isPending={deleteMutation.isPending}
        title="Delete User"
        subtitle={`Are you sure you want to permanently delete user "${name}"? This action cannot be undone.`}
      />
    </>
  );
};
