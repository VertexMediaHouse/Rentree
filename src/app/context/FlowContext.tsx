import { createContext, useContext, useMemo, type ReactNode } from "react"
import type { MortgageData, RenterPackage } from "../App"
import { usePersistentState } from "./usePersistentState"

/**
 * State that is carried between pages of a multi-step flow but is not part of the URL:
 * the renter's document package, an offer under review, and mortgage form inputs.
 *
 * Persisted to sessionStorage so refresh and back/forward work on /applications/:id/payment and
 * /mortgage/results. Pages that need a value still check for it and redirect to the step that
 * produces it, because a brand new tab legitimately has nothing stored.
 */
export interface PendingOffer {
  price: number
  term: string
  concessions: string
  /** AppShell set the offer and its listing together; the offer and payment pages both need it. */
  listingId: string
}

interface FlowValue {
  renterPackage: RenterPackage
  setRenterPackage: (p: RenterPackage | ((prev: RenterPackage) => RenterPackage)) => void
  pendingOffer: PendingOffer | null
  setPendingOffer: (o: PendingOffer | null) => void
  mortgageData: MortgageData | null
  setMortgageData: (d: MortgageData | null) => void
}

const EMPTY_PACKAGE: RenterPackage = {
  equifaxFile: null,
  paystubFile: null,
  referralPhone: "",
  landlordPhone: "",
  agreedToAnonymize: false,
}

const FlowContext = createContext<FlowValue | null>(null)

export function FlowProvider({ children }: { children: ReactNode }) {
  const [renterPackage, setRenterPackage] = usePersistentState<RenterPackage>("rentre.flow.package", EMPTY_PACKAGE)
  const [pendingOffer, setPendingOffer] = usePersistentState<PendingOffer | null>("rentre.flow.offer", null)
  const [mortgageData, setMortgageData] = usePersistentState<MortgageData | null>("rentre.flow.mortgage", null)

  const value = useMemo(
    () => ({ renterPackage, setRenterPackage, pendingOffer, setPendingOffer, mortgageData, setMortgageData }),
    [renterPackage, setRenterPackage, pendingOffer, setPendingOffer, mortgageData, setMortgageData]
  )

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>
}

export function useFlow() {
  const ctx = useContext(FlowContext)
  if (!ctx) throw new Error("useFlow must be used inside <FlowProvider>")
  return ctx
}
