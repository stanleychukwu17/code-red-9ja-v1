import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { AppAvatar } from "@repo/ui/components/avatar";

export type ElectionResultType = {
  /** The label for this row (State name, District name, LGA name, etc.) */
  label: string;
  candidateName?: string;
  partyShortName?: string;
  candidateAvatar?: string;
  /** The vote lead margin (e.g. 171006) */
  leadingByVotes?: number;
  /** The percentage lead (e.g. 32.59) */
  leadingByPercentage?: number;
  totalVotes?: number;
};

function formatNumber(n?: number) {
  if (n === undefined || n === null) return "—";
  return n.toLocaleString();
}

function formatPct(n?: number) {
  if (n === undefined || n === null) return "";
  return `${n.toFixed(2)}%`;
}

export type ElectionResultTableHeaderProps = {
  /** The column label for the first column — defaults to "Location" */
  locationLabel?: string;
};

export function ElectionResultTableHeader({
  locationLabel = "Location",
}: ElectionResultTableHeaderProps) {
  return (
    <TileHeader>
      <TileLeft>
        <span className="text-c-90 w-[180px] shrink-0">{locationLabel}</span>
        <span className="text-c-90">Leading candidate</span>
      </TileLeft>
      <TileRight>
        <span className="text-c-50 text-[14px] w-[220px] hidden sm:block">
          Leading by
        </span>
        <span className="text-c-50 text-[14px] w-[120px] hidden md:block">
          Total votes
        </span>
      </TileRight>
    </TileHeader>
  );
}

export function ElectionResultTableTile({ data }: { data: ElectionResultType }) {
  const hasResult = !!data.candidateName;
  return (
    <TileRow>
      <TileLeft>
        <div className="w-[180px] shrink-0">
          <span className="text-[16px] text-c-80 font-medium">{data.label}</span>
        </div>
        <div className="flex items-center gap-3 w-full min-w-0">
          {hasResult ? (
            <>
              <AppAvatar
                src={data.candidateAvatar}
                alt={data.candidateName ?? ""}
                className="size-8 shrink-0"
              />
              <p className="truncate text-[15px] text-c-80 font-medium">
                {data.candidateName}{" "}
                <span className="text-c-50 font-normal">
                  ({data.partyShortName})
                </span>
              </p>
            </>
          ) : (
            <p className="text-[15px] text-c-40 italic">No results yet</p>
          )}
        </div>
      </TileLeft>
      <TileRight>
        <div className="w-[220px] hidden sm:block">
          {hasResult && data.leadingByVotes !== undefined ? (
            <span className="text-[15px] text-c-80 font-medium">
              {formatNumber(data.leadingByVotes)}{" "}
              {data.leadingByPercentage !== undefined && (
                <span className="font-bold">
                  · {formatPct(data.leadingByPercentage)}
                </span>
              )}
            </span>
          ) : (
            <span className="text-[15px] text-c-40">—</span>
          )}
        </div>
        <div className="w-[120px] hidden md:block">
          <span className="text-[15px] text-c-80">
            {formatNumber(data.totalVotes)}
          </span>
        </div>
      </TileRight>
    </TileRow>
  );
}
