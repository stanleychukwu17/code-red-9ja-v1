import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { DashboardLayout } from "@repo/ui/components/custom/AdminLayouts";
import { HomePageHeader } from "./-header";
import { useUserParty } from "#/hooks/useUserParty";
import { useElection } from "#/hooks/useElection";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPartyReadiness } from "#/lib/server/parties";
import { useServerFn } from "@tanstack/react-start";
import { getElectionStats } from "#/lib/server/elections";

import { ReadinessProgressCard } from "./components/-readiness-progress-card";
import { RequiredActionsSection } from "./components/-required-actions";
import { SubTabsSection } from "./components/-readiness-subtabs";
import {
  FinancialOverallCard,
  TargetCard,
  AgentPaymentCard,
} from "./components/-financial-overview-cards";
import { ReadinessDialogs } from "./components/-readiness-dialogs";

/**
 * Party Readiness Command Dashboard
 *
 * Primary administrative situation room for political parties preparing for an upcoming election:
 * 1. Recruitment & Readiness Progress: Tracks real-time staffing quotas across all 4 operational tiers
 *    (Polling Unit Agents, Ward Supervisors, LGA Supervisors, and State Supervisors).
 * 2. Onboarding Action Checklist: Prompts party administrators to complete prerequisites before election day:
 *    - Purchasing agent quota slots
 *    - Depositing agent stipend escrow balances
 *    - Configuring state-by-state payment allocations
 *    - Setting up voter and agent mobilization campaigns
 * 3. Treasury & Financial Overview: Displays live wallet balances, stipend deposits, and transaction ledgers.
 * 4. Operational Targets & Applications Triage: Manages agent density goals and reviews incoming applications.
 */
export const Route = createFileRoute("/_authenticated/$partyShortName/home/")({
  head: () => getPageHeader({ title: "Readiness Dashboard" }),
  component: ReadinessComponent,
});

/**
 * ReadinessComponent
 *
 * Master orchestrator rendering readiness statistics, action banners, financial cards,
 * and managing interactive modals for slot purchases, budget allocations, and marketing setups.
 */
