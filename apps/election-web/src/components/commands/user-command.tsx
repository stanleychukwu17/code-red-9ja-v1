import { Check } from "lucide-react";
import React, { useEffect, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/ui/components/command";
import { AppAvatar } from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";
import LoadingCircleIcon from "@repo/ui/icons/loading-circle-icon";

type UserCommandProps<T> = {
  data: T[];
  selectedId: string | undefined;
  handleSelect: (item: T) => void;
  getId: (item: T) => string;
  getName: (item: T) => string;
  getAvatar: (item: T) => string;
  status?: "CanLoadMore" | "LoadingMore" | "LoadingFirstPage" | "Exhausted";
  loadMore?: (numItems: number) => void;
  onSearch?: (search: string) => void;
};

export function UserCommand<T>({
  data,
  selectedId,
  handleSelect,
  getId,
  getName,
  getAvatar,
  status,
  loadMore,
  onSearch,
}: UserCommandProps<T>) {
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
      <CommandInput
        placeholder="Search..."
        className="h-9"
        onValueChange={setSearch}
      />
      <CommandList className="max-h-none overflow-visible">
        {data.length === 0 && status !== "LoadingFirstPage" ? (
          <CommandEmpty>None found.</CommandEmpty>
        ) : (
          <div
            className="max-h-80 overflow-y-auto overflow-x-hidden touch-pan-y overscroll-contain"
            onScroll={handleScroll}
          >
            <CommandGroup>
              {data.map((item) => (
                <CommandItem
                  key={getId(item)}
                  value={getName(item)}
                  onSelect={() => handleSelect(item)}
                  className="gap-3"
                >
                  <AppAvatar
                    src={getAvatar(item)}
                    fallbackText={"A"}
                    alt="Profile picture"
                    className="aspect-square size-7 md:size-6 rounded-full"
                  />
                  {getName(item)}
                  <Check
                    className={cn(
                      "ml-auto",
                      selectedId === getId(item) ? "opacity-100" : "opacity-0",
                    )}
                  />
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
