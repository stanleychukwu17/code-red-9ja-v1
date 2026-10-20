import { useEffect, useMemo, useState } from "react";
import { useDebounceValue, useIntersectionObserver } from "usehooks-ts";
import { Check, Loader2, Search, X } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "../command";
import { Dialog, DialogContent, DialogFooter, DialogPadding, DialogTitle } from "../dialog";
import { Button } from "../button";
import { AppAvatar } from "../avatar";
import { IconInput } from "../input";
import FancyCheckIcon from "../../icons/fancy-check-icon";

export type UserChapter = {
  id: number;
  party_id: number;
  chapter_type: string;
  country_name?: string;
  zone_name?: string;
  state_name?: string;
  lga_name?: string;
  ward_name?: string;
};

export type UserCandidacy = {
  id: number;
  election_id: number;
  election_group_id: number;
  party_id: number;
  party_short_name?: string;
  party_logo?: string;
  election_name: string;
  election_date?: string;
  scope?: string;
  election_status: string;
  office_name?: string;
  candidacy_type: string;
};

export type User = {
  id: number;
  first_name: string;
  last_name: string;
  username?: string;
  avatar?: string;
  party_id?: number;
  party_short_name?: string;
  party_logo?: string;
  party_basic_info?: {
    id?: number;
    short_name?: string;
    name?: string;
    logo?: string;
    color_hex?: string;
    is_verified?: boolean;
  };
  chapters?: UserChapter[];
  candidacies?: UserCandidacy[];
  role?: string;
};

type UserFinderCommandProps = {
  open: boolean;
  onClose: () => void;
  onAddUsers: (selectedUsers: User[]) => void;
  alreadySelectedIds: number[];
  fetchUsers: (params: { cursor?: string | number; search?: string }) => Promise<{ users: User[]; nextCursor?: string | number | null }>;
  filterRole?: string;
  filterPartyId?: number;
  title?: string;
  placeholder?: string;
  selectMode?: "single" | "multiple";
};

/**
 * Renders user's geopolitical party chapter affiliations (State, LGA, Ward)
 * in a responsive 3-column horizontal split.
 */
