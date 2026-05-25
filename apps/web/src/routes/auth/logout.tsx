import { createFileRoute, redirect } from '@tanstack/react-router'
import { logoutUser } from '#/lib/server/auth'
import { store } from '#/redux/store'
import { updateAuthState } from '#/redux/slice/authSlice'
import { APP_URL } from '#/lib/config'

export const Route = createFileRoute('/auth/logout')({
  beforeLoad: async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Failed to call logoutUser on server:", error);
    }

    // Clear Redux state on client
    store.dispatch(updateAuthState({ user: null }));

    // Redirect to login page
    throw redirect({to: APP_URL.homePage});
  },
  component: RouteComponent,
})

function RouteComponent() {
  return null;
}
  