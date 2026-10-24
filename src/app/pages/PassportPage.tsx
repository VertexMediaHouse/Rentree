import { useNavigate } from "react-router"
import { MyPackageScreen } from "../App"
import { useAuth } from "../context/AuthContext"
import { useFlow } from "../context/FlowContext"

export function PassportPage() {
  const navigate = useNavigate()
  const { userProfile, setUserProfile } = useAuth()
  const { renterPackage, setRenterPackage } = useFlow()

  return (
    <MyPackageScreen
      pkg={renterPackage}
      onChange={setRenterPackage}
      onBack={() => navigate("/search")}
      onCreateLink={() => navigate("/passport/share")}
      passportProfile={userProfile ?? undefined}
      onBuildPassport={() => navigate("/onboarding")}
      onUpdateProfile={setUserProfile}
    />
  )
}
