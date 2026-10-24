import { useNavigate } from "react-router"
import { HomeScreen } from "../App"
import { useAuth } from "../context/AuthContext"

export function HomePage() {
  const navigate = useNavigate()
  const { signInAsLandlord, signInAsRealtor } = useAuth()
  return (
    <HomeScreen
      onRenter={() => navigate("/onboarding")}
      onLandlord={() => { signInAsLandlord(); navigate("/for-landlords") }}
      onRealtor={() => { signInAsRealtor(); navigate("/landlord") }}
    />
  )
}
