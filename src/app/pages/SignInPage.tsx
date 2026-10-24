import { useLocation, useNavigate } from "react-router"
import { OnboardingScreen, type UserProfile } from "../App"
import { useAuth } from "../context/AuthContext"

/**
 * Account step of the onboarding wizard. Passing no `resumeProfile` is what opens the wizard on
 * step 0; /onboarding passes one and so opens on step 1.
 */
export function SignInPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signInAsTenant } = useAuth()

  // Set by RequireAuth when it bounced the user here, so sign-in returns them where they were going.
  const from = (location.state as { from?: string } | null)?.from

  return (
    <OnboardingScreen
      onEarlySignIn={(profile: UserProfile) => { signInAsTenant(profile); navigate(from ?? "/onboarding") }}
      onComplete={(profile: UserProfile) => { signInAsTenant(profile); navigate(from ?? "/passport") }}
    />
  )
}
