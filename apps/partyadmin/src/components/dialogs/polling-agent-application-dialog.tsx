import * as React from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getPollingUnitRecommendations, getPollingUnits, getLGAs, getWards } from "#/lib/server/applications";
import { getStates } from "#/lib/server/countries";
import { SelectState } from "@repo/ui/components/selects/state-select";
import { SelectLga } from "@repo/ui/components/selects/lga-select";
import { SelectWard } from "@repo/ui/components/selects/ward-select";
import { type ApplicationData } from "./PollingAgentDialogContext";

const getPgString = (val: any) => {
  if (val && typeof val === "object" && "String" in val) {
    return val.String || "";
  }
  return val || "";
};

const fetchStatesAdapter = async (args: {
  data: { countryId: number; limit?: number; cursor?: string };
}) => {
  return getStates({
    data: {
      countryId: args.data.countryId,
      limit: args.data.limit,
      cursor: args.data.cursor,
    },
  });
};

const fetchLgasAdapter = async (args: {
  data: { stateId?: number; limit?: number; cursor?: string };
}) => {
  return getLGAs({
    data: {
      stateId: args.data.stateId,
    },
  });
};

const fetchWardsAdapter = async (args: {
  data: { lga_id?: number; stateId?: number; limit?: number; cursor?: string };
}) => {
  return getWards({
    data: {
      lga_id: args.data.lga_id,
      stateId: args.data.stateId,
    },
  });
};

interface PollingAgentApplicationDialogProps {
  open: boolean;
  onClose: () => void;
  application: ApplicationData;
}

type PollingUnitOption = {
  id: string;
  name: string;
  subLocation: string;
  agentsCount: number;
  ward: string;
};

