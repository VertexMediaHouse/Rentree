import { useNavigate } from "react-router"
import { LandlordCRMScreen } from "../App"

export function LandlordCrmPage() {
  const navigate = useNavigate()
  return <LandlordCRMScreen onBack={() => navigate("/landlord")} />
}
