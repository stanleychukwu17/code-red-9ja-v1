import { useMemo } from "react";
import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
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
  const { data: groupRes, isLoading: isGroupLoading } = useQuery({
    queryKey: QUERY_KEYS.campaignGroup(groupId),
    queryFn: () => getCampaignGroup({ data: { groupId } }),
    enabled: Boolean(groupId),
    staleTime: Infinity,
  });

  const group: CampaignGroupDetails | undefined = groupRes?.data?.group;

  // Dynamic group title based on scope and territory
  const groupTitle = useMemo(
    () => getCampaignGroupTitle(group, activeParty?.short_name),
    [group, activeParty?.short_name]
  );

  // 1. Loading state while fetching group
  if (isGroupLoading) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // 2. If no group is returned, show error message
  if (!group) {
    return (
      <ErrorComponent
        title="Campaign Group Not Found"
        message="The requested campaign group could not be found or does not exist."
        partyId={partyId}
        partyName={activeParty?.short_name}
      />
    );
  }

  // 3. Exit with error view if route partyId does not match the campaign group's party_id
  if (Number(partyId) !== group.party_id) {
    return (
      <ErrorComponent
        title="Party Mismatch Error"
        message="This campaign group does not belong to the selected political party."
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


// Fallback view when group is not found or does not match the route party ID
type ErrorComponentProps = {
  title?: string;
  message?: string;
  partyId: string;
  partyName?: string | null;
};

const ErrorComponent = ({
  title = "Party Mismatch Error",
  message = "This campaign group does not belong to the selected political party.",
  partyId,
  partyName,
}: ErrorComponentProps) => {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-destructive/20 bg-destructive/5 space-y-4">
        <AlertCircle className="size-12 text-destructive" />
        <h2 className="text-xl font-bold text-foreground">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {message}
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