import { Plus } from "lucide-react";
import type { ReactNode } from "react";

type PartiesLayoutProps = {
  children: ReactNode;
};

type PartiesTableProps = {
  rows: Array<{
    code: string;
    name: string;
    logo: string;
    puAgents: string;
  }>;
};

export function PartiesLayout({ children }: PartiesLayoutProps) {
  return (
    <main className="mx-auto flex w-full max-w-[1360px] flex-col gap-4 px-8 py-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#1e1e1e]">
          Parties
        </h1>

        <button className="flex h-12 items-center gap-2 rounded-[12px] bg-[#242424] px-5 text-[16px] text-white transition hover:bg-[#111]">
          <Plus className="size-5" />
          <span>Add</span>
        </button>
      </div>

      <div className="overflow-hidden rounded-[16px] border border-[#e9e9e9] bg-white">
        {children}
      </div>
    </main>
  );
}

export function PartiesTable({ rows }: PartiesTableProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-[120px_minmax(0,1fr)_180px] border-b border-[#e9e9e9] py-3 text-[15px] text-[#1f1f1f]">
        <div className="px-4">Party</div>
        <div className="px-4">Name</div>
        <div className="px-4 text-right">PU agents</div>
      </div>

      <div>
        {rows.map((row) => (
          <div
            key={row.code}
            className="grid grid-cols-[120px_minmax(0,1fr)_180px] items-center py-5 text-[15px] text-[#222]"
          >
            <div className="flex items-center gap-4 px-4">
              <img
                src={row.logo}
                alt={row.code}
                className="size-10 rounded-full object-cover"
              />
              <span className="text-[16px]">{row.code}</span>
            </div>
            <div className="px-4 text-[16px]">{row.name}</div>
            <div className="px-4 text-right text-[16px]">{row.puAgents}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
