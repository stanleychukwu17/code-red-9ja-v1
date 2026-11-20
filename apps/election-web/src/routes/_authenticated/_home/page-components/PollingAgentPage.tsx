import { useElection } from "#/hooks/useElection";
import { useAssignments } from "#/hooks/useAssignments";
import { Button } from "@repo/ui/components/button";
import { ObjectiveCardWrapper, ObjectiveTile } from "@repo/ui/components/cards/objective-tile";
import { Carousel, CarouselContent, CarouselItem } from "@repo/ui/components/carousel";
import ReportIcon from "@repo/ui/icons/report-icon";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ReferralCard } from "../components/ReferralCard";
import { ArrivalCard } from "../components/ArrivalCard";
import { ArrivalDrawer } from "../components/ArrivalDrawer";
import { EarningsTab } from "../components/EarningsTab";
import { ElectionStatusCard } from "../components/ElectionStatusCard";
import { HomeHeader, HomeHeader2 } from "../components/HomeHeader";
import { PracticeTestComingSoonCard } from "../components/PracticeTestCard";
import { RequestPayoutCard } from "../components/RequestPayoutCard";
import { UploadResultCard } from "../components/UploadResultCard";
import { GiveUpdateFloatingButton } from "../components/GiveUpdateFloatingButton";
import { ElectionUpdatesProgressCard } from "../components/ElectionUpdatesProgressCard";
import { HomeBody } from "../components/Shared";
import { Layout } from "@repo/ui/components/custom/AdminLayouts";

// Development bypass flag: ignores 2PM/4PM constraints for local UI testing
const BYPASS_TIME_CONSTRAINTS = process.env.NODE_ENV === "development";

/**
 * Polling Unit Agent Dashboard.
 *
 * The primary operational view for accredited party polling agents on election day
 * and in pre-election preparation:
 *
 * 1. Preparation Phase (days before election):
 *    - Displays readiness checkpoints (practice tests, training drills).
 *    - Offers referral links, supervisor applications, and party contacts.
 *
 * 2. Election Day Phase (sequential workflow state machine):
 *    - Arrival: Agent confirms arrival at polling unit (`ArrivalCard` / `ArrivalDrawer`).
 *    - Accreditation/Start: Records official poll opening time (`ElectionStatusCard(false)`).
 *    - Live Monitoring: Submits 30-minute situation updates (`GiveUpdateFloatingButton`).
 *    - Result Upload: After 2:00 PM, captures verified INEC Form EC8A (`UploadResultCard`).
 *    - Poll Close: After 4:00 PM and result submission, confirms end of voting (`ElectionStatusCard(true)`).
 *    - Payout Request: Agent submits duties for party admin review (`RequestPayoutCard`).
 */
