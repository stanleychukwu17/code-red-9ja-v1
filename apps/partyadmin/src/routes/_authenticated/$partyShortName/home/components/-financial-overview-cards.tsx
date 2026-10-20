import { useState, type ReactNode } from "react";
import { ReadinessStatSection } from "@repo/ui/components/custom/AdminLayouts";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import ArrowHandleIcon from "@repo/ui/icons/arrow-handle-icon";
import FancyAgentIcon from "@repo/ui/icons/fancy-agent-icon";
import { useUserParty } from "#/hooks/useUserParty";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPartyAgentTargets,
  updatePartyAgentTargets,
} from "#/lib/server/parties";
import { TargetFormDialog } from "@repo/ui/components/dialogs/TargetFormDialog";

type FinancialOverallCardProps = {
  walletBalance: number;
  slots: number;
  agentPaymentBalance: number;
  activeCampaignsCount: number;
  onOpenWallet: () => void;
  onBuySlots: () => void;
  onOpenAgentPayment: () => void;
  onOpenMarketing: () => void;
};

/** Clickable single row inside the financial overview card */
export function FinancialRow({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "h-11 px-3 flex items-center gap-5 transition-colors rounded-lg",
        onClick && "cursor-pointer hover:bg-c-5",
      )}
      onClick={onClick}
    >
      <p className="text-c-70 w-full">{label}</p>
      <span className="font-semibold text-[16px] text-c-80">{value}</span>
      <Button variant="black" className="h-8 px-3 rounded-10">
        <ArrowHandleIcon className="-rotate-90 size-4" strokeWidth={2} />
      </Button>
    </div>
  );
}

/**
 * FinancialOverallCard Component
 *
 * Summary card grouping the party's main financial positions:
 * - Party treasury balance
 * - Purchased agent slots
 * - Deposited stipend escrow
 * - Active mobilization campaigns
 */
export function FinancialOverallCard({
  walletBalance,
  slots,
  agentPaymentBalance,
  activeCampaignsCount,
  onOpenWallet,
  onBuySlots,
  onOpenAgentPayment,
  onOpenMarketing,
}: FinancialOverallCardProps) {
  const balanceNGN = (walletBalance / 100).toLocaleString("en-NG", {
    maximumFractionDigits: 1,
  });
  const agentPaymentNGN = (agentPaymentBalance / 100).toLocaleString("en-NG", {
    maximumFractionDigits: 1,
  });

  return (
    <ReadinessStatSection title="Financial Overall">
      <FinancialRow
        label="Party Wallet Balance"
        value={`₦${balanceNGN}`}
        onClick={onOpenWallet}
      />
      <div className="px-3 py-2">
        <div className="h-px bg-border w-full" />
      </div>
      <FinancialRow
        label="Slots"
        value={slots.toLocaleString()}
        onClick={onBuySlots}
      />
      <FinancialRow
        label="Agent Payment Deposit"
        value={`₦${agentPaymentNGN}`}
        onClick={onOpenAgentPayment}
      />
      <FinancialRow
        label="Marketing Campaigns"
        value={activeCampaignsCount.toLocaleString()}
        onClick={onOpenMarketing}
      />
    </ReadinessStatSection>
  );
}

/** Simple key-value stat row with icon */
export function SimpleStatTile({
  icon,
  label,
  value,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="h-11 px-3 flex items-center gap-3">
      {icon ?? <FancyAgentIcon className="shrink-0 size-5" />}
      <p className="text-c-70 w-full">{label}</p>
      <span className="font-semibold text-[16px] text-c-90">{value}</span>
    </div>
  );
}

/**
 * TargetCard Component
 *
 * Configures the party's desired agent density targets across administrative tiers:
 * (e.g., target agents per Polling Unit, Ward, LGA, and State).
 */
