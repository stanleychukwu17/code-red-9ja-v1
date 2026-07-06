import * as React from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { Info, Loader2 } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { useAppContext } from "#/providers/providers";
import { updatePartyStateAllowances } from "#/lib/server/parties";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getStates } from "#/lib/server/countries";
import { toast } from "sonner";

export function SetAgentPaymentDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { party } = useAppContext();
  const partyId = party?.id;

  const [mainAmount, setMainAmount] = React.useState(20000);
  const [paymentType, setPaymentType] = React.useState<"custom" | "same">(
    "custom",
  );
  const [stateOverrides, setStateOverrides] = React.useState<
    Record<string, number>
  >({});

  const saveMutation = useMutation({
    mutationFn: (variables: {
      partyID: number;
      allowances: Record<string, number>;
    }) => updatePartyStateAllowances({ data: variables }),
    onSuccess: (res) => {
      if (res && res.success) {
        toast.success("Agent payment budget saved successfully!");
        onSuccess?.();
        onClose();
      } else {
        toast.error(res?.message || "Failed to save budget settings");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "An unexpected error occurred");
    },
  });

  // Load states from backend API
  const { data: statesRes } = useQuery({
    queryKey: ["nigerianStates"],
    queryFn: () => getStates({ data: { countryId: 161, limit: 50 } }),
    enabled: open,
  });

  const statesList = React.useMemo(() => {
    const fetched = statesRes?.data?.states || [];
    if (fetched.length > 0) {
      return [...fetched].map((s) => s.name).sort((a, b) => a.localeCompare(b));
    }
    // Fallback static list (matching DB state names)
    return [
      "Abia",
      "Abuja FCT",
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
  }, [statesRes]);

  // Sync component state from database settings when dialog opens
  React.useEffect(() => {
    if (open && party?.stateAllowances && statesList.length > 0) {
      const allowances = party.stateAllowances;
      const defaultKobo =
        allowances["default"] !== undefined ? allowances["default"] : 2000000;
      setMainAmount(defaultKobo / 100);

      const overrides: Record<string, number> = {};
      let isDifferent = false;
      for (const state of statesList) {
        const val = allowances[state];
        if (val !== undefined) {
          overrides[state] = val / 100;
          if (val !== defaultKobo) {
            isDifferent = true;
          }
        }
      }
      setStateOverrides(overrides);
      setPaymentType(isDifferent ? "custom" : "same");
    }
  }, [open, party?.stateAllowances, statesList]);

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
    if (!partyId) return;

    // Build JSON mapping of state names to payment amounts in Kobo
    const allowancesPayload: Record<string, number> = {
      default: mainAmount * 100,
    };

    for (const state of statesList) {
      if (paymentType === "same") {
        allowancesPayload[state] = mainAmount * 100;
      } else {
        const val =
          stateOverrides[state] !== undefined
            ? stateOverrides[state]
            : mainAmount;
        allowancesPayload[state] = val * 100;
      }
    }

    saveMutation.mutate({
      partyID: partyId,
      allowances: allowancesPayload,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl bg-white overflow-hidden">
        <DialogHeader title="Polling Unit Agent Election Payment Budget" />

        <DialogPadding className="space-y-5 pb-4 max-h-[75vh] overflow-y-auto">
          {/* Purple info box */}
          <div className="flex items-start gap-3 rounded-xl bg-[#f5f0ff] px-4 py-3.5 mt-2">
            <Info className="size-5 shrink-0 text-[#7c3aed] mt-0.5" />
            <p className="leading-[1.6] text-[14px] text-[#6d28d9]">
              Enter how much you want to pay your polling agents after they
              complete their polling unit task on election day. Whatever you set
              will be shown to potential applicants during application.
            </p>
          </div>

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
                  disabled={saveMutation.isPending}
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
              disabled={saveMutation.isPending}
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
              disabled={saveMutation.isPending}
            >
              Same pay for all
            </button>
          </div>

          {/* State override list */}
          {paymentType === "custom" && (
            <div className="border border-c-10 rounded-xl overflow-hidden">
              <div className="max-h-[220px] overflow-y-auto divide-y divide-c-5">
                {statesList.map((state) => {
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
                          disabled={saveMutation.isPending}
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
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </span>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
