import { useElection } from "#/hooks/useElection";
import { LeaderboardCardWrapper, ObjectiveTile } from "@repo/ui/components/cards/leaderboard-card";

type ReadinessProgressCardProps = {
  partyStats?: any;
  targets?: any;
  isLoading?: boolean;
};

const ReadinessText = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => {
  return (
    <span className="text-white font-medium">
      {label}
      <span className="text-white/50"> {value}</span>
    </span>
  );
};

/**
 * ReadinessProgressCard Component
 *
 * Progress meter breakdown displaying the staffing completeness percentage for each
 * operational agent tier (Polling Unit Agent, Ward Supervisor, LGA Supervisor, State Supervisor).
 * Dynamically adjusts its scope denominators based on geographic filters.
 */
export function ReadinessProgressCard({
  partyStats,
  targets,
  isLoading,
}: ReadinessProgressCardProps) {
  const {
    selectedStateId,
    selectedLGAId,
    selectedWardId,
    selectedDistrictId,
    selectedStateConstituencyId,
    selectedFederalConstituencyId,
  } = useElection();

  if (isLoading) {
    return (
      <LeaderboardCardWrapper>
        <div className="flex h-40 items-center justify-center text-white/50">
          Loading readiness stats...
        </div>
      </LeaderboardCardWrapper>
    );
  }

  const pStats = partyStats || {};
  const tStats = targets || {};

  const puCount = pStats.unique_pu_agents_count || 0;
  const puMax = tStats.polling_units_count || 0;
  const puPercent = puMax > 0 ? Math.floor((puCount / puMax) * 100) : 0;

  const wardCount = pStats.unique_ward_supervisors_count || 0;
  const wardMax = tStats.wards_count || 0;
  const wardPercent = wardMax > 0 ? Math.floor((wardCount / wardMax) * 100) : 0;

  const lgaCount = pStats.unique_lga_supervisors_count || 0;
  const lgaMax = tStats.lgas_count || 0;
  const lgaPercent = lgaMax > 0 ? Math.floor((lgaCount / lgaMax) * 100) : 0;

  const stateCount = pStats.unique_state_supervisors_count || 0;
  let stateMax = tStats.states_count || 0;
  // If backend doesn't provide states_count, infer from scope
  const isBelowStateLevel = !!(
    selectedLGAId ||
    selectedWardId ||
    selectedDistrictId ||
    selectedStateConstituencyId ||
    selectedFederalConstituencyId
  );
  if (!stateMax && !isBelowStateLevel) {
    stateMax = selectedStateId ? 1 : 37;
  }
  const statePercent =
    stateMax > 0 ? Math.floor((stateCount / stateMax) * 100) : 0;

  const showState = !isBelowStateLevel;
  const showLGA = !selectedWardId;
  const showWard = true;
  const showPU = true;

  return (
    <LeaderboardCardWrapper>
      {showPU && (
        <ObjectiveTile
          isCompleted={puPercent >= 100}
          title="Polling Agent"
          rightText={
            <ReadinessText
              label={puCount.toLocaleString()}
              value={`/ ${puMax.toLocaleString()}`}
            />
          }
          rightText2={<ReadinessText label={`${puPercent}%`} value="ready" />}
        />
      )}
      {showWard && (
        <ObjectiveTile
          isCompleted={wardPercent >= 100}
          title="Ward Election Supervisor"
          rightText={
            <ReadinessText
              label={wardCount.toLocaleString()}
              value={`/ ${wardMax.toLocaleString()}`}
            />
          }
          rightText2={<ReadinessText label={`${wardPercent}%`} value="ready" />}
        />
      )}
      {showLGA && (
        <ObjectiveTile
          isCompleted={lgaPercent >= 100}
          title="LGA Election Supervisor"
          rightText={
            <ReadinessText
              label={lgaCount.toLocaleString()}
              value={`/ ${lgaMax.toLocaleString()}`}
            />
          }
          rightText2={<ReadinessText label={`${lgaPercent}%`} value="ready" />}
        />
      )}
      {showState && (
        <ObjectiveTile
          isCompleted={statePercent >= 100}
          title="State Election Supervisor"
          rightText={
            <ReadinessText
              label={stateCount.toLocaleString()}
              value={`/ ${stateMax.toLocaleString()}`}
            />
          }
          rightText2={
            <ReadinessText label={`${statePercent}%`} value="ready" />
          }
        />
      )}
    </LeaderboardCardWrapper>
  );
}
