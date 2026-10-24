import { useNavigate } from "react-router"
import { LandlordPortalScreen } from "../App"

export function LandlordPortalPage() {
  const navigate = useNavigate()
  return (
    <LandlordPortalScreen
      onPostListing={() => navigate("/landlord/listings/new")}
      onApplications={() => navigate("/landlord/applications")}
      onCRM={() => navigate("/landlord/crm")}
    />
  )
}
