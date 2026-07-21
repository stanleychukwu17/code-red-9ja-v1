import * as React from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "../command";
import { Dialog, DialogContent, DialogFooter, DialogPadding } from "../dialog";
import { Button } from "../button";
import { AppAvatar } from "../avatar";
import { IconInput } from "../input";
import FancyCheckIcon from "../../icons/fancy-check-icon";

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  avatar?: string;
  party_id?: number;
  party_short_name?: string;
  party_logo?: string;
  role?: string;
}

interface UserFinderCommandProps {
  open: boolean;
  onClose: () => void;
  onAddUsers: (selectedUsers: User[]) => void;
  alreadySelectedIds: number[];
  fetchUsers: (params: { cursor?: string | number, search?: string }) => Promise<{ users: User[], nextCursor?: string | number | null }>;
  filterRole?: string;
  filterPartyId?: number;
  title?: string;
  placeholder?: string;
  selectMode?: "single" | "multiple";
}

export function UserFinderCommand({
  open,
  onClose,
  onAddUsers,
  alreadySelectedIds,
  fetchUsers,
  filterRole,
  filterPartyId,
  title = "Search users",
  placeholder = "Search",
  selectMode = "single",
}: UserFinderCommandProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedUsers, setSelectedUsers] = React.useState<User[]>([]);

  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState("");

  // Debounce search query
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch users list with infinite scrolling
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery<{ users: User[]; nextCursor?: string | number | null }>({
    queryKey: ["users-select-existing", filterRole, filterPartyId, debouncedSearchQuery],
    queryFn: async ({ pageParam }) => {
      return fetchUsers({ cursor: pageParam as string | number | undefined, search: debouncedSearchQuery });
    },
    getNextPageParam: (lastPage) => lastPage?.nextCursor || undefined,
    initialPageParam: undefined as string | number | undefined,
    enabled: open,
  });

  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const loadMoreRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoading || isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage],
  );

  // Reset local state when dialog opens
  React.useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSelectedUsers([]);
    }
  }, [open]);

  const users = React.useMemo(
    () => (data?.pages ? data.pages.flatMap((p) => p.users) : []),
    [data],
  );

  // Filter users by already added check. 
  // (Search, role, and party filtering is now handled natively by the backend via fetchUsers).
  const filteredUsers = users.filter((u) => {
    return !alreadySelectedIds.includes(u.id);
  });

  const handleToggleSelect = (user: User) => {
    if (selectMode === "single") {
      onAddUsers([user]);
      onClose();
      return;
    }

    if (selectedUsers.some((u) => u.id === user.id)) {
      setSelectedUsers((prev) => prev.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers((prev) => [...prev, user]);
    }
  };

  const handleRemoveSelectedTag = (userId: number) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleAddAll = () => {
    onAddUsers(selectedUsers);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[680px] p-0 rounded-[24px] border-none shadow-2xl bg-white overflow-hidden max-h-[85vh] flex flex-col gap-0">
        <Command
          className="flex-1 flex flex-col bg-transparent overflow-hidden h-full"
          shouldFilter={false}
        >
          <DialogPadding className="py-5 flex flex-col gap-3 flex-1 min-h-0">
            <IconInput
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 shrink-0"
            />

            {selectMode === "multiple" && selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2.5 shrink-0 max-h-[100px] overflow-y-auto">
                {selectedUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleRemoveSelectedTag(u.id)}
                    className="h-10 flex items-center gap-2 px-3 py-2 bg-c-10 hover:bg-red/20 hover:[&_svg]:text-red text-sm text-c-80 rounded-[10px] transition cursor-pointer"
                  >
                    <span>{`${u.first_name} ${u.last_name}`}</span>
                    <X className="size-4 text-[#6b7280]" />
                  </div>
                ))}
              </div>
            )}

            <CommandList className="flex-1 overflow-y-auto min-h-[250px] max-h-[70vh] pointer-events-auto pb-10">
              {isLoading ? (
                <div className="py-12 flex justify-center items-center">
                  <Loader2 className="size-8 text-[#00cf79] animate-spin" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <CommandEmpty className="py-12 text-center text-[15px] text-gray-400 font-semibold">
                  No users found
                </CommandEmpty>
              ) : (
                <CommandGroup className="p-0">
                  <div className="space-y-1">
                    {filteredUsers.map((user) => {
                      const isSelected = selectedUsers.some(
                        (u) => u.id === user.id,
                      );
                      return (
                        <CommandItem
                          key={user.id}
                          value={user.id.toString()}
                          onSelect={() => handleToggleSelect(user)}
                        >
                          <div className="flex items-center gap-3.5 md:gap-5 w-full">
                            <AppAvatar
                              src={user.avatar}
                              alt={`${user.first_name} ${user.last_name}`}
                              fallbackText={user.first_name
                                .charAt(0)
                                .toUpperCase()}
                              className="size-11 rounded-full aspect-square object-cover"
                            />
                            <span className="font-medium text-[16px] text-c-90">
                              {`${user.first_name} ${user.last_name}`}
                            </span>
                          </div>

                          {selectMode === "multiple" && isSelected && (
                            <div className="shrink-0 [&_svg]:size-6">
                              <FancyCheckIcon />
                            </div>
                          )}
                        </CommandItem>
                      );
                    })}
                  </div>
                  {/* Sentinel element for infinite scroll */}
                  {hasNextPage && (
                    <div
                      ref={loadMoreRef}
                      className="py-6 flex items-center justify-center text-c-50 text-[14px]"
                    >
                      {isFetchingNextPage ? (
                        <Loader2 className="size-5 animate-spin mr-2" />
                      ) : null}
                      {isFetchingNextPage
                        ? "Loading more..."
                        : "Scroll down to load more"}
                    </div>
                  )}
                </CommandGroup>
              )}
            </CommandList>
          </DialogPadding>
        </Command>

        {/* Footer with primary black button (only in multiple selection mode) */}
        {selectMode === "multiple" && (
          <DialogFooter>
            <Button
              variant="secondary"
              size="xl"
              type="button"
              onClick={handleAddAll}
              disabled={selectedUsers.length === 0}
            >
              Add all selected
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
