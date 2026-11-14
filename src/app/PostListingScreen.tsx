import { useState } from "react"
import {
  AlertCircle, ArrowRight, Building, Car, CheckCircle, ChevronDown,
  Droplets, FileText, Flame, Home, Package, Plus, Sparkles,
  Upload, Users, Wifi, X, Zap,
} from "lucide-react"
import { AmenityCheckbox, BODY, DISPLAY, FormInput, MONO, PrimaryButton, SelectInput, UNIT_TYPE_OPTS } from "./App"
import type { BrowserListing } from "./listingStore"

// ─── Constants ────────────────────────────────────────────────────────────────

const CMHC_RENTS: Record<string, { bachelor: number; one: number; two: number; three: number; source: string }> = {
  "Toronto":   { bachelor: 1412, one: 1748, two: 2078, three: 2489, source: "CMHC Rental Market Report — Fall 2024" },
  "Vancouver": { bachelor: 1605, one: 2070, two: 2678, three: 3295, source: "CMHC Rental Market Report — Fall 2024" },
  "Montreal":  { bachelor: 890,  one: 1092, two: 1364, three: 1647, source: "CMHC Rental Market Report — Fall 2024" },
  "Calgary":   { bachelor: 1250, one: 1605, two: 2010, three: 2430, source: "CMHC Rental Market Report — Fall 2024" },
  "Ottawa":    { bachelor: 1180, one: 1560, two: 1980, three: 2370, source: "CMHC Rental Market Report — Fall 2024" },
  "Edmonton":  { bachelor: 990,  one: 1280, two: 1590, three: 1960, source: "CMHC Rental Market Report — Fall 2024" },
}

const LEASE_TEMPLATES = [
  { id: "ontario-standard", label: "Ontario Standard Lease", desc: "Government-mandated form for residential tenancies in Ontario. Required by law for most rentals.", required: true },
  { id: "fixed-term", label: "Fixed-Term Agreement", desc: "Custom fixed-term lease with defined start and end date. Must still comply with the Residential Tenancies Act." },
  { id: "month-to-month", label: "Month-to-Month Agreement", desc: "Continues indefinitely until either party gives proper notice. Greater flexibility for both parties." },
]

const LEASE_TERM_OPTS = [
  { value: "month-to-month", label: "Month-to-month" },
  { value: "6",  label: "6 months" },
  { value: "12", label: "12 months (standard)" },
  { value: "18", label: "18 months" },
  { value: "24", label: "24 months" },
]

const BUILDING_AMENITY_OPTS = [
  "Elevator", "Parking garage", "Bike storage", "Storage lockers",
  "Gym / fitness centre", "Pool", "Rooftop terrace", "Concierge / security",
  "Party room / lounge", "EV charging", "Laundry (in-suite)", "Laundry (common)",
  "Air conditioning", "Pet friendly", "Visitor parking", "Wheelchair accessible",
]

const UNIT_AMENITY_OPTS = [
  "Gym / Fitness centre",
  "Pool",
  "Rooftop / Terrace",
  "Concierge / Security",
  "In-suite laundry",
  "Common laundry",
  "Bike storage",
  "EV charging",
  "Pet friendly",
]

// Mock rent roll data per building for auto-populate
const BUILDING_UNITS: Record<string, Array<{ unitNum: string; type: string; beds: string; baths: string; sqft: string; askingPrice: string }>> = {
  "592 Sherbourne St — Toronto": [
    { unitNum: "1204", type: "1br",     beds: "1", baths: "1", sqft: "618",  askingPrice: "2150" },
    { unitNum: "1205", type: "1br+den", beds: "1", baths: "1", sqft: "720",  askingPrice: "2400" },
    { unitNum: "801",  type: "2br",     beds: "2", baths: "2", sqft: "950",  askingPrice: "3100" },
    { unitNum: "902",  type: "bachelor",beds: "0", baths: "1", sqft: "450",  askingPrice: "1750" },
  ],
  "480 King St W — Toronto": [
    { unitNum: "612",  type: "1br+den", beds: "1", baths: "1", sqft: "820",  askingPrice: "2850" },
    { unitNum: "503",  type: "1br",     beds: "1", baths: "1", sqft: "680",  askingPrice: "2600" },
    { unitNum: "1101", type: "2br",     beds: "2", baths: "2", sqft: "1100", askingPrice: "3400" },
  ],
  "15 Queens Quay W — Toronto": [
    { unitNum: "2201", type: "2br",     beds: "2", baths: "2", sqft: "1050", askingPrice: "3400" },
    { unitNum: "1105", type: "1br",     beds: "1", baths: "1", sqft: "680",  askingPrice: "2600" },
  ],
  "220 Bain Ave — Toronto": [
    { unitNum: "Main", type: "3br",     beds: "3", baths: "2", sqft: "1400", askingPrice: "3100" },
  ],
  "1185 Eglinton Ave W — Toronto": [
    { unitNum: "301",  type: "1br",     beds: "1", baths: "1", sqft: "580",  askingPrice: "2400" },
    { unitNum: "205",  type: "bachelor",beds: "0", baths: "1", sqft: "420",  askingPrice: "1800" },
  ],
}

// Pre-approved additional lease terms per building
const BUILDING_PREAPPROVED_TERMS: Record<string, string> = {
  "592 Sherbourne St — Toronto": "No smoking on premises. Rooftop BBQ permitted in designated areas only. Quiet hours 11 pm–7 am.",
  "480 King St W — Toronto":     "Parking space assignment at landlord discretion. Guest parking maximum 48 hours. No commercial use of unit.",
  "15 Queens Quay W — Toronto":  "No short-term rentals permitted. Waterfront view corridor must remain unobstructed per condo corp rules.",
  "220 Bain Ave — Toronto":      "",
  "1185 Eglinton Ave W — Toronto": "Street parking only — no on-site lot. Tenant responsible for snow removal at unit entrance.",
}

const EXISTING_BUILDINGS = Object.keys(BUILDING_UNITS)

const ROOM_SLOTS = [
  "Living Room", "Kitchen", "Primary Bedroom", "Bathroom", "Secondary Bedroom / Den",
]

const BUILDING_PHOTO_SLOTS = [
  "Building Lobby", "Gym / Fitness", "Outdoor / Rooftop",
  "Model Suite — Living", "Model Suite — Kitchen", "Model Suite — Bedroom",
]

type UtilityKey = "electricity" | "water" | "gas" | "internet"
const UTILITY_CONFIG: Record<UtilityKey, { label: string; icon: React.ReactNode; avg: string }> = {
  electricity: { label: "Electricity",   icon: <Zap size={13} />,      avg: "$45–90/mo · avg $65" },
  water:       { label: "Water / Sewer", icon: <Droplets size={13} />, avg: "$25–55/mo · avg $38" },
  gas:         { label: "Gas / Heat",    icon: <Flame size={13} />,    avg: "$40–120/mo · avg $75" },
  internet:    { label: "Internet",      icon: <Wifi size={13} />,     avg: "$50–100/mo · avg $70" },
}

