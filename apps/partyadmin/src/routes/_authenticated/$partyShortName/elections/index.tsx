import {
  FilterButton,
  Layout,
  PageHeader,
  PageSearchLayer,
  type PageHeaderTabProps,
} from "@repo/ui/components/custom/AdminLayouts";
import { ElectionGroupsTable } from "#/components/Tables";
import { getPageHeader } from "#/lib/shared/meta";
import { createFileRoute } from "@tanstack/react-router";
import { ELECTION_TABS } from "./data";
import { electionGroups } from "./dummy_data";

export const Route = createFileRoute("/_authenticated/$partyShortName/elections/")({
  head: () => getPageHeader({ title: "Elections" }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Layout>
      <PageHeader title="Elections" activeTab="groups" tabs={ELECTION_TABS} />
      <PageSearchLayer rightComponent={<FilterButton />} />

      <ElectionGroupsTable items={electionGroups} />
    </Layout>
  );
}
