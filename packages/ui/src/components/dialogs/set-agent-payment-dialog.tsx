import * as React from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { Info, Loader2, Pencil } from "lucide-react";

export type AgentRoles =
  | "pollingAgent"
  | "wardElectionSupervisor"
  | "lgaElectionSupervisor"
  | "stateElectionSupervisor";
export type PaymentConfig = { default: number; states: Record<string, number> };
export type AgentPaymentAllocation = Record<AgentRoles, PaymentConfig>;

interface Props {
  open: boolean;
  onClose: () => void;
  defaultValues?: Partial<AgentPaymentAllocation>;
  onSubmit: (values: AgentPaymentAllocation) => void;
  isPending: boolean;
  statesList: string[];
}

const defaultStructure: AgentPaymentAllocation = {
  pollingAgent: { default: 20000, states: {} },
  wardElectionSupervisor: { default: 25000, states: {} },
  lgaElectionSupervisor: { default: 30000, states: {} },
  stateElectionSupervisor: { default: 50000, states: {} },
};

export function SetAgentPaymentDialog({
  open,
  onClose,
  defaultValues,
  onSubmit,
  isPending,
  statesList,
}: Props) {
  const [values, setValues] =
    React.useState<AgentPaymentAllocation>(defaultStructure);
  const [editingRole, setEditingRole] = React.useState<AgentRoles | null>(null);

  React.useEffect(() => {
    if (open) {
      setValues({
        ...defaultStructure,
        ...defaultValues,
      } as AgentPaymentAllocation);
      setEditingRole(null);
    }
  }, [open, defaultValues]);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <h2 className="text-lg font-semibold">Set Agent Payment</h2>
        </DialogHeader>
        <DialogPadding className="space-y-4">
          <p className="text-sm text-gray-500">
            Define default payment amounts for each agent role.
          </p>
          {(Object.entries(values) as [AgentRoles, PaymentConfig][]).map(
            ([role, config]) => (
              <div
                key={role}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium capitalize">
                    {role.replace(/([A-Z])/g, " $1").trim()}
                  </p>
                  <p className="text-sm text-gray-500">
                    Default: NGN {config.default}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingRole(role)}
                >
                  <Pencil className="w-4 h-4 mr-2" /> Edit
                </Button>
              </div>
            ),
          )}
        </DialogPadding>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(values)} disabled={isPending}>
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Sub-dialog for editing state overrides */}
      {editingRole && (
        <Dialog open={!!editingRole} onOpenChange={() => setEditingRole(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <h2 className="text-lg font-semibold capitalize">
                Overrides: {editingRole.replace(/([A-Z])/g, " $1").trim()}
              </h2>
            </DialogHeader>
            <DialogPadding className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-sm font-medium">Default Amount</label>
                  <input
                    type="number"
                    className="border rounded-md px-3 py-2"
                    value={values[editingRole].default}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [editingRole]: {
                          ...prev[editingRole],
                          default: Number(e.target.value),
                        },
                      }))
                    }
                  />
                </div>
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-md font-semibold mb-3">
                    State Overrides
                  </h3>
                  {statesList.map((state) => (
                    <div
                      key={state}
                      className="flex items-center justify-between mb-2"
                    >
                      <span className="text-sm">{state}</span>
                      <input
                        type="number"
                        placeholder="Default"
                        className="border rounded-md px-2 py-1 w-32"
                        value={values[editingRole].states[state] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setValues((prev) => {
                            const newStates = { ...prev[editingRole].states };
                            if (val === "") delete newStates[state];
                            else newStates[state] = Number(val);
                            return {
                              ...prev,
                              [editingRole]: {
                                ...prev[editingRole],
                                states: newStates,
                              },
                            };
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </DialogPadding>
            <DialogFooter>
              <Button onClick={() => setEditingRole(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
