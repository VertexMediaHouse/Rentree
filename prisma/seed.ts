import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../server/lib/auth";

const db = new PrismaClient();

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const daysAhead = (n: number) => new Date(Date.now() + n * 86_400_000);
const date = (s: string) => new Date(`${s}T00:00:00Z`);

const PHOTO = (id: string) => `https://images.unsplash.com/${id}?w=900&h=600&fit=crop&auto=format`;
const FLOOR_PLAN = PHOTO("photo-1721244654392-9c912a6eb236");

/** Same hash the lease routes compute, so a seeded lease passes the tamper check at signing. */
const leaseHash = (l: {
  address: string; tenantName: string; tenantEmail: string;
  startDate: string; endDate: string | null; monthlyRent: number; deposit: number | null; terms: string;
}) =>
  crypto.createHash("sha256")
    .update(JSON.stringify([l.address, l.tenantName, l.tenantEmail, l.startDate, l.endDate, l.monthlyRent, l.deposit, l.terms]))
    .digest("hex");

const ONTARIO_TERMS = `ONTARIO STANDARD LEASE (FORM 2229E) — SUMMARY OF AGREED TERMS

1. PARTIES. This tenancy agreement is between the Landlord and the Tenant named below.
2. RENTAL UNIT. The Tenant may occupy the rental unit described in this agreement.
3. TERM. The tenancy begins on the start date shown and, unless ended in accordance with the
   Residential Tenancies Act, 2006, continues on a month-to-month basis after the end date.
4. RENT. Rent is due on the first day of each month, in the amount shown.
5. DEPOSIT. Any rent deposit is applied to the last rental period of the tenancy. Ontario law
   does not permit a damage or security deposit.
6. SERVICES AND UTILITIES. Services included in the rent are as listed in the unit's add-ons.
7. TENANT INSURANCE. The Tenant is encouraged to obtain tenant insurance.
8. SMOKING. Smoking is not permitted in the rental unit or on balconies.
9. MAINTENANCE. The Landlord is responsible for maintaining the unit in a good state of repair
   and fit for habitation, in compliance with health, safety and maintenance standards.
10. RIGHTS AND RESPONSIBILITIES. The Residential Tenancies Act, 2006 applies to this tenancy.
    Terms that conflict with the Act are void.

Both parties confirm they have read and agree to the terms above.`;

