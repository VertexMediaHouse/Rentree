import { useLocation, useNavigate } from "react-router"
import { OnboardingScreen, type UserProfile } from "../App"
import { useAuth } from "../context/AuthContext"

/** Passport builder, steps 1-5. Reached once an account exists. */
export function OnboardingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userProfile, setUserProfile, signInAsTenant } = useAuth()
  const from = (location.state as { from?: string } | null)?.from

  return (
    <OnboardingScreen
      resumeProfile={userProfile ?? undefined}
      onEarlySignIn={(profile: UserProfile) => signInAsTenant(profile)}
      onComplete={(profile: UserProfile) => {
        setUserProfile(profile)
        signInAsTenant(profile)
        navigate(from ?? "/passport")
      }}
      onViewProfile={() => navigate("/passport")}
    />
  )
}
