import { useEffect, useRef, useState } from "react";
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
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Invalidates all cached body queries (states, LGAs, wards, PUs, constituencies, districts)
  // so that all open views/tables immediately reflect updated counts and records.
  const invalidateAllBodies = () => {
    QUERY_KEYS.bodies.all.forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey });
    });
  };

  // Polls backend sync status periodically and keeps the toast notification updated
  const pollSyncProgress = (initialStep?: string) => {
    // Use a fixed ID so the same toast is updated in-place rather than stacking
    const toastId = "bodies-sync-toast";
    toast.loading(initialStep || "Syncing electoral units in background...", { id: toastId });

    // Clear any previous interval before starting a new one
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Poll backend status every 5 seconds
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await getSyncStatus();
        const status = res?.data?.status;
        if (!status) return;

        if (status.is_running) {
          // Sync is still in progress: update the toast with the active step
          toast.loading(status.current_step || "Syncing electoral units in background...", {
            id: toastId,
          });
        } else {
          // Sync finished: stop polling
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          // Invalidate React Query caches so UI updates with fresh electoral data
          invalidateAllBodies();

          // Show final result (error or success summary with PU count and duration)
          if (status.error) {
            toast.error(`Sync finished with error: ${status.error}`, {
              id: toastId,
              duration: 8000,
            });
          } else {
            const puCount = status.last_report?.polling_units_processed?.toLocaleString() || "all";
            const dur = status.duration_seconds
              ? ` in ${status.duration_seconds.toFixed(0)}s`
              : "";
            toast.success(
              `Electoral units synchronized successfully (${puCount} PUs processed${dur})`,
              {
                id: toastId,
                duration: 9000,
              }
            );
          }
        }
      } catch {
        // Suppress transient network poll errors to keep polling alive
      }
    }, 5000);
  };

  // Check on mount if a synchronization job is already running from before
  useEffect(() => {
    let isMounted = true;

    getSyncStatus().then((res) => {
      if (!isMounted) return;
      const status = res?.data?.status;

      if (status?.is_running) {
        pollSyncProgress(status.current_step);
      }
    });

    return () => {
      isMounted = false;

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

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

  // Triggers the standard background electoral units sync and starts live progress polling
  const handleSyncElectoralUnits = async () => {
    // Close the dropdown immediately so user can continue interacting with the page
    setOpenMenu(false);

    try {
      // Dispatch API request to kick off the background sync job
      const res = await syncMutation.mutateAsync();
      const status = res?.data?.status;

      // Start polling backend every 5s to track progress and update the toast notification
      pollSyncProgress(status?.current_step || "Starting electoral units sync...");
    } catch (error: any) {
      toast.error(error?.message || "Failed to start electoral units sync");
    }
  };

  // Triggers the state-by-state hierarchy background sync and starts live progress polling
  const handleSyncElectoralUnitsStateFlow = async () => {
    // Close the dropdown immediately
    setOpenMenu(false);
    try {
      // Dispatch API request to kick off the state-flow background sync job
      const res = await syncStateFlowMutation.mutateAsync();
      const status = res?.data?.status;
      // Start polling backend every 5s to track progress and update the toast notification
      pollSyncProgress(status?.current_step || "Starting electoral units sync (State Flow)...");
    } catch (error: any) {
      toast.error(error?.message || "Failed to start electoral units sync (State Flow)");
    }
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
