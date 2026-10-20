import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AccountDetailsDialog } from "#/components/dialogs/account-details-dialog";
import { BuyAgentSlotsDialog } from "#/components/dialogs/buy-agent-slots-dialog";
import { AgentPaymentAllocationFormDialog } from "@repo/ui/components/dialogs/AgentPaymentAllocationFormDialog";
import { DepositAgentPaymentDialog } from "@repo/ui/components/dialogs/DepositAgentStipendDialog";
import {
  AgentMarketingSetupDialog,
  type AgentMarketingSetupValue,
} from "@repo/ui/components/dialogs/AgentMarketingSetupDialog";
import {
  updatePartyStateAllowances,
  getPartyAgentPaymentAllocation,
  getPlans,
  createMarketingCampaign,
  depositPartyAllowance,
} from "#/lib/server/parties";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getElectionsByGroup } from "#/lib/server/elections";
import { getStates } from "#/lib/server/countries";

type ReadinessDialogsProps = {
  partyId?: number;
  wallet?: any;
  party?: any;
  selectedElectionGroup?: any;
  selectedElection?: any;
  isWalletDialogOpen: boolean;
  setIsWalletDialogOpen: (open: boolean) => void;
  onWalletSuccess: () => void;
  isSlotsDialogOpen: boolean;
  setIsSlotsDialogOpen: (open: boolean) => void;
  onSlotsPurchased: () => void;
  isBudgetDialogOpen: boolean;
  setIsBudgetDialogOpen: (open: boolean) => void;
  isPaymentDialogOpen: boolean;
  setIsPaymentDialogOpen: (open: boolean) => void;
  isMarketingDialogOpen: boolean;
  setIsMarketingDialogOpen: (open: boolean) => void;
};

/**
 * ReadinessDialogs Component
 *
 * Consolidates all interactive configuration and funding modal dialogs
 * for the Readiness Dashboard:
 * - Account details / funding dialog
 * - Agent slot purchasing dialog
 * - Agent payment allocation budget dialog
 * - Agent payment escrow deposit dialog
 * - Agent marketing setup dialog
 */
export function ReadinessDialogs({
  partyId,
  wallet,
  party,
  selectedElectionGroup,
  selectedElection,
  isWalletDialogOpen,
  setIsWalletDialogOpen,
  onWalletSuccess,
  isSlotsDialogOpen,
  setIsSlotsDialogOpen,
  onSlotsPurchased,
  isBudgetDialogOpen,
  setIsBudgetDialogOpen,
  isPaymentDialogOpen,
  setIsPaymentDialogOpen,
  isMarketingDialogOpen,
  setIsMarketingDialogOpen,
}: ReadinessDialogsProps) {
  const queryClient = useQueryClient();
  const [isPaymentPending, setIsPaymentPending] = useState(false);

  const fetchGroups = useServerFn(getElectionGroups);
  const fetchElectionsByGroup = useServerFn(getElectionsByGroup);
  const fetchPlans = useServerFn(getPlans);
  const fetchStates = useServerFn(getStates);
  const submitCampaign = useServerFn(createMarketingCampaign);

  const fetchElectionsWrapper = async (args: any) => {
    if (!args.data.electionGroupId)
      return {
        success: true,
        data: { elections: [] },
        meta: { has_more: false },
      };
    return await fetchElectionsByGroup({ data: args.data.electionGroupId });
  };

  const fetchMarketingPlansWrapper = async (args: any) => {
    return await fetchPlans({
      data: { type: args?.data?.type ?? "agent-campaign", isActive: true },
    });
  };

  return (
    <>
      <AccountDetailsDialog
        open={isWalletDialogOpen}
        setOpen={setIsWalletDialogOpen}
        onClose={() => setIsWalletDialogOpen(false)}
        wallet={wallet}
        onSuccess={onWalletSuccess}
      />

      <BuyAgentSlotsDialog
        open={isSlotsDialogOpen}
        onClose={() => setIsSlotsDialogOpen(false)}
        partyId={partyId}
        walletBalanceKobo={wallet?.balance_kobo ?? 0}
        onSuccess={onSlotsPurchased}
      />

      <AgentPaymentAllocationFormDialog
        open={isBudgetDialogOpen}
        onClose={() => setIsBudgetDialogOpen(false)}
        partyId={partyId!}
        fetchAllocation={async (id) => {
          const res = await getPartyAgentPaymentAllocation({ data: id });
          return (
            res?.data?.agent_payment_allocation_kobo ??
            res?.data?.agent_payment_allocation ??
            null
          );
        }}
        updateAllocation={async (id, values) => {
          const res = await updatePartyStateAllowances({
            data: { partyID: id, allowances: values as any },
          });
          if (!res.success) throw new Error(res.message || "Failed to update");
          queryClient.invalidateQueries({ queryKey: ["party", partyId] });
          toast.success("Agent payment budget saved!");
          return res.data;
        }}
        onSuccess={() => setIsBudgetDialogOpen(false)}
      />

      <DepositAgentPaymentDialog
        open={isPaymentDialogOpen}
        onClose={() => setIsPaymentDialogOpen(false)}
        walletBalanceNaira={(wallet?.balance_kobo ?? 0) / 100}
        agentPaymentBalanceNaira={(party?.agent_payment_balance_kobo ?? 0) / 100}
        partyId={partyId}
        electionGroupId={selectedElectionGroup?.id}
        fetchElectionGroups={fetchGroups}
        isPending={isPaymentPending}
        onSubmit={async (amountKobo) => {
          if (!partyId) return;
          setIsPaymentPending(true);
          try {
            const res = await depositPartyAllowance({
              data: { partyID: partyId, amountKobo },
            });
            if (res?.success) {
              toast.success("Agent payment deposited!");
              onWalletSuccess();
              queryClient.invalidateQueries({ queryKey: ["party", partyId] });
              setIsPaymentDialogOpen(false);
            } else {
              toast.error(res?.message ?? "Failed to deposit agent payment");
            }
          } finally {
            setIsPaymentPending(false);
          }
        }}
      />

      <AgentMarketingSetupDialog
        open={isMarketingDialogOpen}
        onClose={() => setIsMarketingDialogOpen(false)}
        isPending={false}
        partyId={partyId}
        fetchElectionGroups={fetchGroups}
        fetchElection={fetchElectionsWrapper}
        fetchPlans={fetchMarketingPlansWrapper}
        fetchStates={fetchStates}
        defaultValue={
          {
            electionGroupId: selectedElectionGroup?.id
              ? String(selectedElectionGroup.id)
              : "",
            electionId: selectedElection?.id ? String(selectedElection.id) : "",
            planId: "",
            targetMode: "custom",
            states: [],
            durationUnit: "days",
            durationValue: 5,
          } satisfies Partial<AgentMarketingSetupValue>
        }
        onSubmit={async (payload) => {
          if (!partyId) return;
          const res = await submitCampaign({
            data: {
              ...payload,
              partyId: partyId,
            },
          });
          if (res?.success) {
            toast.success("Marketing campaign created successfully!");
            setIsMarketingDialogOpen(false);
            onWalletSuccess();
          } else {
            toast.error(res?.message ?? "Failed to create marketing campaign");
          }
        }}
      />
    </>
  );
}
