import { StickyFooter } from "#/components/Footers";
import { useElection } from "#/hooks/useElection";
import { submitDidNotVote } from "#/lib/server/elections";
import { Button } from "@repo/ui/components/button";
import { FancyTextarea } from "@repo/ui/components/input";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/Headers";

/**
 * Search parameters accepted by the `/not-voting-reason` route.
 */
export interface NotVotingReasonSearch {
  /** Optional ID of the categorical non-voting reason selected from the preceding drawer */
  reasonId?: number;
}

/**
 * Route definition for the non-voting explanation submission screen.
 * Validates and parses the `reasonId` search query parameter.
 */
export const Route = createFileRoute("/_authenticated/_home/not-voting-reason")(
  {
    component: NotVotingReasonPage,
    validateSearch: (
      search: Record<string, unknown>,
    ): NotVotingReasonSearch => {
      return {
        reasonId: search.reasonId ? Number(search.reasonId) : undefined,
      };
    },
  },
);

/**
 * Page component that allows citizens/agents to provide specific,
 * free-form feedback detailing why they were unable or chose not to vote.
 */
function NotVotingReasonPage() {
  const navigate = useNavigate();

  // Extract selected reason ID from query params
  const { reasonId } = Route.useSearch();

  // Access current active election group
  const { selectedElectionGroup } = useElection();

  // Local state for user's text explanation and submission progress
  const [explanation, setExplanation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Submits the non-voting feedback to the server and redirects to home on success.
   */
  const handleSubmit = async () => {
    // Ensure an election group is active
    if (!selectedElectionGroup?.id) {
      toast.error("Election group not found");
      return;
    }

    try {
      setIsSubmitting(true);
      // Persist the reason category and detailed qualitative explanation
      await submitDidNotVote({
        data: {
          election_group_id: selectedElectionGroup.id,
          non_voting_reason_id: reasonId,
          explanation: explanation,
        },
      });

      toast.success("Thank you for letting us know.");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit reason");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-white flex flex-col">
      {/* Navigation header with back button returning to the home screen */}
      <PageHeader title="" onBackClick={() => navigate({ to: "/" })} />

      {/* Main feedback form */}
      <div className="px-4 pt-2 flex-1 flex flex-col">
        <h1 className="text-2xl font-bold text-neutral-900 mb-6">
          Tell us specifically why you did not vote?
        </h1>
        <FancyTextarea
          value={explanation}
          className="bg-c-5 px-4 py-3 min-h-40 focus-within:ring-c-80 focus-within:ring-1 focus-within:hover:ring-c-80"
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Tell us more..."
        />
      </div>

      {/* Sticky footer with action button, disabled until explanation is entered */}
      <StickyFooter>
        <Button
          type="button"
          variant="secondary"
          size="4xl"
          disabled={!explanation.trim() || isSubmitting}
          onClick={handleSubmit}
        >
          Submit
        </Button>
      </StickyFooter>
    </div>
  );
}
