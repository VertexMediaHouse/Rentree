Product context: Multi-step tenant onboarding for a rental marketplace. Tone: warm, low-friction, tenant-first — this should feel like the opposite of a bureaucratic screening form, even though Section 2 collects sensitive data. Progress should always feel optional and low-pressure, since Section 2 fields are what separate the $5 (Incomplete) tier from the $25 (Complete) tier — completion should feel like unlocking value, not a demand.

Overall flow: 2-step wizard, progress bar at top ("Step 1 of 2" → "Step 2 of 2"), with the option to stop after Step 1 and still have a usable (Incomplete-tier) profile. Autosave on every field.

Step 1 — "The Easy Part" (Basic Info)

Screen intent: Zero-friction entry point. Should take under 60 seconds. No sensitive data collected here.

Header copy: "Let's find your next place" / subtext: "Just the basics for now — you can always add more later."

Fields:

Full name (single text input)
Email (text input, inline validation)
Phone number (text input, format-masked, e.g. (_) _-)
City interested in (dropdown/autocomplete, scoped to launch markets — Toronto initially)
Optional: interactive map draw tool — an embedded map (Google Maps or Mapbox) where the user can freehand-draw or drop a radius/polygon over the area(s) they'd consider living in. Include a toggle: "I'll browse instead" for users who don't want to engage with the map. Show a small live preview chip ("You've selected: Downtown Core, King West") as they draw.

CTA: Primary button "Continue" (proceeds to Step 2 preview/paywall-style screen). Secondary/ghost link: "Skip for now — I'll finish later" (drops user into browse mode as an Incomplete/$5-tier profile).

Visual notes: Single-column, generous whitespace, one field visible at a time on mobile (progressive disclosure) or all fields on one clean card on desktop. Map component should feel playful, not clinical — rounded corners, soft color palette matching brand.

Step 2 — "Complete Your Profile" (Verification & Trust Info)

Screen intent: This is the value-unlock step — frame it as "the more you share, the faster landlords say yes," not as a background check. Each sub-section should be its own collapsible card/accordion, not one long form, so it doesn't feel like a wall of bureaucracy. Show a live "profile strength" indicator (progress ring or bar) that fills as each section completes.

Intro copy: "Complete tenants get seen faster. Add what you can — you're always in control of what's shared, and only after a landlord accepts your request."

Card 1 — Credit
Copy: "Link your free credit report via Borrowell" (soft pull, no impact to score)
Component: "Connect Borrowell" button (OAuth-style connect flow), with a "What is Borrowell?" tooltip
State after connect: green checkmark + "Credit report linked ✓" + last-updated date
Card 2 — Landlord / Reference Contact
Fields: Previous/current landlord name, phone, email, relationship duration (date range picker)
Consent checkbox: "I consent to Rentre contacting this reference on my behalf" (required before this section can be marked complete)
Microcopy: "We'll only reach out once a landlord is seriously interested in you."
Card 3 — Personal Character Reference
Fields: Reference name, relationship (dropdown: employer, coworker, mentor, other), phone, email
Same consent pattern as Card 2
Card 4 — Background / Criminal Check
Copy: framed carefully — "Some landlords request this for peace of mind. It's optional to add now."
Component: consent flow → triggers SingleKey (or your provider) pull, with a distinct, separate consent screen (not a checkbox buried in the card) that clearly states what's being checked, who it's shared with, and how long it's retained
⚠️ Design/legal flag, not a UI note but worth building into copy review: Ontario's Human Rights Code restricts how criminal record information can be used in housing decisions — the interface and any downstream landlord-facing summary should avoid framing this as a blanket pass/fail signal, and legal should review the exact disclosure/consent language before this ships.
Card 5 — Identity Verification
Component: standard ID-verification flow (upload gov ID + selfie liveness check, likely via a KYC vendor like Persona/Onfido rather than building in-house)
State: pending / verified / failed with retry
Card 6 — Guarantor (conditional/add-on)
Copy: "Need a guarantor? Add one now, or a landlord may request this later."
Fields: Guarantor name, relationship, phone, email — mirrors tenant's own identity-verification flow once added
Visually distinct treatment (e.g., a lighter/dashed border) to signal this is optional and situational, not a standard expectation

Bottom of Step 2:

Persistent "Profile strength: X% complete" indicator
Primary CTA: "Finish & Browse Listings"
Reassurance microcopy pinned near the CTA: "Your information is only shared with a landlord after they accept your request to view — and never sold."
Design system notes
Reuse the same card/accordion pattern across all Section 2 items for consistency
Every consent action should be its own explicit, affirmative checkbox — never bundled into a single "I agree to everything" catch-all, per the layered-consent approach already built into your data model
Empty/incomplete states should never feel like errors — soft gray "not added yet" states, not red warning states, to keep the tone encouraging rather than punitive