import { useEffect } from "react"
import { Outlet, useLocation } from "react-router"
import { BODY } from "../App"
import { AuthProvider } from "../context/AuthContext"
import { FlowProvider } from "../context/FlowContext"

/**
 * AppShell's nav() scrolled to the top on every screen change. A route change has to do the same,
 * otherwise a page entered from halfway down a long list opens mid-scroll.
 */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [pathname])
  return null
}

export function RootLayout() {
  return (
    <AuthProvider>
      <FlowProvider>
        <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: BODY }}>
          <ScrollToTop />
          <Outlet />
        </div>
      </FlowProvider>
    </AuthProvider>
  )
}
