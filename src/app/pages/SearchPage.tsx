import { useNavigate } from "react-router"
import { MarketSearchScreen } from "../App"
import { useAuth } from "../context/AuthContext"

export function SearchPage() {
  const navigate = useNavigate()
  const { prefs, isSignedIn } = useAuth()
  return (
    <MarketSearchScreen
      onListing={(id: string) => navigate(`/listings/${id}`)}
      onApplications={() => navigate("/applications")}
      prefs={prefs}
      isSignedIn={isSignedIn}
      onSignIn={() => navigate("/signin")}
    />
  )
}
