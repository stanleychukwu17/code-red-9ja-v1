import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { AppAvatar } from "@repo/ui/components/avatar";
import { SelectElectionRole } from "@repo/ui/components/selects/election-role-select";
import { SelectState } from "@repo/ui/components/selects/state-select";
import { SelectLga } from "@repo/ui/components/selects/lga-select";
import { SelectWard } from "@repo/ui/components/selects/ward-select";
import { ChoosePollingUnitDialog } from "./party-application-dialog";
import { getStates } from "#/lib/server/countries";
import { getLGAs, getWards } from "#/lib/server/applications";
import {
  changeAgentRole,
  type AgentPerformanceItem,
} from "#/lib/server/agents";
import { useAppContext } from "#/hooks/useAppContext";
import { MapPin, Shield, Loader2 } from "lucide-react";
import { Label } from "@repo/ui/components/input";

interface ChangeRoleDialogProps {
  open: boolean;
  onClose: () => void;
  data: AgentPerformanceItem;
  refetch?: () => void;
}

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

export function ChangeRoleDialog({
  open,
  onClose,
  data,
  refetch,
}: ChangeRoleDialogProps) {
  const { party, selectedElectionGroup } = useAppContext();
  const queryClient = useQueryClient();

  const partyId = data.party_id || party?.id || 0;
  const electionGroupId =
    data.election_group_id || selectedElectionGroup?.id || 0;

  const [newRole, setNewRole] = useState<string>("ward_election_supervisor");
  const [selectedState, setSelectedState] = useState<number | "">(
    data.state_id || "",
  );
  const [selectedLga, setSelectedLga] = useState<number | "">(
    data.lga_id || "",
  );
  const [selectedWard, setSelectedWard] = useState<number | "">(
    data.ward_id || "",
  );
  const [selectedUnit, setSelectedUnit] = useState<{
    id: string;
    name: string;
  } | null>(
    data.polling_unit_id
      ? {
          id: String(data.polling_unit_id),
          name: data.polling_unit_name || `PU #${data.polling_unit_id}`,
        }
      : null,
  );
  const [openChooseUnitDialog, setOpenChooseUnitDialog] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (open) {
      // Default to a sensible next supervisor role if currently a polling agent
      if (data.role_type === "polling_agent" || data.role_type === "pu_agent") {
        setNewRole("ward_election_supervisor");
      } else {
        setNewRole(data.role_type || "ward_election_supervisor");
      }
      setSelectedState(data.state_id || "");
      setSelectedLga(data.lga_id || "");
      setSelectedWard(data.ward_id || "");
      if (data.polling_unit_id) {
        setSelectedUnit({
          id: String(data.polling_unit_id),
          name: data.polling_unit_name || `PU #${data.polling_unit_id}`,
        });
      } else {
        setSelectedUnit(null);
      }
      setErrorMsg("");
    }
  }, [open, data]);

  const changeRoleMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg("");
      const res = await changeAgentRole({
        data: {
          userId: data.user_id,
          partyId,
          electionGroupId,
          currentRoleType: data.role_type,
          newRoleType: newRole,
          stateId: selectedState ? Number(selectedState) : undefined,
          lgaId: selectedLga ? Number(selectedLga) : undefined,
          wardId: selectedWard ? Number(selectedWard) : undefined,
          pollingUnitId: selectedUnit ? Number(selectedUnit.id) : undefined,
        },
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to change agent role");
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-performance"] });
      refetch?.();
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to update agent role");
    },
  });

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "polling_agent":
      case "pu_agent":
        return "Polling Agent";
      case "ward_supervisor":
      case "ward_election_supervisor":
        return "Ward Supervisor";
      case "lga_supervisor":
      case "lga_election_supervisor":
        return "LGA Supervisor";
      case "state_supervisor":
      case "state_election_supervisor":
        return "State Supervisor";
      default:
        return role;
    }
  };

  const handleSubmit = () => {
    if (!partyId || !electionGroupId) {
      setErrorMsg("Party or Election Group context is missing");
      return;
    }

    if (newRole === "polling_agent" && !selectedUnit?.id) {
      setErrorMsg("Please select a polling unit for the agent");
      return;
    }

    if (
      (newRole === "state_election_supervisor" ||
        newRole === "state_supervisor") &&
      !selectedState
    ) {
      setErrorMsg("Please select a state for state supervisor");
      return;
    }

    if (
      (newRole === "lga_election_supervisor" || newRole === "lga_supervisor") &&
      (!selectedState || !selectedLga)
    ) {
      setErrorMsg("Please select a state and LGA for LGA supervisor");
      return;
    }

    if (
      (newRole === "ward_election_supervisor" ||
        newRole === "ward_supervisor") &&
      (!selectedState || !selectedLga || !selectedWard)
    ) {
      setErrorMsg("Please select a state, LGA, and Ward for Ward supervisor");
      return;
    }

    changeRoleMutation.mutate();
  };

  const isPollingAgent = newRole === "polling_agent";
  const isWardSupervisor =
    newRole === "ward_election_supervisor" || newRole === "ward_supervisor";
  const isLgaSupervisor =
    newRole === "lga_election_supervisor" || newRole === "lga_supervisor";
  const isStateSupervisor =
    newRole === "state_election_supervisor" || newRole === "state_supervisor";

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader
            title="Change Agent Role"
            description="Promote or reassign this agent to a different election role."
          />

          <DialogPadding className="space-y-4 pt-1 pb-3">
            {/* Agent Profile Summary */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-c-5">
              <AppAvatar
                src={data.avatar_url}
                alt={data.user_name}
                className="size-11 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-c-90 truncate">
                  {data.user_name}
                </p>
                <div className="flex items-center gap-2 text-xs text-c-60 mt-0.5">
                  <span className="inline-flex items-center gap-1 font-medium text-primary">
                    <Shield className="size-3" />
                    Current: {getRoleLabel(data.role_type)}
                  </span>
                  {data.state_name && (
                    <span className="text-c-40 truncate">
                      • {data.lga_name || data.state_name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 text-xs rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600">
                {errorMsg}
              </div>
            )}

            {/* Select New Role */}
            <div className="space-y-1.5">
              <Label title="New election role" />
              <SelectElectionRole
                selectedId={newRole}
                update={setNewRole}
                className="w-full"
              />
            </div>

            {/* Geographic Assignments */}
            <div className="space-y-3 pt-1">
              {/* State Selection */}
              <div className="space-y-1.5">
                <Label title="State" />
                <SelectState
                  selectedId={selectedState ? String(selectedState) : undefined}
                  countryOriginalId={161}
                  fetchStates={fetchStatesAdapter}
                  update={(state) => {
                    setSelectedState(state.id);
                    setSelectedLga("");
                    setSelectedWard("");
                    setSelectedUnit(null);
                  }}
                  className="w-full"
                />
              </div>

              {/* LGA Selection (if ward, lga, or polling agent) */}
              {(isLgaSupervisor || isWardSupervisor || isPollingAgent) && (
                <div className="space-y-1.5">
                  <Label title="LGA" />
                  <SelectLga
                    selectedId={selectedLga ? String(selectedLga) : undefined}
                    stateId={selectedState ? Number(selectedState) : undefined}
                    fetchLGAs={fetchLgasAdapter}
                    update={(lga) => {
                      setSelectedLga(lga.id);
                      setSelectedWard("");
                      setSelectedUnit(null);
                    }}
                    className="w-full"
                  />
                </div>
              )}

              {/* Ward Selection (if ward or polling agent) */}
              {(isWardSupervisor || isPollingAgent) && (
                <div className="space-y-1.5">
                  <Label title="Ward" />

                  <SelectWard
                    selectedId={selectedWard ? String(selectedWard) : undefined}
                    lgaId={selectedLga ? Number(selectedLga) : undefined}
                    stateId={selectedState ? Number(selectedState) : undefined}
                    fetchWards={fetchWardsAdapter}
                    update={(ward) => {
                      setSelectedWard(ward.id);
                      setSelectedUnit(null);
                    }}
                    className="w-full"
                  />
                </div>
              )}

              {/* Polling Unit Selection (if polling agent) */}
              {isPollingAgent && (
                <div className="space-y-1.5">
                  <Label title="Polling unit" />
                  <div className="flex items-center justify-between p-3 rounded-xl bg-c-5">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <MapPin className="size-4 text-primary shrink-0" />
                      <span className="text-sm font-medium text-c-80 truncate">
                        {selectedUnit?.name || "No polling unit selected"}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setOpenChooseUnitDialog(true)}
                      className="shrink-0"
                    >
                      {selectedUnit ? "Change" : "Select PU"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogPadding>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={changeRoleMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSubmit}
              disabled={changeRoleMutation.isPending}
            >
              {changeRoleMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Updating...
                </span>
              ) : (
                "Update Role"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Polling Unit Picker Dialog */}
      <ChoosePollingUnitDialog
        open={openChooseUnitDialog}
        onClose={() => setOpenChooseUnitDialog(false)}
        stateId={selectedState ? Number(selectedState) : undefined}
        lgaId={selectedLga ? Number(selectedLga) : undefined}
        wardId={selectedWard ? Number(selectedWard) : undefined}
        onSelect={(unit) => {
          setSelectedUnit({ id: unit.id, name: unit.name });
          setOpenChooseUnitDialog(false);
        }}
      />
    </>
  );
}
