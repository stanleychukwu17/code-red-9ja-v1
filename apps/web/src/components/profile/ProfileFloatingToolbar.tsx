import { useMemo, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { Ban, MoreHorizontal, PencilRuler, Settings, Share2 } from "lucide-react";
import { UserFormDialog } from "@repo/ui/components/custom/UserFormDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@repo/ui/components/dropdown-menu";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "#/lib/config";
import { getUserProfile } from "#/lib/server/citizens";
import { getAllCountries, getStates, getCities } from "#/lib/server/countries";
import { getParties } from "#/lib/server/parties";
import { updateUser, getPresignedUploadURL, confirmFileUpload, loadUserPhoneNumber, updateUserPhoneNumbers, deleteUserPhoneNumber } from "#/lib/server/users";

export type ProfileFloatingToolbarProps = {
  onSuccess?: () => void;
};

export function ProfileFloatingToolbar({ onSuccess }: ProfileFloatingToolbarProps = {}) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const params = useParams({ strict: false }) as { username?: string };
  const username = params.username ? params.username.replace(/^@/, "") : "";

  // Subscribe reactively to the public profile query cache
  const { data: profileRes } = useQuery({
    queryKey: QUERY_KEYS.userProfile.byUsername(username),
    queryFn: () => getUserProfile({ data: { username } }),
    enabled: Boolean(username),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const profileData = profileRes?.data;
  const isAccountOwner = Boolean(profileData?.is_account_owner);

  // Resolve active profile for editing directly from the profile data
  const activeUser = useMemo(() => {
    if (!profileData) return null;
    return {
      ...profileData,
      party_id: profileData.party?.id,
      avatar: profileData.avatar || "",
    };
  }, [profileData]);

  // Copy current profile URL to clipboard
  const handleShare = async () => {
    if (typeof window !== "undefined" && navigator?.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Profile link copied to clipboard");
    }
  };

  // Block user handler
  const handleBlock = () => {
    toast.info("Block user feature is coming soon");
  };

  // Close dialog, refresh profile & session cache, and notify parent
  const handleSuccess = () => {
    setIsEditDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userProfile.root });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.session });
    onSuccess?.();
  };

  return (
    <div className="mt-5 flex justify-center">
      <div className="inline-flex items-center gap-2 rounded-full bg-sidebar-mobile/50 px-1 shadow-xs">
        {isAccountOwner && (
          <>
            <button
              type="button"
              onClick={() => setIsEditDialogOpen(true)}
              title="Edit profile"
              className="text-c-70 hover:text-c-100 transition-colors cursor-pointer bg-hover-10/50 size-10 rounded-full flex items-center justify-center"
            >
              <PencilRuler className="size-5" />
            </button>

            <button
              type="button"
              title="Profile Settings"
              className="text-c-70 hover:text-c-100 transition-colors cursor-pointer bg-hover-10/50 size-10 rounded-full flex items-center justify-center"
            >
              <Settings className="size-5" />
            </button>
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="More options"
              className="text-c-70 hover:text-c-100 transition-colors cursor-pointer relative bg-hover-10/50 size-10 rounded-full flex items-center justify-center data-[state=open]:bg-hover-10"
            >
              <MoreHorizontal className="size-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            className="w-48 rounded-2xl p-1.5 shadow-xl border border-border bg-popover text-popover-foreground"
          >
            <DropdownMenuItem
              onClick={handleShare}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer text-c-80 hover:text-c-100 hover:bg-hover-5"
            >
              <Share2 className="size-4 text-c-50" />
              <span>Share Profile</span>
            </DropdownMenuItem>

            {!isAccountOwner && (
              <>
                <DropdownMenuSeparator className="my-1 bg-border" />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={handleBlock}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium cursor-pointer text-destructive hover:bg-destructive/10"
                >
                  <Ban className="size-4 text-destructive" />
                  <span>Block User</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Profile edit modal dialog (active owner only) */}
      {isEditDialogOpen && isAccountOwner ? (
        <UserFormDialog
          mode="update"
          open={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          user={activeUser}
          onSuccess={handleSuccess}
          getAllCountries={getAllCountries}
          getStates={getStates}
          getCities={getCities}
          getParties={getParties}
          getPresignedUploadURL={getPresignedUploadURL}
          confirmFileUpload={confirmFileUpload}
          updateUser={updateUser}
          loadUserPhoneNumber={loadUserPhoneNumber}
          updateUserPhoneNumbers={updateUserPhoneNumbers}
          deleteUserPhoneNumber={deleteUserPhoneNumber}
        />
      ) : null}
    </div>
  );
}
