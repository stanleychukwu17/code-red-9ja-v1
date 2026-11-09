import { useMemo } from "react";
import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { HeaderAccent } from "@repo/ui/components/header-accent";
import { QUERY_KEYS } from "@/lib/config";
import { getPageHeader } from "@/lib/shared/meta";
import { useParties } from "#/hooks";
import { CampaignGroupNavTabs } from "#/components/campaign-group";
import {
  getCampaignGroup,
  getCampaignGroupTitle,
  type CampaignGroupDetails,
} from "@/lib/server/campaign_groups";

export const Route = createFileRoute("/_authenticated/group/$partyId/$groupId")({
  head: () => getPageHeader({
    title: "Campaign Group",
  }),
  component: CampaignGroupLayoutComponent,
});

function CampaignGroupLayoutComponent() {
  const { partyId, groupId } = Route.useParams();

  // 1. Fetch parties list to resolve party identity
  const { parties } = useParties();
  const activeParty = useMemo(() => {
    const pid = Number(partyId);
    if (!Array.isArray(parties)) return null;

    return parties.find((p) => p.id === pid) || null;
  }, [parties, partyId]);

  // 2. Fetch group metadata
  const { data: groupRes } = useQuery({
    queryKey: QUERY_KEYS.campaignGroup(groupId),
    queryFn: () => getCampaignGroup({ data: { groupId } }),
    enabled: Boolean(groupId),
    staleTime: Infinity,
  });

  const group: CampaignGroupDetails | undefined = groupRes?.data?.group;
  console.log(group)
  console.log(activeParty)

  // Dynamic group title based on scope and territory
  const groupTitle = useMemo(
    () => getCampaignGroupTitle(group, activeParty?.short_name),
    [group, activeParty?.short_name]
  );

  // Exit with error view if route partyId does not match the campaign group's party_id
  if (group && Number(partyId) !== group.party_id) {
    return (
      <ErrorComponent
        partyId={partyId}
        partyName={activeParty?.short_name}
      />
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header with underline accent mark */}
      <div className="flex items-center justify-center">
        <HeaderAccent
          as="h1"
          title={groupTitle}
          titleClassName="text-base sm:text-[30px] font-bold tracking-wide text-foreground"
          accentClassName="top-4 sm:top-7"
        />
      </div>

      {/* Campaign Group Navigation Tabs */}
      <CampaignGroupNavTabs
        partyId={partyId}
        groupId={groupId}
      />

      {/* Nested Tab Route Content */}
      <Outlet />
    </div>
  );
}


type ErrorComponentProps = {
  partyId: string;
  partyName?: string | null;
};

const ErrorComponent = ({ partyId, partyName }: ErrorComponentProps) => {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-destructive/20 bg-destructive/5 space-y-4">
        <AlertCircle className="size-12 text-destructive" />
        <h2 className="text-xl font-bold text-foreground">
          Party Mismatch Error
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          This campaign group does not belong to the selected political party.
        </p>
        <div className="pt-2">
          <Link
            to="/party/$partyName/$partyId"
            params={{
              partyName: (partyName || "party").toLowerCase(),
              partyId: String(partyId),
            }}
            className="inline-flex items-center justify-center px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-black/90 transition-colors"
          >
            Return to Party Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};