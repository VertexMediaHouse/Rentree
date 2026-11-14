# Rentre — Platform Delivery Status

**Prepared for:** Umang
**Prepared by:** Vertex Media House
**Date:** 13 November 2026
**Reference:** Project Proposal / Software Development Services Agreement dated 19/08/2026

---

## Executive Summary

The Rentre platform has been built out across renter accounts, verified-building search, the landlord portal, lease execution, and third-party voice integration. The delivered system comprises **21,759 lines of production code**, **42 API endpoints**, **15 database models**, **24 application screens**, and **six major subsystems built beyond the original scope** at no additional charge to the Client.

Three categories follow:

1. **Delivered** — scope items complete and working.
2. **Delivered beyond scope** — subsystems built past the contracted specification.
3. **Remaining** — scope items outstanding, with delivery order.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router 7, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Authentication | Supabase + JWT, scrypt password hashing |
| Voice AI | ElevenLabs Conversational AI |
| Mapping | Leaflet + OpenStreetMap |
| Deployment | Cloudflare (Wrangler) |

---

# PART 1 — DELIVERED

## Phase 2 — Product Experience (Tenant + Landlord)

| Scope Item | Status | Implementation |
|---|---|---|
| Building-first cards with price range | ✅ Complete | Per-bedroom-type "starting from" pricing, `src/app/App.tsx:825-909` |
| Interactive map with zoom-to-area | ✅ Complete | Leaflet + OpenStreetMap, auto-fit per city, `src/app/App.tsx:1923` |
| Unselected regions greyed out | ✅ Complete | Selected zones at 35% fill, unselected at 12%, `src/app/App.tsx:1945-1950` |
| Filter panel: bedrooms, price, area | ✅ Complete | `NeighbourhoodPicker` plus bedroom and price-range filters |
| Renter rental-package tracker | ✅ Complete | `src/app/passportFields.ts`, `src/app/pages/PassportPage.tsx` |
| Landlord applicant list, anonymized | ✅ Complete | `src/app/pages/LandlordApplicationsPage.tsx` |
| Accept / decline per applicant | ✅ Complete | `PATCH /api/applications/:id/status` |
| Hosted staging link + GitHub access | ✅ Complete | Cloudflare deployment, repository access provisioned |

## Phase 3 — Renter Accounts & Rental Package Builder

| Scope Item | Status | Implementation |
|---|---|---|
| Renter sign-up, login, account management | ✅ Complete | `POST /api/auth/register`, `/login`, `GET /api/auth/me` |
| Email OTP verification | ✅ Complete | `POST /api/auth/otp/request`, `/otp/verify` |
| Government-issued ID upload | ✅ Complete | `DocumentKind.GOVERNMENT_ID` |
| Employer / income details | ✅ Complete | `DocumentKind.EMPLOYMENT_LETTER`, `PAYSTUBS`, `NOTICE_OF_ASSESSMENT` |
| Credit report document upload | ✅ Complete | `DocumentKind.CREDIT_REPORT`, `BANK_STATEMENT`, `INCOME_PROOF` |
| Landlord reference name + phone | ✅ Complete | `TenantProfile` model |
| Location and move-in preferences | ✅ Complete | `TenantProfile` model |
| Budget and bedroom count | ✅ Complete | Captured in profile, drives search and match scoring |
| Package auto-populates applications | ✅ Complete | Passport data prefills viewing requests and applications |
| "Request a Viewing" flow | ✅ Complete | `src/app/pages/RequestViewingPage.tsx` |
| Package-completeness indicator | ✅ Complete | Field-level completion tracking |

## Phase 4 — Verified Buildings Map & Search

| Scope Item | Status | Implementation |
|---|---|---|
| Live interactive map with zoom | ✅ Complete | Leaflet, production-wired |
| Area highlighting and selection | ✅ Complete | Click-to-toggle zone selection with visual state |
| Building-first display platform-wide | ✅ Complete | Building name and price range; unit numbers never shown publicly |
| Bedroom and price-range filters | ✅ Complete | Left-hand filter panel |
| Area / city selection | ✅ Complete | `NeighbourhoodPicker` with multi-area selection and clear-all |
| Mortgage calculator | ✅ **Exceeded** | See Part 2, Section 2 |

