import { useNavigate } from "react-router"
import { DiscoveryScreen } from "../App"

export function ListingsPage() {
  const navigate = useNavigate()
  return (
    <DiscoveryScreen
      mode="listings"
      onSelectListing={(id: string) => navigate(`/listings/${id}`)}
      onSelectBuilding={(id: string) => navigate(`/buildings/${id}`)}
      onGoBuildings={() => navigate("/buildings")}
      onGoListings={() => navigate("/listings")}
    />
  )
}
