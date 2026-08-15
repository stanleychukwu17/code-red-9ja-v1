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
import { getOffices } from "#/lib/server/offices";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getStates } from "#/lib/server/states";
import { getLGAs } from "#/lib/server/countries";
import { SelectDate } from "@repo/ui/components/selects/date-select";
import { SelectOffice } from "@repo/ui/components/selects/office-select";
import { cn } from "@repo/ui/lib/utils";
import { ElectionGroupBullet } from "@repo/ui/components/bullets/election-group-bullet";
import { createLgaElection } from "#/lib/server/elections";
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

interface LgaItem {
  id: number;
  name: string;
  state_id: number;
  state_name?: string;
}

export function LgaElectionFormDialog({
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
  const [isLgaSelectorOpen, setIsLgaSelectorOpen] = React.useState(false);
  const [lgasMode, setLgasMode] = React.useState<"custom" | "all">("custom");
  const [selectedLgas, setSelectedLgas] = React.useState<LgaItem[]>([]);
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

  // Fetch all LGAs in Nigeria
  const { data: lgasData } = useQuery({
    queryKey: ["lgas-all"],
    queryFn: async () => {
      const res = await getLGAs({ data: { limit: 800 } });
      if (res && res.success && res.data?.lgas) {
        return res.data.lgas as LgaItem[];
      }
      return [];
    },
    enabled: open,
  });

  const allNigeriaStates = statesData || [];
  const allLgas = lgasData || [];

  // Group LGAs by state name
  const groupedAllLgas = React.useMemo(() => {
    const groups: { [stateName: string]: LgaItem[] } = {};
    for (const l of allLgas) {
      const state = allNigeriaStates.find((s) => s.id === l.state_id);
      const stateName = state?.name || l.state_name || `State ${l.state_id}`;
      if (!groups[stateName]) {
        groups[stateName] = [];
      }
      groups[stateName].push(l);
    }
    return groups;
  }, [allLgas, allNigeriaStates]);

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

  // Handle LGAs Mode change
  React.useEffect(() => {
    if (lgasMode === "all" && lgasData && lgasData.length > 0) {
      setSelectedLgas(lgasData);
    }
  }, [lgasMode, lgasData]);

  React.useEffect(() => {
    if (open) {
      form.setFieldValue("electionGroupId", undefined);
      form.setFieldValue("electionDate", "");
      form.setFieldValue("officeId", undefined);
      setLgasMode("custom");
      setSelectedLgas([]);
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
      if (selectedLgas.length === 0) {
        throw new Error("At least one LGA must be selected");
      }

      let finalGroupId = values.electionGroupId;

      if (!finalGroupId) {
        const year = new Date(values.electionDate).getFullYear();
        const typeName = selectedType ? selectedType.name : "LGA";
        const autoGroupName = `${year} ${typeName} Election`;

        const { createElectionGroup } =
          await import("#/lib/server/election_groups");
        const groupRes = await createElectionGroup({
          data: {
            name: autoGroupName,
            rank: selectedType ? selectedType.rank : 1,
            elections_count: selectedLgas.length,
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

      const res = await createLgaElection({
        data: {
          office_id: values.officeId,
          election_date: values.electionDate,
          election_group_id: finalGroupId!,
          lga_ids: selectedLgas.map((l) => l.id),
        },
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to create LGA elections");
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

  const handleToggleLgaSelection = (lga: LgaItem) => {
    setSelectedLgas((prev) => {
      const exists = prev.some((l) => l.id === lga.id);
      if (exists) {
        const next = prev.filter((l) => l.id !== lga.id);
        if (next.length !== allLgas.length) {
          setLgasMode("custom");
        }
        return next;
      } else {
        const next = [...prev, lga];
        if (next.length === allLgas.length) {
          setLgasMode("all");
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

  // Group selected LGAs by state for rendering
  const selectedLgasByState = React.useMemo(() => {
    const groups: { [stateName: string]: LgaItem[] } = {};
    for (const l of selectedLgas) {
      const state = allNigeriaStates.find((s) => s.id === l.state_id);
      const stateName = state?.name || l.state_name || `State ${l.state_id}`;
      if (!groups[stateName]) {
        groups[stateName] = [];
      }
      groups[stateName].push(l);
    }
    return groups;
  }, [selectedLgas, allNigeriaStates]);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl   overflow-visible">
          <DialogHeader title="LGA Election" />

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
                        filterScope="lga"
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

              {/* LGAs Section */}
              <div className="space-y-3">
                <SelectionHeader
                  label="LGAs"
                  buttonLabel="LGA"
                  onOpenSelector={() => setIsLgaSelectorOpen(true)}
                />

                <SelectionTabs
                  mode={lgasMode}
                  setMode={setLgasMode}
                  items={selectedLgas}
                  allItems={allLgas}
                  setItems={setSelectedLgas}
                  allLabel={`All LGAs (${allLgas.length || 774})`}
                />

                <SelectedItemsContainer
                  items={selectedLgas}
                  emptyPlaceholder="0 LGAs added"
                >
                  <div className="space-y-4 w-full text-left">
                    {Object.entries(selectedLgasByState).map(
                      ([stateName, stateLgas]) => (
                        <div key={stateName} className="space-y-2">
                          <h4 className="text-[13px] font-bold text-c-50 tracking-wide uppercase">
                            {stateName}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {stateLgas.map((lga) => (
                              <div
                                key={lga.id}
                                className="h-9 flex items-center gap-2.5 pl-3 pr-2 bg-background rounded-[10px] text-sm text-c-80"
                              >
                                <span>{lga.name}</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleLgaSelection(lga)}
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

      {/* Sub-dialog: LGA Selector (Grouped by State) */}
      <LgaSelectorDialog
        open={isLgaSelectorOpen}
        onOpenChange={setIsLgaSelectorOpen}
        groupedAllLgas={groupedAllLgas}
        selectedLgas={selectedLgas}
        onToggleLgaSelection={handleToggleLgaSelection}
      />
    </>
  );
}

interface LgaSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupedAllLgas: Record<string, LgaItem[]>;
  selectedLgas: LgaItem[];
  onToggleLgaSelection: (lga: LgaItem) => void;
}

function LgaSelectorDialog({
  open,
  onOpenChange,
  groupedAllLgas,
  selectedLgas,
  onToggleLgaSelection,
}: LgaSelectorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[620px] p-0 rounded-2xl border-none shadow-2xl  ">
        <DialogHeader title="Select LGAs" />
        <DialogPadding className="space-y-4 pb-6">
          <p className="text-sm text-c-60">
            Select the LGAs to add to this election.
          </p>

          <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-1 pt-2">
            {Object.entries(groupedAllLgas).map(([stateName, stateLgas]) => (
              <div key={stateName} className="space-y-2">
                <h4 className="text-[14px] font-bold text-c-75 border-b pb-1">
                  {stateName}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {stateLgas.map((lga) => {
                    const isSelected = selectedLgas.some(
                      (l) => l.id === lga.id,
                    );
                    return (
                      <button
                        key={lga.id}
                        type="button"
                        onClick={() => onToggleLgaSelection(lga)}
                        className={cn(
                          "px-3.5 py-2 rounded-lg text-sm font-semibold transition cursor-pointer border",
                          isSelected
                            ? "bg-[#e8fbf3] text-[#00cf79] border-[#00cf79]"
                            : "bg-c-5/40 text-c-70 border-[#dfdfdf] hover:bg-black/5",
                        )}
                      >
                        {lga.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
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