export function PollingAgentPage() {
  const navigate = useNavigate();

  const { selectedElectionGroup, selectedElection, daysLeft, diffDays } = useElection();
  const { pollingUnitAssignment: currentPollingUnitAssignment } = useAssignments();

  // Submits duty compensation request to party administration upon task completion
  const handleRequestPayout = async () => {
    if (!currentPollingUnitAssignment?.election_group_id) {
      toast.error("Election group assignment not found");
      return;
    }
    try {
      const response = await fetch("/api/v1/agent-earnings/request-payout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          election_group_id: currentPollingUnitAssignment.election_group_id,
          role_type: currentPollingUnitAssignment.role_type || "polling_agent",
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to submit payout request");
      }
      toast.success(
        "Payout request submitted successfully! Your party admin will review your duties.",
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to request payout");
    }
  };

  // Check if agent has successfully submitted election results
  const resultsUploaded = !!currentPollingUnitAssignment?.completed_at;

  // Time-gated constraints: Result uploads unlock at 2PM, election end unlocks at 4PM
  const currentHour = new Date().getHours();
  const isAfter2PM = currentHour >= 14 || BYPASS_TIME_CONSTRAINTS;
  const isAfter4PM = currentHour >= 16 || BYPASS_TIME_CONSTRAINTS;

  const [isArrivalDrawerOpen, setIsArrivalDrawerOpen] = useState(false);
  const [showNoInfo, setShowNoInfo] = useState(false);
  // Checklist of core polling agent duties on election day
  const objectives = [
    {
      title: "Go to your polling unit & click I've arrived",
      isCompleted: !!currentPollingUnitAssignment?.arrived_at,
    },
    {
      title: "Enter time when election started",
      isCompleted: !!currentPollingUnitAssignment?.election_started_at,
    },
    {
      title: "Give updates every 30minutes (7AM - 5PM)",
      isCompleted: !!(
        currentPollingUnitAssignment?.updates_count &&
        currentPollingUnitAssignment.updates_count > 0
      ),
    },
    {
      title: "Upload final vote result",
      isCompleted: !!currentPollingUnitAssignment?.completed_at,
    },
    {
      title: "Enter time when election ended",
      isCompleted: !!currentPollingUnitAssignment?.election_ended_at,
    },
  ];

  // Derive header title and completion percentage
  const completed = objectives.filter((o) => o.isCompleted).length;
  const headerTitle = "Objectives";
  const headerRightText = `${Math.round((completed / Math.max(objectives.length, 1)) * 100)}%`;

  return (
    <Layout>
      <HomeHeader daysLeft={daysLeft} />
      <HomeHeader2 title={headerTitle} rightText={headerRightText} />

      {/* Primary Checklist: Objectives */}
      <Carousel className="w-full">
        <CarouselContent>
          <CarouselItem>
            <ObjectiveCardWrapper className="mx-2.5">
              {objectives.map((item) => (
                <ObjectiveTile
                  key={item.title}
                  isCompleted={item.isCompleted}
                  title={item.title}
                  onClick={() =>
                    navigate({
                      to: "/give-update",
                      search: { isReport: true },
                    })
                  }
                />
              ))}
              {diffDays === 0 && (
                <div className="mb-2 mt-2 px-4">
                  <Button
                    type="button"
                    size="extra-large"
                    onClick={() =>
                      navigate({
                        to: "/give-update",
                        search: { isReport: true },
                      })
                    }
                    className="w-full bg-[#2D2D2D] hover:bg-[#3D3D3D] active:bg-[#202020] text-white rounded-12"
                  >
                    <ReportIcon className="w-5 h-5 shrink-0" />
                    Report
                  </Button>
                </div>
              )}
            </ObjectiveCardWrapper>
          </CarouselItem>
        </CarouselContent>
      </Carousel>

      {/* Main Action Flow Body */}
      <HomeBody>
        {/* Stage 1: Arrival Check-in (Prompted on election day if not yet confirmed) */}
        {daysLeft === 0 &&
          currentPollingUnitAssignment &&
          !currentPollingUnitAssignment.arrived_at && (
            <ArrivalCard
              onArrivedClick={() => {
                setShowNoInfo(false);
                setIsArrivalDrawerOpen(true);
              }}
            />
          )}

        {/* Stage 2-4: Start Election, Upload Results, and End Election Workflow */}
        {currentPollingUnitAssignment && currentPollingUnitAssignment.arrived_at &&
          !currentPollingUnitAssignment.election_ended_at && (
            <>
              {/* Show Start Election card if election hasn't started */}
              {!currentPollingUnitAssignment.election_started_at && (
                <ElectionStatusCard
                  hasStarted={false}
                  onStartClick={() => {
                    if (currentPollingUnitAssignment.id) {
                      navigate({
                        to: "/election-start",
                        search: {
                          assignmentId: currentPollingUnitAssignment.id,
                        } as any,
                      });
                    } else {
                      navigate({ to: "/election-start" });
                    }
                  }}
                />
              )}

              {/* Show End Election card ONLY if started, results uploaded, and after 4pm (or bypass) */}
              {currentPollingUnitAssignment.election_started_at &&
                resultsUploaded &&
                isAfter4PM && (
                  <ElectionStatusCard
                    hasStarted={true}
                    onEndClick={() => {
                      if (currentPollingUnitAssignment.id) {
                        navigate({
                          to: "/election-end",
                          search: {
                            assignmentId: currentPollingUnitAssignment.id,
                          } as any,
                        });
                      } else {
                        navigate({ to: "/election-end" });
                      }
                    }}
                  />
                )}

              {/* Show Upload Result card if started, results NOT uploaded yet, and after 2pm (or bypass) */}
              {currentPollingUnitAssignment.election_started_at &&
                !resultsUploaded &&
                isAfter2PM && (
                  <UploadResultCard
                    onClick={() => navigate({ to: "/upload-result" })}
                  />
                )}

              {/* Periodic Situation Updates Progress & Interval Tracker */}
              <ElectionUpdatesProgressCard
                assignment={currentPollingUnitAssignment}
                onPostUpdateClick={() => navigate({ to: "/give-update" })}
              />
            </>
          )}

        {/* Post-Election Stage: Final result verification and duty payout request */}
        {currentPollingUnitAssignment &&
          currentPollingUnitAssignment.election_ended_at && (
            <>
              <UploadResultCard
                onClick={() => navigate({ to: "/upload-result" })}
              />
              <RequestPayoutCard onClick={handleRequestPayout} />
            </>
          )}

        {/* Pre-election cards: referral bonuses, practice test */}
        <ReferralCard onClick={() => navigate({ to: "/referrals" })} />
        {daysLeft !== undefined && daysLeft !== 0 && <PracticeTestComingSoonCard />}

        {/* Duty earnings summary */}
        <EarningsTab />
      </HomeBody>

      {/* Arrival check-in drawer */}
      <ArrivalDrawer
        isOpen={isArrivalDrawerOpen}
        onOpenChange={setIsArrivalDrawerOpen}
        showNoInfo={showNoInfo}
        onNoClick={() => setShowNoInfo(true)}
        onYesClick={() => {
          if (currentPollingUnitAssignment?.id) {
            navigate({
              to: "/arrival",
              search: { assignmentId: currentPollingUnitAssignment.id } as any,
            });
          } else {
            navigate({ to: "/arrival" });
          }
        }}
        onDismiss={() => setIsArrivalDrawerOpen(false)}
        electionDate={selectedElectionGroup?.election_date}
      />

      {/* Quick situation reporting FAB on election day */}
      {diffDays === 0 && (
        <GiveUpdateFloatingButton
          onClick={() => navigate({ to: "/give-update" })}
        />
      )}
    </Layout>
  );
}
