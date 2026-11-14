import { createBrowserRouter } from "react-router"

import { ChromeLayout } from "./routes/ChromeLayout"
import { ErrorPage } from "./routes/ErrorPage"
import { NotFound } from "./routes/NotFound"
import { RootLayout } from "./routes/RootLayout"
import { RedirectIfSignedIn, RequireAuth } from "./routes/guards"

import { ApplicationsPage } from "./pages/ApplicationsPage"
import { BuildingDetailPage } from "./pages/BuildingDetailPage"
import { BuildingsPage } from "./pages/BuildingsPage"
import { ComingSoonPage } from "./pages/ComingSoonPage"
import { ConfirmedPage } from "./pages/ConfirmedPage"
import { ForLandlordsPage } from "./pages/ForLandlordsPage"
import { HomePage } from "./pages/HomePage"
import { InsurancePage } from "./pages/InsurancePage"
import { LandlordApplicationsPage } from "./pages/LandlordApplicationsPage"
import { LandlordCrmPage } from "./pages/LandlordCrmPage"
import { LandlordPortalPage } from "./pages/LandlordPortalPage"
import { ListingDetailPage } from "./pages/ListingDetailPage"
import { ListingsPage } from "./pages/ListingsPage"
import { MortgagePage } from "./pages/MortgagePage"
import { MortgageResultsPage } from "./pages/MortgageResultsPage"
import { OfferReviewPage } from "./pages/OfferReviewPage"
import { PassportPage } from "./pages/PassportPage"
import { PassportSharePage } from "./pages/PassportSharePage"
import { PaymentPage } from "./pages/PaymentPage"
import { PostListingPage } from "./pages/PostListingPage"
import { RequestViewingPage } from "./pages/RequestViewingPage"
import { SearchPage } from "./pages/SearchPage"
import { SignInPage } from "./pages/SignInPage"
import { TenantRightsPage } from "./pages/TenantRightsPage"

function HydrationFallback() {
  return null
}

export const router = createBrowserRouter([
  {
    // Providers and the error boundary wrap everything, including the standalone token pages.
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    HydrateFallback: HydrationFallback,
    children: [
      // ── Standalone pages: their own full-screen chrome, reached by emailed link ──
      {
        path: "/share",
        lazy: async () => {
          const m = await import("./SharedPackageScreen")
          return { Component: m.SharedPackagePage }
        },
      },
      {
        path: "/lease",
        lazy: async () => {
          const m = await import("./LeaseSignScreen")
          return { Component: m.LeaseSignPage }
        },
      },

      // ── Holding page: own full-screen chrome, no NavBar ──
      { path: "/coming-soon", element: <ComingSoonPage /> },

      // ── Landing page: no NavBar, matching `screen !== "home"` in the old AppShell ──
      { index: true, element: <HomePage /> },

      // ── Everything else carries the NavBar ──
      {
        element: <ChromeLayout />,
        children: [
          // Public
          { path: "for-landlords", element: <ForLandlordsPage /> },
          { path: "mortgage", element: <MortgagePage /> },
          { path: "mortgage/results", element: <MortgageResultsPage /> },

          // Renter-education modules
          { path: "tenant-rights", element: <TenantRightsPage /> },
          { path: "insurance", element: <InsurancePage /> },

          // Public browsing, with the screens' own inline sign-in prompts
          { path: "search", element: <SearchPage /> },
          { path: "buildings", element: <BuildingsPage /> },
          { path: "buildings/:id", element: <BuildingDetailPage /> },
          { path: "listings", element: <ListingsPage /> },
          { path: "listings/:id", element: <ListingDetailPage /> },

          // Signed-in users do not belong on the sign-in page
          {
            element: <RedirectIfSignedIn />,
            children: [{ path: "signin", element: <SignInPage /> }],
          },

          // Renter pages
          {
            element: <RequireAuth />,
            children: [
              { path: "passport", element: <PassportPage /> },
              { path: "passport/share", element: <PassportSharePage /> },
              { path: "listings/:id/request-viewing", element: <RequestViewingPage /> },
              { path: "applications", element: <ApplicationsPage /> },
              { path: "applications/:id/offer", element: <OfferReviewPage /> },
              { path: "applications/:id/payment", element: <PaymentPage /> },
              { path: "applications/:id/confirmed", element: <ConfirmedPage /> },
            ],
          },

          // Landlord and realtor share this section, as they did before
          {
            element: <RequireAuth roles={["landlord", "realtor"]} />,
            children: [
              { path: "landlord", element: <LandlordPortalPage /> },
              { path: "landlord/listings/new", element: <PostListingPage /> },
              { path: "landlord/applications", element: <LandlordApplicationsPage /> },
              { path: "landlord/crm", element: <LandlordCrmPage /> },
            ],
          },

          // Any unmatched path, with the NavBar so there is a way out
          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
])
