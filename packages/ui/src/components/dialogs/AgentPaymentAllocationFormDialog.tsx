import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { Loader2 } from "lucide-react";
import { DescriptiveText } from "../custom/Texts";
import { MoneyInput } from "../input";

// ─── Types ──────────────────────────────────────────────────────────────────

export type AgentRoles =
  | "pollingAgent"
  | "wardElectionSupervisor"
  | "lgaElectionSupervisor"
  | "stateElectionSupervisor";

export type PaymentConfig = { default: number; states: Record<string, number> };
export type AgentPaymentAllocation = Record<AgentRoles, PaymentConfig>;

const ROLE_ORDER: AgentRoles[] = [
  "pollingAgent",
  "wardElectionSupervisor",
  "lgaElectionSupervisor",
  "stateElectionSupervisor",
];

const ROLE_LABELS: Record<AgentRoles, string> = {
  pollingAgent: "Polling Agent",
  wardElectionSupervisor: "Ward Election Supervisor",
  lgaElectionSupervisor: "LGA Election Supervisor",
  stateElectionSupervisor: "State Election Supervisor",
};

const DEFAULT_ALLOCATION: AgentPaymentAllocation = {
  pollingAgent: { default: 20000, states: {} },
  wardElectionSupervisor: { default: 25000, states: {} },
  lgaElectionSupervisor: { default: 30000, states: {} },
  stateElectionSupervisor: { default: 50000, states: {} },
};

// ─── Props ───────────────────────────────────────────────────────────────────

export interface AgentPaymentAllocationFormDialogProps {
  open: boolean;
  onClose: () => void;
  partyId: number | string;
  /** Fetch the current allocation from the API. Receives the partyId. */
  fetchAllocation: (
    partyId: number | string,
  ) => Promise<AgentPaymentAllocation | null>;
  /** Submit the updated allocation to the API. Receives partyId + full payload. */
  updateAllocation: (
    partyId: number | string,
    values: AgentPaymentAllocation,
  ) => Promise<any>;
  /** Optional callback after a successful save. */
  onSuccess?: () => void;
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

export function AgentPaymentAllocationFormDialog({
  open,
  onClose,
  partyId,
  fetchAllocation,
  updateAllocation,
  onSuccess,
}: AgentPaymentAllocationFormDialogProps) {
  const [values, setValues] =
    React.useState<AgentPaymentAllocation>(DEFAULT_ALLOCATION);
  const [error, setError] = React.useState<string | null>(null);

  // ── Fetch existing allocation ──────────────────────────────────────────────
  const { data: fetchedAllocation, isLoading } = useQuery({
    queryKey: ["agentPaymentAllocation", partyId],
    queryFn: () => fetchAllocation(partyId),
    enabled: open && !!partyId,
  });
  console.log({ fetchedAllocation });

  // Sync fetched values into local state whenever the dialog opens / data arrives
  React.useEffect(() => {
    if (!open) return;
    if (fetchedAllocation) {
      setValues({ ...DEFAULT_ALLOCATION, ...fetchedAllocation });
    } else {
      setValues(DEFAULT_ALLOCATION);
    }
    setError(null);
  }, [open, fetchedAllocation]);

  // ── Mutation ───────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: () => updateAllocation(partyId, values),
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setError(
        err?.message || "Failed to save payment settings. Please try again.",
      );
    },
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  function handleDefaultChange(role: AgentRoles, num: number) {
    setValues((prev) => ({
      ...prev,
      [role]: { ...prev[role], default: num },
    }));
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[520px]">
        {/* Header */}
        <DialogHeader title="Agent Payment Allocation" />

        {/* Body */}
        <DialogPadding>
          <DescriptiveText text="Set how much you'd like to pay party election agents for the upcoming elections." />
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-6 animate-spin text-c-40" />
            </div>
          ) : (
            <div className="py-3">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-600">
                  {error}
                </div>
              )}

              {ROLE_ORDER.map((role) => (
                <div key={role} className="h-14 flex items-center gap-4">
                  <p className="text-c-90 w-full">{ROLE_LABELS[role]}</p>
                  <MoneyInput
                    symbol="₦"
                    value={values[role].default}
                    onValueChange={(num) => handleDefaultChange(role, num)}
                    className="w-[140px]"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          )}
        </DialogPadding>

        {/* Footer */}
        <DialogFooter>
          <Button
            variant="secondary"
            size="3xl"
            onClick={() => {
              setError(null);
              mutation.mutate();
            }}
            disabled={mutation.isPending || isLoading}
          >
            {mutation.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
