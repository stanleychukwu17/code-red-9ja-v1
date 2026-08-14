import { IconInput } from "@repo/ui/components/input";
import { cn } from "../../lib/utils";
import { Link } from "@tanstack/react-router";
import { Ellipsis, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import PlusIcon from "../../icons/plus-icon";

/**
 * Types of tabs available in the admin layout navigation
 */
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
  href?: string;
  onClick?: () => void;
};

/**
 * Base layout wrapper for admin pages.
 * Centers content with a max width and provides consistent spacing.
 */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <main
      className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-5"
      style={{ scrollbarGutter: "stable" }}
    >
      {children}
    </main>
  );
}

/**
 * Layout specifically designed for dashboard views.
 * Similar to base Layout but with larger gap spacing between elements.
 */
export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-5">
      {children}
    </main>
  );
}

/**
 * A standardized filter button component displaying a slider icon.
 * Used across admin pages to trigger filter menus or modals.
 */
export function FilterButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button
      size="icon-xl"
      variant="outline"
      onClick={onClick}
      className="size-10 p-0 flex items-center justify-center rounded-full transition hover:[&_svg]:text-c-90"
    >
      <SlidersHorizontal className="size-5 text-c-70" />
    </Button>
  );
}

import { useState, useRef, useEffect } from "react";
import { Button } from "../button";
import ArrowDownIcon from "../../icons/arrow-down-icon";

/**
 * A multi-purpose 'Add' button that can either trigger a single action
 * or open a dropdown menu with multiple creation options depending on
 * the provided props.
 */
