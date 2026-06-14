import { Link } from "@tanstack/react-router";
import { cn } from "@repo/ui/lib/utils";
import { Download, Ellipsis, Search, Share2, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import ExportIcon from "@repo/ui/icons/export-icon";

export type ApplicationsTabId = "pending" | "accepted" | "rejected";

type ApplicationsLayoutProps = {
  activeTab: ApplicationsTabId;
  slotsLeft: string;
  children: ReactNode;
};

const TABS: Array<{ id: ApplicationsTabId; label: string; href: string }> = [
  { id: "pending", label: "Pending(792)", href: "/applications" },
  {
    id: "accepted",
    label: "Accepted (103.4k)",
    href: "/applications/accepted",
  },
  { id: "rejected", label: "Rejected (32)", href: "/applications/rejected" },
];

export function ApplicationsLayout({
  activeTab,
  slotsLeft,
  children,
}: ApplicationsLayoutProps) {
  return (
    <main className="mx-auto flex w-full max-w-[1460px] flex-col gap-4 px-8 py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-5">
          <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[#1d1d1d]">
            Applications
          </h1>

          <div className="inline-flex rounded-[12px] bg-[#efefef] p-1 shadow-[0_1px_0_rgba(0,0,0,0.03)_inset]">
            {TABS.map((tab) => {
              const active = tab.id === activeTab;
              return (
                <Link
                  key={tab.id}
                  to={tab.href as never}
                  className={cn(
                    "rounded-[10px] px-5 py-2 text-[16px] transition",
                    active
                      ? "bg-[#0f7a31] text-white shadow-sm"
                      : "text-[#141414] hover:bg-white/70",
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="text-[18px] text-[#6f6f6f]">
          <span className="font-semibold text-[#222]">{slotsLeft}</span> slots
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex w-full max-w-[490px] items-center gap-3 rounded-[12px] bg-[#f3f3f3] px-4 py-3 text-[#9a9a9a]">
          <Search className="size-5 shrink-0" />
          <input
            aria-label="Search applications"
            placeholder="Search"
            className="w-full bg-transparent text-[16px] outline-none placeholder:text-[#aaaaaa]"
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="flex h-11 items-center gap-2 rounded-[12px] bg-[#262626] px-5 text-[16px] font-medium text-white transition hover:bg-[#111]">
            Accept all
          </button>
          <button className="flex h-11 items-center gap-4 rounded-[12px] border border-[#dddddd] bg-white px-4 text-[16px] text-[#404040] transition hover:bg-[#fafafa]">
            Export
            <ExportIcon />
          </button>
          <button className="flex h-11 items-center gap-3 rounded-[12px] border border-[#dddddd] bg-white px-4 text-[16px] text-[#404040] transition hover:bg-[#fafafa]">
            <span>Presidential</span>
            <span className="text-[#8d9690]">2027</span>
            <ChevronDown className="size-4 text-[#8d9690]" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[16px] bg-white">{children}</div>
    </main>
  );
}

type ApplicationsTableProps = {
  rows: ReadonlyArray<{
    name: string;
    avatar: string;
    election: string;
    residence: string;
    appliedOn: string;
    decisionLabel: string;
    decisionVariant: "accept" | "reject" | "neutral";
  }>;
};

export function ApplicationsTable({ rows }: ApplicationsTableProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-[minmax(0,2.2fr)_1fr_1fr_0.8fr_0.95fr_40px] border-b border-[#e5ece8] py-3 text-[15px] text-[#8c8c8c]">
        <div className="px-4 text-[#232323]">User</div>
        <div className="px-4">Election</div>
        <div className="px-4">Residence</div>
        <div className="px-4">Applied on</div>
        <div className="px-4">Make decision</div>
        <div />
      </div>

      <div>
        {rows.map((row) => (
          <div
            key={`${row.name}-${row.election}-${row.appliedOn}`}
            className="grid grid-cols-[minmax(0,2.2fr)_1fr_1fr_0.8fr_0.95fr_40px] items-center py-4 text-[15px] text-[#222]"
          >
            <div className="flex min-w-0 items-center gap-4 px-4">
              <img
                src={row.avatar}
                alt={row.name}
                className="size-10 rounded-full object-cover"
              />
              <span className="truncate text-[17px] text-[#222]">
                {row.name}
              </span>
            </div>
            <div className="px-4 truncate text-[16px] text-[#313131]">
              {row.election}
            </div>
            <div className="px-4 truncate text-[16px] text-[#313131]">
              {row.residence}
            </div>
            <div className="px-4 text-[16px] text-[#313131]">
              {row.appliedOn}
            </div>
            <div className="px-4">
              <DecisionPill variant={row.decisionVariant}>
                {row.decisionLabel}
              </DecisionPill>
            </div>
            <div className="px-4 text-[#7f7f7f]">
              <Ellipsis className="size-5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DecisionPill({
  children,
  variant,
}: {
  children: string;
  variant: "accept" | "reject" | "neutral";
}) {
  return (
    <button
      className={cn(
        "h-9 rounded-[12px] px-4 text-[15px] font-semibold transition",
        variant === "accept" &&
          "bg-[#10dd84] text-[#083b25] hover:bg-[#08cf79]",
        variant === "reject" &&
          "bg-[#ececec] text-[#5e6a64] hover:bg-[#e6e6e6]",
        variant === "neutral" &&
          "bg-[#ececec] text-[#5e6a64] hover:bg-[#e6e6e6]",
      )}
    >
      {children}
    </button>
  );
}
