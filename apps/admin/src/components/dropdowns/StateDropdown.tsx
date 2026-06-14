import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteState } from "#/lib/server/states";
import { TileOptions } from "@repo/ui/components/tiles";
import TrashcanIcon from "@repo/ui/icons/trashcan-icon";
import type { TDropdownGroup } from "@repo/ui/lib/types";
import { Pencil } from "lucide-react";
import { DropdownGroupList } from "@repo/ui/components/custom/AppDropdown";
import { DeleteAlertDialog } from "../alerts/delete-alert";
import { StateFormDialog } from "../dialogs/StateFormDialog";
import type { StateType } from "../tiles/state-tile";

interface StateDropdownProps {
  data: StateType;
  className?: string;
}

export const StateDropdown = ({ data, className }: StateDropdownProps) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await deleteState({ data: data.id });
      if (!res.success) {
        throw new Error(res.message || "Failed to delete state");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["states"] });
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

  const stateForDialog = {
    id: data.id,
    name: data.name,
    country_id: data.country_id,
    country_code: data.country_code,
    latitude: data.latitude,
    longitude: data.longitude,
  };

  return (
    <>
      <TileOptions
        open={openMenu}
        onOpenChange={setOpenMenu}
        dropdown={<DropdownGroupList groups={dropdownData} />}
        className={className}
      />

      <StateFormDialog
        mode="update"
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        state={stateForDialog}
      />

      <DeleteAlertDialog
        open={openDeleteAlert}
        setOpen={setOpenDeleteAlert}
        delete={() => deleteMutation.mutate()}
        isPending={deleteMutation.isPending}
        title="Delete State"
        subtitle={`Are you sure you want to permanently delete the state "${data.name}"? This action cannot be undone.`}
      />
    </>
  );
};
