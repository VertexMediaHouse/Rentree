import { useNavigate } from "react-router"
import { MOCK_APPLICATIONS, MOCK_LISTINGS, MyApplicationsScreen } from "../App"
import { useFlow } from "../context/FlowContext"

export function ApplicationsPage() {
  const navigate = useNavigate()
  const { setPendingOffer } = useFlow()

  // The offer banner on this screen is fixed to the first application and listing, as before.
  const application = MOCK_APPLICATIONS[0]
  const listing = MOCK_LISTINGS[0]

  return (
    <MyApplicationsScreen
      onViewOffer={() => {
        setPendingOffer({ price: 2150, term: "12 months", concessions: "First month free", listingId: listing.id })
        navigate(`/applications/${application.id}/offer`)
      }}
    />
  )
}
