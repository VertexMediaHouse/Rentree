import { Navigate, useNavigate } from "react-router"
import { MortgageResultsScreen } from "../App"
import { useFlow } from "../context/FlowContext"

export function MortgageResultsPage() {
  const navigate = useNavigate()
  const { mortgageData } = useFlow()

  // Results are derived from the form inputs; with none stored, send them to fill the form in.
  if (!mortgageData) return <Navigate to="/mortgage" replace />

  return <MortgageResultsScreen data={mortgageData} onBack={() => navigate("/mortgage")} />
}
