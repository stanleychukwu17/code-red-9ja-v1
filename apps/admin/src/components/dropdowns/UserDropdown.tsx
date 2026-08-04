import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUser, deleteFile } from "#/lib/server/users";
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

export const UserDropdown = ({
  data: userDetails,
  className,
  refetch,
}: UserDropdownProps) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [openBadgeDialog, setOpenBadgeDialog] = useState(false);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const queryClient = useQueryClient();

  // Mutation to handle deleting a user account
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await deleteUser({ data: userDetails.fake_id as number });
      if (!res.success) {
        throw new Error(res.message || "Failed to delete user");
      }
      return res.data;
    },

    // Callback function executed after a successful deletion
    onSuccess: () => {
      // Manually update the React Query cache to remove the deleted user.
      // This prevents the need to refetch the entire list from the server.
      queryClient.setQueriesData(
        { queryKey: ["users-list"] },
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => {
              return {
                ...page,
                data: {
                  ...page.data,
                  // Filter out the deleted user by their fake_id
                  users: page.data?.users?.filter((u: any) =>
                    u.fake_id !== userDetails.fake_id
                  ) || []
                }
              };
            })
          };
        }
      );

      // Show a success message and close the confirmation dialog
      toast.success("User deleted successfully");
      setOpenDeleteAlert(false);
    },
  });

  // list of items in the dropdown
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

  // display name of the user
  const name = [userDetails.first_name, userDetails.last_name].filter(Boolean).join(" ") || userDetails.username || "User";

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
        deleteFile={deleteFile}
      />

      <UserRoleDialog
        open={openRoleDialog}
        onClose={() => setOpenRoleDialog(false)}
        user={userDetails}
        onSuccess={() => {
          // setOpenRoleDialog(false)
        }}
      />

      <UserBadgeDialog
        open={openBadgeDialog}
        onClose={() => setOpenBadgeDialog(false)}
        page={userDetails}
        forWho="user"
        onSuccess={() => {
          setOpenBadgeDialog(false)
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
