const TOKEN_KEY = "rentre_token";
const API_BASE = import.meta.env.VITE_API_URL || "";

export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

export const getToken = () => localStorage.getItem(TOKEN_KEY);

/** Every call carries the session token this API issued at sign-in. */
async function request<T = any>(method: string, url: string, body?: unknown): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }));
  if (!res.ok) throw Object.assign(new Error(json.error || `HTTP ${res.status}`), { details: json.details, status: res.status });
  return json;
}

export async function fetchListings(params?: { city?: string; minPrice?: number; maxPrice?: number; priorities?: string[]; page?: number; limit?: number; sort?: string }) {
  const q = new URLSearchParams();
  if (params?.city) q.append("city", params.city);
  if (params?.minPrice) q.append("minPrice", String(params.minPrice));
  if (params?.maxPrice) q.append("maxPrice", String(params.maxPrice));
  if (params?.priorities?.length) q.append("priorities", params.priorities.join(","));
  if (params?.page) q.append("page", String(params.page));
  if (params?.limit) q.append("limit", String(params.limit));
  if (params?.sort) q.append("sort", params.sort);
  return request("GET", `/api/listings?${q}`);
}

export const fetchMe = () => request("GET", "/api/auth/me");
export const register = (data: { email: string; password: string; name: string; role: "tenant" | "landlord" }) => request("POST", "/api/auth/register", data);
export const login = (data: { email: string; password: string }) => request("POST", "/api/auth/login", data);
export const createListing = (data: unknown) => request("POST", "/api/listings", data);
export const fetchApplications = () => request("GET", "/api/applications");
export const submitApplication = (data: { listingId: string; message?: string; monthlyIncome?: number; creditScore?: number }) => request("POST", "/api/applications", data);
export const updateApplicationStatus = (id: string, status: string) => request("PATCH", `/api/applications/${id}/status`, { status });

export const calculateMortgage = (data: unknown) => request("POST", "/api/calculate/mortgage", data);
export const calculateMatchScore = (scores: unknown, prefs: unknown) => request("POST", "/api/calculate/match", { scores, prefs });
export const calculateRTANotice = (params: unknown) => request("POST", "/api/calculate/rta-notice", params);
export const calculateInvestment = (data: unknown) => request("POST", "/api/calculate/investment", data);

export const calculateRentScore = (data: unknown) => request("POST", "/api/calculate/rent-score", data);
export const calculateDealScore = (data: unknown) => request("POST", "/api/calculate/deal-score", data);
export const submitLead = (data: { email: string; intents: string[]; city?: string; reportSnapshot?: Record<string, unknown> }) => request("POST", "/api/leads", data);
export const redactLease = (text: string) => request("POST", "/api/lease/redact", { text });
export const fetchProfile = () => request("GET", "/api/profile");
export const saveProfile = (data: unknown) => request("PUT", "/api/profile", data);
export const fetchMyListings = () => request("GET", "/api/listings/mine");
export const updateListing = (id: string, data: unknown) => request("PATCH", `/api/listings/${id}`, data);
export const deleteListing = (id: string) => request("DELETE", `/api/listings/${id}`);
export const sharePassport = (data: { recipientName: string; recipientEmail: string; recipientUnit?: string; passport: Record<string, unknown> }) => request("POST", "/api/passport/share", data)
export const fetchSharedPassport = (token: string) => request("GET", `/api/passport/${encodeURIComponent(token)}`)
export const revokeSharedPassport = (token: string) => request("DELETE", `/api/passport/${encodeURIComponent(token)}`)

// The landlord's ownership gate. Logs the claim for compliance and returns the passport.
export const verifyPassportOwnership = (token: string, data: { claimedUnit: string; proofType: "property_tax_bill" | "utility_bill"; proofFileName?: string }) =>
  request("POST", `/api/passport/${encodeURIComponent(token)}/access`, data)

type AddonRequestBody =
  | { kind: "services"; claimedUnit: string; addons: string[]; referenceQuestions?: string[] }
  | { kind: "documents"; claimedUnit: string; requestedDocuments: string[] }
  | { kind: "viewing"; claimedUnit: string; viewingDay: string; viewingDate: string; viewingTime: string; viewingNote?: string }

export const requestPassportAddons = (token: string, data: AddonRequestBody) =>
  request("POST", `/api/passport/${encodeURIComponent(token)}/requests`, data)

export const createLeaseFromPassport = (data: { passportToken: string; address: string; startDate: string; endDate?: string; monthlyRent: number; deposit?: number; terms: string; signatureName: string }) =>
  request("POST", "/api/leases/from-passport", data)
export const requestSignInCode = (email: string, name?: string) => request("POST", "/api/auth/otp/request", { email, name })
export const verifySignInCode = (email: string, code: string) => request("POST", "/api/auth/otp/verify", { email, code })

type CheckType = "reference" | "interview" | "report"
export type ReferenceQuestion = { id: string; text: string; order: number; counsel: boolean }
export const setScreeningOptIns = (applicationId: string, data: { reference?: { name: string; phone: string; relationship: string } | null; interview?: { phone: string } | null; report?: true | null }) => request("PUT", `/api/applications/${applicationId}/opt-in`, data)
// The fixed 15-question bank the landlord picks 7–10 from.
export const fetchReferenceQuestions = () => request<{ success: boolean; data: ReferenceQuestion[] }>("GET", "/api/applications/reference-questions")
// questionIds (7–10, bank order enforced server-side) are required when type === "reference".
export const requestScreeningCheck = (applicationId: string, type: CheckType, questionIds?: string[]) => request("POST", `/api/applications/${applicationId}/checks`, { type, ...(questionIds ? { questionIds } : {}) })
export const fetchScreeningChecks = (applicationId: string) => request("GET", `/api/applications/${applicationId}/checks`)

