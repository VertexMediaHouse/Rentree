Here’s a strong Figma Make prompt you can paste and then refine. I’d position fairrents.ca as a clean, trust-first Canadian rental intelligence web app with a two-path intake, simple scoring, and a strong emphasis on privacy and live market benchmarking. CMHC’s rental data is a credible benchmark source for average rents, vacancy, turnover, and related market context, while Apartments.com and RentFaster can be referenced as market sources in the product concept, though you should be careful about how third-party listing data is actually ingested and used operationally.

Figma Make prompt
Design a polished web app and landing page experience for fairrents.ca, a Canadian rental intelligence platform that helps renters understand whether their current rent or a new asking rent is a fair deal.

The product has one core promise: rate the rent and rate the deal out of 10 based on market data, location quality, transit access, walkability, amenities, and comparable rental pricing.

Create a modern, premium, highly trustworthy interface that feels like a blend of a consumer fintech product and a real estate analytics platform. The design should feel clean, data-driven, privacy-forward, and Canadian. Avoid generic startup gradients, cartoonish illustrations, or overly playful visuals. Use a restrained color palette, strong typography, subtle maps/data cues, and compact web-app style UI.

Product structure
Build the experience with two main entry options on the homepage:

Currently renting or renewing

Looking to rent

The first screen should make this choice obvious with two large, elegant cards or buttons above the fold. Add a short value proposition underneath: “Know if your rent is fair before you renew or sign.” The page should immediately communicate trust, speed, and privacy.

Flow 1: Currently renting or renewing
When a user selects “Currently renting or renewing,” show a simple step-based intake flow with two input options:

Upload your lease

Enter details manually

If they upload a lease, clearly explain that sensitive personal information is automatically removed before analysis. Add privacy language such as: “Names, signatures, contact details, and other sensitive fields are redacted before rent analysis.” The UI should make this feel safe and credible.

If they enter details manually, collect:

Monthly rent

Unit type, studio / 1 bed / 2 bed / 3 bed+

Address

Optional building name

Optional square footage

Optional parking, locker, utilities included

Lease start date or renewal date

After submission, generate a result screen called Your Rent Fairness Score.

This result should show:

Overall score out of 10

Simple label such as: Excellent deal / Fair deal / Slightly above market / Overpriced

Estimated market rent range for that location and unit type

Difference between current rent and estimated fair market rent

Breakdown scores for:

Location

Price

Transit

Walkability

Amenities

Small map panel

Comparable listings or comparable rent signals

Short recommendation such as:

“Your current rent appears 8% below local market.”

“Renewing at this rate looks strong.”

“This rent is above nearby comparables.”

Flow 2: Looking to rent
When a user selects “Looking to rent,” show a similar guided flow where the user enters:

Listing address

Asking rent

Unit type

Bedrooms / bathrooms

Optional square footage

Building type

Desired move-in date

What matters most:

Lowest price

Best location

Transit access

Walkability

Space

Building amenities

After submission, show a result screen called Deal Score.

This result should show:

Overall deal score out of 10

Label such as: Great deal / Reasonable / Premium but fair / Overpriced

Expected market rent band

Whether the asking rent is above or below expected market

Category scores for:

Price

Location

Transit

Walkability

Amenities

“What you’re getting” summary

“What to watch for” summary

Suggested negotiation insight, for example:

“This unit is priced above similar nearby rentals.”

“Strong location premium, but rent is still within fair range.”

“Good deal if in-suite laundry and parking are included.”

Core product logic to reflect in UI
The UI should imply that scores are powered by a blended market model using:

CMHC market rent data

Apartments.com listing signals

RentFaster listing signals

HouseSigma rental signals

Location quality data

Transit access

Walkability

Building/unit amenity inputs

Represent this with a “How we score” expandable section or modal. Keep it simple and consumer-friendly, not overly technical. CMHC should appear as a trusted benchmark source in the design language because it provides rental market survey data including average rents and related market metrics for Canadian centres.

Business goal
The business goal is to collect real-time rental data from user submissions and continuously improve market intelligence. Reflect this in the product concept by including:

A lightweight email capture after results

Save my report

Get rent alerts

Notify me when similar units become better value

Get renewal negotiation tips

Make the value exchange clear: the user gets a free fairness score, and the platform learns from live market inputs over time.

Design direction
Create a trust-first web app, not a marketing-heavy startup site.

Use:

Clean dashboard-like layout

Light and dark mode

Sans-serif typography

Tight spacing and compact controls

Neutral background with one strong accent color

Subtle map and data visual elements

Score cards, benchmark bands, and comparison chips

Privacy badges and source credibility indicators

Avoid:

Loud gradients

Neon colors

Generic AI SaaS illustrations

Overdesigned 3-column feature blocks

Excessive hero copy

Key screens to generate
Please design these screens:

Homepage with the two main choices

Upload lease / manual entry screen

Manual form for current renters

Manual form for people looking to rent

Results screen for current renters

Results screen for prospective renters

“How scoring works” modal

Save results / email capture modal

Mobile responsive versions of the core screens

Homepage copy ideas
Use concise, specific copy such as:

“Is your rent actually fair?”

“Rate your rent before you renew.”

“Check if a listing is a good deal before you sign.”

“Canadian rent intelligence powered by market data.”

UX priorities
Prioritize:

Fast comprehension in under 5 seconds

Strong trust signals

Minimal friction

Clear score explanation

Mobile-first usability

Privacy reassurance around lease upload

Results that feel actionable, not just informational

Desired output style
Generate polished product UI mockups with:

Realistic cards

Form components

Results dashboards

Map/list comparison areas

Data-backed score visualizations

Professional product design suitable for a startup MVP and investor demo

Better product framing
A few wording tweaks will make the concept stronger in the prompt:

Change “rates your rent and deal” to “estimates rent fairness and deal quality.”

Change “sensitive data is wiped” to “sensitive data is redacted before analysis.”

Change “collect real time data” to “collects live user-submitted rent signals and compares them with market benchmarks.”

Treat CMHC as benchmark data rather than “real-time” data, since CMHC’s Rental Market Survey is periodic, not live.

Product note
One practical caveat: third-party sources like Apartments.com have website terms, so in the actual product you’ll want to validate data rights, API availability, or approved ingestion methods before positioning those feeds as directly integrated.