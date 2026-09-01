import * as React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";

interface Item {
  id: number | string;
  name: string;
}

interface SelectionTabsProps<T extends Item> {
  mode: "custom" | "all";
  setMode: (mode: "custom" | "all") => void;
  items: T[];
  allItems: T[];
  setItems: (items: T[]) => void;
  customLabel?: string;
  allLabel?: string;
}

export function SelectionTabs<T extends Item>({
  mode,
  setMode,
  items,
  allItems,
  setItems,
  customLabel = "Custom",
  allLabel,
}: SelectionTabsProps<T>) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => {
          setMode("custom");
          setItems([]);
        }}
        className={cn(
          "h-9 px-4 rounded-lg text-sm font-semibold transition cursor-pointer",
          mode === "custom"
            ? "bg-secondary/20 text-c-80"
            : "bg-transparent text-c-80 hover:bg-black/5"
        )}
      >
        {customLabel}
      </button>
      <button
        type="button"
        onClick={() => {
          setMode("all");
          setItems(allItems);
        }}
        className={cn(
          "h-9 px-4 rounded-lg text-sm font-semibold transition cursor-pointer",
          mode === "all"
            ? "bg-secondary/20 text-c-80"
            : "bg-transparent text-c-80 hover:bg-black/5"
        )}
      >
        {allLabel || `All (${allItems.length})`}
      </button>
    </div>
  );
}

interface SelectionHeaderProps {
  label: string;
  buttonLabel: string;
  onOpenSelector: () => void;
}

export function SelectionHeader({
  label,
  buttonLabel,
  onOpenSelector,
}: SelectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[15px] font-semibold text-c-70">{label}</span>
      <Button
        type="button"
        variant="black"
        size="lg"
        onClick={onOpenSelector}
        className="px-5"
      >
        <Plus className="size-4" />
        <span>{buttonLabel}</span>
      </Button>
    </div>
  );
}

interface SelectedItemsContainerProps<T extends Item> {
  items: T[];
  onRemove?: (item: T) => void;
  emptyPlaceholder: string;
  children?: React.ReactNode;
}

export function SelectedItemsContainer<T extends Item>({
  items,
  onRemove,
  emptyPlaceholder,
  children,
}: SelectedItemsContainerProps<T>) {
  return (
    <div className="min-h-32 rounded-xl bg-c-5 p-2 flex flex-col max-h-[300px] overflow-y-auto">
      {items.length === 0 ? (
        <div className="flex-1 w-full flex items-center justify-center">
          <p className="text-[15px] text-c-40 font-semibold">
            {emptyPlaceholder}
          </p>
        </div>
      ) : children ? (
        children
      ) : (
        <div className="flex flex-wrap gap-2 w-full">
          {items.map((item) => (
            <div
              key={item.id}
              className="h-9 flex items-center gap-2.5 pl-3 pr-2 bg-background rounded-[10px] text-sm text-c-80"
            >
              <span>{item.name}</span>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(item)}
                  className="text-c-40 hover:text-red transition cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SelectableChipProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  className?: string;
}

export function SelectableChip({
  label,
  isSelected,
  onClick,
  className,
}: SelectableChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-lg text-sm transition cursor-pointer",
        isSelected
          ? "bg-secondary/20 font-medium text-c-80"
          : "bg-c-5 text-c-80 hover:bg-black/5",
        className
      )}
    >
      {label}
    </button>
  );
}

export function GroupSectionTitle({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  return (
    <h4 className={cn("text-[14px] font-bold text-c-75 pb-1", className)}>
      {title}
    </h4>
  );
}

