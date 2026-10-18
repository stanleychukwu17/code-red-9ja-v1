import { useEffect, useRef, useState } from "react";
import type { TDropdownGroup } from "@repo/ui/lib/types";
import { DropdownGroupList } from "@repo/ui/components/custom/AppDropdown";
import { Calculator, Ellipsis, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Button } from "@repo/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSyncStatus,
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
  const wasRunningRef = useRef(false);

  // Invalidates all cached body queries (states, LGAs, wards, PUs, constituencies, districts)
  // so that all open views/tables immediately reflect updated counts and records.
  const invalidateAllBodies = () => {
    QUERY_KEYS.bodies.all.forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey });
    });
  };

  // TanStack Query to manage and poll electoral units background synchronization status
  const { data: syncStatusResponse } = useQuery({
    queryKey: QUERY_KEYS.bodies.syncStatus,
    queryFn: async () => {
      const res = await getSyncStatus();
      if (res && res.success === false) {
        throw new Error(res.message || "Failed to fetch sync status");
      }
      return res;
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    refetchInterval: (query) => {
      const isRunning = query.state.data?.data?.status?.is_running;
      return isRunning ? 4000 : false;
    },
  });

  // Sync status helpers
  const syncStatus = syncStatusResponse?.data?.status;
  const isSyncRunning = Boolean(syncStatus?.is_running);

  // Reactively updates the toast notification and invalidates cached data on sync completion
  useEffect(() => {
    if (!syncStatus) return;
    const toastId = "bodies-sync-toast";

    if (isSyncRunning) {
      // Show or update progress toast while syncing
      wasRunningRef.current = true;
      toast.loading(syncStatus.current_step, { id: toastId });

    } else if (wasRunningRef.current) {
      // Just completed: reset tracking ref and refresh all body tables
      wasRunningRef.current = false;
      invalidateAllBodies();

      if (syncStatus.error) {
        toast.error(`Sync finished with error: ${syncStatus.error}`, { id: toastId, duration: 8000 });
      } else {
        // Format sync metrics (processed counts & elapsed time)
        const puCount = syncStatus.last_report?.polling_units_processed?.toLocaleString() || "all";
        const dur = syncStatus.duration_seconds ? ` in ${syncStatus.duration_seconds.toFixed(0)}s` : "";

        toast.success(
          `Electoral units synchronized successfully (${puCount} PUs processed${dur})`,
          { id: toastId, duration: 9000 }
        );
      }
    }
  }, [syncStatus, isSyncRunning]);

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
        throw new Error(res.message || "Failed to start electoral units sync");
      }
      return res;
    },
  });

  // Mutation 3: Synchronize electoral units using the state-by-state hierarchy flow
  const syncStateFlowMutation = useMutation({
    mutationFn: async () => {
      const res = await syncElectoralUnitsStateFlow();
      if (res && res.success === false) {
        throw new Error(
          res.message || "Failed to start electoral units sync (State Flow)"
        );
      }
      return res;
    },
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

  // Triggers the standard background electoral units sync and updates status query
  const handleSyncElectoralUnits = async () => {
    setOpenMenu(false);
    const toastId = "bodies-sync-toast";
    toast.loading("Starting electoral units sync...", { id: toastId });

    try {
      const res = await syncMutation.mutateAsync();
      if (res?.data?.status) {
        queryClient.setQueryData(QUERY_KEYS.bodies.syncStatus, res);
      } else {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bodies.syncStatus });
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to start electoral units sync", {
        id: toastId,
      });
    }
  };

  // Triggers the state-by-state hierarchy background sync and updates status query
  const handleSyncElectoralUnitsStateFlow = async () => {
    setOpenMenu(false);
    const toastId = "bodies-sync-toast";
    toast.loading("Starting electoral units sync (State Flow)...", { id: toastId });

    try {
      const res = await syncStateFlowMutation.mutateAsync();
      if (res?.data?.status) {
        queryClient.setQueryData(QUERY_KEYS.bodies.syncStatus, res);
      } else {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bodies.syncStatus });
      }
    } catch (error: any) {
      toast.error(
        error?.message || "Failed to start electoral units sync (State Flow)",
        { id: toastId }
      );
    }
  };

  const isSyncPending =
    isSyncRunning || syncMutation.isPending || syncStateFlowMutation.isPending;

  // Dropdown menu items configuration
  const group1: TDropdownGroup = [
    {
      title: "Recalculate Counts",
      icon: mutation.isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Calculator className="size-4" />
      ),
      action: handleRecalculate,
      disabled: mutation.isPending || isSyncPending,
    },
    {
      title: isSyncRunning ? "Syncing Electoral Units..." : "Sync Electoral Units",
      icon: isSyncRunning ? (
        <RefreshCw className="size-4 animate-spin text-primary" />
      ) : (
        <RefreshCw className="size-4" />
      ),
      action: handleSyncElectoralUnits,
      disabled: isSyncPending,
    },
    {
      title: isSyncRunning
        ? "Syncing (State Flow)..."
        : "Sync Electoral Units (State Flow)",
      icon: isSyncRunning ? (
        <RefreshCw className="size-4 animate-spin text-primary" />
      ) : (
        <RefreshCw className="size-4" />
      ),
      action: handleSyncElectoralUnitsStateFlow,
      disabled: isSyncPending,
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
            {isSyncRunning ? (
              <RefreshCw className="size-5 text-primary animate-spin" />
            ) : (
              <Ellipsis className="size-5 text-c-90" />
            )}
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