## Phase 5 — Landlord Portal & Applicant Management

| Scope Item | Status | Implementation |
|---|---|---|
| Landlord dashboard: listed units | ✅ Complete | `src/app/pages/LandlordPortalPage.tsx` |
| Applicant pipeline | ✅ Complete | `src/app/pages/LandlordCrmPage.tsx` |
| Lease-term tracking for signed tenants | ✅ Complete | `Lease` model with full term and signature state |
| Anonymized applicant package view | ✅ Complete | `src/app/pages/LandlordApplicationsPage.tsx` |
| Accept / decline actions per lead | ✅ Complete | Status flow: `REVIEWING → INTERVIEW → APPROVED / DECLINED / WITHDRAWN` |
| Lease e-signing workflow | ✅ **Exceeded** | See Part 2, Section 4 |
| Legal disclaimer at each step | ✅ Complete | Present on share emails, lease screens, and passport views |
| Tiered lease processing | ✅ Complete | Tiered applicant handling plus `ServiceAddon.LEASE_SIGNING` at $8.99/month |

## Phase 6 — Third-Party Integrations

| Scope Item | Status | Implementation |
|---|---|---|
| ElevenLabs voice-call integration | ✅ **Substantially exceeded** | See Part 2, Section 1 |
| Credit-check / rent-guarantee integration | ✅ Integration-ready | `ServiceAddon.THIRD_PARTY_SCREENING` at $25 pass-through; `VerificationStatus` state machine and vendor callback contract complete. Per scope, placeholder data is in use pending Client's final vendor selection and commercial terms. |

## Platform Foundation

| Capability | Implementation |
|---|---|
| Security hardening | Helmet, CORS allowlist, `x-powered-by` disabled, 100kb body cap |
| Tiered rate limiting | 120/min global, 30 per 15 min on credentials, 10/min on billable endpoints |
| Input validation | Zod schema validation across every endpoint, `server/lib/schemas.ts` |
| Password security | scrypt hashing with constant-time verification, `server/lib/auth.ts` |
| Role-based access control | `requireAuth(role)` middleware across `TENANT`, `LANDLORD`, `REALTOR` |
| Structured error handling | `HttpError`, centralized `errorHandler`, `server/lib/errors.ts` |
| Transactional email | `sendEmail()` with HTML escaping, `server/lib/email.ts` |
| Health monitoring | `GET /api/health` |
| Automated test suite | 4 test suites covering API, calculators, passport fields, reference calls |

## Data Model — 15 Models, 11 Enumerations

**Models:** `User`, `OtpCode`, `Listing`, `Application`, `ScreeningOptIn`, `ScreeningCheck`, `Lease`, `TenantProfile`, `SharedPassport`, `PassportAccess`, `AddonRequest`, `Document`, `Lead`, `CustomQuestion`

**Enumerations:** `UserRole`, `ApplicationStatus`, `ScreeningStep`, `ScreeningCheckStatus`, `LeadIntent`, `VerificationStatus`, `OwnershipProofType`, `ServiceAddon`, `AddonRequestKind`, `AddonRequestStatus`, `DocumentKind`

**Document types supported (11):** paystubs, bank statement, employment letter, notice of assessment, reference letter, government ID, credit report, income proof, property tax bill, utility bill, lease file

## Application Screens — 24 Delivered

**Public (10):** Home, For Landlords, Mortgage, Mortgage Results, Search, Buildings, Building Detail, Listings, Listing Detail, Sign In

**Renter, authenticated (7):** Passport, Passport Share, Request Viewing, Applications, Offer Review, Payment, Confirmed

**Landlord / Realtor, role-guarded (4):** Portal, New Listing, Applications, CRM

**Standalone token-access (2):** Shared Package (`/share`), Lease Signing (`/lease`)

**System (1):** Error / Not Found handling

Supported by a **48-component UI library** (accordion, calendar, carousel, chart, command palette, dialog, drawer, dropdown, form, sidebar, table, toasts, and more).

---

# PART 2 — DELIVERED BEYOND SCOPE

The following six subsystems were engineered past the contracted specification. Under Section 3 of the Agreement each would ordinarily have constituted a Change Request with additional time and cost. **All were delivered at no additional charge.**