// Landlord-written reference questions. Unusable in a call until a reviewer approves one by email.
export type CustomQuestion = { id: string; text: string; status: "pending" | "approved" | "rejected"; custom: true }
export const fetchCustomQuestions = () => request<{ success: boolean; data: CustomQuestion[] }>("GET", "/api/custom-questions")
export const createCustomQuestion = (text: string) => request<{ success: boolean; data: CustomQuestion }>("POST", "/api/custom-questions", { text })
export const createLease = (data: { applicationId: string; startDate: string; endDate?: string; monthlyRent: number; deposit?: number; terms: string; signatureName: string }) => request("POST", "/api/leases", data)
export const fetchLease = (token: string) => request("GET", `/api/leases/${encodeURIComponent(token)}`)
export const signLease = (token: string, signatureName: string) => request("POST", `/api/leases/${encodeURIComponent(token)}/sign`, { signatureName, agree: true })

export const fetchConversationToken = (agentId?: string) =>
  request<{ success: boolean; data: { token: string; conversation_id?: string } }>(
    "GET",
    `/api/elevenlabs/token${agentId ? `?agent_id=${encodeURIComponent(agentId)}` : ""}`
  )


// ─── Lease revisions ─────────────────────────────────────────────────────────

export type LeaseRevision = {
  id: string
  version: number
  proposedBy: "landlord" | "tenant"
  status: "proposed" | "accepted" | "rejected" | "withdrawn"
  startDate: string
  endDate?: string
  monthlyRent: number
  deposit?: number
  terms: string
  note?: string
  decidedAt?: string
  createdAt: string
}

export type LeaseFields = {
  startDate: string
  endDate?: string
  monthlyRent: number
  deposit?: number
  terms: string
}

export const proposeLeaseRevision = (token: string, data: LeaseFields & { note?: string }) =>
  request<{ success: boolean; data: LeaseRevision }>("POST", `/api/leases/${encodeURIComponent(token)}/revisions`, data)

/** accept and reject are for the other party; withdraw is for the proposer. */
export const decideLeaseRevision = (token: string, id: string, action: "accept" | "reject" | "withdraw") =>
  request("POST", `/api/leases/${encodeURIComponent(token)}/revisions/${encodeURIComponent(id)}/${action}`)

/** The landlord re-signs after an accepted revision cleared their signature. */
export const countersignLease = (token: string, signatureName: string) =>
  request("POST", `/api/leases/${encodeURIComponent(token)}/countersign`, { signatureName, agree: true })

// ─── Rent roll & vacancy alerts ──────────────────────────────────────────────

export type RentRollEntry = {
  id?: string
  unit: string
  bedrooms: number
  rent: number
  vacant?: boolean
  availableFrom?: string
  leaseEnd?: string
}

export type RentRollSummary = {
  units: number
  vacant: number
  priceFrom: number | null
  priceTo: number | null
  bedrooms: number[]
}

/** Replaces the whole roll for one listing; `notified` counts renters alerted to new vacancies. */
export const uploadRentRoll = (listingId: string, entries: RentRollEntry[]) =>
  request<{ success: boolean; data: { entries: RentRollEntry[]; summary: RentRollSummary; notified: number } }>(
    "POST", "/api/rent-roll", { listingId, entries })

export const fetchRentRoll = (listingId: string) =>
  request<{ success: boolean; data: { entries: RentRollEntry[]; summary: RentRollSummary } }>(
    "GET", `/api/rent-roll/listing/${encodeURIComponent(listingId)}`)

/** Public: counts and a price range, never unit numbers. */
export const fetchRentRollSummary = (listingId: string) =>
  request<{ success: boolean; data: RentRollSummary }>(
    "GET", `/api/rent-roll/listing/${encodeURIComponent(listingId)}/summary`)

export type SavedBuilding = {
  id: string
  listingId: string
  moveInFrom?: string
  moveInTo?: string
  listing: { id: string; address: string; neighbourhood: string; city: string; image: string; price: number }
}

export const fetchSavedBuildings = () =>
  request<{ success: boolean; data: SavedBuilding[] }>("GET", "/api/rent-roll/saved")

export const saveBuilding = (data: { listingId: string; moveInFrom?: string; moveInTo?: string }) =>
  request("POST", "/api/rent-roll/saved", data)

export const unsaveBuilding = (listingId: string) =>
  request("DELETE", `/api/rent-roll/saved/${encodeURIComponent(listingId)}`)

// ─── Notifications ───────────────────────────────────────────────────────────

export type Notification = {
  id: string
  kind: "vacancy_match" | "lease_revision" | "application_status"
  title: string
  body: string
  href?: string
  read: boolean
  createdAt: string
}

export const fetchNotifications = () =>
  request<{ success: boolean; data: { notifications: Notification[]; unread: number } }>("GET", "/api/notifications")

/** Omit `id` to mark every unread notification read. */
export const markNotificationsRead = (id?: string) =>
  request<{ success: boolean; data: { marked: number } }>("POST", "/api/notifications/read", id ? { id } : {})
