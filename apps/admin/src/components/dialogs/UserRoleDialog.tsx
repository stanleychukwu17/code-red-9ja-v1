import { UserRoleDialog as SharedUserRoleDialog, type UserRoleDialogProps, } from "@repo/ui/components/custom/UserRoleDialog";
import { updateUserRoles } from "#/lib/server/users";
import { getParties } from "#/lib/server/parties";

export function UserRoleDialog(
  props: Omit<UserRoleDialogProps, "updateUserRole" | "fetchParties">
) {
  return (
    <SharedUserRoleDialog
      {...props}
      updateUserRole={updateUserRoles}
      fetchParties={getParties}
    />
  );
}
