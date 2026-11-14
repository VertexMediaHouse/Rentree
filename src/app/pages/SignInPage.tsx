import { useLocation, useNavigate } from "react-router"
import { OnboardingScreen, type UserProfile } from "../App"
import { useAuth } from "../context/AuthContext"

/** Single-page renter profile creation: the form, the emailed code, then straight to the passport. */
export function SignInPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setUserProfile, signInAsTenant } = useAuth()

  // Set by RequireAuth when it bounced the user here, so sign-in returns them where they were going.
  const from = (location.state as { from?: string } | null)?.from

  return (
    <OnboardingScreen
      onComplete={(profile: UserProfile) => {
        setUserProfile(profile)
        signInAsTenant(profile)
        navigate(from ?? "/passport")
      }}
    />
  )
}