export function AddButton({
  onClick,
  onAddElection,
  onAddElectionType,
  onAddNationwideElection,
  onAddStateElection,
  onAddSenatorialElection,
  onAddFederalConstituencyElection,
  onAddStateConstituencyElection,
  onAddLgaElection,
  onAddWardElection,
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
  onAddNationwideElection?: () => void;
  onAddStateElection?: () => void;
  onAddSenatorialElection?: () => void;
  onAddFederalConstituencyElection?: () => void;
  onAddStateConstituencyElection?: () => void;
  onAddLgaElection?: () => void;
  onAddWardElection?: () => void;
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
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasDropdown = !!(
    onAddElection ||
    onAddElectionType ||
    onAddNationwideElection ||
    onAddStateElection ||
    onAddSenatorialElection ||
    onAddFederalConstituencyElection ||
    onAddStateConstituencyElection ||
    onAddLgaElection ||
    onAddWardElection ||
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
        <div className="absolute right-0 mt-2 w-64 rounded-[16px] bg-white p-2 shadow-[0px_4px_20px_rgba(0,0,0,0.08)] border border-[#f0f0f0] z-50">
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
          {onAddNationwideElection && (
            <button
              onClick={() => {
                onAddNationwideElection();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-[15px] font-medium hover:bg-[#fafafa] rounded-[10px] text-[#1a1a1a] transition cursor-pointer"
            >
              New Nationwide Election
            </button>
          )}
          {onAddStateElection && (
            <button
              onClick={() => {
                onAddStateElection();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-[15px] font-medium hover:bg-[#fafafa] rounded-[10px] text-[#1a1a1a] transition cursor-pointer"
            >
              New State Election
            </button>
          )}
          {onAddSenatorialElection && (
            <button
              onClick={() => {
                onAddSenatorialElection();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-[15px] font-medium hover:bg-[#fafafa] rounded-[10px] text-[#1a1a1a] transition cursor-pointer"
            >
              New Senatorial District Election
            </button>
          )}
          {onAddFederalConstituencyElection && (
            <button
              onClick={() => {
                onAddFederalConstituencyElection();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-[15px] font-medium hover:bg-[#fafafa] rounded-[10px] text-[#1a1a1a] transition cursor-pointer"
            >
              New Federal Constituency Election
            </button>
          )}
          {onAddStateConstituencyElection && (
            <button
              onClick={() => {
                onAddStateConstituencyElection();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-[15px] font-medium hover:bg-[#fafafa] rounded-[10px] text-[#1a1a1a] transition cursor-pointer"
            >
              New State Constituency Election
            </button>
          )}
          {onAddLgaElection && (
            <button
              onClick={() => {
                onAddLgaElection();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-[15px] font-medium hover:bg-[#fafafa] rounded-[10px] text-[#1a1a1a] transition cursor-pointer"
            >
              New LGA Election
            </button>
          )}
          {onAddWardElection && (
            <button
              onClick={() => {
                onAddWardElection();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-[15px] font-medium hover:bg-[#fafafa] rounded-[10px] text-[#1a1a1a] transition cursor-pointer"
            >
              New Ward Election
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

/**
 * A generic search bar component for page headers.
 * Includes an optional right-aligned component slot for additional actions.
 */
export function PageSearchLayer({
  rightComponent,
  placeholder = "Search",
  ariaLabel = "Search",
  value,
  onChange,
}: {
  rightComponent?: ReactNode;
  placeholder?: string;
  ariaLabel?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <IconInput
        aria-label={ariaLabel}
        placeholder={placeholder}
        className="w-full max-w-[490px]"
        value={value}
        onChange={onChange}
      />

      <div className="flex items-center gap-3">{rightComponent}</div>
    </div>
  );
}

/**
 * Standardized page header for admin views.
 * Displays the page title, navigation tabs, and optional right-aligned actions.
 */
export function PageHeader({
  title,
  rightComponent,
  activeTab,
  tabs,
  onBackClick,
}: {
  title: string;
  rightComponent?: ReactNode;
  activeTab: string;
  tabs?: PageHeaderTabProps[];
  onBackClick?: () => void;
}) {
  return (
    <div className="h-16 pt-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {onBackClick && (
          <button
            onClick={onBackClick}
            className="text-c-50 hover:text-c-80 transition cursor-pointer"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M19 12H5M12 19L5 12L19 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-c-80">
          {title}
        </h1>
        <HeaderTabs activeTab={activeTab} tabs={tabs} />
      </div>

      {rightComponent}
    </div>
  );
}

/**
 * Navigation tabs used within the PageHeader.
 * Supports both internal routing (via Link) and basic click handlers.
 */
export function HeaderTabs({
  activeTab,
  tabs,
  activeTabClassName = "bg-[#0b6c3e] text-white shadow-sm",
  containerClassName,
}: {
  activeTab: string;
  tabs?: PageHeaderTabProps[];
  activeTabClassName?: string;
  containerClassName?: string;
}) {
  if (!tabs) return <></>;

  return (
    <div
      className={cn(
        "flex bg-[#e9ecef] dark:bg-white/10 p-1 rounded-xl w-fit gap-1 select-none items-center h-11",
        containerClassName,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        const className = cn(
          "h-full px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center h-full",
          active ? activeTabClassName : "text-c-50 hover:text-c-80",
        );

        if (tab.href) {
          return (
            <Link
              key={tab.id}
              to={tab.href as never}
              onClick={tab.onClick}
              className={className}
            >
              {tab.label}
            </Link>
          );
        }

        return (
          <button key={tab.id} onClick={tab.onClick} className={className}>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A simple display card for statistics.
 * Shows a label, a value, and an accompanying icon.
 */
export function StatCard({
  label,
  value,
  icon,
}: {
  label: ReactNode;
  value: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-c-80 text-sm">{label}</p>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-c-80 font-medium text-[22px]">{value}</span>
      </div>
    </div>
  );
}

/**
 * A collapsible section container specifically designed for grouping StatCards.
 * Supports expanding/collapsing content and toggling number formats.
 */
export function StatSection({
  title,
  children,
  headerAction,
  onFormatToggle,
  isShortened,
}: {
  title: string;
  children: ReactNode;
  headerAction?: ReactNode;
  onFormatToggle?: () => void;
  isShortened?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const ExpandOrShorten = () => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onFormatToggle?.();
      }}
      className={cn(
        "text-xs text-orange transition-colors font-medium cursor-pointer bg-orange/10 px-2.5 py-1 rounded-full",
        isShortened && "bg-c-20 text-c-80",
      )}
    >
      {isShortened ? "Expand" : "Shorten"}
    </button>
  );

  return (
    <div className="bg-c-5/50 rounded-[20px] px-2 py-2 space-y-2 shadow-xs cursor-pointer">
      <div
        className="h-12 flex items-center justify-between px-3 hover:bg-c-7 rounded-xl transition duration-300"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2 className="text-sm font-bold text-c-50 tracking-wide">{title}</h2>
        <div className="flex items-center gap-3">
          {onFormatToggle && <ExpandOrShorten />}
          {headerAction}
          <div
            className={cn(
              "transition-transform duration-200",
              !isOpen && "rotate-90",
            )}
          >
            <ArrowDownIcon className="size-7" />
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="grid grid-cols-2 gap-4 gap-y-7 px-3 pb-2">
          {children}
        </div>
      )}
    </div>
  );
}

export function ReadinessStatSection({
  title,
  children,
  headerAction,
  onFormatToggle,
  isShortened,
}: {
  title: string;
  children: ReactNode;
  headerAction?: ReactNode;
  onFormatToggle?: () => void;
  isShortened?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const ExpandOrShorten = () => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onFormatToggle?.();
      }}
      className={cn(
        "text-xs text-orange transition-colors font-medium cursor-pointer bg-orange/10 px-2.5 py-1 rounded-full",
        isShortened && "bg-c-20 text-c-80",
      )}
    >
      {isShortened ? "Expand" : "Shorten"}
    </button>
  );

  return (
    <div className="bg-c-5/50 rounded-[20px] p-2 space-y-1 shadow-xs">
      <div
        className="h-12 flex items-center justify-between px-3 hover:bg-c-7 rounded-xl transition duration-300 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="h-11 flex items-center justify-between">
          <h3 className="font-bold text-c-80">{title}</h3>
        </div>
        <div className="flex items-center gap-3">
          {onFormatToggle && <ExpandOrShorten />}
          {headerAction}
          <div
            className={cn(
              "transition-transform duration-200",
              !isOpen && "rotate-90",
            )}
          >
            <ArrowDownIcon className="size-7" />
          </div>
        </div>
      </div>
      {isOpen && <div>{children}</div>}
    </div>
  );
}

/**
 * Type definitions for standardized table components
 */
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