async function main() {
  console.log("Seeding…");

  // Order matters: children are deleted before parents, since not every FK cascades.
  await db.addonRequest.deleteMany();
  await db.passportAccess.deleteMany();
  await db.sharedPassport.deleteMany();
  await db.lease.deleteMany();
  await db.screeningCheck.deleteMany();
  await db.screeningOptIn.deleteMany();
  await db.application.deleteMany();
  await db.listing.deleteMany();
  await db.document.deleteMany();
  await db.tenantProfile.deleteMany();
  await db.otpCode.deleteMany();
  await db.lead.deleteMany();
  await db.user.deleteMany();

  // ── Users ────────────────────────────────────────────────────────────────
  // Accounts are ours: the API issues sessions and Resend delivers the sign-in codes, so there is
  // no external identity provider to create these through.
  const password = hashPassword("rentre-dev-password");

  const [greenfield, westEnd, harbour] = await Promise.all([
    db.user.create({ data: { email: "ops@greenfieldproperties.ca", name: "Greenfield Properties", role: "LANDLORD", passwordHash: password, createdAt: daysAgo(210) } }),
    db.user.create({ data: { email: "leasing@westendliving.ca", name: "West End Living", role: "LANDLORD", passwordHash: password, createdAt: daysAgo(180) } }),
    db.user.create({ data: { email: "rentals@harbourrealty.ca", name: "Harbour Realty Group", role: "LANDLORD", passwordHash: password, createdAt: daysAgo(150) } }),
  ]);

  const [justin, priya, marcus, chloe, jordan] = await Promise.all([
    db.user.create({ data: { email: "justin.peters@example.com", name: "Justin Peters", role: "TENANT", passwordHash: password, createdAt: daysAgo(40) } }),
    db.user.create({ data: { email: "priya.sharma@example.com", name: "Priya Sharma", role: "TENANT", passwordHash: password, createdAt: daysAgo(95) } }),
    db.user.create({ data: { email: "marcus.osei@example.com", name: "Marcus Osei", role: "TENANT", createdAt: daysAgo(12) } }), // passwordless
    db.user.create({ data: { email: "chloe.tremblay@example.com", name: "Chlo\u00e9 Tremblay", role: "TENANT", passwordHash: password, createdAt: daysAgo(30) } }),
    db.user.create({ data: { email: "jordan.lee@example.com", name: "Jordan Lee", role: "TENANT", passwordHash: password, createdAt: daysAgo(60) } }),
  ]);

  const realtor = await db.user.create({
    data: { email: "dana.whitfield@realty.ca", name: "Dana Whitfield", role: "REALTOR", passwordHash: password, createdAt: daysAgo(70) },
  });

  // ── Listings ───────────────────────────────────────────────────────────────
  const listingSeed = [
    {
      ownerId: greenfield.id, landlord: greenfield.name, postedDays: 2,
      address: "592 Sherbourne St", unit: "Unit 1204", neighbourhood: "St. James Town", city: "Toronto",
      price: 2150, unitType: "1br", bedrooms: 1, bathrooms: 1, sqft: 618, yearBuilt: 2019, rentControlled: false,
      moveIn: "Aug 1, 2025", leaseTerm: "12 months", image: PHOTO("photo-1762758731316-419c3c283ed9"),
      addOns: [{ label: "Parking", price: 165 }, { label: "Storage locker", price: 65 }, { label: "Utilities (water/heat)", price: 175 }, { label: "Air conditioning", price: "included" }],
      scores: { price: 8.9, location: 7.8, transit: 9.1, walkability: 8.4, amenities: 8.0, space: 6.5 },
    },
    {
      ownerId: westEnd.id, landlord: westEnd.name, postedDays: 5,
      address: "480 King St W", unit: "Loft 612", neighbourhood: "King West", city: "Toronto",
      price: 2850, unitType: "1br+den", bedrooms: 1, bathrooms: 1, sqft: 780, yearBuilt: 2004, rentControlled: true,
      moveIn: "Jul 15, 2025", leaseTerm: "12 months", image: PHOTO("photo-1774234528950-a2ba88c3c1b2"),
      addOns: [{ label: "Parking", price: 195 }, { label: "Gym access", price: "included" }, { label: "Concierge", price: "included" }],
      scores: { price: 5.8, location: 9.2, transit: 9.4, walkability: 9.5, amenities: 7.5, space: 7.8 },
    },
    {
      ownerId: greenfield.id, landlord: greenfield.name, postedDays: 1,
      address: "25 Maitland Place", unit: "Suite 804", neighbourhood: "Church-Wellesley", city: "Toronto",
      price: 1850, unitType: "bachelor", bedrooms: 0, bathrooms: 1, sqft: 440, yearBuilt: 1998, rentControlled: true,
      moveIn: "Aug 15, 2025", leaseTerm: "12 months", image: PHOTO("photo-1534714259038-764cb4cf1d58"),
      addOns: [{ label: "Storage locker", price: 55 }, { label: "Heat & water", price: "included" }],
      scores: { price: 9.2, location: 8.8, transit: 9.5, walkability: 9.2, amenities: 4.5, space: 4.2 },
    },
    {
      ownerId: harbour.id, landlord: harbour.name, postedDays: 7,
      address: "15 Queens Quay W", unit: "2201", neighbourhood: "Harbourfront", city: "Toronto",
      price: 3400, unitType: "2br", bedrooms: 2, bathrooms: 2, sqft: 1020, yearBuilt: 2014, rentControlled: true,
      moveIn: "Sep 1, 2025", leaseTerm: "24 months", image: PHOTO("photo-1588835743485-5845e40364fe"),
      addOns: [{ label: "Parking", price: 225 }, { label: "Storage locker", price: 80 }, { label: "Utilities (water/heat)", price: 195 }, { label: "EV charging", price: 45 }, { label: "Pool & gym", price: "included" }],
      scores: { price: 6.4, location: 8.9, transit: 7.2, walkability: 8.0, amenities: 9.5, space: 9.1 },
    },
    {
      ownerId: harbour.id, landlord: "Northside PM", postedDays: 3,
      address: "1185 Eglinton Ave W", unit: "Unit 301", neighbourhood: "Forest Hill", city: "Toronto",
      price: 2400, unitType: "2br", bedrooms: 2, bathrooms: 1, sqft: 890, yearBuilt: 2021, rentControlled: false,
      moveIn: "Aug 1, 2025", leaseTerm: "12 months", image: PHOTO("photo-1502736517152-bf3bd00bc61c"),
      addOns: [{ label: "Parking", price: 145 }, { label: "Heat & water", price: "included" }, { label: "Air conditioning", price: 85 }],
      scores: { price: 8.1, location: 7.2, transit: 6.8, walkability: 7.0, amenities: 7.2, space: 8.6 },
    },
    {
      ownerId: westEnd.id, landlord: "East End Estates", postedDays: 4,
      address: "220 Bain Ave", unit: null, neighbourhood: "Riverdale", city: "Toronto",
      price: 3100, unitType: "townhouse", bedrooms: 3, bathrooms: 2, sqft: 1350, yearBuilt: 1987, rentControlled: true,
      moveIn: "Sep 15, 2025", leaseTerm: "12 months", image: PHOTO("photo-1730097836048-aea8bddd57fc"),
      addOns: [{ label: "Parking (driveway)", price: "included" }, { label: "Utilities (water/heat)", price: 215 }],
      scores: { price: 7.5, location: 8.2, transit: 6.5, walkability: 7.8, amenities: 8.0, space: 9.4 },
    },
    {
      ownerId: realtor.id, landlord: "Pacific Residences", postedDays: 2,
      address: "888 Pacific Blvd", unit: "Unit 408", neighbourhood: "Yaletown", city: "Vancouver",
      price: 2950, unitType: "1br", bedrooms: 1, bathrooms: 1, sqft: 650, yearBuilt: 2016, rentControlled: true,
      moveIn: "Aug 1, 2025", leaseTerm: "12 months", image: PHOTO("photo-1695391006456-ec48c5b27c09"),
      addOns: [{ label: "Parking", price: 225 }, { label: "Storage", price: 75 }, { label: "Heat & hot water", price: "included" }],
      scores: { price: 6.5, location: 9.4, transit: 8.9, walkability: 9.6, amenities: 8.5, space: 6.8 },
    },
    {
      ownerId: realtor.id, landlord: "Plateau Properties", postedDays: 6,
      address: "410 Sherbrooke St W", unit: "Suite 705", neighbourhood: "Milton-Parc", city: "Montreal",
      price: 1750, unitType: "2br", bedrooms: 2, bathrooms: 1, sqft: 920, yearBuilt: 1972, rentControlled: true,
      moveIn: "Sep 1, 2025", leaseTerm: "12 months", image: PHOTO("photo-1782554262280-e2ece6e06282"),
      addOns: [{ label: "Heating", price: "included" }, { label: "Parking", price: 95 }],
      scores: { price: 9.5, location: 8.6, transit: 9.2, walkability: 8.8, amenities: 5.5, space: 8.9 },
    },
  ];

  const listings = await Promise.all(
    listingSeed.map(({ postedDays, image, ...l }) =>
      db.listing.create({
        data: { ...l, image, photos: [image, PHOTO("photo-1688646953306-5ec93eab8c06"), PHOTO("photo-1610276173132-c47d148ab626")], floorPlan: FLOOR_PLAN, createdAt: daysAgo(postedDays) },
      })
    )
  );
  const [sherbourne, kingW, maitland, queensQuay, eglinton] = listings;

  // One soft-deleted listing, so queries that forget `deletedAt: null` show up in testing.
  await db.listing.create({
    data: {
      ownerId: greenfield.id, landlord: greenfield.name, address: "70 Temperance St", unit: "Unit 905",
      neighbourhood: "Financial District", city: "Toronto", price: 2600, unitType: "1br", bedrooms: 1,
      bathrooms: 1, sqft: 590, yearBuilt: 2017, rentControlled: false, moveIn: "Jun 1, 2025",
      leaseTerm: "12 months", image: PHOTO("photo-1502736517152-bf3bd00bc61c"), photos: [], floorPlan: FLOOR_PLAN,
      addOns: [], scores: { price: 7, location: 9, transit: 9.8, walkability: 9.5, amenities: 7, space: 5.5 },
      createdAt: daysAgo(60), deletedAt: daysAgo(14),
    },
  });

  // ── Applications ───────────────────────────────────────────────────────────
  const priyaApp = await db.application.create({
    data: {
      listingId: kingW.id, tenantId: priya.id, tenantName: priya.name, status: "APPROVED",
      message: "I've been renting in King West for three years and would love to stay in the neighbourhood.",
      monthlyIncome: 7800, creditScore: 778, createdAt: daysAgo(21),
    },
  });

  const jordanApp = await db.application.create({
    data: {
      listingId: queensQuay.id, tenantId: jordan.id, tenantName: jordan.name, status: "APPROVED",
      message: "Relocating for work in September. Happy to provide references from my current landlord.",
      monthlyIncome: 9200, creditScore: 731, createdAt: daysAgo(18),
    },
  });

  const justinApp = await db.application.create({
    data: {
      listingId: sherbourne.id, tenantId: justin.id, tenantName: justin.name, status: "INTERVIEW",
      message: "Software engineer, no pets, non-smoker. Available for a viewing any weekend.",
      monthlyIncome: 7166, creditScore: 764, createdAt: daysAgo(4),
    },
  });

  const marcusApp = await db.application.create({
    data: {
      listingId: maitland.id, tenantId: marcus.id, tenantName: marcus.name, status: "REVIEWING",
      message: "Looking for a quiet bachelor unit close to the subway.", monthlyIncome: 4300,
      creditScore: 694, createdAt: daysAgo(3),
    },
  });

  await db.application.create({
    data: {
      listingId: eglinton.id, tenantId: chloe.id, tenantName: chloe.name, status: "DECLINED",
      message: "Interested in the Forest Hill unit for a Sept 1 move-in.", monthlyIncome: 5100,
      creditScore: 802, createdAt: daysAgo(11),
    },
  });

  await db.application.create({
    data: {
      listingId: sherbourne.id, tenantId: chloe.id, tenantName: chloe.name, status: "WITHDRAWN",
      monthlyIncome: 5100, creditScore: 802, createdAt: daysAgo(9),
    },
  });

  // ── Screening: consent, then the calls it authorises ───────────────────────
  await db.screeningOptIn.createMany({
    data: [
      { applicationId: justinApp.id, step: "REFERENCE", contactName: "Maple Ridge Property Management", contactPhone: "+14165550199", relationship: "Property Manager", consentedAt: daysAgo(3) },
      { applicationId: justinApp.id, step: "INTERVIEW", contactPhone: "+14165550142", consentedAt: daysAgo(3) },
      { applicationId: justinApp.id, step: "REPORT", consentedAt: daysAgo(3) },
      { applicationId: priyaApp.id, step: "REFERENCE", contactName: "Harbourfront Living", contactPhone: "+14165550177", relationship: "Landlord", consentedAt: daysAgo(20) },
      { applicationId: marcusApp.id, step: "INTERVIEW", contactPhone: "+16475550188", consentedAt: daysAgo(2) },
    ],
  });

  await db.screeningCheck.createMany({
    data: [
      {
        applicationId: justinApp.id, step: "REFERENCE", status: "DONE",
        conversationId: "conv_seed_justin_reference",
        summary: "Former property manager confirmed a 38-month tenancy with rent paid on time every month. No damage or noise complaints. Said they would rent to the applicant again without hesitation.",
        transcript: [
          { role: "agent", message: "Hi, I'm calling from Rentre about a reference for Justin Peters. Is now a good time?" },
          { role: "user", message: "Yes, go ahead." },
          { role: "agent", message: "How long was the tenancy?" },
          { role: "user", message: "A little over three years — three years and two months." },
          { role: "agent", message: "Was rent paid on time each month?" },
          { role: "user", message: "Every month, never late once." },
          { role: "agent", message: "Would you rent to him again?" },
          { role: "user", message: "Absolutely, no hesitation." },
        ],
        createdAt: daysAgo(3),
      },
      {
        applicationId: justinApp.id, step: "INTERVIEW", status: "CALLING",
        conversationId: "conv_seed_justin_interview", createdAt: daysAgo(1),
      },
      {
        applicationId: priyaApp.id, step: "REFERENCE", status: "FAILED",
        summary: "No result after an hour. You can request this check again.", createdAt: daysAgo(19),
      },
    ],
  });

  // ── Leases ─────────────────────────────────────────────────────────────────
  // Fully countersigned.
  const signedContent = {
    address: `${kingW.address}, ${kingW.unit}`, tenantName: priya.name, tenantEmail: priya.email,
    startDate: "2025-07-01", endDate: "2026-06-30", monthlyRent: 2850, deposit: 2850, terms: ONTARIO_TERMS,
  };
  await db.lease.create({
    data: {
      token: crypto.randomUUID(), applicationId: priyaApp.id, landlordId: westEnd.id, tenantId: priya.id,
      tenantName: priya.name, tenantEmail: priya.email, address: signedContent.address,
      startDate: date("2025-07-01"), endDate: date("2026-06-30"), monthlyRent: 2850, deposit: 2850,
      terms: ONTARIO_TERMS, hash: leaseHash(signedContent),
      landlordSignatureName: "Alison Reed", landlordSignedAt: daysAgo(20), landlordSignatureIp: "198.51.100.24",
      tenantSignatureName: "Priya Sharma", tenantSignedAt: daysAgo(19), tenantSignatureIp: "203.0.113.87",
      tenantSignatureUserAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15",
      createdAt: daysAgo(20),
    },
  });

  // Sent, awaiting the tenant — open /lease?t=<this token> to exercise the signing screen.
  const pendingToken = crypto.randomUUID();
  const pendingContent = {
    address: `${queensQuay.address}, ${queensQuay.unit}`, tenantName: jordan.name, tenantEmail: jordan.email,
    startDate: "2025-09-01", endDate: "2026-08-31", monthlyRent: 3400, deposit: 3400, terms: ONTARIO_TERMS,
  };
  await db.lease.create({
    data: {
      token: pendingToken, applicationId: jordanApp.id, landlordId: harbour.id, tenantId: jordan.id,
      tenantName: jordan.name, tenantEmail: jordan.email, address: pendingContent.address,
      startDate: date("2025-09-01"), endDate: date("2026-08-31"), monthlyRent: 3400, deposit: 3400,
      terms: ONTARIO_TERMS, hash: leaseHash(pendingContent),
      landlordSignatureName: "Marcus Hale", landlordSignedAt: daysAgo(2), landlordSignatureIp: "198.51.100.77",
      createdAt: daysAgo(2),
    },
  });

  // ── Tenant profiles ────────────────────────────────────────────────────────
  // Justin: the fully verified passport the V4 landlord view is designed around.
  await db.tenantProfile.create({
    data: {
      userId: justin.id,
      fullName: "Justin Peters", email: justin.email, phone: "(416) 555-0142", city: "Toronto",
      areas: ["King West", "Liberty Village", "Queen West"],
      unitType: "1br", bedrooms: "1", moveIn: "November 1, 2026", budgetMin: 2200, budgetMax: 2600,
      leaseTerm: "12 months", coApplicants: false,
      employment: "Full-time", employer: "TechCorp Inc.", jobTitle: "Software Engineer", income: "86000",
      verifiedIncome: 86000, incomeSource: "Notice of Assessment", employerDuration: "3 years, 2 months",
      incomeVerifiedAt: daysAgo(26), incomeStatus: "VERIFIED",
      currentAddress: "123 St, Toronto, Ontario M5V 0N7", timeAtAddress: "3 years, 2 months",
      currentLandlord: "Maple Ridge Property Management", landlordPhone: "+14165550199",
      priorLandlord: "Maple Ridge Property Management", priorProperty: "45 King St W, Toronto",
      priorRelationship: "Property Manager", priorContact: "+14165550199",
      confirmedTenancy: true, confirmedOnTime: true,
      identityStatus: "VERIFIED", identityMethod: "Government ID + liveness check", identityVerifiedAt: daysAgo(25),
      creditConsent: true, creditStatus: "VERIFIED",
      backgroundConsent: true, backgroundStatus: "VERIFIED",
      reportPulledAt: daysAgo(25), paymentHistory: "No delinquencies reported",
      ltbRecord: "No records found (source: CanLII)", pipedaConsentAt: daysAgo(25),
      characterReference: { name: "Dana Whitfield", relationship: "mentor", phone: "+14165550121", email: "dana.whitfield@realty.ca", consent: true },
    },
  });

  // Priya: complete, consented, awaiting one vendor result.
  await db.tenantProfile.create({
    data: {
      userId: priya.id,
      fullName: "Priya Sharma", email: priya.email, phone: "(647) 555-0164", city: "Toronto",
      areas: ["King West"], unitType: "1br+den", bedrooms: "1", moveIn: "July 1, 2025",
      budgetMin: 2500, budgetMax: 2900, leaseTerm: "12 months",
      employment: "Full-time", employer: "Shopify", jobTitle: "Product Designer", income: "93600",
      verifiedIncome: 93600, incomeSource: "Employment letter", employerDuration: "4 years",
      incomeVerifiedAt: daysAgo(90), incomeStatus: "VERIFIED",
      currentAddress: "88 Niagara St, Toronto, ON", timeAtAddress: "3 years",
      identityStatus: "VERIFIED", identityMethod: "Government ID + liveness check", identityVerifiedAt: daysAgo(90),
      creditConsent: true, creditStatus: "VERIFIED",
      backgroundConsent: true, backgroundStatus: "PENDING",
      pipedaConsentAt: daysAgo(92),
    },
  });

  // Marcus: just started — only basics, nothing consented.
  await db.tenantProfile.create({
    data: {
      userId: marcus.id, fullName: "Marcus Osei", email: marcus.email, phone: "(647) 555-0188",
      city: "Toronto", areas: ["Church-Wellesley"], budgetMax: 1900,
    },
  });

  // ── Documents ──────────────────────────────────────────────────────────────
  const docs = await Promise.all([
    db.document.create({ data: { ownerId: justin.id, kind: "GOVERNMENT_ID", fileName: "government_id_justin_peters.jpeg", storagePath: `${justin.id}/government_id_justin_peters.jpeg`, mimeType: "image/jpeg", sizeBytes: 842_112, uploadedAt: daysAgo(25) } }),
    db.document.create({ data: { ownerId: justin.id, kind: "NOTICE_OF_ASSESSMENT", fileName: "NOA_2025_justin_peters.pdf", storagePath: `${justin.id}/NOA_2025_justin_peters.pdf`, mimeType: "application/pdf", sizeBytes: 196_430, uploadedAt: daysAgo(26) } }),
    db.document.create({ data: { ownerId: justin.id, kind: "PAYSTUBS", fileName: "paystubs_aug2026.pdf", storagePath: `${justin.id}/paystubs_aug2026.pdf`, mimeType: "application/pdf", sizeBytes: 311_204, uploadedAt: daysAgo(24) } }),
    db.document.create({ data: { ownerId: justin.id, kind: "EMPLOYMENT_LETTER", fileName: "techcorp_employment_letter.pdf", storagePath: `${justin.id}/techcorp_employment_letter.pdf`, mimeType: "application/pdf", sizeBytes: 88_765, uploadedAt: daysAgo(24) } }),
    db.document.create({ data: { ownerId: westEnd.id, kind: "PROPERTY_TAX_BILL", fileName: "480_king_w_tax_bill_2026.pdf", storagePath: `${westEnd.id}/480_king_w_tax_bill_2026.pdf`, mimeType: "application/pdf", sizeBytes: 121_880, uploadedAt: daysAgo(6) } }),
  ]);
  const taxBill = docs[4];

  // ── Shared passport: live link, landlord unlocked it, then asked for extras ─
  const sharedToken = crypto.randomUUID();
  const passport = await db.sharedPassport.create({
    data: {
      token: sharedToken, ownerId: justin.id,
      recipientName: "Alison Reed", recipientEmail: "leasing@westendliving.ca", recipientUnit: "Loft 612",
      buildingAddress: "480 King St W, Toronto, ON M5V 1L3",
      data: {
        name: "Justin Peters", email: justin.email, phone: "(416) 555-0142", city: "Toronto",
        neighbourhoods: ["King West", "Liberty Village"], unitType: "1br", bedrooms: "1",
        moveIn: "November 1, 2026", budgetMax: "2600", employment: "Full-time",
        employer: "TechCorp Inc.", jobTitle: "Software Engineer", income: "86000",
        hasIncomeDoc: true, hasCreditDoc: true,
        currentAddress: "123 St, Toronto, Ontario M5V 0N7", timeAtAddress: "3 years, 2 months",
        currentLandlord: "Maple Ridge Property Management",
      },
      createdAt: daysAgo(6), expiresAt: daysAhead(8), // 14-day window, 6 days in
    },
  });

  await db.passportAccess.create({
    data: {
      passportId: passport.id, viewerId: westEnd.id, claimedUnit: "480 King St W, Toronto, ON M5V 1L3, Loft 612",
      proofType: "PROPERTY_TAX_BILL", proofDocumentId: taxBill.id,
      ipAddress: "198.51.100.24", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      verifiedAt: daysAgo(6),
    },
  });

  await db.addonRequest.createMany({
    data: [
      {
        passportId: passport.id, requesterId: westEnd.id, kind: "SERVICES", status: "COMPLETED",
        claimedUnit: "Loft 612", addons: ["REFERENCE_CALL", "LEASE_SIGNING", "RENT_BACK"],
        referenceQuestions: [
          "How long was the tenancy?",
          "Was rent paid on time each month?",
          "Would you rent to this applicant again?",
        ],
        createdAt: daysAgo(6),
      },
      {
        passportId: passport.id, requesterId: westEnd.id, kind: "DOCUMENTS", status: "REQUESTED",
        claimedUnit: "Loft 612", requestedDocuments: ["BANK_STATEMENT", "REFERENCE_LETTER"],
        createdAt: daysAgo(5),
      },
      {
        passportId: passport.id, requesterId: westEnd.id, kind: "VIEWING", status: "IN_PROGRESS",
        claimedUnit: "Loft 612", viewingDay: "Tue", viewingDate: "Sep 23", viewingTime: "1:00 PM",
        viewingNote: "Buzzer is out — I'll meet you in the lobby.", createdAt: daysAgo(5),
      },
    ],
  });

  // An expired link and a revoked one, so both refusal paths are testable.
  await db.sharedPassport.create({
    data: {
      token: crypto.randomUUID(), ownerId: priya.id, recipientName: "Harbour Realty Group",
      recipientEmail: "rentals@harbourrealty.ca", data: { name: "Priya Sharma", city: "Toronto" },
      createdAt: daysAgo(30), expiresAt: daysAgo(16),
    },
  });
  await db.sharedPassport.create({
    data: {
      token: crypto.randomUUID(), ownerId: priya.id, recipientName: "Northside PM",
      data: { name: "Priya Sharma", city: "Toronto" },
      createdAt: daysAgo(10), expiresAt: daysAhead(4), revokedAt: daysAgo(2),
    },
  });

  // ── Leads ──────────────────────────────────────────────────────────────────
  await db.lead.createMany({
    data: [
      { email: "sam.oconnell@example.com", intents: ["SAVE_REPORT", "RENT_ALERTS"], city: "Toronto", reportSnapshot: { tool: "mortgage", price: 720000, down: 108000, monthlyPayment: 3842.17 }, createdAt: daysAgo(8) },
      { email: "wen.liu@example.com", intents: ["RENT_ALERTS"], city: "Vancouver", createdAt: daysAgo(5) },
      { email: "aisha.khan@example.com", intents: ["RENEWAL_TIPS"], city: "Ottawa", reportSnapshot: { tool: "rta-notice", noticeType: "N1", earliestEffectiveDate: "2026-04-01" }, createdAt: daysAgo(2) },
    ],
  });

  const counts = {
    users: await db.user.count(),
    listings: await db.listing.count(),
    applications: await db.application.count(),
    optIns: await db.screeningOptIn.count(),
    checks: await db.screeningCheck.count(),
    leases: await db.lease.count(),
    profiles: await db.tenantProfile.count(),
    documents: await db.document.count(),
    passports: await db.sharedPassport.count(),
    accesses: await db.passportAccess.count(),
    addonRequests: await db.addonRequest.count(),
    leads: await db.lead.count(),
  };
  console.table(counts);
  console.log(`
Sign in as any seeded account by requesting an email code (Supabase Auth).`);
  console.log(`Unsigned lease, open to countersign:  /lease?t=${pendingToken}`);
  console.log(`Live shared passport:                 /share?t=${sharedToken}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
