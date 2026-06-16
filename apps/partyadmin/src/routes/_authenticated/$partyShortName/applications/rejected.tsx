import {
  Layout,
  PageHeader,
  PageSearchLayer,
} from "@repo/ui/components/custom/AdminLayouts";
import { ApplicationsTable } from "#/components/Tables";
import { getPageHeader } from "#/lib/shared/meta";
import { createFileRoute } from "@tanstack/react-router";
import { APPLICATION_TABS, rejectedApplications } from "./dummy_data";
import { ApplicationsActions } from "#/components/applications/ApplicationsActions";

export const Route = createFileRoute("/_authenticated/$partyShortName/applications/rejected")({
  head: () => getPageHeader({ title: "Applications" }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Layout>
      <PageHeader
        title="Applications"
        activeTab="rejected"
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

      <ApplicationsTable items={rejectedApplications} />
    </Layout>
  );
}
