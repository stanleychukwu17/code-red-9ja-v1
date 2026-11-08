import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/group/$partyId/$groupId/issues",
)({
  component: CampaignGroupIssuesTabComponent,
});

function CampaignGroupIssuesTabComponent() {
  return (
    <div className="py-16 text-center rounded-3xl border border-dashed border-border/60 bg-card/40 p-8 space-y-3">
      <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
        <AlertTriangle className="size-6" />
      </div>
      <h3 className="text-lg font-bold text-foreground">
        Field Challenges & BVAS Incident Board
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Incident logs, BVAS failures, and polling unit irregularities tracked live on election day.
      </p>
      <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
        Module Configured in Schema &bull; Ready for Phase 2
      </span>
    </div>
  );
}
