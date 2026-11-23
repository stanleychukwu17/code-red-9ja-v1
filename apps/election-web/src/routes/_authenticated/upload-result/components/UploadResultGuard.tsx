import { CalendarClock, Loader2 } from "lucide-react";
import { PageHeader } from "#/components/Headers";
import { PageWrapper } from "#/components/Wrappers";
import { Button } from "@repo/ui/components/button";

export function NoActiveElectionGroup() {
  return (
    <div className="p-8 text-center text-neutral-500">
      No active election group.
    </div>
  );
}

export function ResultUploadUnavailable({ onBack }: { onBack: () => void }) {
  return (
    <PageWrapper>
      <PageHeader onBackClick={onBack} />
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center max-w-md mx-auto space-y-4">
        <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <CalendarClock className="size-6" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-foreground">
            Result Upload Unavailable
          </h2>
          <p className="text-sm text-muted-foreground">
            You can only upload election results on election day.
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back to Home
        </Button>
      </div>
    </PageWrapper>
  );
}

export function AssignmentsLoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
    </div>
  );
}

export function NoEligibleElections({ onBack }: { onBack: () => void }) {
  return (
    <PageWrapper>
      <PageHeader onBackClick={onBack} />
      <div className="p-8 text-center text-neutral-500">
        No eligible elections found under your watch.
      </div>
    </PageWrapper>
  );
}
