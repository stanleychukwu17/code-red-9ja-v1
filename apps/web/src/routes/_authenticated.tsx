import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { APP_URL } from '#/lib/config'
import { checkIfRefreshTokenInCookie } from '#/lib/server/auth/auth'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context }) => {
    const isLoggedIn = await checkIfRefreshTokenInCookie()

    if (!isLoggedIn.success) {
      // redirect back to login page
      throw redirect({ to: APP_URL.auth.login })
    }

    if (context.userDetails && !context.userDetails.username) {
      throw redirect({ to: APP_URL.auth.onboarding })
    }

    return { isLoggedIn }
  },
  component: AuthenticatedRoutes,
  errorComponent: ({ error }) => <div>{error.message}</div>,
})

function AuthenticatedRoutes() {
  return <Outlet />
}

