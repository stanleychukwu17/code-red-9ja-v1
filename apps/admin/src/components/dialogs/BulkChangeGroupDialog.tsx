import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ElectionGroupBullet } from "@repo/ui/components/bullets/election-group-bullet";
import { getElectionGroups } from "#/lib/server/election_groups";
import { bulkUpdateElectionGroup } from "#/lib/server/elections";
import { TinyError } from "@repo/ui/components/custom/TinyError";
import type { ElectionInstanceType } from "../tiles/election-instance-tile";
import { toast } from "sonner";

interface BulkChangeGroupDialogProps {
  open: boolean;
  onClose: () => void;
  selectedElections: ElectionInstanceType[];
  onSuccess?: () => void;
}

export function BulkChangeGroupDialog({
  open,
  onClose,
  selectedElections,
  onSuccess,
}: BulkChangeGroupDialogProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<number | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGroupId) {
        throw new Error("Please select an election group");
      }
      if (selectedElections.length === 0) {
        throw new Error("No elections selected");
      }

      const res = await bulkUpdateElectionGroup({
        data: {
          items: selectedElections.map((e) => ({
            id: e.id,
            name: e.name,
            election_date: e.election_date,
          })),
          election_group_id: selectedGroupId,
        },
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to update election groups");
      }
      return res;
    },
    onSuccess: (res) => {
      toast.success(
        res.message ||
        `Successfully reassigned ${selectedElections.length} elections.`,
      );
      queryClient.invalidateQueries({ queryKey: ["elections"] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err?.message || "Something went wrong. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-120 p-0 rounded-2xl border-none shadow-2xl overflow-visible">
        <DialogHeader title="Change Election Group" />

        <DialogPadding className="space-y-4 pb-6">
          <TinyError error={error} />

          <p className="text-sm text-c-60 leading-relaxed">
            Reassign{" "}
            <span className="font-bold text-c-90">
              {selectedElections.length}
            </span>{" "}
            selected election{selectedElections.length === 1 ? "" : "s"} to a
            different Election Group.
          </p>

          <div className="pt-2 flex flex-col gap-2">
            <span className="text-xs font-semibold text-c-70 uppercase tracking-wide">
              Target Election Group
            </span>
            <div className="flex items-center">
              <ElectionGroupBullet
                selectedId={selectedGroupId}
                variant="bullet"
                update={(item) => {
                  setSelectedGroupId(item.id);
                  setError(null);
                }}
                fetchElectionGroups={getElectionGroups}
              />
            </div>
          </div>
        </DialogPadding>

        <DialogFooter className="flex items-center justify-end gap-3 px-6 pb-6">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => updateMutation.mutate()}
            disabled={!selectedGroupId || updateMutation.isPending}
            className="h-11 px-6 bg-success hover:bg-success-hover text-[16px] font-bold text-white rounded-xl cursor-pointer flex items-center gap-2"
          >
            {updateMutation.isPending && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Update {selectedElections.length} Elections
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
