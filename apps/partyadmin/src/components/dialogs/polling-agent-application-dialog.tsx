import * as React from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { Check } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

type ApplicationData = {
  name: string;
  avatar: string;
  location: string;
  election: string;
  voterId?: string;
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

const INITIAL_POLLING_UNITS: PollingUnitOption[] = [
  {
    id: "pu-1",
    name: "GAWU TOWN PRIMARY SCHOOL",
    subLocation: "GAWU",
    agentsCount: 0,
    ward: "GAWU",
  },
  {
    id: "pu-2",
    name: "GAWU TOWN PRIMARY SCHOOL",
    subLocation: "GAWU",
    agentsCount: 1,
    ward: "GAWU",
  },
  {
    id: "pu-3",
    name: "GAWU TOWN PRIMARY SCHOOL",
    subLocation: "GAWU",
    agentsCount: 0,
    ward: "GAWU",
  },
];

const EXTENDED_POLLING_UNITS: PollingUnitOption[] = [
  {
    id: "pu-bw-1",
    name: "GAWU TOWN PRIMARY SCHOOL",
    subLocation: "GAWU",
    agentsCount: 2,
    ward: "BWARI",
  },
  {
    id: "pu-bw-2",
    name: "GAWU TOWN PRIMARY SCHOOL",
    subLocation: "GAWU",
    agentsCount: 1,
    ward: "BWARI",
  },
  {
    id: "pu-bw-3",
    name: "GAWU TOWN PRIMARY SCHOOL",
    subLocation: "GAWU",
    agentsCount: 0,
    ward: "BWARI",
  },
  {
    id: "pu-bw-4",
    name: "GAWU TOWN PRIMARY SCHOOL",
    subLocation: "GAWU",
    agentsCount: 1,
    ward: "BWARI",
  },
  {
    id: "pu-gw-1",
    name: "GAWU TOWN PRIMARY SCHOOL",
    subLocation: "GAWU",
    agentsCount: 0,
    ward: "GAWU",
  },
];

export function PollingAgentApplicationDialog({
  open,
  onClose,
  application,
}: PollingAgentApplicationDialogProps) {
  const [view, setView] = React.useState<"initial" | "extended">("initial");
  const [selectedUnitId, setSelectedUnitId] = React.useState("pu-1");

  const [currentOptions, setCurrentOptions] = React.useState<PollingUnitOption[]>(INITIAL_POLLING_UNITS);

  // If view is extended, let's group by ward
  const groupedExtended = React.useMemo(() => {
    return EXTENDED_POLLING_UNITS.reduce(
      (acc, item) => {
        if (!acc[item.ward]) acc[item.ward] = [];
        acc[item.ward]!.push(item);
        return acc;
      },
      {} as Record<string, PollingUnitOption[]>
    );
  }, []);

  const handleChooseAnother = () => {
    setView("extended");
  };

  const handleSelectUnit = (id: string) => {
    setSelectedUnitId(id);
  };

  const handleSaveChangesExtended = () => {
    // Find selected extended unit and add it to the top of initial units if it isn't there
    const selectedUnit = EXTENDED_POLLING_UNITS.find((u) => u.id === selectedUnitId);
    if (selectedUnit) {
      // Create new list of initial units starting with the selected unit
      const otherInitials = INITIAL_POLLING_UNITS.filter((u) => u.id !== selectedUnit.id);
      setCurrentOptions([selectedUnit, ...otherInitials.slice(0, 2)]);
    }
    setView("initial");
  };

  const selectedUnit =
    EXTENDED_POLLING_UNITS.find((u) => u.id === selectedUnitId) ||
    currentOptions.find((u) => u.id === selectedUnitId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl bg-white overflow-hidden">
        <DialogHeader title="Polling Agent Application" />

        {view === "initial" ? (
          <>
            <DialogPadding className="space-y-5 pb-5">
              {/* Profile Block */}
              <div className="flex gap-5 items-start">
                <img
                  src={application.avatar}
                  alt={application.name}
                  className="size-28 rounded-full object-cover shrink-0 border border-gray-100 shadow-sm"
                />
                <div className="space-y-1.5 pt-1">
                  <h3 className="text-[22px] font-bold text-c-80 leading-tight">
                    {application.name}
                  </h3>
                  <p className="text-sm font-medium text-c-50">
                    {application.location}
                  </p>
                  <p className="text-sm text-c-60 font-medium capitalize">
                    {application.election}
                  </p>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <div className="flex size-5 items-center justify-center rounded-full bg-[#1f4b91] text-[7px] font-bold text-white">
                      NDP
                    </div>
                    <span className="text-sm font-semibold text-c-60">NDC</span>
                  </div>
                </div>
              </div>

              {/* Voters Identification Block (Purple) */}
              <div className="flex items-center justify-between gap-4 rounded-xl bg-[#f5f0ff] px-5 py-4">
                <div className="space-y-1">
                  <p className="text-[14px] font-medium text-[#7c3aed]">
                    Voters Identification Number
                  </p>
                  <p className="text-lg font-bold text-[#1f1f1f]">
                    {application.voterId || "904284758271"}
                  </p>
                </div>
                {/* Mock Voter Card UI */}
                <div className="w-[80px] h-[50px] rounded bg-emerald-700/80 border border-emerald-600 flex items-center p-1 gap-1.5 shrink-0 relative overflow-hidden select-none shadow-sm">
                  <div className="size-6 rounded bg-gray-200 shrink-0" />
                  <div className="flex-1 flex flex-col gap-0.5">
                    <div className="h-0.5 bg-white w-full rounded-2xs" />
                    <div className="h-0.5 bg-white w-2/3 rounded-2xs" />
                    <div className="h-0.5 bg-white w-4/5 rounded-2xs" />
                  </div>
                </div>
              </div>

              {/* Assign Polling Unit Header */}
              <div className="flex items-center justify-between pt-2">
                <h4 className="text-[16px] font-bold text-c-80">Assign Polling Unit</h4>
                <button
                  type="button"
                  onClick={handleChooseAnother}
                  className="text-[15px] font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer"
                >
                  Choose another polling unit
                </button>
              </div>

              {/* Polling Units list */}
              <div className="space-y-3">
                {currentOptions.map((unit) => {
                  const isSelected = selectedUnitId === unit.id;
                  return (
                    <div
                      key={unit.id}
                      onClick={() => handleSelectUnit(unit.id)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border transition cursor-pointer select-none",
                        isSelected
                          ? "bg-[#e6fcf5] border-[#10dd84]/60"
                          : "bg-[#fafafa] border-transparent hover:bg-hover-2"
                      )}
                    >
                      <div className="space-y-0.5">
                        <p className="text-[15px] font-bold text-c-80">
                          {unit.name}
                        </p>
                        <p className="text-[12px] font-medium text-c-50 uppercase tracking-wider">
                          {unit.subLocation}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[14px] font-semibold text-c-60">
                          {unit.agentsCount} agent{unit.agentsCount !== 1 ? "s" : ""}
                        </span>
                        <div
                          className={cn(
                            "size-6 rounded-full flex items-center justify-center border transition",
                            isSelected
                              ? "bg-[#10dd84] border-transparent text-[#083b25]"
                              : "border-gray-200 bg-white"
                          )}
                        >
                          {isSelected && <Check className="size-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </DialogPadding>

            <DialogFooter className="bg-white border-t border-gray-100 flex items-center justify-end gap-3 pt-3.5 pb-4 px-6">
              <button
                type="button"
                onClick={onClose}
                className="h-11 px-6 rounded-xl hover:bg-c-5 text-c-70 text-[15px] font-bold transition cursor-pointer"
              >
                Reject
              </button>
              <Button
                onClick={onClose}
                className="bg-[#00e575] hover:bg-[#00c866] text-white rounded-xl px-7 h-11 text-[15px] font-bold border-none shadow-none transition-colors duration-150"
              >
                Accept
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogPadding className="space-y-4 pb-5 max-h-[60vh] overflow-y-auto">
              {Object.entries(groupedExtended).map(([wardName, units]) => (
                <div key={wardName} className="space-y-2.5">
                  <h5 className="text-[13px] font-bold text-c-50 tracking-wider uppercase pt-2 select-none">
                    {wardName}
                  </h5>
                  <div className="space-y-3">
                    {units.map((unit) => {
                      const isSelected = selectedUnitId === unit.id;
                      return (
                        <div
                          key={unit.id}
                          onClick={() => handleSelectUnit(unit.id)}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-xl border transition cursor-pointer select-none",
                            isSelected
                              ? "bg-[#e6fcf5] border-[#10dd84]/60"
                              : "bg-[#fafafa] border-transparent hover:bg-hover-2"
                          )}
                        >
                          <div className="space-y-0.5">
                            <p className="text-[15px] font-bold text-c-80">
                              {unit.name}
                            </p>
                            <p className="text-[12px] font-medium text-c-50 uppercase tracking-wider">
                              {unit.subLocation}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[14px] font-semibold text-c-60">
                              {unit.agentsCount} agent{unit.agentsCount !== 1 ? "s" : ""}
                            </span>
                            <div
                              className={cn(
                                "size-6 rounded-full flex items-center justify-center border transition",
                                isSelected
                                  ? "bg-[#10dd84] border-transparent text-[#083b25]"
                                  : "border-gray-200 bg-white"
                              )}
                            >
                              {isSelected && <Check className="size-3.5 stroke-[3]" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </DialogPadding>

            <DialogFooter className="bg-white border-t border-gray-100 flex items-center justify-end gap-3 pt-3.5 pb-4 px-6">
              <Button
                onClick={handleSaveChangesExtended}
                className="bg-[#00e575] hover:bg-[#00c866] text-white rounded-xl px-7 h-11 text-[15px] font-bold border-none shadow-none transition-colors duration-150"
              >
                Save changes
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
