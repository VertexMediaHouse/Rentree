import { useState } from "react"
import { Link } from "react-router"
import { ArrowRight, Check, FileCheck2, Mail, ShieldCheck, Sparkles } from "lucide-react"
import { BODY, DISPLAY, MONO } from "../App"
import { ImageWithFallback } from "../components/figma/ImageWithFallback"
import rentreLogoMark from "@/imports/image-7.png"

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=1200&h=1600&fit=crop&q=80"

const DEFAULT_HIGHLIGHTS = [
  { icon: ShieldCheck, label: "Verified identity", desc: "ID and credit checked once, by us." },
  { icon: FileCheck2, label: "One passport", desc: "Share one profile, not ten PDFs." },
  { icon: Sparkles, label: "Offer to lease", desc: "Offer, payment and lease in one flow." },
]

export function ComingSoonPage({
  eyebrow = "Coming soon",
  title = "Renting, without the paper chase",
  blurb = "We're putting the finishing touches on it. Leave your email and we'll tell you the day it goes live.",
  highlights = DEFAULT_HIGHLIGHTS,
}: {
  eyebrow?: string
  title?: string
  blurb?: string
  highlights?: { icon: typeof ShieldCheck; label: string; desc: string }[]
} = {}) {
  const [email, setEmail] = useState("")
  const [done, setDone] = useState(false)

  return (
    <div className="min-h-screen grid lg:grid-cols-2" style={{ fontFamily: BODY }}>
      {/* ── Left: content ───────────────────────────────────────────── */}
      <div className="relative flex flex-col justify-center px-6 py-14 sm:px-12 lg:px-14 xl:px-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -left-32 h-[30rem] w-[30rem] rounded-full opacity-[0.07] blur-3xl"
          style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)" }}
        />

        <div className="relative w-full max-w-lg">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-12">
            <img src={rentreLogoMark} alt="Rentre logo mark" className="w-9 h-9 rounded-xl object-cover shadow-sm" />
            <span className="text-base font-semibold text-foreground tracking-tight" style={{ fontFamily: DISPLAY }}>
              rentre<span className="text-primary font-bold">.ca</span>
            </span>
          </Link>

          <span
            className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-6"
            style={{ fontFamily: MONO }}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            {eyebrow}
          </span>

          <h1
            className="text-4xl xl:text-5xl font-bold text-foreground tracking-tight leading-[1.1] mb-4"
            style={{ fontFamily: DISPLAY }}>
            {title}
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed mb-8">{blurb}</p>

          {/* ── Signup ── */}
          {done ? (
            <div className="flex items-start gap-3.5 rounded-2xl border border-primary/20 bg-primary/[0.05] p-5 mb-10">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                <Check size={16} className="text-primary-foreground" />
              </span>
              <div>
                <p className="text-base font-bold text-foreground" style={{ fontFamily: DISPLAY }}>
                  You{"'"}re on the list
                </p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  We{"'"}ll email <span className="font-semibold text-foreground">{email}</span> the day this goes live.
                </p>
              </div>
            </div>
          ) : (
            <form
              className="mb-10"
              onSubmit={(e) => {
                e.preventDefault()
                setDone(true)
              }}>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    aria-label="Email address"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full rounded-xl border border-border bg-card pl-11 pr-4 py-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring"
                  />
                </div>
                <button
                  type="submit"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90">
                  Notify me
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
              <p className="mt-2.5 text-xs text-muted-foreground">No spam — one email, the day we launch.</p>
            </form>
          )}

          {/* ── Highlights: plain rows, no imagery competing with the hero ── */}
          <ul className="space-y-5 border-t border-border pt-8">
            {highlights.map(({ icon: Icon, label, desc }) => (
              <li key={label} className="flex items-start gap-3.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <Icon size={15} className="text-primary" />
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground leading-tight" style={{ fontFamily: DISPLAY }}>
                    {label}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Right: image, flush to the edge ─────────────────────────── */}
      <div className="relative hidden lg:block">
        <ImageWithFallback
          src={HERO_IMAGE}
          alt="City skyline at dusk"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(23,75,58,0.30) 0%, rgba(23,75,58,0.20) 40%, rgba(20,17,14,0.88) 100%)" }}
        />

        {/* caption on the scrim — no floating box */}
        <div className="absolute inset-x-0 bottom-0 p-10 xl:p-14">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/55 mb-4"
            style={{ fontFamily: MONO }}>
            Rentre · Verified renting
          </p>
          <p
            className="text-2xl xl:text-3xl font-semibold leading-snug text-white max-w-sm"
            style={{ fontFamily: DISPLAY }}>
            One verified passport. Every landlord.
          </p>
          <div className="mt-8 flex gap-10 border-t border-white/20 pt-6">
            {[
              { value: "1", label: "Profile" },
              { value: "14d", label: "Expiry" },
              { value: "0", label: "Re-uploads" },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl font-bold text-white leading-none" style={{ fontFamily: DISPLAY }}>
                  {value}
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-wider text-white/55" style={{ fontFamily: MONO }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
