import { useNavigate, useParams } from "react-router"
import { MOCK_LISTINGS, ViewingRequestScreen } from "../App"
import { useFlow } from "../context/FlowContext"
import { NotFound } from "../routes/NotFound"

export function RequestViewingPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { renterPackage } = useFlow()

  if (!MOCK_LISTINGS.some(l => l.id === id)) return <NotFound />

  return (
    <ViewingRequestScreen
      listingId={id!}
      onComplete={() => navigate("/applications")}
      pkg={renterPackage}
      onGoPackage={() => navigate("/passport")}
    />
  )
}
