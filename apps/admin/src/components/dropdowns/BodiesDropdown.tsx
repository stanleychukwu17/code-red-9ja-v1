import { useState } from "react";
import type { TDropdownGroup } from "@repo/ui/lib/types";
import { DropdownGroupList } from "@repo/ui/components/custom/AppDropdown";
import { Calculator, Ellipsis } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Button } from "@repo/ui/components/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recalculateBodies } from "#/lib/server/states";

interface BodiesDropdownProps {
  className?: string;
}

export const BodiesDropdown = ({ className }: BodiesDropdownProps) => {
  const [openMenu, setOpenMenu] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await recalculateBodies();
      if (res && res.success === false) {
        throw new Error(res.message || "Failed to recalculate bodies");
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["states"] });
      queryClient.invalidateQueries({ queryKey: ["senatorial_districts"] });
      queryClient.invalidateQueries({ queryKey: ["federal_constituencies"] });
      queryClient.invalidateQueries({
        queryKey: ["state_assembly_constituencies"],
      });
      queryClient.invalidateQueries({ queryKey: ["lgas"] });
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      queryClient.invalidateQueries({ queryKey: ["polling_units"] });
    },
  });

  const handleRecalculate = () => {
    setOpenMenu(false);
    toast.promise(mutation.mutateAsync(), {
      loading: "Recalculating metrics for all bodies...",
      success: "Successfully recalculated metrics for all bodies",
      error: (error: any) => error.message || "An error occurred",
    });
  };

  const group1: TDropdownGroup = [
    {
      title: "Recalculate Counts",
      icon: <Calculator className="size-4" />,
      action: handleRecalculate,
    },
  ];

  const dropdownData: TDropdownGroup[] = [group1];

  return (
    <div className={className}>
      <DropdownMenu modal={true} open={openMenu} onOpenChange={setOpenMenu}>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon-xl"
            variant="outline"
            className="size-10 p-0 flex items-center justify-center rounded-full transition hover:[&_svg]:text-c-90"
          >
            <Ellipsis className="size-5 text-c-90" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownGroupList groups={dropdownData} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
