import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  syncINECResultGrabber,
  toggleINECResultGrabberPause,
} from "#/lib/server/inec_grabber";
import { TileOptions } from "@repo/ui/components/tiles";
import type { TDropdownGroup } from "@repo/ui/lib/types";
import { RefreshCw, Pause, Play } from "lucide-react";
import { DropdownGroupList } from "@repo/ui/components/custom/AppDropdown";
import { toast } from "sonner";
import type { INECResultGrabberType } from "../tiles/inec-grabber-tile";

interface INECGrabberDropdownProps {
  data: INECResultGrabberType;
  className?: string;
}

export const INECGrabberDropdown = ({
  data,
  className,
}: INECGrabberDropdownProps) => {
  const [openMenu, setOpenMenu] = useState(false);
  const queryClient = useQueryClient();

  const isPaused = data.sync_status === "paused";

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await syncINECResultGrabber({
        data: { id: data.id, aiExtract: false, uploadToR2: false },
      });
      if (!res.success) {
        throw new Error(res.message || "Failed to trigger INEC grabber sync");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inec-result-grabbers"] });
      queryClient.invalidateQueries({ queryKey: ["inec-result-grabber-logs"] });
    },
  });

  const togglePauseMutation = useMutation({
    mutationFn: async () => {
      const res = await toggleINECResultGrabberPause({ data: { id: data.id } });
      if (!res.success) {
        throw new Error(res.message || "Failed to toggle INEC grabber status");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inec-result-grabbers"] });
    },
  });

  const handleSync = () => {
    setOpenMenu(false);
    toast.promise(syncMutation.mutateAsync(), {
      loading: "Syncing INEC results...",
      success: "INEC grabber sync triggered successfully.",
      error: (error: any) => error.message || "Failed to trigger sync",
    });
  };

  const handleTogglePause = () => {
    setOpenMenu(false);
    toast.promise(togglePauseMutation.mutateAsync(), {
      loading: isPaused ? "Resuming sync..." : "Pausing sync...",
      success: isPaused
        ? "INEC grabber sync resumed."
        : "INEC grabber sync paused.",
      error: (error: any) => error.message || "Failed to toggle status",
    });
  };

  const group1: TDropdownGroup = [
    {
      title: "Sync Now",
      icon: <RefreshCw className="size-4" />,
      action: handleSync,
      disabled: syncMutation.isPending || isPaused,
    },
    {
      title: isPaused ? "Resume Sync" : "Pause Sync",
      icon: isPaused ? (
        <Play className="size-4" />
      ) : (
        <Pause className="size-4" />
      ),
      action: handleTogglePause,
      disabled: togglePauseMutation.isPending,
    },
  ];

  const dropdownData: TDropdownGroup[] = [group1];

  return (
    <TileOptions
      open={openMenu}
      onOpenChange={setOpenMenu}
      dropdown={<DropdownGroupList groups={dropdownData} />}
      className={className}
    />
  );
};
