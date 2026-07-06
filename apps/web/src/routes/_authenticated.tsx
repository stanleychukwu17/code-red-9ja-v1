import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { APP_URL } from '#/lib/config'
import { checkIfRefreshTokenInCookie } from '#/lib/server/auth/auth'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const isLoggedIn = await checkIfRefreshTokenInCookie()
    if (isLoggedIn.success) {
      return { isLoggedIn }
    } else {
      // redirect back to login page
      throw redirect({ to: APP_URL.auth.login })
    }
  },
  component: AuthenticatedRoutes,
  errorComponent: ({ error }) => <div>{error.message}</div>,
})


function AuthenticatedRoutes () {
  return <Outlet />
}