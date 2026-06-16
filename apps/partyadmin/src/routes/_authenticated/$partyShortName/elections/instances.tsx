import { createFileRoute } from "@tanstack/react-router";
import { Avatar, AvatarImage } from "@repo/ui/components/avatar";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { getPageHeader } from "#/lib/shared/meta";
import { ElectionInstancesTable } from "#/components/Tables";
import { ELECTION_TABS } from "./data";
import { electionInstances } from "./dummy_data";

export const Route = createFileRoute("/_authenticated/$partyShortName/elections/instances")({
  head: () => getPageHeader({ title: "Election Instances" }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Layout>
      <PageHeader
        title="Elections"
        activeTab="instances"
        tabs={ELECTION_TABS}
      />
      <PageSearchLayer rightComponent={<FilterButton />} />

      <ElectionInstancesTable items={electionInstances} />
    </Layout>
  );
}
