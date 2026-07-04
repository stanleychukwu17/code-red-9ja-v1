import { useAppSelector } from "#/redux/hooks";
import { useAuth } from "#/providers/providers";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPollingUnitAssignments } from "#/lib/server/polling_unit_assignments";
import { getApplications } from "#/lib/server/applications";
import { HomeHeader } from "./components/HomeHeader";
import { LeaderboardCard } from "./components/LeaderboardCard";
import { AgentCard } from "./components/AgentCard";
import { ArrivalCard } from "./components/ArrivalCard";
import { ElectionStatusCard } from "./components/ElectionStatusCard";
import { HomeTabs } from "../../../components/Tabs";
import { FinalResultCard } from "./components/FinalResultCard";
import { ObjectivesTab } from "./components/ObjectivesTab";
import { ContactPartyTab } from "./components/ContactPartyTab";
import { UploadsTab } from "./components/UploadsTab";
import { ArrivalDrawer } from "./components/ArrivalDrawer";
import PlusIcon from "@repo/ui/icons/plus-icon";
import { Button } from "@repo/ui/components/button";

export const Route = createFileRoute("/_authenticated/home/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { user, selectedElectionGroup, selectedElection, pollingUnitId } =
    useAuth();
  console.log("HOME: USE AUTH:", {
    user,
    selectedElectionGroup,
    selectedElection,
    pollingUnitId,
  });

  const [appCount, setAppCount] = useState<number>(0);
  const [primaryPU, setPrimaryPU] = useState<string>(
    "UNG. MAIKANO/KOFAR MAI ...",
  );
  const [primaryState, setPrimaryState] = useState<string>("Abuja");
  const [activeTab, setActiveTab] = useState<
    "Objectives" | "Contact Party" | "Uploads"
  >("Objectives");
  const [isArrivalDrawerOpen, setIsArrivalDrawerOpen] = useState(false);
  const [showNoInfo, setShowNoInfo] = useState(false);

  let daysLeft: number | undefined = undefined;
  if (selectedElectionGroup?.election_date) {
    const d = new Date(selectedElectionGroup.election_date);
    d.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffTime = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 0) {
      daysLeft = diffDays;
    }
  }

  const { data: assignmentsData, isLoading } = useQuery({
    queryKey: ["pollingUnitAssignments", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const res = await getPollingUnitAssignments({
        data: { user_id: user?.id },
      });
      if (!res || !res.success || !res.data?.assignments) {
        return [];
      }
      return res.data.assignments;
    },
  });

  const { data: applicationsData } = useQuery({
    queryKey: ["pollingAgentApplications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const res = await getApplications({ data: { user_id: user?.id } });
      if (!res || !res.success || !res.data?.applications) {
        return [];
      }
      return res.data.applications;
    },
  });

  // Compute current assignment based on selected election group
  const currentAssignment =
    selectedElectionGroup && assignmentsData
      ? assignmentsData.find(
          (a: any) => a.election_group_id === selectedElectionGroup.id,
        )
      : null;

  useEffect(() => {
    if (applicationsData) {
      setAppCount(applicationsData.length);
    } else {
      setAppCount(0);
    }

    if (currentAssignment) {
      const puName =
        currentAssignment.polling_unit_name ||
        currentAssignment.polling_unit?.name;
      const stateName = currentAssignment.state_name;
      if (puName) setPrimaryPU(puName);
      if (stateName) setPrimaryState(stateName);
    }
  }, [applicationsData, currentAssignment]);

  return (
    <div className="w-full min-h-screen px-4">
      <div className="w-full max-w-[440px] flex flex-col gap-6">
        <div>
          <HomeHeader daysLeft={daysLeft} />
          <LeaderboardCard electionId={selectedElection?.id} />
        </div>

        <AgentCard
          appCount={appCount}
          pollingUnit={primaryPU}
          state={primaryState}
        />

        <FinalResultCard electionId={selectedElection?.id} pollingUnitId={pollingUnitId} />

        {currentAssignment && !currentAssignment.arrived_at && (
          <ArrivalCard
            onArrivedClick={() => {
              setShowNoInfo(false);
              setIsArrivalDrawerOpen(true);
            }}
          />
        )}

        {currentAssignment &&
          currentAssignment.arrived_at &&
          !currentAssignment.election_ended_at && (
            <ElectionStatusCard
              hasStarted={!!currentAssignment.election_started_at}
              onStartClick={() => {
                if (currentAssignment.id) {
                  navigate({
                    to: "/election-start",
                    search: { assignmentId: currentAssignment.id } as any,
                  });
                } else {
                  navigate({ to: "/election-start" });
                }
              }}
              onEndClick={() => {
                if (currentAssignment.id) {
                  navigate({
                    to: "/election-end",
                    search: { assignmentId: currentAssignment.id } as any,
                  });
                } else {
                  navigate({ to: "/election-end" });
                }
              }}
            />
          )}

        <HomeTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === "Objectives" && <ObjectivesTab />}
        {activeTab === "Contact Party" && <ContactPartyTab />}
        {activeTab === "Uploads" && <UploadsTab />}
      </div>

      <ArrivalDrawer
        isOpen={isArrivalDrawerOpen}
        onOpenChange={setIsArrivalDrawerOpen}
        showNoInfo={showNoInfo}
        onNoClick={() => setShowNoInfo(true)}
        onYesClick={() => {
          if (currentAssignment?.id) {
            navigate({
              to: "/arrival/video",
              search: { assignmentId: currentAssignment.id } as any,
            });
          } else {
            navigate({ to: "/arrival/video" });
          }
        }}
        onDismiss={() => setIsArrivalDrawerOpen(false)}
        electionDate={selectedElectionGroup?.election_date}
      />

      {/* Floating Action Button */}
      <style>
        {`
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-4px); }
            100% { transform: translateY(0px); }
          }
        `}
      </style>
      <div className="fixed bottom-8 right-6 md:absolute flex flex-col items-center gap-1 z-50">
        <span
          className="font-black text-white text-sm tracking-wider"
          style={{
            animation: "float 2.5s ease-in-out infinite",
            textShadow: "0 0px 6px rgba(0,0,0,0.95)",
          }}
        >
          Give Update
        </span>
        <Button
          onClick={() => navigate({ to: "/give-update" })}
          variant="secondary"
          className="size-14 rounded-full flex items-center justify-center shadow-[0_2px_20px_rgba(0,0,0,0.30)] hover:bg-[#00C271] hover:scale-105 active:scale-95 transition-all"
        >
          <PlusIcon className="size-7 text-black/50" />
        </Button>
      </div>
    </div>
  );
}
