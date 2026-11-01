import { Award, CheckCircle2, ShieldAlert } from "lucide-react";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { AppAvatar } from "@repo/ui/components/avatar";

export type PartyNominationBannerProps = {
  party?: { logo?: string; short_name?: string } | null;
  myPartyCandidate?: any;
  ticketConfig: {
    principalRole: string;
    hasRunningMate?: boolean;
  };
  onManageTicket: () => void;
};

/**
 * Party Nomination Banner displaying current fielded ticket status and quick action.
 */
export function PartyNominationBanner({
  party,
  myPartyCandidate,
  ticketConfig,
  onManageTicket,
}: PartyNominationBannerProps) {
  return (
    <div className="rounded-2xl border border-primary/20 bg-linear-to-r from-primary/5 via-card/80 to-card/60 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="size-14 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0">
          {party?.logo ? (
            <img
              src={party.logo}
              alt={party.short_name || "Party"}
              className="size-10 object-contain rounded-xl"
            />
          ) : (
            <Award className="size-7 text-primary" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {party?.short_name || "Your Party"} Ticket
            </span>
            {myPartyCandidate ? (
              <Badge variant="success" className="text-[11px] py-0 px-2 flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                Fielded
              </Badge>
            ) : (
              <Badge variant="warning" className="text-[11px] py-0 px-2 flex items-center gap-1">
                <ShieldAlert className="size-3" />
                Vacant
              </Badge>
            )}
          </div>

          {myPartyCandidate ? (
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <AppAvatar
                  src={myPartyCandidate.avatar}
                  alt={myPartyCandidate.full_name || `${myPartyCandidate.first_name || ""} ${myPartyCandidate.last_name || ""}`}
                  className="size-6 shrink-0 ring-1 ring-border"
                />
                <span className="text-base font-semibold text-c-90">
                  {myPartyCandidate.full_name || `${myPartyCandidate.first_name || ""} ${myPartyCandidate.last_name || ""}`}
                </span>
                <span className="text-xs text-c-50">({ticketConfig.principalRole})</span>
              </div>

              {ticketConfig.hasRunningMate && myPartyCandidate.running_mate_id && (
                <div className="flex items-center gap-2 border-l border-border pl-3">
                  <AppAvatar
                    src={myPartyCandidate.running_mate_avatar}
                    alt={myPartyCandidate.running_mate_full_name || `${myPartyCandidate.running_mate_first_name || ""} ${myPartyCandidate.running_mate_last_name || ""}`}
                    className="size-6 shrink-0 ring-1 ring-border"
                  />
                  <span className="text-sm font-medium text-c-80">
                    {myPartyCandidate.running_mate_full_name || `${myPartyCandidate.running_mate_first_name || ""} ${myPartyCandidate.running_mate_last_name || ""}`}
                  </span>
                  <span className="text-xs text-c-40">(Running Mate)</span>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-0.5 text-sm text-c-60">
              Your party does not currently have an active candidate ticket nominated for this election contest.
            </p>
          )}
        </div>
      </div>

      <Button
        onClick={onManageTicket}
        variant={myPartyCandidate ? "outline" : "default"}
        size="sm"
        className="rounded-xl shrink-0"
      >
        {myPartyCandidate ? "Edit Ticket" : "Nominate Ticket"}
      </Button>
    </div>
  );
}

