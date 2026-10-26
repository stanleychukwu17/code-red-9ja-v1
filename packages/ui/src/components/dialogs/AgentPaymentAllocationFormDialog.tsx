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

const LEGACY_ROLE_MAP: Record<string, AgentRoles> = {
  pollingAgent: "polling_agent",
  wardElectionSupervisor: "ward_election_supervisor",
  lgaElectionSupervisor: "lga_election_supervisor",
  stateElectionSupervisor: "state_election_supervisor",
};

export interface AgentPaymentAllocationFormDialogProps {
  open: boolean;
  onClose: () => void;
  partyId: number | string;
  initialAllocation?: any | null;
  fetchAllocation?: (
    partyId: number | string,
  ) => Promise<AgentPaymentAllocation | null>;
  updateAllocation: (
    partyId: number | string,
    values: AgentPaymentAllocation,
  ) => Promise<any>;
  onSuccess?: () => void;
}

function parseKoboAllocationToNaira(alloc: any): AgentPaymentAllocation {
  const converted = { ...DEFAULT_ALLOCATION };
  if (!alloc) return converted;

  Object.keys(alloc).forEach((key) => {
    const role = (LEGACY_ROLE_MAP[key] || key) as AgentRoles;
    if (converted[role] !== undefined && alloc[key]) {
      converted[role] = {
        default: (alloc[key].default || 0) / 100,
        states: Object.fromEntries(
          Object.entries(alloc[key].states || {}).map(([state, kobo]) => [
            state,
            (Number(kobo) || 0) / 100,
          ]),
        ),
      };
    }
  });
  return converted;
}

export function AgentPaymentAllocationFormDialog({
  open,
  onClose,
  partyId,
  initialAllocation,
  fetchAllocation,
  updateAllocation,
  onSuccess,
}: AgentPaymentAllocationFormDialogProps) {
  const [values, setValues] =
    React.useState<AgentPaymentAllocation>(DEFAULT_ALLOCATION);
  const [error, setError] = React.useState<string | null>(null);

  const { data: queriedAllocation, isLoading: isQueryLoading } = useQuery({
    queryKey: ["agentPaymentAllocation", partyId],
    queryFn: () => (fetchAllocation ? fetchAllocation(partyId) : null),
    enabled: open && !!partyId && !initialAllocation && !!fetchAllocation,
    staleTime: Infinity,
  });

  const activeAllocation = initialAllocation ?? queriedAllocation;
  const isLoading = !initialAllocation && isQueryLoading;

  React.useEffect(() => {
    if (!open) return;
    if (activeAllocation) {
      setValues(parseKoboAllocationToNaira(activeAllocation));
    } else {
      setValues(DEFAULT_ALLOCATION);
    }
    setError(null);
  }, [open, activeAllocation]);

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

  function handleDefaultChange(role: AgentRoles, num: number) {
    setValues((prev) => ({
      ...prev,
      [role]: { ...prev[role], default: num },
    }));
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader title="Agent Payment Allocation" />

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
                    className="w-35"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          )}
        </DialogPadding>

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
