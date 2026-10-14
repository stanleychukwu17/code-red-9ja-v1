import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useState } from "react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import {
  ElectionGroupsTable,
  type ElectionGroupType,
} from "#/components/Tables";
import { ELECTION_TABS } from "./-data";
import { ElectionGroupFormDialog } from "#/components/dialogs/ElectionGroupFormDialog";
import { getElectionGroups } from "#/lib/server/election_groups";
import { useQuery } from "@tanstack/react-query";

// Define the route for /elections under the _authenticated layout
export const Route = createFileRoute("/_authenticated/elections/")({
  head: () => getPageHeader({ title: "Elections" }),
  component: RouteComponent,
});

function RouteComponent() {
  // State for toggling the "Create New Election Group" modal dialog
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Fetch election groups with standard query and infinite staleTime
  const { data, isLoading } = useQuery({
    queryKey: ["election-groups"],
    queryFn: async () => {
      const res = await getElectionGroups({
        data: { limit: 100, orderBy: "election_date", order: "DESC" },
      });
      if (res && res.success && res.data) {
        return res.data.election_groups ?? [];
      }
      throw new Error(res?.message || "Failed to fetch election groups");
    },
    staleTime: Infinity,
  });

  const electionGroups: ElectionGroupType[] = data ?? [];

  return (
    <Layout>
      {/* Header with page title and sub-navigation tabs (Groups, Instances, Offices) */}
      <PageHeader title="Elections" activeTab="groups" tabs={ELECTION_TABS} />

      {/* Top action toolbar: filter options and "Add" button to open creation dialog */}
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
            <AddButton onClick={() => setIsAddOpen(true)} />
          </>
        }
      />

      {/* Table view: initial loading spinner or populated election groups table */}
      {isLoading && electionGroups.length === 0 ? (
        <div className="py-12 text-center text-c-50 text-[15px]">
          Loading election groups...
        </div>
      ) : (
        <ElectionGroupsTable items={electionGroups} />
      )}

      {/* Dialog for creating a new election group */}
      <ElectionGroupFormDialog
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </Layout>
  );
}
