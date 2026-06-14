import { Ellipsis } from "lucide-react";
import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { cn } from "@repo/ui/lib/utils";

export type ApplicationType = {
  name: string;
  avatar: string;
  election: string;
  residence: string;
  appliedOn: string;
  decisionLabel: string;
  decisionVariant: "accept" | "reject" | "pending";
};

export function ApplicationTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <p className="truncate w-full text-[16px]">User</p>
      </TileLeft>

      <TileRight>
        <p className="text-c-50 text-[14px] w-[140px] hidden lg:block">
          Election
        </p>
        <p className="text-c-50 text-[14px] w-[140px] hidden md:block">
          Residence
        </p>
        <p className="text-c-50 text-[14px] w-[120px] hidden xl:block ">
          Applied on
        </p>
        <p className="text-c-50 text-[14px] w-[160px] text-center">
          Make decision
        </p>
        <div className="ml-5 shrink-0 size-7" />
      </TileRight>
    </TileHeader>
  );
}

import { usePollingAgentDialog } from "#/components/dialogs/PollingAgentDialogContext";

export function ApplicationTableTile({ data }: { data: ApplicationType }) {
  const { openApplication } = usePollingAgentDialog();

  return (
    <TileRow
      onClick={() =>
        openApplication({
          name: data.name,
          avatar: data.avatar,
          location: data.residence,
          election: data.election,
          voterId: "904284758271",
        })
      }
    >
      <TileLeft>
        <div className="flex items-center gap-4 w-full min-w-0">
          <img
            src={data.avatar}
            alt={data.name}
            className="size-9 rounded-full object-cover shrink-0"
          />
          <p className="truncate w-full text-[16px] text-[#222]">{data.name}</p>
        </div>
      </TileLeft>

      <TileRight>
        <p className="w-[140px] truncate hidden lg:block text-[#313131]">
          {data.election}
        </p>
        <p className="w-[140px] truncate hidden md:block text-[#313131]">
          {data.residence}
        </p>
        <p className="w-[120px] hidden xl:block text-[#313131]">
          {data.appliedOn}
        </p>
        <div
          className="w-[160px] flex gap-2 justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {data.decisionVariant === "pending" ? (
            <>
              <DecisionPill variant="accept" className="flex-1">
                Accept
              </DecisionPill>
              <DecisionPill variant="reject" className="flex-1">
                Reject
              </DecisionPill>
            </>
          ) : (
            <DecisionPill
              variant={data.decisionVariant}
              className="w-full max-w-[140px]"
            >
              {data.decisionLabel}
            </DecisionPill>
          )}
        </div>

        <div
          onClick={(e) => {
            e.stopPropagation();
            openApplication({
              name: data.name,
              avatar: data.avatar,
              location: data.residence,
              election: data.election,
              voterId: "904284758271",
            });
          }}
          className="ml-5 shrink-0 size-7 flex items-center justify-center text-c-50 hover:text-c-80 cursor-pointer"
        >
          <Ellipsis className="size-5" />
        </div>
      </TileRight>
    </TileRow>
  );
}

function DecisionPill({
  children,
  variant,
  className,
}: {
  children: string;
  variant: "accept" | "reject" | "pending";
  className?: string;
}) {
  return (
    <button
      className={cn(
        "h-8 rounded-[10px] px-3 text-[14px] font-semibold transition truncate text-center",
        variant === "accept" &&
          "bg-[#10dd84] text-[#083b25] hover:bg-[#08cf79]",
        variant === "reject" &&
          "bg-[#ececec] text-[#5e6a64] hover:bg-[#e6e6e6]",
        variant === "pending" &&
          "bg-[#ececec] text-[#5e6a64] hover:bg-[#e6e6e6]",
        className,
      )}
    >
      {children}
    </button>
  );
}
