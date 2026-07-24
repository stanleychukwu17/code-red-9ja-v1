import * as React from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
  DialogToolbelt,
} from "@repo/ui/components/dialog";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { FancyInput, Input, Label } from "@repo/ui/components/input";
import { SelectDate } from "@repo/ui/components/selects/date-select";
import { SelectOffice } from "@repo/ui/components/selects/office-select";
import { ElectionGroupBullet } from "@repo/ui/components/bullets/election-group-bullet";
import { getOffices } from "#/lib/server/offices";
import { updateElection } from "#/lib/server/elections";
import { getElectionGroups } from "#/lib/server/election_groups";
import type { ElectionInstanceType } from "../tiles/election-instance-tile";
import { TinyError } from "@repo/ui/components/custom/TinyError";

export function ElectionInstanceFormDialog({
  electionInstance,
  open,
  onClose,
  onSuccess,
}: {
  electionInstance?: ElectionInstanceType;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);
  const [selectedGroupDate, setSelectedGroupDate] = React.useState<
    string | null
  >(null);

  const form = useForm({
    defaultValues: {
      name: "",
      candidatesCount: 0,
      electionDate: "",
      electionGroupId: undefined as number | undefined,
      officeId: undefined as number | undefined,
    },
    onSubmit: async ({ value }) => {
      saveMutation.mutate(value);
    },
  });

  const selectedDateStr = useStore(
    form.store,
    (state) => state.values.electionDate,
  );

  React.useEffect(() => {
    if (open && electionInstance) {
      form.setFieldValue("name", electionInstance.name || "");
      form.setFieldValue(
        "candidatesCount",
        electionInstance.candidates_count || 0,
      );
      form.setFieldValue("electionDate", electionInstance.election_date || "");
      form.setFieldValue(
        "electionGroupId",
        electionInstance.election_group_id || undefined,
      );
      form.setFieldValue("officeId", electionInstance.office_id || undefined);
      setSelectedGroupDate(electionInstance.election_date || null);
      setError(null);
    }
  }, [open, electionInstance]);

  const saveMutation = useMutation({
    mutationFn: async (values: {
      name: string;
      candidatesCount: number;
      electionDate: string;
      electionGroupId: number | undefined;
      officeId: number | undefined;
    }) => {
      if (!electionInstance?.id) {
        throw new Error("Missing ID for update");
      }
      if (!values.officeId) {
        throw new Error("Office is required");
      }
      if (!values.electionDate) {
        throw new Error("Election date is required");
      }

      const res = await updateElection({
        data: {
          id: electionInstance.id,
          name: values.name.trim(),
          candidates_count: Number(values.candidatesCount) || 0,
          election_date: values.electionDate,
          election_group_id: values.electionGroupId || 0,
          office_id: values.officeId,
          state_id: electionInstance.state_id,
          senatorial_district_id: electionInstance.senatorial_district_id,
          federal_constituency_id: electionInstance.federal_constituency_id,
          state_constituency_id: electionInstance.state_constituency_id,
          lga_id: electionInstance.lga_id,
          ward_id: electionInstance.ward_id,
        },
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to update election");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elections"] });
      queryClient.invalidateQueries({ queryKey: ["election-groups"] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl bg-white overflow-visible">
        <DialogHeader title="Update Election Instance" />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <DialogPadding className="space-y-6 pb-6">
            <TinyError error={error} />

            {/* Name input */}
            <div className="w-full">
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "Election name is required" : undefined,
                }}
                children={(field) => (
                  <div className="w-full">
                    <FancyInput
                      type="text"
                      placeholder="Election name"
                      errorMsg={field.state.meta.errors?.join(", ")}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </div>
                )}
              />
            </div>

            {/* Candidates Count */}
            <div className="flex flex-col gap-1.5">
              <Label title="Candidates Count" />
              <form.Field
                name="candidatesCount"
                children={(field) => (
                  <Input
                    type="number"
                    value={field.state.value ?? 0}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Election Type */}
              <div className="flex flex-col gap-1.5">
                <Label title="Election Type" />
                <form.Field
                  name="officeId"
                  validators={{
                    onChange: ({ value }) =>
                      !value ? "Office is required" : undefined,
                  }}
                  children={(field) => (
                    <SelectOffice
                      selectedId={field.state.value}
                      update={(val) => field.handleChange(val.id)}
                      fetchOffices={getOffices}
                      errorMsg={field.state.meta.errors?.join(", ")}
                    />
                  )}
                />
              </div>

              {/* Election Date */}
              <div className="flex flex-col gap-1.5">
                <Label title="Election Date" />
                <form.Field
                  name="electionDate"
                  validators={{
                    onChange: ({ value }) =>
                      !value ? "Election date is required" : undefined,
                  }}
                  children={(field) => (
                    <SelectDate
                      selectedId={field.state.value}
                      update={(value) => {
                        field.handleChange(value);
                        if (value !== selectedGroupDate) {
                          form.setFieldValue("electionGroupId", undefined);
                          setSelectedGroupDate(null);
                        }
                      }}
                      errorMsg={field.state.meta.errors?.join(", ")}
                    />
                  )}
                />
              </div>
            </div>
          </DialogPadding>

          {/* Election Group selector */}
          <DialogToolbelt>
            <form.Field
              name="electionGroupId"
              children={(field) => (
                <ElectionGroupBullet
                  selectedId={field.state.value}
                  variant="bullet"
                  update={(item) => {
                    field.handleChange(item.id);
                    setSelectedGroupDate(item.election_date || null);
                    if (item.election_date) {
                      form.setFieldValue("electionDate", item.election_date);
                    }
                  }}
                  fetchElectionGroups={getElectionGroups}
                />
              )}
            />
          </DialogToolbelt>

          <DialogFooter>
            <Button
              type="submit"
              variant="secondary"
              size="xl"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Update
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
