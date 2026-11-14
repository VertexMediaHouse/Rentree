import { ExternalLink, Info, ShieldCheck, Umbrella } from "lucide-react"
import { BODY, DISPLAY, MONO } from "../App"

/**
 * Tenant insurance education. Deliberately not a quote engine and not a referral: Rentre earns
 * nothing from these links, insurance is a regulated product, and brokering it would need a
 * licence. Providers are listed alphabetically so the order implies no ranking.
 */

const COVERS = [
  { label: "Your belongings", body: "Furniture, electronics, clothing and bikes, against fire, theft, water damage and vandalism — in the unit and often away from it." },
  { label: "Liability", body: "If you accidentally damage the building or injure someone. This is the part landlords care about: an overflowing tub reaching three units below is a six-figure claim." },
  { label: "Additional living expenses", body: "Hotel and meals if the unit becomes unliveable after an insured loss, while repairs are done." },
]

const NOT_COVERED = [
  "The building itself — that is the landlord's policy, and it does not cover your belongings.",
  "Flood and sewer backup, usually an add-on rather than standard coverage.",
  "Earthquake, almost always a separate rider.",
  "High-value jewellery, art or instruments beyond a per-item cap, without a scheduled rider.",
  "Anything related to a roommate not named on the policy.",
]

const PROVIDERS = [
  { name: "APOLLO Insurance", desc: "Online-only tenant policies, instant certificate.", url: "https://apollocover.com/tenant-insurance" },
  { name: "Aviva Canada", desc: "Broker-distributed tenant insurance.", url: "https://www.avivacanada.com/tenant-insurance" },
  { name: "Desjardins", desc: "Tenant coverage, bundles with auto.", url: "https://www.desjardins.com/ca/insurance/home/tenant/" },
  { name: "Duuo by Co-operators", desc: "Monthly, cancel-anytime tenant policies.", url: "https://www.duuo.ca/tenant-insurance" },
  { name: "Intact Insurance", desc: "Tenant packages through brokers nationwide.", url: "https://www.intact.ca/en/personal-insurance/home/tenant.html" },
  { name: "Square One", desc: "Build-your-own coverage, no bundled extras.", url: "https://www.squareone.ca/rental-insurance" },
  { name: "TD Insurance", desc: "Tenant insurance, direct and bundled.", url: "https://www.tdinsurance.com/products-services/home-insurance/tenant-insurance" },
]

const TIPS = [
  "Most Ontario leases require it, and the standard lease has a space for proof. Expect to show a certificate before you get keys.",
  "Liability limits usually start at $1,000,000. Some landlords require $2,000,000 — check the lease before you buy.",
  "Replacement cost beats actual cash value: the latter pays out the depreciated value of a five-year-old laptop, not what a new one costs.",
  "Each roommate needs their own policy, or all names must be on one. An unnamed roommate is simply not covered.",
  "A higher deductible lowers the premium. Pick one you could actually pay the same week as a loss.",
]

export function InsurancePage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 md:px-8" style={{ fontFamily: BODY }}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 flex items-center gap-2">
          <Umbrella size={15} className="text-primary" />
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground" style={{ fontFamily: MONO }}>
            Renter education · Tenant insurance
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground md:text-4xl" style={{ fontFamily: DISPLAY }}>
          Tenant insurance
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Your landlord's policy covers the building, not your things and not your liability. Most
          Ontario leases require you to carry your own. Typical cost is roughly $15–$35 a month
          depending on coverage, location and deductible.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {COVERS.map(({ label, body }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="shrink-0 text-primary" />
                <h2 className="text-[13px] font-semibold leading-tight text-foreground">{label}</h2>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-9 mb-2.5 text-sm font-semibold text-foreground">What it usually does not cover</h2>
        <ul className="space-y-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
          {NOT_COVERED.map(item => (
            <li key={item} className="flex gap-2.5 text-[13px] leading-relaxed text-muted-foreground">
              <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-muted-foreground/40" />
              {item}
            </li>
          ))}
        </ul>

        <h2 className="mt-9 mb-2.5 text-sm font-semibold text-foreground">Before you buy</h2>
        <ul className="space-y-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
          {TIPS.map(item => (
            <li key={item} className="flex gap-2.5 text-[13px] leading-relaxed text-muted-foreground">
              <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-primary/50" />
              {item}
            </li>
          ))}
        </ul>

        <h2 className="mt-9 mb-1 text-sm font-semibold text-foreground">Providers offering tenant insurance in Ontario</h2>
        <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
          Listed alphabetically. Rentre is not an insurance broker, receives nothing for these
          links, and does not recommend one over another — compare quotes yourself.
        </p>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {PROVIDERS.map(({ name, desc, url }) => (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-secondary/50">
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight text-foreground">{name}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{desc}</p>
              </div>
              <ExternalLink size={13} className="shrink-0 text-muted-foreground/40 transition-colors group-hover:text-primary" />
            </a>
          ))}
        </div>

        <div className="mt-6 flex items-start gap-2 rounded-xl border border-border bg-secondary/20 px-4 py-3">
          <Info size={12} className="mt-0.5 shrink-0 text-muted-foreground/60" />
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            General information only, not insurance advice, and not an offer of insurance. Rentre is
            not licensed to sell or advise on insurance. Coverage, exclusions, limits and pricing
            vary by insurer and by policy — read the wording, and speak to a licensed broker or the
            insurer before buying.
          </p>
        </div>
      </div>
    </div>
  )
}
