import { useElection } from "#/hooks/useElection";
import { useAssignments } from "#/hooks/useAssignments";
import { useElectionRealtime } from "@repo/ui/hooks/useElectionRealtime";
import { createFileRoute } from "@tanstack/react-router";
import { AssignmentRoleCard } from "./components/AssignmentRoleCard";
import { HomeHeader } from "./components/HomeHeader";
import { UnderYourWatchCard } from "./components/UnderYourWatchCard";
import { GeneralPage } from "./page-components/GeneralPage";
import { LGAElectionSupervisorPage } from "./page-components/LGAElectionSupervisorPage";
import { PollingAgentPage } from "./page-components/PollingAgentPage";
import { StateElectionSupervisorPage } from "./page-components/StateElectionSupervisorPage";
import { WardElectionSupervisorPage } from "./page-components/WardElectionSupervisorPage";
import { getPageHeader } from "#/lib/shared/meta";
import { Separator } from "#/components/Separator";

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
  const { supervisorAssignment, pollingUnitAssignment } = useAssignments();
  const { selectedElection, daysLeft } = useElection();

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
    <main className="w-full min-h-screen flex flex-col">
      <HomeHeader daysLeft={daysLeft} />
      {roleLabel && <AssignmentRoleCard roleLabel={roleLabel} />}
      <Separator />
      <UnderYourWatchCard />
      {content}
    </main>
  );
}
