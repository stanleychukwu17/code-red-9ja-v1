import * as React from "react";
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
import { createElectionGroup, updateElectionGroup } from "#/lib/server/election_groups";
import { Loader2 } from "lucide-react";
import { FancyInput } from "@repo/ui/components/input";
import type { ElectionGroupType } from "../tiles/election-group-tile";

export function ElectionGroupFormDialog({
  electionGroup,
  open,
  onClose,
  mode = "create",
  onSuccess,
}: {
  electionGroup?: ElectionGroupType;
  open: boolean;
  onClose: () => void;
  mode?: "create" | "update";
  onSuccess?: (groupId: number, electionDate?: string) => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);

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

  React.useEffect(() => {
    if (open) {
      if (mode === "update" && electionGroup) {
        form.setFieldValue("name", electionGroup.name || "");
        form.setFieldValue("rank", String(electionGroup.rank || 1));
        form.setFieldValue("electionDate", electionGroup.election_date || "");
      } else {
        form.setFieldValue("name", "");
        form.setFieldValue("rank", "1");
        form.setFieldValue("electionDate", "");
      }
      setError(null);
    }
  }, [open, mode, electionGroup]);

  const saveMutation = useMutation({
    mutationFn: async (values: {
      name: string;
      rank: string;
      electionDate: string;
    }) => {
      if (!values.electionDate) {
        throw new Error("Election date is required");
      }
      const rankNum = Number(values.rank) || 1;
      
      let res;
      if (mode === "update") {
        if (!electionGroup?.id) {
          throw new Error("Missing ID for update");
        }
        res = await updateElectionGroup({
          data: {
            id: electionGroup.id,
            name: values.name.trim(),
            rank: rankNum,
            elections_count: electionGroup.elections_count,
            states_count: electionGroup.states_count,
            election_date: values.electionDate,
          },
        });
      } else {
        res = await createElectionGroup({
          data: {
            name: values.name.trim(),
            rank: rankNum,
            elections_count: 0,
            states_count: 0,
            election_date: values.electionDate,
          },
        });
      }

      if (!res.success) {
        throw new Error(res.message || `Failed to ${mode} election group`);
      }
      return res.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["election-groups"] });
      queryClient.invalidateQueries({ queryKey: ["election-groups-select"] });
      onSuccess?.(data.id, variables.electionDate);
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl bg-white overflow-visible">
        <DialogHeader title={mode === "update" ? "Update Election Group" : "Create Election Group"} />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <DialogPadding className="space-y-6 pb-6">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            {/* Group name input */}
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
              {/* Rank select */}
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

              {/* Date select */}
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
          <DialogFooter>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="h-11 px-6 bg-[#00cf79] hover:bg-[#00b568] text-[16px] font-bold text-white rounded-xl cursor-pointer flex items-center gap-2"
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
