import * as React from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/ui/components/command";
import {
  Dialog,
  DialogContent,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { AppAvatar } from "@repo/ui/components/avatar";
import { getUsersList } from "#/lib/server/users";

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  avatar?: string;
  party_id?: number;
  party_short_name?: string;
  party_logo?: string;
}

interface CandidateFinderCommandProps {
  open: boolean;
  onClose: () => void;
  onAddCandidates: (selectedUsers: User[]) => void;
  alreadySelectedIds: number[];
}

export function CandidateFinderCommand({
  open,
  onClose,
  onAddCandidates,
  alreadySelectedIds,
}: CandidateFinderCommandProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedUsers, setSelectedUsers] = React.useState<User[]>([]);

  // Fetch users list
  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ["users-select-existing"],
    queryFn: async () => {
      const res = await getUsersList();
      if (res && res.success && res.data?.users) {
        return res.data.users as User[];
      }
      throw new Error(res?.message || "Failed to fetch users");
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

  // Filter users by search input (excluding already added to the election list)
  const filteredUsers = users.filter((u) => {
    const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase());
    const isAlreadyAdded = alreadySelectedIds.includes(u.id);
    return matchesSearch && !isAlreadyAdded;
  });

  const handleToggleSelect = (user: User) => {
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
    onAddCandidates(selectedUsers);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[620px] p-6 rounded-[32px] border-none shadow-2xl bg-white overflow-hidden max-h-[85vh] flex flex-col gap-0">
        
        {/* Custom Header with Search Icon built using Command primitives */}
        <Command className="flex-1 flex flex-col bg-transparent overflow-hidden h-full" shouldFilter={false}>
          
          {/* Custom styled CommandInput styled specifically to match screenshot */}
          <div className="relative shrink-0 mb-4 bg-[#f3f4f6] rounded-2xl flex items-center px-4 h-14">
            <Search className="size-5 text-[#9ca3af] mr-2 shrink-0" />
            <input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-[#111827] text-[16px] placeholder-[#9ca3af] border-none focus:outline-none"
            />
          </div>

          {/* Selected Candidate Tags/Badges */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2.5 pb-4 shrink-0 max-h-[100px] overflow-y-auto">
              {selectedUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleRemoveSelectedTag(u.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[14px] text-[#374151] font-semibold rounded-xl transition cursor-pointer"
                >
                  <span>{`${u.first_name} ${u.last_name}`}</span>
                  <X className="size-4 text-[#6b7280]" />
                </div>
              ))}
            </div>
          )}

          {/* Candidates list powered by CommandList */}
          <CommandList className="flex-1 overflow-y-auto min-h-[250px] max-h-none pointer-events-auto">
            {isLoading ? (
              <div className="py-12 flex justify-center items-center">
                <Loader2 className="size-8 text-[#00cf79] animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <CommandEmpty className="py-12 text-center text-[15px] text-gray-400 font-semibold">
                No candidates found
              </CommandEmpty>
            ) : (
              <CommandGroup className="p-0">
                <div className="space-y-1">
                  {filteredUsers.map((user) => {
                    const isSelected = selectedUsers.some((u) => u.id === user.id);
                    return (
                      <CommandItem
                        key={user.id}
                        onSelect={() => handleToggleSelect(user)}
                        className="flex items-center justify-between p-3.5 hover:bg-[#f9fafb] rounded-[16px] cursor-pointer transition select-none data-[selected=true]:bg-[#f9fafb]"
                      >
                        <div className="flex items-center gap-3.5">
                          <AppAvatar
                            src={user.avatar}
                            alt={`${user.first_name} ${user.last_name}`}
                            fallbackText={user.first_name.charAt(0).toUpperCase()}
                            className="size-11 rounded-full aspect-square object-cover"
                          />
                          <span className="font-semibold text-[16px] text-[#111827]">
                            {`${user.first_name} ${user.last_name}`}
                          </span>
                        </div>

                        {isSelected && (
                          <div className="text-[#6366f1] shrink-0 mr-1">
                            <Check className="size-6 stroke-[3]" />
                          </div>
                        )}
                      </CommandItem>
                    );
                  })}
                </div>
              </CommandGroup>
            )}
          </CommandList>
        </Command>

        {/* Footer with primary black button */}
        <div className="flex justify-end pt-4 mt-2 border-t border-[#f3f4f6] shrink-0">
          <Button
            type="button"
            onClick={handleAddAll}
            disabled={selectedUsers.length === 0}
            className="h-[52px] px-8 bg-[#1f1f1f] hover:bg-[#111111] disabled:opacity-40 text-[16px] font-bold text-white rounded-2xl transition cursor-pointer"
          >
            Add all selected
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
