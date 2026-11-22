import { getPageHeader } from "#/lib/shared/meta";
import { PageHeader } from "#/components/Headers";
import { PageWrapper } from "#/components/Wrappers";
import { HeaderAccent } from "@repo/ui/components/header-accent";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Radio } from "lucide-react";

export const Route = createFileRoute("/_authenticated/field-updates/")({
  head: () => getPageHeader({ title: "Field Updates" }),
  component: FieldUpdatesPage,
});

function FieldUpdatesPage() {
  const navigate = useNavigate();

  return (
    <PageWrapper>
      <PageHeader onBackClick={() => navigate({ to: "/" })} />
      <div className="px-4 py-2 space-y-6 max-w-2xl md:min-w-200 mx-auto">
        <HeaderAccent
          as="h1"
          title="Field updates"
          titleClassName="text-3xl font-extrabold tracking-tight text-foreground"
          accentClassName="top-6 h-3 w-44"
        />

        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
          <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Radio className="size-6" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            Field updates feed coming soon
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Live situation reports from polling agents and supervisors will appear here.
          </p>
        </div>
      </div>
    </PageWrapper>
  );
}
