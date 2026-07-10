import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SupervisorHeader } from "./components/-SupervisorHeader";
import { PageWrapper } from "#/components/Wrappers";
import { SupervisorMetricsCard } from "./components/-SupervisorMetricsCard";
import { SupervisorActionCard } from "./components/-SupervisorActionCard";
import { SupervisorTabs } from "./components/-SupervisorTabs";
import { EarningsTab } from "./components/-EarningsTab";
import { ObjectivesTab } from "./components/-ObjectivesTab";

export const Route = createFileRoute("/_authenticated/supervisor/")({
  component: SupervisorPage,
});

function SupervisorPage() {
  const [activeTab, setActiveTab] = useState<"Earnings" | "Objectives">(
    "Objectives",
  );
  // Toggle this state to simulate different supervisor modes
  const [isReadyToStart, setIsReadyToStart] = useState<boolean>(true);

  return (
    <div className="w-full min-h-screen px-4 pb-20">
      <div className="w-full max-w-[440px] flex flex-col gap-4 mx-auto">
        <SupervisorHeader />

        <SupervisorMetricsCard />

        <SupervisorActionCard
          isReadyToStart={isReadyToStart}
          onArrive={() => setIsReadyToStart(false)}
          onCallAgents={() => console.log("Calling agents...")}
        />

        <SupervisorTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === "Earnings" && <EarningsTab />}
        {activeTab === "Objectives" && <ObjectivesTab />}
      </div>
    </div>
  );
}
