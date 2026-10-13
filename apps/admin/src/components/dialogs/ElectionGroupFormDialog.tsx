/**
 * @file Election Group Form Dialog
 * @description Modal dialog used in the admin portal to create or update an Election Group
 * (e.g. "2027 General Elections"), managing its display name, priority rank order, and scheduled date.
 * When updating, automatically cascades date changes to all child elections within the group.
 */

import { useState, useEffect } from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SelectRank } from "@repo/ui/components/selects/rank-select";
import { SelectDate } from "@repo/ui/components/selects/date-select";
import {
  createElectionGroup,
  updateElectionGroup,
} from "#/lib/server/election_groups";
import { getElections, updateElection } from "#/lib/server/elections";
import { Loader2 } from "lucide-react";
import { FancyInput } from "@repo/ui/components/input";
import type { ElectionGroupType } from "../tiles/election-group-tile";
import { TinyError } from "@repo/ui/components/custom/TinyError";

export type ElectionGroupFormDialogProps = {
  electionGroup?: ElectionGroupType;
  open: boolean;
  onClose: () => void;
  mode?: "create" | "update";
  onSuccess?: (groupId: number, electionDate?: string) => void;
};

export function ElectionGroupFormDialog({ electionGroup, open, onClose, mode = "create", onSuccess }: ElectionGroupFormDialogProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // TanStack Form configuration with default values and submit handler
  const form = useForm({
    defaultValues: {
      name: "",
      rank: "1",
      electionDate: "",
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  // Synchronize form fields whenever the modal opens or the target group changes
  useEffect(() => {
    if (open) {
      if (mode === "update" && electionGroup) {
        // Pre-fill form fields when editing an existing group
        const cleanDate = electionGroup.election_date
          ? (electionGroup.election_date.split("T")[0] ?? "")
          : "";
        form.setFieldValue("name", electionGroup.name || "");
        form.setFieldValue("rank", String(electionGroup.rank || 1));
        form.setFieldValue("electionDate", cleanDate);
      } else {
        // Reset form to blank defaults for creating a new group
        form.setFieldValue("name", "");
        form.setFieldValue("rank", "1");
        form.setFieldValue("electionDate", "");
      }
      setError(null);
    }
  }, [open, mode, electionGroup]);

  // Mutation handling both group creation and updates with date cascading
  const saveMutation = useMutation({
    mutationFn: async (values: { name: string; rank: string; electionDate: string; }) => {
      if (!values.electionDate) {
        throw new Error("Election date is required");
      }
      const rankNum = Number(values.rank) || 1;
      const cleanDate = values.electionDate
        ? (values.electionDate.split("T")[0] ?? "")
        : "";

      let res;
      if (mode === "update") {
        if (!electionGroup?.id) {
          throw new Error("Missing ID for update");
        }
        // 1. Update the parent election group record
        res = await updateElectionGroup({
          data: {
            id: electionGroup.id,
            name: values.name.trim(),
            rank: rankNum,
            elections_count: electionGroup.elections_count,
            states_count: electionGroup.states_count,
            election_date: cleanDate,
          },
        });

        // 2. Cascade: if the group's date changed, update all child elections under this group
        const oldCleanDate = electionGroup.election_date
          ? (electionGroup.election_date.split("T")[0] ?? "")
          : "";
        if (cleanDate && cleanDate !== oldCleanDate) {
          const electionsRes = await getElections({
            data: { election_group_id: electionGroup.id, limit: 1000 },
          });
          if (electionsRes?.success && electionsRes.data?.elections) {
            const electionsList = electionsRes.data.elections;
            await Promise.all(
              electionsList.map((item: any) =>
                updateElection({
                  data: {
                    id: item.id,
                    name: item.name,
                    candidates_count: item.candidates_count || 0,
                    election_date: cleanDate,
                    election_group_id: electionGroup.id,
                    office_id: item.office_id,
                    state_id: item.state_id,
                    senatorial_district_id: item.senatorial_district_id,
                    federal_constituency_id: item.federal_constituency_id,
                    state_constituency_id: item.state_constituency_id,
                    lga_id: item.lga_id,
                    ward_id: item.ward_id,
                  },
                }),
              ),
            );
          }
        }
      } else {
        // Create new election group
        res = await createElectionGroup({
          data: {
            name: values.name.trim(),
            rank: rankNum,
            elections_count: 0,
            states_count: 0,
            election_date: cleanDate,
          },
        });
      }

      if (!res.success) {
        throw new Error(res.message || `Failed to ${mode} election group`);
      }
      return res.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant caches to refresh tables and dropdowns across the portal
      queryClient.invalidateQueries({ queryKey: ["election-groups"] });
      queryClient.invalidateQueries({ queryKey: ["election-groups-select"] });
      queryClient.invalidateQueries({ queryKey: ["elections"] });
      onSuccess?.(data.id, variables.electionDate);
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl   overflow-visible">
        {/* Dynamic dialog title based on current operation mode */}
        <DialogHeader
          title={
            mode === "update"
              ? "Update Election Group"
              : "Create Election Group"
          }
        />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <DialogPadding className="space-y-6 pb-6">
            {/* Server / validation error display banner */}
            <TinyError error={error} />

            {/* Large title input for election group name */}
            <div className="w-full">
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Election group name is required" : undefined,
                }}
                children={(field) => (
                  <div className="w-full">
                    <FancyInput
                      type="text"
                      placeholder="Election group name"
                      errorMsg={field.state.meta.errors?.join(", ")}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="w-full text-[28px] font-semibold text-c-80 placeholder:text-c-30 outline-none bg-transparent"
                    />
                  </div>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Hierarchy priority rank selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-c-50">
                  Rank
                </label>
                <form.Field
                  name="rank"
                  children={(field) => (
                    <SelectRank
                      selectedId={field.state.value}
                      update={(val) => field.handleChange(val)}
                    />
                  )}
                />
              </div>

              {/* Scheduled election date picker */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-c-50">
                  Election Date
                </label>
                <form.Field
                  name="electionDate"
                  validators={{
                    onChange: ({ value }) =>
                      !value ? "Election date is required" : undefined,
                  }}
                  children={(field) => (
                    <SelectDate
                      initialData={field.state.value}
                      update={(val) => field.handleChange(val)}
                      errorMsg={field.state.meta.errors?.join(", ")}
                    />
                  )}
                />
              </div>
            </div>
          </DialogPadding>

          {/* Form submit button with loading spinner */}
          <DialogFooter>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="h-11 px-6 bg-success hover:bg-success-hover text-[16px] font-bold text-white rounded-xl cursor-pointer flex items-center gap-2"
            >
              {saveMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {mode === "update" ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