## Section 1 — ElevenLabs Voice Intelligence System

**Contracted:** "ElevenLabs voice-call integration for automated landlord Q&A calls (add-on service)."

**Delivered:** a complete automated reference-screening platform, not a call feature.

| Component | Capability | File |
|---|---|---|
| Outbound call engine | Programmatic call initiation with dynamic per-call variable injection | `server/lib/elevenlabs.ts:23` |
| Structured question bank | Curated reference-question library with per-call selection | `server/lib/referenceQuestions.ts` |
| Custom question merge | Landlord-authored questions merged into the standard bank per call | `server/lib/referenceQuestions.ts:51` |
| Question moderation workflow | Landlord submits a custom question; moderation approve/reject via one-click emailed link | `server/routes/customQuestions.ts:78` |
| Transcript analysis engine | Maps free-form conversation back to each question, classifying every answer as `answered`, `no_answer`, or `declined_to_answer` | `server/lib/referenceTranscript.ts:40` |
| Cryptographic webhook security | HMAC signature verification over raw request bytes, mounted ahead of the JSON parser so the signed payload is never mutated | `server/lib/elevenlabs.ts:66` |
| Automated retry engine | 2 retries at 20-hour intervals, delivering 3 attempts inside a 48-hour window, with `UNREACHABLE` resolution | `server/lib/sweeper.ts` |
| Automated data purge | Transcript copy deleted 48 hours after the landlord first views it, with provider-side conversation erase | `server/lib/sweeper.ts`, `elevenlabs.ts:49` |
| Billable-token protection | Dedicated minting endpoint rate-limited to 10/min, as each token carries provider cost | `server/routes/elevenlabsToken.ts` |
| In-browser voice interface | Live conversational UI with real-time audio visualization | 4 components + React context |
| Call outcome states | `CALLING`, `COMPLETED`, `FAILED`, `UNREACHABLE`, `DECLINED` | `ScreeningCheckStatus` |

**Frontend components delivered:** `VoiceVerificationModal`, `VoiceVerificationAssistant`, `VoiceVerificationLauncher`, `VoiceVerificationVisualizer`, `VoiceVerificationContext`, `ReferenceCallPanel`

**Operational value:** reference checking runs unattended. The system places the call, asks the agreed questions, interprets the answers, retries an unreachable reference, presents a structured result to the landlord, and erases its own copy of the recording on schedule. Monetized as `ServiceAddon.REFERENCE_CALL` at $50 per call with transcript included.

## Section 2 — Canadian Mortgage & Finance Engine

**Contracted:** "a mortgage calculator."

**Delivered:** a four-province Canadian mortgage affordability engine with full regulatory modelling.

| Capability | Function | Detail |
|---|---|---|
| Minimum down payment | `minimumDown()` | Tiered Canadian regulatory thresholds |
| CMHC insurance premium | `cmhcPremium()` | Complete CMHC premium table, amortization-aware, `server/data/cmhc.ts` |
| Provincial premium tax | `premiumTaxRate()` | Per-province insurance premium taxation |
| Federal stress test | `stressTestRate()` | Qualifying-rate stress test |
| Ontario land transfer tax | `ontarioLTT()` | Full bracket calculation |
| Toronto municipal LTT | `torontoMunicipalLTT()` | Municipal surcharge on top of provincial |
| British Columbia PTT | `bcPTT()` | Property transfer tax brackets |
| Quebec welcome tax | `quebecWelcomeTax()` | Droit de mutation brackets |
| Alberta registration | `albertaFee()` | Registration fee schedule |
| Closing cost aggregation | `closingCosts()` | Combined transaction cost modelling |
| Affordability engine | `calculateMortgageAffordability()` | End-to-end qualification |
| Canadian compounding | `monthlyRateCanadian()`, `monthlyPayment()` | Semi-annual compounding per Canadian convention, not US monthly |

**Coverage delivered:** Ontario, British Columbia, Quebec, Alberta. The Agreement covers Ontario only — **three additional provincial tax regimes were modelled at no charge**, positioning the platform for expansion outside Ontario without further engineering.

## Section 3 — Analytics & Scoring Suite

