import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUser } from "#/lib/server/users";
import { TileOptions } from "@repo/ui/components/tiles";
import TrashcanIcon from "@repo/ui/icons/trashcan-icon";
import type { TDropdownGroup } from "@repo/ui/lib/types";
import { Pencil, Plus, Award } from "lucide-react";
import { DropdownGroupList } from "@repo/ui/components/custom/AppDropdown";
import { DeleteAlertDialog } from "../alerts/delete-alert";
import { UserFormDialog } from "../dialogs/UserFormDialog";
import { UserRoleDialog } from "../dialogs/UserRoleDialog";
import { UserBadgeDialog } from "../dialogs/UserBadgeDialog";
import type { UserType } from "../tiles/user-tile";

interface UserDropdownProps {
  data: UserType;
  className?: string;
  refetch?: () => void;
}

export const UserDropdown = ({ data, className, refetch }: UserDropdownProps) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [openBadgeDialog, setOpenBadgeDialog] = useState(false);
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
      queryClient.invalidateQueries({ queryKey: ["users"] });
      refetch?.();
      setOpenDeleteAlert(false);
    },
  });

  const group1: TDropdownGroup = [
    {
      title: "Edit user info",
      icon: <Pencil className="size-4" />,
      action: () => {
        setOpenMenu(false);
        setOpenEditDialog(true);
      },
      className: "cursor-pointer!",
    },
    {
      title: "Add/Edit user role",
      icon: <Plus className="size-4" />,
      action: () => {
        setOpenMenu(false);
        setOpenRoleDialog(true);
      },
      className: "cursor-pointer!",
    },
    {
      title: "Add/Edit badge",
      icon: <Award className="size-4" />,
      action: () => {
        setOpenMenu(false);
        setOpenBadgeDialog(true);
      },
      className: "cursor-pointer!",
    },
    {
      title: "Delete user account",
      icon: <TrashcanIcon />,
      action: () => {
        setOpenMenu(false);
        setOpenDeleteAlert(true);
      },
      className: "cursor-pointer! [&_svg]:text-red text-red",
    },
  ];
  const dropdownData: TDropdownGroup[] = [group1];

  const userDetails = {
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
    avatar: data.avatar || data.avatar_url,
  };

  const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || data.username || "User";

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
        user={userDetails}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["users"] });
          refetch?.();
        }}
      />

      <UserRoleDialog
        open={openRoleDialog}
        onClose={() => setOpenRoleDialog(false)}
        user={userDetails}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["users"] });
          refetch?.();
        }}
      />

      <UserBadgeDialog
        open={openBadgeDialog}
        onClose={() => setOpenBadgeDialog(false)}
        page={userDetails}
        forWho="user"
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["users"] });
          refetch?.();
        }}
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
