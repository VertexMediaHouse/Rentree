import { Navigate, useNavigate, useParams } from "react-router"
import { MOCK_LISTINGS, PaymentScreen } from "../App"
import { useFlow } from "../context/FlowContext"

export function PaymentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { pendingOffer } = useFlow()

  const listing = pendingOffer ? MOCK_LISTINGS.find(l => l.id === pendingOffer.listingId) : undefined
  if (!pendingOffer || !listing) return <Navigate to="/applications" replace />

  return <PaymentScreen listing={listing} onComplete={() => navigate(`/applications/${id}/confirmed`)} />
}
