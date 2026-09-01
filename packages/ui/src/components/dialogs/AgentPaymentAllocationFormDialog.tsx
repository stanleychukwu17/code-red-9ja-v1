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
  | "polling_agent"
  | "ward_election_supervisor"
  | "lga_election_supervisor"
  | "state_election_supervisor";

export type PaymentConfig = { default: number; states: Record<string, number> };
export type AgentPaymentAllocation = Record<AgentRoles, PaymentConfig>;

const ROLE_ORDER: AgentRoles[] = [
  "polling_agent",
  "ward_election_supervisor",
  "lga_election_supervisor",
  "state_election_supervisor",
];

const ROLE_LABELS: Record<AgentRoles, string> = {
  polling_agent: "Polling Agent",
  ward_election_supervisor: "Ward Election Supervisor",
  lga_election_supervisor: "LGA Election Supervisor",
  state_election_supervisor: "State Election Supervisor",
};

const DEFAULT_ALLOCATION: AgentPaymentAllocation = {
  polling_agent: { default: 0, states: {} },
  ward_election_supervisor: { default: 0, states: {} },
  lga_election_supervisor: { default: 0, states: {} },
  state_election_supervisor: { default: 0, states: {} },
};

// Map legacy camelCase keys to snake_case if present
const LEGACY_ROLE_MAP: Record<string, AgentRoles> = {
  pollingAgent: "polling_agent",
  wardElectionSupervisor: "ward_election_supervisor",
  lgaElectionSupervisor: "lga_election_supervisor",
  stateElectionSupervisor: "state_election_supervisor",
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

  // Sync fetched values into local state whenever the dialog opens / data arrives
  React.useEffect(() => {
    if (!open) return;
    if (fetchedAllocation) {
      const koboToNaira = (alloc: any): AgentPaymentAllocation => {
        const converted = { ...DEFAULT_ALLOCATION };
        Object.keys(alloc || {}).forEach((key) => {
          const role = (LEGACY_ROLE_MAP[key] || key) as AgentRoles;
          if (converted[role] !== undefined && alloc[key]) {
            converted[role] = {
              default: (alloc[key].default || 0) / 100,
              states: Object.fromEntries(
                Object.entries(alloc[key].states || {}).map(([state, kobo]) => [state, (Number(kobo) || 0) / 100])
              )
            };
          }
        });
        return converted;
      };
      setValues(koboToNaira(fetchedAllocation));
    } else {
      setValues(DEFAULT_ALLOCATION);
    }
    setError(null);
  }, [open, fetchedAllocation]);

  // ── Mutation ───────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: () => {
      const nairaToKobo = (alloc: AgentPaymentAllocation): AgentPaymentAllocation => {
        const converted = { ...DEFAULT_ALLOCATION };
        (Object.keys(alloc) as AgentRoles[]).forEach((role) => {
          if (alloc[role]) {
            converted[role] = {
              default: (alloc[role].default || 0) * 100,
              states: Object.fromEntries(
                Object.entries(alloc[role].states || {}).map(([state, naira]) => [state, (naira || 0) * 100])
              )
            };
          }
        });
        return converted;
      };
      return updateAllocation(partyId, nairaToKobo(values));
    },
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
