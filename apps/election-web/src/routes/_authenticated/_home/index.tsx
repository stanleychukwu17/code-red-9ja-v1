import { useElection } from "#/hooks/useElection";
import { useAssignments } from "#/hooks/useAssignments";
import { useElectionRealtime } from "@repo/ui/hooks/useElectionRealtime";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { APP_URL } from "#/lib/config";
import { AssignmentRoleCard } from "./components/AssignmentRoleCard";
import { DesignationCard } from "./components/DesignationCard";
import { EarningsTab } from "./components/EarningsTab";
import { GiveUpdateFloatingButton } from "./components/GiveUpdateFloatingButton";
import { HomeHeader } from "./components/HomeHeader";
import { PracticeTestComingSoonCard } from "./components/PracticeTestCard";
import { ReferralCard } from "./components/ReferralCard";
import { UnderYourWatchCard } from "./components/UnderYourWatchCard";
import { UpdateReminderCard } from "./components/UpdateReminderCard";
import { GeneralPage } from "./page-components/GeneralPage";
import { LGAElectionSupervisorPage } from "./page-components/LGAElectionSupervisorPage";
import { PollingAgentPage } from "./page-components/PollingAgentPage";
import { StateElectionSupervisorPage } from "./page-components/StateElectionSupervisorPage";
import { WardElectionSupervisorPage } from "./page-components/WardElectionSupervisorPage";
import { getPageHeader } from "#/lib/shared/meta";
import { Separator } from "#/components/separator/Separator";

/**
 * Route definition for authenticated dashboard home (`/_authenticated/_home/`).
 */
export const Route = createFileRoute("/_authenticated/_home/")({
  head: () => getPageHeader({ title: "Home" }),
  component: RouteComponent,
});

/**
 * Dashboard Home Route Orchestrator.
 *
 * Dynamically renders the appropriate dashboard view based on the user's role:
 * 1. State Supervisor (`StateElectionSupervisorPage`)
 * 2. LGA Supervisor (`LGAElectionSupervisorPage`)
 * 3. Ward Supervisor (`WardElectionSupervisorPage`)
 * 4. Polling Unit Agent (`PollingAgentPage`)
 * 5. General Citizen / Voter (`GeneralPage`)
 *
 * Also initiates real-time WebSocket subscriptions via Pusher for live
 * election results, incident alerts, and agent status broadcasts.
 */
function RouteComponent() {
  const navigate = useNavigate();
  const { supervisorAssignment, pollingUnitAssignment, elections } = useAssignments();
  const { selectedElection, daysLeft, electionDay } = useElection();

  // Connect real-time WebSocket updates for election supervisor & voter dashboard
  useElectionRealtime({
    electionId: selectedElection?.id,
    stateId:
      supervisorAssignment?.data?.state_id ??
      pollingUnitAssignment?.state_id,
    lgaId:
      supervisorAssignment?.data?.lga_id ?? pollingUnitAssignment?.lga_id,
    wardId:
      supervisorAssignment?.data?.ward_id ??
      pollingUnitAssignment?.ward_id,
    pollingUnitId: pollingUnitAssignment?.polling_unit_id,
    clientConfig: {
      key: import.meta.env.VITE_PUSHER_KEY,
      cluster: import.meta.env.VITE_PUSHER_CLUSTER || "eu",
    },
  });

  let content = <GeneralPage />;
  let roleLabel: string | null = null;

  // Branch 1: Regional Supervisors (State, LGA, or Ward)
  if (supervisorAssignment) {
    if (supervisorAssignment.type === "state") {
      content = <StateElectionSupervisorPage />;
      roleLabel = "State Supervisor";
    } else if (supervisorAssignment.type === "lga") {
      content = <LGAElectionSupervisorPage />;
      roleLabel = "LGA Supervisor";
    } else if (supervisorAssignment.type === "ward") {
      content = <WardElectionSupervisorPage />;
      roleLabel = "Ward Supervisor";
    }
  } else if (pollingUnitAssignment) {
    content = <PollingAgentPage />;
    roleLabel = "Polling-unit Agent";
  }

  return (
    <>
      {/* Top welcome header and election day countdown */}
      < HomeHeader daysLeft={daysLeft} />
      <main className="w-full max-w-125 min-h-screen flex flex-col px-4 mb-30">

        {/* Active duty role badge (only shown when user has an assignment) */}
        {roleLabel && (
          <>
            <AssignmentRoleCard roleLabel={roleLabel} />
            <Separator />
          </>
        )}

        {/* Update posting reminder and quick-action button (election day only) */}
        {roleLabel && electionDay && (
          <>
            <UpdateReminderCard />
            <Separator />
          </>
        )}

        {/* Assigned geographic designation (State, LGA, Ward, PU) */}
        {roleLabel && (
          <>
            <DesignationCard />
            <Separator />
          </>
        )}

        {/* Summary of PUs / wards / LGAs under the user's watch */}
        {elections.length > 0 && (
          <>
            <UnderYourWatchCard />
            <Separator />
          </>
        )}

        {/* Role-specific dashboard body */}
        {content}
        {/* Pre-election cards (referrals & practice test) */}
        {!electionDay && (
          <>
            <ReferralCard onClick={() => navigate({ to: APP_URL.referrals })} />
            <Separator />
            <PracticeTestComingSoonCard />
          </>
        )}

        {roleLabel && <EarningsTab />}

        {/* Quick situation update FAB on election day / grace window */}
        {electionDay && (
          <GiveUpdateFloatingButton
            onClick={() => navigate({ to: APP_URL.giveUpdate })}
          />
        )}
      </main>
    </>
  );
}
