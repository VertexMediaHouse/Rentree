import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react"
import type { TenantPrefs, UserProfile, UserRole } from "../App"
import { usePersistentState } from "./usePersistentState"

/**
 * Auth and user state, lifted out of AppShell so each page stands on its own.
 *
 * This is the same trust model AppShell had: `role` and `isSignedIn` are set by a button click,
 * with no credentials involved. The route guards therefore gate UI state, not real identity —
 * wiring them to the OTP endpoints in services/api.ts is a separate job.
 */
interface AuthValue {
  isSignedIn: boolean
  role: UserRole
  userProfile: UserProfile | null
  /** Derived listing-search preferences, exactly as AppShell computed them. */
  prefs: TenantPrefs
  setUserProfile: (p: UserProfile | null | ((prev: UserProfile | null) => UserProfile | null)) => void
  signInAsTenant: (profile?: UserProfile) => void
  signInAsLandlord: () => void
  signInAsRealtor: () => void
  signOut: () => void
}

const EMPTY_PREFS: TenantPrefs = { budgetMax: "", unitType: "", location: "", priorities: [], bedrooms: "" }

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isSignedIn, setIsSignedIn] = usePersistentState("rentre.auth.signedIn", false)
  const [role, setRole] = usePersistentState<UserRole>("rentre.auth.role", null)
  const [userProfile, setUserProfile] = usePersistentState<UserProfile | null>("rentre.auth.profile", null)

  const signInAsTenant = useCallback(
    (profile?: UserProfile) => {
      if (profile) setUserProfile(prev => ({ ...(prev ?? profile), ...profile }))
      setIsSignedIn(true)
      setRole("tenant")
    },
    [setUserProfile, setIsSignedIn, setRole]
  )

  const signInAsLandlord = useCallback(() => {
    setIsSignedIn(true)
    setRole("landlord")
  }, [setIsSignedIn, setRole])

  const signInAsRealtor = useCallback(() => {
    setIsSignedIn(true)
    setRole("realtor")
  }, [setIsSignedIn, setRole])

  const signOut = useCallback(() => {
    setIsSignedIn(false)
    setRole(null)
    setUserProfile(null)
  }, [setIsSignedIn, setRole, setUserProfile])

  const prefs: TenantPrefs = useMemo(
    () =>
      userProfile
        ? {
            budgetMax: userProfile.budgetMax,
            unitType: userProfile.unitType,
            location: userProfile.city,
            priorities: userProfile.priorities,
            bedrooms: "",
          }
        : EMPTY_PREFS,
    [userProfile]
  )

  const value = useMemo(
    () => ({
      isSignedIn,
      role,
      userProfile,
      prefs,
      setUserProfile,
      signInAsTenant,
      signInAsLandlord,
      signInAsRealtor,
      signOut,
    }),
    [isSignedIn, role, userProfile, prefs, setUserProfile, signInAsTenant, signInAsLandlord, signInAsRealtor, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
