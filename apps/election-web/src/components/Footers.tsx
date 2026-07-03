import { cn } from "@repo/ui/lib/utils";

export function StickyFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 left-0 mt-auto px-4 pt-2 pb-8 flex flex-col gap-4 bg-background/90 backdrop-blur-2xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
