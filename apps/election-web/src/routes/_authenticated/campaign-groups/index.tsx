import { createFileRoute } from "@tanstack/react-router";
import { PageWrapper } from "#/components/Wrappers";
import { PageHeader } from "#/components/Headers";
import { getPageHeader } from "#/lib/shared/meta";

export const Route = createFileRoute("/_authenticated/campaign-groups/")({
  head: () => getPageHeader({ title: "Campaign Groups" }),
  component: CampaignGroupsPage,
});

function CampaignGroupsPage() {
  return (
    <PageWrapper>
      <div className="flex flex-col flex-1 pb-24 px-4">
        <PageHeader title="Campaign Groups" hideBackButton />
        <div className="flex flex-col items-center justify-center flex-1 py-12 text-center text-c-60">
          <p className="text-base font-medium">Campaign Groups</p>
          <p className="text-sm text-c-40 mt-1">Connect and coordinate with campaign group members.</p>
        </div>
      </div>
    </PageWrapper>
  );
}
