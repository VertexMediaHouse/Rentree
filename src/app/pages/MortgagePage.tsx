import { useNavigate } from "react-router"
import { MortgageFormScreen } from "../App"
import { useFlow } from "../context/FlowContext"

export function MortgagePage() {
  const navigate = useNavigate()
  const { setMortgageData } = useFlow()
  return (
    <MortgageFormScreen
      onSubmit={d => {
        setMortgageData(d)
        navigate("/mortgage/results")
      }}
    />
  )
}
