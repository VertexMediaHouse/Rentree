import { Outlet, useLocation, useNavigate } from "react-router"
import { NavBar } from "../App"
import { useAuth } from "../context/AuthContext"
import { parentPath } from "./parentPath"

/**
 * The sticky NavBar, shown on every page except the landing page and the two standalone token
 * pages (/share, /lease), which is exactly where AppShell showed it (`screen !== "home"`).
 */
export function ChromeLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { isSignedIn, role, signInAsLandlord, signInAsRealtor } = useAuth()

  const isTenant = isSignedIn && role === "tenant"
  const isLandlordArea = pathname === "/for-landlords" || pathname.startsWith("/landlord")
  // Same rule as AppShell: hide the role buttons inside the landlord area and for signed-in tenants.
  const showRoleButtons = !isLandlordArea && !isTenant
  const isAgent = role === "landlord" || role === "realtor"
  const parent = parentPath(pathname)

  return (
    <>
      <div className="sticky top-0 z-40">
        <NavBar
          onHome={() => navigate("/")}
          onBack={parent ? () => navigate(parent) : undefined}
          onApplications={isTenant ? () => navigate("/applications") : undefined}
          onPackage={!isAgent ? () => navigate(isSignedIn ? "/passport" : "/signin") : undefined}
          onBuildings={isTenant ? () => navigate("/buildings") : undefined}
          onListings={isTenant ? () => navigate("/listings") : undefined}
          isSignedIn={isSignedIn}
          role={role}
          onSignIn={!isAgent ? () => navigate("/signin") : undefined}
          onLandlord={
            showRoleButtons
              ? () => {
                  signInAsLandlord()
                  navigate("/for-landlords")
                }
              : undefined
          }
          onRealtor={
            showRoleButtons
              ? () => {
                  signInAsRealtor()
                  navigate("/landlord")
                }
              : undefined
          }
        />
      </div>
      <Outlet />
    </>
  )
}
