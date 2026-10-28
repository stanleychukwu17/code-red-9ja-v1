import { useMemo, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { MoreHorizontal, PencilRuler, Settings } from "lucide-react";
import { UserFormDialog } from "@repo/ui/components/custom/UserFormDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "#/lib/config";
import { getUserProfile } from "#/lib/server/citizens";
import { getAllCountries, getStates, getCities } from "#/lib/server/countries";
import { getParties } from "#/lib/server/parties";
import {
  updateUser,
  getPresignedUploadURL,
  confirmFileUpload,
  registerCandidate,
} from "#/lib/server/users";

export type ProfileFloatingToolbarProps = {
  onSuccess?: () => void;
};

export function ProfileFloatingToolbar({ onSuccess }: ProfileFloatingToolbarProps = {}) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
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

  // Copy current profile URL to clipboard with a 2-second copied state
  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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

        <button
          type="button"
          onClick={handleShare}
          title="Share profile link"
          className="text-c-70 hover:text-c-100 transition-colors cursor-pointer relative bg-hover-10/50 size-10 rounded-full flex items-center justify-center"
        >
          {copied ? (
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-c-100 text-background text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap">
              Copied!
            </span>
          ) : null}
          <MoreHorizontal className="size-5" />
        </button>
      </div>

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
          registerCandidate={registerCandidate}
          updateUser={updateUser}
        />
      ) : null}
    </div>
  );
}
