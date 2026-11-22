import { Plus } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { getLocalDate, timeAgo } from "@repo/ui/lib/date";
import { useUser } from "#/hooks/useUser";
import { useAssignments } from "#/hooks/useAssignments";
import { APP_URL } from "#/lib/config";
import { GreyCardWrapper } from "./Shared";

/**
 * Displays a personalized update-posting reminder card with today's date,
 * time since the last update, and a quick-action button to post an update.
 */
export function UpdateReminderCard() {
  const navigate = useNavigate();
  const user = useUser();
  const { pollingUnitAssignment, supervisorAssignment } = useAssignments();

  const fullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.username ||
    "there";

  const formattedDate = getLocalDate(Date.now(), {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });

  const lastUpdateAt =
    pollingUnitAssignment?.last_update_at ??
    supervisorAssignment?.data?.last_update_at ??
    null;

  return (
    <GreyCardWrapper>
        <p className="text-sm font-medium text-c-70">Hi {fullName}</p>

        <p className="text-[15px] leading-snug text-c-90">
          Remember to post updates as frequently as you can with a minimum of
          30minutes per update
        </p>

        <div className="flex items-baseline justify-between gap-3 pt-1">
          <span className="text-[26px] leading-none font-bold text-c-90 tracking-tight">
            {formattedDate}
          </span>

          {lastUpdateAt && (
            <span className="text-sm font-semibold text-[#E53935]">
              Last update: {timeAgo(lastUpdateAt)} ago
            </span>
          )}
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={() => navigate({ to: APP_URL.giveUpdate })}
            className="inline-flex items-center gap-2 bg-[#A3F742] hover:bg-[#95EB32] active:bg-[#88DF25] text-black text-sm font-semibold rounded-full px-5 py-2.5 transition-colors cursor-pointer"
          >
            <Plus className="size-4" strokeWidth={2.25} />
            <span>Post an update</span>
          </button>
        </div>
    </GreyCardWrapper>
  );
}
