import { useNavigate, useParams } from "react-router"
import { BuildingDetailScreen, MOCK_LISTINGS } from "../App"
import { useAuth } from "../context/AuthContext"
import { NotFound } from "../routes/NotFound"

export function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userProfile, isSignedIn } = useAuth()

  const building = MOCK_LISTINGS.find(l => l.id === id)
  // A typed or stale id is a missing page, not a crash.
  if (!building) return <NotFound />

  return (
    <BuildingDetailScreen
      building={building}
      onBack={() => navigate("/buildings")}
      userProfile={userProfile}
      isSignedIn={isSignedIn}
      onSignIn={() => navigate("/signin")}
    />
  )
}
