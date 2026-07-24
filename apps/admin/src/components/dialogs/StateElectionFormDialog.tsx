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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X } from "lucide-react";
import { ElectionGroupBullet } from "@repo/ui/components/bullets/election-group-bullet";
import { getOffices } from "#/lib/server/offices";
import { getElectionGroups } from "#/lib/server/election_groups";
import { createStateElection } from "#/lib/server/elections";
import { getStates } from "#/lib/server/states";
import { SelectDate } from "@repo/ui/components/selects/date-select";
import { SelectOffice } from "@repo/ui/components/selects/office-select";

import { cn } from "@repo/ui/lib/utils";

import {
  SelectionHeader,
  SelectionTabs,
  SelectedItemsContainer,
} from "./SelectionCommon";
import { Label } from "@repo/ui/components/input";
import { TinyError } from "@repo/ui/components/custom/TinyError";

interface StateItem {
  id: number;
  name: string;
}

export function StateElectionFormDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);
  const [isStateSelectorOpen, setIsStateSelectorOpen] = React.useState(false);
  const [statesMode, setStatesMode] = React.useState<"custom" | "all">(
    "custom",
  );
  const [selectedStates, setSelectedStates] = React.useState<StateItem[]>([]);
  const [selectedGroupDate, setSelectedGroupDate] = React.useState<
    string | null
  >(null);

  // Fetch states of Nigeria (country ID: 161)
  const { data: statesData } = useQuery({
    queryKey: ["nigeria-states"],
    queryFn: async () => {
      const res = await getStates({ data: { countryId: 161, limit: 50 } });
      if (res && res.success && res.data?.states) {
        return res.data.states as StateItem[];
      }
      return [];
    },
    enabled: open,
  });

  const allNigeriaStates = statesData || [];

  const form = useForm({
    defaultValues: {
      electionGroupId: undefined as number | undefined,
      electionDate: "",
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

  const selectedOfficeId = useStore(
    form.store,
    (state) => state.values.officeId,
  );

  // Fetch offices to compute the preview group name
  const { data: officesData } = useQuery({
    queryKey: ["election-types", "list"],
    queryFn: async () => {
      const res = await getOffices();
      if (res && res.success && res.data?.offices) {
        return res.data.offices;
      }
      return [];
    },
    enabled: open,
  });

  const selectedType = React.useMemo(() => {
    if (!selectedOfficeId || !officesData) return null;
    return officesData.find((t: any) => t.id === selectedOfficeId);
  }, [selectedOfficeId, officesData]);

  // Auto-fill all states when "all" mode is selected and data is loaded
  React.useEffect(() => {
    if (statesMode === "all" && statesData && statesData.length > 0) {
      setSelectedStates(statesData);
    }
  }, [statesMode, statesData]);

  React.useEffect(() => {
    if (open) {
      form.setFieldValue("electionGroupId", undefined);
      form.setFieldValue("electionDate", "");
      form.setFieldValue("officeId", undefined);
      setStatesMode("custom");
      setSelectedStates([]);
      setError(null);
      setSelectedGroupDate(null);
    }
  }, [open]);

  const saveMutation = useMutation({
    mutationFn: async (values: {
      electionGroupId: number | undefined;
      electionDate: string;
      officeId: number | undefined;
    }) => {
      if (!values.officeId) {
        throw new Error("Office is required");
      }
      if (!values.electionDate) {
        throw new Error("Election date is required");
      }
      if (selectedStates.length === 0) {
        throw new Error("At least one state must be selected");
      }

      const res = await createStateElection({
        data: {
          office_id: values.officeId,
          election_date: values.electionDate,
          election_group_id: values.electionGroupId,
          state_ids: selectedStates.map((s) => s.id),
        },
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to create state elections");
      }
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

  const handleToggleStateSelection = (state: StateItem) => {
    setSelectedStates((prev) => {
      const exists = prev.some((s) => s.id === state.id);
      if (exists) {
        const next = prev.filter((s) => s.id !== state.id);
        if (next.length !== allNigeriaStates.length) {
          setStatesMode("custom");
        }
        return next;
      } else {
        const next = [...prev, state];
        if (next.length === allNigeriaStates.length) {
          setStatesMode("all");
        }
        return next;
      }
    });
  };

  const groupPreviewName = React.useMemo(() => {
    if (selectedDateStr && selectedType) {
      const year = new Date(selectedDateStr).getFullYear();
      return `${year} ${selectedType.name} Election`;
    }
  }, [selectedDateStr, selectedType]);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl bg-white overflow-visible">
          <DialogHeader title="State Election" />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <DialogPadding className="space-y-6 pb-6">
              <TinyError error={error} />

              <div className="flex items-center gap-4">
                {/* Office */}
                <div className="flex flex-col gap-1.5 w-full">
                  <Label title="Office" />
                  <form.Field
                    name="officeId"
                    validators={{
                      onChange: ({ value }) =>
                        !value ? "Office is required" : undefined,
                    }}
                    children={(field) => (
                      <SelectOffice
                        selectedId={field.state.value}
                        update={(item) => field.handleChange(item.id)}
                        fetchOffices={getOffices}
                        filterScope="state"
                        errorMsg={field.state.meta.errors?.join(", ")}
                      />
                    )}
                  />
                </div>

                {/* Election Date */}
                <div className="flex flex-col gap-1.5 w-full">
                  <Label title="Election date" />
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

              {/* States section */}
              <div className="space-y-3">
                <SelectionHeader
                  label="States"
                  buttonLabel="State"
                  onOpenSelector={() => setIsStateSelectorOpen(true)}
                />

                <SelectionTabs
                  mode={statesMode}
                  setMode={setStatesMode}
                  items={selectedStates}
                  allItems={allNigeriaStates}
                  setItems={setSelectedStates}
                  allLabel={`All states (${allNigeriaStates.length || 36})`}
                />

                <SelectedItemsContainer
                  items={selectedStates}
                  onRemove={handleToggleStateSelection}
                  emptyPlaceholder="0 states added"
                />
              </div>
            </DialogPadding>

            {/* Election Group & Election Date previews */}
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
                    buttonText={groupPreviewName}
                  />
                )}
              />
            </DialogToolbelt>

            <DialogFooter>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="h-11 px-6 bg-success hover:bg-success-hover text-[16px] font-bold text-white rounded-xl cursor-pointer flex items-center gap-2"
              >
                {saveMutation.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <StateSelectorDialog
        open={isStateSelectorOpen}
        onOpenChange={setIsStateSelectorOpen}
        selectedType={selectedType}
        allNigeriaStates={allNigeriaStates}
        selectedStates={selectedStates}
        onToggleStateSelection={handleToggleStateSelection}
      />
    </>
  );
}

function StateSelectorDialog({
  open,
  onOpenChange,
  selectedType,
  allNigeriaStates,
  selectedStates,
  onToggleStateSelection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedType: any;
  allNigeriaStates: StateItem[];
  selectedStates: StateItem[];
  onToggleStateSelection: (state: StateItem) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[620px] p-0 rounded-2xl border-none shadow-2xl bg-white">
        <DialogHeader title="Select States" />
        <DialogPadding className="space-y-4 pb-6">
          <p className="text-sm text-c-60">
            Select all the states you want a{" "}
            {selectedType ? selectedType.name.toLowerCase() : "state"} election
            to hold in.
          </p>

          <div className="flex flex-wrap gap-2.5 max-h-[50vh] overflow-y-auto pr-1 pt-2">
            {allNigeriaStates.map((state) => {
              const isSelected = selectedStates.some((s) => s.id === state.id);
              return (
                <button
                  key={state.id}
                  type="button"
                  onClick={() => onToggleStateSelection(state)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm transition cursor-pointer",
                    isSelected
                      ? "bg-secondary/20 font-medium text-c-80"
                      : "bg-c-5 text-c-80 hover:bg-black/5",
                  )}
                >
                  {state.name}
                </button>
              );
            })}
          </div>
        </DialogPadding>
        <DialogFooter>
          <Button
            type="button"
            variant="black"
            size="lg"
            onClick={() => onOpenChange(false)}
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
