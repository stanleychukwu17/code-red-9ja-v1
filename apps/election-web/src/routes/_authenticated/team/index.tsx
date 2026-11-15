import { createFileRoute } from "@tanstack/react-router";
import { PageWrapper } from "#/components/Wrappers";
import { PageHeader } from "#/components/Headers";
import { getPageHeader } from "#/lib/shared/meta";

export const Route = createFileRoute("/_authenticated/team/")({
  head: () => getPageHeader({ title: "Your Team" }),
  component: TeamPage,
});

function TeamPage() {
  return (
    <PageWrapper>
      <div className="flex flex-col flex-1 pb-24 px-4">
        <PageHeader title="Your Team" hideBackButton />
        <div className="flex flex-col items-center justify-center flex-1 py-12 text-center text-c-60">
          <p className="text-base font-medium">Your Team</p>
          <p className="text-sm text-c-40 mt-1">Manage and view your election team members.</p>
        </div>
      </div>
    </PageWrapper>
  );
}