export function TargetCard() {
  const { party } = useUserParty();
  const partyId = party?.id;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const fetchTargetsFn = useServerFn(getPartyAgentTargets);
  const updateTargetsFn = useServerFn(updatePartyAgentTargets);
  const queryClient = useQueryClient();

  const handleFetchTargets = async (id: string | number) => {
    const res = await fetchTargetsFn({ data: id });
    return res?.data?.targets || res?.data || null;
  };

  const handleUpdateTargets = async (id: string | number, values: any) => {
    return await updateTargetsFn({
      data: {
        partyID: id,
        targets: values,
      },
    });
  };

  const { data: serverTargets } = useQuery({
    queryKey: ["party-agent-targets", partyId],
    queryFn: () => handleFetchTargets(partyId!),
    enabled: !!partyId,
  });

  const st = serverTargets as any;
  const targets = [
    {
      role: "Polling Agent per unit",
      count: (st?.polling_agent ?? st?.pollingUnitAgent)?.toString() ?? "2",
    },
    {
      role: "Ward Supervisor per ward",
      count:
        (
          st?.ward_election_supervisor ?? st?.wardElectionSupervisor
        )?.toString() ?? "2",
    },
    {
      role: "LGA Supervisor per lga",
      count:
        (
          st?.lga_election_supervisor ?? st?.lgaElectionSupervisor
        )?.toString() ?? "2",
    },
    {
      role: "State Supervisor per state",
      count:
        (
          st?.state_election_supervisor ?? st?.stateElectionSupervisor
        )?.toString() ?? "1",
    },
  ];

  return (
    <>
      <ReadinessStatSection
        title="Target"
        headerAction={
          <Button
            variant="outline"
            size="xs"
            className="hover:bg-background hover:text-green"
            onClick={(e) => {
              e.stopPropagation();
              setIsDialogOpen(true);
            }}
          >
            Edit
          </Button>
        }
      >
        {targets.map((t, i) => (
          <SimpleStatTile key={i} label={t.role} value={t.count} />
        ))}
      </ReadinessStatSection>

      {partyId && (
        <TargetFormDialog
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          partyId={partyId}
          fetchTargets={handleFetchTargets}
          updateTargets={handleUpdateTargets}
          onSuccess={() => {
            setIsDialogOpen(false);
            queryClient.invalidateQueries({
              queryKey: ["party-agent-targets", partyId],
            });
          }}
        />
      )}
    </>
  );
}

/**
 * AgentPaymentCard Component
 *
 * Displays base stipend disbursements configured per agent role:
 * - Polling Agent
 * - Ward Supervisor
 * - LGA Supervisor
 * - State Supervisor
 */
export function AgentPaymentCard({
  onEdit,
  party,
}: {
  onEdit: () => void;
  party: any;
}) {
  const allocations = party?.agent_payment_allocation_kobo || {};
  const pollingAgentPaymentKobo = allocations.polling_agent?.default || 0;
  const wardSupervisorPaymentKobo =
    allocations.ward_election_supervisor?.default || 0;
  const lgaSupervisorPaymentKobo =
    allocations.lga_election_supervisor?.default || 0;
  const stateSupervisorPaymentKobo =
    allocations.state_election_supervisor?.default || 0;

  const payments = [
    {
      role: "Polling Agent",
      amount: `₦${(pollingAgentPaymentKobo / 100).toLocaleString()}`,
    },
    {
      role: "Ward Supervisor",
      amount: `₦${(wardSupervisorPaymentKobo / 100).toLocaleString()}`,
    },
    {
      role: "LGA Supervisor",
      amount: `₦${(lgaSupervisorPaymentKobo / 100).toLocaleString()}`,
    },
    {
      role: "State Supervisor",
      amount: `₦${(stateSupervisorPaymentKobo / 100).toLocaleString()}`,
    },
  ];

  return (
    <ReadinessStatSection
      title="Agent Payment"
      headerAction={
        <Button
          variant="outline"
          size="xs"
          className="hover:bg-background hover:text-green"
          onClick={onEdit}
        >
          Edit
        </Button>
      }
    >
      {payments.map((s, i) => (
        <SimpleStatTile key={i} label={s.role} value={s.amount} />
      ))}
    </ReadinessStatSection>
  );
}