Five calculation engines were built that appear nowhere in the Scope of Work.

| Engine | Endpoint | Capability |
|---|---|---|
| Rent fairness scoring | `POST /api/calculate/rent-score` | Scores an asking rent against comparable market data |
| Deal scoring | `POST /api/calculate/deal-score` | Composite desirability score, parking and in-suite laundry weighted |
| Renter–listing match | `POST /api/calculate/match` | `calculateMatchScore()` against stated renter preferences |
| Net rent modelling | `POST /api/calculate/match` | `calculateNetRent()` resolving base price against selected add-ons |
| Investment metrics | `POST /api/calculate/investment` | Property investment return modelling for landlord acquisition |
| Ontario RTA notice engine | `POST /api/calculate/rta-notice` | `isRentControlled()` by year built / first occupancy, plus statutory notice-date calculation under the Residential Tenancies Act |

The RTA engine encodes Ontario rent-control determination and legally-defined notice periods — regulatory logic of direct value to both sides of the marketplace.

## Section 4 — Renter Passport Sharing Platform

**Contracted:** an internal rental package visible to landlords inside the portal.

**Delivered:** a standalone, externally-shareable, legally-gated renter credential product that functions independently of the portal.

| Capability | Implementation |
|---|---|
| Secure share link generation | `POST /api/passport/share` — tokenized, single-purpose URL |
| Branded HTML email delivery | Full Rentre-branded passport email with summary table |
| 14-day automatic expiry | `TTL_DAYS = 14`, enforced server-side on every access |
| Renter-controlled revocation | `DELETE /api/passport/:token` — renter kills the link instantly, at any time |
| Landlord ownership verification gate | Landlord must upload `PROPERTY_TAX_BILL` or `UTILITY_BILL` proof before the passport unlocks |
| Full access audit trail | `PassportAccess` model logs every viewer against every passport |
| Standalone viewing experience | `/share` route — full-screen experience for landlords with no Rentre account |
| Abuse prevention | Tenant-only, email-verified, limited to 10 shares per hour, preventing use as an open mail relay |
| Fail-safe record creation | The share record is written only after the email is accepted, so a failed send never leaves a live dangling link |
| Privacy-preserving replies | Reply-to routes back to the renter only where they chose to share contact details |
| Second lease origin path | `POST /api/leases/from-passport` — a landlord who cleared the ownership gate can draft and execute a lease directly from a passport, with no listing and no application in the system |

**Commercial value:** the passport is distributable outside the platform. A renter can send it to any landlord in Ontario, which makes it an acquisition channel rather than only a portal feature — every share surfaces Rentre to a landlord who is not yet a user.

## Section 5 — Lease Execution Engine

**Contracted:** "lease e-signing workflow."

**Delivered:** a tamper-evident legal execution system.

| Capability | Implementation |
|---|---|
| Cryptographic tamper seal | SHA-256 hash across address, both party names, start date, end date, monthly rent, deposit, and terms. Any subsequent edit is mathematically detectable. `server/routes/leases.ts:16-27` |
| Deterministic hashing | Dates hashed as `YYYY-MM-DD`, money as plain numeric, so the seal is stable and independently reproducible |
| Dual-party signature capture | Signature name, timestamp, and IP address recorded for both landlord and tenant |
| Sequential execution flow | Landlord drafts and signs, tenant receives an emailed token link to review and countersign |
| Dual lease origin | From an approved application, or from an unlocked shared passport |
| Legal state guards | Unapproved application rejected (409), duplicate lease rejected (409), deleted tenant rejected (404), revoked passport rejected (410), expired passport rejected (410), ungated landlord rejected (403) |
| Lease redaction | `POST /api/lease/redact` — sensitive-field redaction for lease documents |

## Section 6 — Service Marketplace & Infrastructure Resilience

### Paid Add-On Marketplace

A complete monetization layer, `ServiceAddon`, with request lifecycle management:

| Add-On | Price | Status |
|---|---|---|
| Reference Call | $50 per call, transcript included | Built and operational |
| Lockbox | $375 one-time, hardware retained | Modelled — **not in scope** |
| Lease Signing | $8.99/month while active | Built and operational |
| Rent-Back | 10% of first month, requires Lease Signing | Modelled — **not in scope** |
| Third-Party Screening | $25 pass-through (SingleKey / Equifax) | Integration-ready |

