import { useEffect, useMemo, useState } from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
  DialogToolbelt,
} from "@repo/ui/components/dialog";
import { cn } from "@repo/ui/lib/utils";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Plus, X } from "lucide-react";
import { getContestedOffices } from "#/lib/server/offices";
import { useContestedOffices } from "#/hooks/useContestedOffices";
import { QUERY_KEYS } from "#/lib/config";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getLGAs } from "#/lib/server/countries";
import { useLGAs } from "#/hooks/useLGAs";
import { getStates } from "#/lib/server/states";
import { useNigeriaStates } from "#/hooks/useNigeriaStates";
import { getWards } from "#/lib/server/wards";
import { SelectDate } from "@repo/ui/components/selects/date-select";
import { SelectOffice } from "@repo/ui/components/selects/office-select";
import { SelectState } from "@repo/ui/components/selects/state-select";
import { SelectLga } from "@repo/ui/components/selects/lga-select";
import { ElectionGroupBullet } from "@repo/ui/components/bullets/election-group-bullet";
import { createWardElection } from "#/lib/server/elections";
import { SelectedItemsContainer, SelectableChip } from "./SelectionCommon";
import { Label, IconInput } from "@repo/ui/components/input";
import { TinyError } from "@repo/ui/components/custom/TinyError";

type StateItem = {
  id: number;
  name: string;
};

type LgaItem = {
  id: number;
  name: string;
  state_id: number;
};

type WardItem = {
  id: number;
  name: string;
  lga_id: number;
  lga_name?: string;
  state_id?: number;
  state_name?: string;
};

