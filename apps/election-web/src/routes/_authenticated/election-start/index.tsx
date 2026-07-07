import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronDown } from "lucide-react";
import { useState } from "react";
import { SelectTime } from "@repo/ui/components/selects/time-select";
import { PageWrapper } from "#/components/Wrappers";
import { PageHeader } from "#/components/Headers";
import { StickyFooter } from "#/components/Footers";
import { Button } from "@repo/ui/components/button";
import { TitleText } from "@repo/ui/components/custom/Texts";
import { getLocalTime } from "@repo/ui/lib/date";

export const Route = createFileRoute("/_authenticated/election-start/")({
  component: ElectionStartTime,
});

function ElectionStartTime() {
  const navigate = useNavigate();
  const search = Route.useSearch() as any;
  const assignmentId = search.assignmentId;
  const [startTime, setStartTime] = useState(() => 
    getLocalTime(Date.now(), { hour: "numeric" })
  );

  return (
    <PageWrapper>
      {/* Header */}
      <PageHeader />

      <div className="px-4">
        <div className="flex flex-col mt-4">
          <TitleText text="What time did the election start?" />
          <div className="flex flex-col gap-2 mt-8">
            <label className="text-neutral-600 font-medium text-[15px]">
              Start time
            </label>
            <div className="relative mt-2">
              <SelectTime
                initialData={startTime}
                update={setStartTime}
                className="bg-white border-neutral-300 rounded-[12px] py-4"
              />
            </div>
          </div>
        </div>
        <div className="flex-1" /> {/* Spacer */}
      </div>
      {/* Bottom Action Bar */}
      <StickyFooter>
        <Button
          type="button"
          variant="secondary"
          size="4xl"
          onClick={() => navigate({ 
            to: "/election-start/video",
            search: { assignmentId, startTime } as any
          })}
        >
          Continue
        </Button>
        <Button
          type="button"
          variant="grey"
          size="4xl"
          onClick={() => navigate({ to: "/home" })}
        >
          Cancel
        </Button>
      </StickyFooter>
    </PageWrapper>
  );
}
