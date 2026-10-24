import { createBrowserRouter } from "react-router"

function HydrationFallback() {
  return null
}

export const router = createBrowserRouter([
  {
    path: "/share",
    HydrateFallback: HydrationFallback,
    lazy: async () => {
      const module = await import("./SharedPackageScreen")
      return { Component: module.SharedPackagePage }
    },
  },
  {
    path: "*",
    HydrateFallback: HydrationFallback,
    lazy: async () => {
      const module = await import("./App")
      return { Component: module.AppShell }
    },
  },
])