type AmenityMode = "included" | "addon" | "na"

interface RentRollUnit {
  id: string; unitNum: string; type: string; beds: string; baths: string; sqft: string; rent: string
  coTenancy: boolean; status: "occupied" | "available" | "not-ready"
}

type ListingType = "existing-unit" | "building" | "unit"

// ─── Component ────────────────────────────────────────────────────────────────

export function PostListingScreen({ onSubmit }: { onSubmit: (listing: BrowserListing) => void }) {
  const [listingType, setListingType] = useState<ListingType | null>(null)
  const [step, setStep] = useState(0)

  const [form, setForm] = useState({
    address: "", unit: "", unitType: "", sqft: "", beds: "", baths: "",
    yearBuilt: "", yearRenovated: "", price: "", leaseTerm: "12",
    totalUnits: "", availableUnits: "",
  })
  const pf = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  // Existing building
  const [selectedBuilding, setSelectedBuilding] = useState("")
  const autoPopulated = !!(selectedBuilding && form.unit && BUILDING_UNITS[selectedBuilding]?.find(u => u.unitNum === form.unit))

  // Lease structure
  const [allowCoTenancy, setAllowCoTenancy] = useState(false)

  // Building amenities
  const [buildingAmenities, setBuildingAmenities] = useState<string[]>([])
  const [buildingAmenityMode, setBuildingAmenityMode] = useState<Record<string, "included" | "addon">>({})
  const [buildingAmenityPrices, setBuildingAmenityPrices] = useState<Record<string, string>>({})

  // Photos
  const [floorPlanUploaded, setFloorPlanUploaded] = useState(false)
  const [uploadedRooms, setUploadedRooms] = useState<Set<number>>(new Set())
  const [uploadedBuildingPhotos, setUploadedBuildingPhotos] = useState<Set<number>>(new Set())

  // Parking & storage
  const [parkingAvail, setParkingAvail] = useState<boolean | null>(null)
  const [parkingIncluded, setParkingIncluded] = useState<boolean | null>(null)
  const [parkingPrice, setParkingPrice] = useState("")
  const [storageAvail, setStorageAvail] = useState<boolean | null>(null)
  const [storageIncluded, setStorageIncluded] = useState<boolean | null>(null)
  const [storagePrice, setStoragePrice] = useState("")

  // Unit amenities (included/addon/na)
  const [amenityModes, setAmenityModes] = useState<Record<string, AmenityMode>>({})
  const [amenityAddonPrices, setAmenityAddonPrices] = useState<Record<string, string>>({})

  // Utilities
  const [utilityMode, setUtilityMode] = useState<Record<UtilityKey, "included" | "tenant">>({
    electricity: "tenant", water: "included", gas: "tenant", internet: "tenant",
  })

  // Rent roll (buildings)
  const [rentRoll, setRentRoll] = useState<RentRollUnit[]>([
    { id: "u1", unitNum: "", type: "", beds: "", baths: "", sqft: "", rent: "", coTenancy: false, status: "available" },
  ])
  const [showReport, setShowReport] = useState(false)
  const [rollConfirmed, setRollConfirmed] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [unitPrices, setUnitPrices] = useState<Record<string, string>>({})

  // Verify + lease
  const [rentVerified, setRentVerified] = useState(false)
  const [rentCompliant, setRentCompliant] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [templateConfirmed, setTemplateConfirmed] = useState(false)
  const [additionalTerms, setAdditionalTerms] = useState("")

  // Derived
  const yearBuilt = parseInt(form.yearBuilt) || 0
  const isRentControlled = yearBuilt > 0 && yearBuilt < 2018
  const addrForCity = listingType === "existing-unit" ? selectedBuilding : form.address
  const detectedCity = Object.keys(CMHC_RENTS).find(c => addrForCity.toLowerCase().includes(c.toLowerCase())) ?? "Toronto"
  const cmhcData = CMHC_RENTS[detectedCity]

  const rollAvailable = rentRoll.filter(u => u.status === "available")
  const rollOccupied  = rentRoll.filter(u => u.status === "occupied")
  const rollNotReady  = rentRoll.filter(u => u.status === "not-ready")

  const isUnit = listingType === "unit" || listingType === "existing-unit"

  const listingForStorage = (): BrowserListing => {
    const existingAddress = selectedBuilding.split("—")[0]?.trim() || ""
    const existingCity = selectedBuilding.split("—")[1]?.trim() || "Toronto"
    const sourceAddress = listingType === "existing-unit" ? existingAddress : form.address
    const city = listingType === "existing-unit" ? existingCity : (Object.keys(CMHC_RENTS).find(c => sourceAddress.toLowerCase().includes(c.toLowerCase())) || "Toronto")
    return {
      id: `local-${Date.now()}`,
      address: sourceAddress || "New listing",
      unit: listingType === "building" ? "" : (form.unit ? `Unit ${form.unit}` : "Unit details pending"),
      city,
      rent: Number(form.price) || 0,
      status: "listed",
      applications: 0,
      image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=320&q=80",
      createdAt: new Date().toISOString(),
    }
  }

  const DONE: Record<ListingType, number> = { "existing-unit": 8, "building": 7, "unit": 8 }
  const STEP_LABELS: Record<ListingType, string[]> = {
    "existing-unit": ["Building & Unit", "Photos", "Parking & Amenities", "Utilities", "Asking Price", "Verify Rent", "Lease"],
    "building":      ["Building info", "Photos", "Rent roll", "Unit pricing", "Verify Rent", "Lease"],
    "unit":          ["Unit details", "Photos", "Parking & Amenities", "Utilities", "Asking Price", "Verify Rent", "Lease"],
  }
  const stepLabels = listingType ? STEP_LABELS[listingType] : []
  const doneStep   = listingType ? DONE[listingType] : 99

  const addRollUnit = () => setRentRoll(r => [
    ...r, { id: `u${Date.now()}`, unitNum: "", type: "", beds: "", baths: "", sqft: "", rent: "", coTenancy: false, status: "available" },
  ])
  const removeRollUnit = (id: string) => setRentRoll(r => r.filter(u => u.id !== id))
  const updateRollUnit = (id: string, k: keyof RentRollUnit, v: string | boolean) =>
    setRentRoll(r => r.map(u => u.id === id ? { ...u, [k]: v } : u))

  // ── Done ──
  if (step === doneStep) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ fontFamily: BODY }}>
      <div className="max-w-sm">
        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={28} className="text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: DISPLAY }}>
          {listingType === "building" ? "Building submitted for review" : "Listing submitted for review"}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Your {listingType === "existing-unit"
            ? `unit at ${selectedBuilding.split("—")[0].trim()}`
            : listingType === "building"
              ? `${form.totalUnits || "multi"}-unit building at ${form.address}`
              : `unit at ${form.address}`
          } will be verified and go live within 24 hours.
        </p>
        <PrimaryButton onClick={() => onSubmit(listingForStorage())} fullWidth>Go to my listings <ArrowRight size={15} /></PrimaryButton>
      </div>
    </div>
  )

  const BackBtn = ({ to }: { to: number }) => (
    <button onClick={() => setStep(to)} className="px-4 py-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground">Back</button>
  )

  // ── Lease structure section (used in unit step 1) ──
  const LeaseStructureSection = () => (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">Lease structure</div>

      {/* Offering term */}
      <div className="mb-4">
        <div className="text-xs font-medium text-muted-foreground mb-2">Offering term</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LEASE_TERM_OPTS.map(opt => (
            <button key={opt.value} onClick={() => pf("leaseTerm", opt.value)}
              className={`px-3 py-2.5 rounded-xl border-2 text-xs font-semibold text-left transition-all flex items-center justify-between ${form.leaseTerm === opt.value ? "border-primary/60 bg-primary/5 text-primary" : "border-border bg-card text-foreground hover:border-foreground/20"}`}>
              <span>{opt.label}</span>
              {form.leaseTerm === opt.value && <CheckCircle size={12} className="text-primary shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* Co-tenancy toggle */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div>
          <div className="text-sm font-semibold text-foreground">Open to co-tenancy</div>
          <div className="text-xs text-muted-foreground mt-0.5">Allow multiple co-applicants on a single shared lease</div>
        </div>
        <button onClick={() => setAllowCoTenancy(v => !v)}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${allowCoTenancy ? "bg-primary" : "bg-border"}`}>
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${allowCoTenancy ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
      {allowCoTenancy && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-violet-500/5 border border-violet-500/15 text-xs text-violet-700">
          <Users size={11} className="shrink-0" />
          Co-tenancy applications accepted. All co-applicants will be screened and sign the lease.
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen px-4 py-10" style={{ fontFamily: BODY }}>
      <div className="max-w-lg mx-auto">

        {/* Progress bar */}
        {step > 0 && listingType && (
          <div className="mb-8 flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {stepLabels.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5 shrink-0">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                  i < step - 1 ? "bg-primary/15 text-primary" :
                  i === step - 1 ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
                }`}>
                  {i < step - 1 ? <CheckCircle size={10} /> : <span>{i + 1}</span>}
                  {s}
                </div>
                {i < stepLabels.length - 1 && <div className={`w-3 h-px ${i < step - 1 ? "bg-primary/40" : "bg-border"}`} />}
              </div>
            ))}
          </div>
        )}

        {/* ─── STEP 0: Type selection ─── */}
        {step === 0 && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>What are you listing?</h2>
              <p className="text-sm text-muted-foreground">Choose the type of property to post.</p>
            </div>
            <div className="flex flex-col gap-4">
              {([
                { type: "existing-unit" as const, icon: <Plus size={20} className="text-primary" />,   label: "Add unit in existing building", desc: "Your building is already on rentre. Select it from your portfolio and add a newly available unit." },
                { type: "unit" as const,          icon: <Home size={20} className="text-primary" />,    label: "List a single unit",            desc: "One apartment, condo, or room — full address, floor plan, and pricing." },
                { type: "building" as const,      icon: <Building size={20} className="text-foreground" />, label: "List an entire building",  desc: "Multiple units under one roof. Ideal for property managers with several vacancies." },
              ]).map(opt => (
                <button key={opt.type} onClick={() => { setListingType(opt.type); setStep(1) }}
                  className="flex items-start gap-4 p-6 rounded-2xl border-2 border-border bg-card text-left transition-all hover:border-foreground/20 hover:shadow-md group">
                  <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center shrink-0">{opt.icon}</div>
                  <div className="flex-1">
                    <div className="text-base font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>{opt.label}</div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{opt.desc}</p>
                  </div>
                  <ArrowRight size={15} className="text-muted-foreground shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── STEP 1: Existing building ─── */}
        {step === 1 && listingType === "existing-unit" && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>Building & unit</h2>
            <p className="text-sm text-muted-foreground mb-6">Select the building, then pick a unit — details will auto-populate from the rent roll.</p>

            {/* Building dropdown */}
            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Select building</label>
              <div className="relative">
                <select value={selectedBuilding}
                  onChange={e => {
                    const b = e.target.value
                    setSelectedBuilding(b)
                    setAdditionalTerms(BUILDING_PREAPPROVED_TERMS[b] || "")
                    // Reset unit fields when building changes
                    setForm(f => ({ ...f, unit: "", unitType: "", sqft: "", beds: "", baths: "", price: "" }))
                  }}
                  className="w-full appearance-none px-3 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 pr-8">
                  <option value="">— Choose property —</option>
                  {EXISTING_BUILDINGS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {selectedBuilding && (
              <div className="flex flex-col gap-4">
                {/* Unit number — dropdown auto-populates from rent roll */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Unit number</label>
                  <div className="relative">
                    <select value={form.unit}
                      onChange={e => {
                        const unitNum = e.target.value
                        const found = BUILDING_UNITS[selectedBuilding]?.find(u => u.unitNum === unitNum)
                        if (found) {
                          setForm(f => ({ ...f, unit: unitNum, unitType: found.type, beds: found.beds, baths: found.baths, sqft: found.sqft, price: found.askingPrice }))
                        } else {
                          pf("unit", unitNum)
                        }
                      }}
                      className="w-full appearance-none px-3 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 pr-8">
                      <option value="">— Select unit —</option>
                      {(BUILDING_UNITS[selectedBuilding] || []).map(u => (
                        <option key={u.unitNum} value={u.unitNum}>
                          Unit {u.unitNum} · {UNIT_TYPE_OPTS.find(o => o.value === u.type)?.label || u.type} · asking ${parseInt(u.askingPrice).toLocaleString()}/mo
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                  {autoPopulated && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-semibold text-primary">
                      <Sparkles size={9} />Details auto-populated from rent roll
                    </div>
                  )}
                </div>

                {form.unit && (
                  <>
                    {/* Unit fields — pre-filled from roll, editable */}
                    <div className="grid grid-cols-2 gap-4">
                      <SelectInput label="Unit type" value={form.unitType} onChange={v => pf("unitType", v)} options={UNIT_TYPE_OPTS} />
                      <FormInput label="Sq ft" placeholder="650" value={form.sqft} onChange={v => pf("sqft", v)} suffix="sf" optional />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormInput label="Bedrooms" placeholder="1" value={form.beds} onChange={v => pf("beds", v)} type="number" />
                      <FormInput label="Bathrooms" placeholder="1" value={form.baths} onChange={v => pf("baths", v)} type="number" />
                    </div>
                    <LeaseStructureSection />
                  </>
                )}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <BackBtn to={0} />
              <PrimaryButton onClick={() => setStep(2)} disabled={!selectedBuilding || !form.unit || !form.unitType} fullWidth>
                Continue <ArrowRight size={15} />
              </PrimaryButton>
            </div>
          </div>
        )}

        {/* ─── STEP 1: Single unit ─── */}
        {step === 1 && listingType === "unit" && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>Unit details</h2>
            <p className="text-sm text-muted-foreground mb-6">Tell us about the unit you're listing.</p>
            <div className="flex flex-col gap-4">
              <FormInput label="Street address" placeholder="123 Main St, Toronto, ON" value={form.address} onChange={v => pf("address", v)} />
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Unit / suite" placeholder="Unit 1204" value={form.unit} onChange={v => pf("unit", v)} optional />
                <SelectInput label="Unit type" value={form.unitType} onChange={v => pf("unitType", v)} options={UNIT_TYPE_OPTS} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormInput label="Sq ft" placeholder="650" value={form.sqft} onChange={v => pf("sqft", v)} suffix="sf" optional />
                <FormInput label="Bedrooms" placeholder="1" value={form.beds} onChange={v => pf("beds", v)} type="number" />
                <FormInput label="Bathrooms" placeholder="1" value={form.baths} onChange={v => pf("baths", v)} type="number" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Year built" placeholder="2010" value={form.yearBuilt} onChange={v => pf("yearBuilt", v)} type="number" />
                <FormInput label="Year renovated" placeholder="2022" value={form.yearRenovated} onChange={v => pf("yearRenovated", v)} type="number" optional />
              </div>
              {yearBuilt > 0 && (
                <div className={`flex items-start gap-3 p-3.5 rounded-lg border text-xs ${isRentControlled ? "border-amber-500/25 bg-amber-500/5 text-amber-700" : "border-green-500/25 bg-green-500/5 text-green-700"}`}>
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  {isRentControlled ? "Built before Nov 15, 2018 — Ontario rent control applies." : "Built after Nov 15, 2018 — not subject to Ontario rent control."}
                </div>
              )}
              <LeaseStructureSection />
            </div>
            <div className="flex gap-3 mt-6">
              <BackBtn to={0} />
              <PrimaryButton onClick={() => setStep(2)} disabled={!form.address || !form.unitType} fullWidth>
                Continue <ArrowRight size={15} />
              </PrimaryButton>
            </div>
          </div>
        )}

        {/* ─── STEP 1: Building info ─── */}
        {step === 1 && listingType === "building" && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>Building details</h2>
            <p className="text-sm text-muted-foreground mb-6">Address, unit count, amenities, and optional rent roll upload.</p>
            <div className="flex flex-col gap-5">
              <FormInput label="Street address" placeholder="123 Main St, Toronto, ON" value={form.address} onChange={v => pf("address", v)} />
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Total units" placeholder="24" value={form.totalUnits} onChange={v => pf("totalUnits", v)} type="number" />
                <FormInput label="Available units" placeholder="6" value={form.availableUnits} onChange={v => pf("availableUnits", v)} type="number" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Year built" placeholder="2010" value={form.yearBuilt} onChange={v => pf("yearBuilt", v)} type="number" />
                <FormInput label="Year renovated" placeholder="2022" value={form.yearRenovated} onChange={v => pf("yearRenovated", v)} type="number" optional />
              </div>
              {yearBuilt > 0 && (
                <div className={`flex items-start gap-3 p-3.5 rounded-lg border text-xs ${isRentControlled ? "border-amber-500/25 bg-amber-500/5 text-amber-700" : "border-green-500/25 bg-green-500/5 text-green-700"}`}>
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  {isRentControlled ? "Built before Nov 15, 2018 — Ontario rent control applies." : "Built after Nov 15, 2018 — not subject to Ontario rent control."}
                </div>
              )}

              {/* Amenities with Included in Rent per amenity */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Amenities offered</div>
                <div className="flex flex-col gap-2">
                  {BUILDING_AMENITY_OPTS.map(a => {
                    const checked = buildingAmenities.includes(a)
                    const mode = buildingAmenityMode[a] ?? "included"
                    return (
                      <div key={a} className={`rounded-xl border transition-all ${checked ? "border-primary/20 bg-card" : "border-border bg-secondary/20"}`}>
                        <div className="flex items-center gap-3 px-4 py-3">
                          <button onClick={() => {
                            setBuildingAmenities(p => checked ? p.filter(x => x !== a) : [...p, a])
                            if (!checked) setBuildingAmenityMode(p => ({ ...p, [a]: "included" }))
                          }} className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${checked ? "bg-primary border-primary" : "border-border"}`}>
                            {checked && <CheckCircle size={10} className="text-white" />}
                          </button>
                          <span className="text-sm font-medium text-foreground flex-1">{a}</span>
                          {checked && (
                            <div className="flex gap-1.5">
                              {(["included", "addon"] as const).map(m => (
                                <button key={m} onClick={() => setBuildingAmenityMode(p => ({ ...p, [a]: m }))}
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${mode === m
                                    ? m === "included" ? "border-green-500/30 bg-green-500/10 text-green-700" : "border-amber-500/30 bg-amber-500/10 text-amber-700"
                                    : "border-border text-muted-foreground hover:text-foreground"}`}>
                                  {m === "included" ? "Included in rent" : "Add-on"}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {checked && mode === "addon" && (
                          <div className="px-4 pb-3 pl-11">
                            <div className="relative max-w-[180px]">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                              <input value={buildingAmenityPrices[a] || ""}
                                onChange={e => setBuildingAmenityPrices(p => ({ ...p, [a]: e.target.value }))}
                                placeholder="Monthly add-on price"
                                className="w-full pl-6 pr-3 py-2 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Additional lease terms for building */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Additional lease terms <span className="font-normal normal-case opacity-60">— optional, applies to all units</span></label>
                <textarea value={additionalTerms} onChange={e => setAdditionalTerms(e.target.value)} rows={3}
                  placeholder="e.g. No smoking on premises. Quiet hours 11 pm–7 am. Guest parking max 48 hours."
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                <p className="text-[10px] text-muted-foreground mt-1">These will pre-populate for all units listed under this building.</p>
              </div>

              {/* Rent roll upload */}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Upload rent roll <span className="normal-case font-normal opacity-60">— optional, Excel or PDF</span>
                </div>
                <label className={`flex flex-col items-center justify-center gap-3 p-5 rounded-xl border-2 border-dashed cursor-pointer transition-all ${uploadedFile ? "border-green-500/40 bg-green-500/5" : "border-border hover:border-foreground/25 bg-secondary/30"}`}>
                  <input type="file" accept=".xlsx,.xls,.csv,.pdf" className="hidden" onChange={e => setUploadedFile(e.target.files?.[0]?.name || null)} />
                  {uploadedFile ? (
                    <>
                      <CheckCircle size={20} className="text-green-600" />
                      <div className="text-center">
                        <div className="text-sm font-medium text-green-700">{uploadedFile}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">We'll parse unit details from this file.</div>
                      </div>
                      <button type="button" onClick={e => { e.preventDefault(); setUploadedFile(null) }} className="text-xs text-red-500 hover:underline">Remove</button>
                    </>
                  ) : (
                    <>
                      <Upload size={20} className="text-muted-foreground opacity-50" />
                      <div className="text-center">
                        <div className="text-sm font-medium text-foreground">Drop rent roll here</div>
                        <div className="text-xs text-muted-foreground">Excel (.xlsx, .csv) or PDF · Max 10 MB</div>
                      </div>
                      <div className="px-4 py-1.5 rounded-md border border-border bg-card text-xs font-medium text-muted-foreground">Browse files</div>
                    </>
                  )}
                </label>
                <p className="text-[10px] text-muted-foreground mt-1.5">Or continue to the next step to enter units manually.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <BackBtn to={0} />
              <PrimaryButton onClick={() => setStep(2)} disabled={!form.address || !form.totalUnits} fullWidth>
                Continue <ArrowRight size={15} />
              </PrimaryButton>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Unit/Existing — Photos ─── */}
        {step === 2 && isUnit && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>Photos</h2>
            <p className="text-sm text-muted-foreground mb-6">1 floor plan + minimum 5 room photos. rentre AI tags each room automatically.</p>

            <div className="mb-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Floor plan <span className="text-red-500">*</span></div>
              <button onClick={() => setFloorPlanUploaded(v => !v)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 border-dashed transition-all ${floorPlanUploaded ? "border-primary/40 bg-primary/5" : "border-border bg-secondary/30 hover:border-foreground/25"}`}>
                <div className={`w-16 h-14 rounded-lg flex items-center justify-center shrink-0 ${floorPlanUploaded ? "bg-primary/10" : "bg-secondary border border-dashed border-muted-foreground/30"}`}>
                  <FileText size={20} className={floorPlanUploaded ? "text-primary" : "text-muted-foreground opacity-40"} />
                </div>
                <div className="text-left flex-1">
                  {floorPlanUploaded ? (
                    <>
                      <div className="text-sm font-semibold text-foreground">floor_plan.png</div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-semibold text-primary"><Sparkles size={9} />AI tagged: Floor Plan</div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-medium text-foreground">Upload floor plan</div>
                      <div className="text-xs text-muted-foreground mt-0.5">PNG, PDF, or image · required</div>
                    </>
                  )}
                </div>
                {floorPlanUploaded ? <CheckCircle size={16} className="text-primary shrink-0" /> : <Upload size={14} className="text-muted-foreground shrink-0" />}
              </button>
            </div>

            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Room photos <span className="text-red-500">*</span>
              <span className="normal-case font-normal opacity-60 ml-1">— minimum 5</span>
            </div>
            <div className="flex flex-col gap-2 mb-3">
              {ROOM_SLOTS.map((roomLabel, i) => {
                const uploaded = uploadedRooms.has(i)
                return (
                  <button key={i}
                    onClick={() => setUploadedRooms(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next })}
                    className={`flex items-center gap-4 p-3.5 rounded-xl border-2 border-dashed transition-all ${uploaded ? "border-green-500/40 bg-green-500/5" : "border-border bg-secondary/30 hover:border-foreground/25"}`}>
                    <div className={`w-14 h-12 rounded-lg flex items-center justify-center shrink-0 ${uploaded ? "bg-green-500/15" : "bg-secondary"}`}>
                      {uploaded ? <CheckCircle size={18} className="text-green-600" /> : <span className="text-lg font-bold text-muted-foreground/20">{i + 1}</span>}
                    </div>
                    <div className="text-left flex-1">
                      {uploaded ? (
                        <>
                          <div className="text-sm font-medium text-foreground">photo_{i + 1}.jpg</div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-semibold text-green-700"><Sparkles size={9} />AI tagged: {roomLabel}</div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-medium text-foreground">Photo {i + 1}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">Suggested: {roomLabel}</div>
                        </>
                      )}
                    </div>
                    {!uploaded && <Upload size={13} className="text-muted-foreground shrink-0" />}
                  </button>
                )
              })}
              <button
                onClick={() => setUploadedRooms(prev => { const next = new Set(prev); next.add(ROOM_SLOTS.length + next.size); return next })}
                className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:border-foreground/30 transition-all">
                <Plus size={13} /> Add another photo
              </button>
            </div>

            <div className={`flex items-start gap-2.5 p-3 rounded-lg text-xs mb-6 ${uploadedRooms.size >= 5 && floorPlanUploaded ? "border border-green-500/20 bg-green-500/5 text-green-700" : "border border-amber-500/20 bg-amber-500/5 text-amber-700"}`}>
              <AlertCircle size={12} className="shrink-0 mt-0.5" />
              {uploadedRooms.size >= 5 && floorPlanUploaded
                ? `Floor plan + ${uploadedRooms.size} room photos uploaded. Looking good!`
                : `${!floorPlanUploaded ? "Floor plan required. " : ""}${Math.max(0, 5 - uploadedRooms.size) > 0 ? `${Math.max(0, 5 - uploadedRooms.size)} more room photo${Math.max(0, 5 - uploadedRooms.size) !== 1 ? "s" : ""} needed.` : ""}`
              }
            </div>

            <div className="flex gap-3">
              <BackBtn to={1} />
              <PrimaryButton onClick={() => setStep(3)} disabled={!floorPlanUploaded || uploadedRooms.size < 5} fullWidth>
                Continue <ArrowRight size={15} />
              </PrimaryButton>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Building — Building photos ─── */}
        {step === 2 && listingType === "building" && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>Building photos</h2>
            <p className="text-sm text-muted-foreground mb-6">Amenity photos and model suite images if available.</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {BUILDING_PHOTO_SLOTS.map((label, i) => {
                const uploaded = uploadedBuildingPhotos.has(i)
                const isModel = label.startsWith("Model Suite")
                return (
                  <button key={i}
                    onClick={() => setUploadedBuildingPhotos(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next })}
                    className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed transition-all aspect-square ${uploaded ? (isModel ? "border-primary/30 bg-primary/5" : "border-green-500/30 bg-green-500/5") : "border-border bg-secondary/30 hover:border-foreground/20"}`}>
                    {isModel && !uploaded && (
                      <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wide text-muted-foreground/50 bg-secondary px-1.5 py-0.5 rounded-full">Optional</span>
                    )}
                    {uploaded ? <CheckCircle size={20} className={isModel ? "text-primary" : "text-green-600"} /> : <Upload size={18} className="text-muted-foreground opacity-40" />}
                    <span className="text-[10px] font-semibold text-foreground text-center leading-tight">{label}</span>
                    {uploaded && <span className="text-[9px] text-muted-foreground">Uploaded</span>}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-3">
              <BackBtn to={1} />
              <PrimaryButton onClick={() => setStep(3)} fullWidth>Continue <ArrowRight size={15} /></PrimaryButton>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Unit/Existing — Parking, Storage & Amenities ─── */}
        {step === 3 && isUnit && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>Parking & amenities</h2>
            <p className="text-sm text-muted-foreground mb-6">Specify what's included in rent and what requires additional details.</p>

            {/* Parking */}
            <div className="mb-4 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center"><Car size={15} className="text-primary" /></div>
                <div className="text-sm font-bold text-foreground">Parking</div>
              </div>
              <div className="flex gap-3 mb-4">
                {[true, false].map(v => (
                  <button key={String(v)} onClick={() => { setParkingAvail(v); if (!v) { setParkingIncluded(null); setParkingPrice("") } }}
                    className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${parkingAvail === v ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-foreground/20"}`}>
                    {v ? "Available" : "Not available"}
                  </button>
                ))}
              </div>
              {parkingAvail === true && (
                <>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Included in rent?</div>
                  <div className="flex gap-3 mb-3">
                    {[true, false].map(v => (
                      <button key={String(v)} onClick={() => { setParkingIncluded(v); if (v) setParkingPrice("") }}
                        className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${parkingIncluded === v ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-foreground/20"}`}>
                        {v ? "Yes, included" : "No — add-on"}
                      </button>
                    ))}
                  </div>
                  {parkingIncluded === false && <FormInput label="Monthly parking price" placeholder="150" value={parkingPrice} onChange={setParkingPrice} prefix="$" />}
                </>
              )}
            </div>

            {/* Storage */}
            <div className="mb-4 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center"><Package size={15} className="text-primary" /></div>
                <div className="text-sm font-bold text-foreground">Storage locker</div>
              </div>
              <div className="flex gap-3 mb-4">
                {[true, false].map(v => (
                  <button key={String(v)} onClick={() => { setStorageAvail(v); if (!v) { setStorageIncluded(null); setStoragePrice("") } }}
                    className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${storageAvail === v ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-foreground/20"}`}>
                    {v ? "Available" : "Not available"}
                  </button>
                ))}
              </div>
              {storageAvail === true && (
                <>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Included in rent?</div>
                  <div className="flex gap-3 mb-3">
                    {[true, false].map(v => (
                      <button key={String(v)} onClick={() => { setStorageIncluded(v); if (v) setStoragePrice("") }}
                        className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${storageIncluded === v ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-foreground/20"}`}>
                        {v ? "Yes, included" : "No — add-on"}
                      </button>
                    ))}
                  </div>
                  {storageIncluded === false && <FormInput label="Monthly storage price" placeholder="45" value={storagePrice} onChange={setStoragePrice} prefix="$" />}
                </>
              )}
            </div>

            {/* Building amenities — Included / Add-on / N/A */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="text-sm font-bold text-foreground mb-1">Building amenities</div>
              <p className="text-xs text-muted-foreground mb-4">Select all that apply and specify if each is included in rent.</p>
              <div className="flex flex-col gap-2">
                {UNIT_AMENITY_OPTS.map(a => {
                  const mode = amenityModes[a]
                  return (
                    <div key={a} className={`rounded-xl border transition-all ${mode && mode !== "na" ? "border-border bg-card" : mode === "na" ? "border-border bg-secondary/20 opacity-60" : "border-dashed border-border"}`}>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <span className="text-sm font-medium text-foreground flex-1">{a}</span>
                        <div className="flex gap-1.5 shrink-0">
                          {(["included", "addon", "na"] as AmenityMode[]).map(m => (
                            <button key={m} onClick={() => setAmenityModes(p => ({ ...p, [a]: p[a] === m ? undefined as any : m }))}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${mode === m
                                ? m === "included" ? "border-green-500/30 bg-green-500/10 text-green-700"
                                  : m === "addon" ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
                                  : "border-border bg-secondary text-muted-foreground"
                                : "border-border text-muted-foreground hover:text-foreground"}`}>
                              {m === "included" ? "Included" : m === "addon" ? "Add-on" : "N/A"}
                            </button>
                          ))}
                        </div>
                      </div>
                      {mode === "addon" && (
                        <div className="px-4 pb-3">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                            <input value={amenityAddonPrices[a] || ""}
                              onChange={e => setAmenityAddonPrices(p => ({ ...p, [a]: e.target.value }))}
                              placeholder="Monthly add-on price"
                              className="w-full pl-6 pr-3 py-2 rounded-lg border border-border bg-secondary/50 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <BackBtn to={2} />
              <PrimaryButton onClick={() => setStep(4)} disabled={parkingAvail === null || storageAvail === null} fullWidth>
                Continue <ArrowRight size={15} />
              </PrimaryButton>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Building — Rent Roll ─── */}
        {step === 3 && listingType === "building" && !showReport && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>Rent roll</h2>
            <p className="text-sm text-muted-foreground mb-6">Enter all units. Asking price is set per unit in the next step.</p>

            <div className="flex flex-col gap-3 mb-4">
              {rentRoll.map((unit, idx) => (
                <div key={unit.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Unit {idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <select value={unit.status} onChange={e => updateRollUnit(unit.id, "status", e.target.value)}
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border focus:outline-none appearance-none ${unit.status === "available" ? "border-green-500/30 bg-green-500/8 text-green-700" : unit.status === "occupied" ? "border-border bg-secondary text-muted-foreground" : "border-amber-500/30 bg-amber-500/8 text-amber-700"}`}>
                        <option value="available">Available</option>
                        <option value="occupied">Occupied</option>
                        <option value="not-ready">Not ready</option>
                      </select>
                      <button onClick={() => rentRoll.length > 1 && removeRollUnit(unit.id)} disabled={rentRoll.length === 1}
                        className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-500 disabled:opacity-30">
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input value={unit.unitNum} onChange={e => updateRollUnit(unit.id, "unitNum", e.target.value)} placeholder="Unit #"
                      className="px-2.5 py-2 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
                    <select value={unit.type} onChange={e => updateRollUnit(unit.id, "type", e.target.value)}
                      className="px-2.5 py-2 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 appearance-none">
                      <option value="">Type</option>
                      {UNIT_TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { field: "beds" as const, placeholder: "Beds" },
                      { field: "baths" as const, placeholder: "Baths" },
                      { field: "sqft" as const, placeholder: "Sq ft" },
                    ].map(({ field, placeholder }) => (
                      <input key={field} value={unit[field] as string} onChange={e => updateRollUnit(unit.id, field, e.target.value)} placeholder={placeholder}
                        className="px-2 py-2 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
                    ))}
                  </div>
                  {/* Co-tenancy per unit */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">Open to co-tenancy</span>
                    <button onClick={() => updateRollUnit(unit.id, "coTenancy", !unit.coTenancy)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${unit.coTenancy ? "bg-primary" : "bg-border"}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${unit.coTenancy ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={addRollUnit}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg px-4 py-3 w-full justify-center mb-5 transition-all hover:border-foreground/30">
              <Plus size={13} /> Add unit
            </button>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Available", value: rollAvailable.length, color: "text-green-700", bg: "bg-green-500/8 border-green-500/20" },
                { label: "Occupied",  value: rollOccupied.length,  color: "text-foreground", bg: "bg-secondary border-border" },
                { label: "Not ready", value: rollNotReady.length,  color: "text-amber-700", bg: "bg-amber-500/8 border-amber-500/20" },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border p-3 text-center ${s.bg}`}>
                  <div className={`text-xl font-bold ${s.color}`} style={{ fontFamily: MONO }}>{s.value}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <BackBtn to={2} />
              <PrimaryButton onClick={() => setShowReport(true)} disabled={rollAvailable.length === 0} fullWidth>
                <FileText size={15} /> Generate report
              </PrimaryButton>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Building — Rent Roll Report ─── */}
        {step === 3 && listingType === "building" && showReport && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><FileText size={18} className="text-primary" /></div>
              <div>
                <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: DISPLAY }}>Rent Roll Report</h2>
                <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden mb-4">
              <div className="px-5 py-3 border-b border-border bg-secondary/40">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Building summary</span>
              </div>
              <div className="px-5 py-4">
                <div className="text-base font-bold text-foreground mb-1">{form.address}</div>
                <div className="text-xs text-muted-foreground mb-4">{isRentControlled ? "Rent controlled" : "Not rent controlled"}</div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Available", value: rollAvailable.length, accent: true },
                    { label: "Occupied",  value: rollOccupied.length },
                    { label: "Not ready", value: rollNotReady.length },
                  ].map(s => (
                    <div key={s.label} className={`rounded-lg p-3 text-center border ${s.accent ? "border-green-500/25 bg-green-500/8" : "border-border bg-secondary/40"}`}>
                      <div className={`text-lg font-bold ${s.accent ? "text-green-700" : "text-foreground"}`} style={{ fontFamily: MONO }}>{s.value}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden mb-4">
              <div className="px-5 py-3 border-b border-border bg-green-500/5">
                <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Available units ({rollAvailable.length}) — asking prices set in next step</span>
              </div>
              <div className="divide-y divide-border">
                {rollAvailable.map(u => (
                  <div key={u.id} className="px-5 py-3 text-xs flex items-center gap-3">
                    <span className="font-semibold text-foreground w-16 shrink-0">{u.unitNum || "—"}</span>
                    <span className="text-muted-foreground flex-1">{UNIT_TYPE_OPTS.find(o => o.value === u.type)?.label || "—"}</span>
                    <span className="text-muted-foreground">{u.beds ? `${u.beds}bd` : "—"}</span>
                    <span className="text-muted-foreground">{u.baths ? `${u.baths}ba` : "—"}</span>
                    <span className="text-muted-foreground">{u.sqft ? `${u.sqft}sf` : "—"}</span>
                    {u.coTenancy && (
                      <span className="px-2 py-0.5 rounded-full border border-violet-500/20 bg-violet-500/8 text-[9px] font-semibold text-violet-700">Co-tenancy</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card px-5 py-4 mb-6">
              <AmenityCheckbox
                label="I confirm this rent roll accurately reflects the current status of all units. Available units will be listed on rentre for tenant applications."
                checked={rollConfirmed} onChange={setRollConfirmed} />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowReport(false)} className="px-4 py-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground">Edit roll</button>
              <PrimaryButton onClick={() => { setStep(4); setShowReport(false) }} disabled={!rollConfirmed} fullWidth>
                Confirm & continue <ArrowRight size={15} />
              </PrimaryButton>
            </div>
          </div>
        )}

        {/* ─── STEP 4: Unit/Existing — Utilities ─── */}
        {step === 4 && isUnit && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>Utilities</h2>
            <p className="text-sm text-muted-foreground mb-6">Set what's covered. Toronto averages shown when tenant pays.</p>
            <div className="flex flex-col gap-3 mb-6">
              {(Object.entries(UTILITY_CONFIG) as [UtilityKey, typeof UTILITY_CONFIG[UtilityKey]][]).map(([key, cfg]) => (
                <div key={key} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">{cfg.icon}</div>
                      <span className="text-sm font-semibold text-foreground">{cfg.label}</span>
                    </div>
                    <div className="flex gap-2">
                      {(["included", "tenant"] as const).map(mode => (
                        <button key={mode} onClick={() => setUtilityMode(p => ({ ...p, [key]: mode }))}
                          className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${utilityMode[key] === mode
                            ? mode === "included" ? "border-green-500/30 bg-green-500/8 text-green-700" : "border-amber-500/30 bg-amber-500/8 text-amber-700"
                            : "border-border text-muted-foreground hover:text-foreground"}`}>
                          {mode === "included" ? "Included" : "Tenant pays"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {utilityMode[key] === "tenant" && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 text-xs text-muted-foreground">
                      <AlertCircle size={11} className="shrink-0 text-amber-500" />
                      Toronto avg: <span className="font-semibold text-foreground ml-1">{cfg.avg}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <BackBtn to={3} />
              <PrimaryButton onClick={() => setStep(5)} fullWidth>Continue <ArrowRight size={15} /></PrimaryButton>
            </div>
          </div>
        )}

        {/* ─── STEP 4: Building — Asking price per unit ─── */}
        {step === 4 && listingType === "building" && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>Asking prices</h2>
            <p className="text-sm text-muted-foreground mb-6">Set the asking price for each available unit. Tenants see this when browsing.</p>
            <div className="flex flex-col gap-3 mb-6">
              {rollAvailable.map(unit => (
                <div key={unit.id} className="rounded-xl border border-border bg-card px-4 py-3.5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">{unit.unitNum || `Unit ${unit.id}`}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {UNIT_TYPE_OPTS.find(o => o.value === unit.type)?.label || "—"}
                      {unit.beds ? ` · ${unit.beds} bed` : ""}
                      {unit.baths ? ` · ${unit.baths} bath` : ""}
                      {unit.sqft ? ` · ${unit.sqft} sf` : ""}
                      {unit.coTenancy ? " · Co-tenancy" : ""}
                    </div>
                  </div>
                  <div className="relative w-32 shrink-0">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                    <input value={unitPrices[unit.id] || ""}
                      onChange={e => setUnitPrices(p => ({ ...p, [unit.id]: e.target.value }))}
                      placeholder="Asking price"
                      className="w-full pl-7 pr-2 py-2 rounded-lg border border-border bg-card text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 text-right" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <BackBtn to={3} />
              <PrimaryButton onClick={() => setStep(5)} disabled={rollAvailable.some(u => !unitPrices[u.id])} fullWidth>
                Continue <ArrowRight size={15} />
              </PrimaryButton>
            </div>
          </div>
        )}

        {/* ─── STEP 5: Unit/Existing — Asking price ─── */}
        {step === 5 && isUnit && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>Asking price</h2>
            <p className="text-sm text-muted-foreground mb-6">The price tenants will see when browsing. You can adjust or negotiate at offer stage.</p>

            <div className="mb-6">
              <FormInput label="Asking price" placeholder="2,200" value={form.price} onChange={v => pf("price", v)} prefix="$" />
              <p className="text-xs text-muted-foreground mt-2">
                Offering term: <strong className="text-foreground">{LEASE_TERM_OPTS.find(o => o.value === form.leaseTerm)?.label || form.leaseTerm}</strong>
                {allowCoTenancy ? " · Co-tenancy accepted" : ""}
                <button onClick={() => setStep(1)} className="ml-2 text-primary underline underline-offset-2">Edit</button>
              </p>
            </div>

            <div className="flex gap-3">
              <BackBtn to={4} />
              <PrimaryButton onClick={() => setStep(6)} disabled={!form.price} fullWidth>Continue <ArrowRight size={15} /></PrimaryButton>
            </div>
          </div>
        )}

        {/* ─── STEP 5 (building) / STEP 6 (unit) — Verify rent ─── */}
        {((step === 5 && listingType === "building") || (step === 6 && isUnit)) && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>Verify asking price</h2>
            <p className="text-sm text-muted-foreground mb-6">CMHC market average rents for your reference.</p>
            <div className="rounded-xl border border-border bg-card overflow-hidden mb-4">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CMHC avg rents · {detectedCity}</span>
                <span className="text-[10px] text-muted-foreground" style={{ fontFamily: MONO }}>Fall 2024</span>
              </div>
              <div className="divide-y divide-border">
                {[
                  { label: "Bachelor",  value: cmhcData.bachelor },
                  { label: "1 Bedroom", value: cmhcData.one },
                  { label: "2 Bedroom", value: cmhcData.two },
                  { label: "3 Bedroom", value: cmhcData.three },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-5 py-3.5">
                    <span className="text-sm text-foreground">{row.label}</span>
                    <span className="text-sm font-bold text-foreground" style={{ fontFamily: MONO }}>
                      ${row.value.toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/mo</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-secondary/30 border-t border-border">
                <p className="text-[10px] text-muted-foreground">{cmhcData.source}</p>
              </div>
            </div>
            {isRentControlled && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-5 py-4 mb-4 flex items-start gap-3">
                <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">Built before Nov 15, 2018 — Ontario rent control applies under the Residential Tenancies Act.</p>
              </div>
            )}
            <div className="rounded-xl border border-border bg-card px-5 py-4 mb-6">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Landlord confirmations</div>
              <div className="flex flex-col gap-3">
                <AmenityCheckbox label="I confirm the asking price is accurate and represents the true net rent." checked={rentVerified} onChange={setRentVerified} />
                <AmenityCheckbox label="I confirm this rent complies with all applicable provincial tenancy laws." checked={rentCompliant} onChange={setRentCompliant} />
              </div>
            </div>
            <div className="flex gap-3">
              <BackBtn to={isUnit ? 5 : 4} />
              <PrimaryButton onClick={() => setStep(isUnit ? 7 : 6)} disabled={!rentVerified || !rentCompliant} fullWidth>
                Continue <ArrowRight size={15} />
              </PrimaryButton>
            </div>
          </div>
        )}

        {/* ─── STEP 6 (building) / STEP 7 (unit) — Lease template + additional terms ─── */}
        {((step === 6 && listingType === "building") || (step === 7 && isUnit)) && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: DISPLAY }}>Lease template</h2>
            <p className="text-sm text-muted-foreground mb-6">Select the lease type and confirm any additional terms.</p>

            <div className="flex flex-col gap-3 mb-5">
              {LEASE_TEMPLATES.map(t => (
                <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
                  className={`flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all ${selectedTemplate === t.id ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:border-foreground/15"}`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${selectedTemplate === t.id ? "border-primary" : "border-border"}`}>
                    {selectedTemplate === t.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">{t.label}</span>
                      {t.required && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-bold text-primary border border-primary/20">Required in ON</span>}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Additional lease terms */}
            <div className="rounded-xl border border-border bg-card p-5 mb-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-sm font-bold text-foreground">Additional lease terms</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {listingType === "existing-unit" && additionalTerms
                      ? "Pre-approved terms for this building — review and edit as needed."
                      : "Custom clauses to be appended to the standard lease."}
                  </p>
                </div>
                {listingType === "existing-unit" && additionalTerms && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-primary shrink-0 ml-3">
                    <Sparkles size={9} />Building pre-approved
                  </span>
                )}
              </div>
              <textarea value={additionalTerms} onChange={e => setAdditionalTerms(e.target.value)} rows={4}
                placeholder="e.g. No smoking on premises. Quiet hours 11 pm–7 am. Landlord's right of entry with 24-hour notice. No subletting without written consent."
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-secondary/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              <p className="text-[10px] text-muted-foreground mt-2">These terms will be appended to the selected lease template and signed by both parties.</p>
            </div>

            <div className="rounded-xl border border-border bg-card px-5 py-4 mb-6">
              <AmenityCheckbox
                label="I confirm I will use this lease template with my tenant and all terms comply with the Residential Tenancies Act."
                checked={templateConfirmed} onChange={setTemplateConfirmed} />
            </div>

            <div className="flex gap-3">
              <BackBtn to={isUnit ? 6 : 5} />
              <PrimaryButton onClick={() => setStep(isUnit ? 8 : 7)} disabled={!selectedTemplate || !templateConfirmed} fullWidth>
                Submit listing <ArrowRight size={15} />
              </PrimaryButton>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
