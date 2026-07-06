import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronDown } from "lucide-react";
import { useState } from "react";
import { SelectTime } from "@repo/ui/components/selects/time-select";
import { PageWrapper } from "#/components/Wrappers";
import { StickyFooter } from "#/components/Footers";
import { PageHeader } from "#/components/Headers";
import { Button } from "@repo/ui/components/button";
import { TitleText } from "@repo/ui/components/custom/Texts";

export const Route = createFileRoute("/_authenticated/election-end/")({
  component: ElectionEndTime,
});

function ElectionEndTime() {
  const navigate = useNavigate();
  const search = Route.useSearch() as any;
  const assignmentId = search.assignmentId;
  const [endTime, setEndTime] = useState("2:00 PM");

  return (
    <PageWrapper>
      {/* Header */}
      <PageHeader />

      <div className="flex flex-col mt-4 px-4">
        <TitleText text="What time did the election end?" />

        <div className="flex flex-col gap-2 mt-8">
          <label className="text-neutral-600 font-medium text-[15px]">
            End time
          </label>
          <div className="relative mt-2">
            <SelectTime
              initialData={endTime}
              update={setEndTime}
              className="bg-white border-neutral-300 rounded-[12px] py-4"
            />
          </div>
        </div>
      </div>
      <div className="flex-1" />

      <StickyFooter>
        <Button
          type="button"
          variant="secondary"
          size="4xl"
          onClick={() => navigate({ 
            to: "/election-end/video",
            search: { assignmentId, endTime } as any
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
