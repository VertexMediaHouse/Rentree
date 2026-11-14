import { useEffect } from "react"
import { Outlet, useLocation } from "react-router"
import { ConversationProvider } from "@elevenlabs/react"
import { BODY } from "../App"
import { AuthProvider } from "../context/AuthContext"
import { FlowProvider } from "../context/FlowContext"
import { VoiceVerificationContextProvider } from "../context/VoiceVerificationContext"
import { VoiceVerificationModal } from "../components/VoiceVerificationModal"

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
    <ConversationProvider>
      <AuthProvider>
        <FlowProvider>
          <VoiceVerificationContextProvider>
            <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: BODY }}>
              <ScrollToTop />
              <Outlet />
              <VoiceVerificationModal />
            </div>
          </VoiceVerificationContextProvider>
        </FlowProvider>
      </AuthProvider>
    </ConversationProvider>
  )
}