export function PollingAgentApplicationDialog({
  open,
  onClose,
  application,
}: PollingAgentApplicationDialogProps) {
  const [selectedUnitId, setSelectedUnitId] = React.useState<string>("");
  const [currentOptions, setCurrentOptions] = React.useState<
    PollingUnitOption[]
  >([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [openChooseDialog, setOpenChooseDialog] = React.useState(false);

  const votersCardImage = getPgString(application.voters_card_image);

  // Fetch recommendations: applicant's unit + 2 lowest-agent-count units in the LGA
  const canFetchRecommendations =
    open && !!application.partyId && !!application.electionGroupId;

  const { data: recData, isLoading: isUnitsLoading } = useQuery({
    queryKey: [
      "puRecommendations",
      application.partyId,
      application.electionGroupId,
      application.lgaId,
      application.pollingUnitId,
    ],
    queryFn: async () => {
      const res = await getPollingUnitRecommendations({
        data: {
          partyID: application.partyId!,
          electionGroupID: application.electionGroupId!,
          lgaID: application.lgaId,
          pollingUnitID: application.pollingUnitId,
        },
      });
      if (res && res.success && Array.isArray(res.data?.polling_units)) {
        return res.data.polling_units as Array<{
          id: number;
          name: string;
          ward_name: string;
          lga_name: string;
          state_name: string;
          agents_count: number;
        }>;
      }
      return [];
    },
    enabled: canFetchRecommendations,
  });

  const pollingUnits: PollingUnitOption[] = React.useMemo(() => {
    if (!recData) return [];
    return recData.map((pu) => ({
      id: String(pu.id),
      name: pu.name,
      subLocation: pu.lga_name || pu.state_name || "",
      agentsCount: pu.agents_count,
      ward: pu.ward_name || "UNKNOWN WARD",
    }));
  }, [recData]);

  // Auto-select applicant's polling unit on load
  React.useEffect(() => {
    const firstUnit = pollingUnits[0];
    if (firstUnit) {
      setCurrentOptions(pollingUnits);
      // Prefer the applicant's submitted unit
      const applicantUnit = application.pollingUnitId
        ? pollingUnits.find((u) => u.id === String(application.pollingUnitId))
        : undefined;
      setSelectedUnitId(applicantUnit?.id ?? firstUnit.id);
    }
  }, [pollingUnits, application.pollingUnitId]);

  const handleChooseAnother = () => {
    setOpenChooseDialog(true);
  };

  const handleSelectUnit = (id: string) => {
    setSelectedUnitId(id);
  };

  const handleAccept = async () => {
    if (!selectedUnitId && pollingUnits.length > 0) {
      alert("Please select a polling unit to assign.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (application.onApprove && selectedUnitId) {
        await application.onApprove(Number(selectedUnitId));
      }
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to approve application");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (application.onReject) {
      const reason = window.prompt("Enter rejection reason:");
      if (reason === null) return; // user cancelled prompt
      if (reason.trim() === "") {
        alert("A rejection reason is required.");
        return;
      }
      setIsSubmitting(true);
      try {
        await application.onReject(reason);
      } catch (err: any) {
        alert(err.message || "Failed to reject application");
        return;
      } finally {
        setIsSubmitting(false);
      }
    }
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[620px] p-0 rounded-2xl border-none shadow-2xl bg-white overflow-hidden">
          <DialogHeader title="Polling Agent Application" />

          <DialogPadding className="space-y-5 pt-3 pb-5 max-h-[65vh] overflow-y-auto">
            {/* Profile Block */}
            <div className="flex gap-5 items-start">
              <img
                src={application.avatar}
                alt={application.name}
                className="size-28 rounded-full object-cover shrink-0 border border-gray-100 shadow-sm"
              />
              <div className="space-y-1.5">
                <h3 className="text-xl font-semibold text-c-80 leading-tight">
                  {application.name}
                </h3>
                <p className="text-sm text-c-50">{application.location}</p>
                <p className="text-sm text-c-60 capitalize">
                  {application.election}
                </p>
                <div className="flex items-center gap-3 text-sm">
                  {application.partyLogo ? (
                    <img
                      src={application.partyLogo}
                      alt={application.partyShortName || "Party"}
                      className="size-[22px] rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <p className="leading-0.5">{application.partyShortName}</p>
                  )}
                  <span className="text-c-60 pt-0.5">
                    {application.partyShortName || "Party"}
                  </span>
                </div>
              </div>
            </div>

            {/* Voters Identification Block (Purple) */}
            <div className="flex items-center justify-between gap-4 rounded-xl bg-[#f5f0ff] px-5 py-4">
              <div className="space-y-2">
                <p className="text-[14px] text-c-70">
                  Voters Identification Number
                </p>
                <p className="font-medium text-c-90">
                  {application.voterId || "904284758271"}
                </p>
                {application.phone && (
                  <p className="text-[13px] text-c-60">
                    📞 {application.phone}
                  </p>
                )}
              </div>
              {/* Voter Card Image / UI */}
              {votersCardImage && (
                <a
                  href={votersCardImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-[80px] h-[50px] rounded-lg border border-gray-200 shrink-0 relative overflow-hidden shadow-sm hover:opacity-90 transition cursor-pointer"
                >
                  <img
                    src={votersCardImage}
                    alt="Voters Card"
                    className="w-full h-full object-cover"
                  />
                </a>
              )}
            </div>

            {/* Assign Polling Unit Header */}
            <div className="flex items-center justify-between pt-2">
              <h4 className="text-[16px] font-medium text-c-80">
                Assign Polling Unit
              </h4>
              <button
                type="button"
                onClick={handleChooseAnother}
                className="text-[15px] font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:pointer-events-none transition cursor-pointer"
              >
                Choose another polling unit
              </button>
            </div>

            {/* Polling Units list */}
            <div className="space-y-3">
              {isUnitsLoading ? (
                <div className="py-8 flex flex-col items-center justify-center text-c-50 gap-2">
                  <Loader2 className="size-6 animate-spin text-blue-600" />
                  <p className="text-sm">Loading recommendations...</p>
                </div>
              ) : !canFetchRecommendations ? (
                <p className="text-center text-c-50 py-4 text-sm">
                  Party or election context missing — cannot load recommendations.
                </p>
              ) : pollingUnits.length === 0 ? (
                <p className="text-center text-c-50 py-4 text-sm">
                  No polling units found in this applicant's LGA.
                </p>
              ) : (
                currentOptions.map((unit) => {
                  const isSelected = selectedUnitId === unit.id;
                  const isApplicantUnit =
                    application.pollingUnitId &&
                    unit.id === String(application.pollingUnitId);
                  const isUrgent = unit.agentsCount === 0;
                  return (
                    <div
                      key={unit.id}
                      onClick={() => handleSelectUnit(unit.id)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border transition cursor-pointer select-none",
                        isSelected
                          ? "bg-[#e6fcf5] border-[#10dd84]/60"
                          : "bg-[#fafafa] border-transparent hover:bg-hover-2",
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[15px] text-c-80">{unit.name}</p>
                          {isApplicantUnit && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 uppercase tracking-wide">
                              Applied here
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-c-50 uppercase tracking-wider">
                          {unit.subLocation}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right space-y-0.5">
                          <span className={cn(
                            "text-[13px] font-medium",
                            isUrgent ? "text-red-500" : "text-c-60",
                          )}>
                            {unit.agentsCount} agent{unit.agentsCount !== 1 ? "s" : ""}
                          </span>
                          {isUrgent && (
                            <p className="text-[10px] text-red-500 font-semibold uppercase tracking-wide">
                              Urgent
                            </p>
                          )}
                        </div>
                        <div
                          className={cn(
                            "size-6 rounded-full flex items-center justify-center border transition",
                            isSelected
                              ? "bg-[#10dd84] border-transparent text-[#083b25]"
                              : "border-gray-200 bg-white",
                          )}
                        >
                          {isSelected && (
                            <Check className="size-3.5 stroke-[3]" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })

              )}
            </div>
          </DialogPadding>

          <DialogFooter className="bg-white border-t border-gray-100 flex items-center justify-end gap-3 pt-3.5 pb-4 px-6">
            <button
              type="button"
              onClick={handleReject}
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl hover:bg-c-5 text-c-70 text-[15px] transition cursor-pointer disabled:opacity-50"
            >
              Reject
            </button>
            <Button
              onClick={handleAccept}
              disabled={
                isSubmitting || isUnitsLoading || currentOptions.length === 0
              }
              className="bg-[#00e575] hover:bg-[#00c866] text-white rounded-xl px-7 h-11 text-[15px] border-none shadow-none transition-colors duration-150 disabled:opacity-50"
            >
              {isSubmitting ? "Processing..." : "Accept"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ChoosePollingUnitDialog
        open={openChooseDialog}
        onClose={() => setOpenChooseDialog(false)}
        stateId={application.stateId}
        lgaId={application.lgaId}
        onSelect={(newUnit) => {
          const exists = currentOptions.some((u) => u.id === newUnit.id);
          if (!exists) {
            setCurrentOptions([
              {
                id: newUnit.id,
                name: newUnit.name,
                subLocation: newUnit.subLocation,
                agentsCount: 0,
                ward: newUnit.ward,
              },
              ...currentOptions.slice(0, 2),
            ]);
          }
          setSelectedUnitId(newUnit.id);
        }}
      />
    </>
  );
}

type ChoosePollingUnitDialogProps = {
  open: boolean;
  onClose: () => void;
  stateId?: number;
  lgaId?: number;
  onSelect: (unit: {
    id: string;
    name: string;
    subLocation: string;
    ward: string;
  }) => void;
};

export function ChoosePollingUnitDialog({
  open,
  onClose,
  stateId,
  lgaId,
  onSelect,
}: ChoosePollingUnitDialogProps) {
  const [selectedState, setSelectedState] = React.useState<number | "">(
    stateId || "",
  );
  const [selectedLga, setSelectedLga] = React.useState<number | "">(
    lgaId || "",
  );
  const [selectedWard, setSelectedWard] = React.useState<number | "">("");
  const [selectedUnitId, setSelectedUnitId] = React.useState<string>("");
  const [selectedUnitObj, setSelectedUnitObj] = React.useState<{
    id: string;
    name: string;
    subLocation: string;
    ward: string;
  } | null>(null);

  // Polling Units infinite/lazy query
  const { data: puData, isLoading: isUnitsLoading } = useQuery({
    queryKey: ["pu-list-choose", selectedState, selectedLga, selectedWard],
    queryFn: async () => {
      const res = await getPollingUnits({
        data: {
          stateID: selectedState ? Number(selectedState) : undefined,
          lgaID: selectedLga ? Number(selectedLga) : undefined,
          wardID: selectedWard ? Number(selectedWard) : undefined,
        },
      });
      if (res && res.success && Array.isArray(res.data?.polling_units)) {
        return res.data.polling_units;
      }
      return [];
    },
    enabled: open && (!!selectedState || !!selectedLga || !!selectedWard),
  });

  const handleSelectUnit = (pu: any) => {
    setSelectedUnitId(String(pu.id));
    setSelectedUnitObj({
      id: String(pu.id),
      name: pu.name,
      subLocation: pu.lga_name || pu.state_name || "",
      ward: pu.ward_name || "UNKNOWN WARD",
    });
  };

  const handleAssign = () => {
    if (selectedUnitObj) {
      onSelect(selectedUnitObj);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[620px] p-0 rounded-2xl border-none shadow-2xl overflow-hidden">
        <DialogHeader title="Choose Polling Unit" />

        <DialogPadding className="relative space-y-4 pb-5 max-h-[75vh] overflow-y-auto">
          {/* Select Filters Row */}
          <div className="grid grid-cols-3 gap-3 sticky top-0 left-0 pt-3 pb-2 bg-background/90 backdrop-blur-2xl">
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-c-50 uppercase tracking-wider animate-fade-in">
                State
              </label>
              <SelectState
                selectedId={selectedState ? String(selectedState) : undefined}
                countryOriginalId={161}
                fetchStates={fetchStatesAdapter}
                update={(state) => {
                  setSelectedState(state.id);
                  setSelectedLga("");
                  setSelectedWard("");
                  setSelectedUnitId("");
                  setSelectedUnitObj(null);
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-c-50 uppercase tracking-wider animate-fade-in">
                LGA
              </label>
              <SelectLga
                selectedId={selectedLga ? String(selectedLga) : undefined}
                stateId={selectedState ? Number(selectedState) : undefined}
                fetchLGAs={fetchLgasAdapter}
                update={(lga) => {
                  setSelectedLga(lga.id);
                  setSelectedWard("");
                  setSelectedUnitId("");
                  setSelectedUnitObj(null);
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-c-50 uppercase tracking-wider animate-fade-in">
                Ward
              </label>
              <SelectWard
                selectedId={selectedWard ? String(selectedWard) : undefined}
                lgaId={selectedLga ? Number(selectedLga) : undefined}
                stateId={selectedState ? Number(selectedState) : undefined}
                fetchWards={fetchWardsAdapter}
                update={(ward) => {
                  setSelectedWard(ward.id);
                  setSelectedUnitId("");
                  setSelectedUnitObj(null);
                }}
              />
            </div>
          </div>

          {/* Polling Units list */}
          <div className="space-y-3 pt-2">
            {isUnitsLoading ? (
              <div className="py-8 flex flex-col items-center justify-center text-c-50 gap-2">
                <Loader2 className="size-6 animate-spin text-blue-600" />
                <p className="text-sm">Loading polling units...</p>
              </div>
            ) : !selectedState && !selectedLga && !selectedWard ? (
              <p className="text-center text-c-50 py-8 text-sm">
                Please select a state, LGA, or ward to search for polling units.
              </p>
            ) : !puData || puData.length === 0 ? (
              <p className="text-center text-c-50 py-8 text-sm">
                No polling units found for this location.
              </p>
            ) : (
              <div className="space-y-2.5 min-h-[60vh] overflow-y-auto pr-1">
                {puData.map((unit: any) => {
                  const isSelected = selectedUnitId === String(unit.id);
                  return (
                    <div
                      key={unit.id}
                      onClick={() => handleSelectUnit(unit)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border transition cursor-pointer select-none",
                        isSelected
                          ? "bg-[#e6fcf5] border-[#10dd84]/60"
                          : "bg-[#fafafa] border-transparent hover:bg-hover-2",
                      )}
                    >
                      <div className="space-y-0.5">
                        <p className="text-[15px] text-c-80">{unit.name}</p>
                        <p className="text-[12px] text-c-50 uppercase tracking-wider">
                          {unit.lga_name || unit.state_name} -{" "}
                          {unit.ward_name || "UNKNOWN WARD"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "size-6 rounded-full flex items-center justify-center border transition",
                            isSelected
                              ? "bg-[#10dd84] border-transparent text-[#083b25]"
                              : "border-gray-200 bg-white",
                          )}
                        >
                          {isSelected && (
                            <Check className="size-3.5 stroke-[3]" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogPadding>

        <DialogFooter className="bg-white border-t border-gray-100 flex items-center justify-end gap-3 pt-3.5 pb-4 px-6">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-6 rounded-xl hover:bg-c-5 text-c-70 text-[15px] transition cursor-pointer"
          >
            Cancel
          </button>
          <Button
            onClick={handleAssign}
            disabled={!selectedUnitId}
            type="submit"
            variant="black"
            size="xl"
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
