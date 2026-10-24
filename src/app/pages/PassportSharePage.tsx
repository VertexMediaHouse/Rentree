import { useNavigate } from "react-router"
import { CreateShareLinkScreen } from "../App"
import { useFlow } from "../context/FlowContext"

export function PassportSharePage() {
  const navigate = useNavigate()
  const { renterPackage } = useFlow()
  return (
    <CreateShareLinkScreen
      pkg={renterPackage}
      onBack={() => navigate("/passport")}
      onGoPackage={() => navigate("/passport")}
    />
  )
}
