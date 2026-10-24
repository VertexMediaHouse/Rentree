import { useNavigate } from "react-router"
import { LandlordApplicationsScreen } from "../App"

export function LandlordApplicationsPage() {
  const navigate = useNavigate()
  return <LandlordApplicationsScreen onOfferSent={() => navigate("/landlord")} />
}
