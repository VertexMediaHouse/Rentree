import { Navigate, Outlet, useLocation } from "react-router"
import type { UserRole } from "../App"
import { useAuth } from "../context/AuthContext"

/** Where a signed-in user belongs when they land somewhere they should not be. */
export const homeFor = (role: UserRole) => (role === "landlord" || role === "realtor" ? "/landlord" : "/passport")

/**
 * Gate for pages that need a session. The attempted path is passed along in location state so
 * sign-in can return the user to it instead of dropping them on a generic home page.
 */
export function RequireAuth({ roles }: { roles?: Array<NonNullable<UserRole>> }) {
  const { isSignedIn, role } = useAuth()
  const location = useLocation()

  if (!isSignedIn) {
    return <Navigate to="/signin" replace state={{ from: location.pathname + location.search }} />
  }
  // Signed in, but this section belongs to another role (a tenant opening /landlord).
  if (roles && role && !roles.includes(role)) {
    return <Navigate to={homeFor(role)} replace />
  }
  return <Outlet />
}

/** Keeps signed-in users off /signin, per the brief. */
export function RedirectIfSignedIn() {
  const { isSignedIn, role } = useAuth()
  return isSignedIn ? <Navigate to={homeFor(role)} replace /> : <Outlet />
}
