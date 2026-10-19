/**
 * @file State Election Form Dialog
 * @description Modal dialog used in the admin portal to configure and create state-level
 * elections (such as Gubernatorial elections) across one or multiple Nigerian states.
 * Features smart cycle presets for 28 regular states, 8 off-cycle states, and custom filtering.
 */

import { useState, useMemo, useEffect } from "react";
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
import { Loader2, X } from "lucide-react";
import { ElectionGroupBullet } from "@repo/ui/components/bullets/election-group-bullet";
import { getContestedOffices } from "#/lib/server/offices";
import { useContestedOffices } from "#/hooks/useContestedOffices";
import { QUERY_KEYS } from "#/lib/config";
import { getElectionGroups } from "#/lib/server/election_groups";
import { createStateElection } from "#/lib/server/elections";
import { useNigeriaStates } from "#/hooks/useNigeriaStates";
import { SelectDate } from "@repo/ui/components/selects/date-select";
import { SelectOffice } from "@repo/ui/components/selects/office-select";

import { cn } from "@repo/ui/lib/utils";

import {
  SelectionHeader,
  SelectedItemsContainer,
  SelectableChip,
} from "./SelectionCommon";
import { Label, IconInput } from "@repo/ui/components/input";
import { TinyError } from "@repo/ui/components/custom/TinyError";

type StateItem = {
  id: number;
  name: string;
};

/** State selection presets based on Nigerian constitutional election timing */
export type StateSelectionMode = "regular" | "off_cycle" | "all" | "custom";

// The 8 Nigerian states that conduct off-cycle gubernatorial elections due to historical court rulings
export const OFF_CYCLE_GOVERNORSHIP_STATES = new Set([
  "anambra",
  "bayelsa",
  "edo",
  "ekiti",
  "imo",
  "kogi",
  "ondo",
  "osun",
]);

/** Checks if a state name belongs to the 8 off-cycle governorship states */
export const isOffCycleState = (name: string): boolean => {
  return OFF_CYCLE_GOVERNORSHIP_STATES.has(name.toLowerCase().trim());
};

/** Identifies the Federal Capital Territory (FCT) which has no state governor */
export const isFctOrNonState = (name: string): boolean => {
  const lower = name.toLowerCase().trim();
  return lower === "fct" || lower.includes("federal capital") || lower.includes("abuja");
};

