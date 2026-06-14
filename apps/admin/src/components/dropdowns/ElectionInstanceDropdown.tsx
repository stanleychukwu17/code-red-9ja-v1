import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteElection } from "#/lib/server/elections";
import { TileOptions } from "@repo/ui/components/tiles";
import TrashcanIcon from "@repo/ui/icons/trashcan-icon";
import type { TDropdownGroup } from "@repo/ui/lib/types";
import { Pencil, UsersIcon } from "lucide-react";
import { DropdownGroupList } from "@repo/ui/components/custom/AppDropdown";
import { DeleteAlertDialog } from "../alerts/delete-alert";
import { ElectionInstanceFormDialog } from "../dialogs/ElectionInstanceFormDialog";
import { ManageCandidatesDialog } from "../dialogs/ManageCandidatesDialog";
import type { ElectionInstanceType } from "../tiles/election-instance-tile";

interface ElectionInstanceDropdownProps {
  data: ElectionInstanceType;
  className?: string;
}

export const ElectionInstanceDropdown = ({
  data,
  className,
}: ElectionInstanceDropdownProps) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openCandidatesDialog, setOpenCandidatesDialog] = useState(false);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await deleteElection({ data: data.id });
      if (!res.success) {
        throw new Error(res.message || "Failed to delete election");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elections"] });
      queryClient.invalidateQueries({ queryKey: ["election-groups"] });
      setOpenDeleteAlert(false);
    },
  });

  const group1: TDropdownGroup = [
    {
      title: "Manage Candidates",
      icon: <UsersIcon className="size-4" />,
      action: () => {
        setOpenMenu(false);
        setOpenCandidatesDialog(true);
      },
    },
  ];

  const group2: TDropdownGroup = [
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
  const dropdownData: TDropdownGroup[] = [group1, group2];

  return (
    <>
      <TileOptions
        open={openMenu}
        onOpenChange={setOpenMenu}
        dropdown={<DropdownGroupList groups={dropdownData} />}
        className={className}
      />

      <ElectionInstanceFormDialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        electionInstance={data}
      />

      <ManageCandidatesDialog
        electionId={data.id}
        open={openCandidatesDialog}
        onClose={() => setOpenCandidatesDialog(false)}
      />

      <DeleteAlertDialog
        open={openDeleteAlert}
        setOpen={setOpenDeleteAlert}
        delete={() => deleteMutation.mutate()}
        isPending={deleteMutation.isPending}
        title="Delete Election Instance"
        subtitle={`Are you sure you want to permanently delete the election instance "${data.name}"? This action cannot be undone.`}
      />
    </>
  );
};