function UserChaptersList({ chapters }: { chapters?: UserChapter[] }) {
  if (!chapters || chapters.length === 0) return null;

  // Extract the specific geopolitical chapter levels
  const stateName = chapters.find((ch) => ch.state_name)?.state_name;
  const lgaName = chapters.find((ch) => ch.lga_name)?.lga_name;
  const wardName = chapters.find((ch) => ch.ward_name)?.ward_name;

  if (!stateName && !lgaName && !wardName) return null;

  return (
    <div className="w-full flex items-center mt-2">
      {/* State Chapter */}
      {stateName && (
        <div className="text-xs w-[33%] min-w-0 pr-2">
          <div className="text-[11px] text-c-50 leading-tight truncate">State chapter</div>
          <div className="pt-1 text-xs font-medium text-c-80 leading-tight truncate">{stateName}</div>
        </div>
      )}
      {/* LGA Chapter */}
      {lgaName && (
        <div className="text-xs w-[33%] min-w-0 pr-2">
          <div className="text-[11px] text-c-50 leading-tight truncate">LGA chapter</div>
          <div className="pt-1 text-xs font-medium text-c-80 leading-tight truncate">{lgaName}</div>
        </div>
      )}
      {/* Ward Chapter */}
      {wardName && (
        <div className="text-xs w-[33%] min-w-0">
          <div className="text-[11px] text-c-50 leading-tight truncate">Ward chapter</div>
          <div className="pt-1 text-xs font-medium text-c-80 leading-tight truncate">{wardName}</div>
        </div>
      )}
    </div>
  );
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 300);

  // Fetch users list with infinite scrolling
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery<{ users: User[]; nextCursor?: string | number | null }>({
    queryKey: ["users-select-existing", filterRole, filterPartyId, debouncedSearchQuery],
    queryFn: async ({ pageParam }) => {
      return fetchUsers({ cursor: pageParam as string | number | undefined, search: debouncedSearchQuery });
    },
    getNextPageParam: (lastPage) => lastPage?.nextCursor || undefined,
    initialPageParam: undefined as string | number | undefined,
    enabled: open,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // Auto-fetch next page on scroll via useIntersectionObserver
  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Reset local state when dialog opens
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSelectedUsers([]);
    }
  }, [open]);

  // Flatten paginated results into a single array
  const users = useMemo(() => (data?.pages ? data.pages.flatMap((p) => p.users) : []), [data]);

  // Filter users by already added check. 
  // (Search, role, and party filtering is now handled natively by the backend via fetchUsers).
  const filteredUsers = users.filter((u) => {
    return !alreadySelectedIds.includes(u.id);
  });

  // Handle user selection: immediate dispatch for single mode, or toggle within buffer for multiple mode
  const handleToggleSelect = (user: User) => {
    // In single-select mode, immediately confirm selection and dismiss dialog
    if (selectMode === "single") {
      onAddUsers([user]);
      onClose();
      return;
    }

    // In multi-select mode, toggle inclusion in the staging buffer
    if (selectedUsers.some((u) => u.id === user.id)) {
      setSelectedUsers((prev) => prev.filter((u) => u.id !== user.id));
    } else {
      setSelectedUsers((prev) => [...prev, user]);
    }
  };

  // Remove a specific user chip from the staged selections
  const handleRemoveSelectedTag = (userId: number) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  // Finalize and submit all staged users in multi-select mode
  const handleAddAll = () => {
    onAddUsers(selectedUsers);
    onClose();
  };

  return (
    // Main modal dialog wrapper with backdrop and 85vh max height
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[680px] p-0 rounded-[24px] border-none shadow-2xl bg-white overflow-hidden max-h-[85vh] flex flex-col gap-0">
        <Command
          className="flex-1 flex flex-col bg-transparent overflow-hidden h-full"
          shouldFilter={false}
        >
          <DialogPadding className="py-5 flex flex-col gap-3 flex-1 min-h-0">
            {/* Title Header (if provided) */}
            {title && (
              <DialogTitle className="text-[18px] font-semibold text-c-90 px-0.5">
                {title}
              </DialogTitle>
            )}

            {/* Search bar input that takes the query and debounces it (300ms) before querying fetchUsers */}
            <IconInput
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 shrink-0"
            />

            {/* Horizontal tags list showing pills of selected members with remove (X) buttons (multi-select mode only) */}
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

            {/* Scrollable container (max-h-[70vh]) for results */}
            <CommandList className="flex-1 overflow-y-auto min-h-[250px] max-h-[70vh] pointer-events-auto pb-10">
              {/* Loading spinner */}
              {isLoading ? (
                <div className="py-12 flex justify-center items-center">
                  <Loader2 className="size-8 text-[#00cf79] animate-spin" />
                </div>
              ) : filteredUsers.length === 0 ? (
                /* Empty state when no users match */
                <CommandEmpty className="py-12 text-center text-[15px] text-gray-400 font-semibold">
                  No users found
                </CommandEmpty>
              ) : (
                /* Result list mapping through filteredUsers */
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
                          <div className="flex items-center gap-3.5 md:gap-4 py-1.5 w-full min-w-0 cursor-pointer">
                            {/* Avatar with party logo overlay badge */}
                            <div className="relative shrink-0">
                              <AppAvatar
                                src={user.avatar}
                                alt={`${user.first_name} ${user.last_name}`}
                                className="size-17 rounded-full aspect-square object-cover"
                              />
                              {(user.party_logo || user.party_basic_info?.logo) && (
                                <img
                                  src={user.party_logo || user.party_basic_info?.logo}
                                  alt={user.party_short_name || user.party_basic_info?.short_name || "Party"}
                                  className="size-6 rounded-full absolute -bottom-0.5 -right-0.5 border border-white bg-white shadow-xs object-contain"
                                />
                              )}
                            </div>

                            {/* Candidate details: Full name, party code, chapters, and active candidacies */}
                            <div className="flex flex-col min-w-0 flex-1 text-left">
                              <span className="font-semibold text-[15px] text-c-90 truncate leading-snug">
                                {`${user.first_name} ${user.last_name}`}
                              </span>
                              {user.username && (
                                <span className="text-[11px] text-c-40 font-normal leading-none truncate mt-0.5">
                                  @{user.username.replace(/^@/, "")}
                                </span>
                              )}

                              {/* Geopolitical Chapter Affiliations (State, LGA, and Ward tiers) */}
                              <UserChaptersList chapters={user.chapters} />

                              {/* Active Candidacies Warning Badge (if running in other elections) */}
                              {user.candidacies && user.candidacies.length > 0 && (
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {user.candidacies.map((can) => (
                                    <span
                                      key={can.election_id}
                                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60"
                                    >
                                      <span>Running:</span>
                                      <span className="font-semibold">{can.office_name || can.election_name}</span>
                                      {can.candidacy_type === "running_mate" && (
                                        <span className="opacity-80 text-[10px]">(Running Mate)</span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Checkmark icon when a user is selected in multiple mode */}
                          {selectMode === "multiple" && isSelected && (
                            <div className="shrink-0 [&_svg]:size-6">
                              <FancyCheckIcon />
                            </div>
                          )}
                        </CommandItem>
                      );
                    })}
                  </div>

                  {/* Intersection observer sentinel element at the bottom of the list that triggers fetchNextPage() as you scroll down */}
                  {hasNextPage && (
                    <div
                      ref={sentinelRef}
                      className="py-6 flex items-center justify-center text-c-50 text-[14px]"
                    >
                      {isFetchingNextPage ? (<Loader2 className="size-5 animate-spin mr-2" />) : null}
                      {isFetchingNextPage ? "Loading more..." : "Scroll down to load more"}
                    </div>
                  )}
                </CommandGroup>
              )}
            </CommandList>
          </DialogPadding>
        </Command>

        {/* Footer containing the "Add all selected" button (only visible when selectMode === "multiple") */}
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
