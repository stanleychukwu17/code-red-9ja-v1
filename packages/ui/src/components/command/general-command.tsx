import { Check } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../command";
import { cn } from "../../lib/utils";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { IconInput } from "../input";

type GeneralCommandProps<T> = {
  data: T[];
  selectedId: string | undefined;
  handleSelect: (item: T) => void;
  getId: (item: T) => string;
  getName: (item: T) => string;
  getLabel?: (item: T) => ReactNode;
  getDescription?: (item: T) => string | ReactNode;
  getExtra?: (item: T) => string;
  disableSearch?: boolean;
  tileSize?: number;
  status?: "CanLoadMore" | "LoadingMore" | "LoadingFirstPage" | "Exhausted";
  loadMore?: (numItems: number) => void;
  onSearch?: (search: string) => void;
  beforeList?: ReactNode;
  children?: ReactNode;
  showAll?: boolean;
  onSelectAll?: () => void;
};

export function GeneralCommand<T>({
  data,
  selectedId,
  handleSelect,
  getId,
  getName,
  getLabel,
  getDescription,
  getExtra,
  disableSearch,
  tileSize = 44,
  status,
  loadMore,
  onSearch,
  beforeList,
  children,
  showAll,
  onSelectAll,
}: GeneralCommandProps<T>) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    onSearch?.(search);
  }, [search, onSearch]);

  // filter items manually based on search ONLY if not paginating
  const filteredItems = useMemo(() => {
    if (status !== undefined) return data; // Skip manual filter if using paginated data
    if (!search) return data;
    return data.filter((item) => {
      const name = getName(item).toLowerCase();
      const extra = getExtra ? getExtra(item).toLowerCase() : "";
      const description = getDescription ? getDescription(item) : "";
      const descriptionStr =
        typeof description === "string" ? description.toLowerCase() : "";

      return (
        name.includes(search.toLowerCase()) ||
        extra.includes(search.toLowerCase()) ||
        descriptionStr.includes(search.toLowerCase())
      );
    });
  }, [data, search, getName, getExtra, getDescription]);

  const rowVirtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => tileSize,
    overscan: 5,
    measureElement: (el) => el.getBoundingClientRect().height,
    // Provide a non-zero initial rect so items render immediately when the
    // scroll container hasn't been painted yet (e.g. inside a popover on first open)
    initialRect: { width: 0, height: 320 },
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;

    if (
      lastItem.index >= filteredItems.length - 1 &&
      status === "CanLoadMore" &&
      loadMore
    ) {
      loadMore(20);
    }
  }, [virtualItems, status, loadMore, filteredItems.length]);

  return (
    <Command shouldFilter={status === undefined} className="w-full">
      {!disableSearch && (
        <div className="mx-2">
          <IconInput
            placeholder="Search..."
            onChange={(e) => setSearch(e.target.value)} // capture search value
          />
        </div>
      )}
      <CommandList className="max-h-none overflow-visible">
        {beforeList}
        {filteredItems.length === 0 && status !== "LoadingFirstPage" ? (
          <CommandEmpty>None found.</CommandEmpty>
        ) : (
          <CommandGroup>
            {showAll && (
              <CommandItem
                value="__all__"
                onSelect={() => onSelectAll?.()}
                className="flex items-center gap-2 py-2 px-3 cursor-pointer"
              >
                <div className="leading-5 font-[450] font-normal flex-1 min-w-0">
                  All
                </div>
                <Check
                  className={cn(
                    "shrink-0",
                    !selectedId ? "opacity-100" : "opacity-0",
                  )}
                />
              </CommandItem>
            )}
            <div
              ref={parentRef}
              className="max-h-80 overflow-y-auto overflow-x-hidden touch-pan-y overscroll-contain"
              onWheel={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              <div
                style={{ height: rowVirtualizer.getTotalSize() }}
                className="relative w-full"
              >
                {virtualItems.map((virtualRow) => {
                  const item = filteredItems[virtualRow.index];
                  if (!item) return null;
                  return (
                    <div
                      ref={rowVirtualizer.measureElement}
                      key={getId(item)}
                      className="absolute top-0 left-0 w-full"
                      style={{
                        transform: `translateY(${virtualRow.start}px)`,
                        height: `${virtualRow.size}px`,
                        minHeight: `${tileSize}px`, // Ensure minimum height
                      }}
                    >
                      <CommandItem
                        value={getName(item)}
                        onSelect={() => handleSelect(item)}
                        className="flex items-start gap-0 flex-col py-2 px-3 h-full cursor-pointer"
                      >
                        <div className="flex items-center gap-2 w-full flex-1 min-w-0">
                          <div className="leading-5 font-[450] font-normal truncate flex-1 min-w-0">
                            {getLabel ? getLabel(item) : getName(item)}
                          </div>
                          <Check
                            className={cn(
                              "shrink-0",
                              selectedId === getId(item)
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {getExtra && (
                            <p className="text-sml text-c-50 truncate text-left max-w-32 shrink-0">
                              {getExtra(item)}
                            </p>
                          )}
                        </div>
                        {getDescription && (
                          <p className="text-c-50 text-sm mt-1 truncate w-full">
                            {getDescription(item)}
                          </p>
                        )}
                      </CommandItem>
                    </div>
                  );
                })}
              </div>
              {(status === "LoadingMore" || status === "LoadingFirstPage") && (
                <div className="flex justify-center p-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                </div>
              )}
            </div>
          </CommandGroup>
        )}
        {children}
      </CommandList>
    </Command>
  );
}
