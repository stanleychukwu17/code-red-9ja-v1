import * as React from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
  fetchUsers: () => Promise<User[]>;
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

  // Fetch users list
  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ["users-select-existing", filterRole, filterPartyId],
    queryFn: async () => {
      const users = await fetchUsers();
      return users;
    },
    enabled: open,
  });

  // Reset local state when dialog opens
  React.useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSelectedUsers([]);
    }
  }, [open]);

  const users = usersResponse || [];

  // Filter users by search input, role, party, and already added check
  const filteredUsers = users.filter((u) => {
    const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase());
    const isAlreadyAdded = alreadySelectedIds.includes(u.id);

    // role filter (if provided)
    const matchesRole = filterRole ? u.role === filterRole : true;

    // party filter (if provided)
    const matchesParty =
      filterPartyId !== undefined ? u.party_id === filterPartyId : true;

    return matchesSearch && !isAlreadyAdded && matchesRole && matchesParty;
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
          <DialogPadding className="py-5 space-y-3">
            <IconInput
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12"
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

            <CommandList className="flex-1 overflow-y-auto min-h-[250px] max-h-none pointer-events-auto">
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
