import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteLga } from "#/lib/server/lgas";
import { TileOptions } from "@repo/ui/components/tiles";
import TrashcanIcon from "@repo/ui/icons/trashcan-icon";
import type { TDropdownGroup } from "@repo/ui/lib/types";
import { Pencil } from "lucide-react";
import { DropdownGroupList } from "@repo/ui/components/custom/AppDropdown";
import { DeleteAlertDialog } from "../alerts/delete-alert";
import { LgaFormDialog } from "../dialogs/LgaFormDialog";
import type { LgaType } from "../tiles/lga-tile";

interface LgaDropdownProps {
  data: LgaType;
  className?: string;
}

export const LgaDropdown = ({ data, className }: LgaDropdownProps) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await deleteLga({ data: data.id });
      if (!res.success) {
        throw new Error(res.message || "Failed to delete LGA");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lgas"] });
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

  const lgaForDialog = {
    id: data.id,
    name: data.name,
    code: data.code,
    state_id: data.state_id,
    state_name: data.state_name,
    senatorial_district_id: data.senatorial_district_id,
    senatorial_district_name: data.senatorial_district_name,
    federal_constituency_id: data.federal_constituency_id,
    federal_constituency_name: data.federal_constituency_name,
  };

  return (
    <>
      <TileOptions
        open={openMenu}
        onOpenChange={setOpenMenu}
        dropdown={<DropdownGroupList groups={dropdownData} />}
        className={className}
      />

      <LgaFormDialog
        mode="update"
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        lga={lgaForDialog}
      />

      <DeleteAlertDialog
        open={openDeleteAlert}
        setOpen={setOpenDeleteAlert}
        delete={() => deleteMutation.mutate()}
        isPending={deleteMutation.isPending}
        title="Delete LGA"
        subtitle={`Are you sure you want to permanently delete the LGA "${data.name}"? This action cannot be undone.`}
      />
    </>
  );
};
