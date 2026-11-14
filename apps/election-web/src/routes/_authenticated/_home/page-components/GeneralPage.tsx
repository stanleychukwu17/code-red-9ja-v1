import { useElection } from "#/hooks/useElection";
import { useNavigate } from "@tanstack/react-router";
import { ApplicationsCard } from "../components/ApplicationsCard";
import { GiveUpdateFloatingButton } from "../components/GiveUpdateFloatingButton";
import { HomeHeader } from "../components/HomeHeader";
import { PracticeTestCard } from "../components/PracticeTestCard";
import { ReferralCard } from "../components/ReferralCard";
import { HomeBody } from "../components/Shared";
import { UploadResultCard } from "../components/UploadResultCard";
import { Layout } from "@repo/ui/components/custom/AdminLayouts";

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
    <Layout>
      <HomeHeader daysLeft={daysLeft} />

      {/* Action Cards Body */}
      <HomeBody>
        {/* On election day: permit citizens to crowd-source EC8A result sheets */}
        {daysLeft === 0 && (
          <UploadResultCard
            onClick={() => navigate({ to: "/upload-result" })}
          />
        )}

        {/* Opportunity to apply as an accredited party supervisor or agent */}
        <ApplicationsCard />

        {/* Citizen referral recruitment card */}
        <ReferralCard onClick={() => navigate({ to: "/referrals" })} />

        {/* Practice voting test */}
        <PracticeTestCard />

        {/* Quick incident report FAB on election day */}
        {daysLeft === 0 && (
          <GiveUpdateFloatingButton
            onClick={() => navigate({ to: "/give-update" })}
          />
        )}
      </HomeBody>
    </Layout>
  );
}
