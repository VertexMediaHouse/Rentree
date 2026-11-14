import { useNavigate } from "react-router"
import { PostListingScreen } from "../PostListingScreen"
import { saveBrowserListing } from "../listingStore"

export function PostListingPage() {
  const navigate = useNavigate()
  return (
    <PostListingScreen
      onSubmit={listing => {
        saveBrowserListing(listing)
        navigate("/landlord")
      }}
    />
  )
}
