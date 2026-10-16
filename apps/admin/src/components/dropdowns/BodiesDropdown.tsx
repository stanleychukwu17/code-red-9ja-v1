import { useState } from "react";
import type { TDropdownGroup } from "@repo/ui/lib/types";
import { DropdownGroupList } from "@repo/ui/components/custom/AppDropdown";
import { Calculator, Ellipsis, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Button } from "@repo/ui/components/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  recalculateBodies,
  syncElectoralUnits,
  syncElectoralUnitsStateFlow,
} from "#/lib/server/states";
import { QUERY_KEYS } from "#/lib/config";

interface BodiesDropdownProps {
  className?: string;
}

/**
 * BodiesDropdown
 * 
 * An administrative action menu (ellipsis icon) rendered in the bodies header.
 * Allows administrators to trigger backend jobs for:
 *  1. Recalculating aggregate counts across all geographic bodies.
 *  2. Syncing electoral units (full flow).
 *  3. Syncing electoral units (state-level flow).
 */
export const BodiesDropdown = ({ className }: BodiesDropdownProps) => {
  const [openMenu, setOpenMenu] = useState(false);
  const queryClient = useQueryClient();

  // Invalidates all cached body queries (states, LGAs, wards, PUs, constituencies, districts)
  // so that all open views/tables immediately reflect updated counts and records.
  const invalidateAllBodies = () => {
    QUERY_KEYS.bodies.all.forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey });
    });
  };

  // Mutation 1: Recalculate rollup counts across all political/geographic bodies
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await recalculateBodies();
      if (res && res.success === false) {
        throw new Error(res.message || "Failed to recalculate bodies");
      }
      return res;
    },
    onSuccess: invalidateAllBodies,
  });

  // Mutation 2: Synchronize electoral units from source data
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await syncElectoralUnits();
      if (res && res.success === false) {
        throw new Error(res.message || "Failed to sync electoral units");
      }
      return res;
    },
    onSuccess: invalidateAllBodies,
  });

  // Mutation 3: Synchronize electoral units using the state-by-state hierarchy flow
  const syncStateFlowMutation = useMutation({
    mutationFn: async () => {
      const res = await syncElectoralUnitsStateFlow();
      if (res && res.success === false) {
        throw new Error(
          res.message || "Failed to sync electoral units (State Flow)"
        );
      }
      return res;
    },
    onSuccess: invalidateAllBodies,
  });

  // Action handlers: close the menu and display toast notifications for async progress
  const handleRecalculate = () => {
    setOpenMenu(false);
    toast.promise(mutation.mutateAsync(), {
      loading: "Recalculating metrics for all bodies...",
      success: "Successfully recalculated metrics for all bodies",
      error: (error: any) => error.message || "An error occurred",
    });
  };

  const handleSyncElectoralUnits = () => {
    setOpenMenu(false);
    toast.promise(syncMutation.mutateAsync(), {
      loading: "Syncing electoral units...",
      success: "Successfully synced electoral units",
      error: (error: any) => error.message || "An error occurred",
    });
  };

  const handleSyncElectoralUnitsStateFlow = () => {
    setOpenMenu(false);
    toast.promise(syncStateFlowMutation.mutateAsync(), {
      loading: "Syncing electoral units (State Flow)...",
      success: "Successfully synced electoral units (State Flow)",
      error: (error: any) => error.message || "An error occurred",
    });
  };

  // Dropdown menu items configuration
  const group1: TDropdownGroup = [
    {
      title: "Recalculate Counts",
      icon: <Calculator className="size-4" />,
      action: handleRecalculate,
    },
    {
      title: "Sync Electoral Units",
      icon: <RefreshCw className="size-4" />,
      action: handleSyncElectoralUnits,
    },
    {
      title: "Sync Electoral Units (State Flow)",
      icon: <RefreshCw className="size-4" />,
      action: handleSyncElectoralUnitsStateFlow,
    },
  ];

  const dropdownData: TDropdownGroup[] = [group1];

  return (
    <div className={className}>
      <DropdownMenu modal={true} open={openMenu} onOpenChange={setOpenMenu}>
        {/* Three-dots icon trigger button */}
        <DropdownMenuTrigger asChild>
          <Button
            size="icon-xl"
            variant="outline"
            className="size-10 p-0 flex items-center justify-center rounded-full transition hover:[&_svg]:text-c-90"
          >
            <Ellipsis className="size-5 text-c-90" />
          </Button>
        </DropdownMenuTrigger>

        {/* Dropdown menu action list */}
        <DropdownMenuContent align="end" className="w-64">
          <DropdownGroupList groups={dropdownData} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
