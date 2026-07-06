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
import { Loader2, X } from "lucide-react";
import { getOffices } from "#/lib/server/offices";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getLGAs } from "#/lib/server/countries";
import { getStates } from "#/lib/server/states";
import { getWards } from "#/lib/server/wards";
import { SelectDate } from "@repo/ui/components/selects/date-select";
import { SelectOffice } from "@repo/ui/components/selects/office-select";
import { cn } from "@repo/ui/lib/utils";
import { ElectionGroupBullet } from "@repo/ui/components/bullets/election-group-bullet";
import { createWardElection } from "#/lib/server/elections";
import {
  SelectionHeader,
  SelectionTabs,
  SelectedItemsContainer,
} from "./SelectionCommon";
import { Label } from "@repo/ui/components/input";

interface StateItem {
  id: number;
  name: string;
}

interface LgaItem {
  id: number;
  name: string;
  state_id: number;
}

interface WardItem {
  id: number;
  name: string;
  lga_id: number;
  lga_name?: string;
  state_id?: number;
  state_name?: string;
}

export function WardElectionFormDialog({
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
  const [isWardSelectorOpen, setIsWardSelectorOpen] = React.useState(false);
  const [wardsMode, setWardsMode] = React.useState<"custom" | "all">("custom");
  const [selectedWards, setSelectedWards] = React.useState<WardItem[]>([]);
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

  // Fetch LGAs in Nigeria
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

  // Fetch Wards in Nigeria
  const { data: wardsData } = useQuery({
    queryKey: ["wards-all"],
    queryFn: async () => {
      const res = await getWards({ data: { limit: 10000 } });
      if (res && res.success && res.data?.wards) {
        return res.data.wards as WardItem[];
      }
      return [];
    },
    enabled: open,
  });

  const allNigeriaStates = statesData || [];
  const allLgas = lgasData || [];
  const allWards = wardsData || [];

  // Group Wards by State and LGA names
  const groupedAllWards = React.useMemo(() => {
    const groups: { [stateName: string]: { [lgaName: string]: WardItem[] } } =
      {};
    for (const w of allWards) {
      const lga = allLgas.find((l) => l.id === w.lga_id);
      const state = lga
        ? allNigeriaStates.find((s) => s.id === lga.state_id)
        : null;
      const stateName = state?.name || w.state_name || "Unknown State";
      const lgaName = lga?.name || w.lga_name || "Unknown LGA";

      if (!groups[stateName]) {
        groups[stateName] = {};
      }
      if (!groups[stateName][lgaName]) {
        groups[stateName][lgaName] = [];
      }
      groups[stateName][lgaName].push(w);
    }
    return groups;
  }, [allWards, allLgas, allNigeriaStates]);

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

  // Handle Wards Mode change
  React.useEffect(() => {
    if (wardsMode === "all" && wardsData && wardsData.length > 0) {
      setSelectedWards(wardsData);
    }
  }, [wardsMode, wardsData]);

  React.useEffect(() => {
    if (open) {
      form.setFieldValue("electionGroupId", undefined);
      form.setFieldValue("electionDate", "");
      form.setFieldValue("officeId", undefined);
      setWardsMode("custom");
      setSelectedWards([]);
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
      if (selectedWards.length === 0) {
        throw new Error("At least one Ward must be selected");
      }

      let finalGroupId = values.electionGroupId;

      if (!finalGroupId) {
        const year = new Date(values.electionDate).getFullYear();
        const typeName = selectedType ? selectedType.name : "Ward";
        const autoGroupName = `${year} ${typeName} Election`;

        const { createElectionGroup } =
          await import("#/lib/server/election_groups");
        const groupRes = await createElectionGroup({
          data: {
            name: autoGroupName,
            rank: selectedType ? selectedType.rank : 1,
            elections_count: selectedWards.length,
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

      const res = await createWardElection({
        data: {
          office_id: values.officeId,
          election_date: values.electionDate,
          election_group_id: finalGroupId!,
          ward_ids: selectedWards.map((w) => w.id),
        },
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to create Ward elections");
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

  const handleToggleWardSelection = (ward: WardItem) => {
    setSelectedWards((prev) => {
      const exists = prev.some((w) => w.id === ward.id);
      if (exists) {
        const next = prev.filter((w) => w.id !== ward.id);
        if (next.length !== allWards.length) {
          setWardsMode("custom");
        }
        return next;
      } else {
        const next = [...prev, ward];
        if (next.length === allWards.length) {
          setWardsMode("all");
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

  // Group selected Wards by State name for rendering
  const selectedWardsByState = React.useMemo(() => {
    const groups: { [stateName: string]: WardItem[] } = {};
    for (const w of selectedWards) {
      const lga = allLgas.find((l) => l.id === w.lga_id);
      const state = lga
        ? allNigeriaStates.find((s) => s.id === lga.state_id)
        : null;
      const stateName = state?.name || w.state_name || "Unknown State";
      if (!groups[stateName]) {
        groups[stateName] = [];
      }
      groups[stateName].push(w);
    }
    return groups;
  }, [selectedWards, allLgas, allNigeriaStates]);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl bg-white overflow-visible">
          <DialogHeader title="Ward Election" />

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
                        fetchOffices={getOffices}
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

              {/* Wards Section */}
              <div className="space-y-3">
                <SelectionHeader
                  label="Wards"
                  buttonLabel="Ward"
                  onOpenSelector={() => setIsWardSelectorOpen(true)}
                />

                <SelectionTabs
                  mode={wardsMode}
                  setMode={setWardsMode}
                  items={selectedWards}
                  allItems={allWards}
                  setItems={setSelectedWards}
                  allLabel={`All Wards (${allWards.length || "8,809"})`}
                />

                <SelectedItemsContainer
                  items={selectedWards}
                  emptyPlaceholder="0 Wards added"
                >
                  <div className="space-y-4 w-full text-left">
                    {Object.entries(selectedWardsByState).map(
                      ([stateName, stateWards]) => (
                        <div key={stateName} className="space-y-2">
                          <h4 className="text-[13px] font-bold text-c-50 tracking-wide uppercase">
                            {stateName}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {stateWards.map((ward) => (
                              <div
                                key={ward.id}
                                className="h-9 flex items-center gap-2.5 pl-3 pr-2 bg-background rounded-[10px] text-sm text-c-80"
                              >
                                <span>{ward.name}</span>
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
                className="h-11 px-6 bg-[#00cf79] hover:bg-[#00b568] text-[16px] font-bold text-white rounded-xl cursor-pointer flex items-center gap-2"
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

      {/* Sub-dialog: Ward Selector */}
      <WardSelectorDialog
        open={isWardSelectorOpen}
        onOpenChange={setIsWardSelectorOpen}
        groupedAllWards={groupedAllWards}
        selectedWards={selectedWards}
        onToggleWardSelection={handleToggleWardSelection}
      />
    </>
  );
}

interface WardSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupedAllWards: Record<string, Record<string, WardItem[]>>;
  selectedWards: WardItem[];
  onToggleWardSelection: (ward: WardItem) => void;
}

function WardSelectorDialog({
  open,
  onOpenChange,
  groupedAllWards,
  selectedWards,
  onToggleWardSelection,
}: WardSelectorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[620px] p-0 rounded-2xl border-none shadow-2xl bg-white">
        <DialogHeader title="Select Wards" />
        <DialogPadding className="space-y-4 pb-6">
          <p className="text-sm text-c-60">
            Select the Wards to add to this election.
          </p>

          <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-1 pt-2 text-left">
            {Object.entries(groupedAllWards).map(([stateName, stateLgas]) => (
              <div key={stateName} className="space-y-4">
                <h3 className="text-base font-bold text-c-80 border-b pb-1">
                  {stateName}
                </h3>
                {Object.entries(stateLgas).map(([lgaName, lgaWards]) => (
                  <div key={lgaName} className="pl-3 space-y-2">
                    <h4 className="text-[13px] font-bold text-c-50 uppercase tracking-wider">
                      {lgaName} LGA
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {lgaWards.map((ward) => {
                        const isSelected = selectedWards.some(
                          (w) => w.id === ward.id,
                        );
                        return (
                          <button
                            key={ward.id}
                            type="button"
                            onClick={() => onToggleWardSelection(ward)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-sm font-semibold transition cursor-pointer border",
                              isSelected
                                ? "bg-[#e8fbf3] text-[#00cf79] border-[#00cf79]"
                                : "bg-c-5/40 text-c-70 border-[#dfdfdf] hover:bg-black/5",
                            )}
                          >
                            {ward.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </DialogPadding>
        <DialogFooter>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-11 px-6 bg-[#00cf79] hover:bg-[#00b568] text-[16px] font-bold text-white rounded-xl cursor-pointer"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
