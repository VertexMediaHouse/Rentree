import { ExternalLink, Info, Scale, ShieldAlert } from "lucide-react"
import { BODY, DISPLAY, MONO } from "../App"

/**
 * Ontario-specific tenant rights. The landing page already lists every province's governing act;
 * this page is the next level down — the rules an Ontario renter actually hits — because Ontario
 * is the launch market. Every figure links to the Government of Ontario or the LTB rather than
 * being restated as fact here, since rent-increase guidelines and form numbers change yearly.
 */

const RIGHTS = [
  {
    title: "Rent increases are capped, and need 90 days' notice",
    body: "For most units first occupied before 15 November 2018, annual increases are limited to the provincial rent increase guideline, and your landlord must give 90 days' written notice on Form N1. Units first occupied on or after that date are exempt from the guideline — the notice period still applies.",
    link: { label: "Rent increase guideline — Ontario.ca", url: "https://www.ontario.ca/page/rent-increase-guideline" },
  },
  {
    title: "A deposit is last month's rent — never damage",
    body: "An Ontario landlord may collect a rent deposit of at most one month's rent, and it must be applied to the final month of your tenancy. Damage deposits, pet deposits and key deposits above the actual key replacement cost are not legal.",
    link: { label: "Deposits and the RTA — Ontario.ca", url: "https://www.ontario.ca/document/residential-tenancies-act-policy-guidelines" },
  },
  {
    title: "Only the Landlord and Tenant Board can evict you",
    body: "A landlord cannot change your locks, remove your belongings, or make you leave on their own. Eviction requires an LTB order after a hearing you have the right to attend and dispute.",
    link: { label: "Landlord and Tenant Board", url: "https://tribunalsontario.ca/ltb/" },
  },
  {
    title: "24 hours' written notice before entry",
    body: "Except in an emergency, your landlord must give at least 24 hours' written notice stating the reason and a time between 8am and 8pm. Showings to prospective tenants follow the same rule.",
    link: { label: "Entering the rental unit — Ontario.ca", url: "https://www.ontario.ca/page/renting-ontario-your-rights" },
  },
  {
    title: "Repairs are the landlord's obligation, regardless of the lease",
    body: "Your landlord must keep the unit in good repair and fit for habitation, and comply with health, safety and maintenance standards. A lease clause shifting that duty onto you is void.",
    link: { label: "Maintenance and repairs — Ontario.ca", url: "https://www.ontario.ca/page/renting-ontario-your-rights" },
  },
  {
    title: "The standard lease is mandatory",
    body: "For most private residential tenancies signed on or after 30 April 2018, the landlord must use the Government of Ontario standard lease. If they do not provide one when you ask in writing, you may be able to withhold one month's rent.",
    link: { label: "Standard lease — Ontario.ca", url: "https://www.ontario.ca/page/guide-ontarios-standard-lease" },
  },
  {
    title: "You cannot be screened on protected grounds",
    body: "Under the Human Rights Code a landlord may ask about income, credit history and references, but may not refuse you based on race, place of origin, citizenship, family or marital status, disability, age (16+), sexual orientation, gender identity or receipt of public assistance.",
    link: { label: "Human Rights Code and rental housing — OHRC", url: "https://www.ohrc.on.ca/en/iv-human-rights-and-rental-housing" },
  },
  {
    title: "Ending a tenancy takes 60 days, to a period's end",
    body: "To end a monthly or yearly tenancy you give 60 days' written notice on Form N9, ending on the last day of a rental period. A fixed-term lease does not end automatically — it continues month to month unless notice is given.",
    link: { label: "Form N9 and notice periods — Tribunals Ontario", url: "https://tribunalsontario.ca/ltb/forms/" },
  },
]

const HELP = [
  { name: "Landlord and Tenant Board", desc: "Files applications, holds hearings, issues orders.", url: "https://tribunalsontario.ca/ltb/" },
  { name: "Steps to Justice", desc: "Plain-language answers and step-by-step guides, from CLEO.", url: "https://stepstojustice.ca/legal-topic/housing-law/" },
  { name: "Your local legal clinic", desc: "Free legal help for lower-income tenants, by neighbourhood.", url: "https://www.legalaid.on.ca/legal-clinics/" },
  { name: "ACTO", desc: "Advocacy Centre for Tenants Ontario — test-case litigation and law reform.", url: "https://www.acto.ca/" },
]

export function TenantRightsPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 md:px-8" style={{ fontFamily: BODY }}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 flex items-center gap-2">
          <Scale size={15} className="text-primary" />
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground" style={{ fontFamily: MONO }}>
            Know your rights · Ontario
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground md:text-4xl" style={{ fontFamily: DISPLAY }}>
          Tenant rights in Ontario
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The rules that apply to most private residential tenancies in Ontario, under the{" "}
          <a
            href="https://www.ontario.ca/laws/statute/06r17"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-2">
            Residential Tenancies Act, 2006
          </a>
          . Each item links to the Government of Ontario or the Landlord and Tenant Board — go there
          for the current figures, since the rent increase guideline is set every year.
        </p>

        <div className="mt-8 space-y-3">
          {RIGHTS.map(({ title, body, link }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-semibold leading-snug text-foreground">{title}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline">
                {link.label}
                <ExternalLink size={11} className="transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          ))}
        </div>

        <h2 className="mt-10 mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldAlert size={14} className="text-primary" />
          Where to get help
        </h2>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {HELP.map(({ name, desc, url }) => (
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
            General information only, not legal advice. Rentre is not a law firm. Laws, guideline
            percentages and form numbers change — verify with the Landlord and Tenant Board or a
            licensed paralegal or lawyer before acting. Rules differ for co-ops, care homes, student
            residences and some social housing.
          </p>
        </div>
      </div>
    </div>
  )
}
