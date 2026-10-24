import { useNavigate } from "react-router"
import { LandlordHomeScreen } from "../App"
import { useAuth } from "../context/AuthContext"

export function ForLandlordsPage() {
  const navigate = useNavigate()
  const { signInAsRealtor } = useAuth()
  return (
    <LandlordHomeScreen
      onPortal={() => navigate("/landlord")}
      onPostListing={() => navigate("/landlord/listings/new")}
      onRealtor={() => { signInAsRealtor(); navigate("/landlord") }}
      onMortgage={() => navigate("/mortgage")}
    />
  )
}
