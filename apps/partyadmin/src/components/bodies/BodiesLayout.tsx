import { Link } from "@tanstack/react-router";
import { cn } from "@repo/ui/lib/utils";
import { Folder, Plus, Search, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";

export type BodiesTabId =
  | "states"
  | "districts"
  | "federal-constituencies"
  | "state-constituencies"
  | "lgas"
  | "wards"
  | "polling-units";

type BodiesLayoutProps = {
  title: string;
  activeTab: BodiesTabId;
  children: ReactNode;
};

const TABS: Array<{ id: BodiesTabId; label: string; href: string }> = [
  { id: "states", label: "States", href: "/bodies/states" },
  { id: "districts", label: "Districts", href: "/bodies/senatorial-districts" },
  {
    id: "federal-constituencies",
    label: "Federal Con.",
    href: "/bodies/federal-constituencies",
  },
  { id: "lgas", label: "LGAs", href: "/bodies/lgas" },
  {
    id: "state-constituencies",
    label: "State Con.",
    href: "/bodies/state-constituencies",
  },
  { id: "wards", label: "Wards", href: "/bodies/wards" },
  {
    id: "polling-units",
    label: "Polling units",
    href: "/bodies/polling-units",
  },
];

export function BodiesLayout({
  title,
  activeTab,
  children,
}: BodiesLayoutProps) {
  return (
    <main className="mx-auto flex w-full max-w-[1360px] flex-col gap-4 px-8 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#1e1e1e]">
            {title}
          </h1>
          <BodiesTabs activeTab={activeTab} />
        </div>

        <div className="flex items-center gap-3">
          <button className="flex h-11 items-center gap-2 rounded-[12px] border border-[#dedede] bg-white px-4 text-[16px] text-[#3b3b3b] transition hover:bg-[#fafafa]">
            <SlidersHorizontal className="size-4" />
            <span>Filter</span>
            <span className="ml-1 text-[#8a8a8a]">0</span>
          </button>
          <button className="flex h-11 items-center gap-2 rounded-[12px] bg-[#242424] px-4 text-[16px] text-white transition hover:bg-[#111]">
            <Plus className="size-5" />
            <span>Add</span>
          </button>
        </div>
      </div>

      <div className="flex max-w-[494px] items-center gap-3 rounded-[12px] bg-[#f2f2f2] px-4 py-3 text-[#8b8b8b]">
        <Search className="size-5 shrink-0" />
        <input
          aria-label="Search bodies"
          placeholder="Search"
          className="w-full bg-transparent text-[16px] outline-none placeholder:text-[#a3a3a3]"
        />
      </div>

      <div className="overflow-hidden rounded-[16px] border border-[#e9e9e9] bg-white">
        {children}
      </div>
    </main>
  );
}

export function BodiesTabs({ activeTab }: { activeTab: BodiesTabId }) {
  return (
    <div className="inline-flex rounded-[12px] bg-[#f2f2f2] p-1">
      {TABS.map((tab) => {
        const active = tab.id === activeTab;
        return (
          // @ts-ignore
          <Link
            key={tab.id}
            to={tab.href}
            className={cn(
              "whitespace-nowrap rounded-[10px] px-4 py-2 text-[16px] transition",
              active
                ? "bg-[#0d7a2f] text-white shadow-sm"
                : "text-[#1d1d1d] hover:bg-white/70",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

type BodiesTableProps = {
  columns: string[];
  rows: Array<{
    title: string;
    meta: string[];
    rank?: string;
    subtitle?: string;
    highlightLast?: boolean;
    icon?: "folder";
  }>;
};

export function BodiesTable({ columns, rows }: BodiesTableProps) {
  return (
    <div className="w-full">
      <div
        className="grid border-b border-[#e9e9e9] py-3 text-[15px] text-[#1f1f1f]"
        style={{
          gridTemplateColumns: `minmax(0, 1fr) repeat(${columns.length - 1}, auto)`,
        }}
      >
        {columns.map((column) => (
          <div key={column} className="px-4">
            {column}
          </div>
        ))}
      </div>

      <div>
        {rows.map((row) => (
          <div
            key={`${row.title}-${row.meta.join("-")}`}
            className="grid items-center border-b border-[#f1f1f1] py-5 text-[15px] text-[#222]"
            style={{
              gridTemplateColumns: `minmax(0, 1fr) repeat(${columns.length - 1}, auto)`,
            }}
          >
            <div className="flex min-w-0 items-center gap-4 px-4">
              {row.icon === "folder" ? (
                <Folder className="size-5 shrink-0 fill-[#ffbf2e] text-[#ffbf2e]" />
              ) : null}
              <div className="min-w-0">
                <div className="truncate text-[16px]">{row.title}</div>
                {row.subtitle ? (
                  <div className="mt-1 text-[13px] text-[#7a7a7a]">
                    {row.subtitle}
                  </div>
                ) : null}
              </div>
            </div>

            {row.rank ? (
              <div className="px-4 text-[16px] text-[#1f1f1f]">{row.rank}</div>
            ) : null}
            {row.meta.map((item, index) => (
              <div
                key={`${row.title}-${item}`}
                className={cn(
                  "px-4 text-[16px] text-[#1f1f1f]",
                  row.highlightLast &&
                    index === row.meta.length - 1 &&
                    "font-semibold",
                )}
              >
                {item}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
