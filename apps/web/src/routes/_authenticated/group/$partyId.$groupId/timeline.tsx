import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute(
  "/_authenticated/group/$partyId/$groupId/timeline",
)({
  component: CampaignGroupTimelineTabComponent,
});

function CampaignGroupTimelineTabComponent() {
  return (
    <div className="py-16 text-center rounded-3xl border border-dashed border-border/60 bg-card/40 p-8 space-y-3">
      <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
        <Sparkles className="size-6" />
      </div>
      <h3 className="text-lg font-bold text-foreground">
        Campaign Situation Timeline
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Broadcast messages, rally announcements, and strategy directives for this campaign unit will appear here.
      </p>
      <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
        Module Configured in Schema &bull; Ready for Phase 2
      </span>
    </div>
  );
}
