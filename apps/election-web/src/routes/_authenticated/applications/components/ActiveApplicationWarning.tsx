import { useNavigate } from "@tanstack/react-router";
import { PageWrapper } from "#/components/Wrappers";
import { StickyFooter } from "#/components/Footers";
import { Button } from "@repo/ui/components/button";
import {
  AlertCircle,
  Calendar,
  Shield,
  MapPin,
  GraduationCap,
  ArrowRight,
} from "lucide-react";

interface ActiveApplicationWarningProps {
  application: any;
}

export function ActiveApplicationWarning({
  application,
}: ActiveApplicationWarningProps) {
  const navigate = useNavigate();

  const electionName =
    application.election_group_name ||
    application.election_group?.name ||
    "an upcoming election";

  const statusLabel =
    application.status === "accepted" || application.status === "approved"
      ? "Approved Agent"
      : "Under Review (Pending)";

  const partyName =
    application.party_short_name ||
    application.party_name ||
    application.party?.short_name ||
    "";

  const pollingUnitName =
    application.polling_unit_name ||
    application.polling_unit?.name ||
    "Assigned PU";

  return (
    <PageWrapper>
      <div className="flex flex-col flex-1 px-4 pt-6 pb-28">
        {/* Badge & Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black text-white text-xs font-semibold">
            <AlertCircle className="size-3.5" />
            <span>ACTIVE APPLICATION IN PROGRESS</span>
          </div>

          <h1 className="text-2xl font-bold text-c-100 leading-tight">
            You Already Have an Active Application
          </h1>

          <p className="text-c-80 text-sm leading-relaxed">
            In accordance with election guidelines, an agent can only be assigned to
            one election group at a time. You cannot apply for a new election until
            your current election concludes.
          </p>
        </div>

        {/* Existing Application Details Card */}
        <div className="mt-5 p-4.5 rounded-2xl bg-hover-5 border border-border space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <span className="text-xs text-c-50 uppercase tracking-wider font-semibold">
              Current Assignment
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                application.status === "accepted" || application.status === "approved"
                  ? "bg-green/15 text-green"
                  : "bg-black/10 dark:bg-white/10 text-c-100"
              }`}
            >
              {statusLabel}
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2.5">
              <Calendar className="size-4 text-c-50 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-c-50">Election</p>
                <p className="font-semibold text-c-100">{electionName}</p>
              </div>
            </div>

            {partyName && (
              <div className="flex items-start gap-2.5">
                <Shield className="size-4 text-c-50 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-c-50">Representing Party</p>
                  <p className="font-medium text-c-90">{partyName}</p>
                </div>
              </div>
            )}

            {application.polling_unit_name && (
              <div className="flex items-start gap-2.5">
                <MapPin className="size-4 text-c-50 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-c-50">Polling Unit</p>
                  <p className="font-medium text-c-90">{pollingUnitName}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Practice Test Prompt */}
        <div className="mt-4 p-4.5 rounded-2xl bg-hover-5 border border-border flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-full bg-black text-white flex items-center justify-center shrink-0">
              <GraduationCap className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-c-100">
                Take the Practice Test While You Wait
              </h3>
              <p className="text-xs text-c-70 leading-relaxed">
                While your application is being reviewed, sharpen your election-day
                knowledge. Completing the mandatory polling agent simulator is
                required to ensure full accreditation.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate({ to: "/practice" })}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-c-100 underline underline-offset-4 hover:opacity-80 self-start mt-1 cursor-pointer"
          >
            <span>Go to Practice Test</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Footer CTAs */}
      <StickyFooter>
        <div className="flex flex-col gap-2 w-full">
          <Button
            type="button"
            variant="black"
            size="4xl"
            className="w-full rounded-full"
            onClick={() => navigate({ to: "/practice" })}
          >
            Take Practice Test
          </Button>

          <Button
            type="button"
            variant="outline"
            size="4xl"
            className="w-full rounded-full"
            onClick={() => navigate({ to: "/" })}
          >
            Go to Dashboard
          </Button>
        </div>
      </StickyFooter>
    </PageWrapper>
  );
}
