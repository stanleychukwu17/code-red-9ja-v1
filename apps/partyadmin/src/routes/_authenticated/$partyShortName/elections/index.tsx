/**
 * @file Election Groups Management Page
 * @description Displays election groups (umbrella election events such as "2023 General Elections")
 * that the political party is registered to contest. Features infinite scrolling, cursor-based pagination,
 * agent coverage percentage stats, and contested races tally.
 */

import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useEffect } from "react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { ElectionGroupsTable } from "#/components/Tables";
import { getElectionTabs } from "./-data";
import { getElectionGroups } from "#/lib/server/election_groups";
import { useQuery } from "@tanstack/react-query";
import type { ElectionGroupType } from "#/components/tiles/election-group-tile";
import { useUserParty } from "#/hooks/useUserParty";

export const Route = createFileRoute("/_authenticated/$partyShortName/elections/")({
  head: () => getPageHeader({ title: "Elections" }),
  component: RouteComponent,
});

/**
 * Election Groups Page Component
 * Queries server for party-specific election groups with infinite scrolling sentinel,
 * maps backend response records to tile formats, and renders the ElectionGroupsTable.
 */
function RouteComponent() {
  const { partyShortName } = Route.useParams();
  const { party } = useUserParty();
  const partyId = party?.id;

  const { data: rawData, isLoading } = useQuery({
    queryKey: ["election-groups"],
    queryFn: async () => {
      const res = await getElectionGroups({
        data: { limit: 100 },
      });
      if (res && res.success && res.data) {
        return res;
      }
      throw new Error(res?.message || "Failed to fetch election groups");
    },
    enabled: partyId !== undefined,
    staleTime: Infinity,
  });

  const electionGroups: ElectionGroupType[] = rawData?.data?.election_groups ?? [];

  return (
    <Layout>
      <PageHeader
        title="Elections"
        activeTab="groups"
        tabs={getElectionTabs(partyShortName)}
      />
      <PageSearchLayer rightComponent={<FilterButton />} />

      {isLoading && electionGroups.length === 0 ? (
        <div className="py-12 text-center text-c-50 text-[15px]">
          Loading election groups...
        </div>
      ) : (
        <ElectionGroupsTable items={electionGroups} />
      )}
    </Layout>
  );
}