export type WardElectionFormDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function WardElectionFormDialog({ open, onClose, onSuccess }: WardElectionFormDialogProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isWardSelectorOpen, setIsWardSelectorOpen] = useState(false);
  const [wardsMode, setWardsMode] = useState<"custom" | "all">("custom");
  const [selectedWards, setSelectedWards] = useState<WardItem[]>([]);

  // Fetch states of Nigeria
  const { data: allNigeriaStates = [] } = useNigeriaStates({ enabled: open });

  // Fetch LGAs in Nigeria (for label enrichment)
  const { data: allLgas = [] } = useLGAs({ enabled: open });

  // Form instance for managing election metadata
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

  // Track reactive office field value from form store
  const selectedOfficeId = useStore(form.store, (state) => state.values.officeId,);

  // Fetch available contested offices for auto-selection and dialog metadata
  const { data: officesData } = useContestedOffices({ enabled: open });

  // Reset form values and selection state when dialog opens
  useEffect(() => {
    if (open) {
      form.setFieldValue("electionGroupId", undefined);
      form.setFieldValue("electionDate", "");
      form.setFieldValue("officeId", undefined);
      setWardsMode("custom");
      setSelectedWards([]);
      setError(null);
    }
  }, [open]);

  // Auto-select matching Ward office when offices data loads
  useEffect(() => {
    if (open && officesData && officesData.length > 0 && !selectedOfficeId) {
      const matching = officesData.find((o: any) => o.scope === "ward");
      if (matching) {
        form.setFieldValue("officeId", matching.id);
      }
    }
  }, [open, officesData, selectedOfficeId]);

  // Mutation to validate inputs and persist ward election records
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
      // Validate ward selection when custom mode is active
      if (wardsMode === "custom" && selectedWards.length === 0) {
        throw new Error("At least one Ward must be selected (or select 'All Wards')");
      }

      // Call server mutation to create ward elections
      const res = await createWardElection({
        data: {
          office_id: values.officeId,
          election_date: values.electionDate,
          election_group_id: values.electionGroupId,
          all_wards: wardsMode === "all",
          ward_ids: wardsMode === "all" ? [] : selectedWards.map((w) => w.id),
        },
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to create Ward elections");
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh election listings
      queryClient.invalidateQueries({ queryKey: ["elections"] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  // Toggle selection for an individual Ward
  const handleToggleWardSelection = (ward: WardItem) => {
    setSelectedWards((prev) => {
      const exists = prev.some((w) => w.id === ward.id);
      if (exists) {
        return prev.filter((w) => w.id !== ward.id);
      }
      return [...prev, ward];
    });
  };

  // Batch add multiple Wards to the selection without duplicates
  const handleAddWards = (wards: WardItem[]) => {
    setSelectedWards((prev) => {
      const map = new Map(prev.map((w) => [w.id, w]));
      for (const w of wards) {
        map.set(w.id, w);
      }
      return Array.from(map.values());
    });
  };

  // Batch remove selected Wards by IDs
  const handleRemoveWards = (wardIds: number[]) => {
    const idSet = new Set(wardIds);
    setSelectedWards((prev) => prev.filter((w) => !idSet.has(w.id)));
  };

  // Group selected Wards by State and LGA for structured display
  const selectedWardsByState = useMemo(() => {
    const groups: { [stateName: string]: WardItem[] } = {};
    for (const w of selectedWards) {
      const lga = allLgas.find((l) => l.id === w.lga_id);
      const state = lga
        ? allNigeriaStates.find((s) => s.id === lga.state_id)
        : w.state_id
          ? allNigeriaStates.find((s) => s.id === w.state_id)
          : null;
      const stateName = state?.name || w.state_name || "Selected State";
      if (!groups[stateName]) {
        groups[stateName] = [];
      }
      groups[stateName].push({
        ...w,
        lga_name: w.lga_name || lga?.name,
        state_name: w.state_name || state?.name,
      });
    }
    return groups;
  }, [selectedWards, allLgas, allNigeriaStates]);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl overflow-visible">
          <DialogHeader title="Ward Election" />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <DialogPadding className="space-y-6 pb-6">
              <TinyError error={error} />

              {/* Office */}
              <div className="flex gap-4 items-center">
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
                        filterScope="ward"
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

              {/* Wards Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[15px] font-semibold text-c-70">
                      Wards
                    </span>
                    <p className="text-xs text-c-50">
                      {wardsMode === "all"
                        ? "All 8,809 wards nationwide will be added"
                        : selectedWards.length > 0
                          ? `${selectedWards.length} ward${selectedWards.length > 1 ? "s" : ""} selected`
                          : "Select wards participating in this election"}
                    </p>
                  </div>
                  {wardsMode === "custom" && (
                    <div className="flex items-center gap-2">
                      {selectedWards.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedWards([])}
                          className="text-xs text-c-60 hover:text-red h-8 px-2.5 cursor-pointer"
                        >
                          Clear All
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="black"
                        size="lg"
                        onClick={() => setIsWardSelectorOpen(true)}
                        className="px-5 cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="size-4" />
                        <span>Select Wards</span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Mode Selector Tabs: Custom vs All Wards (8,809) */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setWardsMode("custom")}
                    className={cn(
                      "h-9 px-4 rounded-lg text-sm font-semibold transition cursor-pointer",
                      wardsMode === "custom"
                        ? "bg-secondary/20 text-c-80"
                        : "bg-transparent text-c-80 hover:bg-black/5"
                    )}
                  >
                    Custom
                  </button>
                  <button
                    type="button"
                    onClick={() => setWardsMode("all")}
                    className={cn(
                      "h-9 px-4 rounded-lg text-sm font-semibold transition cursor-pointer flex items-center gap-1.5",
                      wardsMode === "all"
                        ? "bg-secondary/20 text-c-80"
                        : "bg-transparent text-c-80 hover:bg-black/5"
                    )}
                  >
                    <span>All Wards (8,809)</span>
                  </button>
                </div>

                {wardsMode === "all" ? (
                  <div className="rounded-xl border border-secondary/30 bg-secondary/10 p-4 space-y-1.5 text-left">
                    <div className="flex items-center gap-2 text-sm font-bold text-c-90">
                      <Check className="size-4 text-success" />
                      <span>Nationwide Councillorship Mode</span>
                    </div>
                    <p className="text-xs text-c-60 leading-relaxed">
                      This will create election instances for all{" "}
                      <strong className="text-c-80">8,809 wards</strong> across
                      all 774 LGAs in the 36 states and FCT.
                    </p>
                  </div>
                ) : (
                  <SelectedItemsContainer
                    items={selectedWards}
                    emptyPlaceholder="No wards selected yet. Click 'Select Wards' to add."
                  >
                    <div className="space-y-4 w-full text-left">
                      {Object.entries(selectedWardsByState).map(
                        ([stateName, stateWards]) => (
                          <div key={stateName} className="space-y-2">
                            <h4 className="text-[13px] font-bold text-c-50 tracking-wide uppercase">
                              {stateName} ({stateWards.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {stateWards.map((ward) => (
                                <div
                                  key={ward.id}
                                  className="h-9 flex items-center gap-2.5 pl-3 pr-2 bg-background rounded-[10px] text-sm text-c-80"
                                >
                                  <span>{ward.name}</span>
                                  {ward.lga_name && (
                                    <span className="text-[11px] text-c-40">
                                      ({ward.lga_name})
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleToggleWardSelection(ward)
                                    }
                                    className="text-c-40 hover:text-red transition cursor-pointer"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </SelectedItemsContainer>
                )}
              </div>
            </DialogPadding>

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

      {/* Sub-dialog: Cascading Ward Selector */}
      <WardSelectorDialog
        open={isWardSelectorOpen}
        onOpenChange={setIsWardSelectorOpen}
        selectedWards={selectedWards}
        onToggleWardSelection={handleToggleWardSelection}
        onAddWards={handleAddWards}
        onRemoveWards={handleRemoveWards}
        allLgas={allLgas}
      />
    </>
  );
}

type WardSelectorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedWards: WardItem[];
  onToggleWardSelection: (ward: WardItem) => void;
  onAddWards: (wards: WardItem[]) => void;
  onRemoveWards: (wardIds: number[]) => void;
  allLgas: LgaItem[];
};

function WardSelectorDialog({
  open,
  onOpenChange,
  selectedWards,
  onToggleWardSelection,
  onAddWards,
  onRemoveWards,
  allLgas,
}: WardSelectorDialogProps) {
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>(undefined);
  const [selectedStateName, setSelectedStateName] = useState<string>("");
  const [selectedLgaId, setSelectedLgaId] = useState<number | undefined>(undefined);
  const [selectedLgaName, setSelectedLgaName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Reset search query whenever dialog opens
  useEffect(() => {
    if (open) {
      setSearchQuery("");
    }
  }, [open]);

  // Query wards for the selected LGA directly (Redis-backed, <1ms)
  const { data: lgaWards = [], isLoading: isLoadingLgaWards } = useQuery({
    queryKey: [...QUERY_KEYS.bodies.wards, "lga", selectedLgaId],
    queryFn: async () => {
      if (!selectedLgaId) return [];
      const res = await getWards({ data: { localGovernmentId: selectedLgaId } });
      if (res && res.success && res.data?.wards) {
        return (res.data.wards as WardItem[]).map((w) => ({
          ...w,
          lga_id: selectedLgaId,
          lga_name: selectedLgaName,
          state_id: selectedStateId,
          state_name: selectedStateName,
        }));
      }
      return [];
    },
    enabled: !!selectedLgaId,
    staleTime: Infinity,
  });

  // Query all wards for the selected State directly (cached with TanStack Query)
  const { data: stateWards = [], isLoading: isLoadingStateWards } = useQuery({
    queryKey: [...QUERY_KEYS.bodies.wards, "state", selectedStateId],
    queryFn: async () => {
      if (!selectedStateId) return [];
      const res = await getWards({ data: { stateId: selectedStateId } });
      if (res && res.success && res.data?.wards) {
        return (res.data.wards as WardItem[]).map((w) => {
          const lga = allLgas.find((l) => l.id === w.lga_id);
          return {
            ...w,
            lga_name: lga?.name || w.lga_name,
            state_id: selectedStateId,
            state_name: selectedStateName,
          };
        });
      }
      return [];
    },
    enabled: !!selectedStateId,
    staleTime: Infinity,
  });

  // Filter currently displayed LGA wards by search input
  const filteredLgaWards = useMemo(() => {
    if (!searchQuery.trim()) return lgaWards;
    const q = searchQuery.toLowerCase();
    return lgaWards.filter((w) => w.name.toLowerCase().includes(q));
  }, [lgaWards, searchQuery]);

  // Check if all wards in currently active LGA are selected
  const areAllLgaWardsSelected =
    lgaWards.length > 0 &&
    lgaWards.every((w) => selectedWards.some((sw) => sw.id === w.id));

  // Toggle selection for all wards in current LGA
  const handleToggleAllLgaWards = () => {
    if (areAllLgaWardsSelected) {
      onRemoveWards(lgaWards.map((w) => w.id));
    } else {
      onAddWards(lgaWards);
    }
  };

  // Check if all wards in currently active State are selected
  const areAllStateWardsSelected =
    stateWards.length > 0 &&
    stateWards.every((w) => selectedWards.some((sw) => sw.id === w.id));

  // Toggle selection for all wards in current State
  const handleToggleAllStateWards = () => {
    if (areAllStateWardsSelected) {
      onRemoveWards(stateWards.map((w) => w.id));
    } else {
      onAddWards(stateWards);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-155 p-0 rounded-2xl border-none shadow-2xl overflow-visible">
        <DialogHeader title="Select Wards" />
        <DialogPadding className="space-y-4 pb-6">
          <p className="text-sm text-c-60">
            Pick a State and Local Government Area to browse and select wards.
          </p>

          {/* Cascading State & LGA Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label title="State" />
              <SelectState
                selectedId={selectedStateId}
                countryOriginalId={161}
                update={(item) => {
                  setSelectedStateId(Number(item.id));
                  setSelectedStateName(item.name);
                  setSelectedLgaId(undefined);
                  setSelectedLgaName("");
                }}
                fetchStates={getStates}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label title="LGA" />
              <SelectLga
                selectedId={selectedLgaId}
                stateId={selectedStateId}
                disabled={!selectedStateId}
                update={(item) => {
                  setSelectedLgaId(Number(item.id));
                  setSelectedLgaName(item.name);
                }}
                fetchLGAs={getLGAs}
              />
            </div>
          </div>

          {/* Quick Actions Bar (when State or LGA is chosen) */}
          {selectedStateId && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-c-10">
              <div className="flex items-center gap-2">
                {selectedLgaId && lgaWards.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleToggleAllLgaWards}
                    className="text-xs font-semibold h-8 cursor-pointer"
                  >
                    {areAllLgaWardsSelected
                      ? `Remove All in ${selectedLgaName}`
                      : `+ Add All ${lgaWards.length} in ${selectedLgaName}`}
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoadingStateWards || stateWards.length === 0}
                  onClick={handleToggleAllStateWards}
                  className="text-xs font-semibold h-8 cursor-pointer flex items-center gap-1.5"
                >
                  {isLoadingStateWards ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : areAllStateWardsSelected ? (
                    <X className="size-3.5" />
                  ) : (
                    <Plus className="size-3.5" />
                  )}
                  <span>
                    {areAllStateWardsSelected
                      ? `Remove All in ${selectedStateName}`
                      : `+ Add All ${stateWards.length > 0 ? stateWards.length : ""} in ${selectedStateName}`}
                  </span>
                </Button>
              </div>

              <span className="text-xs font-medium text-c-50">
                {selectedWards.length} selected
              </span>
            </div>
          )}

          {/* Search Box (Active once an LGA is selected) */}
          {selectedLgaId && lgaWards.length > 0 && (
            <IconInput
              placeholder={`Search wards in ${selectedLgaName}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          )}

          {/* Wards Chips Container */}
          <div className="min-h-40 max-h-[45vh] overflow-y-auto pr-1 pt-1 text-left">
            {!selectedStateId ? (
              <div className="h-40 flex flex-col items-center justify-center text-center p-4">
                <p className="text-sm font-medium text-c-60">
                  Select a State and LGA above
                </p>
                <p className="text-xs text-c-40 mt-1 max-w-xs">
                  Choose a State and Local Government Area to browse and select wards dynamically.
                </p>
              </div>
            ) : !selectedLgaId ? (
              <div className="h-40 flex flex-col items-center justify-center text-center p-4">
                <p className="text-sm font-medium text-c-60">
                  Now select an LGA in {selectedStateName}
                </p>
                <p className="text-xs text-c-40 mt-1 max-w-xs">
                  Or click "Add All in {selectedStateName}" above to include all wards across the state.
                </p>
              </div>
            ) : isLoadingLgaWards ? (
              <div className="h-40 flex items-center justify-center">
                <Loader2 className="size-6 animate-spin text-c-40" />
              </div>
            ) : filteredLgaWards.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-center">
                <p className="text-sm text-c-50">
                  No wards found matching "{searchQuery}" in {selectedLgaName}.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[14px] font-bold text-c-75">
                    {selectedLgaName} LGA ({filteredLgaWards.length} Wards)
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filteredLgaWards.map((ward) => {
                    const isSelected = selectedWards.some(
                      (w) => w.id === ward.id,
                    );
                    return (
                      <SelectableChip
                        key={ward.id}
                        label={ward.name}
                        isSelected={isSelected}
                        onClick={() => onToggleWardSelection(ward)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogPadding>

        <DialogFooter className="flex items-center justify-between">
          <span className="text-sm font-medium text-c-60">
            Total Selected:{" "}
            <span className="font-bold text-c-90">{selectedWards.length}</span>
          </span>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-11 px-6 bg-success hover:bg-success-hover text-[16px] font-bold text-white rounded-xl cursor-pointer"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
