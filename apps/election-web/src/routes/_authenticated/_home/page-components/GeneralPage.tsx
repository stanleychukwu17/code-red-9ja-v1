import { useElection } from "#/hooks/useElection";
import { useNavigate } from "@tanstack/react-router";
import { ApplicationsCard } from "../components/ApplicationsCard";
import { UploadResultCard } from "../components/UploadResultCard";

/**
 * General Citizen / Unassigned Voter Dashboard.
 *
 * Rendered for users who do not have an active polling agent or supervisor assignment.
 * Provides citizen engagement features:
 * - Election countdown and polling unit setup.
 * - Training practice tests and educational milestones.
 * - Live candidate leaderboard and election updates.
 * - Citizen result upload (`UploadResultCard`).
 * - Application call-to-action for becoming an accredited agent or supervisor.
 * - Viral voter referral link and reward tracking.
 */
export function GeneralPage() {
  const navigate = useNavigate();

  const { selectedElectionGroup, daysLeft } = useElection();

  return (
    <>
      {/* Action Cards Body */}
      <div className="flex flex-col gap-6 px-4 mt-5">
        {/* On election day: permit citizens to crowd-source EC8A result sheets */}
        {daysLeft === 0 && (
          <UploadResultCard
            onClick={() => navigate({ to: "/upload-result" })}
          />
        )}

        {/* Opportunity to apply as an accredited party supervisor or agent */}
        <ApplicationsCard />
      </div>
    </>
  );
}
