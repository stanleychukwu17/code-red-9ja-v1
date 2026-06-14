import { Link } from "@tanstack/react-router";
import { cn } from "@repo/ui/lib/utils";
import { Plus, Search } from "lucide-react";
import type { ReactNode } from "react";

export type UsersTabId = "admin" | "app-users";

type UsersLayoutProps = {
  title: string;
  activeTab: UsersTabId;
  children: ReactNode;
};

const TABS: Array<{ id: UsersTabId; label: string; href: string }> = [
  { id: "admin", label: "Superadmin", href: "/users/admin" },
  { id: "app-users", label: "App users", href: "/users/app-users" },
];

export function UsersLayout({ title, activeTab, children }: UsersLayoutProps) {
  return (
    <main className="mx-auto flex w-full max-w-[1360px] flex-col gap-4 px-8 py-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#1e1e1e]">
            {title}
          </h1>
          <UsersTabs activeTab={activeTab} />
        </div>

        <button className="flex h-11 items-center gap-2 rounded-[12px] border border-[#dedede] bg-white px-4 text-[16px] text-[#3b3b3b] transition hover:bg-[#fafafa]">
          <Plus className="size-5" />
          <span>Add</span>
        </button>
      </div>

      <div className="flex max-w-[494px] items-center gap-3 rounded-[12px] bg-[#f2f2f2] px-4 py-3 text-[#8b8b8b]">
        <Search className="size-5 shrink-0" />
        <input
          aria-label="Search users"
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

export function UsersTabs({ activeTab }: { activeTab: UsersTabId }) {
  return (
    <div className="inline-flex rounded-[12px] bg-[#f2f2f2] p-1">
      {TABS.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <Link
            key={tab.id}
            to={tab.href}
            className={cn(
              "whitespace-nowrap rounded-[10px] px-6 py-2 text-[16px] transition",
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

type UsersTableProps = {
  rows: Array<{
    name: string;
    avatar: string;
    status: string;
    dateAdded: string;
  }>;
};

export function UsersTable({ rows }: UsersTableProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-[minmax(0,1fr)_140px_150px] border-b border-[#e9e9e9] py-3 text-[15px] text-[#1f1f1f]">
        <div className="px-4">User</div>
        <div className="px-4">Status</div>
        <div className="px-4">Date added</div>
      </div>

      <div>
        {rows.map((row) => (
          <div
            key={`${row.name}-${row.dateAdded}`}
            className="grid grid-cols-[minmax(0,1fr)_140px_150px] items-center border-b border-[#f1f1f1] py-5 text-[15px] text-[#222]"
          >
            <div className="flex items-center gap-4 px-4">
              <img
                src={row.avatar}
                alt={row.name}
                className="size-10 rounded-full object-cover"
              />
              <span className="text-[16px]">{row.name}</span>
            </div>
            <div className="px-4">
              <span className="rounded-full bg-[#e6e9ff] px-3 py-1 text-[14px] text-[#3846ff]">
                {row.status}
              </span>
            </div>
            <div className="px-4 text-[16px] text-[#1f1f1f]">
              {row.dateAdded}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
