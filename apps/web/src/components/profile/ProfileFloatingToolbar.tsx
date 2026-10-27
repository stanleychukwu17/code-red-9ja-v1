import { useMemo, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { MoreHorizontal, PencilRuler, Settings } from "lucide-react";
import { UserFormDialog } from "@repo/ui/components/custom/UserFormDialog";
import { useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "#/redux/hooks";
import { QUERY_KEYS } from "#/lib/config";
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
  const authUser = useAppSelector((state) => state.auth.user);
  const params = useParams({ strict: false }) as { username?: string };

  // Resolve active profile from cache, falling back to logged-in user
  const activeUser = useMemo(() => {
    let cachedProfileRes: any;

    // 1. Look up profile by username from URL
    if (params.username) {
      cachedProfileRes = queryClient.getQueryData<any>(
        QUERY_KEYS.userProfile.byUsername(params.username)
      );
    }

    // 2. Fallback to any cached profile query
    if (!cachedProfileRes) {
      const rootQueries = queryClient.getQueriesData<any>({
        queryKey: QUERY_KEYS.userProfile.root,
      });
      if (rootQueries && rootQueries.length > 0 && rootQueries[0]) {
        cachedProfileRes = rootQueries[0][1];
      }
    }

    // Unwrap response data or fallback to authUser
    const profileData = cachedProfileRes?.data ?? cachedProfileRes;
    const base = profileData || authUser;
    if (!base) return null;

    // Merge profile fields with normalized party_id and avatar
    return {
      ...authUser,
      ...base,
      party_id: base?.party?.id ?? base?.party_id ?? authUser?.party_id,
      avatar: base?.avatar || authUser?.avatar || authUser?.avatar_url || "",
    };
  }, [params.username, queryClient, authUser, isEditDialogOpen]);

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
    </div>
  );
}
