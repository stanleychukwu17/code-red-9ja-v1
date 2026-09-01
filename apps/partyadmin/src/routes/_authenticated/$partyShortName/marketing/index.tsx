import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  AddButton,
  FilterButton,
} from "@repo/ui/components/custom/AdminLayouts";
import {
  MarketingTable,
  type MarketingCampaignType,
} from "#/components/Tables";
import { useAuth } from "#/hooks/useAppContext";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AgentMarketingSetupDialog } from "@repo/ui/components/dialogs/AgentMarketingSetupDialog";

// Server Functions
import { getStates } from "#/lib/server/countries";
import {
  getPartyMarketingCampaigns,
  createMarketingCampaign,
  getPlans,
} from "#/lib/server/parties";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getElections } from "#/lib/server/elections";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/marketing/",
)({
  head: () => getPageHeader({ title: "Marketing" }),
  component: RouteComponent,
});

function RouteComponent() {
  const { partyShortName } = Route.useParams();
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const { user, party } = useAuth();
  const partyId = party?.id ?? user?.party?.id ?? (user as any)?.party_id;

  const {
    data: campaignsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["party-marketing-campaigns", partyId],
    queryFn: async () => {
      if (!partyId) return [];
      const res = await getPartyMarketingCampaigns({ data: Number(partyId) });
      if (res && res.success && res.data) {
        return res.data.campaigns || [];
      }
      return [];
    },
    enabled: partyId !== undefined,
  });

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
    const res = await getPlans({
      data: { type: "agent-campaign", isActive: true },
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
      party_name: c.party_name || party?.name,
      party_short_name:
        c.party_short_name || party?.shortName || partyShortName,
      party_logo: c.party_logo || party?.logo,
      election_group_id: c.election_group_id,
      election_group_name: c.election_group_name || c.election_group?.name,
      election_id: c.election_id,
      election_name: c.election_name || c.election?.name,
      plan_id: c.plan_id,
      plan_name: c.plan_name || c.plan?.name,
      plan_price_kobo: c.plan_price_kobo,
      plan_color: c.plan_color || c.plan?.color_hex,
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
        ariaLabel="Search marketing campaigns"
        placeholder="Search"
        rightComponent={
          <>
            <FilterButton />
            <AddButton onClick={() => setIsFormOpen(true)} />
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

      {partyId && (
        <AgentMarketingSetupDialog
          open={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          isPending={false}
          partyId={partyId}
          fetchElectionGroups={fetchGroups}
          fetchElection={fetchElectionsWrapper}
          fetchPlans={fetchPlansWrapper}
          fetchStates={async (args) => await getStates(args)}
          states={statesData || []}
          onSubmit={async (payload) => {
            const res = await createMarketingCampaign({
              data: {
                ...payload,
                partyId: partyId,
              },
            });
            if (res?.success) {
              toast.success("Marketing campaign created successfully!");
              setIsFormOpen(false);
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