function ReadinessComponent() {
  const { party } = useUserParty();
  const {
    selectedElectionGroup,
    selectedElection,
    selectedStateId,
    selectedLGAId,
    selectedWardId,
  } = useElection();
  const partyId = party?.id;
  const queryClient = useQueryClient();

  // Dialog visibility states
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);
  const [isSlotsDialogOpen, setIsSlotsDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isMarketingDialogOpen, setIsMarketingDialogOpen] = useState(false);

  // Server function bridges (SSR + RPC)
  const fetchElectionStatsFn = useServerFn(getElectionStats);
  const fetchPartyReadinessFn = useServerFn(getPartyReadiness);

  // Single consolidated query for party readiness:
  // Returns treasury wallet, active marketing campaigns, slots, and setup checklists in one round-trip.
  const { data: readinessRes, refetch: refetchReadiness } = useQuery({
    queryKey: ["partyReadiness", partyId],
    queryFn: () => fetchPartyReadinessFn({ data: partyId! }),
    enabled: !!partyId,
  });

  // Extract structured readiness fields
  const readinessData = readinessRes?.data;
  // Treasury wallet details (virtual accounts, balance in kobo)
  const wallet = readinessData?.wallet;
  // Number of active mobilization campaigns currently running
  const activeCampaignsCount = readinessData?.active_campaigns_count ?? 0;
  // Whether the party has completed marketing campaign setup
  const hasMarketingSetup = readinessData?.has_marketing_setup ?? false;

  // ReFetches readiness to refresh treasury wallet balances and statuses after actions
  const refetchWallet = () => {
    refetchReadiness();
  };

  // Geographical election & agent recruitment statistics:
  // Dynamically scoped to the selected group, state, LGA, or ward
  const { data: electionStatsData, isLoading: isStatsLoading } = useQuery({
    queryKey: [
      "election-stats",
      selectedElectionGroup?.id,
      party?.id,
      selectedStateId,
      selectedLGAId,
      selectedWardId,
    ],
    queryFn: () =>
      fetchElectionStatsFn({
        data: {
          electionGroupId: selectedElectionGroup?.id as number,
          partyId: party?.id!,
          stateId: selectedStateId,
          lgaId: selectedLGAId,
          wardId: selectedWardId,
        },
      }),
    enabled: !!selectedElectionGroup?.id,
  });

  // Normalize party stats with fallback options
  const resolvedStats = electionStatsData?.data?.party_stats || {};

  // Target recruitment counts per operational tier
  const targets = electionStatsData?.data?.targets || {};

  // Refresh wallet & party cache after buying slots
  const handleSlotsPurchased = () => {
    refetchWallet();
    if (partyId) {
      queryClient.invalidateQueries({ queryKey: ["party", partyId] });
    }
  };

  return (
    <DashboardLayout>
      <HomePageHeader activeTab="main" />

      <div className="grid gap-6 lg:grid-cols-[2fr_1.2fr] items-start pb-20">
        {/* Left Hand Column */}
        <div className="space-y-6">
          <ReadinessProgressCard
            partyStats={resolvedStats}
            targets={targets}
            isLoading={isStatsLoading}
          />
          <RequiredActionsSection
            hasSlots={(party?.slots ?? 0) > 0}
            hasAgentPaymentBalance={(party?.agent_payment_balance_kobo ?? 0) > 0}
            hasPaymentAllocation={
              party?.agent_payment_allocation_kobo
                ? Object.values(party.agent_payment_allocation_kobo).some(
                  (role: any) => (role?.default ?? 0) > 0,
                )
                : false
            }
            hasMarketingSetup={hasMarketingSetup}
            onBuySlots={() => setIsSlotsDialogOpen(true)}
            onDepositPayment={() => setIsPaymentDialogOpen(true)}
            onDepositMarketing={() => setIsMarketingDialogOpen(true)}
            onPaymentAllocation={() => setIsBudgetDialogOpen(true)}
          />
          <SubTabsSection
            partyStats={resolvedStats}
            electionGroupId={selectedElectionGroup?.id}
            stateId={selectedStateId}
            lgaId={selectedLGAId}
            wardId={selectedWardId}
          />
        </div>

        {/* Right Hand Column */}
        <div className="space-y-6">
          <FinancialOverallCard
            // walletBalance={wallet?.balance_kobo || 0}
            walletBalance={+60}
            slots={party?.slots || 0}
            agentPaymentBalance={party?.agent_payment_balance_kobo || 0}
            activeCampaignsCount={activeCampaignsCount}
            onOpenWallet={() => setIsWalletDialogOpen(true)}
            onBuySlots={() => setIsSlotsDialogOpen(true)}
            onOpenAgentPayment={() => setIsPaymentDialogOpen(true)}
            onOpenMarketing={() => setIsMarketingDialogOpen(true)}
          />
          <TargetCard />
          <AgentPaymentCard
            onEdit={() => setIsBudgetDialogOpen(true)}
            party={party}
          />
        </div>
      </div>

      <ReadinessDialogs
        partyId={partyId}
        wallet={wallet}
        party={party}
        selectedElectionGroup={selectedElectionGroup}
        selectedElection={selectedElection}
        isWalletDialogOpen={isWalletDialogOpen}
        setIsWalletDialogOpen={setIsWalletDialogOpen}
        onWalletSuccess={refetchWallet}
        isSlotsDialogOpen={isSlotsDialogOpen}
        setIsSlotsDialogOpen={setIsSlotsDialogOpen}
        onSlotsPurchased={handleSlotsPurchased}
        isBudgetDialogOpen={isBudgetDialogOpen}
        setIsBudgetDialogOpen={setIsBudgetDialogOpen}
        isPaymentDialogOpen={isPaymentDialogOpen}
        setIsPaymentDialogOpen={setIsPaymentDialogOpen}
        isMarketingDialogOpen={isMarketingDialogOpen}
        setIsMarketingDialogOpen={setIsMarketingDialogOpen}
      />
    </DashboardLayout>
  );
}
