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
import { getStates } from "#/lib/server/states";
import { getSenatorialDistricts } from "#/lib/server/senatorial_districts";
import { createSenatorialDistrictElection } from "#/lib/server/elections";
import { SelectDate } from "@repo/ui/components/selects/date-select";
import { SelectOffice } from "@repo/ui/components/selects/office-select";

import { cn } from "@repo/ui/lib/utils";
import {
  SelectionHeader,
  SelectionTabs,
  SelectedItemsContainer,
  GroupSectionTitle,
  SelectableChip,
} from "./SelectionCommon";
import { Label, IconInput } from "@repo/ui/components/input";
import { TinyError } from "@repo/ui/components/custom/TinyError";

interface StateItem {
  id: number;
  name: string;
}

interface SenatorialDistrictItem {
  id: number;
  name: string;
  state_id: number;
  state_name?: string;
}

export function SenatorialDistrictElectionFormDialog({
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
  const [isDistrictSelectorOpen, setIsDistrictSelectorOpen] =
    React.useState(false);
  const [districtsMode, setDistrictsMode] = React.useState<"custom" | "all">(
    "custom",
  );
  const [selectedDistricts, setSelectedDistricts] = React.useState<
    SenatorialDistrictItem[]
  >([]);
  const [selectedGroupDate, setSelectedGroupDate] = React.useState<
    string | null
  >(null);

  // Fetch states of Nigeria
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

  // Fetch all Senatorial Districts in Nigeria
  const { data: districtsData } = useQuery({
    queryKey: ["senatorial-districts-all"],
    queryFn: async () => {
      const res = await getSenatorialDistricts({ data: { limit: 150 } });
      if (res && res.success && res.data?.districts) {
        return res.data.districts as SenatorialDistrictItem[];
      }
      return [];
    },
    enabled: open,
  });

  const allNigeriaStates = statesData || [];
  const allDistricts = districtsData || [];

  // Group districts by state name (fallback to state_id if state_name not provided)
  const groupedAllDistricts = React.useMemo(() => {
    const groups: { [stateName: string]: SenatorialDistrictItem[] } = {};
    for (const d of allDistricts) {
      const state = allNigeriaStates.find((s) => s.id === d.state_id);
      const stateName = state?.name || d.state_name || `State ${d.state_id}`;
      if (!groups[stateName]) {
        groups[stateName] = [];
      }
      groups[stateName].push(d);
    }
    return groups;
  }, [allDistricts, allNigeriaStates]);

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

  // Handle Districts Mode change
  React.useEffect(() => {
    if (districtsMode === "all" && districtsData && districtsData.length > 0) {
      setSelectedDistricts(districtsData);
    }
  }, [districtsMode, districtsData]);

  React.useEffect(() => {
    if (open) {
      form.setFieldValue("electionGroupId", undefined);
      form.setFieldValue("electionDate", "");
      form.setFieldValue("officeId", undefined);
      setDistrictsMode("custom");
      setSelectedDistricts([]);
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
      if (selectedDistricts.length === 0) {
        throw new Error("At least one district must be selected");
      }

      let finalGroupId = values.electionGroupId;

      if (!finalGroupId) {
        const year = new Date(values.electionDate).getFullYear();
        const typeName = selectedType
          ? selectedType.name
          : "Senatorial District";
        const autoGroupName = `${year} ${typeName} Election`;

        const { createElectionGroup } =
          await import("#/lib/server/election_groups");
        const groupRes = await createElectionGroup({
          data: {
            name: autoGroupName,
            rank: selectedType ? selectedType.rank : 1,
            elections_count: selectedDistricts.length,
            states_count: 37,
            election_date: values.electionDate,
          },
        });

        if (!groupRes.success) {
          throw new Error(
            groupRes.message || "Failed to auto-create election group",
          );
        }
        finalGroupId = groupRes.data.id;
      }

      const res = await createSenatorialDistrictElection({
        data: {
          office_id: values.officeId,
          election_date: values.electionDate,
          election_group_id: finalGroupId!,
          senatorial_district_ids: selectedDistricts.map((d) => d.id),
        },
      });

      if (!res.success) {
        throw new Error(
          res.message || "Failed to create senatorial district elections",
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elections"] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  const handleToggleDistrictSelection = (district: SenatorialDistrictItem) => {
    setSelectedDistricts((prev) => {
      const exists = prev.some((d) => d.id === district.id);
      if (exists) {
        const next = prev.filter((d) => d.id !== district.id);
        if (next.length !== allDistricts.length) {
          setDistrictsMode("custom");
        }
        return next;
      } else {
        const next = [...prev, district];
        if (next.length === allDistricts.length) {
          setDistrictsMode("all");
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

  // Group selected districts by state for rendering
  const selectedDistrictsByState = React.useMemo(() => {
    const groups: { [stateName: string]: SenatorialDistrictItem[] } = {};
    for (const d of selectedDistricts) {
      const state = allNigeriaStates.find((s) => s.id === d.state_id);
      const stateName = state?.name || d.state_name || `State ${d.state_id}`;
      if (!groups[stateName]) {
        groups[stateName] = [];
      }
      groups[stateName].push(d);
    }
    return groups;
  }, [selectedDistricts, allNigeriaStates]);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl   overflow-visible">
          <DialogHeader title="Senatorial District Election" />

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
                        filterScope="senatorial-district"
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

              {/* Districts Section */}
              <div className="space-y-3">
                <SelectionHeader
                  label="Districts"
                  buttonLabel="District"
                  onOpenSelector={() => setIsDistrictSelectorOpen(true)}
                />

                <SelectionTabs
                  mode={districtsMode}
                  setMode={setDistrictsMode}
                  items={selectedDistricts}
                  allItems={allDistricts}
                  setItems={setSelectedDistricts}
                  allLabel={`All districts (${allDistricts.length || 109})`}
                />

                <SelectedItemsContainer
                  items={selectedDistricts}
                  emptyPlaceholder="0 districts added"
                >
                  <div className="space-y-4 w-full text-left">
                    {Object.entries(selectedDistrictsByState).map(
                      ([stateName, stateDistricts]) => (
                        <div key={stateName} className="space-y-2">
                          <h4 className="text-[13px] font-bold text-c-50 tracking-wide uppercase">
                            {stateName}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {stateDistricts.map((district) => (
                              <div
                                key={district.id}
                                className="h-9 flex items-center gap-2.5 pl-3 pr-2 bg-background rounded-[10px] text-sm text-c-80"
                              >
                                <span>{district.name}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleDistrictSelection(district)
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

      {/* Sub-dialog: District Selector (Grouped by State) */}
      <SenatorialDistrictSelectorDialog
        open={isDistrictSelectorOpen}
        onOpenChange={setIsDistrictSelectorOpen}
        groupedAllDistricts={groupedAllDistricts}
        selectedDistricts={selectedDistricts}
        onToggleDistrictSelection={handleToggleDistrictSelection}
      />
    </>
  );
}

interface SenatorialDistrictSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupedAllDistricts: Record<string, SenatorialDistrictItem[]>;
  selectedDistricts: SenatorialDistrictItem[];
  onToggleDistrictSelection: (district: SenatorialDistrictItem) => void;
}

function SenatorialDistrictSelectorDialog({
  open,
  onOpenChange,
  groupedAllDistricts,
  selectedDistricts,
  onToggleDistrictSelection,
}: SenatorialDistrictSelectorDialogProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setSearchQuery("");
    }
  }, [open]);

  const filteredGroupedDistricts = React.useMemo(() => {
    if (!searchQuery.trim()) return groupedAllDistricts;
    const q = searchQuery.toLowerCase();
    const result: Record<string, SenatorialDistrictItem[]> = {};

    for (const [stateName, districts] of Object.entries(groupedAllDistricts)) {
      const stateMatches = stateName.toLowerCase().includes(q);
      if (stateMatches) {
        result[stateName] = districts;
      } else {
        const filtered = districts.filter((d) =>
          d.name.toLowerCase().includes(q),
        );
        if (filtered.length > 0) {
          result[stateName] = filtered;
        }
      }
    }
    return result;
  }, [groupedAllDistricts, searchQuery]);

  const hasResults = Object.keys(filteredGroupedDistricts).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[620px] p-0 rounded-2xl border-none shadow-2xl  ">
        <DialogHeader title="Select Senatorial Districts" />
        <DialogPadding className="space-y-4 pb-6">
          <p className="text-sm text-c-60">
            Select the senatorial districts to add to this election.
          </p>

          <IconInput
            placeholder="Search districts or states..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-1 pt-2">
            {!hasResults ? (
              <p className="text-sm text-c-50 py-4 text-center">
                No senatorial districts found matching your search.
              </p>
            ) : (
              Object.entries(filteredGroupedDistricts).map(
                ([stateName, stateDistricts]) => (
                  <div key={stateName} className="space-y-2">
                    <GroupSectionTitle title={stateName} />
                    <div className="flex flex-wrap gap-2">
                      {stateDistricts.map((district) => {
                        const isSelected = selectedDistricts.some(
                          (d) => d.id === district.id,
                        );
                        return (
                          <SelectableChip
                            key={district.id}
                            label={district.name}
                            isSelected={isSelected}
                            onClick={() => onToggleDistrictSelection(district)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ),
              )
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