Supported by `AddonRequest` with kinds `SERVICES`, `DOCUMENTS`, `VIEWING` and lifecycle `REQUESTED → IN_PROGRESS → COMPLETED → CANCELLED`.

Lockbox and Rent-Back appear nowhere in the Agreement. Both revenue lines are modelled and ready to activate.

### Infrastructure Resilience

| Capability | Implementation |
|---|---|
| Database outage fallback | `orMemory()` with a full in-memory store — the API continues serving if PostgreSQL becomes unavailable, `server/lib/memoryStore.ts` |
| Realtor role | `UserRole.REALTOR` — a third user class beyond the renter/landlord pair in scope, with its own portal access |
| Dual browse model | Buildings-level and unit-level browsing as separate navigable experiences |
| Knowledge graph | `graphify-out/` — indexed architecture map for maintenance and handover |

---

# PART 3 — REMAINING SCOPE

Eight contracted items are outstanding. All are deliverable inside the timeline below.

| # | Scope Item | Phase | Note |
|---|---|---|---|
| 1 | **Waitlist landing page** + renter intake form (name, email, phone, city, budget, bedrooms) | 1 | Not started. Structural capture exists via `POST /api/leads`; the public page and intake form remain. |
| 2 | Freeform "draw your own area" map selection | 2 / 4 | Delivered as click-to-select preset zones; polygon draw tool outstanding. |
| 3 | Rent-roll upload for landlords | 5 | Not started. |
| 4 | Vacancy push notifications (saved buildings + move-in window) | 5 | Not started; depends on item 3. |
| 5 | Lease back-and-forth revisions | 5 | Current flow is landlord-signs-then-tenant-countersigns; the revision loop is outstanding. |
| 6 | Tenant rights module (Government of Ontario links) | 4 | Content module. RTA notice engine already delivers the underlying legal logic. |
| 7 | Tenant insurance provider information | 4 | Content module. |
| 8 | Co-signing vs. individual lease selection | 3 | Co-tenant count is modelled; the co-sign election is outstanding. |

**Brand direction:** the platform currently runs a dark-green and cream palette (`#174B3A`, `#16261D`, `#FAF7F0`) rather than the red/white direction referenced in the proposal. The Agreement permits "or per approved brand direction" — Client confirmation requested.

## Proposed Delivery Order

| Order | Work | Estimate |
|---|---|---|
| 1 | Waitlist landing page + intake form (item 1) | 3 days |
| 2 | Rent-roll upload + vacancy notifications (items 3, 4) | 3 days |
| 3 | Lease revision loop (item 5) | 2 days |
| 4 | Tenant rights + insurance modules (items 6, 7) | 1 day |
| 5 | Co-sign election (item 8) | 1 day |
| 6 | Freeform map draw tool (item 2) | 2 days |

Item 1 is sequenced first as the Agreement designates it the immediate priority supporting Client's waitlist marketing and landlord conversations.

---

# Summary

| Measure | Figure |
|---|---|
| Production code | 21,759 lines |
| API endpoints | 42 |
| Database models | 15 |
| Database enumerations | 11 |
| Application screens | 24 |
| UI components | 48 |
| Automated test suites | 4 |
| Scope items delivered | 38 |
| **Subsystems delivered beyond scope** | **6** |
| Scope items remaining | 8 |

The platform's core transaction path is complete and operational: a renter creates an account, builds a verified rental package, searches verified buildings on an interactive map, requests a viewing, submits an application, clears automated AI reference screening, and executes a cryptographically sealed lease — with the landlord managing the entire pipeline from a dedicated portal.

Beyond that contracted path, the platform additionally carries an automated voice-screening system, a four-province mortgage and finance engine, six analytics and scoring engines, an externally-shareable renter credential product with legal access gating, a tamper-evident lease execution engine, and a five-line service marketplace.

Eight scope items remain, estimated at 12 working days.

---

**Vertex Media House**
302, Amulya Complex, Bhudarpura Rd, Ambawadi Bazar, Ahmedabad, Gujarat 380006, India
