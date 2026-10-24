import { useEffect, useId, useRef, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import {
  ArrowRight, Upload, FileText, Shield, MapPin, Train,
  X, CheckCircle, Info, Building, Lock, Mail,
  Home, Search, ChevronLeft, Car, Package,
  BarChart3, Leaf,
  UtensilsCrossed, ShoppingCart, GraduationCap, Bus,
  User, ClipboardList,
  Gift, BadgeCheck, Send, Plus, Minus,
  AlertCircle, KeyRound, Calculator,
  Bed, Bath, Ruler, Clock, Heart, SlidersHorizontal,
  ChevronDown,
  UserCheck, Scale, Eye, PhoneCall,
  TrendingDown, TrendingUp, Star,
  Users, Calendar, DollarSign, ChevronRight, Share2, ExternalLink, Copy, Link2
} from "lucide-react"
import { ModalKeys } from "./components/ModalKeys"
import { PostListingScreen } from "./PostListingScreen"
import { readBrowserListings, saveBrowserListing } from "./listingStore"
import type { BrowserListing } from "./listingStore"
import { requestSignInCode, saveProfile, setToken, sharePassport, verifySignInCode } from "../services/api"
import image6 from "@/imports/image-6.png"
import rentreLogoMark from "@/imports/image-7.png"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RenterPackage {
  equifaxFile: string | null
  paystubFile: string | null
  referralPhone: string
  landlordPhone: string
  agreedToAnonymize: boolean
}

export type UserRole = "tenant" | "landlord" | "realtor" | null

export interface AddOn { label: string; price: number | "included" }

export interface Listing {
  id: string; address: string; unit?: string; neighbourhood: string; city: string
  price: number; unitType: string; bedrooms: number; bathrooms: number; sqft: number
  yearBuilt: number; rentControlled: boolean; moveIn: string; leaseTerm: string
  image: string; photos: string[]; floorPlan: string
  postedDays: number; landlord: string; addOns: AddOn[]
  scores: { price: number; location: number; transit: number; walkability: number; amenities: number; space: number }
}

export interface UserProfile {
  name: string; email: string; phone: string; city: string; neighbourhoods: string[]; unitType: string
  budgetMax: string; moveIn: string; priorities: string[]
  amenities: string[]; notes: string; notifPref: "sms" | "email" | ""
  // Passport fields
  employment?: string; income?: string; jobTitle?: string; employer?: string
  currentAddress?: string; timeAtAddress?: string; currentLandlord?: string; landlordPhone?: string
  hasIncomeDoc?: boolean; hasCreditDoc?: boolean; reachOut?: boolean
  passportComplete?: boolean
  leaseFileName?: string
  applyingWithGuarantor?: boolean
}

export interface TenantPrefs {
  budgetMax: string; unitType: string; location: string; priorities: string[]; bedrooms: string
}

export interface MortgageData {
  price: number; down: number; province: string; amortization: number; rate: number
  grossIncome: number; monthlyDebts: number; currentRent: number
  propertyTax: number; condoFee: number; isFirstTimeBuyer: boolean; inToronto: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const MONO = "'JetBrains Mono', monospace"
export const DISPLAY = "'Fraunces', serif"
export const BODY = "'DM Sans', sans-serif"

const CITIES_LIST = ["All", "Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa", "Edmonton", "Winnipeg"]
const CITIES_OPTS = ["Toronto", "Vancouver", "Montréal", "Calgary", "Ottawa", "Edmonton", "Winnipeg"]

// ─── Photo pools ─────────────────────────────────────────────────────────────

const INTERIOR_A = [
  "https://images.unsplash.com/photo-1688646953306-5ec93eab8c06?w=900&h=600&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1610276173132-c47d148ab626?w=900&h=600&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1640109478916-f445f8f19b11?w=900&h=600&fit=crop&auto=format",
]
const INTERIOR_B = [
  "https://images.unsplash.com/photo-1633429083846-376f1b9737a4?w=900&h=600&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1638886043487-72d203fa66b6?w=900&h=600&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1638454668466-e8dbd5462f20?w=900&h=600&fit=crop&auto=format",
]
const FLOOR_PLAN = "https://images.unsplash.com/photo-1721244654392-9c912a6eb236?w=900&h=600&fit=crop&auto=format"

// ─── Mock data ───────────────────────────────────────────────────────────────

export const MOCK_LISTINGS: Listing[] = [
  {
    id: "1", address: "592 Sherbourne St", unit: "Unit 1204", neighbourhood: "St. James Town", city: "Toronto",
    price: 2150, unitType: "1br", bedrooms: 1, bathrooms: 1, sqft: 618, yearBuilt: 2019, rentControlled: false,
    moveIn: "Aug 1, 2025", leaseTerm: "12 months", postedDays: 2, landlord: "Greenfield Properties",
    image: "https://images.unsplash.com/photo-1762758731316-419c3c283ed9?w=800&h=600&fit=crop&auto=format",
    photos: ["https://images.unsplash.com/photo-1762758731316-419c3c283ed9?w=900&h=600&fit=crop&auto=format", ...INTERIOR_A],
    floorPlan: FLOOR_PLAN,
    addOns: [{ label: "Parking", price: 165 }, { label: "Storage locker", price: 65 }, { label: "Utilities (water/heat)", price: 175 }, { label: "Air conditioning", price: "included" }],
    scores: { price: 8.9, location: 7.8, transit: 9.1, walkability: 8.4, amenities: 8.0, space: 6.5 },
  },
  {
    id: "2", address: "480 King St W", unit: "Loft 612", neighbourhood: "King West", city: "Toronto",
    price: 2850, unitType: "1br+den", bedrooms: 1, bathrooms: 1, sqft: 780, yearBuilt: 2004, rentControlled: true,
    moveIn: "Jul 15, 2025", leaseTerm: "12 months", postedDays: 5, landlord: "West End Living",
    image: "https://images.unsplash.com/photo-1774234528950-a2ba88c3c1b2?w=800&h=600&fit=crop&auto=format",
    photos: ["https://images.unsplash.com/photo-1774234528950-a2ba88c3c1b2?w=900&h=600&fit=crop&auto=format", ...INTERIOR_B],
    floorPlan: FLOOR_PLAN,
    addOns: [{ label: "Parking", price: 195 }, { label: "Gym access", price: "included" }, { label: "Concierge", price: "included" }],
    scores: { price: 5.8, location: 9.2, transit: 9.4, walkability: 9.5, amenities: 7.5, space: 7.8 },
  },
  {
    id: "3", address: "25 Maitland Place", unit: "Suite 804", neighbourhood: "Church-Wellesley", city: "Toronto",
    price: 1850, unitType: "bachelor", bedrooms: 0, bathrooms: 1, sqft: 440, yearBuilt: 1998, rentControlled: true,
    moveIn: "Aug 15, 2025", leaseTerm: "12 months", postedDays: 1, landlord: "Private Landlord",
    image: "https://images.unsplash.com/photo-1534714259038-764cb4cf1d58?w=800&h=600&fit=crop&auto=format",
    photos: ["https://images.unsplash.com/photo-1534714259038-764cb4cf1d58?w=900&h=600&fit=crop&auto=format", ...INTERIOR_A],
    floorPlan: FLOOR_PLAN,
    addOns: [{ label: "Storage locker", price: 55 }, { label: "Heat & water", price: "included" }],
    scores: { price: 9.2, location: 8.8, transit: 9.5, walkability: 9.2, amenities: 4.5, space: 4.2 },
  },
  {
    id: "4", address: "15 Queens Quay W", unit: "2201", neighbourhood: "Harbourfront", city: "Toronto",
    price: 3400, unitType: "2br", bedrooms: 2, bathrooms: 2, sqft: 1020, yearBuilt: 2014, rentControlled: true,
    moveIn: "Sep 1, 2025", leaseTerm: "24 months", postedDays: 7, landlord: "Harbour Realty Group",
    image: "https://images.unsplash.com/photo-1588835743485-5845e40364fe?w=800&h=600&fit=crop&auto=format",
    photos: ["https://images.unsplash.com/photo-1588835743485-5845e40364fe?w=900&h=600&fit=crop&auto=format", ...INTERIOR_B],
    floorPlan: FLOOR_PLAN,
    addOns: [{ label: "Parking", price: 225 }, { label: "Storage locker", price: 80 }, { label: "Utilities (water/heat)", price: 195 }, { label: "EV charging", price: 45 }, { label: "Pool & gym", price: "included" }],
    scores: { price: 6.4, location: 8.9, transit: 7.2, walkability: 8.0, amenities: 9.5, space: 9.1 },
  },
  {
    id: "5", address: "1185 Eglinton Ave W", unit: "Unit 301", neighbourhood: "Forest Hill", city: "Toronto",
    price: 2400, unitType: "2br", bedrooms: 2, bathrooms: 1, sqft: 890, yearBuilt: 2021, rentControlled: false,
    moveIn: "Aug 1, 2025", leaseTerm: "12 months", postedDays: 3, landlord: "Northside PM",
    image: "https://images.unsplash.com/photo-1502736517152-bf3bd00bc61c?w=800&h=600&fit=crop&auto=format",
    photos: ["https://images.unsplash.com/photo-1502736517152-bf3bd00bc61c?w=900&h=600&fit=crop&auto=format", ...INTERIOR_A],
    floorPlan: FLOOR_PLAN,
    addOns: [{ label: "Parking", price: 145 }, { label: "Heat & water", price: "included" }, { label: "Air conditioning", price: 85 }],
    scores: { price: 8.1, location: 7.2, transit: 6.8, walkability: 7.0, amenities: 7.2, space: 8.6 },
  },
  {
    id: "6", address: "220 Bain Ave", neighbourhood: "Riverdale", city: "Toronto",
    price: 3100, unitType: "townhouse", bedrooms: 3, bathrooms: 2, sqft: 1350, yearBuilt: 1987, rentControlled: true,
    moveIn: "Sep 15, 2025", leaseTerm: "12 months", postedDays: 4, landlord: "East End Estates",
    image: "https://images.unsplash.com/photo-1730097836048-aea8bddd57fc?w=800&h=600&fit=crop&auto=format",
    photos: ["https://images.unsplash.com/photo-1730097836048-aea8bddd57fc?w=900&h=600&fit=crop&auto=format", ...INTERIOR_B],
    floorPlan: FLOOR_PLAN,
    addOns: [{ label: "Parking (driveway)", price: "included" }, { label: "Utilities (water/heat)", price: 215 }],
    scores: { price: 7.5, location: 8.2, transit: 6.5, walkability: 7.8, amenities: 8.0, space: 9.4 },
  },
  {
    id: "7", address: "888 Pacific Blvd", unit: "Unit 408", neighbourhood: "Yaletown", city: "Vancouver",
    price: 2950, unitType: "1br", bedrooms: 1, bathrooms: 1, sqft: 650, yearBuilt: 2016, rentControlled: true,
    moveIn: "Aug 1, 2025", leaseTerm: "12 months", postedDays: 2, landlord: "Pacific Residences",
    image: "https://images.unsplash.com/photo-1695391006456-ec48c5b27c09?w=800&h=600&fit=crop&auto=format",
    photos: ["https://images.unsplash.com/photo-1695391006456-ec48c5b27c09?w=900&h=600&fit=crop&auto=format", ...INTERIOR_A],
    floorPlan: FLOOR_PLAN,
    addOns: [{ label: "Parking", price: 225 }, { label: "Storage", price: 75 }, { label: "Heat & hot water", price: "included" }],
    scores: { price: 6.5, location: 9.4, transit: 8.9, walkability: 9.6, amenities: 8.5, space: 6.8 },
  },
  {
    id: "8", address: "410 Sherbrooke St W", unit: "Suite 705", neighbourhood: "Milton-Parc", city: "Montreal",
    price: 1750, unitType: "2br", bedrooms: 2, bathrooms: 1, sqft: 920, yearBuilt: 1972, rentControlled: true,
    moveIn: "Sep 1, 2025", leaseTerm: "12 months", postedDays: 6, landlord: "Plateau Properties",
    image: "https://images.unsplash.com/photo-1782554262280-e2ece6e06282?w=800&h=600&fit=crop&auto=format",
    photos: ["https://images.unsplash.com/photo-1782554262280-e2ece6e06282?w=900&h=600&fit=crop&auto=format", ...INTERIOR_B],
    floorPlan: FLOOR_PLAN,
    addOns: [{ label: "Heating", price: "included" }, { label: "Parking", price: 95 }],
    scores: { price: 9.5, location: 8.6, transit: 9.2, walkability: 8.8, amenities: 5.5, space: 8.9 },
  },
]

export const MOCK_APPLICATIONS = [
  { id: "a1", address: "592 Sherbourne St, Unit 1204", price: 2150, status: "reviewing", appliedDays: 2, landlord: "Greenfield Properties", image: "https://images.unsplash.com/photo-1762758731316-419c3c283ed9?w=400&h=300&fit=crop&auto=format" },
  { id: "a2", address: "15 Queens Quay W #2201", price: 3400, status: "interview", appliedDays: 6, landlord: "Harbour Realty Group", image: "https://images.unsplash.com/photo-1588835743485-5845e40364fe?w=400&h=300&fit=crop&auto=format" },
  { id: "a3", address: "25 Maitland Pl, Suite 804", price: 1850, status: "declined", appliedDays: 10, landlord: "Private Landlord", image: "https://images.unsplash.com/photo-1534714259038-764cb4cf1d58?w=400&h=300&fit=crop&auto=format" },
]

const LANDLORD_APPLICATIONS = [
  { id: "la1", tenantName: "Jordan Lee", creditScore: 731, packagePct: 85, budgetFit: true, appliedDays: 1, status: "new" },
  { id: "la2", tenantName: "Priya Sharma", creditScore: 778, packagePct: 100, budgetFit: true, appliedDays: 2, status: "reviewing" },
  { id: "la3", tenantName: "Marcus Osei", creditScore: 694, packagePct: 60, budgetFit: true, appliedDays: 3, status: "new" },
  { id: "la4", tenantName: "Chloe Tremblay", creditScore: 802, packagePct: 100, budgetFit: false, appliedDays: 4, status: "declined" },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(s: number) { if (s >= 7.5) return "#22c55e"; if (s >= 5.5) return "#f59e0b"; return "#ef4444" }

function matchScore(listing: Listing, prefs: TenantPrefs): number {
  const has = (p: string) => prefs.priorities.includes(p)
  const w = { price: has("price") ? 0.30 : 0.18, transit: has("transit") ? 0.22 : 0.14, walkability: has("walkability") ? 0.20 : 0.13, amenities: has("amenities") ? 0.18 : 0.12, location: has("location") ? 0.22 : 0.15, space: has("space") ? 0.20 : 0.12 }
  const total = Object.values(w).reduce((a, b) => a + b, 0)
  const n = Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v / total])) as typeof w
  const s = listing.scores
  return +(s.price * n.price + s.transit * n.transit + s.walkability * n.walkability + s.amenities * n.amenities + s.location * n.location + s.space * n.space).toFixed(1)
}

function calcMonthlyPayment(principal: number, annualRate: number, years: number) {
  if (!principal || !annualRate || !years) return 0
  const r = annualRate / 100 / 12; const n = years * 12
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}
function cmhcPremium(price: number, down: number) {
  const pct = down / price; const loan = price - down
  if (pct >= 0.20) return 0; if (pct >= 0.15) return loan * 0.028; if (pct >= 0.10) return loan * 0.031; return loan * 0.040
}
function stressTestRate(rate: number) { return Math.max(rate + 2, 5.25) }
function ontarioLTT(price: number) {
  if (price <= 55000) return price * 0.005; if (price <= 250000) return 275 + (price - 55000) * 0.010
  if (price <= 400000) return 2225 + (price - 250000) * 0.015; if (price <= 2000000) return 4475 + (price - 400000) * 0.020
  return 36475 + (price - 2000000) * 0.025
}
function torontoMunicipalLTT(price: number) {
  if (price <= 55000) return price * 0.005; if (price <= 250000) return 275 + (price - 55000) * 0.010
  if (price <= 400000) return 2225 + (price - 250000) * 0.015; if (price <= 2000000) return 4475 + (price - 400000) * 0.020
  return 36475 + (price - 2000000) * 0.025
}
function bcPTT(price: number) {
  if (price <= 200000) return price * 0.01; if (price <= 2000000) return 2000 + (price - 200000) * 0.02
  return 2000 + 1800000 * 0.02 + (price - 2000000) * 0.03
}
function quebecWelcomeTax(price: number) {
  if (price <= 58900) return price * 0.005; if (price <= 294600) return 294.5 + (price - 58900) * 0.01
  if (price <= 552300) return 2650.5 + (price - 294600) * 0.015
  return 6514 + (price - 552300) * 0.02
}
function provincialLTT(price: number, province: string, inToronto: boolean, ftb: boolean): { items: { label: string; value: number; rebate?: number }[] } {
  const items: { label: string; value: number; rebate?: number }[] = []
  if (province === "ON") {
    const ltt = ontarioLTT(price)
    const onRebate = ftb ? Math.min(ltt, 4000) : 0
    items.push({ label: "Ontario land transfer tax", value: ltt, rebate: onRebate > 0 ? onRebate : undefined })
    if (inToronto) {
      const muni = torontoMunicipalLTT(price)
      const muniRebate = ftb ? Math.min(muni, 4475) : 0
      items.push({ label: "Toronto municipal LTT", value: muni, rebate: muniRebate > 0 ? muniRebate : undefined })
    }
  } else if (province === "BC") {
    const ptt = bcPTT(price)
    const bcRebate = ftb && price <= 500000 ? ptt : ftb && price <= 525000 ? ptt * (1 - (price - 500000) / 25000) : 0
    items.push({ label: "BC property transfer tax", value: ptt, rebate: bcRebate > 0 ? bcRebate : undefined })
  } else if (province === "QC") {
    items.push({ label: "Québec welcome tax", value: quebecWelcomeTax(price) })
  } else if (province === "AB") {
    const titleFee = Math.min(400, Math.round(price / 5000) * 5 + 50)
    items.push({ label: "Alberta title transfer fee", value: titleFee })
  }
  return { items }
}
function closingCosts(price: number, province: string, inToronto: boolean, ftb: boolean, insurance: number) {
  const lttResult = provincialLTT(price, province, inToronto, ftb)
  const legalFees = Math.min(3500, Math.max(1800, Math.round(price * 0.0015 / 100) * 100))
  const titleInsurance = price <= 500000 ? 300 : price <= 1000000 ? 400 : 550
  const homeInspection = 550
  const movingCosts = 1800
  const lttItems = lttResult.items
  const lttNet = lttItems.reduce((s, i) => s + i.value - (i.rebate || 0), 0)
  return { lttItems, legalFees, titleInsurance, homeInspection, movingCosts, insurance, lttNet }
}

const RATE_MAP: Record<string, number> = { fixed5: 5.49, fixed3: 5.29, variable: 6.2 }

// ─── Shared UI ────────────────────────────────────────────────────────────────

function RentreWordmark({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <div className={`flex items-center ${size === "sm" ? "gap-1.5" : "gap-2"}`}>
      <img
        src={rentreLogoMark}
        alt="Rentre logo mark"
        className={size === "sm" ? "w-6 h-6 rounded-md object-cover" : "w-8 h-8 rounded-lg object-cover"}
      />
      <span className={`font-semibold text-foreground tracking-tight ${size === "sm" ? "text-xs" : "text-sm"}`} style={{ fontFamily: DISPLAY }}>
        rentre<span className="text-[11px] text-primary font-bold">.ca</span>
      </span>
    </div>
  )
}

export function NavBar({ onBack, onHome, onApplications, onPackage, onBuildings, onListings, isSignedIn, role, onSignIn, onLandlord, onRealtor }: {
  onBack?: () => void; onHome: () => void; onApplications?: () => void; onPackage?: () => void; onBuildings?: () => void; onListings?: () => void
  isSignedIn?: boolean; role?: UserRole; onSignIn?: () => void; onLandlord?: () => void; onRealtor?: () => void
}) {
  return (
    <nav className="relative flex items-center justify-between px-4 md:px-8 py-3 border-b border-border bg-background/95" style={{ backdropFilter: "blur(12px)" }}>
      <div className="flex items-center gap-2.5">
        {onBack && (
          <button onClick={onBack} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors mr-0.5">
            <ChevronLeft size={18} />
          </button>
        )}
        <button onClick={onHome}><RentreWordmark /></button>
      </div>
      {(onBuildings || onListings) && <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full bg-secondary p-1 md:flex">{onBuildings && <button onClick={onBuildings} className="rounded-full px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-card">Buildings</button>}{onListings && <button onClick={onListings} className="rounded-full px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-card">Listings</button>}</div>}
      <div className="flex items-center gap-2">
        {onApplications && (
          <button onClick={onApplications} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
            <ClipboardList size={13} /><span className="hidden sm:inline">Applications</span>
          </button>
        )}
        {onPackage && (
          <button onClick={onPackage} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-primary/25 rounded-full text-primary hover:bg-primary/5 transition-all">
            <UserCheck size={13} /><span className="hidden sm:inline">My package</span>
          </button>
        )}
        {onLandlord && (
          <button onClick={onLandlord} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
            <Building size={13} /><span className="hidden sm:inline">For Landlords</span>
          </button>
        )}
        {onRealtor && (
          <button onClick={onRealtor} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
            <Scale size={13} /><span className="hidden sm:inline">For Realtors</span>
          </button>
        )}
        {isSignedIn ? (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${role === "landlord" ? "bg-amber-500" : "bg-primary"}`} />
            <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center">
              <User size={13} className="text-muted-foreground" />
            </div>
          </div>
        ) : (
          <button onClick={onSignIn} className="px-3.5 py-1.5 text-xs font-semibold bg-accent text-accent-foreground rounded-full hover:opacity-90 transition-all">
            Sign in as a renter
          </button>
        )}
      </div>
    </nav>
  )
}

export function PrimaryButton({ children, onClick, disabled, fullWidth, size = "md", blockedReason }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; fullWidth?: boolean; size?: "sm" | "md"
  /**
   * What the user still has to do. Shown when a blocked button is pressed. Without it the press
   * is a silent no-op, so pass one anywhere `disabled` is driven by unfilled fields.
   */
  blockedReason?: string
}) {
  const [showBlocked, setShowBlocked] = useState(false)
  const msgId = useId()
  useEffect(() => { if (!disabled) setShowBlocked(false) }, [disabled])

  // aria-disabled, not disabled: the button keeps its place in the tab order, screen readers
  // announce it, and the press still lands so we can say what is missing.
  const button = (
    <button
      onClick={disabled ? () => setShowBlocked(true) : onClick}
      aria-disabled={disabled || undefined}
      aria-describedby={showBlocked && blockedReason ? msgId : undefined}
      className={`flex items-center justify-center gap-2 rounded-xl font-semibold transition-all ${
        disabled ? "bg-muted text-foreground" : "bg-accent text-accent-foreground hover:opacity-90 active:scale-[0.98]"
      } ${fullWidth ? "w-full" : ""} ${size === "sm" ? "px-3 py-2 text-xs" : "px-5 py-3 text-sm"}`}>
      {children}
    </button>
  )

  // No wrapper unless there is a message to hang off it, so existing flex call sites are untouched.
  if (!blockedReason) return button
  return (
    <div className={fullWidth ? "w-full" : ""}>
      {button}
      {showBlocked && (
        <p id={msgId} role="alert" className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />{blockedReason}
        </p>
      )}
    </div>
  )
}

export function FormInput({ label, placeholder, value, onChange, type = "text", prefix, optional, suffix }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void
  type?: string; prefix?: string; optional?: boolean; suffix?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5 tracking-wide uppercase">
        {label}{optional && <span className="ml-1.5 text-[10px] normal-case font-normal opacity-60">optional</span>}
      </label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>}
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full px-3 py-2.5 rounded-md border border-border bg-input-background text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/40 transition-all"
          style={{ paddingLeft: prefix ? "1.75rem" : undefined, paddingRight: suffix ? "2.5rem" : undefined }} />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  )
}

export function SelectInput({ label, value, onChange, options, optional }: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; optional?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5 tracking-wide uppercase">
        {label}{optional && <span className="ml-1.5 text-[10px] normal-case font-normal opacity-60">optional</span>}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-md border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all appearance-none cursor-pointer">
        <option value="" disabled>Select…</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function AmenityCheckbox({ label, checked, onChange, icon }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; icon?: React.ReactNode
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group" onClick={() => onChange(!checked)}>
      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${checked ? "bg-primary border-primary" : "border-border bg-input-background group-hover:border-foreground/30"}`}>
        {checked && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-foreground transition-colors select-none">
        {icon && <span className="opacity-60">{icon}</span>}{label}
      </div>
    </label>
  )
}

function Chip({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`px-3 py-2 rounded-full text-xs font-medium border transition-all ${checked ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"}`}>
      {checked && "✓ "}{label}
    </button>
  )
}

function SectionCard({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card px-5 py-4 shadow-sm ${className}`}>
      {title && <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">{title}</div>}
      {children}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { new: "bg-blue-500/10 text-blue-700 border-blue-500/20", reviewing: "bg-amber-500/10 text-amber-700 border-amber-500/20", interview: "bg-purple-500/10 text-purple-700 border-purple-500/20", approved: "bg-green-500/10 text-green-700 border-green-500/20", declined: "bg-red-500/10 text-red-700 border-red-500/20" }
  const labels: Record<string, string> = { new: "New", reviewing: "Under review", interview: "Interview", approved: "Approved", declined: "Declined" }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${map[status] || ""}`}>{labels[status] || status}</span>
}

function SubScoreRow({ label, score, weight, icon }: { label: string; score: number; weight?: number; icon?: React.ReactNode }) {
  const color = scoreColor(score)
  return (
    <div className="flex items-center gap-3 py-2.5">
      {icon && <div className="text-muted-foreground shrink-0 w-4">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">{label}{weight && weight > 0.18 && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">priority</span>}</span>
          <span className="text-xs font-medium tabular-nums" style={{ fontFamily: MONO, color }}>{score.toFixed(1)}</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.07)" }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score * 10}%`, background: color }} />
        </div>
      </div>
    </div>
  )
}

// ─── Photo Gallery ────────────────────────────────────────────────────────────

const PHOTO_LABELS = ["Building", "Living room", "Kitchen", "Bedroom"]

function PhotoGallery({ photos, floorPlan }: { photos: string[]; floorPlan: string }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [showFloorPlan, setShowFloorPlan] = useState(false)

  return (
    <div>
      {/* Main image */}
      <div className="relative h-64 md:h-80 bg-secondary overflow-hidden">
        {showFloorPlan ? (
          <div className="absolute inset-0 bg-white flex items-center justify-center">
            <img src={floorPlan} alt="Floor plan" className="max-h-full max-w-full object-contain p-8" />
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-foreground/85 text-background text-xs font-semibold tracking-wide">FLOOR PLAN</div>
          </div>
        ) : (
          <img src={photos[activeIdx]} alt="" className="w-full h-full object-cover transition-all duration-300" />
        )}
        <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/50 text-white text-xs backdrop-blur-sm">
          {showFloorPlan ? "Floor plan" : `${activeIdx + 1} / ${photos.length}`}
        </div>
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-secondary/30 border-b border-border" style={{ scrollbarWidth: "none" }}>
        {photos.map((photo, i) => (
          <button key={i} onClick={() => { setActiveIdx(i); setShowFloorPlan(false) }}
            className={`shrink-0 relative rounded-lg overflow-hidden border-2 transition-all ${!showFloorPlan && activeIdx === i ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}
            style={{ width: 64, height: 46 }}>
            <img src={photo} alt={PHOTO_LABELS[i] || "Photo"} className="w-full h-full object-cover" />
            <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[8px] font-medium text-center py-0.5 uppercase tracking-wide">{PHOTO_LABELS[i] || `Photo ${i + 1}`}</div>
          </button>
        ))}
        <button onClick={() => setShowFloorPlan(true)}
          className={`shrink-0 rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 transition-all ${showFloorPlan ? "border-primary bg-primary/10" : "border-border bg-secondary opacity-70 hover:opacity-100"}`}
          style={{ width: 64, height: 46 }}>
          <svg width="14" height="12" viewBox="0 0 14 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground"><rect x="1" y="1" width="12" height="10" rx="1"/><path d="M1 5h12M5 5v6"/></svg>
          <span className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wide">Plan</span>
        </button>
      </div>
    </div>
  )
}

// ─── Star Rating & Review ─────────────────────────────────────────────────────

function StarRating({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} type="button"
          onClick={() => !readonly && onChange?.(value === star ? 0 : star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`text-lg leading-none transition-colors ${readonly ? "cursor-default" : "cursor-pointer"} ${(hover || value) >= star ? "text-amber-400" : "text-border"}`}>
          ★
        </button>
      ))}
    </div>
  )
}

function RatingSection({ isSignedIn, onSignIn }: { isSignedIn: boolean; onSignIn: () => void }) {
  const [ratings, setRatings] = useState<Record<string, number>>({ overall: 0, value: 0, location: 0, building: 0 })
  const [review, setReview] = useState("")
  const [submitted, setSubmitted] = useState(false)

  if (!isSignedIn) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-6 text-center">
        <Star size={20} className="mx-auto mb-2 text-amber-400 opacity-50" />
        <p className="text-sm font-medium text-foreground mb-1">Rate this rental</p>
        <p className="text-xs text-muted-foreground mb-4">Sign in to share your experience with this building.</p>
        <button onClick={onSignIn} className="px-4 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:opacity-90 transition-all">Sign in to rate</button>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5 text-center">
        <CheckCircle size={20} className="mx-auto mb-2 text-green-600" />
        <p className="text-sm font-medium text-green-700">Thank you for your rating!</p>
        <p className="text-xs text-muted-foreground mt-1">Your review helps other renters make informed decisions.</p>
      </div>
    )
  }

  const cats = [
    { key: "overall", label: "Overall" },
    { key: "value", label: "Value for money" },
    { key: "location", label: "Location & transit" },
    { key: "building", label: "Building & maintenance" },
  ]
  const anyRated = Object.values(ratings).some(r => r > 0)

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 border-b border-border">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rate this rental</div>
      </div>
      <div className="px-5 py-4">
        <p className="text-xs text-muted-foreground mb-4">Have you visited or lived here? Share your experience.</p>
        <div className="flex flex-col gap-0 mb-4 divide-y divide-border">
          {cats.map(cat => (
            <div key={cat.key} className="flex items-center justify-between py-3">
              <span className="text-sm text-foreground">{cat.label}</span>
              <StarRating value={ratings[cat.key]} onChange={v => setRatings(r => ({ ...r, [cat.key]: v }))} />
            </div>
          ))}
        </div>
        <textarea value={review} onChange={e => setReview(e.target.value)} placeholder="Tell future renters about your experience — building quality, landlord responsiveness, noise levels, neighbourhood vibe…" rows={3}
          className="w-full px-3 py-2.5 rounded-md border border-border bg-input-background text-foreground placeholder:text-muted-foreground/40 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none mb-3" />
        <PrimaryButton onClick={() => anyRated && setSubmitted(true)} disabled={!anyRated} fullWidth size="sm">
          <Star size={13} />Submit rating
        </PrimaryButton>
      </div>
    </div>
  )
}

// ─── HOME ─────────────────────────────────────────────────────────────────────

// ─── ROLE PICKER ─────────────────────────────────────────────────────────────

const CMA_RENTS: Record<string, { label: string; yoy: number; beds: { "1": number; "2": number; "3": number } }> = {
  "Toronto":            { label: "Toronto CMA",                       yoy: +2.1, beds: { "1": 2120, "2": 2820, "3": 3390 } },
  "Vancouver":          { label: "Vancouver CMA",                     yoy: +1.4, beds: { "1": 2350, "2": 3100, "3": 3820 } },
  "Calgary":            { label: "Calgary CMA",                       yoy: +4.8, beds: { "1": 1650, "2": 2050, "3": 2380 } },
  "Ottawa":             { label: "Ottawa–Gatineau CMA",               yoy: +2.9, beds: { "1": 1680, "2": 2150, "3": 2520 } },
  "Montréal":           { label: "Montréal CMA",                      yoy: +5.2, beds: { "1": 1380, "2": 1680, "3": 2080 } },
  "Edmonton":           { label: "Edmonton CMA",                      yoy: +6.1, beds: { "1": 1280, "2": 1560, "3": 1850 } },
  "Winnipeg":           { label: "Winnipeg CMA",                      yoy: +3.7, beds: { "1": 1200, "2": 1430, "3": 1700 } },
  "Hamilton":           { label: "Hamilton CMA",                      yoy: +1.8, beds: { "1": 1550, "2": 1920, "3": 2280 } },
  "Halifax":            { label: "Halifax CMA",                       yoy: +3.3, beds: { "1": 1680, "2": 2150, "3": 2550 } },
  "Kitchener–Waterloo": { label: "Kitchener–Cambridge–Waterloo CMA",  yoy: +2.6, beds: { "1": 1550, "2": 1920, "3": 2280 } },
}


// ─── HOME / BETA LANDING ──────────────────────────────────────────────────────

export function HomeScreen({ onRenter, onLandlord, onRealtor }: { onRenter: () => void; onLandlord: () => void; onRealtor: () => void }) {

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-16" style={{ fontFamily: BODY }}>
      <div className="w-full max-w-2xl">

        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2.5 mb-5">
            <img src={rentreLogoMark} alt="Rentre" className="w-10 h-10 rounded-xl object-cover" />
            <span className="text-xl font-semibold text-foreground tracking-tight" style={{ fontFamily: DISPLAY }}>rentre<span className="text-primary font-bold">.ca</span></span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-[1.12] mb-3" style={{ fontFamily: DISPLAY }}>
            Who are you here as?
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">We{"'"}ll tailor the experience to what you need.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Renter card */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary/25 bg-card p-6 shadow-sm md:p-8">
            <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
            <div className="flex items-start justify-between gap-4">
              <div className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm"><User size={18} /></div>
              <span className="font-mono text-[9px] font-medium uppercase tracking-[0.15em] text-primary">For renters</span>
            </div>
            <div className="mt-5 mb-6">
              <div className="text-2xl font-bold text-foreground" style={{ fontFamily: DISPLAY }}>I{"'"}m a renter</div>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">Choose how you want to get started.</p>
            </div>
            <div className="grid gap-2.5">
              {/* Option 1 */}
              <button onClick={onRenter} className="group flex items-start gap-3.5 rounded-xl bg-primary px-4 py-4 text-left text-primary-foreground transition-colors hover:bg-primary/90">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-primary-foreground/40 text-[10px] font-black">1</span>
                <span className="flex-1">
                  <span className="block text-sm font-bold leading-tight">Build your Renter Passport</span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-primary-foreground/70">One verified profile you send to any landlord — credit, income, references, all in one place.</span>
                </span>
                <ArrowRight size={16} className="mt-0.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
              {/* Option 2 — coming soon */}
              <div className="flex items-start gap-3.5 rounded-xl border border-dashed border-border bg-secondary/30 px-4 py-4 opacity-70 cursor-not-allowed select-none">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-border text-[10px] font-black text-muted-foreground">2</span>
                <span className="flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground leading-tight">Browse Rentals</span>
                    <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">Coming soon</span>
                  </span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">Tell us what you want and we{"'"}ll focus on finding units that fit your requirements.</span>
                </span>
                <Search size={15} className="mt-0.5 shrink-0 text-muted-foreground/40" />
              </div>
            </div>
          </div>

          {/* Property professional card */}
          <div className="relative flex flex-col items-start gap-5 overflow-hidden rounded-2xl border-2 border-border bg-card p-6 shadow-sm md:p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/80 to-transparent pointer-events-none" />
            <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center">
              <Building size={20} className="text-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground mb-1.5" style={{ fontFamily: DISPLAY }}>Work with renters</div>
              <p className="text-sm text-muted-foreground leading-relaxed">Choose the way you work with Rentre.</p>
            </div>
            <div className="relative flex w-full flex-col gap-1.5">
              {[
                { label: "Landlords",         desc: "List and manage units",       onClick: onLandlord, accent: false },
                { label: "Property Managers", desc: "Manage your portfolio",       onClick: onLandlord, accent: false },
                { label: "Realtors",          desc: "Find homes for clients",      onClick: onRealtor,  accent: false },
                { label: "Moving & Assembly", desc: "Become a service partner",    onClick: () => { window.location.href = "mailto:partners@rentre.ca?subject=Rentre%20service%20partner" }, accent: true },
              ].map(({ label, desc, onClick, accent }) => (
                <button
                  key={label}
                  onClick={onClick}
                  className={`group flex w-full items-center justify-between rounded-xl border bg-background px-4 py-3 text-left transition-colors ${accent ? "border-border hover:border-accent/40 hover:bg-accent/5" : "border-border hover:border-primary/35 hover:bg-primary/5"}`}>
                  <span>
                    <span className={`block text-sm font-semibold transition-colors ${accent ? "text-foreground group-hover:text-accent" : "text-foreground group-hover:text-primary"}`}>{label}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{desc}</span>
                  </span>
                  <ChevronRight size={14} className={`shrink-0 transition-all ${accent ? "text-muted-foreground group-hover:text-accent group-hover:translate-x-0.5" : "text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5"}`} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Rental Laws Section */}
        <div className="mt-12 w-full">
          <div className="mb-4 flex items-center gap-2">
            <Scale size={15} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground" style={{ fontFamily: MONO }}>Know your rights · Canadian Rental Law</span>
          </div>
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="border-b border-border bg-secondary/40 px-5 py-3.5">
              <p className="text-sm font-semibold text-foreground">Provincial &amp; Territorial Tenancy Acts</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">Rental law varies by province. Click your province to view the governing legislation.</p>
            </div>
            <div className="divide-y divide-border">
              {[
                { province: "Ontario",          short: "ON", act: "Residential Tenancies Act, 2006",          body: "Landlord and Tenant Board (LTB)",        url: "https://www.ontario.ca/laws/statute/06r17" },
                { province: "British Columbia", short: "BC", act: "Residential Tenancy Act",                  body: "Residential Tenancy Branch (RTB)",       url: "https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/02078_01" },
                { province: "Alberta",          short: "AB", act: "Residential Tenancies Act",                body: "Residential Tenancy Dispute Resolution", url: "https://www.qp.alberta.ca/documents/Acts/r17p1.pdf" },
                { province: "Quebec",           short: "QC", act: "Civil Code of Québec (Div. IV.1)",         body: "Tribunal administratif du logement",     url: "https://www.tal.gouv.qc.ca/en" },
                { province: "Manitoba",         short: "MB", act: "Residential Tenancies Act",                body: "Residential Tenancies Branch",          url: "https://web2.gov.mb.ca/laws/statutes/ccsm/r119e.php" },
                { province: "Saskatchewan",     short: "SK", act: "Residential Tenancies Act, 2006",          body: "Office of Residential Tenancies",        url: "https://publications.saskatchewan.ca/#/products/64005" },
                { province: "Nova Scotia",      short: "NS", act: "Residential Tenancies Act",                body: "Director of Residential Tenancies",      url: "https://nslegislature.ca/sites/default/files/legc/statutes/residential%20tenancies.pdf" },
                { province: "New Brunswick",    short: "NB", act: "Residential Tenancies Act",                body: "Rentalsman Tribunal",                   url: "https://www.gnb.ca/legisnb/acts/r-10-2.htm" },
                { province: "Newfoundland",     short: "NL", act: "Residential Tenancies Act, 2018",          body: "Residential Tenancies Office",          url: "https://www.assembly.nl.ca/legislation/sr/statutes/r14-1.htm" },
                { province: "PEI",              short: "PE", act: "Rental of Residential Property Act",       body: "Island Regulatory and Appeals Commission",url: "https://www.irac.pe.ca/rental/" },
              ].map(({ province, short, act, body, url }) => (
                <a
                  key={short}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0 w-9 h-9 rounded-lg bg-primary/8 border border-primary/15 flex items-center justify-center text-[10px] font-black text-primary" style={{ fontFamily: MONO }}>{short}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight">{province}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{act}</p>
                      <p className="text-[10px] text-muted-foreground/70 truncate">{body}</p>
                    </div>
                  </div>
                  <ExternalLink size={13} className="shrink-0 text-muted-foreground/40 transition-colors group-hover:text-primary" />
                </a>
              ))}
            </div>
            <div className="border-t border-border bg-secondary/20 px-5 py-3 flex items-start gap-2">
              <Info size={12} className="shrink-0 mt-0.5 text-muted-foreground/60" />
              <p className="text-[10px] leading-relaxed text-muted-foreground">This is general information only and is not legal advice. Laws and regulations change — always verify directly with the relevant authority or consult a licensed paralegal or lawyer.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── RENTER HOME ──────────────────────────────────────────────────────────────


export function DiscoveryScreen({ mode, onSelectListing, onSelectBuilding, onGoBuildings, onGoListings }: { mode: "buildings" | "listings"; onSelectListing: (id: string) => void; onSelectBuilding: (id: string) => void; onGoBuildings: () => void; onGoListings: () => void }) {
  const isBuildings = mode === "buildings"
  const buildingNames = ["The Kingfisher", "The Juniper", "The Harbord", "The Alder"]
  const listingTypes = ["Condo", "Detached home", "Townhome", "Loft"]
  const title = isBuildings ? "Verified Buildings" : "Verified Listings"
  const description = isBuildings ? "Explore verified multi-unit buildings with transparent landlord pricing and building-level amenities." : "Explore verified condos, homes, townhomes, and other individual rentals across Canada."
  return <div className="min-h-screen bg-background px-4 py-8 md:px-8 md:py-10" style={{ fontFamily: BODY }}><div className="mx-auto max-w-6xl"><div className="mb-8 flex flex-col gap-5 border-b border-border pb-6 md:flex-row md:items-end md:justify-between"><div><p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] text-primary"><BadgeCheck size={14} />Verified by Rentre</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.035em] text-foreground md:text-5xl" style={{ fontFamily: DISPLAY }}>{title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div><div className="flex w-fit rounded-full bg-secondary p-1"><button onClick={onGoBuildings} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${isBuildings ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Buildings</button><button onClick={onGoListings} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${!isBuildings ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Listings</button></div></div><div className="mb-7 flex flex-wrap gap-2">{(isBuildings ? ["All buildings", "Toronto", "Vancouver", "Montréal", "Pet friendly"] : ["All homes", "Condos", "Houses", "Townhomes", "Short-term"]).map((filter, index) => <button key={filter} className={`rounded-full px-4 py-2 text-sm font-medium transition ${index === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-muted"}`}>{filter}</button>)}</div><div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">{MOCK_LISTINGS.slice(0, 6).map((listing, index) => <div key={listing.id} role="button" tabIndex={0} onClick={() => isBuildings ? onSelectBuilding(listing.id) : onSelectListing(listing.id)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); isBuildings ? onSelectBuilding(listing.id) : onSelectListing(listing.id) } }} className="group cursor-pointer rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"><div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-secondary"><img src={isBuildings ? listing.image : (listing.photos[(index % Math.max(1, listing.photos.length - 1)) + 1] || listing.image)} alt={isBuildings ? `${buildingNames[index % buildingNames.length]}, verified building` : `Interior of a ${listing.unitType} rental at ${listing.address}`} className="size-full object-cover transition duration-500 group-hover:scale-105" /><span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-[10px] font-semibold text-foreground shadow-sm"><BadgeCheck size={12} className="text-primary" />Verified {isBuildings ? "building" : "listing"}</span><button type="button" aria-label={`Save ${listing.address}`} onClick={e => e.stopPropagation()} className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-card/95 text-foreground shadow-sm transition hover:scale-105"><Heart size={15} /></button></div><div className="px-1 pt-3"><div className="flex items-start justify-between gap-2"><h2 className="text-base font-semibold text-foreground">{isBuildings ? buildingNames[index % buildingNames.length] : `${listing.bedrooms} bed ${listingTypes[index % listingTypes.length]}`}</h2><span className="flex items-center gap-0.5 text-xs text-foreground"><Star className="fill-current" size={12} />{(4.72 + index / 100).toFixed(2)}</span></div><p className="mt-1 text-sm text-muted-foreground">{isBuildings ? `${listing.address} · ${listing.neighbourhood}` : `${listing.address}, ${listing.city}`}</p><p className="mt-1 text-xs text-muted-foreground">{isBuildings ? ["Gym · Secure parcel room", "Concierge · Bike storage", "Rooftop · Pool", "Parking · EV charging"][index % 4] : `${listing.bedrooms} bed · ${listing.bathrooms} bath · ${listing.sqft.toLocaleString()} sq ft`}</p><p className="mt-2 text-sm text-foreground">{isBuildings ? "Homes from" : "Rent"} <strong>${listing.price.toLocaleString()}</strong> / month</p></div></div>)}</div></div></div>
}

// ─── Building enrichment types & data ─────────────────────────────────────────

interface UnitEntry { label: string; rent: number; sqft: number; available: string }
interface UnitGroup  { type: string; bedrooms: number; bathrooms: number; available: number; from: number; units: UnitEntry[] }
interface BuildingMeta {
  name: string; totalUnits: number
  amenities: string[]
  nearby: { name: string; distance: string; category: "transit" | "grocery" | "park" | "health" | "dining" }[]
  addOnPricing: { label: string; price: number | "included" }[]
  landlordClauses: string[]
  unitGroups: UnitGroup[]
}
type SelectedUnit = UnitEntry & { groupType: string; bedrooms: number; bathrooms: number }

const BUILDING_META: Record<string, BuildingMeta> = {
  "1": {
    name: "The Sherbourne",
    totalUnits: 186,
    amenities: ["Fitness studio", "Indoor pool", "Concierge 24/7", "Secure parcel room", "Bike storage", "EV charging", "Rooftop terrace", "Pet wash station"],
    nearby: [
      { name: "Sherbourne Station (Line 2)", distance: "6 min walk", category: "transit" },
      { name: "No Frills", distance: "4 min walk", category: "grocery" },
      { name: "Allan Gardens", distance: "8 min walk", category: "park" },
      { name: "St. Michael's Hospital", distance: "11 min walk", category: "health" },
      { name: "Cabbagetown Bistro", distance: "3 min walk", category: "dining" },
    ],
    addOnPricing: [
      { label: "Underground parking", price: 165 },
      { label: "Storage locker", price: 65 },
      { label: "Utilities (water & heat)", price: 175 },
      { label: "Air conditioning", price: "included" },
      { label: "Pet package", price: 75 },
    ],
    landlordClauses: [
      "Tenant must provide proof of tenant insurance prior to key handover.",
      "No smoking or vaping anywhere on the premises or within 9 metres of any entrance.",
      "Quiet hours are observed between 11:00 PM and 7:00 AM daily.",
      "Tenant is responsible for reporting maintenance issues within 48 hours of discovery.",
      "Balconies may not be used for storage of bicycles, furniture, or materials visible from street level.",
    ],
    unitGroups: [
      {
        type: "1 Bedroom", bedrooms: 1, bathrooms: 1, available: 2, from: 2145,
        units: [
          { label: "Unit 806", rent: 2145, sqft: 592, available: "Aug 1, 2026" },
          { label: "Unit 1112", rent: 2210, sqft: 618, available: "Sep 1, 2026" },
        ],
      },
      {
        type: "2 Bedroom", bedrooms: 2, bathrooms: 2, available: 3, from: 2850,
        units: [
          { label: "Unit 402", rent: 2850, sqft: 880, available: "Aug 1, 2026" },
          { label: "Unit 907", rent: 2945, sqft: 895, available: "Aug 15, 2026" },
          { label: "Unit 1204", rent: 3100, sqft: 940, available: "Sep 1, 2026" },
        ],
      },
      {
        type: "3 Bedroom", bedrooms: 3, bathrooms: 2, available: 1, from: 3925,
        units: [
          { label: "Unit 1501", rent: 3925, sqft: 1280, available: "Oct 1, 2026" },
        ],
      },
    ],
  },
  "2": {
    name: "480 King West Lofts",
    totalUnits: 124,
    amenities: ["Fitness centre", "Rooftop pool", "Concierge", "Bike storage", "Dog run", "Party room"],
    nearby: [
      { name: "King Station (Line 1)", distance: "5 min walk", category: "transit" },
      { name: "Sobeys Urban Fresh", distance: "7 min walk", category: "grocery" },
      { name: "Trinity Bellwoods Park", distance: "12 min walk", category: "park" },
      { name: "SickKids Hospital", distance: "14 min walk", category: "health" },
      { name: "Forno Cultura", distance: "4 min walk", category: "dining" },
    ],
    addOnPricing: [
      { label: "Underground parking", price: 195 },
      { label: "Storage locker", price: 80 },
      { label: "Gym access", price: "included" },
      { label: "Concierge", price: "included" },
    ],
    landlordClauses: [
      "Tenant insurance is mandatory and must be maintained for the full tenancy term.",
      "Guests may not stay more than 7 consecutive nights without written consent from management.",
      "Balconies are not to be used for smoking, BBQs, or personal storage.",
    ],
    unitGroups: [
      {
        type: "1 Bed + Den", bedrooms: 1, bathrooms: 1, available: 3, from: 2750,
        units: [
          { label: "Loft 410", rent: 2750, sqft: 740, available: "Aug 1, 2026" },
          { label: "Loft 612", rent: 2850, sqft: 780, available: "Aug 1, 2026" },
          { label: "Loft 810", rent: 2990, sqft: 810, available: "Sep 1, 2026" },
        ],
      },
      {
        type: "2 Bedroom", bedrooms: 2, bathrooms: 2, available: 1, from: 3500,
        units: [
          { label: "Loft 1102", rent: 3500, sqft: 1020, available: "Oct 1, 2026" },
        ],
      },
    ],
  },
}

function getBuildingMeta(id: string): BuildingMeta {
  return BUILDING_META[id] ?? {
    name: "Verified Building",
    totalUnits: 80,
    amenities: ["Gym", "Concierge", "Bike storage", "Secure parcel room"],
    nearby: [
      { name: "Transit stop", distance: "5 min walk", category: "transit" },
      { name: "Grocery store", distance: "8 min walk", category: "grocery" },
      { name: "Local park", distance: "10 min walk", category: "park" },
    ],
    addOnPricing: [
      { label: "Parking", price: 150 },
      { label: "Storage locker", price: 55 },
    ],
    landlordClauses: [
      "Tenant insurance is required prior to move-in.",
      "No smoking on the premises.",
      "Quiet hours from 11 PM to 7 AM.",
    ],
    unitGroups: [
      {
        type: "1 Bedroom", bedrooms: 1, bathrooms: 1, available: 2, from: 2200,
        units: [
          { label: "Unit 301", rent: 2200, sqft: 600, available: "Aug 1, 2026" },
          { label: "Unit 504", rent: 2350, sqft: 650, available: "Sep 1, 2026" },
        ],
      },
    ],
  }
}

// ─── Draft Lease Modal ────────────────────────────────────────────────────────

function DraftLeaseModal({ unit, buildingMeta, listing, userProfile, onClose }: {
  unit: SelectedUnit
  buildingMeta: BuildingMeta
  listing: Listing
  userProfile: UserProfile | null
  onClose: () => void
}) {
  const [agreed, setAgreed] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const dateStr = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })
  const tenantName = userProfile?.name || "___________________"
  const tenantEmail = userProfile?.email || "___________________"
  const tenantPhone = userProfile?.phone || "___________________"

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
        <ModalKeys onClose={onClose} />
        <div className="bg-card rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={28} className="text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2" style={{ fontFamily: DISPLAY }}>Offer submitted</h2>
          <p className="text-sm text-muted-foreground mb-1">Your draft offer has been sent to</p>
          <p className="text-sm font-semibold text-foreground mb-5">{listing.landlord}</p>
          <p className="text-xs text-muted-foreground mb-8 leading-relaxed">Your renter profile will remain anonymous until the landlord accepts. You will receive a notification within 48 hours.</p>
          <button onClick={onClose} className="w-full py-3 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 transition-all">Done</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-foreground/40 backdrop-blur-sm md:p-6">
      <ModalKeys onClose={onClose} />
      <div
        role="dialog" aria-modal="true" aria-label="Draft lease agreement"
        className="w-full md:max-w-2xl max-h-[94vh] overflow-y-auto bg-card rounded-t-3xl md:rounded-3xl shadow-2xl"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Offer to Lease</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{listing.address}, {unit.label}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-7 md:px-8 space-y-7">
          <div className="rounded-2xl bg-[#FAF7F0] border border-border p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary mb-1.5">Residential Tenancy Agreement</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This agreement is entered into under the <em>Residential Tenancies Act, 2006</em> (Ontario).
              This draft is prepared by Rentre.ca on behalf of the prospective tenant and is subject to landlord acceptance.
            </p>
            <p className="text-[10px] text-muted-foreground mt-2">Prepared: {dateStr}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">Parties</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-secondary/40 p-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Landlord</p>
                <p className="text-sm font-semibold text-foreground">{listing.landlord}</p>
                <p className="text-xs text-muted-foreground mt-1">{listing.address}</p>
                <p className="text-xs text-muted-foreground">{listing.city}, Ontario</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <BadgeCheck size={11} className="text-primary" />
                  <span className="text-[10px] text-primary font-medium">Verified on Rentre</span>
                </div>
              </div>
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-2">Tenant (You)</p>
                <p className="text-sm font-semibold text-foreground">{tenantName}</p>
                <p className="text-xs text-muted-foreground mt-1">{tenantEmail}</p>
                <p className="text-xs text-muted-foreground">{tenantPhone}</p>
                {!userProfile && (
                  <p className="text-[10px] text-accent mt-2">Sign in to auto-fill your details.</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">Rental Unit</p>
            <div className="rounded-xl border border-border bg-secondary/40 p-4 grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Address</p>
                <p className="font-semibold text-foreground">{listing.address}</p>
                <p className="text-muted-foreground">{unit.label}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Unit type</p>
                <p className="font-semibold text-foreground">{unit.groupType}</p>
                <p className="text-muted-foreground">{unit.sqft.toLocaleString()} sqft</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">Tenancy Terms</p>
            <div className="rounded-xl border border-border bg-secondary/40 divide-y divide-border overflow-hidden">
              {[
                { label: "Monthly base rent", value: `$${unit.rent.toLocaleString()} / month` },
                { label: "Tenancy start date", value: unit.available },
                { label: "Lease term", value: "12 months (fixed)" },
                { label: "Rent due", value: "1st of each month" },
                { label: "Rent controlled", value: listing.rentControlled ? "Yes" : "No" },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-muted-foreground">{row.label}</span>
                  <span className="text-xs font-semibold text-foreground" style={{ fontFamily: MONO }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {buildingMeta.addOnPricing.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">Add-ons &amp; Services</p>
              <div className="rounded-xl border border-border bg-secondary/40 divide-y divide-border overflow-hidden">
                {buildingMeta.addOnPricing.map(a => (
                  <div key={a.label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-foreground">{a.label}</span>
                    <span className="text-xs" style={{ fontFamily: MONO }}>
                      {a.price === "included"
                        ? <span className="text-green-700 font-semibold">Included</span>
                        : <span className="text-muted-foreground">+${a.price}/mo</span>}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">Add-ons are optional and confirmed at lease signing.</p>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">Standard Conditions</p>
            <div className="space-y-2.5">
              {[
                "Tenant shall pay rent in full on the 1st day of each month.",
                "Tenant shall maintain the rental unit in a reasonable state of cleanliness and repair.",
                "Tenant shall not sublet or assign the unit without written consent of the landlord.",
                "Tenant shall carry tenant (contents and liability) insurance throughout the tenancy.",
                "Landlord shall provide at least 24 hours written notice before entering the unit, except in emergencies.",
              ].map((clause, i) => (
                <div key={i} className="flex gap-3 text-xs text-muted-foreground leading-relaxed">
                  <span className="shrink-0 text-primary/50 pt-0.5" style={{ fontFamily: MONO }}>{String(i + 1).padStart(2, "0")}</span>
                  <span>{clause}</span>
                </div>
              ))}
            </div>
          </div>

          {buildingMeta.landlordClauses.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-1">Landlord Additional Clauses</p>
              <p className="text-[10px] text-muted-foreground mb-3">Added by {listing.landlord}.</p>
              <div className="rounded-xl border border-accent/25 bg-accent/5 divide-y divide-accent/10 overflow-hidden">
                {buildingMeta.landlordClauses.map((clause, i) => (
                  <div key={i} className="flex gap-3 px-4 py-3 text-xs text-foreground leading-relaxed">
                    <span className="shrink-0 text-accent/50 pt-0.5" style={{ fontFamily: MONO }}>{String(i + 1).padStart(2, "0")}</span>
                    <span>{clause}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl bg-secondary/60 border border-border p-4 flex gap-3">
            <Lock size={14} className="text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your full renter profile — credit report, income, and references — will only be shared after the landlord accepts this offer. You remain anonymous until then.
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer" onClick={() => setAgreed(a => !a)}>
            <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${agreed ? "bg-primary border-primary" : "border-border"}`}>
              {agreed && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </div>
            <span className="text-xs text-muted-foreground leading-relaxed">
              I have read and understood this draft lease. I confirm the information is accurate and wish to submit this offer to the landlord.
            </span>
          </label>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
            Cancel
          </button>
          <button
            disabled={!agreed}
            onClick={() => setSubmitted(true)}
            className="flex-1 py-3 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <Send size={14} />Submit offer
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Unit Detail Sheet ────────────────────────────────────────────────────────

function UnitDetailSheet({ unit, building, buildingMeta, isSignedIn, onSignIn, onClose, onMakeOffer }: {
  unit: SelectedUnit
  building: Listing
  buildingMeta: BuildingMeta
  isSignedIn: boolean
  onSignIn: () => void
  onClose: () => void
  onMakeOffer: () => void
}) {
  const [photoIdx, setPhotoIdx] = useState(0)
  const [viewingDone, setViewingDone] = useState(false)
  const [showSlotPicker, setShowSlotPicker] = useState(false)
  const [sheetActiveDate, setSheetActiveDate] = useState<string | null>(null)
  const [sheetSelectedTime, setSheetSelectedTime] = useState<string | null>(null)
  const gallery = building.photos.length > 0 ? building.photos : [building.image]
  const LABELS = ["Building", "Living room", "Kitchen", "Bedroom", "Bathroom"]

  if (showSlotPicker) {
    const activeTimes = LANDLORD_SLOTS.find(s => s.date === sheetActiveDate)?.times ?? []
    return (
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-foreground/40 backdrop-blur-sm md:p-6">
        <ModalKeys onClose={() => setShowSlotPicker(false)} />
        <div className="w-full md:max-w-md bg-card rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <p className="text-sm font-semibold text-foreground">Request a viewing</p>
              <p className="text-xs text-muted-foreground">{building.address}, {unit.label}</p>
            </div>
            <button onClick={() => setShowSlotPicker(false)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><X size={16} /></button>
          </div>

          <div className="px-5 pt-5 pb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Available dates</p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5" style={{ scrollbarWidth: "none" }}>
              {LANDLORD_SLOTS.map(slot => {
                const isSelected = sheetActiveDate === slot.date
                return (
                  <button
                    key={slot.date}
                    onClick={() => { setSheetActiveDate(slot.date); setSheetSelectedTime(null) }}
                    className={`flex-none flex flex-col items-center rounded-2xl px-4 py-3 border-2 transition-all min-w-[68px] ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/40 hover:border-primary/40 text-foreground"}`}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{slot.dayShort}</span>
                    <span className="text-xl font-bold leading-tight mt-0.5">{slot.dayNum}</span>
                    <span className="text-[10px] font-medium opacity-70">{slot.month}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {sheetActiveDate && (
            <div className="px-5 pb-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Available times</p>
              <div className="grid grid-cols-3 gap-2">
                {activeTimes.map(t => {
                  const isSelected = sheetSelectedTime === t
                  return (
                    <button
                      key={t}
                      onClick={() => setSheetSelectedTime(t)}
                      className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/40 hover:border-primary/40 text-foreground"}`}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {!sheetActiveDate && (
            <div className="px-5 pb-6 flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar size={13} className="text-primary/50 shrink-0" />
              Select a date above to see available times
            </div>
          )}

          <div className="px-5 pb-6 pt-1 border-t border-border">
            {sheetActiveDate && sheetSelectedTime && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20 mb-3 text-xs text-primary font-medium">
                <CheckCircle size={12} className="shrink-0" />
                {sheetActiveDate} at {sheetSelectedTime}
              </div>
            )}
            <button
              onClick={() => { if (sheetActiveDate && sheetSelectedTime) { setShowSlotPicker(false); setViewingDone(true) } }}
              className={`w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-all ${!(sheetActiveDate && sheetSelectedTime) ? "opacity-40" : "hover:opacity-90"}`}
            >
              Confirm viewing request
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (viewingDone) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
        <ModalKeys onClose={onClose} />
        <div className="bg-card rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto mb-5">
            <Eye size={28} className="text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2" style={{ fontFamily: DISPLAY }}>Viewing requested</h2>
          <p className="text-sm text-muted-foreground mb-1">{building.address}, {unit.label}</p>
          <p className="text-sm font-semibold text-foreground mb-5">{building.landlord}</p>
          {sheetActiveDate && sheetSelectedTime && (
            <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20 mb-4 text-xs text-primary font-medium">
              <Calendar size={12} />
              {sheetActiveDate} at {sheetSelectedTime}
            </div>
          )}
          <p className="text-xs text-muted-foreground mb-8 leading-relaxed">The landlord will confirm within 48 hours. Your profile stays anonymous until you choose to engage further.</p>
          <button onClick={onClose} className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all">Done</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-foreground/35 backdrop-blur-sm md:p-6">
      <ModalKeys onClose={onClose} />
      <div
        role="dialog" aria-modal="true" aria-label={`${unit.label} unit details`}
        className="w-full md:max-w-5xl max-h-[94vh] overflow-y-auto rounded-t-3xl md:rounded-3xl bg-card shadow-2xl"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-5 py-4 backdrop-blur rounded-t-3xl">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Verified listing</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">{building.address}, {unit.label}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-muted transition-colors">
            <X size={17} />
          </button>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1.35fr)_340px]">
          <div>
            <div className="relative aspect-[16/9] bg-secondary overflow-hidden">
              <img src={gallery[photoIdx] || gallery[0]} alt={`Photo ${photoIdx + 1} of ${unit.label}`} className="w-full h-full object-cover" />
              <div className="absolute bottom-3 right-3 rounded-full bg-black/55 text-white text-xs px-2.5 py-1 backdrop-blur-sm">{photoIdx + 1} / {gallery.length}</div>
            </div>
            <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-border bg-secondary/30" style={{ scrollbarWidth: "none" }}>
              {gallery.map((photo, i) => (
                <button key={i} onClick={() => setPhotoIdx(i)}
                  className={`shrink-0 rounded-lg overflow-hidden border-2 transition-all ${photoIdx === i ? "border-primary" : "border-transparent opacity-60 hover:opacity-90"}`}
                  style={{ width: 64, height: 46 }}>
                  <img src={photo} alt={LABELS[i] || `Photo ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            <div className="px-5 py-6 md:px-7 space-y-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-semibold text-foreground leading-tight" style={{ fontFamily: DISPLAY }}>
                  {building.address}<span className="font-normal text-muted-foreground">, {unit.label}</span>
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{building.neighbourhood} · {building.city}</p>
              </div>

              <div className="grid grid-cols-4 overflow-hidden rounded-2xl border border-border divide-x divide-border">
                {[
                  { label: "Sq ft", value: unit.sqft.toLocaleString() },
                  { label: "Beds", value: String(unit.bedrooms) },
                  { label: "Baths", value: String(unit.bathrooms) },
                  { label: "Built", value: String(building.yearBuilt) },
                ].map(stat => (
                  <div key={stat.label} className="p-4 text-center bg-card">
                    <p className="text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3">Building amenities</p>
                <div className="flex flex-wrap gap-1.5">
                  {buildingMeta.amenities.map(a => (
                    <span key={a} className="rounded-full bg-secondary border border-border px-2.5 py-1 text-xs font-medium text-foreground flex items-center gap-1">
                      <CheckCircle size={10} className="text-primary" />{a}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3">Available add-ons</p>
                <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                  {buildingMeta.addOnPricing.map(a => (
                    <div key={a.label} className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-foreground">{a.label}</span>
                      {a.price === "included"
                        ? <span className="text-xs font-semibold text-green-700">Included</span>
                        : <span className="text-xs font-medium text-muted-foreground" style={{ fontFamily: MONO }}>+${a.price}/mo</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3">Nearby</p>
                <div className="space-y-2.5">
                  {buildingMeta.nearby.map(item => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item.distance}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="border-t border-border lg:border-l lg:border-t-0 p-5 lg:p-7 flex flex-col">
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Monthly rent</p>
              <p className="mt-2" style={{ fontFamily: MONO }}>
                <span className="text-4xl font-bold text-foreground">${unit.rent.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground ml-1">/mo net</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-4">Base rent · add-ons listed separately</p>

              <div className="rounded-xl border border-border bg-secondary/50 px-4 py-3 flex items-center justify-between mb-5">
                <span className="text-xs text-muted-foreground">Est. all-in</span>
                <span className="text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>
                  ${(unit.rent + 188).toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/mo</span>
                </span>
              </div>

              <div className="space-y-3 border-y border-border py-5 mb-5">
                {[
                  { label: "Move-in", value: unit.available },
                  { label: "Lease term", value: "12 months" },
                  { label: "Rent controlled", value: building.rentControlled ? "Yes" : "No" },
                  { label: "Unit type", value: unit.groupType },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className="text-xs font-semibold text-foreground">{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border">
                <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0">
                  <Building size={13} className="text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{building.landlord}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <BadgeCheck size={9} className="text-primary" />Verified landlord
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 mt-6">
              <button
                onClick={() => { if (!isSignedIn) { onSignIn(); return } setShowSlotPicker(true) }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold py-3.5 hover:opacity-90 transition-all active:scale-[0.98]"
              >
                <Eye size={15} />Request a viewing
              </button>
              <button
                onClick={() => { if (!isSignedIn) { onSignIn(); return } onMakeOffer() }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-accent text-accent text-sm font-semibold py-3.5 hover:bg-accent hover:text-accent-foreground transition-all active:scale-[0.98]"
              >
                <FileText size={15} />Make an offer
              </button>
              <p className="text-[10px] text-center text-muted-foreground/60 leading-4">Your renter profile stays anonymous until you engage in an offer to lease.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

// ─── Building Detail Screen ───────────────────────────────────────────────────

export function BuildingDetailScreen({ building, onBack, userProfile, isSignedIn, onSignIn }: {
  building: Listing
  onBack: () => void
  userProfile: UserProfile | null
  isSignedIn: boolean
  onSignIn: () => void
}) {
  const meta = getBuildingMeta(building.id)
  const [openType, setOpenType] = useState<string | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<SelectedUnit | null>(null)
  const [showDraftLease, setShowDraftLease] = useState(false)

  const portfolioTypeLabel = meta.unitGroups.find(g => {
    const t = g.type.toLowerCase().replace(/\s+/g, "")
    const b = (building.unitType || "").toLowerCase().replace(/\s+/g, "")
    return t.startsWith(b) || t.includes(b)
  })?.type ?? meta.unitGroups[0]?.type

  const sortedGroups = [...meta.unitGroups].sort((a, b) =>
    a.type === portfolioTypeLabel ? -1 : b.type === portfolioTypeLabel ? 1 : 0
  )

  const nearbyIcons: Record<string, React.ReactNode> = {
    transit: <Train size={13} />,
    grocery: <ShoppingCart size={13} />,
    park: <Leaf size={13} />,
    health: <Shield size={13} />,
    dining: <UtensilsCrossed size={13} />,
  }

  return (
    <div className="min-h-screen bg-background pb-20" style={{ fontFamily: BODY }}>
      <main className="mx-auto max-w-6xl px-4 py-7 md:px-8 md:py-10">
        <button onClick={onBack} className="mb-6 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">
          <ChevronLeft size={17} />Verified buildings
        </button>

        <div className="relative overflow-hidden rounded-3xl bg-secondary mb-10">
          <img src={building.image} alt={`Exterior of ${building.address}`} className="w-full aspect-[21/8] object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-foreground/10 to-transparent" />
          <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-card/90 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm">
            <BadgeCheck size={13} className="text-primary" />Verified building
          </div>
          <div className="absolute bottom-5 left-6">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white drop-shadow-sm" style={{ fontFamily: DISPLAY }}>{meta.name}</h1>
            <p className="text-sm text-white/75 mt-1 flex items-center gap-1.5"><MapPin size={12} />{building.address} · {building.neighbourhood}, {building.city}</p>
          </div>
          <div className="absolute bottom-5 right-5 rounded-2xl bg-card/90 backdrop-blur-sm px-4 py-2.5 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">From</p>
            <p className="text-xl font-bold text-foreground" style={{ fontFamily: MONO }}>${Math.min(...meta.unitGroups.map(g => g.from)).toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_320px]">
          <section className="space-y-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Home size={12} className="text-primary" />
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">Available homes</p>
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-5" style={{ fontFamily: DISPLAY }}>
                {meta.unitGroups.reduce((s, g) => s + g.available, 0)} units available now
              </h2>

              <div className="space-y-2.5">
                {sortedGroups.map((group, idx) => {
                  const isFirst = idx === 0
                  const isOpen = openType === null ? isFirst : openType === group.type
                  return (
                    <div key={group.type} className="overflow-hidden rounded-2xl border border-border bg-card">
                      <button
                        onClick={() => setOpenType(isOpen ? "__none__" : group.type)}
                        className="flex w-full items-center justify-between p-5 text-left hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-secondary flex flex-col items-center justify-center shrink-0">
                            <Bed size={13} className="text-muted-foreground" />
                            <span className="text-[8px] text-muted-foreground font-semibold mt-0.5" style={{ fontFamily: MONO }}>{group.bedrooms}BR</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-base font-semibold text-foreground" style={{ fontFamily: DISPLAY }}>{group.type}</p>
                              {isFirst && <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-[9px] font-bold text-primary uppercase tracking-wide">Your portfolio type</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              <span className="font-semibold text-primary">{group.available}</span> {group.available === 1 ? "unit" : "units"} available
                              <span className="mx-1.5 opacity-30">·</span>
                              {group.bedrooms} bed · {group.bathrooms} bath
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] text-muted-foreground">from</p>
                            <p className="text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>${group.from.toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                          </div>
                          <ChevronDown size={17} className={`text-primary transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-border bg-secondary/30 p-3">
                          <div className="space-y-2">
                            {group.units.map(unit => (
                              <button
                                key={unit.label}
                                onClick={() => setSelectedUnit({ ...unit, groupType: group.type, bedrooms: group.bedrooms, bathrooms: group.bathrooms })}
                                className="flex w-full items-center justify-between rounded-xl bg-card px-4 py-3.5 text-left border border-transparent hover:border-primary/20 hover:bg-[#f7eee8] transition-all group"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-foreground">{unit.label}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">{unit.sqft.toLocaleString()} sqft · Available {unit.available}</p>
                                </div>
                                <div className="flex items-center gap-2.5">
                                  <p className="text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>
                                    ${unit.rent.toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/mo</span>
                                  </p>
                                  <ChevronRight size={14} className="text-accent group-hover:translate-x-0.5 transition-transform" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building size={12} className="text-primary" />
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">Building amenities</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {meta.amenities.map(item => (
                  <span key={item} className="flex items-center gap-1.5 rounded-full bg-secondary border border-border px-3 py-1.5 text-xs font-medium text-foreground">
                    <CheckCircle size={11} className="text-primary" />{item}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <Package size={12} className="text-accent" />
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent">Available add-ons</p>
              </div>
              <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                {meta.addOnPricing.map(a => (
                  <div key={a.label} className="flex items-center justify-between px-5 py-3.5">
                    <span className="text-sm text-foreground">{a.label}</span>
                    {a.price === "included"
                      ? <span className="text-xs font-semibold text-green-700">Included</span>
                      : <span className="text-xs font-medium text-muted-foreground" style={{ fontFamily: MONO }}>+${a.price}/mo</span>}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">Optional add-ons are confirmed at lease signing.</p>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl bg-[#edf5ef] border border-primary/15 p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Building snapshot</p>
              <h2 className="mt-2 text-lg font-semibold text-foreground" style={{ fontFamily: DISPLAY }}>{meta.name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{building.neighbourhood} · {building.city}</p>
              <div className="mt-4 pt-4 border-t border-primary/15 grid grid-cols-3 divide-x divide-primary/15">
                {[
                  { val: String(meta.totalUnits), label: "total units" },
                  { val: String(building.yearBuilt), label: "built" },
                  { val: building.rentControlled ? "Yes" : "No", label: "rent ctrl." },
                ].map(s => (
                  <div key={s.label} className="first:pr-3 px-3 first:pl-0">
                    <p className="text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>{s.val}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary mb-4">Nearby</p>
              <div className="space-y-3">
                {meta.nearby.map(item => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                      {nearbyIcons[item.category]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">{item.distance}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-12 border-t border-border pt-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-1">On the map</p>
          <h2 className="text-2xl font-semibold text-foreground mb-6" style={{ fontFamily: DISPLAY }}>Everything close to home</h2>
          <div
            className="relative h-80 overflow-hidden rounded-3xl bg-[#d8e8da]"
            style={{
              backgroundImage: [
                "linear-gradient(rgba(23,75,58,0.07) 1px, transparent 1px)",
                "linear-gradient(90deg, rgba(23,75,58,0.07) 1px, transparent 1px)",
                "linear-gradient(25deg, transparent 48%, rgba(23,75,58,0.1) 49%, rgba(23,75,58,0.1) 51%, transparent 52%)",
                "linear-gradient(115deg, transparent 48%, rgba(23,75,58,0.08) 49%, rgba(23,75,58,0.08) 51%, transparent 52%)",
              ].join(", "),
              backgroundSize: "40px 40px, 40px 40px, 120px 120px, 120px 120px",
            }}
          >
            <div className="absolute left-[44%] top-[36%]">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-xl ring-4 ring-accent/25">
                  <Building size={20} />
                </div>
                <div className="mt-1.5 rounded-lg bg-card/90 backdrop-blur-sm px-2.5 py-1 text-xs font-bold text-foreground shadow-sm whitespace-nowrap">{meta.name}</div>
              </div>
            </div>
            {[
              { label: "Station", x: "30%", y: "26%", icon: <Train size={10} /> },
              { label: "Grocery", x: "60%", y: "50%", icon: <ShoppingCart size={10} /> },
              { label: "Park", x: "22%", y: "56%", icon: <Leaf size={10} /> },
              { label: "Hospital", x: "64%", y: "24%", icon: <Shield size={10} /> },
            ].map(dot => (
              <div key={dot.label} className="absolute" style={{ left: dot.x, top: dot.y }}>
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-card/90 border border-border flex items-center justify-center text-muted-foreground shadow-sm backdrop-blur-sm">
                    {dot.icon}
                  </div>
                  <span className="mt-0.5 text-[9px] font-medium text-foreground/70">{dot.label}</span>
                </div>
              </div>
            ))}
            <div className="absolute bottom-4 left-4 rounded-xl bg-card/90 backdrop-blur-sm px-3 py-2 text-xs font-semibold text-foreground shadow-sm flex items-center gap-1.5">
              <MapPin size={12} className="text-accent" />{building.address}
            </div>
          </div>
        </section>
      </main>

      {selectedUnit && (
        <UnitDetailSheet
          unit={selectedUnit}
          building={building}
          buildingMeta={meta}
          isSignedIn={isSignedIn}
          onSignIn={onSignIn}
          onClose={() => setSelectedUnit(null)}
          onMakeOffer={() => setShowDraftLease(true)}
        />
      )}

      {showDraftLease && selectedUnit && (
        <DraftLeaseModal
          unit={selectedUnit}
          buildingMeta={meta}
          listing={building}
          userProfile={userProfile}
          onClose={() => { setShowDraftLease(false); setSelectedUnit(null) }}
        />
      )}
    </div>
  )
}

// ─── LANDLORD HOME ────────────────────────────────────────────────────────────

export function LandlordHomeScreen({ onPortal, onPostListing, onRealtor, onMortgage }: {
  onPortal: () => void; onPostListing: () => void; onRealtor: () => void; onMortgage: () => void
}) {
  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: BODY }}>
      {/* Label */}
      <div className="px-6 md:px-10 pt-8 pb-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 rounded-full bg-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Property Management Tools</span>
        </div>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col px-6 md:px-10 pt-10 pb-8 max-w-3xl w-full">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-[1.12] mb-3" style={{ fontFamily: DISPLAY }}>
          List your unit.<br /><span style={{ color: "var(--accent)" }}>Find the right tenant.</span>
        </h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed max-w-md">Post net rent only. Pre-screened applicants with credit scores, references, and renter packages — delivered directly to your portal.</p>

        {/* Primary CTA */}
        <div className="flex items-center gap-3 mb-10 max-w-md">
          <PrimaryButton onClick={onPostListing}>
            <Plus size={15} /> List a unit
          </PrimaryButton>
          <button onClick={onPortal} className="px-5 py-3 rounded-md border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all">
            My portal
          </button>
        </div>

        {/* How it works */}
        <div className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest mb-4">How it works</div>
        <div className="flex flex-col gap-3 mb-8 max-w-lg">
          {[
            { n: "01", title: "Post net rent", desc: "List your base rent. Add-ons are itemised separately so tenants see a transparent total." },
            { n: "02", title: "Receive pre-screened applications", desc: "Each applicant submits a renter package with credit score, references, and income verification." },
            { n: "03", title: "Review & approve", desc: "Compare applicants side by side. One click to request an interview or issue an offer." },
          ].map(step => (
            <div key={step.n} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card">
              <div className="text-xs font-bold text-muted-foreground/40 shrink-0 pt-0.5" style={{ fontFamily: MONO }}>{step.n}</div>
              <div>
                <div className="text-sm font-semibold text-foreground mb-0.5">{step.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tool cards */}
        <div className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest mb-3">Tools</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg">
          {[
            { icon: <ClipboardList size={15} />, label: "Applicant portal", desc: "Review & manage applications", onClick: onPortal },
            { icon: <Scale size={15} />, label: "Realtor tools", desc: "Co-listing & buyer agent", onClick: onRealtor },
            { icon: <Calculator size={15} />, label: "Mortgage calc", desc: "Rent vs. buy for your tenants", onClick: onMortgage },
          ].map(t => (
            <button key={t.label} onClick={t.onClick}
              className="flex flex-col items-start gap-2 p-4 rounded-xl border border-border bg-card hover:border-foreground/20 hover:shadow-sm text-left transition-all">
              <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">{t.icon}</div>
              <div>
                <div className="text-xs font-semibold text-foreground">{t.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Stats banner */}
      <div className="mx-6 md:mx-10 mb-6 rounded-xl border border-border bg-card px-6 py-5 max-w-lg">
        <div className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest mb-4">Platform stats</div>
        <div className="grid grid-cols-3 gap-4">
          {[{ value: "11 days", label: "Avg. days to fill" }, { value: "4.2×", label: "Qualified applications per unit" }, { value: "92%", label: "Landlord satisfaction" }].map(s => (
            <div key={s.label}>
              <div className="text-xl font-bold text-foreground" style={{ fontFamily: MONO }}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────

const PRIORITY_OPTS = [
  { value: "price", label: "Price", desc: "Stay within my budget" },
  { value: "transit", label: "Transit access", desc: "Close to subway, bus, or GO" },
  { value: "walkability", label: "Walkability", desc: "Errands on foot" },
  { value: "location", label: "Neighbourhood", desc: "Area feel and safety" },
  { value: "space", label: "Space / sqft", desc: "Room size matters" },
  { value: "amenities", label: "Building amenities", desc: "Gym, pool, concierge" },
  { value: "schools", label: "Near schools", desc: "Elementary & secondary" },
  { value: "quiet", label: "Quiet area", desc: "Low noise, residential" },
  { value: "pets", label: "Pet friendly", desc: "Dogs or cats welcome" },
  { value: "parking", label: "Parking", desc: "Dedicated spot included" },
]

const AMENITY_GROUPS = [
  { group: "Unit features", items: ["In-suite laundry", "Parking", "Storage locker", "Air conditioning", "Utilities included", "EV charging"] },
  { group: "Building amenities", items: ["Gym / fitness", "Rooftop access", "Concierge", "Bike storage", "Pet friendly"] },
  { group: "Location", items: ["Near schools", "Near parks", "Near grocery stores", "Near transit hub", "Quiet neighbourhood"] },
]

export const UNIT_TYPE_OPTS = [
  { value: "bachelor", label: "Bachelor / Studio" }, { value: "1br", label: "1 Bedroom" },
  { value: "1br+den", label: "1 Bed + Den" }, { value: "2br", label: "2 Bedrooms" },
  { value: "3br", label: "3 Bedrooms" }, { value: "townhouse", label: "Townhouse" },
  { value: "semi-detached", label: "Semi-Detached" }, { value: "single-family", label: "Single Family" },
]

// ─── Neighbourhood map data ───────────────────────────────────────────────────

const CITY_MAP_DATA: Record<string, {
  water?: "bottom" | "right"
  waterLabel?: string
  zones: { id: string; label: string; x: number; y: number; w: number; h: number; popular?: boolean }[]
}> = {
  "Toronto": {
    water: "bottom", waterLabel: "Lake Ontario",
    zones: [
      { id: "etobicoke", label: "Etobicoke", x: 1, y: 14, w: 14, h: 62 },
      { id: "high-park", label: "High Park", x: 12, y: 40, w: 11, h: 20 },
      { id: "liberty", label: "Liberty Village", x: 22, y: 58, w: 11, h: 16 },
      { id: "king-west", label: "King West", x: 30, y: 58, w: 10, h: 16, popular: true },
      { id: "downtown", label: "Downtown Core", x: 36, y: 50, w: 15, h: 28, popular: true },
      { id: "distillery", label: "Distillery", x: 52, y: 60, w: 10, h: 14, popular: true },
      { id: "leslieville", label: "Leslieville", x: 58, y: 56, w: 12, h: 18 },
      { id: "beaches", label: "The Beaches", x: 68, y: 60, w: 14, h: 18 },
      { id: "annex", label: "The Annex", x: 26, y: 36, w: 14, h: 18, popular: true },
      { id: "yorkville", label: "Yorkville", x: 37, y: 36, w: 12, h: 14, popular: true },
      { id: "midtown", label: "Midtown", x: 28, y: 18, w: 24, h: 18 },
      { id: "north-york", label: "North York", x: 20, y: 4, w: 38, h: 14 },
      { id: "east-york", label: "East York", x: 50, y: 40, w: 16, h: 18 },
      { id: "scarborough", label: "Scarborough", x: 64, y: 6, w: 32, h: 56 },
    ],
  },
  "Vancouver": {
    water: "bottom", waterLabel: "Burrard Inlet",
    zones: [
      { id: "downtown", label: "Downtown", x: 28, y: 22, w: 16, h: 30, popular: true },
      { id: "yaletown", label: "Yaletown", x: 28, y: 50, w: 12, h: 14, popular: true },
      { id: "coal-harbour", label: "Coal Harbour", x: 28, y: 10, w: 16, h: 12, popular: true },
      { id: "west-end", label: "West End", x: 12, y: 22, w: 16, h: 24 },
      { id: "gastown", label: "Gastown", x: 44, y: 30, w: 10, h: 14, popular: true },
      { id: "mount-pleasant", label: "Mount Pleasant", x: 42, y: 48, w: 14, h: 18 },
      { id: "kitsilano", label: "Kitsilano", x: 6, y: 52, w: 22, h: 20 },
      { id: "fairview", label: "Fairview", x: 22, y: 52, w: 14, h: 16 },
      { id: "east-van", label: "East Vancouver", x: 56, y: 38, w: 24, h: 36 },
      { id: "burnaby", label: "Burnaby", x: 68, y: 12, w: 28, h: 42 },
    ],
  },
  "Montréal": {
    water: "right", waterLabel: "St. Lawrence River",
    zones: [
      { id: "plateau", label: "Plateau-Mont-Royal", x: 30, y: 18, w: 22, h: 24, popular: true },
      { id: "downtown", label: "Downtown", x: 20, y: 40, w: 22, h: 22, popular: true },
      { id: "mile-end", label: "Mile End", x: 20, y: 8, w: 22, h: 10, popular: true },
      { id: "griffintown", label: "Griffintown", x: 16, y: 58, w: 16, h: 14 },
      { id: "old-montreal", label: "Old Montréal", x: 28, y: 68, w: 16, h: 14, popular: true },
      { id: "rosemont", label: "Rosemont", x: 46, y: 16, w: 18, h: 22 },
      { id: "outremont", label: "Outremont", x: 16, y: 6, w: 14, h: 14 },
      { id: "westmount", label: "Westmount", x: 4, y: 38, w: 16, h: 22 },
      { id: "hochelaga", label: "Hochelaga", x: 54, y: 40, w: 20, h: 22 },
    ],
  },
  "Calgary": {
    zones: [
      { id: "downtown", label: "Downtown", x: 34, y: 32, w: 20, h: 20, popular: true },
      { id: "beltline", label: "Beltline", x: 28, y: 50, w: 28, h: 16, popular: true },
      { id: "kensington", label: "Kensington", x: 14, y: 28, w: 18, h: 18, popular: true },
      { id: "inglewood", label: "Inglewood", x: 58, y: 50, w: 18, h: 16 },
      { id: "mission", label: "Mission", x: 26, y: 62, w: 16, h: 16 },
      { id: "marda-loop", label: "Marda Loop", x: 10, y: 56, w: 16, h: 18 },
      { id: "north", label: "North Calgary", x: 18, y: 4, w: 52, h: 26 },
      { id: "south", label: "South Calgary", x: 8, y: 76, w: 72, h: 18 },
    ],
  },
  "Ottawa": {
    zones: [
      { id: "downtown", label: "Downtown", x: 30, y: 34, w: 22, h: 20, popular: true },
      { id: "byward", label: "ByWard Market", x: 52, y: 34, w: 18, h: 18, popular: true },
      { id: "glebe", label: "The Glebe", x: 30, y: 52, w: 20, h: 18, popular: true },
      { id: "westboro", label: "Westboro", x: 6, y: 36, w: 22, h: 18, popular: true },
      { id: "hintonburg", label: "Hintonburg", x: 6, y: 52, w: 22, h: 16 },
      { id: "sandy-hill", label: "Sandy Hill", x: 52, y: 50, w: 18, h: 16 },
      { id: "old-south", label: "Old Ottawa South", x: 34, y: 68, w: 18, h: 16 },
      { id: "kanata", label: "Kanata", x: 2, y: 16, w: 24, h: 22 },
    ],
  },
  "Edmonton": {
    zones: [
      { id: "downtown", label: "Downtown", x: 34, y: 34, w: 22, h: 20, popular: true },
      { id: "whyte", label: "Whyte Ave / Strathcona", x: 30, y: 52, w: 26, h: 18, popular: true },
      { id: "glenora", label: "Glenora", x: 12, y: 34, w: 20, h: 20, popular: true },
      { id: "oliver", label: "Oliver", x: 14, y: 50, w: 18, h: 16 },
      { id: "bonnie-doon", label: "Bonnie Doon", x: 56, y: 52, w: 18, h: 18 },
      { id: "west-end", label: "West End", x: 2, y: 54, w: 18, h: 22 },
      { id: "north", label: "North Edmonton", x: 16, y: 4, w: 54, h: 28 },
      { id: "south", label: "South Edmonton", x: 10, y: 72, w: 66, h: 20 },
    ],
  },
}

function NeighbourhoodPicker({ city, selected, onChange }: {
  city: string; selected: string[]; onChange: (ids: string[]) => void
}) {
  const data = CITY_MAP_DATA[city]
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragRect, setDragRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [zoomedOut, setZoomedOut] = useState(false)

  if (!data) return null

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])

  const getRel = (e: React.MouseEvent) => {
    const el = containerRef.current
    if (!el) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-zone]")) return
    const p = getRel(e); setDragStart(p); setDragRect({ x: p.x, y: p.y, w: 0, h: 0 })
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragStart) return
    const p = getRel(e)
    setDragRect({ x: Math.min(dragStart.x, p.x), y: Math.min(dragStart.y, p.y), w: Math.abs(p.x - dragStart.x), h: Math.abs(p.y - dragStart.y) })
  }
  const onMouseUp = () => {
    if (dragRect && (dragRect.w > 2 || dragRect.h > 2)) {
      const hits = data.zones.filter(z =>
        !(z.x + z.w < dragRect.x || z.x > dragRect.x + dragRect.w || z.y + z.h < dragRect.y || z.y > dragRect.y + dragRect.h)
      ).map(z => z.id)
      onChange([...new Set([...selected, ...hits])])
    }
    setDragStart(null); setDragRect(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Select areas in {city}</div>
        <div className="flex items-center gap-2.5">
          {selected.length > 0 && <button onClick={() => onChange([])} className="text-[10px] text-muted-foreground hover:text-foreground underline">Clear all</button>}
          <span className="text-[10px] text-muted-foreground">{selected.length === 0 ? "Any area" : `${selected.length} area${selected.length !== 1 ? "s" : ""} selected`}</span>
          <span className="flex overflow-hidden rounded-md border border-border"><button type="button" aria-label="Zoom out from Toronto" onClick={() => setZoomedOut(true)} className="grid size-6 place-items-center bg-card text-muted-foreground transition hover:bg-secondary hover:text-foreground"><Minus size={12} /></button><button type="button" aria-label="Zoom in to Toronto" onClick={() => setZoomedOut(false)} className="grid size-6 place-items-center border-l border-border bg-card text-muted-foreground transition hover:bg-secondary hover:text-foreground"><Plus size={12} /></button></span>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`relative rounded-xl overflow-hidden border border-border select-none ${zoomedOut ? "cursor-not-allowed" : "cursor-crosshair"}`}
        style={{ paddingBottom: "60%", background: "#dde8de" }}
        onMouseDown={zoomedOut ? undefined : onMouseDown} onMouseMove={zoomedOut ? undefined : onMouseMove} onMouseUp={zoomedOut ? undefined : onMouseUp}
        onMouseLeave={() => { setDragStart(null); setDragRect(null) }}
      >
        <div className="absolute inset-0">
          {/* Street grid */}
          <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.3) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.3) 1px,transparent 1px)", backgroundSize: "10% 10%" }} />

          {/* Water */}
          {data.water === "bottom" && (
            <div className="absolute bottom-0 inset-x-0 h-[11%] bg-blue-300/50 flex items-center justify-center">
              {data.waterLabel && <span className="text-[9px] text-blue-700/60 font-medium">{data.waterLabel}</span>}
            </div>
          )}
          {data.water === "right" && (
            <div className="absolute top-0 right-0 bottom-0 w-[10%] bg-blue-300/50 flex items-center justify-center">
              {data.waterLabel && <span className="text-[8px] text-blue-700/60 font-medium [writing-mode:vertical-rl] rotate-180">{data.waterLabel}</span>}
            </div>
          )}

          {/* Zones */}
          {data.zones.map(z => {
            const sel = selected.includes(z.id)
            return (
              <button
                key={z.id}
                data-zone
                onClick={e => { e.stopPropagation(); toggle(z.id) }}
                className={`absolute rounded-lg border-[1.5px] transition-all flex items-center justify-center text-center hover:z-10 ${sel ? "bg-primary/30 border-primary z-10 shadow-sm" : "bg-white/55 border-white/70 hover:bg-white/80 hover:border-primary/40"}`}
                style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%` }}
              >
                <div className="px-0.5">
                  <div className={`text-[8px] font-semibold leading-tight ${sel ? "text-primary" : "text-foreground/65"}`}>{z.label}</div>
                  {z.popular && !sel && <div className="text-[6px] text-primary/55 mt-0.5 font-medium">Popular</div>}
                </div>
              </button>
            )
          })}

          {/* Drag selection rect */}
          {dragRect && dragRect.w > 1 && (
            <div className="absolute border-2 border-primary bg-primary/10 pointer-events-none rounded" style={{ left: `${dragRect.x}%`, top: `${dragRect.y}%`, width: `${dragRect.w}%`, height: `${dragRect.h}%` }} />
          )}
          {zoomedOut && <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-muted/90 px-6 text-center"><MapPin size={18} className="text-muted-foreground" /><p className="mt-3 font-semibold text-foreground">Outside Toronto</p><p className="mt-1 max-w-[235px] text-xs leading-5 text-muted-foreground">We’re not there yet. Check back soon.</p><button type="button" onClick={() => setZoomedOut(false)} className="mt-4 border border-primary/30 bg-card px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-secondary">Return to Toronto</button></div>}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mt-1.5">{zoomedOut ? "Zoom back in to choose a Toronto neighbourhood." : `Click zones to select · Drag to select multiple · Leave empty to search all of ${city}`}</p>

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map(id => {
            const z = data.zones.find(z => z.id === id); if (!z) return null
            return (
              <button key={id} onClick={() => toggle(id)} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/25 text-[10px] font-medium text-primary hover:bg-primary/20 transition-all">
                {z.label} <X size={8} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function OnboardingScreen({ onComplete, onEarlySignIn, resumeProfile, onViewProfile }: { onComplete: (profile: UserProfile) => void; onEarlySignIn?: (profile: UserProfile) => void; resumeProfile?: UserProfile; onViewProfile?: () => void }) {
  const [step, setStep] = useState(resumeProfile ? 1 : 0)
  const TOTAL_STEPS = 5

  const [profile, setProfile] = useState<UserProfile>(resumeProfile ?? {
    name: "", email: "", phone: "", city: "Toronto", neighbourhoods: [],
    unitType: "", budgetMax: "", moveIn: "", priorities: [], amenities: [], notes: "", notifPref: "",
  })
  const upd = (k: keyof UserProfile, v: any) => setProfile(p => ({ ...p, [k]: v }))

  // Email verification for a new account. Rentre sends the passport to landlords on the renter's
  // behalf, so the address has to be proven before an account exists — otherwise anyone could sign
  // up as anyone and have mail sent in their name.
  const [codeSentTo, setCodeSentTo] = useState("")
  const [code, setCode] = useState("")
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState("")
  const [authNote, setAuthNote] = useState("")
  const authMessage = (e: any) => e.details?.[0]?.message || e.message || "Something went wrong. Try again."

  const sendCode = async () => {
    if (!profile.email.includes("@")) return setAuthError("Enter your email address first")
    setAuthBusy(true); setAuthError(""); setAuthNote("")
    try {
      await requestSignInCode(profile.email.trim(), profile.name.trim() || undefined)
      if (codeSentTo) setAuthNote("A new code is on its way.")
      setCodeSentTo(profile.email.trim()); setCode("")
    } catch (e) { setAuthError(authMessage(e)) } finally { setAuthBusy(false) }
  }

  const confirmCode = async () => {
    setAuthBusy(true); setAuthError(""); setAuthNote("")
    try {
      const { data } = await verifySignInCode(codeSentTo, code)
      setToken(data.token)
      const verified = { ...profile, name: profile.name.trim() || data.user.name, email: data.user.email }
      setProfile(verified)
      // The account now exists, so what the form already collected can be stored against it.
      persistProfile(verified)
      // Hands off to the passport builder (steps 1-5) rather than finishing — onComplete would
      // treat the passport as done and skip the rest of the profile.
      onEarlySignIn?.(verified)
      setStep(1)
    } catch (e) { setAuthError(authMessage(e)); setAuthBusy(false) }
  }

  /**
   * Autosave to the renter's stored profile. Fire-and-forget on purpose: a failed save must not
   * block the wizard, and the server merges section by section so a later step never wipes an
   * earlier one. Only runs once signed in — there is nothing to attach the data to before that.
   */
  const persistProfile = (p: UserProfile = profile) => {
    // Nothing to attach the data to until a session exists.
    if (!localStorage.getItem("rentre_token")) return
    const nonEmpty = <T extends object>(o: T) =>
      Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined && !(Array.isArray(v) && !v.length)))
    const body = {
      basics: nonEmpty({ fullName: p.name, email: p.email, phone: p.phone, city: p.city, areas: p.neighbourhoods }),
      employment: nonEmpty({ employment: p.employment, employer: p.employer, jobTitle: p.jobTitle, income: p.income }),
      rentalHistory: nonEmpty({
        currentAddress: p.currentAddress, timeAtAddress: p.timeAtAddress,
        currentLandlord: p.currentLandlord, landlordPhone: p.landlordPhone,
      }),
      preferences: nonEmpty({
        unitType: p.unitType, moveIn: p.moveIn, areas: p.neighbourhoods,
        budgetMax: p.budgetMax ? Number(p.budgetMax) : undefined,
      }),
    }
    const sections = Object.fromEntries(Object.entries(body).filter(([, v]) => Object.keys(v).length > 0))
    if (Object.keys(sections).length === 0) return
    saveProfile(sections).catch(err => console.warn("Profile autosave failed", err.message))
  }

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 10)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0,3)}) ${digits.slice(3)}`
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  }

  // Screen 2: Housing preferences
  const [bedrooms, setBedrooms] = useState("")
  const [occupants, setOccupants] = useState(1)
  const [hasPets, setHasPets] = useState(false)
  const [petType, setPetType] = useState("")
  const [petBreed, setPetBreed] = useState("")

  // Screen 3: Financial
  const [employment, setEmployment] = useState(resumeProfile?.employment ?? "")
  const [employer, setEmployer] = useState(resumeProfile?.employer ?? "")
  const [jobTitle, setJobTitle] = useState(resumeProfile?.jobTitle ?? "")
  const [income, setIncome] = useState(resumeProfile?.income ?? "")
  const [incomeFile, setIncomeFile] = useState<{ name: string; date: string } | null>(resumeProfile?.hasIncomeDoc ? { name: "Income document", date: "on file" } : null)
  const [creditFile, setCreditFile] = useState<{ name: string; date: string } | null>(resumeProfile?.hasCreditDoc ? { name: "Credit report", date: "on file" } : null)
  const [showUploadConsent, setShowUploadConsent] = useState<"income" | "credit" | null>(null)
  const [uploadConsented, setUploadConsented] = useState(false)
  const [pendingUpload, setPendingUpload] = useState<{ type: "income" | "credit"; name: string } | null>(null)

  // Screen 3: Rental history
  const [currentAddress, setCurrentAddress] = useState(resumeProfile?.currentAddress ?? "")
  const [currentLandlord, setCurrentLandlord] = useState(resumeProfile?.currentLandlord ?? "")
  const [landlordContact, setLandlordContact] = useState("")
  const [landlordPhone, setLandlordPhone] = useState(resumeProfile?.landlordPhone ?? "")
  const [timeAtAddress, setTimeAtAddress] = useState(resumeProfile?.timeAtAddress ?? "")
  const [reasonMoving, setReasonMoving] = useState("")

  // Screen 4: Preferences
  const [reachOut, setReachOut] = useState(true)

  // Passport card tabs
  const [passportTab, setPassportTab] = useState<"outreach" | "offer">("outreach")
  const [rentGuarantee, setRentGuarantee] = useState("")
  const [offerAmount, setOfferAmount] = useState("")
  const [utilitiesWho, setUtilitiesWho] = useState("")
  const [dueDiligenceOptIn, setDueDiligenceOptIn] = useState(true)

  // Screen 5: Share flow
  const [showShare, setShowShare] = useState(false)
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const [recipientName, setRecipientName] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [recipientUnit, setRecipientUnit] = useState("")
  const [shareStatus, setShareStatus] = useState<"idle" | "sending" | "sent">("idle")
  const [shareError, setShareError] = useState("")
  const [listingUrl, setListingUrl] = useState("")
  const [listingScreenshot, setListingScreenshot] = useState<{ name: string; date: string } | null>(null)
  const [profileLinkCopied, setProfileLinkCopied] = useState(false)
  const [shareFields, setShareFields] = useState({
    name: true, contact: true, city: true, unitPrefs: true,
    budget: true, employment: true, income: true, incomeDoc: false, creditDoc: false,
    rentalHistory: true, landlordRef: true,
  })

  // Mobile passport peek
  const [passportExpanded, setPassportExpanded] = useState(false)

  const NBHDS: Record<string, string[]> = {
    Toronto: ["Annex","Beaches","Cabbagetown","Distillery District","Kensington Market","King West","Leslieville","Liberty Village","Midtown","Riverdale","Roncesvalles","Yorkville"],
    Vancouver: ["Kitsilano","Mount Pleasant","West End","Yaletown","Commercial Drive","East Vancouver","Gastown","Point Grey","Strathcona"],
    Montréal: ["Plateau","Mile End","Rosemont","Verdun","Griffintown","Old Montréal","NDG","Côte-des-Neiges"],
    Calgary: ["Beltline","Inglewood","Kensington","Mission","Bridgeland","East Village"],
    Ottawa: ["ByWard Market","Centretown","Glebe","Hintonburg","Sandy Hill","Westboro"],
    Edmonton: ["Glenora","Strathcona","Oliver","Downtown","Garneau"],
    Winnipeg: ["Exchange District","Osborne Village","River Heights","St. Boniface"],
  }

  // Step order: 0=Account 1=Basics(required) 2=Financial(required) 3=RentalHistory(required) 4=Preferences+ReachOut(optional) 5=Review
  const step0Valid =
    profile.email.includes("@") &&
    profile.name.trim().length > 0 &&
    profile.phone.replace(/\D/g, "").length === 10 &&
    Number(profile.budgetMax) > 0 &&
    profile.city.length > 0
  const step1Valid = profile.city.length > 0
  const step2Valid = !!employment && !!income
  const step3Valid = !!currentAddress && !!timeAtAddress

  const canProceed = step === 0 ? step0Valid : step === 1 ? step1Valid : step === 2 ? step2Valid : step === 3 ? step3Valid : true

  // Live passport preview card (plain render function — not a JSX component)
  const renderPassport = (compact = false) => {
    const hasName = profile.name.trim().length > 0
    const strengthItems = [
      !!profile.name, !!profile.email, !!profile.city,
      !!employment, !!income,
      !!profile.unitType || !!profile.budgetMax,
      !!profile.moveIn, !!incomeFile, !!creditFile,
    ]
    const strengthPct = Math.round(strengthItems.filter(Boolean).length / strengthItems.length * 100)
    const isComplete = strengthPct === 100
    const completionBadge = isComplete
      ? <span className="inline-flex items-center gap-1 rounded-full bg-white/20 border border-white/30 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white"><CheckCircle size={7} /> Complete</span>
      : <span className="inline-flex items-center rounded-full bg-white/10 border border-white/20 px-2 py-0.5 text-[8px] font-bold text-white/60" style={{ fontFamily: MONO }}>{strengthPct}%</span>

    const outreachRows = [
      { k: "Employment", v: employment || null },
      { k: "Rent guarantee", v: rentGuarantee || null },
      { k: "Budget", v: profile.budgetMax ? `$${Number(profile.budgetMax).toLocaleString()}/mo` : null },
      { k: "Looking for", v: profile.unitType || null },
      { k: "Move-in", v: profile.moveIn || null },
    ].filter(r => r.v !== null)

    const docBadges = [
      { label: "Income doc", ok: !!incomeFile },
      { label: "Credit report", ok: !!creditFile },
    ]

    const gridTex = "repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 0,transparent 24px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 0,transparent 24px)"
    const pad = compact ? "p-4" : "p-5"

    return (
      <div className="relative overflow-hidden rounded-2xl text-white"
        style={{ background: "linear-gradient(145deg, #174B3A 0%, #1a5542 55%, #122f25 100%)" }}>
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: gridTex }} />
        <div className={`relative ${pad}`}>
          <div className="flex items-start justify-between mb-1">
            <p className="text-[7px] font-bold uppercase tracking-[0.22em] text-white/40" style={{ fontFamily: MONO }}>Rentre · Renter Passport</p>
            <div className="flex items-center gap-2">
              {completionBadge}
              <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-black text-white/70" style={{ fontFamily: MONO }}>R</span>
              </div>
            </div>
          </div>
          <div className="mb-4 mt-3">
            {hasName
              ? <p className={`font-bold text-white leading-tight ${compact ? "text-base" : "text-[20px]"}`} style={{ fontFamily: DISPLAY }}>{profile.name}</p>
              : <div className={`rounded bg-white/10 animate-pulse ${compact ? "h-4 w-28" : "h-6 w-40"}`} />}
            {!compact && profile.email && <p className="text-[10px] text-white/35 mt-0.5" style={{ fontFamily: MONO }}>{profile.email}</p>}
          </div>
          {outreachRows.length > 0
            ? <div className={`grid grid-cols-2 gap-x-5 gap-y-3 ${compact ? "mb-3" : "mb-4"}`}>
                {(compact ? outreachRows.slice(0, 4) : outreachRows).map(({ k, v }) => (
                  <div key={k}>
                    <p className="text-[7px] uppercase tracking-[0.2em] text-white/30 mb-0.5" style={{ fontFamily: MONO }}>{k}</p>
                    <p className={`font-semibold text-white ${compact ? "text-[9px]" : "text-[11px]"}`}>{v}</p>
                  </div>
                ))}
              </div>
            : <div className={`grid grid-cols-2 gap-3 ${compact ? "mb-3" : "mb-4"}`}>
                {[...Array(4)].map((_, i) => <div key={i}><div className="h-1.5 w-7 rounded bg-white/10 mb-1.5" /><div className="h-2 w-14 rounded bg-white/12" /></div>)}
              </div>}
          <div className="border-t border-white/10 pt-3 flex flex-wrap gap-1.5">
            {docBadges.map(({ label, ok }) => (
              <span key={label} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-semibold border ${ok ? "bg-white/15 border-white/25 text-white/75" : "bg-white/5 border-white/10 text-white/25"}`}>
                {ok ? <CheckCircle size={7} /> : <X size={7} />} {label}
              </span>
            ))}
            {!incomeFile && !creditFile && (
              <span className="text-[8px] text-white/20" style={{ fontFamily: MONO }}>Supporting docs appear here</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Upload consent modal (plain render function — not a JSX component)
  const renderUploadConsent = () => {
    if (!showUploadConsent) return null
    const label = showUploadConsent === "income" ? "proof of income" : "credit report"
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm" onClick={() => setShowUploadConsent(null)}>
        <ModalKeys onClose={() => setShowUploadConsent(null)} />
        <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="px-6 pt-6 pb-5">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Shield size={18} className="text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>Before you upload</h3>
            <p className="text-sm text-muted-foreground">Your {label} stays in your passport under your full control.</p>
          </div>
          <div className="px-6 pb-5 flex flex-col gap-2.5">
            {["Never shared without your explicit consent", "Never sold to any third party", "Remove it anytime — one tap, no questions asked"].map(line => (
              <div key={line} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="var(--primary)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <span className="text-sm text-foreground">{line}</span>
              </div>
            ))}
          </div>
          <div className="px-6 pb-6">
            <label className="block cursor-pointer w-full">
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => {
                const f = e.target.files?.[0]?.name
                if (!f) return
                setUploadConsented(true)
                if (showUploadConsent === "income") setIncomeFile({ name: f, date: new Date().toLocaleDateString("en-CA") })
                else setCreditFile({ name: f, date: new Date().toLocaleDateString("en-CA") })
                setShowUploadConsent(null)
              }} />
              <span className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all">
                I understand — choose file <Upload size={14} />
              </span>
            </label>
            <button onClick={() => setShowUploadConsent(null)} className="w-full mt-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors text-center">
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Share panel (full screen overlay)
  if (showShare) {
    const SHARE_FIELDS = [
      { key: "name" as const, label: "Full name" },
      { key: "contact" as const, label: "Email & phone number" },
      { key: "city" as const, label: "City & preferred neighbourhoods" },
      { key: "unitPrefs" as const, label: "Unit type, bedrooms & move-in date" },
      { key: "budget" as const, label: "Monthly budget" },
      { key: "employment" as const, label: "Employment & self-reported income" },
      { key: "incomeDoc" as const, label: "Proof of income document" },
      { key: "creditDoc" as const, label: "Credit report" },
      { key: "rentalHistory" as const, label: "Rental history & time at address" },
      { key: "landlordRef" as const, label: "Current landlord contact" },
    ]
    return (
      <div className="min-h-screen bg-background" style={{ fontFamily: BODY }}>
        {renderUploadConsent()}
        <div className="mx-auto max-w-lg px-4 py-8">
          <button onClick={() => setShowShare(false)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ChevronLeft size={14} /> Back to passport
          </button>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent mb-2" style={{ fontFamily: MONO }}>Share your passport</p>
          <h2 className="text-2xl font-bold text-foreground mb-1.5" style={{ fontFamily: DISPLAY }}>{"Who's receiving it?"}</h2>
          <p className="text-sm text-muted-foreground mb-6">Choose exactly what they can see. You can revoke access anytime.</p>
          <div className="flex flex-col gap-3 mb-6">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Recipient name <span className="text-destructive">*</span></label>
              <input type="text" placeholder="e.g. Maria Chen" value={recipientName} onChange={e => setRecipientName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Recipient email <span className="text-destructive">*</span></label>
              <input type="email" placeholder="e.g. maria@landlord.ca" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Unit or property <span className="font-normal opacity-50 normal-case">optional</span></label>
              <input type="text" placeholder="e.g. Unit 204 – 88 King St W" value={recipientUnit} onChange={e => setRecipientUnit(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
            </div>

            {/* Listing reference */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">Listing posting <span className="font-normal opacity-50 normal-case">optional — helps the landlord match your application</span></label>
              <div className="flex flex-col gap-2">
                {/* URL input */}
                <div className="relative">
                  <Link2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                  <input type="url" placeholder="Paste a link to the listing (Kijiji, Realtor.ca…)" value={listingUrl} onChange={e => setListingUrl(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-dashed border-border bg-input-background/60 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                </div>
                {/* Screenshot upload */}
                <div className={`rounded-xl border-2 border-dashed p-3.5 flex items-center gap-3 transition-all ${listingScreenshot ? "border-primary/30 bg-primary/4" : "border-border/60 bg-secondary/20"}`}>
                  {listingScreenshot
                    ? <>
                        <CheckCircle size={14} className="text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{listingScreenshot.name}</p>
                          <p className="text-[10px] text-muted-foreground">Added {listingScreenshot.date}</p>
                        </div>
                        <button onClick={() => setListingScreenshot(null)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0"><X size={13} /></button>
                      </>
                    : <>
                        <Upload size={13} className="text-muted-foreground/60 shrink-0" />
                        <label className="flex-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                          Or upload a screenshot of the listing
                          <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => {
                            const f = e.target.files?.[0]
                            if (f) setListingScreenshot({ name: f.name, date: new Date().toLocaleDateString("en-CA", { month: "short", day: "numeric" }) })
                          }} />
                        </label>
                      </>}
                </div>
              </div>
            </div>
          </div>
          {/* Document uploads — add or confirm before sharing */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden mb-4">
            <div className="px-5 py-3.5 border-b border-border bg-secondary/50">
              <p className="text-xs font-semibold text-foreground">Supporting documents</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Upload before sharing — landlords see only what you include.</p>
            </div>
            <div className="divide-y divide-border">
              {/* Income doc */}
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Proof of income</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Pay stub, employment letter, or bank statement</p>
                  </div>
                  {incomeFile && (
                    <button onClick={() => setIncomeFile(null)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"><X size={13} /></button>
                  )}
                </div>
                {incomeFile
                  ? <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/8 border border-primary/20">
                      <CheckCircle size={13} className="text-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">{incomeFile.name}</p>
                        <p className="text-[10px] text-muted-foreground">Added {incomeFile.date}</p>
                      </div>
                    </div>
                  : <button onClick={() => setShowUploadConsent("income")}
                      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-dashed border-border bg-secondary/30 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/25 transition-all">
                      <Upload size={13} /> Upload document
                    </button>}
              </div>
              {/* Credit report */}
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Credit report</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Equifax, TransUnion, or Borrowell export</p>
                  </div>
                  {creditFile && (
                    <button onClick={() => setCreditFile(null)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"><X size={13} /></button>
                  )}
                </div>
                {creditFile
                  ? <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/8 border border-primary/20">
                      <CheckCircle size={13} className="text-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">{creditFile.name}</p>
                        <p className="text-[10px] text-muted-foreground">Added {creditFile.date}</p>
                      </div>
                    </div>
                  : <button onClick={() => setShowUploadConsent("credit")}
                      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-dashed border-border bg-secondary/30 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/25 transition-all">
                      <Upload size={13} /> Upload report
                    </button>}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden mb-6">
            <div className="px-5 py-3.5 border-b border-border bg-secondary/50">
              <p className="text-xs font-semibold text-foreground">What they can see</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Uncheck anything you would rather keep private for this recipient.</p>
            </div>
            <div className="divide-y divide-border">
              {SHARE_FIELDS.map(({ key, label }) => {
                if (key === "incomeDoc" && !incomeFile) return null
                if (key === "creditDoc" && !creditFile) return null
                const checked = shareFields[key]
                return (
                  <button key={key} onClick={() => setShareFields(f => ({ ...f, [key]: !f[key] }))}
                    className="w-full flex items-center gap-3.5 px-5 py-3.5 text-left hover:bg-secondary/40 transition-colors">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${checked ? "bg-primary border-primary" : "border-border bg-background"}`}>
                      {checked && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                    <span className={`text-sm transition-all ${checked ? "text-foreground" : "text-muted-foreground line-through decoration-muted-foreground/40"}`}>{label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          {/* Email preview modal */}
          {showEmailPreview && (
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-6 px-4">
              <ModalKeys onClose={() => setShowEmailPreview(false)} />
              <div className="w-full max-w-[580px] rounded-2xl overflow-hidden shadow-2xl">
                {/* Email client chrome */}
                <div className="bg-[#2A2825] px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                    <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                    <div className="w-3 h-3 rounded-full bg-[#28C840]" />
                  </div>
                  <p className="text-[11px] text-white/40 font-medium" style={{ fontFamily: MONO }}>Email preview</p>
                  <button onClick={() => setShowEmailPreview(false)} className="text-white/40 hover:text-white/80 transition-colors"><X size={15} /></button>
                </div>
                {/* Email headers */}
                <div className="bg-[#1C1A17] px-6 py-4 border-b border-white/8">
                  <div className="flex flex-col gap-1.5 text-[11px]" style={{ fontFamily: MONO }}>
                    <div className="flex gap-3"><span className="text-white/30 w-12 shrink-0">From</span><span className="text-white/70">Rentre &lt;noreply@rentre.ca&gt;</span></div>
                    <div className="flex gap-3"><span className="text-white/30 w-12 shrink-0">To</span><span className="text-white/70">{recipientName.trim() || "Recipient"}</span></div>
                    {recipientUnit && <div className="flex gap-3"><span className="text-white/30 w-12 shrink-0">Re</span><span className="text-white/70">{recipientUnit}</span></div>}
                    <div className="flex gap-3"><span className="text-white/30 w-12 shrink-0">Subj</span><span className="text-white/90 font-semibold">{profile.name || "A renter"} shared their Renter Passport with you</span></div>
                  </div>
                </div>
                {/* Email body */}
                <div className="bg-[#F5F1E8]">
                  {/* Header band */}
                  <div className="bg-[#174B3A] px-8 py-7 text-center">
                    <div className="inline-flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
                        <span className="text-[10px] font-black text-white/80" style={{ fontFamily: MONO }}>R</span>
                      </div>
                      <span className="text-[13px] font-bold text-white tracking-wide" style={{ fontFamily: MONO }}>RENTRE</span>
                    </div>
                    <h1 className="text-[22px] font-bold text-white leading-tight" style={{ fontFamily: DISPLAY }}>
                      {profile.name || "A renter"} shared their<br />Renter Passport with you
                    </h1>
                    {recipientUnit && (
                      <p className="text-[12px] text-white/60 mt-2">Regarding: {recipientUnit}</p>
                    )}
                  </div>
                  {/* Body */}
                  <div className="px-8 py-6">
                    <p className="text-[13px] text-[#3D3A35] leading-relaxed mb-5">
                      Hi {recipientName.trim() || "there"},
                    </p>
                    <p className="text-[13px] text-[#3D3A35] leading-relaxed mb-6">
                      {profile.name || "A renter"} has shared their verified Renter Passport with you through Rentre. Their profile includes self-reported details and any supporting documents they chose to include.
                    </p>

                    {/* Passport card in email */}
                    <div className="rounded-xl overflow-hidden mb-6" style={{ background: "linear-gradient(145deg, #174B3A 0%, #1a5542 55%, #122f25 100%)" }}>
                      <div className="px-6 py-5">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <p className="text-[7px] font-bold uppercase tracking-[0.22em] text-white/35" style={{ fontFamily: MONO }}>Rentre · Renter Passport</p>
                            <p className="text-[18px] font-bold text-white mt-1 leading-tight">{profile.name || "—"}</p>
                            <p className="text-[10px] text-white/50 mt-0.5">{profile.email || "—"}{profile.phone ? ` · ${profile.phone}` : ""}</p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                            <span className="text-[11px] font-black text-white/70" style={{ fontFamily: MONO }}>R</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-x-4 gap-y-3 mb-4">
                          {[
                            { k: "City", v: profile.city },
                            { k: "Employment", v: employment || "—" },
                            { k: "Income", v: income ? `$${Number(income).toLocaleString()}/yr` : "—" },
                            { k: "Unit type", v: profile.unitType || "—" },
                            { k: "Budget", v: profile.budgetMax ? `$${Number(profile.budgetMax).toLocaleString()}/mo` : "—" },
                            { k: "Move-in", v: profile.moveIn || "—" },
                          ].map(({ k, v }) => (
                            <div key={k}>
                              <p className="text-[7px] uppercase tracking-[0.18em] text-white/30 font-semibold" style={{ fontFamily: MONO }}>{k}</p>
                              <p className={`text-[11px] font-semibold mt-0.5 ${v === "—" ? "text-white/20" : "text-white/75"}`}>{v}</p>
                            </div>
                          ))}
                        </div>
                        {/* Doc badges */}
                        <div className="flex flex-wrap gap-1.5 border-t border-white/10 pt-3.5">
                          {[
                            { label: "Income doc", ok: !!incomeFile },
                            { label: "Credit report", ok: !!creditFile },
                            { label: "Rental history", ok: !!currentAddress },
                          ].map(({ label, ok }) => (
                            <span key={label} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide ${ok ? "bg-white/15 text-white/75" : "bg-white/5 text-white/20 border border-white/10"}`}>
                              {ok ? <CheckCircle size={7} /> : <X size={7} />} {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="text-center mb-6">
                      <div className="inline-block bg-[#174B3A] text-white text-[13px] font-bold px-8 py-3.5 rounded-xl cursor-default" style={{ fontFamily: BODY }}>
                        View full passport →
                      </div>
                      <p className="text-[10px] text-[#8A8580] mt-2">Link expires in 30 days · access can be revoked anytime</p>
                    </div>

                    {/* Documents attached note */}
                    {(incomeFile || creditFile || listingUrl || listingScreenshot) && (
                      <div className="border border-[#D5CFC3] rounded-xl p-4 mb-5 bg-white">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A8580] mb-2.5" style={{ fontFamily: MONO }}>Attachments</p>
                        <div className="flex flex-col gap-2">
                          {incomeFile && (
                            <div className="flex items-center gap-2.5 text-[12px] text-[#3D3A35]">
                              <FileText size={13} className="text-[#174B3A] shrink-0" />
                              <span className="font-medium truncate">{incomeFile.name}</span>
                              <span className="text-[10px] text-[#8A8580] shrink-0">Proof of income</span>
                            </div>
                          )}
                          {creditFile && (
                            <div className="flex items-center gap-2.5 text-[12px] text-[#3D3A35]">
                              <FileText size={13} className="text-[#174B3A] shrink-0" />
                              <span className="font-medium truncate">{creditFile.name}</span>
                              <span className="text-[10px] text-[#8A8580] shrink-0">Credit report</span>
                            </div>
                          )}
                          {listingUrl && (
                            <div className="flex items-center gap-2.5 text-[12px] text-[#174B3A]">
                              <Link2 size={13} className="shrink-0" />
                              <span className="truncate underline underline-offset-2">{listingUrl}</span>
                            </div>
                          )}
                          {listingScreenshot && (
                            <div className="flex items-center gap-2.5 text-[12px] text-[#3D3A35]">
                              <FileText size={13} className="text-[#174B3A] shrink-0" />
                              <span className="font-medium truncate">{listingScreenshot.name}</span>
                              <span className="text-[10px] text-[#8A8580] shrink-0">Listing screenshot</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <p className="text-[12px] text-[#3D3A35] leading-relaxed mb-1">
                      This passport was shared by the applicant. Rentre does not verify self-reported information — documents are provided directly by the renter.
                    </p>
                  </div>
                  {/* Footer */}
                  <div className="px-8 py-5 border-t border-[#D5CFC3] text-center">
                    <p className="text-[10px] text-[#A09890]" style={{ fontFamily: MONO }}>Rentre · rentre.ca</p>
                    <p className="text-[10px] text-[#A09890] mt-1">You received this because a renter chose to share their passport with you.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button onClick={() => setShowEmailPreview(true)} disabled={!recipientName.trim() || shareStatus === "sent"}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3.5 mb-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            <Mail size={15} /> Preview email they{"'"}ll receive
          </button>
          <button onClick={async () => {
              const finished = {
                ...profile,
                employment, income, jobTitle, employer,
                currentAddress, timeAtAddress, currentLandlord, landlordPhone,
                hasIncomeDoc: !!incomeFile, hasCreditDoc: !!creditFile, reachOut,
                passportComplete: true,
              }
              // Already sent: the button becomes "continue" rather than sending a second link.
              if (shareStatus === "sent") return onComplete(finished)

              // Only the sections the renter left ticked leave the browser.
              const f = shareFields
              const picked: Record<string, unknown> = {
                ...(f.name && { name: profile.name }),
                ...(f.contact && { email: profile.email, phone: profile.phone }),
                ...(f.city && { city: profile.city, neighbourhoods: profile.neighbourhoods }),
                ...(f.unitPrefs && { unitType: profile.unitType, bedrooms, moveIn: profile.moveIn }),
                ...(f.budget && { budgetMax: profile.budgetMax }),
                ...(f.employment && { employment, employer, jobTitle, income }),
                ...(f.incomeDoc && { hasIncomeDoc: !!incomeFile }),
                ...(f.creditDoc && { hasCreditDoc: !!creditFile }),
                ...(f.rentalHistory && { currentAddress, timeAtAddress }),
                ...(f.landlordRef && { currentLandlord, landlordPhone }),
              }
              const passport = Object.fromEntries(
                Object.entries(picked).filter(([, v]) => v !== "" && v !== undefined && !(Array.isArray(v) && !v.length))
              )

              setShareStatus("sending"); setShareError("")
              try {
                await sharePassport({
                  recipientName: recipientName.trim(),
                  recipientEmail: recipientEmail.trim(),
                  recipientUnit: recipientUnit.trim() || undefined,
                  passport,
                })
                setShareStatus("sent")
              } catch (err: any) {
                setShareStatus("idle")
                setShareError(err.details?.[0]?.message || err.message || "Could not send. Try again.")
              }
            }} disabled={!recipientName.trim() || !recipientEmail.includes("@") || shareStatus === "sending"}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            {shareStatus === "sending" ? "Sending…"
              : shareStatus === "sent" ? <><CheckCircle size={16} />Sent to {recipientEmail.trim()} — Continue</>
              : <>Share with {recipientName.trim() || "…"} <ArrowRight size={16} /></>}
          </button>
          {shareError && <p role="alert" className="mt-3 text-center text-xs text-destructive">{shareError}</p>}
          <p className="text-center text-[10px] text-muted-foreground/60 mt-3 flex items-center justify-center gap-1">
            <Lock size={9} />A unique link is emailed to them. It expires in 14 days, and you can revoke it anytime.
          </p>
        </div>
      </div>
    )
  }

  // ── Layout shell ──────────────────────────────────────────────────────────────
  // Confirm the emailed code, then the account exists and the passport builder opens.
  if (step === 0 && codeSentTo) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4" style={{ fontFamily: BODY }}>
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-10">
            <RentreWordmark />
          </div>
          <h1 className="text-[30px] font-bold text-foreground leading-tight mb-2 text-center" style={{ fontFamily: DISPLAY }}>Check your email</h1>
          <p className="text-sm text-muted-foreground text-center mb-8 leading-relaxed">
            We sent a 6-digit code to <strong className="text-foreground">{codeSentTo}</strong>. Enter it to confirm your email.
          </p>
          <form onSubmit={e => { e.preventDefault(); if (code.length === 6 && !authBusy) confirmCode() }}>
            <label htmlFor="signin-code" className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Confirmation code</label>
            <input
              id="signin-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus placeholder="123456"
              value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full px-3.5 py-3 rounded-xl border border-border bg-input-background text-center text-2xl tracking-[0.4em] text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/40 transition-all"
              style={{ fontFamily: MONO }} />
            {authError && <p role="alert" className="mt-3 text-center text-xs text-destructive">{authError}</p>}
            {authNote && <p role="status" className="mt-3 text-center text-xs text-muted-foreground">{authNote}</p>}
            <button type="submit" disabled={code.length !== 6 || authBusy}
              className="w-full mt-6 flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {authBusy ? "Checking…" : <>Verify &amp; continue <ArrowRight size={16} /></>}
            </button>
          </form>
          <p className="text-center text-[11px] text-muted-foreground mt-5 leading-relaxed">
            {"Didn't get it?"} <button onClick={sendCode} disabled={authBusy} className="text-primary font-medium hover:underline disabled:opacity-50">Resend code</button>
            {" · "}<button onClick={() => { setCodeSentTo(""); setAuthError(""); setAuthNote("") }} className="text-primary font-medium hover:underline">Use a different email</button>
          </p>
        </div>
      </div>
    )
  }

  if (step === 0) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 sm:py-14" style={{ fontFamily: BODY }}>
        <div className="mx-auto w-full max-w-2xl">
          <div className="flex justify-center mb-8">
            <RentreWordmark />
          </div>
          <div className="mb-8 text-center">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary" style={{ fontFamily: MONO }}>Your renter profile</p>
            <h1 className="text-[30px] font-bold text-foreground leading-tight mb-2" style={{ fontFamily: DISPLAY }}>Tell us what you’re looking for</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">Start with the essentials. You can strengthen your profile with documents later.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Full name</label>
                <input type="text" placeholder="Alex Chen" value={profile.name} onChange={e => upd("name", e.target.value)}
                  autoFocus
                  className="w-full px-3.5 py-3 rounded-xl border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/40 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Email address</label>
                <input type="email" placeholder="you@example.com" value={profile.email} onChange={e => upd("email", e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/40 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Phone number</label>
                <input type="tel" inputMode="tel" placeholder="(416) 555-1234" value={profile.phone} onChange={e => upd("phone", formatPhone(e.target.value))}
                  className="w-full px-3.5 py-3 rounded-xl border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/40 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Monthly budget</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">$</span>
                  <input type="number" inputMode="numeric" min="1" placeholder="2,500" value={profile.budgetMax} onChange={e => upd("budgetMax", e.target.value)}
                    className="w-full rounded-xl border border-border bg-input-background py-3 pl-8 pr-14 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/40 transition-all" />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">/mo</span>
                </div>
              </div>
            </div>

            <div className="my-7 h-px bg-border" />

            <div>
              <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Where are you looking?</label>
                  <p className="text-xs text-muted-foreground">Choose a city, then tap the areas that work for you.</p>
                </div>
                <div className="w-40 shrink-0">
                  <SelectInput label="" value={profile.city} onChange={v => { upd("city", v); upd("neighbourhoods", []) }} options={CITIES_OPTS.map(c => ({ value: c, label: c }))} />
                </div>
              </div>
              <NeighbourhoodPicker city={profile.city} selected={profile.neighbourhoods} onChange={v => upd("neighbourhoods", v)} />
            </div>

            <div className="my-7 h-px bg-border" />

            <div>
              <div className="mb-3">
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
                  Must-have amenities <span className="font-normal normal-case tracking-normal opacity-50">optional</span>
                </label>
                <p className="text-xs text-muted-foreground">Select anything you don’t want to compromise on.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {AMENITY_GROUPS.flatMap(group => group.items).map(amenity => {
                  const selected = profile.amenities.includes(amenity)
                  return (
                    <button
                      key={amenity}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => upd("amenities", selected ? profile.amenities.filter(item => item !== amenity) : [...profile.amenities, amenity])}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
                    >
                      {selected && <CheckCircle size={11} className="mr-1.5 inline" />}
                      {amenity}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="my-7 h-px bg-border" />

            <div>
              <button
                type="button"
                role="switch"
                aria-checked={profile.notifPref !== ""}
                onClick={() => upd("notifPref", profile.notifPref ? "" : "email")}
                className="flex w-full items-start justify-between gap-4 text-left"
              >
                <span>
                  <span className="block text-sm font-semibold text-foreground">Notify me about matching rentals</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Get useful matches and renter profile updates. You can opt out anytime.</span>
                </span>
                <span className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${profile.notifPref ? "bg-primary" : "bg-border"}`}>
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${profile.notifPref ? "translate-x-6" : "translate-x-1"}`} />
                </span>
              </button>
              {profile.notifPref && (
                <div className="mt-3 flex gap-2">
                  {(["email", "sms"] as const).map(channel => (
                    <button
                      key={channel}
                      type="button"
                      onClick={() => upd("notifPref", channel)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-all ${profile.notifPref === channel ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                    >
                      {channel === "sms" ? "Text message" : "Email"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                <FileText size={18} className="text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">
                  Have a recent Toronto lease? <span className="font-normal text-muted-foreground">(optional)</span>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Upload it and Rentre can use the details to help complete your renter passport.</p>
                {profile.leaseFileName ? (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-card px-3 py-2.5">
                    <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-foreground">
                      <CheckCircle size={13} className="shrink-0 text-primary" />
                      <span className="truncate">{profile.leaseFileName}</span>
                    </span>
                    <button type="button" onClick={() => upd("leaseFileName", undefined)} className="shrink-0 text-muted-foreground transition-colors hover:text-foreground" aria-label="Remove lease">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/25 bg-card px-4 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary/5">
                    <Upload size={13} />
                    Upload latest lease
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) upd("leaseFileName", file.name)
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => { if (step0Valid && !authBusy) sendCode() }}
            disabled={!step0Valid || authBusy}
            className="w-full mt-6 flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            {authBusy ? "Sending code…" : <>Create my profile <ArrowRight size={16} /></>}
          </button>
          {authError && <p role="alert" className="mt-3 text-center text-xs text-destructive">{authError}</p>}
          <p className="text-center text-[11px] text-muted-foreground mt-5 leading-relaxed">
            {/* Signing in takes the same emailed code — there is no password to fall back on. */}
            Already have an account? <button onClick={() => { if (!authBusy) sendCode() }} disabled={authBusy} className="text-primary font-medium hover:underline disabled:opacity-50">Sign in</button>
          </p>
          <div className="mt-7 flex items-start gap-2.5 px-4 py-3.5 rounded-xl bg-secondary/60 border border-border">
            <Lock size={12} className="shrink-0 mt-0.5 text-muted-foreground/50" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">Your information is encrypted and never sold. You control exactly what landlords see.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: BODY }}>
      {renderUploadConsent()}

      {/* Mobile passport peek strip */}
      <div className="lg:hidden sticky top-0 z-30 bg-background/96 border-b border-border" style={{ backdropFilter: "blur(14px)" }}>
        <button onClick={() => setPassportExpanded(e => !e)} className="w-full flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground text-[11px] font-black" style={{ fontFamily: MONO }}>R</span>
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-foreground leading-tight">{profile.name || "Your passport"}</p>
              <p className="text-[10px] text-muted-foreground">{profile.city || "Rentre"} · Building your renter profile</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground font-medium">{passportExpanded ? "Hide" : "Preview"}</span>
            <ChevronDown size={13} className={`text-muted-foreground transition-transform ${passportExpanded ? "rotate-180" : ""}`} />
          </div>
        </button>
        {passportExpanded && <div className="px-4 pb-4">{renderPassport(true)}</div>}
      </div>

      {/* Progress dots — only during passport steps */}
      <div className="flex items-center justify-center gap-2 pt-6 pb-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(n => (
          <div key={n} className={`rounded-full transition-all duration-300 ${n === step ? "w-7 h-2 bg-primary" : n < step ? "w-2 h-2 bg-primary/40" : "w-2 h-2 bg-border"}`} />
        ))}
      </div>

      {/* My Renter Profile subheader */}
      {onViewProfile && (
        <div className="flex items-center justify-center px-4 pb-2">
          <button onClick={onViewProfile}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 hover:underline transition-colors">
            <UserCheck size={13} />
            View in My Renter Profile
          </button>
        </div>
      )}

      {/* Main grid */}
      <div className="mx-auto max-w-5xl px-4 py-8 lg:grid lg:grid-cols-[1fr_340px] lg:gap-14 lg:py-10 lg:items-start">

        {/* ── Form column ── */}
        <div className="max-w-md mx-auto w-full lg:max-w-none">

          {(step >= 2 || (step === 1 && !resumeProfile)) && (
            <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors">
              <ChevronLeft size={14} /> Back
            </button>
          )}

          {/* ── Persistent upload nudge ── */}
          {step > 2 && (
            <button
              onClick={() => setStep(2)}
              className="group w-full flex items-center gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/4 px-4 py-3 text-left hover:border-primary/50 hover:bg-primary/8 transition-all mb-6"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                <Upload size={14} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">Upload documents to move faster</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {incomeFile && creditFile
                    ? "Income doc & credit report uploaded ✓"
                    : incomeFile
                    ? "Income doc uploaded · add a credit report"
                    : creditFile
                    ? "Credit report uploaded · add income proof"
                    : "Proof of income, credit report — landlords prioritize complete passports"}
                </p>
              </div>
              {(incomeFile || creditFile)
                ? <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-bold text-primary uppercase tracking-wide">
                    <svg width="7" height="5" viewBox="0 0 7 5" fill="none"><path d="M1 2.5L2.5 4L6 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {[incomeFile, creditFile].filter(Boolean).length} uploaded
                  </span>
                : <ChevronRight size={13} className="shrink-0 text-muted-foreground/50 group-hover:text-primary transition-colors" />}
            </button>
          )}
          {step === 2 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/60 border border-border mb-6">
              <FileText size={13} className="text-primary shrink-0" />
              <p className="text-xs text-muted-foreground">Upload documents below to strengthen your passport — landlords prioritize complete profiles.</p>
            </div>
          )}

          {/* ── STEP 1: Your details ──────────────────────────────── */}
          {step === 1 && (<>
            <div className="mb-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-2" style={{ fontFamily: MONO }}>Step 1 of {TOTAL_STEPS} — Your details</p>
              <h2 className="text-[28px] font-bold text-foreground leading-tight mb-2" style={{ fontFamily: DISPLAY }}>Build your renter passport</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">One profile, built once — share it with any landlord, add to it anytime.</p>
            </div>
            <div className="mb-4 px-4 py-3 rounded-xl bg-primary/6 border border-primary/15 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">{profile.name.charAt(0).toUpperCase() || "?"}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{profile.name}</p>
                <p className="text-[10px] text-muted-foreground">{profile.email}</p>
              </div>
            </div>
            <div className="flex flex-col gap-5">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
                  Phone number <span className="font-normal opacity-50 normal-case tracking-normal">optional</span>
                </label>
                <input type="tel" placeholder="(416) 555-1234" value={profile.phone} onChange={e => upd("phone", formatPhone(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
              </div>
              <SelectInput label="City" value={profile.city} onChange={v => { upd("city", v); upd("neighbourhoods", []) }} options={CITIES_OPTS.map(c => ({ value: c, label: c }))} />
            </div>
          </>)}

          {/* ── STEP 2: Financial (required) ───────────────────────── */}
          {step === 2 && (<>
            <div className="mb-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-2" style={{ fontFamily: MONO }}>Step 2 of {TOTAL_STEPS}</p>
              <h2 className="text-[28px] font-bold text-foreground leading-tight mb-2" style={{ fontFamily: DISPLAY }}>Strengthen your passport</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">Self-reported financial details help landlords understand your situation at a glance.</p>
            </div>
            <div className="flex flex-col gap-5">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">Employment status <span className="text-destructive">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {["Full-time", "Part-time", "Self-employed", "Student", "Retired", "Other"].map(e => (
                    <button key={e} onClick={() => setEmployment(e === employment ? "" : e)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${e === employment ? "bg-primary border-primary text-primary-foreground" : "border-border text-foreground hover:border-primary/40 hover:bg-primary/5"}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Annual gross income <span className="text-destructive">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">$</span>
                  <input type="number" placeholder="75,000" value={income} onChange={e => setIncome(e.target.value)}
                    className="w-full pl-7 pr-16 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">/year</span>
                </div>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Self-reported. Landlords may request verification later.</p>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Job title <span className="font-normal opacity-50 normal-case tracking-normal">optional</span></label>
                <input type="text" placeholder="e.g. Product Designer" value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-dashed border-border bg-input-background/60 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
              </div>
              {(employment === "Full-time" || employment === "Part-time") && (
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Employer <span className="font-normal opacity-50 normal-case tracking-normal">optional</span></label>
                  <input type="text" placeholder="e.g. Shopify Inc." value={employer} onChange={e => setEmployer(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-dashed border-border bg-input-background/60 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                </div>
              )}
              <div className="h-px bg-border" />
              {/* Income upload */}
              <div className={`rounded-xl border-2 border-dashed p-4 transition-all ${incomeFile ? "border-primary/30 bg-primary/4" : "border-border/60 bg-secondary/20"}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Proof of income <span className="text-[10px] font-normal text-muted-foreground/70 ml-1.5 normal-case">optional</span></p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Pay stub, employment letter, or bank statement</p>
                  </div>
                  {incomeFile && <button onClick={() => setIncomeFile(null)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={14} /></button>}
                </div>
                {incomeFile
                  ? <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/8 border border-primary/20">
                      <CheckCircle size={14} className="text-primary shrink-0" />
                      <div className="min-w-0 flex-1"><p className="text-xs font-medium text-foreground truncate">{incomeFile.name}</p><p className="text-[10px] text-muted-foreground">Added {incomeFile.date}</p></div>
                    </div>
                  : <button onClick={() => setShowUploadConsent("income")} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-border bg-background text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/25 transition-all">
                      <Upload size={13} /> Upload document
                    </button>}
              </div>
              {/* Credit report upload */}
              <div className={`rounded-xl border-2 border-dashed p-4 transition-all ${creditFile ? "border-primary/30 bg-primary/4" : "border-border/60 bg-secondary/20"}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Credit report <span className="text-[10px] font-normal text-muted-foreground/70 ml-1.5 normal-case">optional</span></p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Equifax, TransUnion, or Borrowell export</p>
                  </div>
                  {creditFile && <button onClick={() => setCreditFile(null)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={14} /></button>}
                </div>
                {creditFile
                  ? <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/8 border border-primary/20">
                      <CheckCircle size={14} className="text-primary shrink-0" />
                      <div className="min-w-0 flex-1"><p className="text-xs font-medium text-foreground truncate">{creditFile.name}</p><p className="text-[10px] text-muted-foreground">Added {creditFile.date}</p></div>
                    </div>
                  : <button onClick={() => setShowUploadConsent("credit")} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-border bg-background text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/25 transition-all">
                      <Upload size={13} /> Upload report
                    </button>}
              </div>
            </div>
          </>)}

          {/* ── STEP 3: Rental history (required) ──────────────────── */}
          {step === 3 && (<>
            <div className="mb-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-2" style={{ fontFamily: MONO }}>Step 3 of {TOTAL_STEPS}</p>
              <h2 className="text-[28px] font-bold text-foreground leading-tight mb-2" style={{ fontFamily: DISPLAY }}>Your rental track record</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">A verified rental history is one of the strongest signals for any landlord.</p>
            </div>
            <div className="flex flex-col gap-5">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Current address <span className="text-destructive">*</span></label>
                <input type="text" placeholder="123 Main St, Toronto, ON" value={currentAddress} onChange={e => setCurrentAddress(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">Time at this address <span className="text-destructive">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {["Under 6 months", "6–12 months", "1–2 years", "2–4 years", "4+ years"].map(t => (
                    <button key={t} onClick={() => setTimeAtAddress(t === timeAtAddress ? "" : t)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${t === timeAtAddress ? "bg-primary border-primary text-primary-foreground" : "border-border text-foreground hover:border-primary/40 hover:bg-primary/5"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-px bg-border" />
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Landlord name <span className="font-normal opacity-50 normal-case tracking-normal">optional — strengthens your passport</span></label>
                <input type="text" placeholder="Jane Smith" value={currentLandlord} onChange={e => setCurrentLandlord(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-dashed border-border bg-input-background/60 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Landlord phone number <span className="font-normal opacity-50 normal-case tracking-normal">optional</span></label>
                <input type="tel" placeholder="(416) 555-9000" value={landlordPhone} onChange={e => setLandlordPhone(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-dashed border-border bg-input-background/60 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
              </div>
            </div>
          </>)}

          {/* ── STEP 4: Preferences + reach-out (all optional) ─────── */}
          {step === 4 && (<>
            <div className="mb-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2" style={{ fontFamily: MONO }}>Step 4 of {TOTAL_STEPS} · Optional</p>
              <h2 className="text-[28px] font-bold text-foreground leading-tight mb-2" style={{ fontFamily: DISPLAY }}>What you{"'"}re looking for</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">Everything here is optional — fill in what you can to help landlords understand your fit.</p>
            </div>
            <div className="flex flex-col gap-6">

              {/* Reach-out preference — top of form */}
              <div className="rounded-2xl border-2 border-primary/20 bg-primary/4 p-5">
                <div className="flex items-start justify-between gap-4 mb-1">
                  <div>
                    <p className="text-sm font-bold text-foreground">Reach out if a unit matches</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">Let landlords with units matching your requirements contact you directly — no browsing needed.</p>
                  </div>
                  <button onClick={() => setReachOut(r => !r)} className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors ${reachOut ? "bg-primary" : "bg-border"}`}>
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${reachOut ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                {reachOut && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/8 border border-primary/20">
                    <CheckCircle size={12} className="text-primary shrink-0" />
                    <p className="text-[11px] text-primary font-medium">Active — landlords can reach out if your preferences match their unit</p>
                  </div>
                )}
              </div>

              <div className="h-px bg-border" />

              <SelectInput label="Unit type" value={profile.unitType} onChange={v => upd("unitType", v)} options={UNIT_TYPE_OPTS} optional />
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">Rent guarantee <span className="font-normal opacity-50 normal-case tracking-normal">optional</span></label>
                <div className="flex flex-wrap gap-2">
                  {["None", "Co-signer available", "Guarantor letter"].map(g => (
                    <button key={g} onClick={() => setRentGuarantee(g === rentGuarantee ? "" : g)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${g === rentGuarantee ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/5"}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Monthly budget <span className="font-normal opacity-50 normal-case tracking-normal">optional</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">$</span>
                  <input type="number" placeholder="2,500" value={profile.budgetMax} onChange={e => upd("budgetMax", e.target.value)}
                    className="w-full pl-7 pr-14 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">/mo</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">Move-in timeline <span className="font-normal opacity-50 normal-case tracking-normal">optional</span></label>
                <div className="flex flex-wrap gap-2">
                  {["ASAP", "1–2 months", "3–6 months", "6+ months", "Flexible"].map(t => (
                    <button key={t} onClick={() => upd("moveIn", t === profile.moveIn ? "" : t)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${t === profile.moveIn ? "bg-primary border-primary text-primary-foreground" : "border-border text-foreground hover:border-primary/40 hover:bg-primary/5"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">Preferred neighbourhoods in {profile.city} <span className="font-normal opacity-50 normal-case tracking-normal">optional</span></label>
                <div className="flex flex-wrap gap-2">
                  {(NBHDS[profile.city] || []).map(n => {
                    const sel = profile.neighbourhoods.includes(n)
                    return (
                      <button key={n} onClick={() => upd("neighbourhoods", sel ? profile.neighbourhoods.filter(x => x !== n) : [...profile.neighbourhoods, n])}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${sel ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"}`}>
                        {n}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">Occupants <span className="font-normal opacity-50 normal-case tracking-normal">optional</span></label>
                <div className="inline-flex items-center rounded-xl border border-border bg-card overflow-hidden">
                  <button onClick={() => setOccupants(o => Math.max(1, o - 1))} className="w-11 h-11 flex items-center justify-center text-foreground hover:bg-secondary transition-colors border-r border-border"><Minus size={14} /></button>
                  <span className="w-12 text-center text-sm font-semibold text-foreground" style={{ fontFamily: MONO }}>{occupants}</span>
                  <button onClick={() => setOccupants(o => Math.min(8, o + 1))} className="w-11 h-11 flex items-center justify-center text-foreground hover:bg-secondary transition-colors border-l border-border"><Plus size={14} /></button>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Pets <span className="font-normal opacity-50 normal-case tracking-normal">optional</span></label>
                  <button onClick={() => setHasPets(p => !p)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hasPets ? "bg-primary" : "bg-border"}`}>
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${hasPets ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                {hasPets && (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap gap-2">
                      {["Dog", "Cat", "Bird", "Other"].map(t => (
                        <button key={t} onClick={() => setPetType(t === petType ? "" : t)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${t === petType ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-foreground/20"}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <input type="text" placeholder="Breed (optional)" value={petBreed} onChange={e => setPetBreed(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-dashed border-border bg-input-background/60 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                  </div>
                )}
              </div>
              <div className="h-px bg-border" />
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Reason for moving <span className="font-normal opacity-50 normal-case tracking-normal">optional</span></label>
                <select value={reasonMoving} onChange={e => setReasonMoving(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-dashed border-border bg-input-background/60 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none transition-all">
                  <option value="">Select…</option>
                  {["End of lease","Relocating for work","Upsizing","Downsizing","Building sold","Price increase","Other"].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4">
                <p className="text-xs font-semibold text-foreground">Character or professional reference <span className="text-[10px] font-normal text-muted-foreground/60 ml-1.5 normal-case">optional</span></p>
                <FormInput label="Reference name" placeholder="Morgan Lee" value={profile.notes.split("|")[0] || ""} onChange={v => upd("notes", [v, profile.notes.split("|")[1] || ""].join("|"))} optional />
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Relationship <span className="font-normal opacity-50 normal-case tracking-normal">optional</span></label>
                  <select value={profile.notes.split("|")[1] || ""} onChange={e => upd("notes", [profile.notes.split("|")[0] || "", e.target.value].join("|"))}
                    className="w-full px-3 py-2.5 rounded-lg border border-dashed border-border bg-input-background/60 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none transition-all">
                    <option value="">Select relationship…</option>
                    {["Employer","Coworker","Mentor","Neighbour","Other"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-secondary/60 border border-border">
                  <Info size={12} className="shrink-0 mt-0.5 text-muted-foreground/50" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">References are never contacted without your permission.</p>
                </div>
              </div>
            </div>
          </>)}

          {/* ── STEP 5: Review & Share ──────────────────────────────── */}
          {step === 5 && (<>
            <div className="mb-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent mb-2" style={{ fontFamily: MONO }}>Passport complete</p>
              <h2 className="text-[28px] font-bold text-foreground leading-tight mb-2" style={{ fontFamily: DISPLAY }}>Your passport is ready</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">Review everything and share when you{"'"}re ready. You can edit any section before sending.</p>
            </div>
            <div className="mb-6">{renderPassport()}</div>

            {/* Copy profile link */}
            <button
              onClick={() => {
                const mockUrl = `rentre.ca/passport/${profile.name.toLowerCase().replace(/\s+/g, "-") || "you"}`
                navigator.clipboard.writeText(mockUrl).then(() => {
                  setProfileLinkCopied(true)
                  setTimeout(() => setProfileLinkCopied(false), 2500)
                })
              }}
              className={`w-full flex items-center justify-center gap-2.5 rounded-xl border-2 px-5 py-3.5 mb-5 text-sm font-semibold transition-all ${profileLinkCopied ? "border-primary/40 bg-primary/8 text-primary" : "border-dashed border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-primary/4"}`}>
              {profileLinkCopied ? <CheckCircle size={15} className="text-primary" /> : <Copy size={15} />}
              {profileLinkCopied ? "Link copied to clipboard!" : "Copy your passport link"}
            </button>

            {[
              { icon: <User size={14} />, label: "Basics", onEdit: () => setStep(1), rows: [
                { k: "Name", v: profile.name }, { k: "Email", v: profile.email },
                { k: "City", v: profile.city }, { k: "Phone", v: profile.phone || "—" },
              ]},
              { icon: <DollarSign size={14} />, label: "Financial", onEdit: () => setStep(2), rows: [
                { k: "Employment", v: employment || "—" },
                { k: "Job title", v: jobTitle || "—" },
                { k: "Income", v: income ? `$${Number(income).toLocaleString()}/yr` : "—" },
                { k: "Income doc", v: incomeFile ? incomeFile.name : "—" },
              ]},
              { icon: <MapPin size={14} />, label: "Rental history", onEdit: () => setStep(3), rows: [
                { k: "Address", v: currentAddress || "—" },
                { k: "Time at address", v: timeAtAddress || "—" },
                { k: "Landlord", v: currentLandlord || "—" },
                { k: "Landlord phone", v: landlordPhone || "—" },
              ]},
              { icon: <Home size={14} />, label: "Preferences", onEdit: () => setStep(4), rows: [
                { k: "Unit type", v: profile.unitType || "—" },
                { k: "Budget", v: profile.budgetMax ? `$${Number(profile.budgetMax).toLocaleString()}/mo` : "—" },
                { k: "Move-in", v: profile.moveIn || "—" },
                { k: "Reach-out", v: reachOut ? "On" : "Off" },
              ]},
            ].map(({ icon, label, rows, onEdit }) => (
              <div key={label} className="mb-3 rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><span className="text-primary">{icon}</span>{label}</div>
                  <button onClick={onEdit} className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/70 font-medium transition-colors">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M8 1.5L9.5 3L3.5 9H2V7.5L8 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Edit
                  </button>
                </div>
                <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2">
                  {rows.map(({ k, v }) => (
                    <div key={k}>
                      <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground/60" style={{ fontFamily: MONO }}>{k}</p>
                      <p className={`text-xs font-medium mt-0.5 ${v === "—" ? "text-muted-foreground/35" : "text-foreground"}`}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>)}

          {/* ── Sticky bottom CTA ──────────────────────────────────── */}
          <div className="sticky bottom-0 z-20 -mx-4 px-4 pt-4 pb-6 mt-8 bg-background/96 border-t border-border" style={{ backdropFilter: "blur(12px)" }}>
            <button
              onClick={() => { if (step === 0) { sendCode() } else if (step < TOTAL_STEPS) { persistProfile(); setStep(s => s + 1) } else { persistProfile(); setShowShare(true) } }}
              disabled={!canProceed}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {step === 0 ? "Create account" : step === TOTAL_STEPS ? "Share your passport" : step === TOTAL_STEPS - 1 ? "Review passport" : "Continue"}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Desktop passport card */}
        <div className="hidden lg:block">
          <div className="sticky top-8">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3" style={{ fontFamily: MONO }}>Your passport — live preview</p>
            {renderPassport()}
            <div className="mt-3 flex items-start gap-2 px-3.5 py-3 rounded-xl bg-secondary/50 border border-border">
              <Lock size={10} className="shrink-0 mt-0.5 text-muted-foreground/50" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">This card fills in as you complete each section. {"It's"} exactly what landlords see when you share your passport.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── MARKET SEARCH ────────────────────────────────────────────────────────────

export function MarketSearchScreen({ onListing, onApplications, prefs, isSignedIn, onSignIn }: {
  onListing: (id: string) => void; onApplications: () => void
  prefs: TenantPrefs; isSignedIn: boolean; onSignIn: () => void
}) {
  const [city, setCity] = useState(() => prefs.location && CITIES_LIST.includes(prefs.location) ? prefs.location : "All")
  const [unitType, setUnitType] = useState(prefs.unitType || "")
  const [maxBudget, setMaxBudget] = useState(prefs.budgetMax || "")
  const [rentControlled, setRentControlled] = useState(false)
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const hasPrefs = prefs.priorities.length > 0
  const hasFilters = !!(unitType || maxBudget || rentControlled)

  const filtered = MOCK_LISTINGS.filter(l => {
    if (city !== "All" && l.city !== city) return false
    if (unitType && l.unitType !== unitType) return false
    if (maxBudget && l.price > parseInt(maxBudget)) return false
    if (rentControlled && !l.rentControlled) return false
    return true
  })

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: BODY }}>
      <div className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="flex items-center gap-0.5 px-4 md:px-8 overflow-x-auto py-3" style={{ scrollbarWidth: "none" }}>
          {CITIES_LIST.map(c => (
            <button key={c} onClick={() => setCity(c)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${city === c ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              {c}
            </button>
          ))}
          <div className="ml-auto shrink-0 pl-4 border-l border-border">
            <button onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border transition-all ${showFilters || hasFilters ? "border-foreground text-foreground bg-secondary" : "border-border text-muted-foreground hover:border-foreground/30"}`}>
              <SlidersHorizontal size={14} /> Filters{hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary ml-0.5" />}
            </button>
          </div>
        </div>
        {showFilters && (
          <div className="border-t border-border bg-background px-4 md:px-8 py-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-36">
                <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">Unit type</label>
                <select value={unitType} onChange={e => setUnitType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none">
                  <option value="">Any type</option>
                  {UNIT_TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="w-36">
                <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wide">Max rent</label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input type="number" placeholder="3,000" value={maxBudget} onChange={e => setMaxBudget(e.target.value)} className="w-full pl-6 pr-3 py-2 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pb-0.5">
                <div onClick={() => setRentControlled(r => !r)} className={`w-9 h-5 rounded-full relative cursor-pointer transition-all ${rentControlled ? "bg-primary" : "bg-border"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${rentControlled ? "left-4" : "left-0.5"}`} />
                </div>
                <span className="text-sm text-muted-foreground">Rent controlled only</span>
              </label>
              {hasFilters && <button onClick={() => { setUnitType(""); setMaxBudget(""); setRentControlled(false) }} className="text-xs text-muted-foreground hover:text-foreground underline">Clear all</button>}
            </div>
          </div>
        )}
      </div>

      {!isSignedIn && (
        <div className="mx-4 md:mx-8 mt-4 mb-1 flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
          <Star size={14} className="text-primary shrink-0" />
          <p className="text-xs text-muted-foreground flex-1">Sign in to see personalized match scores for every listing.</p>
          <button onClick={onSignIn} className="shrink-0 text-xs font-semibold text-primary hover:underline">Sign in →</button>
        </div>
      )}
      {isSignedIn && hasPrefs && (
        <div className="mx-4 md:mx-8 mt-4 mb-1 flex items-center gap-2 p-3 rounded-lg bg-secondary/60 border border-border">
          <Star size={13} className="text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">Scored by your priorities: <span className="text-foreground">{prefs.priorities.join(", ")}</span></p>
        </div>
      )}

      <div className="px-4 md:px-8 pt-4 pb-3">
        <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{filtered.length} rental{filtered.length !== 1 ? "s" : ""}</span>{city !== "All" ? ` in ${city}` : " across Canada"}{rentControlled ? " · Rent controlled" : ""}</p>
      </div>

      <div className="px-4 md:px-8 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8">
          {filtered.map(listing => {
            const ms = hasPrefs ? matchScore(listing, prefs) : null
            return (
              <div key={listing.id} className="group cursor-pointer" onClick={() => onListing(listing.id)}>
                <div className="relative rounded-2xl overflow-hidden bg-secondary" style={{ aspectRatio: "4/3" }}>
                  <img src={listing.image} alt={listing.address} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out" />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    {listing.rentControlled && <span className="px-2 py-1 rounded-lg bg-white/95 text-[10px] font-bold text-foreground backdrop-blur-sm shadow-sm uppercase tracking-wide">Rent controlled</span>}
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {ms !== null && (
                      <div className={`px-2 py-1 rounded-lg text-xs font-bold backdrop-blur-sm shadow-sm border ${ms >= 7.5 ? "bg-green-500/90 text-white border-green-400/50" : ms >= 5.5 ? "bg-amber-500/90 text-white border-amber-400/50" : "bg-red-500/90 text-white border-red-400/50"}`} style={{ fontFamily: MONO }}>
                        {ms.toFixed(1)}
                      </div>
                    )}
                    <button onClick={e => { e.stopPropagation(); setSavedIds(ids => ids.includes(listing.id) ? ids.filter(x => x !== listing.id) : [...ids, listing.id]) }}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-black/15 hover:bg-black/35 transition-all backdrop-blur-sm">
                      <Heart size={14} className={savedIds.includes(listing.id) ? "fill-white text-white" : "text-white"} />
                    </button>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="font-semibold text-foreground text-sm leading-snug mb-0.5">{listing.address}{listing.unit ? <span className="font-normal text-muted-foreground">, {listing.unit}</span> : ""}</div>
                  <div className="text-xs text-muted-foreground mb-1">{listing.neighbourhood} · {listing.city}</div>
                  <div className="text-xs text-muted-foreground mb-2">{listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} bed`}<span className="mx-1.5 opacity-40">·</span>{listing.sqft.toLocaleString()} sqft<span className="mx-1.5 opacity-40">·</span>Est. {listing.yearBuilt}</div>
                  <div><span className="font-semibold text-foreground text-sm" style={{ fontFamily: MONO }}>${listing.price.toLocaleString()}</span><span className="text-xs text-muted-foreground ml-1">/ mo net</span></div>
                </div>
              </div>
            )
          })}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-24"><Building size={32} className="mx-auto mb-3 opacity-20 text-muted-foreground" /><p className="text-sm text-muted-foreground">No listings match your filters.</p><button onClick={() => { setCity("All"); setUnitType(""); setMaxBudget(""); setRentControlled(false) }} className="text-xs text-primary mt-2 hover:underline">Clear all filters</button></div>
        )}
      </div>
    </div>
  )
}

// ─── LISTING DETAIL ───────────────────────────────────────────────────────────

export function ListingDetailScreen({ listingId, prefs, onRequestViewing, isSignedIn, onSignIn, userProfile, onUpdateProfile, onViewPassport }: {
  listingId: string
  prefs: TenantPrefs
  onRequestViewing: (id: string) => void
  isSignedIn: boolean
  onSignIn: () => void
  userProfile: UserProfile | null
  onUpdateProfile: (profile: UserProfile) => void
  onViewPassport: () => void
}) {
  const listing = MOCK_LISTINGS.find(l => l.id === listingId)!
  const [showScore, setShowScore] = useState(false)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const ms = matchScore(listing, prefs)
  const hasPrefs = prefs.priorities.length > 0

  const includedAddOns = listing.addOns.filter(a => a.price === "included")
  const availableAddOns = listing.addOns.filter(a => a.price !== "included")
  const estimatedExtras = [
    { label: "Hydro / electricity", sublabel: "Avg. for this unit size", cost: 95, icon: <Leaf size={13} className="text-green-600" /> },
    { label: "Internet", sublabel: "Cable / fibre estimate", cost: 65, icon: <Info size={13} className="text-blue-500" /> },
    { label: "Tenant insurance", sublabel: "Contents + liability", cost: 28, icon: <Shield size={13} className="text-primary" /> },
  ]
  const extrasTotal = estimatedExtras.reduce((s, e) => s + e.cost, 0)

  const weights = { price: prefs.priorities.includes("price") ? 0.30 : 0.18, transit: prefs.priorities.includes("transit") ? 0.22 : 0.14, walkability: prefs.priorities.includes("walkability") ? 0.20 : 0.13, amenities: prefs.priorities.includes("amenities") ? 0.18 : 0.12, location: prefs.priorities.includes("location") ? 0.22 : 0.15, space: prefs.priorities.includes("space") ? 0.20 : 0.12 }
  const subScores = [
    { label: "Price vs. Market", score: listing.scores.price, weight: weights.price, icon: <BarChart3 size={13} /> },
    { label: "Location", score: listing.scores.location, weight: weights.location, icon: <MapPin size={13} /> },
    { label: "Transit", score: listing.scores.transit, weight: weights.transit, icon: <Train size={13} /> },
    { label: "Walkability", score: listing.scores.walkability, weight: weights.walkability, icon: <Star size={13} /> },
    { label: "Amenities", score: listing.scores.amenities, weight: weights.amenities, icon: <Package size={13} /> },
    { label: "Space", score: listing.scores.space, weight: weights.space, icon: <Ruler size={13} /> },
  ]

  return (
    <div className="min-h-screen" style={{ fontFamily: BODY }}>
      <PhotoGallery photos={listing.photos} floorPlan={listing.floorPlan} />

      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-[1fr_340px] gap-10 items-start">

        {/* ── LEFT: main editorial content ── */}
        <div>
          {/* Title row */}
          <div className="mb-7">
            <div className="flex items-start justify-between gap-4 mb-1.5">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground leading-tight" style={{ fontFamily: DISPLAY }}>
                {listing.address}{listing.unit ? <span className="font-normal text-muted-foreground">, {listing.unit}</span> : ""}
              </h2>
              {listing.rentControlled && (
                <span className="shrink-0 mt-1 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-xs font-semibold text-green-700 whitespace-nowrap">Rent controlled</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{listing.neighbourhood} · {listing.city}</p>
          </div>

          {/* Stat trio */}
          <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden border border-border mb-8" style={{ background: "var(--border)" }}>
            {[
              { label: "Square footage", value: `${listing.sqft.toLocaleString()} sqft` },
              { label: "Year built", value: String(listing.yearBuilt) },
              { label: "Rent controlled", value: listing.rentControlled ? "Yes" : "No", positive: listing.rentControlled },
            ].map(stat => (
              <div key={stat.label} className="bg-card px-4 py-4 text-center">
                <div className={`text-sm font-bold mb-0.5 ${stat.positive ? "text-green-700" : "text-foreground"}`} style={{ fontFamily: MONO }}>{stat.value}</div>
                <div className="text-[11px] text-muted-foreground leading-snug">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Add-ons */}
          <div className="mb-8">
            <div className="text-[11px] font-semibold text-muted-foreground mb-3 uppercase tracking-widest">Included & available add-ons</div>
            <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
              {includedAddOns.map(a => (
                <div key={a.label} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <CheckCircle size={14} className="text-green-600 shrink-0" />
                    <span className="text-sm text-foreground">{a.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-green-700">Included</span>
                </div>
              ))}
              {availableAddOns.map(a => (
                <div key={a.label} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-border shrink-0" />
                    <span className="text-sm text-foreground">{a.label}</span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground" style={{ fontFamily: MONO }}>+${(a.price as number).toLocaleString()}/mo</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">Add-on pricing is confirmed at lease signing.</p>
          </div>

          {/* Estimated extras */}
          <div className="mb-8">
            <div className="text-[11px] font-semibold text-muted-foreground mb-3 uppercase tracking-widest">Estimated extras</div>
            <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
              {estimatedExtras.map(item => (
                <div key={item.label} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <div>
                      <div className="text-sm text-foreground">{item.label}</div>
                      <div className="text-[10px] text-muted-foreground">{item.sublabel}</div>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground" style={{ fontFamily: MONO }}>~${item.cost}/mo</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-3.5 bg-secondary/50">
                <span className="text-sm font-semibold text-foreground">Est. all-in monthly</span>
                <span className="text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>${(listing.price + extrasTotal).toLocaleString()}/mo</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">Estimates only. Actual costs vary by usage and provider.</p>
          </div>

          <div className="border-t border-border mb-8" />

          {/* Neighbourhood */}
          <div className="rounded-xl border border-border bg-card mb-6 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Neighbourhood</span>
            </div>
            {[
              { icon: <Bus size={13} />, detail: "Multiple transit lines within 10 min walk", value: "Excellent" },
              { icon: <UtensilsCrossed size={13} />, detail: "80+ restaurants within 500m", value: "Very good" },
              { icon: <ShoppingCart size={13} />, detail: "Metro & Sobeys nearby", value: "Good" },
              { icon: <GraduationCap size={13} />, detail: "3 elementary schools within 1.5km", value: "Moderate" },
            ].map((item, i, arr) => (
              <div key={i} className={`flex items-center gap-3 px-5 py-3.5 ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                <div className="text-muted-foreground shrink-0">{item.icon}</div>
                <div className="flex-1 text-sm text-foreground">{item.detail}</div>
                <div className="text-xs font-semibold text-green-700 shrink-0">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Match score detail */}
          {hasPrefs && (
            <div className="rounded-xl border border-border bg-card mb-6 overflow-hidden">
              <button onClick={() => setShowScore(s => !s)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ fontFamily: MONO, borderColor: scoreColor(ms) + "60", color: scoreColor(ms), background: scoreColor(ms) + "14" }}>
                    {ms.toFixed(1)}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-foreground">Your match score</div>
                    <div className="text-xs text-muted-foreground">Weighted by: {prefs.priorities.join(", ") || "default"}</div>
                  </div>
                </div>
                <ChevronDown size={16} className={`text-muted-foreground transition-transform ${showScore ? "rotate-180" : ""}`} />
              </button>
              {showScore && (
                <div className="border-t border-border px-5 pb-4 divide-y divide-border">
                  {subScores.map(s => <SubScoreRow key={s.label} {...s} />)}
                </div>
              )}
            </div>
          )}

          {/* Ratings */}
          <div className="pt-2">
            <RatingSection isSignedIn={isSignedIn} onSignIn={onSignIn} />
          </div>
        </div>

        {/* ── RIGHT: sticky booking sidebar ── */}
        <div className="sticky top-20 flex flex-col gap-4">
          {/* Price + CTA card */}
          <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
            {/* Price header */}
            <div className="p-6 border-b border-border">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Monthly rent</div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-3xl font-bold text-foreground" style={{ fontFamily: MONO }}>${listing.price.toLocaleString()}</span>
                <span className="text-base text-muted-foreground">/mo net</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Base rent · add-ons listed separately</p>
              <div className="px-3 py-2.5 rounded-xl bg-secondary/60 border border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Est. all-in</span>
                <span className="text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>${(listing.price + extrasTotal).toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/mo</span></span>
              </div>
            </div>

            {/* Key facts */}
            <div className="px-6 py-4 border-b border-border">
              <div className="flex flex-col gap-3">
                {[
                  { icon: <Clock size={13} />, label: "Move-in", value: listing.moveIn },
                  { icon: <Calendar size={13} />, label: "Lease term", value: listing.leaseTerm },
                  { icon: <Clock size={13} />, label: "Posted", value: `${listing.postedDays} day${listing.postedDays !== 1 ? "s" : ""} ago` },
                ].map(f => (
                  <div key={f.label} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                      <span className="shrink-0">{f.icon}</span>{f.label}
                    </div>
                    <span className="text-xs font-semibold text-foreground text-right shrink-0">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Match score bar */}
            {hasPrefs && (
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Match score</span>
                  <span className="text-sm font-bold" style={{ fontFamily: MONO, color: scoreColor(ms) }}>{ms.toFixed(1)} / 10</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-muted">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${ms * 10}%`, background: scoreColor(ms) }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">Based on your priority settings</p>
              </div>
            )}

            {isSignedIn && userProfile && (
              <div className="border-b border-border px-6 py-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Application support</p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!userProfile.applyingWithGuarantor}
                  onClick={() => onUpdateProfile({ ...userProfile, applyingWithGuarantor: !userProfile.applyingWithGuarantor })}
                  className="flex w-full items-start justify-between gap-3 text-left"
                >
                  <span className="flex min-w-0 items-start gap-3">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${userProfile.applyingWithGuarantor ? "border-primary/25 bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground"}`}>
                      <Users size={14} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-foreground">Applying with a guarantor</span>
                      <span className="mt-0.5 block text-[10px] leading-relaxed text-muted-foreground">Include guarantor support with this application.</span>
                    </span>
                  </span>
                  <span className={`relative mt-1 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${userProfile.applyingWithGuarantor ? "bg-primary" : "bg-border"}`}>
                    <span className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform ${userProfile.applyingWithGuarantor ? "translate-x-5" : "translate-x-1"}`} />
                  </span>
                </button>
                {userProfile.applyingWithGuarantor && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                    <CheckCircle size={12} className="mt-0.5 shrink-0 text-primary" />
                    <p className="text-[10px] leading-relaxed text-primary">Your application will indicate that guarantor support is available.</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={onViewPassport}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <Eye size={13} />
                  View your passport
                </button>
              </div>
            )}

            {/* CTAs */}
            <div className="p-6 flex flex-col gap-3">
              <PrimaryButton onClick={() => onRequestViewing(listing.id)} fullWidth>
                <Eye size={15} />Request a viewing
              </PrimaryButton>
              {isSignedIn ? (
                <button
                  onClick={() => setShowOfferModal(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-accent text-accent text-sm font-semibold py-3.5 hover:bg-accent hover:text-accent-foreground transition-all active:scale-[0.98]"
                >
                  <FileText size={15} />Make an offer
                </button>
              ) : (
                <button onClick={onSignIn} className="w-full px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all flex items-center justify-center gap-2">
                  <Star size={14} />Sign in to see match score &amp; make an offer
                </button>
              )}
              <p className="text-[10px] text-center text-muted-foreground/60">No commitment — viewing requests are free.</p>
            </div>
          </div>

          {/* Landlord card */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0">
                <Building size={14} className="text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-foreground truncate">{listing.landlord}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1"><BadgeCheck size={10} className="text-primary" />Verified landlord</div>
              </div>
            </div>
            <button className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline">
              <PhoneCall size={11} />Contact landlord
            </button>
          </div>
        </div>
      </div>

      {/* Make an offer modal — signed-in only */}
      {showOfferModal && (() => {
        const offerUnit: SelectedUnit = {
          label: listing.unitType,
          rent: listing.price,
          sqft: listing.sqft,
          available: listing.moveIn,
          groupType: listing.unitType,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
        }
        const offerBuildingMeta: BuildingMeta = {
          name: listing.address,
          totalUnits: 1,
          amenities: [],
          nearby: [],
          addOnPricing: listing.addOns.map(a => ({ label: a.label, price: a.price })),
          landlordClauses: [],
          unitGroups: [],
        }
        return (
          <DraftLeaseModal
            unit={offerUnit}
            buildingMeta={offerBuildingMeta}
            listing={listing}
            userProfile={userProfile}
            onClose={() => setShowOfferModal(false)}
          />
        )
      })()}
    </div>
  )
}

// ─── APPLY FLOW ───────────────────────────────────────────────────────────────

// ─── VIEWING REQUEST FLOW ────────────────────────────────────────────────────

// ─── MY PACKAGE ───────────────────────────────────────────────────────────────

export function MyPackageScreen({ pkg, onChange, onBack, onCreateLink, passportProfile, onBuildPassport, onUpdateProfile }: {
  pkg: RenterPackage
  onChange: (p: RenterPackage) => void
  onBack: () => void
  onCreateLink?: () => void
  passportProfile?: UserProfile
  onBuildPassport?: () => void
  onUpdateProfile?: (p: UserProfile) => void
}) {
  const [linkCopied, setLinkCopied] = useState(false)
  const [outreachModal, setOutreachModal] = useState<"view" | "offer" | null>(null)
  const [modalStep, setModalStep] = useState(1)
  const [modalLandlordEmail, setModalLandlordEmail] = useState("")
  const [modalLandlordName, setModalLandlordName] = useState("")
  const [modalListingAddress, setModalListingAddress] = useState("")
  const [modalListingUrl, setModalListingUrl] = useState("")
  const [modalSent, setModalSent] = useState(false)
  // Offer card state
  const [offerAmount, setOfferAmount] = useState("")
  const [utilitiesWho, setUtilitiesWho] = useState("")
  const [requestedAddOns, setRequestedAddOns] = useState<string[]>([])
  const [dueDiligenceOptIn, setDueDiligenceOptIn] = useState(true)

  // Inline edit state (for the in-progress My Package page)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [editEmployment, setEditEmployment] = useState(passportProfile?.employment ?? "")
  const [editIncome, setEditIncome] = useState(passportProfile?.income ?? "")
  const [editJobTitle, setEditJobTitle] = useState(passportProfile?.jobTitle ?? "")
  const [editEmployer, setEditEmployer] = useState(passportProfile?.employer ?? "")
  const [editAddress, setEditAddress] = useState(passportProfile?.currentAddress ?? "")
  const [editTimeAtAddress, setEditTimeAtAddress] = useState(passportProfile?.timeAtAddress ?? "")
  const [editLandlordName, setEditLandlordName] = useState(passportProfile?.currentLandlord ?? "")
  const [editLandlordPhone, setEditLandlordPhone] = useState(passportProfile?.landlordPhone ?? "")
  const [editCity, setEditCity] = useState(passportProfile?.city ?? "Toronto")
  const [editPhone, setEditPhone] = useState(passportProfile?.phone ?? "")
  const [incomeDoc, setIncomeDoc] = useState<{ name: string; date: string } | null>(passportProfile?.hasIncomeDoc ? { name: "Income document", date: "on file" } : null)
  const [creditDoc, setCreditDoc] = useState<{ name: string; date: string } | null>(passportProfile?.hasCreditDoc ? { name: "Credit report", date: "on file" } : null)

  const saveSection = (section: string) => {
    if (!passportProfile || !onUpdateProfile) return
    const base = passportProfile
    if (section === "financial") onUpdateProfile({ ...base, employment: editEmployment, income: editIncome, jobTitle: editJobTitle, employer: editEmployer })
    if (section === "rental") onUpdateProfile({ ...base, currentAddress: editAddress, timeAtAddress: editTimeAtAddress, currentLandlord: editLandlordName, landlordPhone: editLandlordPhone })
    if (section === "details") onUpdateProfile({ ...base, city: editCity, phone: editPhone })
    if (section === "documents") onUpdateProfile({ ...base, hasIncomeDoc: !!incomeDoc, hasCreditDoc: !!creditDoc })
    setExpandedSection(null)
  }

  const simulateUpload = (type: "income" | "credit") => {
    const name = type === "income" ? "Income_verification.pdf" : "Credit_report.pdf"
    const doc = { name, date: "Today" }
    if (type === "income") setIncomeDoc(doc)
    else setCreditDoc(doc)
    if (passportProfile && onUpdateProfile) {
      onUpdateProfile({ ...passportProfile, hasIncomeDoc: type === "income" ? true : !!incomeDoc, hasCreditDoc: type === "credit" ? true : !!creditDoc })
    }
  }
  const [requests, setRequests] = useState<Array<{ id: string; address: string; landlord: string; sentDate: string; status: "sent" | "viewed" | "responded"; hasOffer: boolean }>>([
    { id: "r1", address: "Unit 4B – 120 Spadina Ave, Toronto", landlord: "Maria Chen", sentDate: "Sep 22", status: "viewed", hasOffer: false },
    { id: "r2", address: "2BR – 88 King St W, Toronto", landlord: "James Park", sentDate: "Sep 20", status: "responded", hasOffer: true },
    { id: "r3", address: "Studio – 310 Bloor St, Toronto", landlord: "Sophie Tremblay", sentDate: "Sep 18", status: "sent", hasOffer: false },
  ])

  const copyLink = () => {
    const url = `rentre.ca/passport/${(passportProfile?.name || "you").toLowerCase().replace(/\s+/g, "-")}`
    navigator.clipboard.writeText(url).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2500) })
  }

  const hasPassport = !!passportProfile?.passportComplete

  // Passport sections for in-progress view
  const pv = passportProfile
  const sections = [
    { label: "Account", done: !!(pv?.name && pv?.email), detail: pv?.email || "Email not set" },
    { label: "Your details", done: !!(pv?.city), detail: pv?.city || "City not set" },
    { label: "Financial", done: !!(pv?.employment && pv?.income), detail: pv?.employment ? `${pv.employment}${pv.income ? ` · $${Number(pv.income).toLocaleString()}` : ""}` : "Not added yet" },
    { label: "Rental history", done: !!(pv?.currentAddress && pv?.timeAtAddress), detail: pv?.currentAddress ? `${pv.timeAtAddress} at current address` : "Not added yet" },
    { label: "Documents", done: !!(pv?.hasIncomeDoc || pv?.hasCreditDoc), detail: [pv?.hasIncomeDoc && "Income", pv?.hasCreditDoc && "Credit"].filter(Boolean).join(" · ") || "Not uploaded yet" },
  ]
  const starterReady = !!(pv?.name && pv?.email && pv?.phone && pv?.city && pv?.budgetMax)
  const remainingChecks = [
    !!(pv?.employment && pv?.income),
    !!(pv?.currentAddress && pv?.timeAtAddress),
    !!(pv?.unitType && pv?.moveIn),
    !!pv?.hasIncomeDoc,
    !!pv?.hasCreditDoc,
  ]
  const remainingWeights = [20, 20, 15, 15, 15]
  const totalPct = (starterReady ? 15 : 0) + remainingChecks.reduce((total, done, index) => total + (done ? remainingWeights[index] : 0), 0)
  const remainingSteps = remainingChecks.filter(done => !done).length

  const openModal = (type: "view" | "offer") => {
    setOutreachModal(type); setModalStep(1); setModalSent(false)
    setModalLandlordEmail(""); setModalLandlordName(""); setModalListingAddress(""); setModalListingUrl("")
    if (type === "offer") setRequestedAddOns([])
  }

  const renderOutreachModal = () => {
    if (!outreachModal) return null
    const type = outreachModal
    const prof = passportProfile
    const isView = type === "view"
    const canSendStep1View = modalLandlordEmail.includes("@")
    const canSendStep1Offer = offerAmount.trim().length > 0 && utilitiesWho.length > 0
    const canSendStep2 = modalLandlordEmail.includes("@")

    const handleSend = () => {
      if (isView) {
        setRequests(prev => [{
          id: `r${Date.now()}`,
          address: modalListingAddress || "New listing",
          landlord: modalLandlordName || "Landlord",
          sentDate: "Today",
          status: "sent" as const,
          hasOffer: false,
        }, ...prev])
      }
      setModalSent(true)
    }

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0">
        <ModalKeys onClose={() => setOutreachModal(null)} />
        <div className="w-full max-w-md bg-card rounded-2xl overflow-hidden shadow-2xl border border-border">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary" style={{ fontFamily: MONO }}>
                {isView ? "Request to View" : "Send Offer"}
                {!modalSent && ` · Step ${modalStep} of 2`}
              </p>
              <h3 className="text-base font-bold text-foreground mt-0.5" style={{ fontFamily: DISPLAY }}>
                {modalSent ? (isView ? "Request sent!" : "Offer sent!") : isView
                  ? (modalStep === 1 ? "Who are you reaching out to?" : "Review & send")
                  : (modalStep === 1 ? "Your offer terms" : "Who are you sending to?")}
              </h3>
            </div>
            <button onClick={() => setOutreachModal(null)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
          </div>
          {modalSent ? (
            <div className="px-6 py-10 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle size={26} className="text-primary" />
              </div>
              <div>
                <p className="text-base font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>
                  {isView ? `Viewing request sent to ${modalLandlordName || "landlord"}` : `Offer sent to ${modalLandlordName || "landlord"}`}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {isView ? "Your passport and documents have been sent. You'll hear back once they've reviewed your profile." : "Your offer to lease has been delivered. You'll be notified when they respond."}
                </p>
              </div>
              {modalListingAddress && (
                <div className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-xs text-muted-foreground text-left">
                  <span className="font-medium text-foreground">{modalListingAddress}</span>
                </div>
              )}
              <button onClick={() => setOutreachModal(null)} className="w-full mt-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all">Done</button>
            </div>
          ) : (
            <>
              <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
                {isView && modalStep === 1 && (<>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Landlord name <span className="font-normal opacity-50 normal-case">optional</span></label>
                    <input type="text" placeholder="e.g. Maria Chen" value={modalLandlordName} onChange={e => setModalLandlordName(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Landlord email <span className="text-destructive">*</span></label>
                    <input type="email" placeholder="landlord@example.com" value={modalLandlordEmail} onChange={e => setModalLandlordEmail(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Unit / property address <span className="font-normal opacity-50 normal-case">optional</span></label>
                    <input type="text" placeholder="e.g. Unit 4B – 120 Spadina Ave" value={modalListingAddress} onChange={e => setModalListingAddress(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">Listing link <span className="font-normal opacity-50 normal-case">optional</span></label>
                    {/* Platform chips */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {[
                        { name: "Kijiji", color: "#5C2D91", hint: "kijiji.ca" },
                        { name: "Rentals.ca", color: "#E8490F", hint: "rentals.ca" },
                        { name: "Facebook", color: "#1877F2", hint: "facebook.com/marketplace" },
                        { name: "Apartments.com", color: "#1565C0", hint: "apartments.com" },
                      ].map(({ name, color, hint }) => {
                        const active = modalListingUrl.toLowerCase().includes(hint.split("/")[0])
                        return (
                          <span key={name} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all"
                            style={{ borderColor: active ? color : undefined, backgroundColor: active ? `${color}15` : undefined, color: active ? color : undefined }}
                            onClick={() => { if (!active) setModalListingUrl(`https://${hint}/`) }}>
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />
                            {name}
                          </span>
                        )
                      })}
                    </div>
                    <div className="relative">
                      <input type="url" placeholder="Paste listing URL from any platform"
                        value={modalListingUrl} onChange={e => setModalListingUrl(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all pr-24" />
                      {modalListingUrl && (() => {
                        const url = modalListingUrl.toLowerCase()
                        const platform = url.includes("kijiji") ? { name: "Kijiji", color: "#5C2D91" }
                          : url.includes("rentals.ca") ? { name: "Rentals.ca", color: "#E8490F" }
                          : url.includes("facebook") ? { name: "Facebook", color: "#1877F2" }
                          : url.includes("apartments.com") ? { name: "Apartments.com", color: "#1565C0" }
                          : null
                        return platform ? (
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold rounded-full px-2 py-0.5"
                            style={{ backgroundColor: `${platform.color}18`, color: platform.color }}>
                            {platform.name}
                          </span>
                        ) : null
                      })()}
                    </div>
                  </div>
                </>)}
                {isView && modalStep === 2 && (<>
                  <div className="px-4 py-3 rounded-xl bg-secondary/50 border border-border">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1" style={{ fontFamily: MONO }}>Sending to</p>
                    <p className="text-sm font-bold text-foreground">{modalLandlordName || "Landlord"} · {modalLandlordEmail}</p>
                    {modalListingAddress && <p className="text-xs text-muted-foreground mt-0.5">{modalListingAddress}</p>}
                    {modalListingUrl && (() => {
                      const url = modalListingUrl.toLowerCase()
                      const platform = url.includes("kijiji") ? { name: "Kijiji", color: "#5C2D91" }
                        : url.includes("rentals.ca") ? { name: "Rentals.ca", color: "#E8490F" }
                        : url.includes("facebook") ? { name: "Facebook", color: "#1877F2" }
                        : url.includes("apartments.com") ? { name: "Apartments.com", color: "#1565C0" }
                        : { name: "Listing", color: "#6B7280" }
                      return (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold rounded-full px-2 py-0.5" style={{ backgroundColor: `${platform.color}18`, color: platform.color }}>
                            <ExternalLink size={8} /> {platform.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate">{modalListingUrl.replace(/^https?:\/\//, "")}</span>
                        </div>
                      )
                    })()}
                  </div>
                  <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                    <div className="px-4 py-2.5 bg-secondary/30">
                      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground" style={{ fontFamily: MONO }}>{"What's included in this email"}</p>
                    </div>
                    {[
                      { label: "Renter Passport", ok: true, note: `${prof?.name || "Your"} profile, preferences & history` },
                      { label: "Proof of income", ok: !!prof?.hasIncomeDoc, note: prof?.hasIncomeDoc ? "Attached" : "Not uploaded — add to strengthen your request" },
                      { label: "Credit report", ok: !!prof?.hasCreditDoc, note: prof?.hasCreditDoc ? "Attached" : "Not uploaded — add to strengthen your request" },
                    ].map(({ label, ok, note }) => (
                      <div key={label} className="flex items-center gap-3 px-4 py-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${ok ? "bg-primary/15" : "bg-amber-50 border border-amber-200"}`}>
                          {ok ? <CheckCircle size={11} className="text-primary" /> : <AlertCircle size={11} className="text-amber-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground">{label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>)}
                {!isView && modalStep === 1 && (<>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Gross monthly rent offer <span className="text-destructive">*</span></label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <input type="number" placeholder="2,400" value={offerAmount} onChange={e => setOfferAmount(e.target.value)} className="w-full pl-7 pr-16 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">/mo</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">Utilities <span className="text-destructive">*</span></label>
                    <div className="flex flex-col gap-2">
                      {["Tenant pays all", "Heat included", "All included"].map(opt => (
                        <button key={opt} onClick={() => setUtilitiesWho(opt === utilitiesWho ? "" : opt)}
                          className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm text-left transition-all ${utilitiesWho === opt ? "bg-primary border-primary text-primary-foreground" : "border-border text-foreground hover:border-primary/40 hover:bg-primary/5"}`}>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${utilitiesWho === opt ? "border-white" : "border-muted-foreground/30"}`}>
                            {utilitiesWho === opt && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                      Add-ons requested <span className="font-normal opacity-50 normal-case">optional</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Parking", icon: Car },
                        { label: "Lockers", icon: Package },
                        { label: "Internet", icon: Link2 },
                      ].map(({ label, icon: Icon }) => {
                        const selected = requestedAddOns.includes(label)
                        return (
                          <button
                            key={label}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setRequestedAddOns(current => selected ? current.filter(item => item !== label) : [...current, label])}
                            className={`flex flex-col items-center gap-2 rounded-lg border px-3 py-3 text-xs font-semibold transition-all ${selected ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
                          >
                            <Icon size={15} />
                            {label}
                          </button>
                        )
                      })}
                    </div>
                    <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">Select any extras you want the landlord to include or price in the offer.</p>
                  </div>
                  <button onClick={() => setDueDiligenceOptIn(v => !v)}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all ${dueDiligenceOptIn ? "bg-primary/5 border-primary/25" : "border-border"}`}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 flex-none ${dueDiligenceOptIn ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                      {dueDiligenceOptIn && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Enroll for landlord due-diligence</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Rentre verifies your identity and documents on request</p>
                    </div>
                  </button>
                </>)}
                {!isView && modalStep === 2 && (<>
                  <div className="px-4 py-3 rounded-xl bg-secondary/50 border border-border flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5" style={{ fontFamily: MONO }}>Your offer</p>
                      <p className="text-lg font-bold text-foreground">${Number(offerAmount).toLocaleString()}/mo</p>
                      <p className="text-xs text-muted-foreground">{utilitiesWho}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Add-ons: {requestedAddOns.length > 0 ? requestedAddOns.join(", ") : "None requested"}</p>
                    </div>
                    <button onClick={() => setModalStep(1)} className="text-xs text-primary hover:underline">Edit</button>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Landlord name <span className="font-normal opacity-50 normal-case">optional</span></label>
                    <input type="text" placeholder="e.g. James Park" value={modalLandlordName} onChange={e => setModalLandlordName(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Landlord email <span className="text-destructive">*</span></label>
                    <input type="email" placeholder="landlord@example.com" value={modalLandlordEmail} onChange={e => setModalLandlordEmail(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Unit / property address <span className="font-normal opacity-50 normal-case">optional</span></label>
                    <input type="text" placeholder="e.g. Unit 4B – 120 Spadina Ave" value={modalListingAddress} onChange={e => setModalListingAddress(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                  </div>
                  <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                    <div className="px-4 py-2.5 bg-secondary/30">
                      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground" style={{ fontFamily: MONO }}>{"What's included"}</p>
                    </div>
                    {[
                      { label: "Offer to Lease", ok: true, note: `$${Number(offerAmount).toLocaleString()}/mo · ${utilitiesWho}` },
                      { label: "Add-on requests", ok: true, note: requestedAddOns.length > 0 ? requestedAddOns.join(", ") : "None requested" },
                      { label: "Renter Passport", ok: true, note: `${prof?.name || "Your"} full profile` },
                      { label: "Proof of income", ok: !!prof?.hasIncomeDoc, note: prof?.hasIncomeDoc ? "Attached" : "Not uploaded" },
                      { label: "Credit report", ok: !!prof?.hasCreditDoc, note: prof?.hasCreditDoc ? "Attached" : "Not uploaded" },
                    ].map(({ label, ok, note }) => (
                      <div key={label} className="flex items-center gap-3 px-4 py-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${ok ? "bg-primary/15" : "bg-amber-50 border border-amber-200"}`}>
                          {ok ? <CheckCircle size={11} className="text-primary" /> : <AlertCircle size={11} className="text-amber-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground">{label}</p>
                          <p className="text-[10px] text-muted-foreground">{note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>)}
              </div>
              <div className="px-6 pb-6 pt-4 border-t border-border flex gap-3">
                <button onClick={() => { if (modalStep > 1) setModalStep(s => s - 1); else setOutreachModal(null) }}
                  className="px-4 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {modalStep > 1 ? "Back" : "Cancel"}
                </button>
                {modalStep === 1 ? (
                  <button onClick={() => setModalStep(2)} disabled={isView ? !canSendStep1View : !canSendStep1Offer}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    Continue <ArrowRight size={14} />
                  </button>
                ) : (
                  <button onClick={handleSend} disabled={!canSendStep2}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                    <Send size={14} /> {isView ? "Send viewing request" : "Send offer to lease"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  if (!hasPassport) {
    return (
      <div className="min-h-screen bg-background" style={{ fontFamily: BODY }}>
        {renderOutreachModal()}
        <div className="mx-auto max-w-lg px-4 py-10">
          {/* Header */}
          <div className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1.5" style={{ fontFamily: MONO }}>My Package</p>
            <h1 className="text-[28px] font-bold text-foreground leading-tight" style={{ fontFamily: DISPLAY }}>
              {pv?.name ? `Hey, ${pv.name.split(" ")[0]}` : "Your Renter Passport"}
            </h1>
            {pv?.email && <p className="text-sm text-muted-foreground mt-0.5">{pv.email}</p>}
          </div>

          {pv?.leaseFileName && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <FileText size={16} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">We received your lease</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{pv.leaseFileName}</p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">We’ll use it to help pre-fill your rental history. You can continue the remaining steps now.</p>
              </div>
            </div>
          )}

          {/* Progress card */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden mb-6">
            {/* Top bar */}
            <div className="px-6 pt-6 pb-5 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground" style={{ fontFamily: MONO }}>Passport completion</p>
                  <p className="text-[32px] font-black text-foreground leading-none mt-1" style={{ fontFamily: DISPLAY }}>{totalPct}<span className="text-lg font-bold text-muted-foreground">%</span></p>
                </div>
                <div className="w-16 h-16 relative">
                  <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="6" className="text-secondary" />
                    <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 26}`}
                      strokeDashoffset={`${2 * Math.PI * 26 * (1 - totalPct / 100)}`}
                      strokeLinecap="round"
                      className="text-primary transition-all duration-700" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Shield size={18} className="text-primary" />
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${totalPct}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {remainingSteps === 0 ? "All passport steps complete" : `Starter profile complete · ${remainingSteps} step${remainingSteps === 1 ? "" : "s"} remaining`}
              </p>
            </div>

            {/* Sections — expandable inline edit */}
            <div className="divide-y divide-border">
              {/* Account — view only */}
              {sections.slice(0, 1).map(({ label, done, detail }) => (
                <div key={label} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5" style={{ fontFamily: MONO }}>{detail}</p>
                  </div>
                  <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-primary bg-primary/8 border border-primary/15 rounded-full px-2 py-0.5">Done</span>
                </div>
              ))}

              {/* Your details — editable */}
              <div>
                <button onClick={() => setExpandedSection(expandedSection === "details" ? null : "details")}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-secondary/30 transition-colors text-left">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${sections[1].done ? "bg-primary" : "bg-secondary border border-border"}`}>
                    {sections[1].done ? <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg> : <div className="w-2 h-2 rounded-full bg-border/60" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${sections[1].done ? "text-foreground" : "text-muted-foreground"}`}>Your details</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5" style={{ fontFamily: MONO }}>{sections[1].detail}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 border ${sections[1].done ? "text-primary bg-primary/8 border-primary/15" : "text-muted-foreground bg-secondary border-border"}`}>{sections[1].done ? "Done" : "Edit"}</span>
                    <ChevronDown size={13} className={`text-muted-foreground transition-transform ${expandedSection === "details" ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {expandedSection === "details" && (
                  <div className="px-6 pb-5 flex flex-col gap-3 bg-secondary/20 border-t border-border">
                    <div className="pt-4">
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Phone number <span className="font-normal opacity-50 normal-case">optional</span></label>
                      <input type="tel" placeholder="(416) 555-1234" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">City</label>
                      <select value={editCity} onChange={e => setEditCity(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all">
                        {["Toronto", "Vancouver", "Montréal", "Calgary", "Ottawa", "Edmonton", "Winnipeg"].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <button onClick={() => saveSection("details")} className="self-end px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all">Save</button>
                  </div>
                )}
              </div>

              {/* Financial — editable */}
              <div>
                <button onClick={() => setExpandedSection(expandedSection === "financial" ? null : "financial")}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-secondary/30 transition-colors text-left">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${sections[2].done ? "bg-primary" : "bg-secondary border border-border"}`}>
                    {sections[2].done ? <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg> : <div className="w-2 h-2 rounded-full bg-border/60" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${sections[2].done ? "text-foreground" : "text-muted-foreground"}`}>Financial</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5" style={{ fontFamily: MONO }}>{sections[2].detail}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 border ${sections[2].done ? "text-primary bg-primary/8 border-primary/15" : "text-amber-600 bg-amber-50 border-amber-200"}`}>{sections[2].done ? "Done" : "Add"}</span>
                    <ChevronDown size={13} className={`text-muted-foreground transition-transform ${expandedSection === "financial" ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {expandedSection === "financial" && (
                  <div className="px-6 pb-5 flex flex-col gap-3 bg-secondary/20 border-t border-border">
                    <div className="pt-4">
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">Employment status <span className="text-destructive">*</span></label>
                      <div className="flex flex-wrap gap-2">
                        {["Full-time", "Part-time", "Self-employed", "Student", "Retired", "Other"].map(e => (
                          <button key={e} onClick={() => setEditEmployment(e === editEmployment ? "" : e)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${e === editEmployment ? "bg-primary border-primary text-primary-foreground" : "border-border text-foreground hover:border-primary/40"}`}>
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Annual gross income <span className="text-destructive">*</span></label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        <input type="number" placeholder="75,000" value={editIncome} onChange={e => setEditIncome(e.target.value)}
                          className="w-full pl-7 pr-16 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">/year</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Job title <span className="font-normal opacity-50 normal-case">optional</span></label>
                      <input type="text" placeholder="e.g. Product Designer" value={editJobTitle} onChange={e => setEditJobTitle(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                    </div>
                    {(editEmployment === "Full-time" || editEmployment === "Part-time") && (
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Employer <span className="font-normal opacity-50 normal-case">optional</span></label>
                        <input type="text" placeholder="e.g. Shopify Inc." value={editEmployer} onChange={e => setEditEmployer(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                      </div>
                    )}
                    <button onClick={() => saveSection("financial")} disabled={!editEmployment || !editIncome}
                      className="self-end px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">Save</button>
                  </div>
                )}
              </div>

              {/* Rental history — editable */}
              <div>
                <button onClick={() => setExpandedSection(expandedSection === "rental" ? null : "rental")}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-secondary/30 transition-colors text-left">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${sections[3].done ? "bg-primary" : "bg-secondary border border-border"}`}>
                    {sections[3].done ? <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg> : <div className="w-2 h-2 rounded-full bg-border/60" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${sections[3].done ? "text-foreground" : "text-muted-foreground"}`}>Rental history</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5" style={{ fontFamily: MONO }}>{sections[3].detail}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 border ${sections[3].done ? "text-primary bg-primary/8 border-primary/15" : "text-amber-600 bg-amber-50 border-amber-200"}`}>{sections[3].done ? "Done" : "Add"}</span>
                    <ChevronDown size={13} className={`text-muted-foreground transition-transform ${expandedSection === "rental" ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {expandedSection === "rental" && (
                  <div className="px-6 pb-5 flex flex-col gap-3 bg-secondary/20 border-t border-border">
                    <div className="pt-4">
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Current address <span className="text-destructive">*</span></label>
                      <input type="text" placeholder="123 Main St, Toronto, ON" value={editAddress} onChange={e => setEditAddress(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Time at address <span className="text-destructive">*</span></label>
                      <select value={editTimeAtAddress} onChange={e => setEditTimeAtAddress(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all">
                        <option value="">Select...</option>
                        {["Less than 6 months", "6–12 months", "1–2 years", "2–3 years", "3–5 years", "5+ years"].map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Landlord name <span className="font-normal opacity-50 normal-case">optional</span></label>
                      <input type="text" placeholder="e.g. Maria Chen" value={editLandlordName} onChange={e => setEditLandlordName(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Landlord phone <span className="font-normal opacity-50 normal-case">optional</span></label>
                      <input type="tel" placeholder="(416) 555-0000" value={editLandlordPhone} onChange={e => setEditLandlordPhone(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-all" />
                    </div>
                    <button onClick={() => saveSection("rental")} disabled={!editAddress || !editTimeAtAddress}
                      className="self-end px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">Save</button>
                  </div>
                )}
              </div>

              {/* Documents — upload/manage */}
              <div>
                <button onClick={() => setExpandedSection(expandedSection === "documents" ? null : "documents")}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-secondary/30 transition-colors text-left">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${sections[4].done ? "bg-primary" : "bg-secondary border border-border"}`}>
                    {sections[4].done ? <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg> : <div className="w-2 h-2 rounded-full bg-border/60" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${sections[4].done ? "text-foreground" : "text-muted-foreground"}`}>Documents</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5" style={{ fontFamily: MONO }}>{sections[4].detail}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 border ${sections[4].done ? "text-primary bg-primary/8 border-primary/15" : "text-amber-600 bg-amber-50 border-amber-200"}`}>{sections[4].done ? "Manage" : "Upload"}</span>
                    <ChevronDown size={13} className={`text-muted-foreground transition-transform ${expandedSection === "documents" ? "rotate-180" : ""}`} />
                  </div>
                </button>
                {expandedSection === "documents" && (
                  <div className="px-6 pb-5 flex flex-col gap-3 bg-secondary/20 border-t border-border pt-4">
                    {/* Income doc */}
                    <div className={`rounded-xl border-2 border-dashed p-4 transition-all ${incomeDoc ? "border-primary/30 bg-primary/4" : "border-border/60 bg-card"}`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Proof of income</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Pay stub, employment letter, or bank statement</p>
                        </div>
                        {incomeDoc && <button onClick={() => { setIncomeDoc(null); if (passportProfile && onUpdateProfile) onUpdateProfile({ ...passportProfile, hasIncomeDoc: false }) }} className="text-muted-foreground hover:text-foreground transition-colors shrink-0"><X size={14} /></button>}
                      </div>
                      {incomeDoc
                        ? <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/8 border border-primary/20">
                            <CheckCircle size={14} className="text-primary shrink-0" />
                            <div className="min-w-0 flex-1"><p className="text-xs font-medium text-foreground truncate">{incomeDoc.name}</p><p className="text-[10px] text-muted-foreground">Added {incomeDoc.date}</p></div>
                          </div>
                        : <button onClick={() => simulateUpload("income")} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-border bg-background text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/25 transition-all">
                            <Upload size={13} /> Upload document
                          </button>}
                    </div>
                    {/* Credit doc */}
                    <div className={`rounded-xl border-2 border-dashed p-4 transition-all ${creditDoc ? "border-primary/30 bg-primary/4" : "border-border/60 bg-card"}`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Credit report</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Equifax or TransUnion report within 90 days</p>
                        </div>
                        {creditDoc && <button onClick={() => { setCreditDoc(null); if (passportProfile && onUpdateProfile) onUpdateProfile({ ...passportProfile, hasCreditDoc: false }) }} className="text-muted-foreground hover:text-foreground transition-colors shrink-0"><X size={14} /></button>}
                      </div>
                      {creditDoc
                        ? <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/8 border border-primary/20">
                            <CheckCircle size={14} className="text-primary shrink-0" />
                            <div className="min-w-0 flex-1"><p className="text-xs font-medium text-foreground truncate">{creditDoc.name}</p><p className="text-[10px] text-muted-foreground">Added {creditDoc.date}</p></div>
                          </div>
                        : <button onClick={() => simulateUpload("credit")} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-border bg-background text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/25 transition-all">
                            <Upload size={13} /> Upload document
                          </button>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button onClick={() => openModal("view")}
              className="flex flex-col items-center gap-2.5 rounded-2xl border-2 border-primary/25 bg-card px-4 py-5 hover:border-primary/50 hover:bg-primary/4 active:scale-[0.98] transition-all text-center">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Mail size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground leading-tight">Request to View</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">Outreach email with your passport</p>
              </div>
            </button>
            <button onClick={() => openModal("offer")}
              className="flex flex-col items-center gap-2.5 rounded-2xl border-2 border-border bg-card px-4 py-5 hover:border-primary/30 hover:bg-primary/3 active:scale-[0.98] transition-all text-center">
              <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center">
                <ClipboardList size={18} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground leading-tight">Send Offer</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">Offer to lease with documents</p>
              </div>
            </button>
          </div>

          {/* Continue building CTA */}
          <button onClick={onBuildPassport || onBack}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/50 px-5 py-3.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-[0.98] transition-all">
            {totalPct === 0 ? "Build your Renter Passport" : `Continue building — ${100 - totalPct}% left`}
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    )
  }

  const p = passportProfile as UserProfile
  const docsUploaded = [!!p.hasIncomeDoc, !!p.hasCreditDoc].filter(Boolean).length
  const passportStrength = [
    !!p.name, !!p.email, !!p.city,
    !!p.employment, !!p.income,
    !!p.currentAddress, !!p.timeAtAddress,
    !!p.hasIncomeDoc, !!p.hasCreditDoc,
  ].filter(Boolean).length
  const strengthPct = Math.round((passportStrength / 9) * 100)
  const strengthLabel = strengthPct >= 90 ? "Strong" : strengthPct >= 60 ? "Good" : "Starter"
  const strengthColor = strengthPct >= 90 ? "bg-primary" : strengthPct >= 60 ? "bg-amber-500" : "bg-border"
  const strengthTextColor = strengthPct >= 90 ? "text-primary" : strengthPct >= 60 ? "text-amber-600" : "text-muted-foreground"


  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: BODY }}>
      {renderOutreachModal()}

      {/* ── Status bar ─────────────────────────────────────────── */}
      <div className="bg-card border-b border-border px-4 py-4">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center">
                <CheckCircle size={12} className="text-primary" />
              </div>
              <span className="text-sm font-bold text-foreground">Passport built</span>
            </div>
            <span className={`text-[11px] font-bold uppercase tracking-wide ${strengthTextColor}`} style={{ fontFamily: MONO }}>
              {strengthLabel} · {strengthPct}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-2 rounded-full bg-border overflow-hidden mb-2.5">
            <div className={`h-full rounded-full transition-all ${strengthColor}`} style={{ width: `${strengthPct}%` }} />
          </div>
          {/* Status pills */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "Identity", ok: !!(p.name && p.email) },
              { label: "Financial", ok: !!(p.employment && p.income) },
              { label: "Rental history", ok: !!(p.currentAddress && p.timeAtAddress) },
              { label: "Income doc", ok: !!p.hasIncomeDoc },
              { label: "Credit report", ok: !!p.hasCreditDoc },
            ].map(({ label, ok }) => (
              <span key={label} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide border ${ok ? "bg-primary/8 border-primary/25 text-primary" : "bg-secondary/50 border-border text-muted-foreground/60"}`}>
                {ok ? <CheckCircle size={8} /> : <AlertCircle size={8} />} {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6 pb-16">

        {/* ── Passport card (compact) ─────────────────────────── */}
        <div className="rounded-2xl overflow-hidden shadow-md mb-5" style={{ background: "linear-gradient(145deg, #174B3A 0%, #1a5542 55%, #122f25 100%)" }}>
          <div className="relative px-5 pt-5 pb-4">
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 23px,rgba(255,255,255,1) 23px,rgba(255,255,255,1) 24px),repeating-linear-gradient(90deg,transparent,transparent 23px,rgba(255,255,255,1) 23px,rgba(255,255,255,1) 24px)" }} />
            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[7px] font-bold uppercase tracking-[0.22em] text-white/35" style={{ fontFamily: MONO }}>Rentre · Renter Passport</p>
                  <p className="text-[20px] font-bold text-white mt-0.5 leading-tight">{p.name}</p>
                  <p className="text-[10px] text-white/45 mt-0.5">{p.email}{p.phone ? ` · ${p.phone}` : ""}</p>
                </div>
                <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-white/70" style={{ fontFamily: MONO }}>R</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-x-4 gap-y-2.5 mb-4">
                {[
                  { k: "City", v: p.city },
                  { k: "Employment", v: p.employment || "—" },
                  { k: "Income", v: p.income ? `$${Number(p.income).toLocaleString()}/yr` : "—" },
                  { k: "Unit type", v: p.unitType || "—" },
                  { k: "Budget", v: p.budgetMax ? `$${Number(p.budgetMax).toLocaleString()}/mo` : "—" },
                  { k: "Move-in", v: p.moveIn || "—" },
                ].map(({ k, v }) => (
                  <div key={k}>
                    <p className="text-[7px] uppercase tracking-[0.18em] text-white/30" style={{ fontFamily: MONO }}>{k}</p>
                    <p className={`text-[11px] font-semibold mt-0.5 ${v === "—" ? "text-white/20" : "text-white/75"}`}>{v}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 border-t border-white/10 pt-3.5">
                {[
                  { label: "Income doc", ok: !!p.hasIncomeDoc },
                  { label: "Credit report", ok: !!p.hasCreditDoc },
                  { label: "Rental history", ok: !!p.currentAddress },
                  ...(p.applyingWithGuarantor ? [{ label: "Guarantor available", ok: true }] : []),
                ].map(({ label, ok }) => (
                  <span key={label} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide ${ok ? "bg-white/15 text-white/75" : "bg-white/5 text-white/20 border border-white/10"}`}>
                    {ok ? <CheckCircle size={7} /> : <X size={7} />} {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Documents ───────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden mb-4">
          <div className="px-5 py-3.5 border-b border-border bg-secondary/40 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-foreground">Documents on file</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{docsUploaded}/2 uploaded — included automatically when you send outreach</p>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${docsUploaded === 2 ? "bg-primary text-primary-foreground" : "bg-border text-muted-foreground"}`} style={{ fontFamily: MONO }}>
              {docsUploaded}/2
            </div>
          </div>
          <div className="divide-y divide-border">
            {[
              { label: "Proof of income", desc: "Pay stub, employment letter, or bank statement", ok: !!p.hasIncomeDoc },
              { label: "Credit report", desc: "Equifax, TransUnion, or Borrowell", ok: !!p.hasCreditDoc },
            ].map(({ label, desc, ok }) => (
              <div key={label} className="flex items-center gap-3 px-5 py-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ok ? "bg-primary/12 border border-primary/20" : "bg-secondary/60 border border-dashed border-border"}`}>
                  {ok ? <CheckCircle size={16} className="text-primary" /> : <FileText size={16} className="text-muted-foreground/40" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${ok ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{ok ? "Uploaded & ready to include" : desc}</p>
                </div>
                {ok
                  ? <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-primary"><CheckCircle size={8} /> Ready</span>
                  : <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-amber-600"><AlertCircle size={8} /> Missing</span>}
              </div>
            ))}
          </div>
          {docsUploaded === 2 && (
            <div className="px-5 py-3 bg-primary/5 border-t border-primary/15 flex items-center gap-2">
              <Shield size={12} className="text-primary shrink-0" />
              <p className="text-[10px] text-primary font-medium">Your package is complete — landlords will see a fully verified profile.</p>
            </div>
          )}
          {docsUploaded < 2 && (
            <div className="px-5 py-3 bg-amber-50/60 border-t border-amber-100 flex items-start gap-2">
              <Info size={12} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-700 leading-relaxed">Upload missing documents to strengthen your outreach — landlords respond significantly more to complete packages.</p>
            </div>
          )}
        </div>

        {/* ── Outreach card ───────────────────────────────────── */}
        <div className="mb-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2" style={{ fontFamily: MONO }}>Outreach</p>
          <div className="relative overflow-hidden rounded-2xl text-white mb-3"
            style={{ background: "linear-gradient(145deg, #174B3A 0%, #1a5542 55%, #122f25 100%)" }}>
            <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 0,transparent 24px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 0,transparent 24px)" }} />
            <div className="relative p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-[7px] font-bold uppercase tracking-[0.22em] text-white/40" style={{ fontFamily: MONO }}>Rentre · Outreach</p>
                <div className="flex items-center gap-2">
                  {strengthPct === 100
                    ? <span className="inline-flex items-center gap-1 rounded-full bg-white/20 border border-white/30 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white"><CheckCircle size={7} /> Complete</span>
                    : <span className="inline-flex items-center rounded-full bg-white/10 border border-white/20 px-2 py-0.5 text-[8px] font-bold text-white/60" style={{ fontFamily: MONO }}>{strengthPct}%</span>}
                  <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-black text-white/70" style={{ fontFamily: MONO }}>R</span>
                  </div>
                </div>
              </div>
              <p className="text-[19px] font-bold text-white leading-tight mb-0.5" style={{ fontFamily: DISPLAY }}>{p.name}</p>
              {p.email && <p className="text-[10px] text-white/35 mb-4" style={{ fontFamily: MONO }}>{p.email}{p.phone ? ` · ${p.phone}` : ""}</p>}
              <div className="grid grid-cols-2 gap-x-5 gap-y-3 mb-4">
                {[
                  { k: "Employment", v: p.employment },
                  { k: "Rent guarantee", v: (p as any).rentGuarantee || null },
                  { k: "Budget", v: p.budgetMax ? `$${Number(p.budgetMax).toLocaleString()}/mo` : null },
                  { k: "Looking for", v: p.unitType },
                  { k: "Move-in", v: p.moveIn },
                ].filter(r => r.v).map(({ k, v }) => (
                  <div key={k}>
                    <p className="text-[7px] uppercase tracking-[0.2em] text-white/30 mb-0.5" style={{ fontFamily: MONO }}>{k}</p>
                    <p className="text-[11px] font-semibold text-white">{v}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 pt-3 flex flex-wrap gap-1.5">
                {[{ label: "Income doc", ok: !!p.hasIncomeDoc }, { label: "Credit report", ok: !!p.hasCreditDoc }].map(({ label, ok }) => (
                  <span key={label} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-semibold border ${ok ? "bg-white/15 border-white/25 text-white/75" : "bg-white/5 border-white/10 text-white/25"}`}>
                    {ok ? <CheckCircle size={7} /> : <X size={7} />} {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button onClick={() => openModal("view")}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 active:scale-[0.99] transition-all">
            <Mail size={15} /> Request to View — Outreach Email with Documents
          </button>
        </div>

        {/* ── Offer card ──────────────────────────────────────── */}
        <div className="mb-6">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2" style={{ fontFamily: MONO }}>Offer</p>
          <div className="relative overflow-hidden rounded-2xl text-white mb-3"
            style={{ background: "linear-gradient(145deg, #1C2B3A 0%, #1e3248 55%, #111C27 100%)" }}>
            <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 0,transparent 24px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 0,transparent 24px)" }} />
            <div className="relative p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-[7px] font-bold uppercase tracking-[0.22em] text-white/40" style={{ fontFamily: MONO }}>Rentre · Offer to Lease</p>
                <div className="flex items-center gap-2">
                  {strengthPct === 100
                    ? <span className="inline-flex items-center gap-1 rounded-full bg-white/20 border border-white/30 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white"><CheckCircle size={7} /> Complete</span>
                    : <span className="inline-flex items-center rounded-full bg-white/10 border border-white/20 px-2 py-0.5 text-[8px] font-bold text-white/60" style={{ fontFamily: MONO }}>{strengthPct}%</span>}
                  <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-black text-white/70" style={{ fontFamily: MONO }}>R</span>
                  </div>
                </div>
              </div>
              <p className="text-[19px] font-bold text-white leading-tight mb-0.5" style={{ fontFamily: DISPLAY }}>{p.name}</p>
              {p.email && <p className="text-[10px] text-white/35 mb-4" style={{ fontFamily: MONO }}>{p.email}</p>}
              <div className="grid grid-cols-2 gap-x-5 gap-y-3 mb-4">
                {/* Editable offer amount */}
                <div>
                  <p className="text-[7px] uppercase tracking-[0.2em] text-white/30 mb-1" style={{ fontFamily: MONO }}>Gross base rent offer</p>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-white/40">$</span>
                    <input type="number" placeholder="0" value={offerAmount} onChange={e => setOfferAmount(e.target.value)}
                      className="w-full pl-5 pr-7 py-1.5 rounded-lg bg-white/10 border border-white/15 text-[11px] font-bold text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-white/30">/mo</span>
                  </div>
                </div>
                {/* Editable utilities */}
                <div>
                  <p className="text-[7px] uppercase tracking-[0.2em] text-white/30 mb-1" style={{ fontFamily: MONO }}>Utilities</p>
                  <div className="flex flex-col gap-1">
                    {["Tenant pays all", "Heat included", "All included"].map(opt => (
                      <button key={opt} onClick={() => setUtilitiesWho(opt === utilitiesWho ? "" : opt)}
                        className={`rounded-lg px-2 py-1 text-[9px] font-semibold text-left border transition-all ${opt === utilitiesWho ? "bg-white/20 border-white/30 text-white" : "bg-white/5 border-white/10 text-white/40 hover:text-white/65"}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[7px] uppercase tracking-[0.2em] text-white/30 mb-0.5" style={{ fontFamily: MONO }}>Profile</p>
                  <p className="text-[11px] font-semibold text-white">{strengthPct === 100 ? "Complete ✓" : `${strengthPct}% complete`}</p>
                </div>
                <div>
                  <p className="text-[7px] uppercase tracking-[0.2em] text-white/30 mb-0.5" style={{ fontFamily: MONO }}>Supporting docs</p>
                  <p className="text-[11px] font-semibold text-white">{[p.hasIncomeDoc && "Income", p.hasCreditDoc && "Credit"].filter(Boolean).join(" · ") || <span className="text-white/25">None</span>}</p>
                </div>
              </div>
              <div className="border-t border-white/10 pt-3 flex flex-col gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {[{ label: "Income doc", ok: !!p.hasIncomeDoc }, { label: "Credit report", ok: !!p.hasCreditDoc }].map(({ label, ok }) => (
                    <span key={label} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-semibold border ${ok ? "bg-white/15 border-white/25 text-white/75" : "bg-white/5 border-white/10 text-white/25"}`}>
                      {ok ? <CheckCircle size={7} /> : <X size={7} />} {label}
                    </span>
                  ))}
                </div>
                <button onClick={() => setDueDiligenceOptIn(v => !v)}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 border text-left transition-all ${dueDiligenceOptIn ? "bg-white/12 border-white/20" : "bg-white/5 border-white/10"}`}>
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${dueDiligenceOptIn ? "bg-white/80 border-white/80" : "border-white/30"}`}>
                    {dueDiligenceOptIn && <svg width="7" height="5" viewBox="0 0 7 5" fill="none"><path d="M1 2.5L2.5 4L6 1" stroke="#1C2B3A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                  <span className="text-[9px] font-medium text-white/60 leading-tight">Enrolled for landlord optional due-diligence</span>
                </button>
              </div>
            </div>
          </div>
          <button onClick={() => openModal("offer")}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-primary/35 bg-card px-5 py-3.5 text-sm font-bold text-foreground hover:bg-primary/5 hover:border-primary/50 active:scale-[0.99] transition-all">
            <ClipboardList size={15} className="text-primary" /> Request to Offer — Offer to Lease with Documents
          </button>
        </div>

        {/* ── Request to View bucket ──────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground" style={{ fontFamily: MONO }}>My Requests to View</p>
            <span className="text-[10px] font-semibold text-muted-foreground/60" style={{ fontFamily: MONO }}>{requests.length} sent</span>
          </div>

          {requests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-secondary/20 px-5 py-8 text-center">
              <Mail size={22} className="text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No requests sent yet</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">Use "Request to View" above to send your first outreach.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {requests.map(req => (
                <div key={req.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-start gap-3 px-4 py-3.5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${req.status === "responded" ? "bg-primary" : req.status === "viewed" ? "bg-amber-400" : "bg-border"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{req.address}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-muted-foreground">{req.landlord} · Sent {req.sentDate}</p>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide border ${
                          req.status === "responded" ? "bg-primary/8 border-primary/20 text-primary" :
                          req.status === "viewed" ? "bg-amber-50 border-amber-200 text-amber-600" :
                          "bg-secondary/60 border-border text-muted-foreground/60"
                        }`}>
                          {req.status === "responded" ? "Responded" : req.status === "viewed" ? "Viewed" : "Sent"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-border px-4 py-3 flex items-center justify-between bg-secondary/20">
                    <p className="text-[10px] text-muted-foreground">
                      {req.hasOffer ? "Offer sent" : "Ready to escalate?"}
                    </p>
                    <button
                      onClick={() => setRequests(prev => prev.map(r => r.id === req.id ? { ...r, hasOffer: true } : r))}
                      disabled={req.hasOffer}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${req.hasOffer ? "bg-primary/8 text-primary border border-primary/20 cursor-default" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
                      {req.hasOffer ? <><CheckCircle size={11} /> Offer sent</> : <><ClipboardList size={11} /> Request to Offer</>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Copy link ───────────────────────────────────────── */}
        <button onClick={copyLink}
          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all mb-4 ${linkCopied ? "border-primary/40 bg-primary/8" : "border-dashed border-border bg-secondary/20 hover:border-primary/30"}`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${linkCopied ? "bg-primary/15" : "bg-border/40"}`}>
            {linkCopied ? <CheckCircle size={14} className="text-primary" /> : <Copy size={14} className="text-muted-foreground" />}
          </div>
          <div className="text-left flex-1">
            <p className={`text-sm font-semibold leading-tight ${linkCopied ? "text-primary" : "text-muted-foreground"}`}>{linkCopied ? "Link copied!" : "Copy your passport link"}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">rentre.ca/passport/{(p.name || "you").toLowerCase().replace(/\s+/g, "-")}</p>
          </div>
        </button>

        {/* ── Coming soon ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: <Building size={15} />, title: "Buildings", desc: "Verified buildings matched to your preferences" },
            { icon: <Home size={15} />, title: "Listings", desc: "Curated listings matched to your needs" },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-dashed border-border bg-secondary/15 px-4 py-4 opacity-55">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">{icon}{title}</div>
                <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-700">Soon</span>
              </div>
              <p className="text-[10px] text-muted-foreground/70 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── CREATE SHARE LINK ────────────────────────────────────────────────────────

const SHARE_PACKAGE_ITEMS = [
  { id: "credit",    label: "Credit report",              desc: "Equifax / Borrowell — soft pull, no score impact", pkgKey: "equifaxFile" as keyof RenterPackage },
  { id: "paystub",   label: "Paystub / income",           desc: "Most recent pay stub",                            pkgKey: "paystubFile" as keyof RenterPackage },
  { id: "referral",  label: "Personal reference",         desc: "Reference phone number",                          pkgKey: "referralPhone" as keyof RenterPackage },
  { id: "landlord",  label: "Previous landlord reference",desc: "Prior landlord phone number",                     pkgKey: "landlordPhone" as keyof RenterPackage },
]

const KNOWN_PLATFORMS = [
  {
    id: "facebook",
    name: "Facebook Marketplace",
    domains: ["marketplace.facebook.com", "facebook.com/marketplace"],
    color: "#1877F2",
    bgColor: "#EBF3FF",
    borderColor: "#BFDBFE",
    textColor: "#1D4ED8",
    initial: "f",
  },
  {
    id: "rentals",
    name: "Rentals.ca",
    domains: ["rentals.ca"],
    color: "#E03A3A",
    bgColor: "#FEF2F2",
    borderColor: "#FECACA",
    textColor: "#B91C1C",
    initial: "R",
  },
  {
    id: "apartments",
    name: "Apartments.com",
    domains: ["apartments.com"],
    color: "#0057A8",
    bgColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    textColor: "#1E40AF",
    initial: "A",
  },
  {
    id: "rentfaster",
    name: "Rentfaster.ca",
    domains: ["rentfaster.ca"],
    color: "#16A34A",
    bgColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    textColor: "#15803D",
    initial: "rf",
  },
  {
    id: "condos",
    name: "Condos.ca",
    domains: ["condos.ca"],
    color: "#7C3AED",
    bgColor: "#F5F3FF",
    borderColor: "#DDD6FE",
    textColor: "#6D28D9",
    initial: "C",
  },
]

function detectPlatform(url: string) {
  if (!url.trim()) return null
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`)
    const host = parsed.hostname.replace("www.", "")
    return KNOWN_PLATFORMS.find(p => p.domains.some(d => host === d || host.endsWith("." + d))) ?? null
  } catch {
    return null
  }
}

// Mock scrape results per platform
const PLATFORM_SCRAPE_MOCKS: Record<string, { name: string; contact: string; contactType: "email" | "phone" | "none" }> = {
  facebook:   { name: "John D.",               contact: "",                       contactType: "none" },
  rentals:    { name: "Maria Chen",             contact: "maria@propmgmt.ca",      contactType: "email" },
  apartments: { name: "Skyline Properties",     contact: "(416) 555-0198",         contactType: "phone" },
  rentfaster: { name: "Rob K.",                 contact: "rob.k@gmail.com",        contactType: "email" },
  condos:     { name: "Condo Living Corp",      contact: "listings@condoliving.ca",contactType: "email" },
}

export function CreateShareLinkScreen({ pkg, onBack, onGoPackage }: {
  pkg: RenterPackage; onBack: () => void; onGoPackage: () => void
}) {
  const [step, setStep] = useState<"property" | "customize" | "link">("property")

  // Step 1 — listing URL
  const [listingUrl, setListingUrl]         = useState("")
  const [scrapeState, setScrapeState]       = useState<"idle" | "loading" | "done">("idle")
  const [llName, setLlName]                 = useState("")
  const [llContact, setLlContact]           = useState("")
  const [verifyLandlord, setVerifyLandlord] = useState(false)

  // Step 1 — property
  const [address, setAddress] = useState("")
  const [unitNum, setUnitNum] = useState("")

  const platform    = detectPlatform(listingUrl)
  const isFacebook  = platform?.id === "facebook"
  const canFetch    = listingUrl.trim().length > 0
  const canProceed  = scrapeState === "done" && listingUrl.trim()

  const handleFetch = () => {
    setScrapeState("loading")
    setLlName(""); setLlContact("")
    setTimeout(() => {
      const mock = platform ? (PLATFORM_SCRAPE_MOCKS[platform.id] ?? { name: "", contact: "", contactType: "none" }) : { name: "", contact: "", contactType: "none" }
      setLlName(mock.name)
      setLlContact(mock.contact)
      setVerifyLandlord(platform?.id === "facebook")
      setScrapeState("done")
    }, 1600)
  }

  const handleUrlChange = (val: string) => {
    setListingUrl(val)
    if (scrapeState !== "idle") { setScrapeState("idle"); setLlName(""); setLlContact("") }
  }

  // Step 2 — what to include
  const [included, setIncluded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SHARE_PACKAGE_ITEMS.map(i => [i.id, !!pkg[i.pkgKey]]))
  )
  const toggleInclude = (id: string) => setIncluded(s => ({ ...s, [id]: !s[id] }))

  // Step 3 — link
  const [copied, setCopied]     = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const shareUrl = `${window.location.origin}/share`
  const copy = () => { navigator.clipboard.writeText(shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) }) }

  const includedCount = Object.values(included).filter(Boolean).length
  const fullAddress = [address.trim(), unitNum.trim()].filter(Boolean).join(", ")

  const STEPS = ["property", "customize", "link"] as const
  const stepIdx = STEPS.indexOf(step)

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: BODY }}>

      {/* Nav */}
      <nav className="sticky top-0 z-20 flex items-center justify-between px-4 md:px-8 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <button onClick={onBack} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-foreground" style={{ fontFamily: DISPLAY }}>Apply outside Rentre</span>
        </div>
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s} className={`h-1.5 rounded-full transition-all ${i === stepIdx ? "w-6 bg-primary" : i < stepIdx ? "w-1.5 bg-primary/40" : "w-1.5 bg-border"}`} />
          ))}
        </div>
      </nav>

      <div className="max-w-md mx-auto px-4 py-8">

        {/* ── Step 1: Listing + property details ── */}
        {step === "property" && (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-1" style={{ fontFamily: MONO }}>Step 1 of 3</p>
              <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>Which listing?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">Paste the listing link and we{"'"}ll pull what we can about it.</p>
            </div>

            {/* URL input + Fetch */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5" style={{ fontFamily: MONO }}>
                Listing URL <span className="text-accent">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    autoFocus value={listingUrl} onChange={e => handleUrlChange(e.target.value)}
                    placeholder="Paste a link from any rental site"
                    className={`w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground transition-colors ${
                      scrapeState === "done" ? "border-primary/40" : "border-border focus:border-primary"
                    } ${listingUrl ? "pr-8" : ""}`}
                  />
                  {listingUrl && (
                    <button onClick={() => { handleUrlChange("") }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X size={13} />
                    </button>
                  )}
                </div>
                <button
                  disabled={!canFetch || scrapeState === "loading"}
                  onClick={handleFetch}
                  className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-35 disabled:cursor-not-allowed transition-all flex items-center gap-1.5">
                  {scrapeState === "loading"
                    ? <><span className="w-3.5 h-3.5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />Fetching…</>
                    : scrapeState === "done"
                    ? <><CheckCircle size={13} />Fetched</>
                    : "Fetch"}
                </button>
              </div>

              {/* Platform badge / support chips */}
              {platform ? (
                <div className="mt-2 flex items-center gap-2">
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold"
                    style={{ background: platform.bgColor, borderColor: platform.borderColor, color: platform.textColor }}>
                    <span className="w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-black text-white uppercase leading-none" style={{ background: platform.color }}>
                      {platform.initial}
                    </span>
                    {platform.name}
                  </div>
                  {scrapeState === "idle" && <span className="text-[11px] text-muted-foreground">→ hit Fetch to pull listing details</span>}
                </div>
              ) : listingUrl.trim() ? (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-secondary text-xs text-muted-foreground">
                  <AlertCircle size={12} />Unrecognized site — you can still continue
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {KNOWN_PLATFORMS.map(p => (
                    <span key={p.id} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border"
                      style={{ background: p.bgColor, borderColor: p.borderColor, color: p.textColor }}>
                      <span className="w-3 h-3 rounded-[2px] flex items-center justify-center text-[7px] font-black text-white uppercase leading-none" style={{ background: p.color }}>
                        {p.initial}
                      </span>
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── Scraped results to confirm ── */}
            {scrapeState === "done" && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/40">
                  <CheckCircle size={13} className="text-primary shrink-0" />
                  <p className="text-[11px] font-bold text-foreground uppercase tracking-widest" style={{ fontFamily: MONO }}>Listing details — confirm or edit</p>
                </div>
                <div className="p-4 flex flex-col gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5" style={{ fontFamily: MONO }}>
                      Landlord / poster name
                    </label>
                    <input
                      value={llName} onChange={e => setLlName(e.target.value)}
                      placeholder={isFacebook ? "Facebook hides full names — add if known" : "Not found — enter manually"}
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary transition-colors"
                    />
                    {isFacebook && !llName && (
                      <p className="mt-1 text-[10px] text-muted-foreground">Facebook only shows a partial name. You may not know who this is.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5" style={{ fontFamily: MONO }}>
                      Contact <span className="text-muted-foreground font-normal">(email or phone)</span>
                    </label>
                    <input
                      value={llContact} onChange={e => setLlContact(e.target.value)}
                      placeholder="Not found — enter if you have it"
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Property fields inline */}
                  <div className="h-px bg-border" />
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5" style={{ fontFamily: MONO }}>Street address <span className="text-muted-foreground font-normal">(optional)</span></label>
                      <input value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. 480 King St W" className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5" style={{ fontFamily: MONO }}>Unit</label>
                      <input value={unitNum} onChange={e => setUnitNum(e.target.value)} placeholder="e.g. 612" className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary transition-colors" />
                    </div>
                  </div>

                  {/* Verify landlord toggle */}
                  <div className="h-px bg-border" />
                  <div>
                    <button
                      onClick={() => setVerifyLandlord(v => !v)}
                      className={`w-full flex items-start gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                        verifyLandlord ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      }`}>
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${verifyLandlord ? "bg-primary border-primary" : "border-border"}`}>
                        {verifyLandlord && <CheckCircle size={13} className="text-primary-foreground" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-foreground">Request landlord identity verification</p>
                          {isFacebook
                            ? <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-700">Recommended</span>
                            : <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground">Optional</span>}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          {verifyLandlord
                            ? "The landlord will be asked to verify their identity before seeing your package."
                            : "Skip verification — landlord sees your package after ownership confirmation only."}
                        </p>
                      </div>
                    </button>

                    {/* Facebook-specific warning */}
                    {isFacebook && !verifyLandlord && (
                      <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5">
                        <AlertCircle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-800 leading-relaxed">Facebook listings carry a higher scam risk. We strongly recommend enabling landlord verification before sharing your package.</p>
                      </div>
                    )}
                    {isFacebook && verifyLandlord && (
                      <div className="mt-2 flex items-start gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2.5">
                        <CheckCircle size={13} className="text-green-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-green-800 leading-relaxed">Good call. Your package won{"'"}t be shown until the landlord verifies who they are.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              disabled={!canProceed}
              onClick={() => setStep("customize")}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3.5 text-sm font-bold hover:bg-primary/90 disabled:opacity-35 disabled:cursor-not-allowed transition-all">
              Next — customise package <ArrowRight size={15} />
            </button>
          </div>
        )}

        {/* ── Step 2: Customise package ── */}
        {step === "customize" && (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-1" style={{ fontFamily: MONO }}>Step 2 of 3</p>
              <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>What to share?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Choose what the landlord
                {fullAddress ? <> at <span className="font-medium text-foreground">{fullAddress}</span></> : platform ? <> from <span className="font-medium text-foreground">{platform.name}</span></> : " of this listing"}
                {" "}will see. You stay anonymous until they accept.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {SHARE_PACKAGE_ITEMS.map(item => {
                const hasPkg = !!pkg[item.pkgKey]
                const isOn = included[item.id]
                return (
                  <button
                    key={item.id}
                    onClick={() => hasPkg && toggleInclude(item.id)}
                    className={`flex items-center gap-3.5 rounded-2xl border-2 px-4 py-3.5 text-left transition-all ${
                      isOn && hasPkg ? "border-primary bg-primary/4" : hasPkg ? "border-border hover:border-primary/30" : "border-border opacity-50 cursor-not-allowed"
                    }`}>
                    {/* Toggle */}
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${isOn && hasPkg ? "bg-primary border-primary" : "border-border"}`}>
                      {isOn && hasPkg && <CheckCircle size={13} className="text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        {hasPkg
                          ? <span className="text-[10px] font-bold text-green-700 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded" style={{ fontFamily: MONO }}>In package</span>
                          : <span className="text-[10px] font-bold text-muted-foreground bg-secondary border border-border px-1.5 py-0.5 rounded" style={{ fontFamily: MONO }}>Missing</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Missing items prompt */}
            {SHARE_PACKAGE_ITEMS.some(i => !pkg[i.pkgKey]) && (
              <div className="flex items-start gap-2.5 rounded-xl border border-border bg-secondary/50 px-4 py-3">
                <AlertCircle size={13} className="text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Some items aren{"'"}t in your package yet.{" "}
                  <button onClick={onGoPackage} className="font-semibold text-primary hover:underline">Add them now →</button>
                </p>
              </div>
            )}

            {/* Privacy reminder */}
            <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <Lock size={13} className="text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-primary leading-relaxed">Your name and contact info stay hidden. The landlord sees qualifications only until they accept a viewing request through Rentre.</p>
            </div>

            <div className="flex gap-3 mt-1">
              <button onClick={() => setStep("property")} className="px-4 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">Back</button>
              <button
                disabled={includedCount === 0}
                onClick={() => setStep("link")}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 text-sm font-bold hover:bg-primary/90 disabled:opacity-35 disabled:cursor-not-allowed transition-all">
                Generate link <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Your link ── */}
        {step === "link" && (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-1" style={{ fontFamily: MONO }}>Step 3 of 3</p>
              <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>Your link is ready</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {platform
                  ? <>Linked to your <span className="font-medium text-foreground">{platform.name}</span> listing{fullAddress ? <> at <span className="font-medium text-foreground">{fullAddress}</span></> : ""}.</>
                  : fullAddress
                    ? <>Share this with the landlord at <span className="font-medium text-foreground">{fullAddress}</span>.</>
                    : "Share this link with the landlord."}
              </p>
            </div>

            {/* Source listing reference */}
            {listingUrl.trim() && (
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3">
                {platform ? (
                  <span
                    className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black text-white uppercase leading-none shrink-0"
                    style={{ background: platform.color }}>
                    {platform.initial}
                  </span>
                ) : <AlertCircle size={14} className="text-muted-foreground shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest" style={{ fontFamily: MONO }}>{platform?.name ?? "Listing"}</p>
                  <p className="text-xs text-foreground truncate">{listingUrl}</p>
                </div>
              </div>
            )}

            {/* Link card */}
            <div className="rounded-2xl border-2 border-primary/20 bg-primary/4 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2" style={{ fontFamily: MONO }}>Your package link</p>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 truncate rounded-xl border border-primary/20 bg-background px-3 py-2.5 text-xs text-muted-foreground select-all" style={{ fontFamily: MONO }}>
                  {shareUrl}
                </div>
                <button
                  onClick={copy}
                  className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${copied ? "bg-green-500/10 text-green-700 border border-green-500/20" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
                  {copied ? <><CheckCircle size={12} />Copied!</> : <>Copy link</>}
                </button>
              </div>

              {/* Package summary */}
              <div className="border-t border-primary/15 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/60 mb-2" style={{ fontFamily: MONO }}>Included in this link</p>
                <div className="flex flex-wrap gap-1.5">
                  {SHARE_PACKAGE_ITEMS.filter(i => included[i.id] && pkg[i.pkgKey]).map(i => (
                    <span key={i.id} className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/8 border border-primary/15 px-2 py-0.5 rounded-full">
                      <CheckCircle size={9} />{i.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Send by contact */}
            {llContact && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2" style={{ fontFamily: MONO }}>Send directly</p>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground truncate">{llName ? `${llName} · ` : ""}{llContact}</div>
                </div>
                {emailSent ? (
                  <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-2.5">
                    <CheckCircle size={13} className="text-green-600 shrink-0" />
                    <p className="text-sm font-semibold text-green-700">Link sent to {llName || llContact}</p>
                  </div>
                ) : (
                  <button onClick={() => setEmailSent(true)} className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/25 bg-card text-primary py-2.5 text-sm font-bold hover:bg-primary/5 transition-colors">
                    <Mail size={14} />Send to {llName || llContact}
                  </button>
                )}
              </div>
            )}

            {/* What landlord sees */}
            <div className="rounded-2xl border border-border bg-secondary/40 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <Eye size={13} className="text-muted-foreground shrink-0" />
                <p className="text-xs font-bold text-foreground">What the landlord sees</p>
              </div>
              <div className="px-4 py-3 flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-black text-muted-foreground shrink-0 w-4 mt-0.5" style={{ fontFamily: MONO }}>1</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">Confirm ownership of <span className="font-medium text-foreground">{unitNum ? `unit ${unitNum}` : "the unit"}</span> by uploading a property tax bill or utility bill.</p>
                </div>
                {verifyLandlord && (
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-black text-muted-foreground shrink-0 w-4 mt-0.5" style={{ fontFamily: MONO }}>2</span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed"><span className="font-medium text-foreground">Verify their identity</span> — government-issued ID required before your package is unlocked.</p>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-black text-muted-foreground shrink-0 w-4 mt-0.5" style={{ fontFamily: MONO }}>{verifyLandlord ? "3" : "2"}</span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">See your <span className="font-medium text-foreground">anonymized profile</span> — qualifications only, no personal identifiers until they accept.</p>
                </div>
              </div>
              {verifyLandlord && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/8 border-t border-green-500/20">
                  <CheckCircle size={11} className="text-green-600 shrink-0" />
                  <p className="text-[10px] font-semibold text-green-700">Landlord identity verification is on</p>
                </div>
              )}
            </div>

            {/* Expiry note */}
            <p className="text-center text-[10px] text-muted-foreground">This link is active for 30 days · <button onClick={() => setStep("property")} className="font-semibold text-primary hover:underline">Create another</button></p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── VIEWING REQUEST ───────────────────────────────────────────────────────────

// ─── Landlord availability slots (set by landlord/PM in portal) ───────────────

const LANDLORD_SLOTS = [
  { date: "Sat, Aug 30", dayShort: "Sat", dayNum: "30", month: "Aug", times: ["10:00 AM", "11:30 AM", "2:00 PM", "3:30 PM"] },
  { date: "Sun, Aug 31", dayShort: "Sun", dayNum: "31", month: "Aug", times: ["11:00 AM", "1:00 PM", "2:30 PM"] },
  { date: "Tue, Sep 2",  dayShort: "Tue", dayNum: "2",  month: "Sep", times: ["5:30 PM", "6:00 PM", "7:00 PM"] },
  { date: "Wed, Sep 3",  dayShort: "Wed", dayNum: "3",  month: "Sep", times: ["5:00 PM", "6:30 PM"] },
  { date: "Thu, Sep 4",  dayShort: "Thu", dayNum: "4",  month: "Sep", times: ["12:00 PM", "4:30 PM", "5:00 PM"] },
]

export function ViewingRequestScreen({ listingId, onComplete, pkg, onGoPackage }: { listingId: string; onComplete: () => void; pkg: RenterPackage; onGoPackage: () => void }) {
  const listing = MOCK_LISTINGS.find(l => l.id === listingId)!
  const [packageMode, setPackageMode] = useState<"choose" | "with" | "without">("choose")
  const [step, setStep] = useState(1)
  const TOTAL = 4
  const [idFile, setIdFile] = useState<string | null>(null)
  const [employer, setEmployer] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [annualIncome, setAnnualIncome] = useState("")
  const [incomeFile, setIncomeFile] = useState<string | null>(null)
  const [creditFile, setCreditFile] = useState<string | null>(null)
  const [refs, setRefs] = useState([{ name: "", phone: "", relation: "" }, { name: "", phone: "", relation: "" }])
  const [submitted, setSubmitted] = useState(false)
  const [slotConfirmed, setSlotConfirmed] = useState(false)
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const pkgComplete = [!!pkg.equifaxFile, !!pkg.paystubFile, !!pkg.referralPhone.trim(), !!pkg.landlordPhone.trim()].filter(Boolean).length
  const pkgFull = pkgComplete === 4

  const UploadField = ({ label, file, setFile, accept = ".pdf,.jpg,.png" }: { label: string; file: string | null; setFile: (v: string | null) => void; accept?: string }) => (
    <label className={`flex items-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${file ? "border-green-500/40 bg-green-500/5" : "border-border hover:border-foreground/25 bg-secondary/30"}`}>
      <input type="file" accept={accept} className="hidden" onChange={e => setFile(e.target.files?.[0]?.name || null)} />
      {file ? <CheckCircle size={16} className="text-green-600 shrink-0" /> : <Upload size={16} className="text-muted-foreground/50 shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-foreground">{label}</div>
        {file ? <div className="text-[10px] text-green-700 truncate mt-0.5">{file}</div> : <div className="text-[10px] text-muted-foreground mt-0.5">Click to upload · PDF, JPG, or PNG</div>}
      </div>
      {file && <button type="button" onClick={e => { e.preventDefault(); setFile(null) }} className="text-muted-foreground hover:text-red-500 shrink-0"><X size={12} /></button>}
    </label>
  )

  if (!slotConfirmed) {
    const activeTimes = LANDLORD_SLOTS.find(s => s.date === activeDate)?.times ?? []
    return (
      <div className="min-h-screen bg-background" style={{ fontFamily: BODY }}>
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={onComplete} className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><ChevronLeft size={20} className="text-foreground" /></button>
          <div>
            <div className="text-sm font-semibold text-foreground">Request a viewing</div>
            <div className="text-xs text-muted-foreground">{listing.address}</div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 pt-8 pb-32">
          <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>Pick a date &amp; time</h2>
          <p className="text-sm text-muted-foreground mb-8">Choose from the landlord&apos;s available slots below.</p>

          {/* Date strip */}
          <div className="mb-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Available dates</div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
              {LANDLORD_SLOTS.map(slot => {
                const isSelected = activeDate === slot.date
                return (
                  <button
                    key={slot.date}
                    onClick={() => { setActiveDate(slot.date); setSelectedTime(null) }}
                    className={`flex-none flex flex-col items-center rounded-2xl px-4 py-3 border-2 transition-all min-w-[72px] ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40 text-foreground"}`}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{slot.dayShort}</span>
                    <span className="text-2xl font-bold leading-tight mt-0.5">{slot.dayNum}</span>
                    <span className="text-[10px] font-medium opacity-70">{slot.month}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time slots */}
          {activeDate && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Available times</div>
              <div className="grid grid-cols-3 gap-2">
                {activeTimes.map(t => {
                  const isSelected = selectedTime === t
                  return (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40 text-foreground"}`}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {!activeDate && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                <Calendar size={20} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Select a date to see available times</p>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-4">
          <div className="max-w-lg mx-auto space-y-2">
            {activeDate && selectedTime && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20 mb-3">
                <CheckCircle size={14} className="text-primary shrink-0" />
                <span className="text-xs text-primary font-medium">{activeDate} at {selectedTime}</span>
              </div>
            )}
            <PrimaryButton
              onClick={() => setSlotConfirmed(true)}
              disabled={!(activeDate && selectedTime)}
              blockedReason={!activeDate ? "Pick a date first." : "Pick a time for that date."}
              fullWidth
            >
              Confirm time &amp; continue <ArrowRight size={15} />
            </PrimaryButton>
          </div>
        </div>
      </div>
    )
  }

  if (submitted) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 text-center" style={{ fontFamily: BODY }}>
      <div className="max-w-sm w-full">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6"><CheckCircle size={28} className="text-primary" /></div>
        <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: DISPLAY }}>Viewing requested</h2>
        <p className="text-sm text-muted-foreground mb-2">Your package has been sent to <span className="text-foreground font-medium">{listing.landlord}</span>.</p>
        {activeDate && selectedTime && (
          <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20 mb-4 text-xs text-primary font-medium">
            <Calendar size={12} />
            Requested for {activeDate} at {selectedTime}
          </div>
        )}
        <p className="text-xs text-muted-foreground mb-6">You{"'"}ll receive a confirmation once the landlord approves the time. Check your applications for updates.</p>
        <PrimaryButton onClick={onComplete} fullWidth>View my applications <ArrowRight size={15} /></PrimaryButton>
      </div>
    </div>
  )

  if (packageMode === "choose") return (
    <div className="min-h-screen px-4 py-12" style={{ fontFamily: BODY }}>
      <div className="max-w-md mx-auto">
        <div className="flex gap-3 p-3.5 rounded-xl bg-secondary border border-border mb-8">
          <div className="w-14 h-10 rounded-md overflow-hidden bg-muted shrink-0"><img src={listing.image} alt="" className="w-full h-full object-cover" /></div>
          <div className="min-w-0"><div className="text-sm font-semibold text-foreground truncate">{listing.address}</div><div className="text-xs text-muted-foreground">${listing.price.toLocaleString()}/mo · {listing.landlord}</div></div>
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>Request a viewing</h2>
        <p className="text-sm text-muted-foreground mb-6">How would you like to introduce yourself to this landlord?</p>

        <div className="flex flex-col gap-3">
          {/* With package */}
          <button
            onClick={() => setPackageMode("with")}
            className="flex items-start gap-4 p-5 rounded-2xl border-2 border-primary/30 bg-primary/5 hover:border-primary/60 text-left transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-all">
              <Package size={18} className="text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
                Send with my package
                {pkgFull && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold uppercase tracking-wide">Complete</span>}
                {!pkgFull && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold uppercase tracking-wide">{pkgComplete}/4 filled</span>}
              </div>
              <p className="text-xs text-muted-foreground">Attach your credit report, paystub, and references. Landlords respond faster to vetted tenants.</p>
              {!pkgFull && (
                <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-amber-700">
                  <AlertCircle size={11} />
                  Your package isn't complete — consider <button onClick={e => { e.stopPropagation(); onGoPackage() }} className="underline font-semibold hover:text-amber-800">finishing it</button> for the best results.
                </div>
              )}
            </div>
            <ArrowRight size={16} className="text-primary/50 shrink-0 mt-1" />
          </button>

          {/* Without package */}
          <button
            onClick={() => setPackageMode("without")}
            className="flex items-start gap-4 p-5 rounded-2xl border-2 border-border bg-card hover:border-foreground/20 text-left transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0 group-hover:bg-muted transition-all">
              <Mail size={18} className="text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-foreground mb-1">Continue without a package</div>
              <p className="text-xs text-muted-foreground">Express interest with a basic introduction. You can share documents later.</p>
              {pkgComplete === 0 && (
                <div className="mt-2.5 p-2 rounded-lg bg-amber-50 border border-amber-200/60 text-[10px] text-amber-700 flex items-start gap-1.5">
                  <AlertCircle size={11} className="shrink-0 mt-0.5" />
                  No package on file yet. Adding one takes under 5 minutes and dramatically increases response rates.
                </div>
              )}
            </div>
            <ArrowRight size={16} className="text-muted-foreground/40 shrink-0 mt-1" />
          </button>
        </div>

        <div className="mt-5 text-center">
          <button onClick={() => onGoPackage()} className="text-xs text-primary underline hover:text-primary/80 font-medium">
            {pkgFull ? "Review my package" : "Build or update my package"}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen px-4 py-10" style={{ fontFamily: BODY }}>
      <div className="max-w-md mx-auto">
        {/* Listing mini-card */}
        <div className="flex gap-3 p-3.5 rounded-xl bg-secondary border border-border mb-6">
          <div className="w-14 h-10 rounded-md overflow-hidden bg-muted shrink-0"><img src={listing.image} alt="" className="w-full h-full object-cover" /></div>
          <div className="min-w-0"><div className="text-sm font-semibold text-foreground truncate">{listing.address}</div><div className="text-xs text-muted-foreground">${listing.price.toLocaleString()}/mo · {listing.landlord}</div></div>
        </div>

        {/* Package mode indicator */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs mb-5 ${packageMode === "with" ? "bg-primary/8 border border-primary/20 text-primary" : "bg-secondary border border-border text-muted-foreground"}`}>
          {packageMode === "with" ? <><Package size={12} />Sending with your package</> : <><Mail size={12} />Sending without a package</>}
          <button onClick={() => setPackageMode("choose")} className="ml-auto underline text-[10px] opacity-70 hover:opacity-100">Change</button>
        </div>

        {/* Step labels */}
        <div className="flex items-center gap-0 mb-7">
          {["Identity", "Financial", "References", "Review"].map((label, i) => {
            const n = i + 1
            return (
              <div key={label} className="flex items-center gap-0 flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${n < step ? "bg-primary text-primary-foreground" : n === step ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : "bg-secondary border border-border text-muted-foreground"}`}>
                    {n < step ? <CheckCircle size={12} /> : n}
                  </div>
                  <span className={`text-[9px] font-medium uppercase tracking-wide ${n === step ? "text-primary" : "text-muted-foreground/60"}`}>{label}</span>
                </div>
                {n < TOTAL && <div className={`h-0.5 flex-1 mb-4 transition-all ${n < step ? "bg-primary" : "bg-border"}`} />}
              </div>
            )
          })}
        </div>

        {/* Step 1 — Identity + Employment */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>Identity & employment</h3>
              <p className="text-sm text-muted-foreground">Upload a government-issued photo ID and your employment info.</p>
            </div>
            <UploadField label="Government-issued photo ID" file={idFile} setFile={setIdFile} accept=".jpg,.png,.pdf" />
            <FormInput label="Employer / company" placeholder="Acme Corp" value={employer} onChange={setEmployer} />
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Job title" placeholder="Software Engineer" value={jobTitle} onChange={setJobTitle} />
              <FormInput label="Annual income" placeholder="80,000" value={annualIncome} onChange={setAnnualIncome} prefix="$" />
            </div>
            <PrimaryButton onClick={() => setStep(2)} disabled={!idFile || !employer || !annualIncome} fullWidth>Continue <ArrowRight size={15} /></PrimaryButton>
          </div>
        )}

        {/* Step 2 — Financial docs */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>Financial documents</h3>
              <p className="text-sm text-muted-foreground">Income verification and credit/background package.</p>
            </div>
            <UploadField label="Income documentation" file={incomeFile} setFile={setIncomeFile} accept=".pdf" />
            <p className="text-[10px] text-muted-foreground -mt-3">Pay stubs, T4 slips, NOA, or bank statements (last 3 months).</p>
            <UploadField label="Credit & background package" file={creditFile} setFile={setCreditFile} accept=".pdf" />
            <p className="text-[10px] text-muted-foreground -mt-3">Equifax, TransUnion, or Borrowell report. We perform a soft pull — no impact to your score.</p>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-4 py-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground">Back</button>
              <PrimaryButton onClick={() => setStep(3)} disabled={!incomeFile || !creditFile} fullWidth>Continue <ArrowRight size={15} /></PrimaryButton>
            </div>
          </div>
        )}

        {/* Step 3 — References */}
        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>References</h3>
              <p className="text-sm text-muted-foreground">Provide two references — a previous landlord and an employer or personal contact.</p>
            </div>
            {refs.map((ref, i) => (
              <div key={i} className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-card">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reference {i + 1}</div>
                <FormInput label="Full name" placeholder="Jane Smith" value={ref.name} onChange={v => setRefs(r => r.map((x, j) => j === i ? { ...x, name: v } : x))} />
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label="Phone" placeholder="647-555-0100" value={ref.phone} onChange={v => setRefs(r => r.map((x, j) => j === i ? { ...x, phone: v } : x))} />
                  <FormInput label="Relationship" placeholder="Previous landlord" value={ref.relation} onChange={v => setRefs(r => r.map((x, j) => j === i ? { ...x, relation: v } : x))} />
                </div>
              </div>
            ))}
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-4 py-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground">Back</button>
              <PrimaryButton onClick={() => setStep(4)} disabled={!refs[0].name || !refs[0].phone} fullWidth>Review & send <ArrowRight size={15} /></PrimaryButton>
            </div>
          </div>
        )}

        {/* Step 4 — Review */}
        {step === 4 && (
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>Review your package</h3>
              <p className="text-sm text-muted-foreground">This is sent to the landlord to schedule your viewing.</p>
            </div>
            {activeDate && selectedTime && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-primary font-medium">
                <Calendar size={13} className="shrink-0" />
                Requested viewing: {activeDate} at {selectedTime}
              </div>
            )}
            <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
              {[
                { label: "ID", value: idFile || "—", ok: !!idFile },
                { label: "Employer", value: employer || "—", ok: !!employer },
                { label: "Annual income", value: annualIncome ? `$${parseInt(annualIncome).toLocaleString()}` : "—", ok: !!annualIncome },
                { label: "Income docs", value: incomeFile || "—", ok: !!incomeFile },
                { label: "Credit package", value: creditFile || "—", ok: !!creditFile },
                { label: "References", value: `${refs.filter(r => r.name).length} provided`, ok: refs.filter(r => r.name).length > 0 },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3 px-5 py-3.5">
                  {row.ok ? <CheckCircle size={14} className="text-primary shrink-0" /> : <AlertCircle size={14} className="text-amber-500 shrink-0" />}
                  <span className="text-sm text-muted-foreground w-28 shrink-0">{row.label}</span>
                  <span className="text-sm text-foreground font-medium truncate">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-xl border border-border bg-secondary/40 text-xs text-muted-foreground">
              <Lock size={11} className="inline mr-1.5 mb-0.5 text-primary/60" />
              Your documents are encrypted and shared only with this landlord. rentre creates an AI summary of your profile — you{"'"}ll receive a copy.
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="px-4 py-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground">Back</button>
              <PrimaryButton onClick={() => setSubmitted(true)} fullWidth><Send size={14} /> Send viewing request</PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── OFFER REVIEW (TENANT) ────────────────────────────────────────────────────

export function OfferReviewScreen({ listing, offer, onAccept, onDecline }: {
  listing: typeof MOCK_LISTINGS[0]; offer: { price: number; term: string; concessions: string }
  onAccept: () => void; onDecline: () => void
}) {
  const [confirmed, setConfirmed] = useState(false)
  return (
    <div className="min-h-screen px-4 py-12" style={{ fontFamily: BODY }}>
      <div className="max-w-md mx-auto">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
          <FileText size={18} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>Landlord offer</h2>
        <p className="text-sm text-muted-foreground mb-6">{listing.landlord} has made you an offer for <span className="text-foreground font-medium">{listing.address}</span>.</p>

        <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 mb-5">
          <div className="text-[10px] font-bold text-primary/70 uppercase tracking-widest mb-4">Offer terms</div>
          <div className="flex flex-col gap-3">
            {[
              { label: "Monthly rent", value: `$${offer.price.toLocaleString()}/mo`, highlight: true },
              { label: "Lease term", value: offer.term },
              { label: "Concessions", value: offer.concessions || "None" },
              { label: "Unit", value: `${listing.address}${listing.unit ? ", " + listing.unit : ""}` },
              { label: "Move-in", value: listing.moveIn },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <span className={`text-sm font-semibold ${row.highlight ? "text-primary" : "text-foreground"}`} style={{ fontFamily: row.highlight ? MONO : BODY }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 mb-6">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Lease summary (autofilled)</div>
          <p className="text-xs text-muted-foreground leading-relaxed">Ontario Standard Lease · {listing.address}{listing.unit ? `, ${listing.unit}` : ""} · ${offer.price.toLocaleString()}/mo · {offer.term}{offer.concessions ? ` · Concession: ${offer.concessions}` : ""}. Tenant rights under the <span className="text-foreground">Residential Tenancies Act</span> apply.</p>
        </div>

        <AmenityCheckbox label="I have reviewed the offer terms and agree to proceed to payment." checked={confirmed} onChange={setConfirmed} />

        <div className="flex gap-3 mt-5">
          <button onClick={onDecline} className="flex-1 px-4 py-3 rounded-xl border-2 border-border text-sm font-medium text-muted-foreground hover:border-red-300 hover:text-red-600 transition-all">Decline</button>
          <PrimaryButton onClick={onAccept} disabled={!confirmed} fullWidth>Accept & pay first month <ArrowRight size={15} /></PrimaryButton>
        </div>
        <p className="text-center text-xs text-muted-foreground/40 mt-3">Accepting triggers a 1-month rent payment through Rentre.</p>
      </div>
    </div>
  )
}

// ─── PAYMENT SCREEN ───────────────────────────────────────────────────────────

function formatCardNumber(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim()
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4)
  return d.length > 2 ? d.slice(0, 2) + " / " + d.slice(2) : d
}

export function PaymentScreen({ listing, onComplete }: { listing: typeof MOCK_LISTINGS[0]; onComplete: () => void }) {
  const [paid, setPaid] = useState(false)
  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvv, setCvv] = useState("")
  const [saveCard, setSaveCard] = useState(true)
  const [useSaved, setUseSaved] = useState(true)
  const [processing, setProcessing] = useState(false)

  const rent = listing.price
  const platformFee = Math.round(rent * 0.10) + 250
  const landlordReceives = rent - platformFee

  const cardValid = useSaved || (cardNumber.replace(/\s/g, "").length === 16 && cardName.trim().length > 1 && expiry.replace(/\s/g, "").length === 5 && cvv.length >= 3)

  const handlePay = () => {
    if (!cardValid) return
    setProcessing(true)
    setTimeout(() => { setProcessing(false); setPaid(true) }, 1800)
  }

  const cardBrand = (n: string) => {
    const d = n.replace(/\s/g, "")
    if (d.startsWith("4")) return "VISA"
    if (d.startsWith("5") || d.startsWith("2")) return "MC"
    if (d.startsWith("34") || d.startsWith("37")) return "AMEX"
    return null
  }
  const brand = useSaved ? "VISA" : cardBrand(cardNumber)

  if (paid) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ fontFamily: BODY }}>
      <div className="max-w-sm w-full">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6"><CheckCircle size={28} className="text-green-600" /></div>
        <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: DISPLAY }}>Payment confirmed</h2>
        <p className="text-sm text-muted-foreground mb-1">1 month{"'"}s rent processed for {listing.address}.</p>
        <p className="text-xs text-muted-foreground mb-6">The landlord has been notified. You{"'"}ll receive your tenant summary and the signed lease by email.</p>
        <PrimaryButton onClick={onComplete} fullWidth>View my tenant summary <ArrowRight size={15} /></PrimaryButton>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen px-4 py-12" style={{ fontFamily: BODY }}>
      <div className="max-w-md mx-auto">
        <div className="w-10 h-10 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-6">
          <KeyRound size={18} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>First month{"'"}s rent</h2>
        <p className="text-sm text-muted-foreground mb-6">Paying through the platform holds the unit and activates your lease.</p>

        {/* Payment breakdown */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden mb-5">
          <div className="px-5 py-4 border-b border-border flex justify-between items-center">
            <span className="text-sm text-foreground">First month{"'"}s rent</span>
            <span className="text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>${rent.toLocaleString()}</span>
          </div>
          <div className="px-5 py-3.5 bg-secondary/30 border-b border-border flex flex-col gap-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Landlord receives</span>
              <span style={{ fontFamily: MONO }}>${landlordReceives.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Platform fee (10% + $250)</span>
              <span style={{ fontFamily: MONO }}>${platformFee.toLocaleString()}</span>
            </div>
          </div>
          <div className="px-5 py-4 flex justify-between items-center">
            <span className="text-sm font-semibold text-foreground">Total charged to card</span>
            <span className="text-xl font-bold text-foreground" style={{ fontFamily: MONO }}>${rent.toLocaleString()}</span>
          </div>
        </div>

        {/* Card UI */}
        <div className="rounded-xl border border-border bg-card overflow-hidden mb-5">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Credit card</span>
            <div className="flex items-center gap-1.5">
              {["VISA","MC","AMEX"].map(b => (
                <span key={b} className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition-opacity ${brand === b ? "border-primary/30 bg-primary/10 text-primary opacity-100" : "border-border text-muted-foreground opacity-40"}`}>{b}</span>
              ))}
            </div>
          </div>

          <div className="px-5 py-4 flex flex-col gap-3">
            {/* Saved card option */}
            <button onClick={() => setUseSaved(true)}
              className={`flex items-center gap-3 p-3.5 rounded-lg border-2 transition-all text-left ${useSaved ? "border-primary/40 bg-primary/5" : "border-border hover:border-foreground/20"}`}>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${useSaved ? "border-primary" : "border-border"}`}>
                {useSaved && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div className="flex items-center gap-2 flex-1">
                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-primary/15 text-primary">VISA</span>
                <span className="text-sm text-foreground" style={{ fontFamily: MONO }}>•••• •••• •••• 4242</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Saved</span>
            </button>

            {/* New card option */}
            <button onClick={() => setUseSaved(false)}
              className={`flex items-center gap-3 p-3.5 rounded-lg border-2 transition-all text-left ${!useSaved ? "border-primary/40 bg-primary/5" : "border-border hover:border-foreground/20"}`}>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${!useSaved ? "border-primary" : "border-border"}`}>
                {!useSaved && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <span className="text-sm text-muted-foreground">Use a different card</span>
            </button>

            {/* New card fields */}
            {!useSaved && (
              <div className="flex flex-col gap-3 pt-1">
                {/* Card number */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Card number</label>
                  <div className="relative">
                    <input
                      type="text" inputMode="numeric" placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-md border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 pr-14"
                      style={{ fontFamily: MONO, letterSpacing: "0.05em" }}
                    />
                    {brand && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">{brand}</span>
                    )}
                  </div>
                </div>
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Name on card</label>
                  <input
                    type="text" placeholder="Jane Smith"
                    value={cardName} onChange={e => setCardName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-md border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                {/* Expiry + CVV */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Expiry</label>
                    <input
                      type="text" inputMode="numeric" placeholder="MM / YY"
                      value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-md border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      style={{ fontFamily: MONO }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">CVV</label>
                    <input
                      type="password" inputMode="numeric" placeholder="•••"
                      value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="w-full px-3 py-2.5 rounded-md border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      style={{ fontFamily: MONO }}
                    />
                  </div>
                </div>
                {/* Save card toggle */}
                <button onClick={() => setSaveCard(v => !v)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${saveCard ? "border-primary bg-primary" : "border-border"}`}>
                    {saveCard && <CheckCircle size={10} className="text-white" />}
                  </div>
                  Save card for future payments
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Security note */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-5">
          <Lock size={11} className="shrink-0" />
          256-bit SSL encryption · PCI DSS compliant · Funds held in escrow until landlord countersigns.
        </div>

        <PrimaryButton onClick={handlePay} disabled={!cardValid || processing} fullWidth>
          {processing ? (
            <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Processing…</span>
          ) : (
            <><Lock size={14} />Pay ${rent.toLocaleString()} securely</>
          )}
        </PrimaryButton>
      </div>
    </div>
  )
}

// ─── TENANT SUMMARY ───────────────────────────────────────────────────────────

export function TenantSummaryScreen({ profile, onDone }: { profile: UserProfile; onDone: () => void }) {
  return (
    <div className="min-h-screen px-4 py-12" style={{ fontFamily: BODY }}>
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <UserCheck size={18} className="text-primary" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Rentre · AI-generated</div>
            <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: DISPLAY }}>Your tenant summary</h2>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden mb-5">
          <div className="px-5 py-4 border-b border-border bg-secondary/30">
            <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Profile overview</div>
          </div>
          <div className="px-5 py-5">
            <p className="text-sm text-foreground leading-relaxed mb-4">
              <span className="font-semibold">{profile.name || "Prospective tenant"}</span> is a verified renter based in {profile.city || "Toronto"} seeking a {profile.unitType ? profile.unitType.replace("-", " ") : "rental"} with a maximum budget of {profile.budgetMax ? `$${parseInt(profile.budgetMax).toLocaleString()}/mo` : "not specified"}. Their rental profile has been verified through Rentre.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["ID verified", "Income confirmed", "Credit checked", "References provided"].map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-semibold text-green-700">
                  <CheckCircle size={9} /> {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden mb-5">
          {[
            { label: "Preferred city", value: profile.city || "—" },
            { label: "Unit type", value: profile.unitType || "—" },
            { label: "Max budget (rent only)", value: profile.budgetMax ? `$${parseInt(profile.budgetMax).toLocaleString()}/mo` : "—" },
            { label: "Top priorities", value: profile.priorities.length > 0 ? profile.priorities.join(", ") : "—" },
            { label: "Must-have amenities", value: profile.amenities.length > 0 ? `${profile.amenities.length} selected` : "—" },
          ].map(row => (
            <div key={row.label} className="flex justify-between items-center px-5 py-3.5">
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span className="text-sm font-medium text-foreground">{row.value}</span>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl border border-border bg-secondary/40 text-xs text-muted-foreground mb-6 flex gap-2">
          <Mail size={12} className="shrink-0 mt-0.5 text-primary/60" />
          This summary has been sent to your email ({profile.email || "on file"}). A copy was shared with the landlord as part of your signed lease package.
        </div>

        <PrimaryButton onClick={onDone} fullWidth>Go to my applications <ArrowRight size={15} /></PrimaryButton>
      </div>
    </div>
  )
}

// ─── MY APPLICATIONS ──────────────────────────────────────────────────────────

const MOCK_THREADS: Record<string, { from: "tenant" | "landlord"; text: string; time: string }[]> = {
  "a1": [
    { from: "landlord", text: "Hi! Thanks for applying to 592 Sherbourne. Your profile looks great — are you available for a viewing this weekend?", time: "2d ago" },
    { from: "tenant", text: "Hi! Yes, Saturday afternoon works perfectly for me — any time after 1 PM.", time: "2d ago" },
    { from: "landlord", text: "Saturday at 2 PM works. I'll meet you in the lobby. Looking forward to it!", time: "1d ago" },
  ],
  "a2": [
    { from: "landlord", text: "Thank you for your application to 15 Queens Quay. Your package looks strong — we're reviewing a few others and will be in touch by end of week.", time: "5d ago" },
  ],
  "a3": [],
}

export function MyApplicationsScreen({ onViewOffer }: { onViewOffer?: () => void }) {
  const [openThread, setOpenThread] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [sent, setSent] = useState<Record<string, { from: "tenant"; text: string; time: string }[]>>({})

  const getThread = (id: string) => [
    ...(MOCK_THREADS[id] || []),
    ...(sent[id] || []),
  ]

  const sendMessage = (app: typeof MOCK_APPLICATIONS[0]) => {
    const text = drafts[app.id]?.trim()
    if (!text) return
    setSent(s => ({ ...s, [app.id]: [...(s[app.id] || []), { from: "tenant", text, time: "just now" }] }))
    setDrafts(d => ({ ...d, [app.id]: "" }))
  }

  return (
    <div className="min-h-screen px-4 py-10" style={{ fontFamily: BODY }}>
      <div className="max-w-lg mx-auto">

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>My applications</h2>
          <p className="text-sm text-muted-foreground">
            {MOCK_APPLICATIONS.length} total · {MOCK_APPLICATIONS.filter(a => ["reviewing", "interview"].includes(a.status)).length} active
          </p>
        </div>

        {/* Offer alert */}
        {onViewOffer && (
          <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-primary/30 bg-primary/5 mb-5">
            <FileText size={16} className="text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground mb-0.5">Landlord offer received</div>
              <p className="text-xs text-muted-foreground">592 Sherbourne St · $2,150/mo · First month free</p>
            </div>
            <button onClick={onViewOffer} className="shrink-0 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 whitespace-nowrap">
              Review offer
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {MOCK_APPLICATIONS.map(app => {
            const thread = getThread(app.id)
            const isOpen = openThread === app.id
            const landlordCount = (MOCK_THREADS[app.id] || []).filter(m => m.from === "landlord").length

            return (
              <div key={app.id} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">

                {/* Card header */}
                <div className="flex gap-4 p-4">
                  <div className="w-20 h-16 rounded-xl overflow-hidden bg-secondary shrink-0">
                    <img src={app.image} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-foreground truncate">{app.address}</p>
                      <StatusBadge status={app.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mb-1.5">{app.landlord} · Applied {app.appliedDays}d ago</p>
                    <p className="text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>${app.price.toLocaleString()}/mo</p>
                  </div>
                </div>

                {/* Interview nudge */}
                {app.status === "interview" && !isOpen && (
                  <div className="border-t border-border bg-purple-500/5 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-purple-700">
                      <PhoneCall size={12} />Landlord requested a viewing time
                    </div>
                    <button onClick={() => setOpenThread(app.id)} className="text-xs font-semibold text-purple-700 hover:underline">
                      Reply →
                    </button>
                  </div>
                )}

                {/* Message toggle bar */}
                <button
                  onClick={() => setOpenThread(isOpen ? null : app.id)}
                  className="w-full flex items-center justify-between px-4 py-3 border-t border-border hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Mail size={12} />
                    {thread.length > 0 ? (
                      <span className="flex items-center gap-1.5">
                        {thread.length} message{thread.length !== 1 ? "s" : ""}
                        {landlordCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold leading-none">
                            {landlordCount} from landlord
                          </span>
                        )}
                      </span>
                    ) : (
                      <span>No messages yet — start the conversation</span>
                    )}
                  </div>
                  <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Expanded thread */}
                {isOpen && (
                  <div className="border-t border-border">
                    {/* Messages */}
                    <div
                      className="px-4 py-4 space-y-3 min-h-[80px] max-h-72 overflow-y-auto"
                      style={{ scrollbarWidth: "none", background: "var(--secondary)" }}
                    >
                      {thread.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                          <div className="w-10 h-10 rounded-full bg-border/60 flex items-center justify-center">
                            <Mail size={17} className="text-muted-foreground/50" />
                          </div>
                          <p className="text-xs text-muted-foreground text-center">
                            No messages yet. Introduce yourself to <strong>{app.landlord}</strong>.
                          </p>
                        </div>
                      ) : (
                        thread.map((msg, i) => {
                          const isMe = msg.from === "tenant"
                          return (
                            <div key={i} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                              {!isMe && (
                                <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 mb-0.5">
                                  <Building size={12} className="text-primary" />
                                </div>
                              )}
                              <div className={`max-w-[78%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                                <div className={`rounded-2xl px-3.5 py-2.5 ${isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border text-foreground rounded-bl-sm shadow-sm"}`}>
                                  <p className="text-xs leading-relaxed">{msg.text}</p>
                                </div>
                                <p className="text-[9px] text-muted-foreground px-1">{msg.time}</p>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>

                    {/* Compose bar */}
                    <div className="px-4 py-3 border-t border-border bg-card flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`Message ${app.landlord}…`}
                        value={drafts[app.id] || ""}
                        onChange={e => setDrafts(d => ({ ...d, [app.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter") sendMessage(app) }}
                        className="flex-1 px-3 py-2 rounded-xl border border-border bg-input-background text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                      />
                      <button
                        onClick={() => sendMessage(app)}
                        disabled={!drafts[app.id]?.trim()}
                        className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-30 shrink-0 active:scale-95"
                      >
                        <Send size={13} />
                      </button>
                    </div>
                    <p className="text-[9px] text-muted-foreground text-center pb-2.5 bg-card">
                      Delivered via your preferred notification channel
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── LANDLORD PORTAL ──────────────────────────────────────────────────────────

interface ExternalLease { id: string; building: string; unit: string; tenant: string; rent: string; startDate: string; endDate: string; leaseFileName?: string }

interface BuildingLease { id: string; building: string; unit: string; tenant: string; rent: number; leaseStart: string; leaseEnd: string | null; noticeDueMs: number }

function leaseNoticeStatus(lease: BuildingLease): { urgent: boolean; label: string; color: string; daysLabel: string } {
  if (!lease.leaseEnd) return { urgent: false, label: "Vacant", color: "text-muted-foreground", daysLabel: "" }
  const now = Date.now()
  const daysUntilNotice = Math.round((lease.noticeDueMs - now) / 86400000)
  if (daysUntilNotice < 0) return { urgent: true, label: "Notice overdue", color: "text-red-600", daysLabel: `${Math.abs(daysUntilNotice)}d overdue` }
  if (daysUntilNotice <= 14) return { urgent: true, label: "Notice due soon", color: "text-red-600", daysLabel: `in ${daysUntilNotice}d` }
  if (daysUntilNotice <= 30) return { urgent: false, label: "Notice upcoming", color: "text-amber-600", daysLabel: `in ${daysUntilNotice}d` }
  return { urgent: false, label: "On track", color: "text-green-600", daysLabel: `in ${daysUntilNotice}d` }
}

const MOCK_BUILDING_LEASES: BuildingLease[] = [
  { id: "bl1", building: "480 King St W", unit: "Loft 612", tenant: "Priya Sharma", rent: 2850, leaseStart: "Jul 1, 2025", leaseEnd: "Jun 30, 2026", noticeDueMs: new Date("2026-04-30").getTime() },
  { id: "bl2", building: "480 King St W", unit: "Unit 503", tenant: "David Nguen", rent: 2600, leaseStart: "Sep 1, 2025", leaseEnd: "Aug 31, 2026", noticeDueMs: new Date("2026-07-02").getTime() },
  { id: "bl3", building: "15 Queens Quay W", unit: "2201", tenant: "Jordan Lee", rent: 3400, leaseStart: "Sep 1, 2025", leaseEnd: "Aug 31, 2026", noticeDueMs: new Date("2026-07-02").getTime() },
  { id: "bl4", building: "15 Queens Quay W", unit: "1105", tenant: "", rent: 0, leaseStart: "", leaseEnd: null, noticeDueMs: 0 },
  { id: "bl5", building: "592 Sherbourne St", unit: "Unit 1204", tenant: "Alex Kowalski", rent: 2150, leaseStart: "Oct 1, 2025", leaseEnd: "Sep 30, 2026", noticeDueMs: new Date("2026-08-01").getTime() },
]

interface CRMProspect { id: string; name: string; email: string; unit: string; stage: "inquiry" | "showing" | "applied" | "offer" | "lease-signed" | "declined"; date: string }

const MOCK_CRM_PROSPECTS: CRMProspect[] = [
  { id: "c1", name: "Amara Osei", email: "amara@email.com", unit: "592 Sherbourne St, 1204", stage: "inquiry", date: "Aug 20" },
  { id: "c2", name: "Ben Tremblay", email: "ben.t@email.com", unit: "592 Sherbourne St, 1204", stage: "showing", date: "Aug 21" },
  { id: "c3", name: "Celine Roy", email: "croy@email.com", unit: "592 Sherbourne St, 1204", stage: "applied", date: "Aug 22" },
  { id: "c4", name: "Priya Sharma", email: "priya@email.com", unit: "480 King St W, Loft 612", stage: "lease-signed", date: "Jul 1" },
  { id: "c5", name: "Marcus Webb", email: "marcus@email.com", unit: "1185 Eglinton Ave W, 301", stage: "declined", date: "Aug 10" },
  { id: "c6", name: "Fatima Al-Rashid", email: "fatima@email.com", unit: "1185 Eglinton Ave W, 301", stage: "offer", date: "Aug 23" },
]

export function LandlordCRMScreen({ onBack }: { onBack: () => void }) {
  const stages: CRMProspect["stage"][] = ["inquiry", "showing", "applied", "offer", "lease-signed", "declined"]
  const stageLabel: Record<CRMProspect["stage"], string> = { inquiry: "Inquiry", showing: "Showing", applied: "Applied", offer: "Offer", "lease-signed": "Signed", declined: "Declined" }
  const stageColor: Record<CRMProspect["stage"], string> = {
    inquiry: "bg-sky-500/10 border-sky-500/20 text-sky-700",
    showing: "bg-violet-500/10 border-violet-500/20 text-violet-700",
    applied: "bg-amber-500/10 border-amber-500/20 text-amber-700",
    offer: "bg-orange-500/10 border-orange-500/20 text-orange-700",
    "lease-signed": "bg-green-500/10 border-green-500/20 text-green-700",
    declined: "bg-red-500/10 border-red-500/20 text-red-700",
  }
  const active = MOCK_CRM_PROSPECTS.filter(p => p.stage !== "declined" && p.stage !== "lease-signed")
  const closed = MOCK_CRM_PROSPECTS.filter(p => p.stage === "declined" || p.stage === "lease-signed")
  return (
    <div className="min-h-screen pb-16" style={{ fontFamily: BODY }}>
      <div className="px-4 md:px-8 pt-8 pb-4 border-b border-border bg-card">
        <div className="max-w-2xl mx-auto">
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ChevronLeft size={14} />Back to portal
          </button>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: DISPLAY }}>Prospect CRM</h2>
          <p className="text-sm text-muted-foreground mt-1">{active.length} active · {closed.length} closed</p>
        </div>
      </div>
      <div className="px-4 md:px-8 max-w-2xl mx-auto mt-6 space-y-3">
        {stages.filter(s => MOCK_CRM_PROSPECTS.some(p => p.stage === s)).map(stage => (
          <div key={stage}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{stageLabel[stage]}</div>
            {MOCK_CRM_PROSPECTS.filter(p => p.stage === stage).map(prospect => (
              <div key={prospect.id} className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{prospect.name}</span>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${stageColor[prospect.stage]}`}>{stageLabel[prospect.stage]}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{prospect.unit}</div>
                  <div className="text-xs text-muted-foreground">{prospect.email} · {prospect.date}</div>
                </div>
                <ChevronRight size={14} className="text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

const MOCK_PORTFOLIO = [
  { id: "p1", address: "592 Sherbourne St", unit: "Unit 1204", city: "Toronto", rent: 2150, status: "listed", applications: 4, image: MOCK_LISTINGS[0].image },
  { id: "p2", address: "480 King St W", unit: "Loft 612", city: "Toronto", rent: 2850, status: "leased-rentre", tenant: "Priya Sharma", leaseEnd: "Jun 30, 2026", image: MOCK_LISTINGS[1].image },
  { id: "p3", address: "15 Queens Quay W", unit: "2201", city: "Toronto", rent: 3400, status: "leased-rentre", tenant: "Jordan Lee", leaseEnd: "Aug 31, 2026", image: MOCK_LISTINGS[3].image },
  { id: "p4", address: "220 Bain Ave", unit: "", city: "Toronto", rent: 3100, status: "leased-external", tenant: "External tenant", leaseEnd: "Dec 31, 2025", image: MOCK_LISTINGS[5].image },
  { id: "p5", address: "1185 Eglinton Ave W", unit: "Unit 301", city: "Toronto", rent: 2400, status: "vacant", applications: 0, image: MOCK_LISTINGS[4].image },
  { id: "p6", address: "25 Maitland Place", unit: "Suite 804", city: "Toronto", rent: 1850, status: "vacant", applications: 0, image: image6 },
]

interface VacantProspect {
  id: string
  submittedType: "viewing" | "offer"
  tier: "$5" | "$25"
  creditScore: number
  creditProvider: string
  hasBackgroundCheck: boolean
  optIn: boolean
  socialLinked: string[]
  titleAbbr: string
  employer: string
  salary: number
  submittedDaysAgo: number
  coTenants: number
}

const VACANT_PROSPECT_DATA: Record<string, VacantProspect[]> = {
  "p5": [
    { id: "vp1", submittedType: "viewing", tier: "$5",  creditScore: 720, creditProvider: "Equifax", hasBackgroundCheck: true,  optIn: true,  socialLinked: ["LinkedIn", "Instagram"], titleAbbr: "SWE",         employer: "Amazon",  salary: 140000, submittedDaysAgo: 1, coTenants: 0 },
    { id: "vp2", submittedType: "offer",   tier: "$25", creditScore: 755, creditProvider: "Equifax", hasBackgroundCheck: true,  optIn: true,  socialLinked: ["LinkedIn"],              titleAbbr: "Mktg Mgr",    employer: "RBC",     salary: 95000,  submittedDaysAgo: 2, coTenants: 1 },
  ],
  "p6": [
    { id: "vp6", submittedType: "offer",   tier: "$5",  creditScore: 740, creditProvider: "Equifax", hasBackgroundCheck: true,  optIn: true,  socialLinked: ["LinkedIn", "Facebook"],  titleAbbr: "Architect",   employer: "Stantec", salary: 110000, submittedDaysAgo: 1, coTenants: 1 },
    { id: "vp7", submittedType: "viewing", tier: "$25", creditScore: 695, creditProvider: "Equifax", hasBackgroundCheck: false, optIn: false, socialLinked: [],                        titleAbbr: "UX Designer", employer: "Google",  salary: 130000, submittedDaysAgo: 2, coTenants: 0 },
  ],
}

export function LandlordPortalScreen({ onPostListing, onApplications, onCRM }: { onPostListing: () => void; onApplications: () => void; onCRM: () => void }) {
  const [showAddExternal, setShowAddExternal] = useState(false)
  const [externalLeases, setExternalLeases] = useState<ExternalLease[]>([
    { id: "el1", building: "220 Bain Ave", unit: "", tenant: "Marcus & Tanya Webb", rent: "3100", startDate: "2025-01-01", endDate: "2025-12-31" },
  ])
  const [newLease, setNewLease] = useState<Omit<ExternalLease, "id">>({ building: "", unit: "", tenant: "", rent: "", startDate: "", endDate: "", leaseFileName: undefined })
  const [newLeaseFile, setNewLeaseFile] = useState<string | null>(null)
  const leaseFileRef = useRef<HTMLInputElement>(null)
  const [portalTab, setPortalTab] = useState<"units" | "leases">("units")
  const [activeTab, setActiveTab] = useState<"all" | "leased" | "listed" | "vacant">("all")
  const [noticeSent, setNoticeSent] = useState<string[]>([])
  const [browserListings, setBrowserListings] = useState<BrowserListing[]>(readBrowserListings)
  const [selectedVacantUnit, setSelectedVacantUnit] = useState<string | null>(null)
  const [selectedPortfolioUnit, setSelectedPortfolioUnit] = useState<string | null>(null)
  const [unlockedProspects, setUnlockedProspects] = useState<Record<string, "credit" | "full">>({})
  const [acceptedViewings, setAcceptedViewings] = useState<Record<string, boolean>>({})
  const [billingConfirm, setBillingConfirm] = useState<string | null>(null)

  useEffect(() => {
    const refresh = () => setBrowserListings(readBrowserListings())
    window.addEventListener("rentre:listings-updated", refresh)
    return () => window.removeEventListener("rentre:listings-updated", refresh)
  }, [])

  const portfolio = [...browserListings, ...MOCK_PORTFOLIO]

  const rentreLeased = portfolio.filter(u => u.status === "leased-rentre").length
  const externalLeased = externalLeases.length
  const totalLeased = rentreLeased + externalLeased
  const totalUnits = portfolio.length + externalLeases.filter(e => !portfolio.find(p => p.address === e.building)).length
  const listed = portfolio.filter(u => u.status === "listed").length
  const vacant = portfolio.filter(u => u.status === "vacant").length
  const occupancyRate = Math.round((totalLeased / totalUnits) * 100)

  const filtered = portfolio.filter(u => {
    if (activeTab === "leased") return u.status.startsWith("leased")
    if (activeTab === "listed") return u.status === "listed"
    if (activeTab === "vacant") return u.status === "vacant"
    return true
  })

  const statusLabel: Record<string, string> = {
    "leased-rentre": "Leased via rentre",
    "leased-external": "External lease",
    "listed": "Listed · Accepting applications",
    "vacant": "Vacant"
  }
  const statusStyle: Record<string, string> = {
    "leased-rentre": "bg-green-500/10 border-green-500/20 text-green-700",
    "leased-external": "bg-blue-500/10 border-blue-500/20 text-blue-700",
    "listed": "bg-amber-500/10 border-amber-500/20 text-amber-700",
    "vacant": "bg-red-500/10 border-red-500/20 text-red-700",
  }

  return (
    <div className="min-h-screen pb-16" style={{ fontFamily: BODY }}>
      {/* Header */}
      <div className="px-4 md:px-8 pt-8 pb-0 border-b border-border bg-card">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-start justify-between gap-4 pb-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Landlord portal</p>
              <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: DISPLAY }}>Greenfield Properties</h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onCRM}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-primary/30 bg-primary/8 text-primary hover:bg-primary/15 transition-colors">
                <Users size={13} />CRM
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                  {MOCK_CRM_PROSPECTS.filter(p => p.stage !== "declined" && p.stage !== "lease-signed").length}
                </span>
              </button>
              <PrimaryButton onClick={onPostListing} size="sm"><Plus size={13} /> List a unit</PrimaryButton>
            </div>
          </div>
          {/* Tab bar */}
          <div className="flex gap-0">
            {(["units","leases"] as const).map(tab => (
              <button key={tab} onClick={() => setPortalTab(tab)}
                className={`px-5 py-2.5 text-sm font-semibold capitalize border-b-2 transition-all ${portalTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {tab === "units" ? "Units" : "Lease tracker"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 max-w-2xl mx-auto">
        {/* ── LEASE TRACKER TAB ── */}
        {portalTab === "leases" && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground" style={{ fontFamily: DISPLAY }}>Lease expiry & notice tracker</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Ontario RTA: landlords must give 60 days written notice before lease end.</p>
              </div>
            </div>

            {/* Urgent banner */}
            {MOCK_BUILDING_LEASES.some(l => leaseNoticeStatus(l).urgent) && (
              <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/8">
                <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-red-700">Action required</div>
                  <div className="text-xs text-red-600 mt-0.5">
                    {MOCK_BUILDING_LEASES.filter(l => leaseNoticeStatus(l).urgent && l.leaseEnd).length} leases have overdue or immediately-due notices. Send N11 or renewal letters now.
                  </div>
                </div>
              </div>
            )}

            {/* Per-building groups */}
            {Array.from(new Set(MOCK_BUILDING_LEASES.map(l => l.building))).map(building => {
              const leases = MOCK_BUILDING_LEASES.filter(l => l.building === building)
              return (
                <div key={building} className="mb-5 rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-secondary/50 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building size={13} className="text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">{building}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{leases.filter(l => l.leaseEnd).length} active leases</span>
                  </div>
                  <div className="divide-y divide-border">
                    {leases.map(lease => {
                      const ns = leaseNoticeStatus(lease)
                      const isVacant = !lease.leaseEnd
                      const sent = noticeSent.includes(lease.id)
                      return (
                        <div key={lease.id} className={`px-4 py-3.5 ${ns.urgent && !sent ? "bg-red-500/4" : ""}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-sm font-semibold text-foreground">{lease.unit}</span>
                                {isVacant && <span className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[9px] font-semibold text-red-600">Vacant</span>}
                              </div>
                              {!isVacant && (
                                <>
                                  <div className="text-xs text-muted-foreground">{lease.tenant} · <span style={{ fontFamily: MONO }}>${lease.rent.toLocaleString()}/mo</span></div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Lease: {lease.leaseStart} → {lease.leaseEnd}
                                  </div>
                                  <div className="text-xs mt-1">
                                    <span className="text-muted-foreground">Notice due: </span>
                                    <span className={`font-semibold ${ns.color}`}>
                                      {new Date(lease.noticeDueMs).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
                                      <span className="ml-1 font-normal">({ns.daysLabel})</span>
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                            {!isVacant && (
                              <div className="shrink-0 flex flex-col items-end gap-2">
                                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${ns.urgent ? "border-red-500/20 bg-red-500/10 text-red-700" : ns.label === "Notice upcoming" ? "border-amber-500/20 bg-amber-500/10 text-amber-700" : "border-green-500/20 bg-green-500/10 text-green-700"}`}>
                                  {ns.label}
                                </span>
                                {sent ? (
                                  <span className="text-[10px] text-green-600 flex items-center gap-1"><CheckCircle size={9} />Notice sent</span>
                                ) : (
                                  <button onClick={() => setNoticeSent(prev => [...prev, lease.id])}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${ns.urgent ? "bg-red-600 text-white hover:bg-red-700" : "bg-secondary border border-border text-foreground hover:bg-border"}`}>
                                    {ns.urgent ? "Send notice now" : "Send notice"}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            <div className="px-4 py-3 rounded-lg bg-secondary/50 border border-border text-[10px] text-muted-foreground">
              Notice dates calculated using 60-day rule under Ontario Residential Tenancies Act. Always confirm with a qualified legal professional before serving notices.
            </div>
          </div>
        )}

        {/* ── UNITS TAB ── */}
        {portalTab === "units" && <>

        {/* ── LEASE OVERVIEW ── */}
        <div className="mt-6 rounded-2xl border-2 border-foreground/10 bg-card overflow-hidden shadow-sm">
          {/* Big lease count */}
          <div className="px-6 py-5 border-b border-border" style={{ background: "linear-gradient(135deg, #1c1814 0%, #2d2420 100%)" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">Portfolio occupancy</span>
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-white text-xs font-bold" style={{ fontFamily: MONO }}>{occupancyRate}% occupied</span>
            </div>
            <div className="flex items-end gap-4 mb-4">
              <div>
                <div className="text-5xl font-extrabold text-white leading-none" style={{ fontFamily: MONO }}>{totalLeased}</div>
                <div className="text-sm text-white/60 mt-1">of {totalUnits} units leased</div>
              </div>
              {/* Segmented bar */}
              <div className="flex-1 flex flex-col justify-end pb-1">
                <div className="flex h-3 rounded-full overflow-hidden gap-px bg-white/10">
                  <div className="bg-green-400 h-full transition-all" style={{ width: `${(rentreLeased / totalUnits) * 100}%` }} />
                  <div className="bg-blue-400 h-full transition-all" style={{ width: `${(externalLeased / totalUnits) * 100}%` }} />
                  <div className="bg-amber-400 h-full transition-all" style={{ width: `${(listed / totalUnits) * 100}%` }} />
                  <div className="bg-red-400/60 h-full transition-all" style={{ width: `${(vacant / totalUnits) * 100}%` }} />
                </div>
                <div className="flex gap-3 mt-2">
                  {[
                    { label: "rentre", n: rentreLeased, color: "bg-green-400" },
                    { label: "External", n: externalLeased, color: "bg-blue-400" },
                    { label: "Listed", n: listed, color: "bg-amber-400" },
                    { label: "Vacant", n: vacant, color: "bg-red-400/80" },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${l.color}`} />
                      <span className="text-[10px] text-white/50">{l.n} {l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stat row */}
          <div className="grid grid-cols-4 gap-px bg-border">
            {[
              { label: "Leased (Rentre)", value: rentreLeased, sub: "via platform", accent: "text-green-700" },
              { label: "External leases", value: externalLeased, sub: "logged manually", accent: "text-blue-700" },
              { label: "Listed", value: listed, sub: "accepting apps", accent: "text-amber-700" },
              { label: "Vacant", value: vacant, sub: "not listed", accent: "text-red-600" },
            ].map(s => (
              <div key={s.label} className="bg-card px-4 py-4 text-center">
                <div className={`text-2xl font-bold ${s.accent}`} style={{ fontFamily: MONO }}>{s.value}</div>
                <div className="text-[10px] font-semibold text-foreground mt-0.5">{s.label}</div>
                <div className="text-[9px] text-muted-foreground">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* External lease CTA */}
        <div className="mt-4 flex items-center gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0"><FileText size={14} className="text-blue-600" /></div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">Log an external lease</div>
            <p className="text-xs text-muted-foreground mt-0.5">Track leases signed outside rentre so your portfolio stays complete.</p>
          </div>
          <button onClick={() => setShowAddExternal(true)} className="shrink-0 px-3 py-2 rounded-md bg-blue-600 text-white text-xs font-semibold hover:opacity-90 transition-all whitespace-nowrap">
            + Add
          </button>
        </div>

        {/* Add external lease form */}
        {showAddExternal && (
          <div className="mt-3 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-sm font-semibold text-foreground">New external lease</div>
                <div className="text-xs text-muted-foreground mt-0.5">Attach to a building, then specify the unit.</div>
              </div>
              <button onClick={() => { setShowAddExternal(false); setNewLeaseFile(null) }} className="text-muted-foreground hover:text-foreground"><X size={15} /></button>
            </div>

            {/* Building */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Building address</label>
              <input
                list="building-suggestions"
                placeholder="123 Main St, Toronto"
                value={newLease.building}
                onChange={e => setNewLease(l => ({ ...l, building: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-md border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <datalist id="building-suggestions">
                {Array.from(new Set(MOCK_PORTFOLIO.map(p => p.address))).map(a => <option key={a} value={a} />)}
              </datalist>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <FormInput label="Unit / suite" placeholder="Unit 4B" value={newLease.unit} onChange={v => setNewLease(l => ({ ...l, unit: v }))} optional />
              <FormInput label="Tenant name(s)" placeholder="Jane Smith" value={newLease.tenant} onChange={v => setNewLease(l => ({ ...l, tenant: v }))} />
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <FormInput label="Monthly rent" placeholder="2,200" value={newLease.rent} onChange={v => setNewLease(l => ({ ...l, rent: v }))} prefix="$" />
              <FormInput label="Lease start" value={newLease.startDate} onChange={v => setNewLease(l => ({ ...l, startDate: v }))} type="date" placeholder={""} />
              <FormInput label="Lease end" value={newLease.endDate} onChange={v => setNewLease(l => ({ ...l, endDate: v }))} type="date" placeholder="" />
            </div>

            {/* Lease agreement upload */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                Lease agreement <span className="normal-case text-muted-foreground/60 font-normal">(optional · PDF or image)</span>
              </label>
              <input ref={leaseFileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) { setNewLeaseFile(f.name); setNewLease(l => ({ ...l, leaseFileName: f.name })) }
                }}
              />
              {newLeaseFile ? (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-green-500/20 bg-green-500/8">
                  <FileText size={14} className="text-green-600 shrink-0" />
                  <span className="text-xs text-foreground truncate flex-1">{newLeaseFile}</span>
                  <button onClick={() => { setNewLeaseFile(null); setNewLease(l => ({ ...l, leaseFileName: undefined })); if (leaseFileRef.current) leaseFileRef.current.value = "" }}
                    className="text-muted-foreground hover:text-red-500 shrink-0"><X size={12} /></button>
                </div>
              ) : (
                <button onClick={() => leaseFileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
                  <Upload size={13} />Upload lease agreement
                </button>
              )}
            </div>

            <PrimaryButton size="sm" onClick={() => {
              if (newLease.building && newLease.tenant) {
                setExternalLeases(e => [...e, { ...newLease, id: `el${Date.now()}` }])
                setNewLease({ building: "", unit: "", tenant: "", rent: "", startDate: "", endDate: "", leaseFileName: undefined })
                setNewLeaseFile(null)
                if (leaseFileRef.current) leaseFileRef.current.value = ""
                setShowAddExternal(false)
              }
            }} disabled={!newLease.building || !newLease.tenant} fullWidth>Save external lease</PrimaryButton>
          </div>
        )}

        {/* External leases list — grouped by building */}
        {externalLeases.length > 0 && (
          <div className="mt-5">
            <div className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest mb-3">External leases ({externalLeases.length})</div>
            {Array.from(new Set(externalLeases.map(e => e.building))).map(building => {
              const units = externalLeases.filter(e => e.building === building)
              return (
                <div key={building} className="mb-3 rounded-xl border border-blue-500/15 bg-blue-500/5 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 border-b border-blue-500/10">
                    <Building size={12} className="text-blue-600 shrink-0" />
                    <span className="text-xs font-semibold text-blue-800 truncate">{building}</span>
                    <span className="ml-auto text-[10px] text-blue-600">{units.length} unit{units.length !== 1 ? "s" : ""}</span>
                  </div>
                  {units.map(el => (
                    <div key={el.id} className="flex items-center gap-3 px-4 py-3 border-b border-blue-500/8 last:border-b-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground">{el.unit ? el.unit : "Unit unspecified"}</div>
                        <div className="text-xs text-muted-foreground">
                          {el.tenant}{el.rent ? ` · $${parseInt(el.rent).toLocaleString()}/mo` : ""}
                          {el.endDate ? ` · ends ${el.endDate}` : ""}
                        </div>
                        {el.leaseFileName && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-green-700">
                            <FileText size={9} />{el.leaseFileName}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a href="https://www.squareone.ca/landlord-insurance" target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 rounded-md border border-amber-500/25 bg-amber-500/8 text-[10px] font-semibold text-amber-700 hover:bg-amber-500/15 transition-colors">
                          <Shield size={10} />Insurance
                        </a>
                        <button onClick={() => setExternalLeases(e => e.filter(x => x.id !== el.id))} className="text-muted-foreground hover:text-red-500 transition-colors"><X size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {/* Vacant unit prospect alerts */}
        {(() => {
          const vacantWithProspects = portfolio.filter(u => u.status === "vacant" && VACANT_PROSPECT_DATA[u.id]?.length > 0)
          if (vacantWithProspects.length === 0) return null
          const totalNew = vacantWithProspects.reduce((s, u) => s + (VACANT_PROSPECT_DATA[u.id]?.length ?? 0), 0)
          return (
            <div className="mt-6">
              {/* Section header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent" style={{ fontFamily: MONO }}>Prospect alerts</span>
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground" style={{ fontFamily: MONO }}>{totalNew} awaiting review</span>
              </div>

              <div className="flex flex-col gap-3">
                {vacantWithProspects.map(unit => {
                  const prospects = VACANT_PROSPECT_DATA[unit.id] ?? []
                  const offerCount = prospects.filter(p => p.submittedType === "offer").length
                  const viewingCount = prospects.length - offerCount
                  return (
                    <button
                      key={unit.id}
                      onClick={() => setSelectedVacantUnit(unit.id)}
                      className="w-full text-left rounded-2xl border border-border bg-card shadow-sm overflow-hidden hover:border-accent/40 hover:shadow-md transition-all group">

                      {/* Image strip + overlay */}
                      <div className="relative h-28 w-full overflow-hidden bg-secondary">
                        <img src={unit.image} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                        {/* Address overlay */}
                        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 flex items-end justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-white/55 uppercase tracking-wider mb-0.5" style={{ fontFamily: MONO }}>Vacant · {unit.city}</p>
                            <p className="text-base font-bold text-white leading-tight truncate" style={{ fontFamily: DISPLAY }}>
                              {unit.address}{unit.unit ? `, ${unit.unit}` : ""}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-bold text-white" style={{ fontFamily: MONO }}>${unit.rent.toLocaleString()}<span className="text-xs font-normal text-white/60">/mo</span></p>
                        </div>

                        {/* Live badge */}
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-sm px-2.5 py-1">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                          </span>
                          <span className="text-[10px] font-bold text-white" style={{ fontFamily: MONO }}>{prospects.length} new</span>
                        </div>
                      </div>

                      {/* Prospect signal rows */}
                      <div className="px-4 py-3 flex flex-col gap-2">
                        {prospects.map((p, idx) => {
                          const scoreColor = p.creditScore >= 760 ? "bg-green-500" : p.creditScore >= 700 ? "bg-amber-400" : "bg-red-400"
                          const scoreRange = p.creditScore >= 760 ? "760+" : p.creditScore >= 700 ? "700–759" : "600–699"
                          return (
                            <div key={p.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0 last:pb-0 first:pt-0">
                              {/* Anon avatar */}
                              <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 text-[11px] font-black text-muted-foreground" style={{ fontFamily: MONO }}>
                                #{idx + 1}
                              </div>

                              {/* Signal chips */}
                              <div className="flex-1 flex items-center flex-wrap gap-1.5 min-w-0">
                                {/* Type */}
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.submittedType === "offer" ? "bg-accent/10 text-accent border-accent/20" : "bg-primary/8 text-primary border-primary/15"}`}>
                                  {p.submittedType === "offer" ? "Offer" : "Viewing"}
                                </span>
                                {/* Credit band */}
                                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary border border-border text-foreground">
                                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${scoreColor}`} />
                                  {scoreRange}
                                </span>
                                {/* Opt-in */}
                                {p.optIn && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-700 flex items-center gap-0.5">
                                    <CheckCircle size={8} />Opted in
                                  </span>
                                )}
                                {/* Social */}
                                {p.socialLinked.length > 0 && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                                    {p.socialLinked[0]}{p.socialLinked.length > 1 ? ` +${p.socialLinked.length - 1}` : ""}
                                  </span>
                                )}
                                {/* BG check */}
                                {p.hasBackgroundCheck && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground flex items-center gap-0.5">
                                    <Shield size={8} />BG
                                  </span>
                                )}
                                {/* Tier */}
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-auto shrink-0 ${p.tier === "$5" ? "text-primary bg-primary/8" : "text-accent bg-accent/10"}`} style={{ fontFamily: MONO }}>
                                  {p.tier}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Footer CTA */}
                      <div className="border-t border-border px-4 py-2.5 flex items-center justify-between bg-secondary/40">
                        <div className="flex items-center gap-2 flex-wrap">
                          {offerCount > 0 && (
                            <span className="text-[10px] font-semibold text-accent">{offerCount} offer{offerCount !== 1 ? "s" : ""}</span>
                          )}
                          {viewingCount > 0 && (
                            <span className="text-[10px] font-semibold text-primary">{viewingCount} viewing{viewingCount !== 1 ? "s" : ""}</span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:gap-1.5 transition-all">
                          Review profiles <ArrowRight size={13} />
                        </span>
                      </div>

                    </button>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Portfolio listings */}
        <div className="mt-6 mb-3 flex items-center justify-between">
          <div className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">Portfolio units</div>
          <div className="flex gap-1">
            {(["all","leased","listed","vacant"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-semibold capitalize transition-all ${activeTab === tab ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {filtered.map(unit => (
            <div key={unit.id} role="button" tabIndex={0}
              onClick={() => setSelectedPortfolioUnit(unit.id)}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedPortfolioUnit(unit.id) } }}
              className="rounded-xl border border-border bg-card shadow-sm overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <div className="flex gap-4 p-4">
                <div className="w-20 h-16 rounded-lg overflow-hidden bg-secondary shrink-0">
                  <img src={unit.image} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{unit.address}{unit.unit ? `, ${unit.unit}` : ""}</div>
                      <div className="text-xs text-muted-foreground">{unit.city} · <span style={{ fontFamily: MONO }}>${unit.rent.toLocaleString()}/mo</span></div>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle[unit.status]}`}>
                      {statusLabel[unit.status]}
                    </span>
                  </div>
                  {unit.tenant && <div className="text-xs text-muted-foreground mt-1">Tenant: <span className="text-foreground">{unit.tenant}</span>{unit.leaseEnd ? ` · Lease ends ${unit.leaseEnd}` : ""}</div>}
                  {unit.status === "listed" && <div className="text-xs text-muted-foreground mt-1">{unit.applications} application{unit.applications !== 1 ? "s" : ""} received</div>}
                </div>
              </div>
              <div className="border-t border-border px-4 py-2.5 flex gap-3 flex-wrap items-center">
                {unit.status === "listed" && <button onClick={(event) => { event.stopPropagation(); onApplications() }} className="text-xs text-primary font-medium hover:underline flex items-center gap-1.5"><Eye size={12} />View applicants</button>}
                {unit.status.startsWith("leased") && <button onClick={(event) => { event.stopPropagation(); setSelectedPortfolioUnit(unit.id) }} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"><FileText size={12} />View lease</button>}
                {unit.status === "vacant" && <button onClick={(event) => { event.stopPropagation(); setSelectedPortfolioUnit(unit.id) }} className="text-xs text-primary font-medium hover:underline flex items-center gap-1.5"><Eye size={12} />Manage unit</button>}
                <span className="text-border">·</span>
                <button onClick={(event) => { event.stopPropagation(); setSelectedPortfolioUnit(unit.id) }} className="text-xs text-muted-foreground hover:text-foreground">Edit</button>
                <button onClick={(event) => { event.stopPropagation(); setSelectedPortfolioUnit(unit.id) }} className="ml-auto text-[10px] font-semibold text-primary flex items-center gap-1 group"><span>Open unit</span><ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" /></button>
              </div>
            </div>
          ))}
        </div>

        {/* $/unit over time graph */}
        <div className="mt-6 rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Revenue / unit</div>
              <div className="text-sm font-semibold text-foreground mt-0.5">Monthly avg. $/leased unit</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-foreground" style={{ fontFamily: MONO }}>
                ${Math.round((MOCK_PORTFOLIO.filter(u => u.status.startsWith("leased")).reduce((s, u) => s + u.rent, 0) + externalLeases.reduce((s, e) => s + (parseInt(e.rent) || 0), 0)) / Math.max(1, totalLeased)).toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground">this month</div>
            </div>
          </div>
          <div className="px-2 py-4">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={[
                { month: "Jan", val: 2480 }, { month: "Feb", val: 2510 }, { month: "Mar", val: 2495 },
                { month: "Apr", val: 2560 }, { month: "May", val: 2590 }, { month: "Jun", val: 2620 },
                { month: "Jul", val: 2680 }, { month: "Aug", val: 2710 }, { month: "Sep", val: 2740 },
                { month: "Oct", val: 2720 }, { month: "Nov", val: 2755 }, { month: "Dec", val: 2800 },
              ]} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid key="cg" strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis key="xa" dataKey="month" tick={{ fontSize: 10, fill: "#8a7968", fontFamily: BODY }} axisLine={false} tickLine={false} />
                <YAxis key="ya" tick={{ fontSize: 10, fill: "#8a7968", fontFamily: MONO }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v/1000).toFixed(1)}k`} width={46} />
                <Tooltip key="tt" formatter={(v: number) => [`$${v.toLocaleString()}/unit`, "Avg. rent"]} contentStyle={{ fontSize: 11, fontFamily: BODY, borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)" }} />
                <Line key="ln" type="monotone" dataKey="val" stroke="#b85c1e" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#b85c1e" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Incoming renewals */}
        <div className="mt-6 rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Incoming renewals</div>
              <div className="text-sm font-semibold text-foreground mt-0.5">Leases expiring in next 90 days</div>
            </div>
            <button onClick={() => {/* add renewal */}} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"><Plus size={11} />Add</button>
          </div>
          <div className="divide-y divide-border">
            {[
              { unit: "480 King St W, Loft 612", tenant: "Priya Sharma", leaseEnd: "Jun 30, 2026", rent: 2850, daysLeft: 12 },
              { unit: "15 Queens Quay W, 2201", tenant: "Jordan Lee", leaseEnd: "Aug 31, 2026", rent: 3400, daysLeft: 74 },
            ].map(r => (
              <div key={r.unit} className="flex items-center gap-4 px-5 py-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${r.daysLeft <= 30 ? "bg-red-500/10 text-red-700" : "bg-amber-500/10 text-amber-700"}`} style={{ fontFamily: MONO }}>
                  {r.daysLeft}d
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{r.unit}</div>
                  <div className="text-xs text-muted-foreground">{r.tenant} · ends {r.leaseEnd}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>${r.rent.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">/mo</div>
                </div>
                <button className="shrink-0 px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold text-foreground hover:bg-border transition-colors">Renew</button>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 bg-secondary/30 border-t border-border">
            <p className="text-[10px] text-muted-foreground">Renewals added here appear in tenant communications 60 days before expiry.</p>
          </div>
        </div>

        {/* Building performance */}
        {(() => {
          const leasedUnits = MOCK_PORTFOLIO.filter(u => u.status.startsWith("leased"))
          const monthlyRevenue = leasedUnits.reduce((s, u) => s + u.rent, 0) + externalLeases.reduce((s, e) => s + (parseInt(e.rent) || 0), 0)
          const avgRent = totalLeased > 0 ? Math.round(monthlyRevenue / totalLeased) : 0
          const pendingApps = MOCK_PORTFOLIO.filter(u => u.status === "listed").reduce((s, u) => s + (u.applications || 0), 0)
          const vacancyRate = totalUnits > 0 ? Math.round(((vacant) / totalUnits) * 100) : 0
          return (
            <div className="mt-6 rounded-xl border border-border bg-card overflow-hidden mb-8">
              <div className="px-5 py-4 border-b border-border">
                <div className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Building performance</div>
              </div>
              <div className="grid grid-cols-2 gap-px bg-border">
                {[
                  { label: "Monthly revenue", value: `$${monthlyRevenue.toLocaleString()}`, sub: `from ${totalLeased} leased unit${totalLeased !== 1 ? "s" : ""}` },
                  { label: "Avg. rent / unit", value: `$${avgRent.toLocaleString()}`, sub: "across leased units" },
                  { label: "Vacancy rate", value: `${vacancyRate}%`, sub: `${vacant} of ${totalUnits} units vacant` },
                  { label: "Pending applications", value: String(pendingApps), sub: `across ${listed} listed unit${listed !== 1 ? "s" : ""}` },
                ].map(s => (
                  <div key={s.label} className="bg-card px-5 py-4">
                    <div className="text-xl font-bold text-foreground" style={{ fontFamily: MONO }}>{s.value}</div>
                    <div className="text-[10px] font-semibold text-foreground mt-0.5">{s.label}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
        </>}
      </div>

      {/* Prospect modal sheet */}
      {selectedVacantUnit && (() => {
        const unit = portfolio.find(u => u.id === selectedVacantUnit)
        const prospects = VACANT_PROSPECT_DATA[selectedVacantUnit] ?? []
        return (
          <div className="fixed inset-0 z-50" style={{ fontFamily: BODY }}>
            <ModalKeys onClose={() => setSelectedVacantUnit(null)} />
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedVacantUnit(null)} />
            {/* Sheet — bottom-anchored, independent scroll */}
            <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-background shadow-2xl flex flex-col" style={{ maxHeight: "90vh" }}>

              {/* Photo header */}
              {unit?.image ? (
                <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-t-2xl">
                  <img src={unit.image} alt={unit.address ?? ""} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <button onClick={() => setSelectedVacantUnit(null)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors">
                    <X size={15} />
                  </button>
                  <div className="absolute bottom-3 left-5">
                    <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest">Prospects for</p>
                    <p className="text-lg font-bold text-white leading-tight" style={{ fontFamily: DISPLAY }}>{unit.address}{unit.unit ? `, ${unit.unit}` : ""}</p>
                    <p className="text-xs text-white/70 mt-0.5">{prospects.length} prospect{prospects.length !== 1 ? "s" : ""} · <span style={{ fontFamily: MONO }}>${unit.rent.toLocaleString()}/mo vacant</span></p>
                  </div>
                </div>
              ) : (
                <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Prospects for</p>
                    <p className="text-base font-bold text-foreground" style={{ fontFamily: DISPLAY }}>{unit?.address}{unit?.unit ? `, ${unit.unit}` : ""}</p>
                  </div>
                  <button onClick={() => setSelectedVacantUnit(null)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                    <X size={15} />
                  </button>
                </div>
              )}

              {/* Anonymity bar */}
              <div className="px-5 py-2.5 bg-secondary/80 border-b border-border shrink-0 flex items-center gap-2">
                <Lock size={10} className="text-muted-foreground shrink-0" />
                <p className="text-[10px] text-muted-foreground">Profiles are anonymized until you unlock. All data verified by rentre. Unlocking does not contact the renter.</p>
              </div>

              {/* Scrollable cards */}
              <div className="overflow-y-auto flex-1 px-4 py-4 flex flex-col gap-5">
                {prospects.map((p, i) => {
                  const unlocked = unlockedProspects[p.id]
                  const accepted = acceptedViewings[p.id]
                  const is5 = p.tier === "$5"
                  const scoreColor = p.creditScore >= 760 ? "bg-green-500" : p.creditScore >= 700 ? "bg-amber-400" : "bg-red-400"
                  const scoreLabel = p.creditScore >= 760 ? "Excellent" : p.creditScore >= 700 ? "Good" : "Fair"
                  return (
                    <div key={p.id} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">

                      {/* Header */}
                      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
                        <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-sm font-black text-muted-foreground shrink-0" style={{ fontFamily: MONO }}>
                          #{i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${p.submittedType === "offer" ? "bg-accent/15 text-accent border border-accent/20" : "bg-primary/10 text-primary border border-primary/15"}`}>
                              {p.submittedType === "offer" ? "Offer submitted" : "Viewing request"}
                            </span>
                            {/* Tier badge */}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-0.5 ${is5 ? "bg-primary/8 text-primary border-primary/20" : "bg-accent/10 text-accent border-accent/20"}`}>
                              <Lock size={8} />{p.tier} unlock
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {p.submittedDaysAgo === 1 ? "1 day ago" : `${p.submittedDaysAgo} days ago`}
                            {" · "}
                            {p.coTenants > 0 ? `${p.coTenants + 1} occupants` : "Solo applicant"}
                          </p>
                        </div>
                      </div>

                      <div className="h-px bg-border mx-4" />

                      {/* Always-visible signals */}
                      <div className="px-4 py-3 space-y-2.5">

                        {/* Opt-in */}
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Landlord contact opt-in</p>
                          <span className={`text-xs font-bold flex items-center gap-1 ${p.optIn ? "text-green-700" : "text-muted-foreground"}`}>
                            {p.optIn ? <><CheckCircle size={11} />Opted in</> : "Not opted in"}
                          </span>
                        </div>

                        {/* Background check */}
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Background check</p>
                          <span className={`text-xs font-bold flex items-center gap-1 ${p.hasBackgroundCheck ? "text-green-700" : "text-muted-foreground"}`}>
                            {p.hasBackgroundCheck ? <><CheckCircle size={11} />Enrolled</> : "Not enrolled"}
                          </span>
                        </div>

                        {/* Social media */}
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Social media</p>
                          {p.socialLinked.length > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              {p.socialLinked.map(s => (
                                <span key={s} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary border border-border text-foreground">{s}</span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">None linked</span>
                          )}
                        </div>
                      </div>

                      <div className="h-px bg-border mx-4" />

                      {/* Locked data section */}
                      <div className="px-4 py-3 space-y-2.5">

                        {/* Credit score */}
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Credit score</p>
                            {unlocked ? (
                              <p className="text-sm font-black text-foreground flex items-center gap-2 mt-0.5" style={{ fontFamily: MONO }}>
                                <span className={`inline-block w-2.5 h-2.5 rounded-full ${scoreColor}`} />
                                {p.creditScore}
                                <span className="text-xs font-normal text-muted-foreground">{scoreLabel} · via {p.creditProvider}</span>
                              </p>
                            ) : (
                              <p className="text-sm font-bold text-muted-foreground/35 tracking-[0.18em] mt-0.5" style={{ fontFamily: MONO }}>● ● ●</p>
                            )}
                          </div>
                          {!unlocked && is5 && (
                            <button
                              onClick={() => setUnlockedProspects(prev => ({ ...prev, [p.id]: "credit" }))}
                              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-primary/30 bg-primary/5 text-primary text-[11px] font-bold hover:bg-primary/12 active:scale-95 transition-all">
                              <Lock size={11} />Unlock · <span style={{ fontFamily: MONO }}>$5</span>
                            </button>
                          )}
                          {!unlocked && !is5 && (
                            <span className="text-[10px] text-muted-foreground italic">Included in $25</span>
                          )}
                        </div>

                        {/* Occupation — only on $25 tier */}
                        {!is5 && (
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Occupation</p>
                              {unlocked === "full" ? (
                                <p className="text-sm font-bold text-foreground mt-0.5">{p.titleAbbr} · {p.employer}</p>
                              ) : (
                                <p className="text-sm font-bold text-muted-foreground/35 tracking-[0.12em] mt-0.5">● ● ● ● ●</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Annual income — only on $25 tier */}
                        {!is5 && (
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Annual income</p>
                            {unlocked === "full" ? (
                              <p className="text-sm font-black text-foreground" style={{ fontFamily: MONO }}>${p.salary.toLocaleString()}</p>
                            ) : (
                              <p className="text-sm font-bold text-muted-foreground/35 tracking-[0.12em]">● ● ● ● ●</p>
                            )}
                          </div>
                        )}

                        {/* $25 unlock CTA */}
                        {!is5 && !unlocked && (
                          <button
                            onClick={() => setUnlockedProspects(prev => ({ ...prev, [p.id]: "full" }))}
                            className="w-full flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-accent text-accent-foreground text-[11px] font-bold hover:opacity-90 active:scale-95 transition-all justify-center">
                            <UserCheck size={12} />Full profile · credit + occupation + income · <span style={{ fontFamily: MONO }}>$25</span>
                          </button>
                        )}
                      </div>

                      {/* Unlocked badge */}
                      {unlocked && (
                        <div className="mx-4 mb-2 flex flex-wrap gap-1.5">
                          {unlocked === "credit" && <span className="text-[10px] font-semibold text-green-700 flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10"><CheckCircle size={9} />Credit report unlocked</span>}
                          {unlocked === "full" && <span className="text-[10px] font-semibold text-green-700 flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10"><CheckCircle size={9} />Full profile unlocked</span>}
                        </div>
                      )}

                      {/* Accept / reveal identity CTA */}
                      <div className="px-4 pb-4 pt-1">
                        {accepted ? (
                          <div className="rounded-xl bg-green-500/8 border border-green-500/20 px-4 py-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold text-green-700 flex items-center gap-1"><CheckCircle size={11} />Identity revealed · $15 charged</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">Renter notified to expect contact.</p>
                            </div>
                            <button className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-colors">
                              <Mail size={11} />Message
                            </button>
                          </div>
                        ) : billingConfirm === p.id ? (
                          <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
                            <p className="text-sm font-bold text-foreground mb-1">Confirm &amp; reveal identity</p>
                            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">Reveals the renter&apos;s full name and contact info. Your account will be charged <strong className="text-foreground">$15</strong>.</p>
                            <div className="flex gap-2">
                              <button onClick={() => setBillingConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                              <button
                                onClick={() => { setAcceptedViewings(prev => ({ ...prev, [p.id]: true })); setBillingConfirm(null) }}
                                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors">
                                Confirm · charge $15
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setBillingConfirm(p.id)}
                            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-primary/30 text-primary text-xs font-bold hover:border-primary/60 hover:bg-primary/5 active:scale-[0.99] transition-all">
                            <Lock size={13} />
                            <span>Accept {p.submittedType === "offer" ? "offer" : "viewing request"} &amp; reveal identity</span>
                            <span className="ml-auto text-[11px] font-black bg-primary text-primary-foreground px-2 py-0.5 rounded-lg" style={{ fontFamily: MONO }}>$15</span>
                          </button>
                        )}
                      </div>

                    </div>
                  )
                })}
              </div>

            </div>
          </div>
        )
      })()}

      {/* Unit workspace */}
      {selectedPortfolioUnit && (() => {
        const unit = portfolio.find(item => item.id === selectedPortfolioUnit)
        if (!unit) return null
        const prospects = VACANT_PROSPECT_DATA[unit.id] ?? []
        const isLeased = unit.status.startsWith("leased")
        const isListed = unit.status === "listed"
        const statusNote = unit.status === "vacant"
          ? prospects.length ? `${prospects.length} anonymous prospect${prospects.length === 1 ? "" : "s"} waiting for review` : "Ready to list when you are"
          : isListed ? `${unit.applications ?? 0} application${unit.applications === 1 ? "" : "s"} received through rentre` : unit.leaseEnd ? `Lease ends ${unit.leaseEnd}` : "Lease details on file"
        return (
          <div className="fixed inset-0 z-50" style={{ fontFamily: BODY }}>
            <ModalKeys onClose={() => setSelectedPortfolioUnit(null)} />
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedPortfolioUnit(null)} />
            <section role="dialog" aria-modal="true" aria-label={`Unit details for ${unit.address}`} className="absolute bottom-0 left-0 right-0 max-h-[92vh] overflow-y-auto rounded-t-2xl bg-background shadow-2xl">
              <div className="relative h-52 overflow-hidden rounded-t-2xl bg-secondary">
                <img src={unit.image} alt={`${unit.address}${unit.unit ? `, ${unit.unit}` : ""}`} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/5" />
                <button onClick={() => setSelectedPortfolioUnit(null)} aria-label="Close unit details" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75"><X size={16} /></button>
                <div className="absolute bottom-5 left-5 right-5">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border backdrop-blur-sm ${unit.status === "vacant" ? "border-red-300/35 bg-red-950/35 text-red-100" : unit.status === "listed" ? "border-amber-200/35 bg-amber-950/35 text-amber-100" : "border-green-200/35 bg-green-950/35 text-green-100"}`}>{statusLabel[unit.status]}</span>
                    <span className="text-[10px] font-medium uppercase tracking-widest text-white/60">Unit workspace</span>
                  </div>
                  <h2 className="text-2xl font-bold leading-tight text-white" style={{ fontFamily: DISPLAY }}>{unit.address}{unit.unit ? `, ${unit.unit}` : ""}</h2>
                  <p className="mt-1 text-xs text-white/70">{unit.city} · <span style={{ fontFamily: MONO }}>${unit.rent.toLocaleString()}/mo</span></p>
                </div>
              </div>

              <div className="mx-auto max-w-2xl px-4 py-5 md:px-6">
                <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-start gap-3">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${unit.status === "vacant" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"}`}>
                    {unit.status === "vacant" ? <Users size={15} /> : isListed ? <ClipboardList size={15} /> : <KeyRound size={15} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{unit.status === "vacant" ? "Leasing activity" : isListed ? "Application activity" : "Current tenancy"}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{statusNote}</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
                  {[
                    { label: "Monthly rent", value: `$${unit.rent.toLocaleString()}` },
                    { label: "Status", value: unit.status === "leased-rentre" ? "Rentre lease" : unit.status === "leased-external" ? "External lease" : unit.status === "listed" ? "Listed" : "Vacant" },
                    { label: isLeased ? "Lease end" : "Prospects", value: isLeased ? (unit.leaseEnd ?? "—") : String(prospects.length || unit.applications || 0) },
                    { label: "City", value: unit.city },
                  ].map(item => <div key={item.label} className="bg-card px-3 py-3.5"><p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">{item.label}</p><p className="mt-1 text-xs font-bold text-foreground">{item.value}</p></div>)}
                </div>

                <div className="mt-6">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Next action</p>
                  {unit.status === "vacant" ? (
                    prospects.length > 0 ? <button onClick={() => { setSelectedPortfolioUnit(null); setSelectedVacantUnit(unit.id) }} className="mt-2 flex w-full items-center justify-between rounded-xl bg-primary px-4 py-3.5 text-left text-primary-foreground transition-colors hover:bg-primary/90"><span><span className="block text-sm font-bold">Review anonymous prospects</span><span className="mt-0.5 block text-[11px] text-white/70">Compare verified profiles; identity stays private until acceptance.</span></span><span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-white/15 text-xs font-bold" style={{ fontFamily: MONO }}>{prospects.length}</span></button>
                      : <button onClick={() => { setSelectedPortfolioUnit(null); onPostListing() }} className="mt-2 flex w-full items-center justify-between rounded-xl bg-primary px-4 py-3.5 text-left text-primary-foreground transition-colors hover:bg-primary/90"><span><span className="block text-sm font-bold">List this unit</span><span className="mt-0.5 block text-[11px] text-white/70">Publish a verified rental listing to Rentre.</span></span><Plus size={18} /></button>
                  ) : isListed ? (
                    <button onClick={() => { setSelectedPortfolioUnit(null); onApplications() }} className="mt-2 flex w-full items-center justify-between rounded-xl bg-primary px-4 py-3.5 text-left text-primary-foreground transition-colors hover:bg-primary/90"><span><span className="block text-sm font-bold">Review applicants</span><span className="mt-0.5 block text-[11px] text-white/70">Open your application queue for this listing.</span></span><ArrowRight size={18} /></button>
                  ) : (
                    <button className="mt-2 flex w-full items-center justify-between rounded-xl bg-primary px-4 py-3.5 text-left text-primary-foreground transition-colors hover:bg-primary/90"><span><span className="block text-sm font-bold">View lease record</span><span className="mt-0.5 block text-[11px] text-white/70">Tenant, documents, and renewal milestones.</span></span><FileText size={18} /></button>
                  )}
                </div>

                <div className="mt-6 rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3"><p className="text-sm font-bold text-foreground">Unit details</p><button className="text-xs font-semibold text-primary hover:underline">Edit details</button></div>
                  <div className="divide-y divide-border text-xs">
                    <div className="flex items-center justify-between px-4 py-3"><span className="text-muted-foreground">Rental channel</span><span className="font-semibold text-foreground">{unit.status === "leased-external" ? "External lease" : "Rentre"}</span></div>
                    <div className="flex items-center justify-between px-4 py-3"><span className="text-muted-foreground">Leaseholder</span><span className="font-semibold text-foreground">{unit.tenant ?? "No active tenant"}</span></div>
                    <div className="flex items-center justify-between px-4 py-3"><span className="text-muted-foreground">Maintenance</span><span className="font-semibold text-green-700">No open requests</span></div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )
      })()}
    </div>
  )
}

export function LandlordApplicationsScreen({ onOfferSent }: { onOfferSent: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])
  const [accepted, setAccepted] = useState(false)
  const [showDecline, setShowDecline] = useState(false)
  const [declined, setDeclined] = useState(false)
  const [declineReason, setDeclineReason] = useState("")
  const [withdrawn, setWithdrawn] = useState(false)
  const [showQueue, setShowQueue] = useState(false)

  const addOns = [
    { id: "reference", icon: PhoneCall, label: "Phone Reference Screen", description: "AI-conducted reference conversation. Recording is available for 48 hours after review.", price: "From $14" },
    { id: "background", icon: Shield, label: "3rd Party Background Check", description: "A complete background report delivered through SingleKey.", price: "From $25" },
    { id: "lease", icon: FileText, label: "Lease signing processing", description: "Prepare a compliant digital lease when you are ready to make an offer.", price: "From $9" },
  ]
  const toggleAddOn = (id: string) => setSelectedAddOns(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])

  if (showQueue) return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8" style={{ fontFamily: BODY }}>
      <div className="mx-auto max-w-3xl">
        <button onClick={() => setShowQueue(false)} className="mb-7 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"><ChevronLeft size={17} />Back to request</button>
        <div className="mb-7 flex items-end justify-between gap-4"><div><p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Requests to view</p><h2 className="text-3xl font-semibold tracking-[-0.02em]" style={{ fontFamily: DISPLAY }}>Your queue</h2></div><span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">0 pending</span></div>
        <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-[0_16px_50px_rgba(36,42,32,0.05)]"><div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-secondary text-primary"><ClipboardList size={21} /></div><h3 className="text-xl font-semibold" style={{ fontFamily: DISPLAY }}>Your queue is clear</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">New viewing requests will appear here. We'll let you know as soon as an applicant is ready for review.</p><button onClick={onOfferSent} className="mt-6 text-sm font-semibold text-primary hover:underline">Return to landlord portal</button></div>
      </div>
    </div>
  )

  if (declined) return (
    <div className="min-h-screen bg-background px-4 py-12 md:px-8" style={{ fontFamily: BODY }}><div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-7 text-center shadow-[0_16px_50px_rgba(36,42,32,0.05)]"><div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-secondary text-muted-foreground"><CheckCircle size={25} /></div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Request declined</p><h2 className="mt-2 text-2xl font-semibold" style={{ fontFamily: DISPLAY }}>Done and kept private.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Applicant #4471 has been notified. Your reason is stored only for Greenfield Properties' internal analytics.</p><button onClick={() => setShowQueue(true)} className="mt-7 w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">View requests queue</button></div></div>
  )

  return (
    <div className="min-h-screen bg-background pb-40" style={{ fontFamily: BODY }}>
      <header className="border-b border-border bg-card/80 px-4 py-4 backdrop-blur md:px-8"><div className="mx-auto flex max-w-5xl items-center justify-between"><button onClick={onOfferSent} className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"><ChevronLeft size={18} />Requests</button><button onClick={() => setWithdrawn(!withdrawn)} className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground hover:text-primary">{withdrawn ? "Restore request" : "Demo: withdrawn"}</button></div></header>
      <main className="mx-auto max-w-5xl px-4 py-7 md:px-8 md:py-10">
        {withdrawn ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card px-6 py-12 text-center"><div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground"><Clock size={21} /></div><h1 className="text-2xl font-semibold" style={{ fontFamily: DISPLAY }}>This request was withdrawn</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">The applicant withdrew their request before a decision was made. No action is needed.</p><button onClick={() => setShowQueue(true)} className="mt-6 text-sm font-semibold text-primary hover:underline">View pending requests</button></div>
        ) : <>
          <div className="mb-6 flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-4"><div className="size-16 shrink-0 overflow-hidden rounded-xl bg-[#d9cdbc]"><img src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=180&h=180&fit=crop&auto=format" alt="Exterior of 123 King Street West" className="size-full object-cover" /></div><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Viewing request</p><h1 className="mt-1 text-2xl font-semibold leading-tight tracking-[-0.02em] text-foreground md:text-3xl" style={{ fontFamily: DISPLAY }}>2 Bed, 1 Bath <span className="text-muted-foreground">—</span> 123 King St W, Unit 402</h1><p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><Clock size={14} />Requested 2 hours ago</p></div></div>
            <span className="w-fit rounded-full border border-[#cba872]/45 bg-[#fbf1df] px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#87592f]">Pending review</span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_16px_50px_rgba(36,42,32,0.05)]">
              <div className="border-b border-border px-5 py-5 md:px-7"><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-4"><div className={`flex size-14 items-center justify-center rounded-full border ${accepted ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground"}`}>{accepted ? <UserCheck size={25} /> : <User size={25} />}</div><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{accepted ? "Applicant identity revealed" : "Identity protected until accepted"}</p><h2 className="mt-1 text-xl font-semibold" style={{ fontFamily: DISPLAY }}>{accepted ? "Maya Thompson" : "Applicant #4471"}</h2></div></div><span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground"><CheckCircle size={13} />Complete profile</span></div></div>
              <div className="px-5 py-5 md:px-7"><p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">At a glance</p><div className="flex flex-wrap gap-2"><span className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground"><Calendar className="mr-1.5 inline text-primary" size={13} />Move-in <strong>Sept 1</strong></span><span className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground"><Users className="mr-1.5 inline text-primary" size={13} /><strong>2 people</strong> · couple</span><span className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary"><Shield className="mr-1.5 inline" size={13} />Credit <strong>linked ✓</strong></span><span className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary"><BadgeCheck className="mr-1.5 inline" size={13} />Identity <strong>verified ✓</strong></span><span className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground"><UserCheck className="mr-1.5 inline text-primary" size={13} /><strong>2 references</strong></span></div></div>
              {accepted && <div className="border-t border-border bg-[#f7fbf7] px-5 py-5 md:px-7"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Accepted applicant</p><h3 className="mt-1 text-lg font-semibold" style={{ fontFamily: DISPLAY }}>Maya Thompson & Daniel Park</h3><p className="mt-1 text-sm text-muted-foreground">maya.thompson@email.com · (416) 555-0184</p></div><button className="w-fit rounded-lg border border-primary/25 bg-card px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5"><FileText className="mr-1 inline" size={13} />3 documents</button></div></div>}
            </section>

            <aside className="rounded-2xl border border-border bg-[#eee8dc] p-5 lg:self-start"><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Decision guide</p><h3 className="mt-2 text-lg font-semibold leading-snug" style={{ fontFamily: DISPLAY }}>A complete package is ready for review.</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Tenant details stay protected until you accept. You can request verification add-ons below before deciding.</p><div className="mt-5 border-t border-border pt-4 text-xs leading-5 text-muted-foreground"><Info className="mr-1 inline text-primary" size={13} />Accepting starts viewing coordination—no lease commitment yet.</div></aside>
          </div>

          {!accepted && <section className="mt-6 rounded-2xl border border-border bg-card shadow-[0_16px_50px_rgba(36,42,32,0.04)]"><button onClick={() => setIsExpanded(!isExpanded)} className="flex w-full items-center justify-between px-5 py-5 text-left md:px-7"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Optional verification</p><h2 className="mt-1 text-xl font-semibold" style={{ fontFamily: DISPLAY }}>Want more information before deciding?</h2></div><ChevronDown size={19} className={`text-primary transition-transform ${isExpanded ? "rotate-180" : ""}`} /></button>{isExpanded && <div className="border-t border-border px-5 py-5 md:px-7"><div className="grid gap-3 md:grid-cols-3">{addOns.map(addOn => { const selected = selectedAddOns.includes(addOn.id); const Icon = addOn.icon; return <button key={addOn.id} onClick={() => toggleAddOn(addOn.id)} className={`relative rounded-xl border p-4 text-left transition-all ${selected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-background hover:border-primary/35"}`}><span className={`mb-4 flex size-9 items-center justify-center rounded-lg ${selected ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}><Icon size={17} /></span><h3 className="pr-8 text-sm font-semibold text-foreground">{addOn.label}</h3><p className="mt-1.5 text-xs leading-5 text-muted-foreground">{addOn.description}</p><p className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-primary">{addOn.price}</p><span className={`absolute right-3 top-3 flex size-5 items-center justify-center rounded-full border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{selected && <CheckCircle size={13} />}</span></button>})}</div><p className="mt-4 rounded-lg border border-[#d9c49b] bg-[#fff8e9] px-3 py-2.5 text-xs leading-5 text-[#755e36]"><Info className="mr-1 inline" size={13} />Selecting now may offer better pricing than waiting until Offer stage.</p>{selectedAddOns.length > 0 && <div className="mt-4 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/7 px-3 py-3 text-sm text-primary"><CheckCircle className="mt-0.5 shrink-0" size={16} /><span><strong>{selectedAddOns.length === 1 ? addOns.find(a => a.id === selectedAddOns[0])?.label : `${selectedAddOns.length} verification add-ons`} requested.</strong> We'll notify you when {selectedAddOns.length === 1 ? "it's" : "they're"} ready.</span></div>}</div>}</section>}
        </>}
      </main>
      {!withdrawn && !declined && !accepted && <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur md:px-8"><div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="order-2 max-w-xl text-[11px] leading-4 text-muted-foreground sm:order-1">Accepting will reveal this applicant's name and contact info, and start scheduling a viewing.</p><div className="order-1 flex gap-2 sm:order-2"><button onClick={() => setShowDecline(true)} className="flex-1 rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary sm:flex-none">Decline</button><button onClick={() => setAccepted(true)} className="flex flex-[1.65] items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90 sm:flex-none"><CheckCircle size={16} />{accepted ? "Applicant accepted" : "Accept & view details"}</button></div></div></div>}
      {showDecline && <div className="fixed inset-0 z-50 flex items-end bg-foreground/30 p-0 sm:items-center sm:justify-center sm:p-4"><ModalKeys onClose={() => setShowDecline(false)} /><div className="w-full rounded-t-2xl bg-card p-6 shadow-2xl sm:max-w-md sm:rounded-2xl"><div className="flex items-start justify-between"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Internal only</p><h2 className="mt-1 text-2xl font-semibold" style={{ fontFamily: DISPLAY }}>Let us know why <span className="text-muted-foreground">(optional)</span></h2></div><button onClick={() => setShowDecline(false)} className="rounded-full p-1 text-muted-foreground hover:bg-secondary"><X size={18} /></button></div><div className="mt-5 grid grid-cols-2 gap-2">{["Unit filled", "Doesn't meet criteria", "Timing doesn't work", "Other"].map(reason => <button key={reason} onClick={() => setDeclineReason(reason)} className={`rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition ${declineReason === reason ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground hover:bg-secondary"}`}>{reason}</button>)}</div><textarea placeholder="Add a note for your records" className="mt-3 min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary" /><p className="mt-2 text-[11px] leading-4 text-muted-foreground">This is for your internal analytics only. It is not shown to the applicant.</p><button onClick={() => setDeclined(true)} className="mt-5 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Confirm decline</button></div></div>}
    </div>
  )
}

// ─── CMHC DATA ───────────────────────────────────────────────────────────────

export function MortgageFormScreen({ onSubmit }: { onSubmit: (d: MortgageData) => void }) {
  const [form, setForm] = useState({ price: "", downPayment: "", downPctInput: "", province: "ON", amortization: "25", rateType: "fixed5", customRate: "", grossIncome: "", monthlyDebts: "", currentRent: "", propertyTax: "", condoFee: "", isFirstTimeBuyer: false, inToronto: false })
  const price = parseFloat(form.price.replace(/,/g, "")) || 0
  const down = parseFloat(form.downPayment.replace(/,/g, "")) || 0
  const downPct = price > 0 ? (down / price) * 100 : 0
  const rate = form.rateType === "custom" ? parseFloat(form.customRate) || 0 : RATE_MAP[form.rateType]
  const minDown = price <= 500000 ? price * 0.05 : price <= 999999 ? 25000 + (price - 500000) * 0.10 : price * 0.20
  const downShortfall = down > 0 && down < minDown ? minDown - down : 0
  const valid = price > 0 && down > 0 && rate > 0 && down < price && downShortfall === 0
  const insurance = valid ? cmhcPremium(price, down) : 0
  const costs = price > 0 && down > 0 ? closingCosts(price, form.province, form.inToronto, form.isFirstTimeBuyer, insurance) : null
  const totalUpfront = costs ? down + insurance + costs.lttNet + costs.legalFees + costs.titleInsurance + costs.homeInspection + costs.movingCosts : 0
  const fmtC = (n: number) => "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 })

  return (
    <div className="min-h-screen px-4 py-12" style={{ fontFamily: BODY }}>
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>Mortgage analysis</h2>
        <p className="text-sm text-muted-foreground mb-8">Payment, stress test, GDS/TDS, and rent vs. buy.</p>
        <div className="flex flex-col gap-5">
          <div className="rounded-lg border border-border bg-secondary/40 p-4">
            <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Property</div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Purchase price" placeholder="650,000" value={form.price} onChange={v => setForm({ ...form, price: v })} prefix="$" />
              <SelectInput label="Province" value={form.province} onChange={v => setForm({ ...form, province: v, inToronto: false })} options={[{ value: "ON", label: "Ontario" }, { value: "BC", label: "British Columbia" }, { value: "AB", label: "Alberta" }, { value: "QC", label: "Québec" }]} />
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <AmenityCheckbox label="First-time home buyer" checked={form.isFirstTimeBuyer} onChange={v => setForm({ ...form, isFirstTimeBuyer: v })} icon={<Home size={12} />} />
              {form.province === "ON" && <AmenityCheckbox label="Property is in the City of Toronto (adds municipal LTT)" checked={form.inToronto} onChange={v => setForm({ ...form, inToronto: v })} icon={<MapPin size={12} />} />}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-secondary/40 p-4">
            <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Down payment</div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <FormInput label="Amount ($)" placeholder="130,000" value={form.downPayment} onChange={v => {
                const raw = parseFloat(v.replace(/,/g, "")) || 0
                setForm({ ...form, downPayment: v, downPctInput: price > 0 && raw > 0 ? (raw / price * 100).toFixed(1) : "" })
              }} prefix="$" />
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 tracking-wide uppercase">Percentage</label>
                <div className="flex items-center">
                  <input type="number" step="0.1" min="0" max="100" placeholder={price > 0 && down > 0 ? downPct.toFixed(1) : "20.0"}
                    value={form.downPctInput}
                    onChange={e => {
                      const pct = parseFloat(e.target.value) || 0
                      const amt = price > 0 ? Math.round(price * pct / 100) : 0
                      setForm({ ...form, downPctInput: e.target.value, downPayment: amt > 0 ? amt.toString() : "" })
                    }}
                    className="w-full px-3 py-2.5 rounded-md border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    style={{ fontFamily: MONO }} />
                  <span className="ml-2 text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>
            {price > 0 && <div className="text-xs text-muted-foreground mb-2">Minimum required: <span className="font-semibold text-foreground" style={{ fontFamily: MONO }}>{fmtC(minDown)}</span> ({((minDown / price) * 100).toFixed(1)}%)</div>}
            {downShortfall > 0 && <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2"><AlertCircle size={12} className="shrink-0 mt-0.5" />Short by {fmtC(downShortfall)} — minimum down payment is {fmtC(minDown)}.</div>}
            {costs && (
              <div className="mt-4 pt-3 border-t border-border">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Estimated closing costs</div>
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Down payment</span><span style={{ fontFamily: MONO }} className="font-medium">{fmtC(down)}</span></div>
                  {insurance > 0 && <div className="flex justify-between"><span className="text-muted-foreground">CMHC mortgage insurance</span><span style={{ fontFamily: MONO }}>{fmtC(insurance)}</span></div>}
                  {costs.lttItems.map(i => (
                    <div key={i.label} className="flex justify-between">
                      <span className="text-muted-foreground">{i.label}{i.rebate ? <span className="text-green-600 ml-1">−{fmtC(i.rebate)} rebate</span> : null}</span>
                      <span style={{ fontFamily: MONO }}>{fmtC(i.value - (i.rebate || 0))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between"><span className="text-muted-foreground">Legal fees & disbursements</span><span style={{ fontFamily: MONO }}>{fmtC(costs.legalFees)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Title insurance</span><span style={{ fontFamily: MONO }}>{fmtC(costs.titleInsurance)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Home inspection</span><span style={{ fontFamily: MONO }}>{fmtC(costs.homeInspection)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Moving costs (est.)</span><span style={{ fontFamily: MONO }}>{fmtC(costs.movingCosts)}</span></div>
                  <div className="flex justify-between pt-2 border-t border-border mt-1 font-semibold">
                    <span className="text-foreground">Total cash needed</span>
                    <span style={{ fontFamily: MONO }} className="text-foreground">{fmtC(totalUpfront)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="rounded-lg border border-border bg-secondary/40 p-4">
            <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Rate & term</div>
            <div className="grid grid-cols-2 gap-4">
              <SelectInput label="Rate type" value={form.rateType} onChange={v => setForm({ ...form, rateType: v })} options={[{ value: "fixed5", label: "5-yr Fixed (5.49%)" }, { value: "fixed3", label: "3-yr Fixed (5.29%)" }, { value: "variable", label: "Variable (6.20%)" }, { value: "custom", label: "Enter my own" }]} />
              <SelectInput label="Amortization" value={form.amortization} onChange={v => setForm({ ...form, amortization: v })} options={["15","20","25","30"].map(v => ({ value: v, label: `${v} years` }))} />
            </div>
            {form.rateType === "custom" && <div className="mt-4"><FormInput label="Your rate" placeholder="5.25" value={form.customRate} onChange={v => setForm({ ...form, customRate: v })} suffix="%" type="number" /></div>}
          </div>
          <div className="rounded-lg border border-border bg-secondary/40 p-4">
            <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Monthly costs</div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Property tax /mo" placeholder="400" value={form.propertyTax} onChange={v => setForm({ ...form, propertyTax: v })} prefix="$" optional />
              <FormInput label="Condo fee /mo" placeholder="650" value={form.condoFee} onChange={v => setForm({ ...form, condoFee: v })} prefix="$" optional />
            </div>
          </div>
          <div className="rounded-lg border border-border bg-secondary/40 p-4">
            <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Affordability</div>
            <p className="text-xs text-muted-foreground mb-3">For GDS/TDS and rent vs. buy comparison.</p>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Gross income /yr" placeholder="95,000" value={form.grossIncome} onChange={v => setForm({ ...form, grossIncome: v })} prefix="$" optional />
              <FormInput label="Other debts /mo" placeholder="350" value={form.monthlyDebts} onChange={v => setForm({ ...form, monthlyDebts: v })} prefix="$" optional />
            </div>
            <div className="mt-4"><FormInput label="Current rent /mo" placeholder="2,100" value={form.currentRent} onChange={v => setForm({ ...form, currentRent: v })} prefix="$" optional /></div>
          </div>
          <PrimaryButton onClick={() => onSubmit({ price, down, province: form.province, amortization: parseInt(form.amortization), rate, grossIncome: parseFloat(form.grossIncome) || 0, monthlyDebts: parseFloat(form.monthlyDebts) || 0, currentRent: parseFloat(form.currentRent) || 0, propertyTax: parseFloat(form.propertyTax) || price * 0.01 / 12, condoFee: parseFloat(form.condoFee) || 0, isFirstTimeBuyer: form.isFirstTimeBuyer, inToronto: form.inToronto })} disabled={!valid} fullWidth>
            <Calculator size={15} />Analyze my mortgage
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}

export function MortgageResultsScreen({ data, onBack }: { data: MortgageData; onBack: () => void }) {
  const loan = data.price - data.down; const insurance = cmhcPremium(data.price, data.down)
  const insuredLoan = loan + insurance; const payment = calcMonthlyPayment(insuredLoan, data.rate, data.amortization)
  const sRate = stressTestRate(data.rate); const sPayment = calcMonthlyPayment(insuredLoan, sRate, data.amortization)
  const costs = closingCosts(data.price, data.province, data.inToronto, data.isFirstTimeBuyer, insurance)
  const heating = 150
  const totalOwning = payment + data.propertyTax + data.condoFee + heating
  const mGross = data.grossIncome / 12
  const gds = mGross > 0 ? ((payment + data.propertyTax + data.condoFee + heating) / mGross) * 100 : 0
  const tds = mGross > 0 ? ((payment + data.propertyTax + data.condoFee + heating + data.monthlyDebts) / mGross) * 100 : 0
  const passesStress = gds <= 39; const rentDiff = data.currentRent > 0 ? data.currentRent - totalOwning : null
  const fmt = (n: number) => "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 })

  return (
    <div className="min-h-screen px-4 py-12" style={{ fontFamily: BODY }}>
      <div className="max-w-lg mx-auto">
        <p className="text-xs text-muted-foreground mb-6">{fmt(data.price)} · {((data.down / data.price) * 100).toFixed(1)}% down · {data.rate}% · {data.amortization}yr</p>
        <SectionCard className="mb-4">
          <div className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Monthly payment</div>
          <div className="text-4xl font-bold text-foreground mb-1" style={{ fontFamily: MONO }}>{fmt(payment)}<span className="text-xl font-normal text-muted-foreground">/mo</span></div>
          <p className="text-xs text-muted-foreground mb-4">P&I · {data.rate}% · {data.amortization}-yr</p>
          <div className="flex flex-col gap-1.5 pt-4 border-t border-border">
            {[{ label: "Mortgage P&I", value: payment }, { label: "Property tax", value: data.propertyTax }, { label: "Condo fee", value: data.condoFee }, { label: "Heat (est.)", value: heating }].filter(i => i.value > 0).map(item => (
              <div key={item.label} className="flex justify-between text-xs"><span className="text-muted-foreground">{item.label}</span><span style={{ fontFamily: MONO }}>{fmt(item.value)}/mo</span></div>
            ))}
            <div className="flex justify-between pt-2 border-t border-border mt-1"><span className="text-xs font-semibold text-foreground">Total monthly</span><span className="text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>{fmt(totalOwning)}/mo</span></div>
          </div>
        </SectionCard>
        <div className={`rounded-xl border px-5 py-4 mb-4 ${passesStress ? "border-green-500/20 bg-green-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
          <div className="flex items-center justify-between">
            <div><div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Stress test</div>
              <div className="text-sm font-semibold text-foreground">{sRate.toFixed(2)}% qualifying rate</div>
              <div className="text-xs text-muted-foreground">{fmt(sPayment)}/mo at stress rate</div></div>
            <div className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${passesStress ? "bg-green-500/10 border-green-500/20 text-green-700" : "bg-amber-500/10 border-amber-500/20 text-amber-700"}`}>{passesStress ? "Likely qualifies" : data.grossIncome > 0 ? "May not qualify" : "Enter income"}</div>
          </div>
        </div>
        {insurance > 0 && (
          <SectionCard title="Mortgage insurance" className="mb-4">
            <div className="grid grid-cols-3 gap-3">
              {[{ label: "Premium", value: fmt(insurance) }, { label: "Total loan", value: fmt(insuredLoan) }, { label: "LTV", value: `${((loan / data.price) * 100).toFixed(1)}%` }].map(s => (
                <div key={s.label} className="text-center p-3 rounded-lg bg-secondary/60"><div className="text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
              ))}
            </div>
          </SectionCard>
        )}
        {data.grossIncome > 0 && (
          <SectionCard title="Affordability ratios" className="mb-4">
            {[{ key: "GDS", ratio: gds, limit: 39 }, ...(data.monthlyDebts > 0 ? [{ key: "TDS", ratio: tds, limit: 44 }] : [])].map(r => {
              const color = r.ratio <= r.limit * 0.85 ? "#22c55e" : r.ratio <= r.limit ? "#f59e0b" : "#ef4444"
              return (<div key={r.key} className="mb-4 last:mb-0"><div className="flex justify-between mb-1.5"><span className="text-xs font-medium text-foreground">{r.key}</span><span className="text-xs font-bold" style={{ fontFamily: MONO, color }}>{r.ratio.toFixed(1)}% / {r.limit}%</span></div><div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.07)" }}><div className="h-full rounded-full" style={{ width: `${Math.min(100, (r.ratio / r.limit) * 100)}%`, background: color }} /></div></div>)
            })}
          </SectionCard>
        )}
        <SectionCard title="Upfront costs" className="mb-4">
          <div className="flex justify-between text-xs mb-1.5"><span className="text-muted-foreground">Down payment</span><span style={{ fontFamily: MONO }}>{fmt(data.down)}</span></div>
          {insurance > 0 && <div className="flex justify-between text-xs mb-1.5"><span className="text-muted-foreground">CMHC mortgage insurance</span><span style={{ fontFamily: MONO }}>{fmt(insurance)}</span></div>}
          {costs.lttItems.map(i => (
            <div key={i.label} className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">{i.label}{i.rebate ? <span className="text-green-600 ml-1">(−{fmt(i.rebate)} FTHB rebate)</span> : null}</span>
              <span style={{ fontFamily: MONO }}>{fmt(i.value - (i.rebate || 0))}</span>
            </div>
          ))}
          <div className="flex justify-between text-xs mb-1.5"><span className="text-muted-foreground">Legal fees & disbursements</span><span style={{ fontFamily: MONO }}>{fmt(costs.legalFees)}</span></div>
          <div className="flex justify-between text-xs mb-1.5"><span className="text-muted-foreground">Title insurance</span><span style={{ fontFamily: MONO }}>{fmt(costs.titleInsurance)}</span></div>
          <div className="flex justify-between text-xs mb-1.5"><span className="text-muted-foreground">Home inspection</span><span style={{ fontFamily: MONO }}>{fmt(costs.homeInspection)}</span></div>
          <div className="flex justify-between text-xs mb-2"><span className="text-muted-foreground">Moving costs (est.)</span><span style={{ fontFamily: MONO }}>{fmt(costs.movingCosts)}</span></div>
          {data.isFirstTimeBuyer && costs.lttItems.some(i => i.rebate) && (
            <div className="text-[10px] text-green-700 bg-green-500/8 border border-green-500/15 rounded px-2 py-1 mb-2">First-time buyer LTT rebates applied above.</div>
          )}
          <div className="flex justify-between pt-2 border-t border-border mt-1">
            <span className="text-xs font-semibold text-foreground">Total cash needed</span>
            <span className="text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>{fmt(data.down + insurance + costs.lttNet + costs.legalFees + costs.titleInsurance + costs.homeInspection + costs.movingCosts)}</span>
          </div>
        </SectionCard>
        {rentDiff !== null && (
          <SectionCard title="Rent vs. buy" className="mb-6">
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[{ label: "Renting now", value: data.currentRent }, { label: "Owning (all-in)", value: totalOwning }].map((s, i) => (
                <div key={s.label} className={`p-4 rounded-lg border ${i === 0 && rentDiff > 0 ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/40"}`}>
                  <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
                  <div className="text-xl font-bold text-foreground" style={{ fontFamily: MONO }}>{fmt(s.value)}/mo</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-md bg-secondary text-muted-foreground">
              {rentDiff > 0 ? <><TrendingDown size={13} />Renting saves {fmt(rentDiff)}/mo vs. owning.</> : <><TrendingUp size={13} />Owning costs {fmt(Math.abs(rentDiff))}/mo more than renting.</>}
            </div>
          </SectionCard>
        )}
        <div className="flex gap-3">
          <button onClick={onBack} className="px-4 py-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"><Calculator size={14} />New scenario</button>
          <PrimaryButton fullWidth><Mail size={15} />Save analysis</PrimaryButton>
        </div>
        <p className="text-center text-xs text-muted-foreground/40 mt-4">Estimates only. Consult a mortgage professional.</p>
      </div>
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
