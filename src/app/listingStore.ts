export interface BrowserListing {
  id: string
  address: string
  unit: string
  city: string
  rent: number
  status: "listed"
  applications: number
  tenant?: string
  leaseEnd?: string
  image: string
  createdAt: string
}

const STORAGE_KEY = "rentre.browser-listings.v1"

export function readBrowserListings(): BrowserListing[] {
  if (typeof window === "undefined") return []
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) as BrowserListing[] : []
  } catch {
    return []
  }
}

export function saveBrowserListing(listing: BrowserListing) {
  const listings = [listing, ...readBrowserListings()]
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(listings))
  window.dispatchEvent(new Event("rentre:listings-updated"))
}
