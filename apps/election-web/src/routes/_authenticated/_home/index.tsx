import { useAppContext } from "#/hooks/useAppContext";
import { useElectionRealtime } from "@repo/ui/hooks/useElectionRealtime";
import { createFileRoute } from "@tanstack/react-router";
import { GeneralPage } from "./page-components/GeneralPage";
import { LGAElectionSupervisorPage } from "./page-components/LGAElectionSupervisorPage";
import { PollingAgentPage } from "./page-components/PollingAgentPage";
import { StateElectionSupervisorPage } from "./page-components/StateElectionSupervisorPage";
import { WardElectionSupervisorPage } from "./page-components/WardElectionSupervisorPage";

export const Route = createFileRoute("/_authenticated/_home/")({
  component: RouteComponent,
});

function RouteComponent() {
  const {
    selectedElection,
    selectedSupervisorAssignment,
    selectedAssignment,
  } = useAppContext();

  // Connect real-time WebSocket updates for election supervisor & voter dashboard
  useElectionRealtime({
    electionId: selectedElection?.id,
    stateId:
      selectedSupervisorAssignment?.data?.state_id ??
      selectedAssignment?.state_id,
    lgaId:
      selectedSupervisorAssignment?.data?.lga_id ?? selectedAssignment?.lga_id,
    wardId:
      selectedSupervisorAssignment?.data?.ward_id ??
      selectedAssignment?.ward_id,
    pollingUnitId: selectedAssignment?.polling_unit_id,
    clientConfig: {
      key: import.meta.env.VITE_PUSHER_KEY,
      cluster: import.meta.env.VITE_PUSHER_CLUSTER || "eu",
    },
  });

  if (selectedSupervisorAssignment) {
    if (selectedSupervisorAssignment.type === "state") {
      return <StateElectionSupervisorPage />;
    }
    if (selectedSupervisorAssignment.type === "lga") {
      return <LGAElectionSupervisorPage />;
    }
    if (selectedSupervisorAssignment.type === "ward") {
      return <WardElectionSupervisorPage />;
    }
  }

  if (selectedAssignment) {
    return <PollingAgentPage />;
  }

  return <GeneralPage />;
}
