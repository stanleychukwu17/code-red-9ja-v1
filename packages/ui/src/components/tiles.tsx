import { cn } from "../lib/utils";

export function TileHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-10 border-y border-border flex items-center justify-between gap-5 md:gap-20 px-3 text-[15px]">
      {children}
    </div>
  );
}

export function TileRow({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "h-14 flex items-center justify-between gap-5 md:gap-20 px-3 hover:bg-c-5 duration-200 cursor-pointer",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TileLeft({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full min-w-0 items-center gap-4 px-0">
      {children}
    </div>
  );
}

export function TileRight({ children }: { children: React.ReactNode }) {
  return (
    <div className="shrink-0 flex items-center gap-3 text-c-70">{children}</div>
  );
}
