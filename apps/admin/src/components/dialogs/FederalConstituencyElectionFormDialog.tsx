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
import { getFederalConstituencies } from "#/lib/server/federal_constituencies";
import { SelectDate } from "@repo/ui/components/selects/date-select";
import { SelectOffice } from "@repo/ui/components/selects/office-select";
import { createFederalConstituencyElection } from "#/lib/server/elections";

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

interface FederalConstituencyItem {
  id: number;
  name: string;
  state_id: number;
  state_name?: string;
}

export function FederalConstituencyElectionFormDialog({
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
  const [isConstituencySelectorOpen, setIsConstituencySelectorOpen] =
    React.useState(false);
  const [constituenciesMode, setConstituenciesMode] = React.useState<
    "custom" | "all"
  >("custom");
  const [selectedConstituencies, setSelectedConstituencies] = React.useState<
    FederalConstituencyItem[]
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

  // Fetch all Federal Constituencies in Nigeria
  const { data: constituenciesData } = useQuery({
    queryKey: ["federal-constituencies-all"],
    queryFn: async () => {
      const res = await getFederalConstituencies({ data: { limit: 400 } });
      if (res && res.success && res.data?.constituencies) {
        return res.data.constituencies as FederalConstituencyItem[];
      }
      return [];
    },
    enabled: open,
  });

  const allNigeriaStates = statesData || [];
  const allConstituencies = constituenciesData || [];

  // Group constituencies by state name
  const groupedAllConstituencies = React.useMemo(() => {
    const groups: { [stateName: string]: FederalConstituencyItem[] } = {};
    for (const c of allConstituencies) {
      const state = allNigeriaStates.find((s) => s.id === c.state_id);
      const stateName = state?.name || c.state_name || `State ${c.state_id}`;
      if (!groups[stateName]) {
        groups[stateName] = [];
      }
      groups[stateName].push(c);
    }
    return groups;
  }, [allConstituencies, allNigeriaStates]);

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

  // Handle Constituencies Mode change
  React.useEffect(() => {
    if (
      constituenciesMode === "all" &&
      constituenciesData &&
      constituenciesData.length > 0
    ) {
      setSelectedConstituencies(constituenciesData);
    }
  }, [constituenciesMode, constituenciesData]);

  React.useEffect(() => {
    if (open) {
      form.setFieldValue("electionGroupId", undefined);
      form.setFieldValue("electionDate", "");
      form.setFieldValue("officeId", undefined);
      setConstituenciesMode("custom");
      setSelectedConstituencies([]);
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
      if (selectedConstituencies.length === 0) {
        throw new Error("At least one federal constituency must be selected");
      }

      let finalGroupId = values.electionGroupId;

      if (!finalGroupId) {
        const year = new Date(values.electionDate).getFullYear();
        const typeName = selectedType
          ? selectedType.name
          : "Federal Constituency";
        const autoGroupName = `${year} ${typeName} Election`;

        const { createElectionGroup } =
          await import("#/lib/server/election_groups");
        const groupRes = await createElectionGroup({
          data: {
            name: autoGroupName,
            rank: selectedType ? selectedType.rank : 1,
            elections_count: selectedConstituencies.length,
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

      const res = await createFederalConstituencyElection({
        data: {
          office_id: values.officeId,
          election_date: values.electionDate,
          election_group_id: finalGroupId!,
          federal_constituency_ids: selectedConstituencies.map((c) => c.id),
        },
      });

      if (!res.success) {
        throw new Error(
          res.message || "Failed to create federal constituency elections",
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

  const handleToggleConstituencySelection = (
    constituency: FederalConstituencyItem,
  ) => {
    setSelectedConstituencies((prev) => {
      const exists = prev.some((c) => c.id === constituency.id);
      if (exists) {
        const next = prev.filter((c) => c.id !== constituency.id);
        if (next.length !== allConstituencies.length) {
          setConstituenciesMode("custom");
        }
        return next;
      } else {
        const next = [...prev, constituency];
        if (next.length === allConstituencies.length) {
          setConstituenciesMode("all");
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

  // Group selected constituencies by state for rendering
  const selectedConstituenciesByState = React.useMemo(() => {
    const groups: { [stateName: string]: FederalConstituencyItem[] } = {};
    for (const c of selectedConstituencies) {
      const state = allNigeriaStates.find((s) => s.id === c.state_id);
      const stateName = state?.name || c.state_name || `State ${c.state_id}`;
      if (!groups[stateName]) {
        groups[stateName] = [];
      }
      groups[stateName].push(c);
    }
    return groups;
  }, [selectedConstituencies, allNigeriaStates]);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl   overflow-visible">
          <DialogHeader title="Federal Constituency Election" />

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
                        filterScope="federal-constituency"
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

              {/* Federal Constituencies Section */}
              <div className="space-y-3">
                <SelectionHeader
                  label="Federal constituencies"
                  buttonLabel="Federal constituency"
                  onOpenSelector={() => setIsConstituencySelectorOpen(true)}
                />

                <SelectionTabs
                  mode={constituenciesMode}
                  setMode={setConstituenciesMode}
                  items={selectedConstituencies}
                  allItems={allConstituencies}
                  setItems={setSelectedConstituencies}
                  allLabel={`All federal constituencies (${allConstituencies.length || 360})`}
                />

                <SelectedItemsContainer
                  items={selectedConstituencies}
                  emptyPlaceholder="0 federal constituencies added"
                >
                  <div className="space-y-4 w-full text-left">
                    {Object.entries(selectedConstituenciesByState).map(
                      ([stateName, stateConstituencies]) => (
                        <div key={stateName} className="space-y-2">
                          <h4 className="text-[13px] font-bold text-c-50 tracking-wide uppercase">
                            {stateName}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {stateConstituencies.map((constituency) => (
                              <div
                                key={constituency.id}
                                className="h-9 flex items-center gap-2.5 pl-3 pr-2 bg-background rounded-[10px] text-sm text-c-80"
                              >
                                <span>{constituency.name}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleConstituencySelection(
                                      constituency,
                                    )
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

      {/* Sub-dialog: Constituency Selector (Grouped by State) */}
      <FederalConstituencySelectorDialog
        open={isConstituencySelectorOpen}
        onOpenChange={setIsConstituencySelectorOpen}
        groupedAllConstituencies={groupedAllConstituencies}
        selectedConstituencies={selectedConstituencies}
        onToggleConstituencySelection={handleToggleConstituencySelection}
      />
    </>
  );
}

interface FederalConstituencySelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupedAllConstituencies: Record<string, FederalConstituencyItem[]>;
  selectedConstituencies: FederalConstituencyItem[];
  onToggleConstituencySelection: (
    constituency: FederalConstituencyItem,
  ) => void;
}

function FederalConstituencySelectorDialog({
  open,
  onOpenChange,
  groupedAllConstituencies,
  selectedConstituencies,
  onToggleConstituencySelection,
}: FederalConstituencySelectorDialogProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setSearchQuery("");
    }
  }, [open]);

  const filteredGroupedConstituencies = React.useMemo(() => {
    if (!searchQuery.trim()) return groupedAllConstituencies;
    const q = searchQuery.toLowerCase();
    const result: Record<string, FederalConstituencyItem[]> = {};

    for (const [stateName, constituencies] of Object.entries(
      groupedAllConstituencies,
    )) {
      const stateMatches = stateName.toLowerCase().includes(q);
      if (stateMatches) {
        result[stateName] = constituencies;
      } else {
        const filtered = constituencies.filter((c) =>
          c.name.toLowerCase().includes(q),
        );
        if (filtered.length > 0) {
          result[stateName] = filtered;
        }
      }
    }
    return result;
  }, [groupedAllConstituencies, searchQuery]);

  const hasResults = Object.keys(filteredGroupedConstituencies).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[620px] p-0 rounded-2xl border-none shadow-2xl  ">
        <DialogHeader title="Select Federal Constituencies" />
        <DialogPadding className="space-y-4 pb-6">
          <p className="text-sm text-c-60">
            Select the federal constituencies to add to this election.
          </p>

          <IconInput
            placeholder="Search constituencies or states..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-1 pt-2">
            {!hasResults ? (
              <p className="text-sm text-c-50 py-4 text-center">
                No federal constituencies found matching your search.
              </p>
            ) : (
              Object.entries(filteredGroupedConstituencies).map(
                ([stateName, stateConstituencies]) => (
                  <div key={stateName} className="space-y-2">
                    <GroupSectionTitle title={stateName} />
                    <div className="flex flex-wrap gap-2">
                      {stateConstituencies.map((constituency) => {
                        const isSelected = selectedConstituencies.some(
                          (c) => c.id === constituency.id,
                        );
                        return (
                          <SelectableChip
                            key={constituency.id}
                            label={constituency.name}
                            isSelected={isSelected}
                            onClick={() =>
                              onToggleConstituencySelection(constituency)
                            }
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
