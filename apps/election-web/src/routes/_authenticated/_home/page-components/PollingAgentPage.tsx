import { useElection } from "#/hooks/useElection";
import { useAssignments } from "#/hooks/useAssignments";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ReferralCard } from "../components/ReferralCard";
import { EarningsTab } from "../components/EarningsTab";
import { ElectionStatusCard } from "../components/ElectionStatusCard";
import { PracticeTestComingSoonCard } from "../components/PracticeTestCard";
import { RequestPayoutCard } from "../components/RequestPayoutCard";
import { UploadResultCard } from "../components/UploadResultCard";
import { GiveUpdateFloatingButton } from "../components/GiveUpdateFloatingButton";
import { ElectionUpdatesProgressCard } from "../components/ElectionUpdatesProgressCard";
import { HomeBody } from "../components/Shared";

// Development bypass flag: ignores 2PM/4PM constraints for local UI testing
const BYPASS_TIME_CONSTRAINTS = process.env.NODE_ENV === "development";

/**
 * Polling Unit Agent Dashboard.
 *
 * Manages pre-election referrals/practice and the sequential election-day workflow:
 * arrival check-in, poll start, 30-min updates, EC8A result upload, poll close, and payout request.
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

  return (
    <>
      {/* Main Action Flow Body */}
      <HomeBody>
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
        {currentPollingUnitAssignment && (
          <>
            <UploadResultCard
              onClick={() => navigate({ to: "/upload-result" })}
            />
            <RequestPayoutCard onClick={handleRequestPayout} />
          </>
        )}

        {/* Pre-election cards: referral bonuses, practice test */}
        {daysLeft !== 0 && <ReferralCard onClick={() => navigate({ to: "/referrals" })} />}
        {daysLeft !== 0 && <PracticeTestComingSoonCard />}

        {/* Duty earnings summary */}
        <EarningsTab />
      </HomeBody>

      {/* Quick situation reporting FAB on election day */}
      {diffDays === 0 && (
        <GiveUpdateFloatingButton
          onClick={() => navigate({ to: "/give-update" })}
        />
      )}
    </>
  );
}
