import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { APP_URL } from '#/lib/config'
import { checkIfRefreshTokenInCookie } from '#/lib/server/auth'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const isLoggedIn = await checkIfRefreshTokenInCookie()
    if (isLoggedIn) {
      // get userInfo from localStorage
      return { isLoggedIn }
    } else {
      // redirect back to login page
      redirect({ to: APP_URL.auth.login })
      return { isLoggedIn }
    }
  },
  component: AuthenticatedRoutes,
  errorComponent: ({ error }) => <div>{error.message}</div>,
})


function AuthenticatedRoutes () {
  return <Outlet />
}