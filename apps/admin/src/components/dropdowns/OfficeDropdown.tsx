import { useState } from "react";
import { TileOptions } from "@repo/ui/components/tiles";
import type { TDropdownGroup } from "@repo/ui/lib/types";
import { Pencil } from "lucide-react";
import { DropdownGroupList } from "@repo/ui/components/custom/AppDropdown";
import { OfficeFormDialog } from "../dialogs/OfficeFormDialog";
import type { OfficeType } from "../tiles/office-tile";

interface OfficeDropdownProps {
  data: OfficeType;
  className?: string;
}

export const OfficeDropdown = ({
  data,
  className,
}: OfficeDropdownProps) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);

  const group1: TDropdownGroup = [
    {
      title: "Edit",
      icon: <Pencil className="size-4" />,
      action: () => {
        setOpenMenu(false); // close dropdown first
        setOpenEditDialog(true);
      },
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

      <OfficeFormDialog
        mode="update"
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        office={data}
      />
    </>
  );
};
