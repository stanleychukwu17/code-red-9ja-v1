import { Link } from "@tanstack/react-router";
import { cn } from "@repo/ui/lib/utils";
import { ChevronDown, Search, Share2, Upload } from "lucide-react";
import type { ReactNode } from "react";
import ExportIcon from "@repo/ui/icons/export-icon";

export type PartyAdminsTabId = "all" | "admin" | "agent";

type PartyAdminsLayoutProps = {
  activeTab: PartyAdminsTabId;
  children: ReactNode;
  showElectionFilter?: boolean;
};

const TABS: Array<{ id: PartyAdminsTabId; label: string; href: string }> = [
  { id: "all", label: "All", href: "/party-members" },
  { id: "admin", label: "Admin", href: "/party-members/admin" },
  { id: "agent", label: "Agent", href: "/party-members/agent" },
];

export function PartyAdminsLayout({
  activeTab,
  children,
  showElectionFilter = false,
}: PartyAdminsLayoutProps) {
  return (
    <main className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-8 py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-5">
          <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[#1d1d1d]">
            Party members
          </h1>
          <div className="inline-flex rounded-[12px] bg-[#efefee] p-1">
            {TABS.map((tab) => {
              const active = tab.id === activeTab;
              return (
                <Link
                  key={tab.id}
                  to={tab.href as never}
                  className={cn(
                    "rounded-[10px] px-6 py-2 text-[16px] transition",
                    active
                      ? "bg-[#0f7a31] text-white shadow-sm"
                      : "text-[#1d1d1d] hover:bg-white/70",
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex h-11 items-center gap-4 rounded-[12px] border border-[#dfdfdf] bg-white px-4 text-[16px] text-[#3b3b3b] transition hover:bg-[#fafafa]">
            Export
            <ExportIcon />
          </button>

          {showElectionFilter ? (
            <button className="flex h-11 items-center gap-3 rounded-[12px] border border-[#dfdfdf] bg-white px-4 text-[16px] text-[#404040] transition hover:bg-[#fafafa]">
              <span>Presidential</span>
              <span className="text-[#8d9690]">2027</span>
              <ChevronDown className="size-4 text-[#8d9690]" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex max-w-[490px] items-center gap-3 rounded-[12px] bg-[#f2f2f2] px-4 py-3 text-[#8b8b8b]">
        <Search className="size-5 shrink-0 text-[#868686]" />
        <input
          aria-label="Search party members"
          placeholder="Search"
          className="w-full bg-transparent text-[16px] outline-none placeholder:text-[#a3a3a3]"
        />
      </div>

      <div className="overflow-hidden rounded-[16px] bg-white">{children}</div>
    </main>
  );
}

type PartyAdminsTableProps = {
  columns: string[];
  rows: ReadonlyArray<{
    name: string;
    avatar: string;
    office?: string;
    partyOffice: string;
    dateLabel: string;
    role?: string;
  }>;
};

export function PartyAdminsTable({ columns, rows }: PartyAdminsTableProps) {
  return (
    <div className="w-full">
      <div
        className="grid border-b border-[#dfe7e2] py-3 text-[15px] text-[#6f6f6f]"
        style={{
          gridTemplateColumns: "minmax(0, 1.8fr) 120px 1.2fr 1fr 34px",
        }}
      >
        {columns.map((column, index) => (
          <div key={column} className={cn("px-0", index > 0 && "px-4")}>
            {column}
          </div>
        ))}
        <div />
      </div>

      <div>
        {rows.map((row) => (
          <div
            key={`${row.name}-${row.partyOffice}-${row.dateLabel}`}
            className="grid items-center py-4 text-[15px] text-[#222]"
            style={{
              gridTemplateColumns: "minmax(0, 1.8fr) 120px 1.2fr 1fr 34px",
            }}
          >
            <div className="flex min-w-0 items-center gap-4 px-0 pr-6">
              <img
                src={row.avatar}
                alt={row.name}
                className="size-10 rounded-full object-cover"
              />
              <span className="truncate text-[17px] text-[#222]">
                {row.name}
              </span>
            </div>
            <div className="px-4 text-[16px] font-medium text-[#ff9a3c]">
              {row.role ?? "-"}
            </div>
            <div className="px-4 text-[16px] text-[#313131]">
              {row.office ?? "-"}
            </div>
            <div className="px-4 text-[16px] text-[#313131]">
              {row.partyOffice}
            </div>
            <div className="px-4 text-[16px] text-[#313131]">
              {row.dateLabel}
            </div>
            <div className="flex justify-center text-[#7d7d7d]">
              <span className="text-[24px] leading-none">•••</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
