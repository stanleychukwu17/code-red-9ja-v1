import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/verify-otp')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/auth/verify-otp"!</div>
}
