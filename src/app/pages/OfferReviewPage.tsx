import { Navigate, useNavigate, useParams } from "react-router"
import { MOCK_LISTINGS, OfferReviewScreen } from "../App"
import { useFlow } from "../context/FlowContext"

export function OfferReviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { pendingOffer } = useFlow()

  const listing = pendingOffer ? MOCK_LISTINGS.find(l => l.id === pendingOffer.listingId) : undefined
  // Nothing in this session to review (new tab, cleared storage): go back to the list.
  if (!pendingOffer || !listing) return <Navigate to="/applications" replace />

  return (
    <OfferReviewScreen
      listing={listing}
      offer={pendingOffer}
      onAccept={() => navigate(`/applications/${id}/payment`)}
      onDecline={() => navigate("/applications")}
    />
  )
}
