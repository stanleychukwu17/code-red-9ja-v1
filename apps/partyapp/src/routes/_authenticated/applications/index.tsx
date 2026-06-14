import {
  Layout,
  PageHeader,
  PageSearchLayer,
} from "@repo/ui/components/custom/AdminLayouts";
import { ApplicationsTable } from "#/components/Tables";
import { getPageHeader } from "#/lib/shared/meta";
import { createFileRoute } from "@tanstack/react-router";
import { APPLICATION_TABS, pendingApplications } from "./dummy_data";
import { ApplicationsActions } from "#/components/applications/ApplicationsActions";

export const Route = createFileRoute("/_authenticated/applications/")({
  head: () => getPageHeader({ title: "Applications" }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Layout>
      <PageHeader
        title="Applications"
        activeTab="pending"
        tabs={APPLICATION_TABS}
        rightComponent={
          <div className="text-[18px] text-[#6f6f6f]">
            <span className="font-semibold text-[#222]">10</span> slots
          </div>
        }
      />
      <PageSearchLayer
        ariaLabel="Search applications"
        placeholder="Search"
        rightComponent={<ApplicationsActions />}
      />

      <ApplicationsTable items={pendingApplications} />
    </Layout>
  );
}
