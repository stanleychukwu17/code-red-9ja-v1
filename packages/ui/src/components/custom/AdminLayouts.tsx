import { IconInput } from "@repo/ui/components/input";
import { cn } from "../../lib/utils";
import { Link } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import PlusIcon from "../../icons/plus-icon";

export type ActiveTabProps = "groups" | "instances" | "types";

type ElectionsLayoutProps = {
  title: string;
  activeTab: ActiveTabProps;
  rightLabel?: string;
  children: ReactNode;
};

export type PageHeaderTabProps = {
  id: string;
  label: string;
  href: string;
};

export function Layout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-5">
      {children}
    </main>
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-5">
      {children}
    </main>
  );
}

export function FilterButton() {
  return (
    <button className="flex h-10 items-center gap-3 rounded-[12px] border border-[#dfdfdf] bg-white px-4 text-[16px] text-[#3b3b3b] transition hover:bg-[#fafafa]">
      <SlidersHorizontal className="size-4 text-[#7e7e7e]" />
      <span>Filter</span>
      <span className="ml-1 text-c-50">0</span>
    </button>
  );
}

import { useState, useRef, useEffect } from "react";

export function AddButton({
  onClick,
  onAddElection,
  onAddElectionType,
  onAddState,
  onAddDistrict,
  onAddLga,
  onAddFederalConstituency,
  onAddStateConstituency,
  onAddWard,
  onAddPollingUnit,
}: {
  onClick?: () => void;
  onAddElection?: () => void;
  onAddElectionType?: () => void;
  onAddState?: () => void;
  onAddDistrict?: () => void;
  onAddLga?: () => void;
  onAddFederalConstituency?: () => void;
  onAddStateConstituency?: () => void;
  onAddWard?: () => void;
  onAddPollingUnit?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasDropdown = !!(
    onAddElection ||
    onAddElectionType ||
    onAddState ||
    onAddDistrict ||
    onAddLga ||
    onAddFederalConstituency ||
    onAddStateConstituency ||
    onAddWard ||
    onAddPollingUnit
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          if (hasDropdown) {
            setOpen(!open);
          } else {
            onClick?.();
          }
        }}
        className="flex h-10 items-center gap-2 rounded-[12px] bg-[#242424] px-4 text-[16px] text-white transition hover:bg-[#111] cursor-pointer"
      >
        <PlusIcon className="size-5" />
        <span>Add</span>
      </button>

      {hasDropdown && open && (
        <div className="absolute right-0 mt-2 w-56 rounded-[16px] bg-white p-2 shadow-[0px_4px_20px_rgba(0,0,0,0.08)] border border-[#f0f0f0] z-50">
          {onAddElection && (
            <button
              onClick={() => {
                onAddElection();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-[15px] font-medium hover:bg-[#fafafa] rounded-[10px] text-[#1a1a1a] transition cursor-pointer"
            >
              Add Election
            </button>
          )}
          {onAddElectionType && (
            <button
              onClick={() => {
                onAddElectionType();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-[15px] font-medium hover:bg-[#fafafa] rounded-[10px] text-[#1a1a1a] transition cursor-pointer"
            >
              Add Election Type
            </button>
          )}
          {onAddState && (
            <button
              onClick={() => {
                onAddState();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-[15px] font-medium hover:bg-[#fafafa] rounded-[10px] text-[#1a1a1a] transition cursor-pointer"
            >
              New State
            </button>
          )}
          {onAddDistrict && (
            <button
              onClick={() => {
                onAddDistrict();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-[15px] font-medium hover:bg-[#fafafa] rounded-[10px] text-[#1a1a1a] transition cursor-pointer"
            >
              New District
            </button>
          )}
          {onAddLga && (
            <button
              onClick={() => {
                onAddLga();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-[15px] font-medium hover:bg-[#fafafa] rounded-[10px] text-[#1a1a1a] transition cursor-pointer"
            >
              New LGA
            </button>
          )}
          {onAddFederalConstituency && (
            <button
              onClick={() => {
                onAddFederalConstituency();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-[15px] font-medium hover:bg-[#fafafa] rounded-[10px] text-[#1a1a1a] transition cursor-pointer"
            >
              New Federal Constituency
            </button>
          )}
          {onAddStateConstituency && (
            <button
              onClick={() => {
                onAddStateConstituency();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-[15px] font-medium hover:bg-[#fafafa] rounded-[10px] text-[#1a1a1a] transition cursor-pointer"
            >
              New State Constituency
            </button>
          )}
          {onAddWard && (
            <button
              onClick={() => {
                onAddWard();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-[15px] font-medium hover:bg-[#fafafa] rounded-[10px] text-[#1a1a1a] transition cursor-pointer"
            >
              New Ward
            </button>
          )}
          {onAddPollingUnit && (
            <button
              onClick={() => {
                onAddPollingUnit();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-[15px] font-medium hover:bg-[#fafafa] rounded-[10px] text-[#1a1a1a] transition cursor-pointer"
            >
              New Polling Unit
            </button>
          )}
        </div>
      )}
    </div>
  );
}



export function PageSearchLayer({
  rightComponent,
  placeholder = "Search",
  ariaLabel = "Search",
}: {
  rightComponent?: ReactNode;
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <IconInput
        aria-label={ariaLabel}
        placeholder={placeholder}
        className="w-full max-w-[490px]"
      />

      <div className="flex items-center gap-3">{rightComponent}</div>
    </div>
  );
}

export function PageHeader({
  title,
  rightComponent,
  activeTab,
  tabs,
}: {
  title: string;
  rightComponent?: ReactNode;
  activeTab: string;
  tabs?: PageHeaderTabProps[];
}) {
  return (
    <div className="h-16 pt-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-c-80">
          {title}
        </h1>
        <HeaderTabs activeTab={activeTab} tabs={tabs} />
      </div>

      {rightComponent}
    </div>
  );
}

export function HeaderTabs({
  activeTab,
  tabs,
}: {
  activeTab: string;
  tabs?: PageHeaderTabProps[];
}) {
  if (!tabs) return <></>;

  return (
    <div className="h-11 inline-flex overflow-hidden rounded-[12px] bg-[#f2f2f2] p-1">
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <Link
            key={tab.id}
            to={tab.href as never}
            className={cn(
              "rounded-[10px] px-6 text-[16px] transition flex items-center justify-center",
              active
                ? "bg-primary text-white shadow-sm"
                : "text-c-60 hover:text-c-80",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

export type TableProps = {
  columns: string[];
  rows: Array<{
    title: string;
    subtitle?: string;
    cells: ReactNode[];
    rankIcon?: "folder" | "star";
    rankIconColor?: string;
  }>;
};

export type TableHeaderProps = {
  columns: string[];
};

export type TableRowProps = {
  row: TableProps["rows"][number];
  columnsCount: number;
};
