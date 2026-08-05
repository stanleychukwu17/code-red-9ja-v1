import { StickyFooter } from "#/components/Footers";
import { useAuth } from "#/hooks/useAuth";
import { submitDidNotVote } from "#/lib/server/elections";
import { Button } from "@repo/ui/components/button";
import { FancyTextarea } from "@repo/ui/components/input";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../../../components/Headers";

export interface NotVotingReasonSearch {
  reasonId?: number;
}

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

function NotVotingReasonPage() {
  const navigate = useNavigate();
  const { reasonId } = Route.useSearch();
  const { selectedElectionGroup } = useAuth();
  const [explanation, setExplanation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedElectionGroup?.id) {
      toast.error("Election group not found");
      return;
    }

    try {
      setIsSubmitting(true);
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
      <PageHeader title="" onBackClick={() => navigate({ to: "/" })} />

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
