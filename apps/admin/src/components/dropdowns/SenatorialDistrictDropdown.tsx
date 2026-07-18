import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteSenatorialDistrict } from "#/lib/server/senatorial_districts";
import { TileOptions } from "@repo/ui/components/tiles";
import TrashcanIcon from "@repo/ui/icons/trashcan-icon";
import type { TDropdownGroup } from "@repo/ui/lib/types";
import { Pencil } from "lucide-react";
import { DropdownGroupList } from "@repo/ui/components/custom/AppDropdown";
import { DeleteAlertDialog } from "../alerts/delete-alert";
import { SenatorialDistrictFormDialog } from "../dialogs/SenatorialDistrictFormDialog";
import type { DistrictType } from "../tiles/district-tile";

interface SenatorialDistrictDropdownProps {
  data: DistrictType;
  className?: string;
}

export const SenatorialDistrictDropdown = ({
  data,
  className,
}: SenatorialDistrictDropdownProps) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await deleteSenatorialDistrict({ data: data.id });
      if (!res.success) {
        throw new Error(res.message || "Failed to delete senatorial district");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["senatorial-districts"] });
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

  const entityForDialog = {
    id: data.id,
    name: data.name,
    description: data.description,
    coalition_center: data.coalition_center,
    state_id: data.state_id,
    state_name: data.state_name,
  };

  return (
    <>
      <TileOptions
        open={openMenu}
        onOpenChange={setOpenMenu}
        dropdown={<DropdownGroupList groups={dropdownData} />}
        className={className}
      />

      <SenatorialDistrictFormDialog
        mode="update"
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        senatorialDistrict={entityForDialog}
      />

      <DeleteAlertDialog
        open={openDeleteAlert}
        setOpen={setOpenDeleteAlert}
        delete={() => deleteMutation.mutate()}
        isPending={deleteMutation.isPending}
        title="Delete Senatorial District"
        subtitle={`Are you sure you want to permanently delete "${data.name}"? This action cannot be undone.`}
      />
    </>
  );
};
