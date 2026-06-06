import * as React from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { ChevronDown, Info } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT Abuja",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

const ELECTIONS = [
  "2027 Presidential Election",
  "2027 Gubernatorial Election",
  "2027 Senatorial Election",
];

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function SetAgentPaymentDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [selectedElection, setSelectedElection] = React.useState(ELECTIONS[0]);
  const [isElectionOpen, setIsElectionOpen] = React.useState(false);
  const [mainAmount, setMainAmount] = React.useState(20000);
  const [paymentType, setPaymentType] = React.useState<"custom" | "same">(
    "custom",
  );
  const [stateOverrides, setStateOverrides] = React.useState<
    Record<string, number>
  >({});

  // Sync state overrides default value to mainAmount unless overridden
  const getStateAmount = (stateName: string) => {
    return stateOverrides[stateName] !== undefined
      ? stateOverrides[stateName]
      : mainAmount;
  };

  const handleMainAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    const parsed = Number(rawVal) || 0;
    setMainAmount(parsed);
  };

  const handleStateAmountChange = (stateName: string, value: string) => {
    const rawVal = value.replace(/\D/g, "");
    const parsed = Number(rawVal) || 0;
    setStateOverrides((prev) => ({
      ...prev,
      [stateName]: parsed,
    }));
  };

  const handleSaveChanges = () => {
    const finalBudget = {
      election: selectedElection,
      type: paymentType,
      defaultAmount: mainAmount,
      stateAmounts: NIGERIAN_STATES.reduce(
        (acc, state) => {
          acc[state] =
            paymentType === "same" ? mainAmount : getStateAmount(state);
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
    console.log("Saving budget configuration:", finalBudget);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl bg-white overflow-hidden">
        <DialogHeader title="Polling Unit Agent Election Payment Budget" />

        <DialogPadding className="space-y-5 pb-4 max-h-[75vh] overflow-y-auto">
          {/* Purple info box */}
          <div className="flex items-start gap-3 rounded-xl bg-[#f5f0ff] px-4 py-3.5 mt-2">
            <Info className="size-5 shrink-0 text-[#7c3aed] mt-0.5" />
            <p className="leading-[1.6] text-[14px] font-medium text-[#6d28d9]">
              Enter how much you want to pay your party agents after they
              complete their polling unit task on election day. Whatever you set
              will be shown to potential applicants during application.
            </p>
          </div>

          {/* Election selector */}
          <div className="space-y-1.5 relative">
            <label className="text-sm font-semibold text-c-60">Election</label>
            <button
              type="button"
              onClick={() => setIsElectionOpen(!isElectionOpen)}
              className="w-full flex items-center justify-between h-12 px-4 rounded-xl border border-gray-200 bg-white text-c-80 font-medium text-[15px] focus:outline-none focus:border-c-60 transition"
            >
              <span>{selectedElection}</span>
              <ChevronDown className="size-5 text-c-50" />
            </button>

            {isElectionOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsElectionOpen(false)}
                />
                <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-20">
                  {ELECTIONS.map((elec) => (
                    <button
                      key={elec}
                      type="button"
                      onClick={() => {
                        setSelectedElection(elec);
                        setIsElectionOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 hover:bg-c-5",
                        elec === selectedElection
                          ? "text-[#10b981] font-semibold bg-emerald-50/40"
                          : "text-c-70",
                      )}
                    >
                      {elec}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Central monetary input */}
          <div className="py-4 flex flex-col items-center gap-1.5">
            <p className="text-sm font-medium text-c-50">
              How much will you be paying per agent?
            </p>
            <div className="flex items-center justify-center w-full text-center">
              <div className="inline-flex items-center gap-1">
                <span className="text-[52px] font-bold text-c-80 select-none">
                  ₦
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={mainAmount.toLocaleString("en-NG")}
                  onChange={handleMainAmountChange}
                  className="text-[52px] font-bold text-c-80 outline-none bg-transparent p-0 border-none leading-none focus:outline-none focus:ring-0"
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    width: `${Math.max(1, mainAmount.toLocaleString("en-NG").length) * 0.62}em`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Custom / Same pay toggle */}
          <div className="flex gap-2 p-1 bg-c-5 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setPaymentType("custom")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150",
                paymentType === "custom"
                  ? "bg-[#d8fdf0] text-[#059669] shadow-sm"
                  : "text-c-60 hover:text-c-80",
              )}
            >
              Custom
            </button>
            <button
              type="button"
              onClick={() => setPaymentType("same")}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150",
                paymentType === "same"
                  ? "bg-[#d8fdf0] text-[#059669] shadow-sm"
                  : "text-c-60 hover:text-c-80",
              )}
            >
              Same pay for all
            </button>
          </div>

          {/* State override list */}
          {paymentType === "custom" && (
            <div className="border border-c-10 rounded-xl overflow-hidden">
              <div className="max-h-[220px] overflow-y-auto divide-y divide-c-5">
                {NIGERIAN_STATES.map((state) => {
                  const stateVal = getStateAmount(state);
                  return (
                    <div
                      key={state}
                      className="flex items-center justify-between px-4 py-3 hover:bg-c-2/40 transition-colors duration-100"
                    >
                      <span className="text-[15px] font-medium text-c-80">
                        {state}
                      </span>
                      <div className="flex items-center bg-[#f1f1f4] rounded-lg px-3 py-1.5 w-[140px]">
                        <span className="text-[14px] font-semibold text-c-70 mr-0.5">
                          ₦
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={stateVal.toLocaleString("en-NG")}
                          onChange={(e) =>
                            handleStateAmountChange(state, e.target.value)
                          }
                          className="bg-transparent border-none outline-none font-semibold text-[14px] text-c-80 w-full text-right p-0"
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogPadding>

        <DialogFooter className="bg-white border-t border-gray-100 pt-3.5 pb-4 px-6">
          <Button
            onClick={handleSaveChanges}
            className="bg-[#00e575] hover:bg-[#00c866] text-white rounded-xl px-6 h-11 text-[15px] font-bold border-none shadow-none transition-colors duration-150"
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
