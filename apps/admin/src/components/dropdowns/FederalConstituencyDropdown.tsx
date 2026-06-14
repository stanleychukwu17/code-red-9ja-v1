import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteFederalConstituency } from "#/lib/server/federal_constituencies";
import { TileOptions } from "@repo/ui/components/tiles";
import TrashcanIcon from "@repo/ui/icons/trashcan-icon";
import type { TDropdownGroup } from "@repo/ui/lib/types";
import { Pencil } from "lucide-react";
import { DropdownGroupList } from "@repo/ui/components/custom/AppDropdown";
import { DeleteAlertDialog } from "../alerts/delete-alert";
import { FederalConstituencyFormDialog } from "../dialogs/FederalConstituencyFormDialog";
import type { FederalConstituencyType } from "../tiles/federal-constituency-tile";

interface FederalConstituencyDropdownProps {
  data: FederalConstituencyType;
  className?: string;
}

export const FederalConstituencyDropdown = ({
  data,
  className,
}: FederalConstituencyDropdownProps) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await deleteFederalConstituency({ data: data.id });
      if (!res.success) {
        throw new Error(res.message || "Failed to delete federal constituency");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["federal-constituencies"] });
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
    state_id: data.state_id,
    state_name: data.state_name,
    senatorial_district_id: data.senatorial_district_id,
    senatorial_district_name: data.senatorial_district_name,
  };

  return (
    <>
      <TileOptions
        open={openMenu}
        onOpenChange={setOpenMenu}
        dropdown={<DropdownGroupList groups={dropdownData} />}
        className={className}
      />

      <FederalConstituencyFormDialog
        mode="update"
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        federalConstituency={entityForDialog}
      />

      <DeleteAlertDialog
        open={openDeleteAlert}
        setOpen={setOpenDeleteAlert}
        delete={() => deleteMutation.mutate()}
        isPending={deleteMutation.isPending}
        title="Delete Federal Constituency"
        subtitle={`Are you sure you want to permanently delete "${data.name}"? This action cannot be undone.`}
      />
    </>
  );
};
