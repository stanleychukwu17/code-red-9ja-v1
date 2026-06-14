import { Check } from "lucide-react";
import React, { ReactNode, useEffect, useState } from "react";
import { cn } from "../../lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../command";
import LoadingCircleIcon from "../../icons/loading-circle-icon";

type GeneralCommandProps<T> = {
  data: T[];
  selectedId?: string | undefined;
  handleSelect: (item: T) => void | Promise<void>;
  getId: (item: T) => string;
  getName: (item: T) => string;
  getDescription?: (item: T) => string | ReactNode;
  getExtra?: (item: T) => string;
  disableSearch?: boolean;
  status?: "CanLoadMore" | "LoadingMore" | "LoadingFirstPage" | "Exhausted";
  loadMore?: (numItems: number) => void;
  onSearch?: (search: string) => void;
};

export function GeneralCommand2<T>({
  data,
  selectedId,
  handleSelect,
  getId,
  getName,
  getDescription,
  getExtra,
  disableSearch,
  status,
  loadMore,
  onSearch,
}: GeneralCommandProps<T>) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    onSearch?.(search);
  }, [search, onSearch]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (status !== "CanLoadMore" || !loadMore) return;

    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      loadMore(20);
    }
  };

  return (
    <Command shouldFilter={status === undefined}>
      {!disableSearch && (
        <CommandInput placeholder="Search..." onValueChange={setSearch} />
      )}
      <CommandList className="max-h-none overflow-visible">
        {data.length === 0 && status !== "LoadingFirstPage" ? (
          <CommandEmpty>None found.</CommandEmpty>
        ) : (
          <div
            className="max-h-80 overflow-y-auto overflow-x-hidden touch-pan-y overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onScroll={handleScroll}
          >
            <CommandGroup>
              {data.map((item, i) => (
                <CommandItem
                  key={getId(item) + i.toString()}
                  value={getName(item)}
                  onSelect={() => handleSelect(item)}
                  className="flex-col items-start justify-center gap-1"
                >
                  <div className="flex items-center gap-2 w-full">
                    <p className="w-full">{getName(item)}</p>
                    <Check
                      className={cn(
                        "ml-auto",
                        selectedId === getId(item)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {getExtra && (
                      <p className="text-sml text-c-50 line-clamp-1">
                        {getExtra(item)}
                      </p>
                    )}
                  </div>
                  {getDescription && (
                    <p className="text-c-50 text-sm">{getDescription(item)}</p>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            {(status === "LoadingMore" || status === "LoadingFirstPage") && (
              <div className="flex justify-center p-4">
                <LoadingCircleIcon className="size-4" />
              </div>
            )}
          </div>
        )}
      </CommandList>
    </Command>
  );
}
