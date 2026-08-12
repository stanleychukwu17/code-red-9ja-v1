import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import * as React from "react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import {
  MarketingTable,
  type MarketingCampaignType,
} from "#/components/Tables";
import {
  getParties,
  getAllPartyMarketingCampaigns,
  createPartyMarketingCampaign,
  getMarketingPlans,
} from "#/lib/server/parties";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getElections } from "#/lib/server/elections";
import { getStates } from "#/lib/server/states";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AgentMarketingSetupDialog } from "@repo/ui/components/dialogs/AgentMarketingSetupDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/marketing/")({
  head: () => getPageHeader({ title: "Marketing" }),
  component: RouteComponent,
});

function RouteComponent() {
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [selectedPartyId, setSelectedPartyId] = React.useState<
    number | undefined
  >(undefined);

  // Fetch parties list for selecting active party when creating campaign
  const { data: partiesData } = useQuery({
    queryKey: ["parties"],
    queryFn: async () => {
      const res = await getParties();
      return res?.data?.parties || [];
    },
  });

  const parties = partiesData || [];
  const activePartyId =
    selectedPartyId ?? (parties[0]?.id ? Number(parties[0].id) : undefined);

  // Fetch ALL party marketing campaigns using admin endpoint
  const {
    data: campaignsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-all-marketing-campaigns"],
    queryFn: async () => {
      const res = await getAllPartyMarketingCampaigns({ data: { limit: 100 } });
      console.log("res:", res);
      if (res && res.success && res.data) {
        return res.data.campaigns || [];
      }
      return [];
    },
  });

  // Helpers for AgentMarketingSetupDialog
  const fetchGroups = async () => {
    const res = await getElectionGroups({
      data: { limit: 100, orderBy: "rank", order: "ASC" },
    });
    return res?.data?.election_groups || [];
  };

  const fetchElectionsWrapper = async (egId: number) => {
    const res = await getElections({
      data: { election_group_id: egId, limit: 100 },
    });
    return res?.data?.elections || [];
  };

  const fetchPlansWrapper = async () => {
    const res = await getMarketingPlans({
      data: { type: "agent-campaign", is_active: true },
    });
    return res?.data?.plans || [];
  };

  const { data: statesData } = useQuery({
    queryKey: ["states-nigeria"],
    queryFn: async () => {
      const res = await getStates({ data: { countryId: 161, limit: 100 } });
      return res?.data?.states || [];
    },
  });

  const campaigns: MarketingCampaignType[] = (campaignsData || []).map(
    (c: any) => ({
      id: c.id,
      party_id: c.party_id,
      party_name: c.party?.name || c.party_name,
      party_short_name: c.party?.short_name || c.party_short_name,
      party_logo: c.party?.logo || c.party_logo,
      election_group_id: c.election_group_id,
      election_group_name: c.election_group?.name || c.election_group_name,
      election_id: c.election_id,
      election_name: c.election?.name || c.election_name,
      plan_id: c.plan_id,
      plan_name: c.plan?.name || c.plan_name,
      plan_price_kobo: c.plan?.price_kobo || c.plan_price_kobo,
      plan_color: c.plan?.color_hex || c.plan_color,
      type: c.type,
      states: c.states,
      duration_in_days: c.duration_in_days,
      start_date: c.start_date,
      end_date: c.end_date,
      status: c.status,
      budget_kobo: c.budget_kobo,
      budget_per_day_kobo: c.budget_per_day_kobo,
      referral_amount_kobo: c.referral_amount_kobo,
      amount_spent_kobo: c.amount_spent_kobo,
      budget: c.budget,
      budget_per_day: c.budget_per_day,
      referral_amount: c.referral_amount,
      amount_spent: c.amount_spent,
      created_at: c.created_at,
    }),
  );

  return (
    <Layout>
      <PageHeader title="Marketing" activeTab="" />
      <PageSearchLayer
        placeholder="Search"
        rightComponent={
          <>
            <FilterButton />
            <AddButton onClick={() => setIsAddOpen(true)} />
          </>
        }
      />

      {isLoading ? (
        <div className="w-full h-60 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-c-50" />
        </div>
      ) : error ? (
        <div className="w-full p-6 text-center text-red-600 font-medium">
          {error instanceof Error
            ? error.message
            : "Failed to load marketing campaigns"}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="w-full p-12 text-center text-c-40 font-medium bg-white rounded-2xl border border-[#dfdfdf]">
          No marketing campaigns found. Click Add to create one.
        </div>
      ) : (
        <MarketingTable items={campaigns} />
      )}

      {activePartyId && (
        <AgentMarketingSetupDialog
          open={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          isPending={false}
          partyId={activePartyId}
          fetchElectionGroups={fetchGroups}
          fetchElection={fetchElectionsWrapper}
          fetchPlans={fetchPlansWrapper}
          fetchStates={async (args) => await getStates(args)}
          states={statesData || []}
          onSubmit={async (payload) => {
            const res = await createPartyMarketingCampaign({
              data: {
                ...payload,
                partyId: activePartyId,
              },
            });
            if (res?.success) {
              toast.success("Marketing campaign created successfully!");
              setIsAddOpen(false);
              refetch();
            } else {
              toast.error(
                res?.message ?? "Failed to create marketing campaign",
              );
            }
          }}
        />
      )}
    </Layout>
  );
}
