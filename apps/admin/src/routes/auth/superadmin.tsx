import { getPageHeader } from '#/lib/shared/meta'
import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { makeSuperadminFn } from '#/lib/server/auth/auth'
import { toast } from 'sonner'
import { Button } from '@repo/ui/components/button'
import { APP_URL } from '#/lib/config'

export const Route = createFileRoute('/auth/superadmin')({
  head: () => getPageHeader({
    title: "Make super admin",
    robotsAllowed: "no"
  }),
  validateSearch: z.object({
    name: z.string().min(3, 'Name must be at least 3 characters long').regex(/^[a-zA-Z0-9_]+$/, 'Name cannot contain spaces, only letters, numbers, and underscores are allowed'),
  }),
  errorComponent: ({ error }) => {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-6 text-center max-w-md mx-auto my-8 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          <h2 className="text-xl font-bold mb-2">Validation Error</h2>
          <p className="text-sm">{error?.message || "Invalid search parameters"}</p>
        </div>
      </div>
    )
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { name } = Route.useSearch()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handlePromote = async () => {
    setLoading(true)
    try {
      const res = await makeSuperadminFn({ data: { name } })
      console.log(res)
      if (res?.success) {
        toast.success("User successfully promoted to superadmin")
        setSuccess(true)
      } else {
        toast.error(res?.message || "Failed to promote user")
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  // Auto-promote on load
  useEffect(() => {
    handlePromote()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="max-w-md w-full p-8 border rounded-xl shadow-sm bg-card text-card-foreground">
        <h1 className="text-2xl font-bold text-center mb-6">Superadmin Promotion</h1>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-muted-foreground">Promoting user {name}...</p>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-medium">Successfully promoted {name}!</p>
            <Button asChild className="w-full mt-4">
              <Link to={APP_URL.auth.login}>Go to Login</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-lg font-medium">Failed to promote {name}</p>
            <Button variant="outline" onClick={handlePromote} className="w-full mt-4">
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
