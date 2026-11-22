import { getPageHeader } from "#/lib/shared/meta";
import { PageHeader } from "#/components/Headers";
import { PageWrapper } from "#/components/Wrappers";
import { HeaderAccent } from "@repo/ui/components/header-accent";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/field-issues/")({
  head: () => getPageHeader({ title: "Field Issues" }),
  component: FieldIssuesPage,
});

function FieldIssuesPage() {
  const navigate = useNavigate();

  return (
    <PageWrapper>
      <PageHeader onBackClick={() => navigate({ to: "/" })} />
      <div className="px-4 py-2 space-y-6 max-w-2xl md:min-w-200 mx-auto">
        <HeaderAccent
          as="h1"
          title="Field issues"
          titleClassName="text-3xl font-extrabold tracking-tight text-foreground"
          accentClassName="top-6 h-3 w-44"
        />

        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
          <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="size-6" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            Field issues tracker coming soon
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Active and resolved incidents reported in the field will appear here.
          </p>
        </div>
      </div>
    </PageWrapper>
  );
}
