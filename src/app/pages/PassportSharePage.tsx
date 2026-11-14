import { useNavigate } from "react-router"
import { ChevronLeft } from "lucide-react"
import { PassportDocument } from "../PassportDocument"
import { useAuth } from "../context/AuthContext"

/**
 * The renter's own passport: the full document, editable, with the share-by-email action.
 *
 * ponytail: the optional fields live in the profile's `extra` bag, which AuthContext keeps in
 * sessionStorage — so they survive a refresh but not a new tab. PUT /api/profile has no column for
 * them yet; add one when renters need their passport back on another device.
 */
export function PassportSharePage() {
  const navigate = useNavigate()
  const { userProfile, setUserProfile } = useAuth()

  if (!userProfile) return null

  return (
    <>
      <button
        onClick={() => navigate("/passport")}
        className="fixed bottom-5 left-5 z-30 flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground shadow-lg transition-colors hover:bg-secondary print:hidden"
      >
        <ChevronLeft size={14} />Back to my package
      </button>
      <PassportDocument
        data={userProfile}
        onChange={next => setUserProfile({ ...userProfile, ...next })}
      />
    </>
  )
}
