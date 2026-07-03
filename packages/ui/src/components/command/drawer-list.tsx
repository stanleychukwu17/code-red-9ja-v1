import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";
import { IconInput } from "../input";

export type DrawerListStatus =
  | "CanLoadMore"
  | "LoadingMore"
  | "LoadingFirstPage"
  | "Exhausted";

export type DrawerListProps<T> = {
  data: T[];
  selectedId: string | undefined;
  handleSelect: (item: T) => void;
  getId: (item: T) => string;
  getName: (item: T) => string;
  getLabel?: (item: T) => React.ReactNode;
  getDescription?: (item: T) => string | React.ReactNode;
  /** Right-aligned supplementary label (e.g. a date). Renders to the left of the check mark. */
  getExtra?: (item: T) => React.ReactNode;
  /** Controlled search value — use when the parent manages search state */
  searchValue?: string;
  onSearch?: (value: string) => void;
  status?: DrawerListStatus;
  loadMore?: () => void;
  disableSearch?: boolean;
  emptyText?: string;
};

/**
 * DrawerList — the mobile-native counterpart to GeneralCommand.
 *
 * Renders a search input (optional) + a plain scrollable list of items
 * designed to live inside a Drawer. Uses the drawer's own scroll so there
 * are no nested-scroll conflicts. No virtualiser or Command overhead.
 *
 * The API mirrors GeneralCommand so the two can be swapped in place.
 */
export function DrawerList<T>({
  data,
  selectedId,
  handleSelect,
  getId,
  getName,
  getLabel,
  getDescription,
  getExtra,
  searchValue,
  onSearch,
  status,
  loadMore,
  disableSearch = false,
  emptyText = "None found.",
}: DrawerListProps<T>) {
  // Internal search state used when the parent doesn't control it
  const [internalSearch, setInternalSearch] = useState("");

  const search = searchValue !== undefined ? searchValue : internalSearch;

  const handleSearchChange = (value: string) => {
    if (searchValue === undefined) setInternalSearch(value);
    onSearch?.(value);
  };

  // Filter items locally (skip when caller manages filtering via onSearch)
  const filtered = onSearch
    ? data // caller handles filtering externally
    : data.filter((item) =>
        getName(item).toLowerCase().includes(search.toLowerCase()),
      );

  return (
    <div className="flex flex-col" style={{ maxHeight: "75dvh" }}>
      {/* Search input */}
      {!disableSearch && (
        <div className="px-3 pt-3 pb-3 shrink-0">
          <IconInput
            placeholder="Search..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      )}

      {/* Scrollable list — relies on the parent Drawer's scroll container */}
      <div className="flex-1 overflow-y-auto px-3 pb-10">
        {status === "LoadingFirstPage" ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-c-50 py-8 text-sm">{emptyText}</p>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((item) => {
              const id = getId(item);
              const isSelected = selectedId === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 px-3 py-3.5 rounded-xl text-left transition-colors",
                      isSelected
                        ? "bg-c-10 text-c-900"
                        : "hover:bg-c-10/60 active:bg-c-10 text-c-800",
                    )}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-base font-medium leading-snug truncate">
                        {getLabel ? getLabel(item) : getName(item)}
                      </span>
                      {getDescription && (
                        <span className="block text-sm text-c-50 truncate mt-0.5">
                          {getDescription(item)}
                        </span>
                      )}
                    </span>
                    {getExtra && (
                      <span className="text-sm text-c-50 shrink-0">
                        {getExtra(item)}
                      </span>
                    )}
                    <Check
                      className={cn(
                        "size-4 shrink-0 transition-opacity",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Load-more indicator */}
        {status === "LoadingMore" && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
