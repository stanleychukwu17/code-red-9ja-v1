import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteElectionGroup,
  updateElectionGroup,
} from "#/lib/server/election_groups";
import { TileOptions } from "@repo/ui/components/tiles";
import TrashcanIcon from "@repo/ui/icons/trashcan-icon";
import type { TDropdownGroup } from "@repo/ui/lib/types";
import { Pencil, CheckCircle2, XCircle } from "lucide-react";
import { DropdownGroupList } from "@repo/ui/components/custom/AppDropdown";
import { DeleteAlertDialog } from "../alerts/delete-alert";
import { ElectionGroupFormDialog } from "../dialogs/ElectionGroupFormDialog";
import type { ElectionGroupType } from "../tiles/election-group-tile";

interface ElectionGroupDropdownProps {
  data: ElectionGroupType;
  className?: string;
}

export const ElectionGroupDropdown = ({
  data,
  className,
}: ElectionGroupDropdownProps) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const queryClient = useQueryClient();

  const isActive = data.active !== false;

  const toggleActiveMutation = useMutation({
    mutationFn: async () => {
      const res = await updateElectionGroup({
        data: {
          id: data.id,
          active: !isActive,
        },
      });
      if (!res.success) {
        throw new Error(res.message || "Failed to update election group status");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["election-groups"] });
      queryClient.invalidateQueries({ queryKey: ["election-groups-select"] });
      queryClient.invalidateQueries({ queryKey: ["elections"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await deleteElectionGroup({ data: data.id });
      if (!res.success) {
        throw new Error(res.message || "Failed to delete election group");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["election-groups"] });
      queryClient.invalidateQueries({ queryKey: ["election-groups-select"] });
      queryClient.invalidateQueries({ queryKey: ["elections"] });
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
      title: isActive ? "Set as Inactive" : "Set as Active",
      icon: isActive ? (
        <XCircle className="size-4 text-amber-500" />
      ) : (
        <CheckCircle2 className="size-4 text-green-500" />
      ),
      action: () => {
        setOpenMenu(false);
        toggleActiveMutation.mutate();
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

  return (
    <>
      <TileOptions
        open={openMenu}
        onOpenChange={setOpenMenu}
        dropdown={<DropdownGroupList groups={dropdownData} />}
        className={className}
      />

      <ElectionGroupFormDialog
        mode="update"
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        electionGroup={data}
      />

      <DeleteAlertDialog
        open={openDeleteAlert}
        setOpen={setOpenDeleteAlert}
        delete={() => deleteMutation.mutate()}
        isPending={deleteMutation.isPending}
        title="Delete Election Group"
        subtitle={`Are you sure you want to permanently delete the election group "${data.name}"? This action cannot be undone.`}
      />
    </>
  );
};
