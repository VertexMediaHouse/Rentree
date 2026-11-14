import { useNavigate, useParams } from "react-router"
import { ListingDetailScreen, MOCK_LISTINGS } from "../App"
import { useAuth } from "../context/AuthContext"
import { NotFound } from "../routes/NotFound"

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { prefs, isSignedIn, userProfile, setUserProfile } = useAuth()

  if (!MOCK_LISTINGS.some(l => l.id === id)) return <NotFound />

  return (
    <ListingDetailScreen
      listingId={id!}
      prefs={prefs}
      // Signed-out visitors sign in first and are returned to the viewing request afterwards.
      onRequestViewing={(listingId: string) =>
        isSignedIn
          ? navigate(`/listings/${listingId}/request-viewing`)
          : navigate("/signin", { state: { from: `/listings/${listingId}/request-viewing` } })
      }
      isSignedIn={isSignedIn}
      onSignIn={() => navigate("/signin")}
      userProfile={userProfile}
      onUpdateProfile={setUserProfile}
      onViewPassport={() => navigate("/passport")}
    />
  )
}
