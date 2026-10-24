import { Navigate, useNavigate } from "react-router"
import { TenantSummaryScreen } from "../App"
import { useAuth } from "../context/AuthContext"

export function ConfirmedPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()

  // The summary is built from the renter's profile; without one there is nothing to show.
  if (!userProfile) return <Navigate to="/applications" replace />

  return <TenantSummaryScreen profile={userProfile} onDone={() => navigate("/applications")} />
}