export type StateElectionFormDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function StateElectionFormDialog({ open, onClose, onSuccess }: StateElectionFormDialogProps) {
  const queryClient = useQueryClient();

  // Local UI state for errors, picker dialog, and selected states
  const [error, setError] = useState<string | null>(null);
  const [isStateSelectorOpen, setIsStateSelectorOpen] = useState(false);
  const [statesMode, setStatesMode] = useState<StateSelectionMode>("regular");
  const [selectedStates, setSelectedStates] = useState<StateItem[]>([]);

  // Fetch states of Nigeria (country ID: 161)
  const { data: allNigeriaStates = [] } = useNigeriaStates({ enabled: open });

  // Fetch available contested offices for auto-selection and dialog metadata
  const { data: officesData } = useContestedOffices({ enabled: open });


  // 28 regular states holding elections during the General Elections
  const regularStates = useMemo(() => {
    return allNigeriaStates.filter(
      (s) => !isOffCycleState(s.name) && !isFctOrNonState(s.name),
    );
  }, [allNigeriaStates]);

  // 8 off-cycle states (Anambra, Bayelsa, Edo, Ekiti, Imo, Kogi, Ondo, Osun)
  const offCycleStates = useMemo(() => {
    return allNigeriaStates.filter((s) => isOffCycleState(s.name));
  }, [allNigeriaStates]);

  // All 36 states (excluding FCT which has no governor)
  const allStatesWithoutFct = useMemo(() => {
    return allNigeriaStates.filter((s) => !isFctOrNonState(s.name));
  }, [allNigeriaStates]);

  // TanStack Form instance for state election creation
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

  // Track reactive office field value for dialog preview
  const selectedOfficeId = useStore(form.store, (state) => state.values.officeId);

  // Currently selected office metadata
  const selectedType = useMemo(() => {
    if (!selectedOfficeId || !officesData) return null;
    return officesData.find((t: any) => t.id === selectedOfficeId) ?? null;
  }, [selectedOfficeId, officesData]);

  // Sync selectedStates whenever preset mode changes or data arrives
  useEffect(() => {
    if (!open || allNigeriaStates.length === 0) return;

    if (statesMode === "regular") {
      setSelectedStates(regularStates);
    } else if (statesMode === "off_cycle") {
      setSelectedStates(offCycleStates);
    } else if (statesMode === "all") {
      setSelectedStates(allStatesWithoutFct);
    }
  }, [open, statesMode, regularStates, offCycleStates, allStatesWithoutFct]);

  // Reset form values and selection mode when dialog opens
  useEffect(() => {
    if (open) {
      form.setFieldValue("electionGroupId", undefined);
      form.setFieldValue("electionDate", "");
      form.setFieldValue("officeId", undefined);
      setStatesMode("regular");
      setError(null);
    }
  }, [open]);

  // Auto-select matching State office (Governor) when offices data loads
  useEffect(() => {
    if (open && officesData && officesData.length > 0 && !selectedOfficeId) {
      const matching = officesData.find((o: any) => o.scope === "state");
      if (matching) {
        form.setFieldValue("officeId", matching.id);
      }
    }
  }, [open, officesData, selectedOfficeId]);

  // Mutation to create state elections across all selected states
  const saveMutation = useMutation({
    mutationFn: async (values: {
      electionGroupId: number | undefined;
      electionDate: string;
      officeId: number | undefined;
    }) => {
      // Validate election group selection
      if (!values.electionGroupId) {
        throw new Error("Election group is required");
      }
      // Validate office selection
      if (!values.officeId) {
        throw new Error("Office is required");
      }
      // Validate election date
      if (!values.electionDate) {
        throw new Error("Election date is required");
      }
      // Validate state selection
      if (selectedStates.length === 0) {
        throw new Error("At least one state must be selected");
      }

      // Call server mutation to persist records
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
      // Invalidate relevant queries to refresh listings
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.elections.all });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  // Toggle selection for an individual state and auto-detect matching preset mode
  const handleToggleStateSelection = (state: StateItem) => {
    setSelectedStates((prev) => {
      const exists = prev.some((s) => s.id === state.id);
      const next = exists
        ? prev.filter((s) => s.id !== state.id)
        : [...prev, state];

      // Auto-update preset mode pill if selection matches a known cycle
      if (
        next.length === regularStates.length &&
        next.every((s) => !isOffCycleState(s.name) && !isFctOrNonState(s.name))
      ) {
        setStatesMode("regular");
      } else if (
        next.length === offCycleStates.length &&
        next.every((s) => isOffCycleState(s.name))
      ) {
        setStatesMode("off_cycle");
      } else if (
        next.length === allStatesWithoutFct.length &&
        next.every((s) => !isFctOrNonState(s.name))
      ) {
        setStatesMode("all");
      } else {
        setStatesMode("custom");
      }

      return next;
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-145 p-0 rounded-2xl border-none shadow-2xl   overflow-visible">
          <DialogHeader title="State Election" />

          {/* Main State Election Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <DialogPadding className="space-y-6 pb-6">
              <TinyError error={error} />

              {/* Office and Election Date fields */}
              <div className="flex items-center gap-4">
                {/* Office selection (restricted to state scope) */}
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
                        fetchOffices={getContestedOffices}
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
                        }}
                        errorMsg={field.state.meta.errors?.join(", ")}
                      />
                    )}
                  />
                </div>
              </div>

              {/* States selection section */}
              <div className="space-y-3">
                <SelectionHeader
                  label="States"
                  buttonLabel="State"
                  onOpenSelector={() => setIsStateSelectorOpen(true)}
                />

                {/* Smart Selection Preset Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Regular States Preset (28 states) */}
                  <button
                    type="button"
                    onClick={() => {
                      setStatesMode("regular");
                      setSelectedStates(regularStates);
                    }}
                    className={cn(
                      "h-8 px-3 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5",
                      statesMode === "regular"
                        ? "bg-primary text-white"
                        : "bg-secondary/40 text-c-80 hover:bg-secondary/60",
                    )}
                  >
                    <span>Regular States</span>
                    <span className="opacity-75">
                      ({regularStates.length || 28})
                    </span>
                  </button>

                  {/* Off-Cycle States Preset (8 states) */}
                  <button
                    type="button"
                    onClick={() => {
                      setStatesMode("off_cycle");
                      setSelectedStates(offCycleStates);
                    }}
                    className={cn(
                      "h-8 px-3 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5",
                      statesMode === "off_cycle"
                        ? "bg-amber-600 text-white"
                        : "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20",
                    )}
                  >
                    <span>Off-Cycle</span>
                    <span className="opacity-75">
                      ({offCycleStates.length || 8})
                    </span>
                  </button>

                  {/* All 36 States Preset */}
                  <button
                    type="button"
                    onClick={() => {
                      setStatesMode("all");
                      setSelectedStates(allStatesWithoutFct);
                    }}
                    className={cn(
                      "h-8 px-3 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5",
                      statesMode === "all"
                        ? "bg-primary text-white"
                        : "bg-secondary/40 text-c-80 hover:bg-secondary/60",
                    )}
                  >
                    <span>All States</span>
                    <span className="opacity-75">
                      ({allStatesWithoutFct.length || 36})
                    </span>
                  </button>

                  {/* Custom selection mode */}
                  <button
                    type="button"
                    onClick={() => {
                      setStatesMode("custom");
                      setSelectedStates([]);
                    }}
                    className={cn(
                      "h-8 px-3 rounded-lg text-xs font-semibold transition cursor-pointer",
                      statesMode === "custom"
                        ? "bg-secondary/30 text-c-80 font-bold"
                        : "bg-transparent text-c-60 hover:bg-black/5",
                    )}
                  >
                    Custom
                  </button>
                </div>

                {/* Selected States Chip List */}
                <SelectedItemsContainer
                  items={selectedStates}
                  emptyPlaceholder="0 states added"
                >
                  {selectedStates.length > 0 && (
                    <div className="flex flex-wrap gap-2 w-full">
                      {selectedStates.map((item) => {
                        const isOffCycle = isOffCycleState(item.name);
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "h-9 flex items-center gap-2 pl-3 pr-2 bg-background rounded-10 text-sm text-c-80 border",
                              isOffCycle
                                ? "border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20"
                                : "border-border/40",
                            )}
                          >
                            <span>{item.name}</span>
                            {isOffCycle && (
                              <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded bg-amber-100/80 dark:bg-amber-900/40">
                                Off-cycle
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleToggleStateSelection(item)}
                              className="text-c-40 hover:text-red transition cursor-pointer ml-0.5"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SelectedItemsContainer>
              </div>
            </DialogPadding>

            {/* Bottom Toolbelt with Election Group Selector */}
            <DialogToolbelt>
              <form.Field
                name="electionGroupId"
                children={(field) => (
                  <ElectionGroupBullet
                    selectedId={field.state.value}
                    variant="bullet"
                    update={(item) => {
                      field.handleChange(item.id);
                    }}
                    fetchElectionGroups={getElectionGroups}
                  />
                )}
              />
            </DialogToolbelt>

            {/* Submit Button */}
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

      {/* State Selector Modal */}
      <StateSelectorDialog
        open={isStateSelectorOpen}
        onOpenChange={setIsStateSelectorOpen}
        selectedType={selectedType}
        allNigeriaStates={allStatesWithoutFct}
        selectedStates={selectedStates}
        onToggleStateSelection={handleToggleStateSelection}
      />
    </>
  );
}

/** Props for the multi-state picker dialog */
export type StateSelectorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedType: { id: number; name: string } | null;
  allNigeriaStates: StateItem[];
  selectedStates: StateItem[];
  onToggleStateSelection: (state: StateItem) => void;
};

/**
 * Modal dialog for searching and toggling states in bulk
 */
function StateSelectorDialog({
  open,
  onOpenChange,
  selectedType,
  allNigeriaStates,
  selectedStates,
  onToggleStateSelection,
}: StateSelectorDialogProps) {
  // Search query filter
  const [searchQuery, setSearchQuery] = useState("");

  // Clear search on dialog open
  useEffect(() => {
    if (open) {
      setSearchQuery("");
    }
  }, [open]);

  // Filter states based on user search term
  const filteredStates = useMemo(() => {
    if (!searchQuery.trim()) return allNigeriaStates;
    const q = searchQuery.toLowerCase();
    return allNigeriaStates.filter((s) => s.name.toLowerCase().includes(q));
  }, [allNigeriaStates, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-155 p-0 rounded-2xl border-none shadow-2xl  ">
        <DialogHeader title="Select States" />
        <DialogPadding className="space-y-4 pb-6">
          <p className="text-sm text-c-60">
            Select all the states you want a{" "}
            {selectedType ? selectedType.name.toLowerCase() : "state"} election
            to hold in.
          </p>

          {/* Search Input */}
          <IconInput
            placeholder="Search states..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* Selectable Chip Grid */}
          <div className="flex flex-wrap gap-2.5 max-h-[50vh] overflow-y-auto pr-1 pt-2">
            {filteredStates.length === 0 ? (
              <p className="text-sm text-c-50 py-4 w-full text-center">
                No states found matching your search.
              </p>
            ) : (
              filteredStates.map((state) => {
                const isSelected = selectedStates.some(
                  (s) => s.id === state.id,
                );
                const isOffCycle = isOffCycleState(state.name);
                return (
                  <SelectableChip
                    key={state.id}
                    label={isOffCycle ? `${state.name} • Off-cycle` : state.name}
                    isSelected={isSelected}
                    onClick={() => onToggleStateSelection(state)}
                  />
                );
              })
            )}
          </div>
        </DialogPadding>
        <DialogFooter>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-11 px-6 bg-success hover:bg-success-hover text-[16px] font-bold text-white rounded-xl cursor-pointer"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
