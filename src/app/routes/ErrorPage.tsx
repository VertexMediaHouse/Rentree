import { isRouteErrorResponse, useRouteError } from "react-router"
import { BODY, DISPLAY, MONO } from "../App"
import { NotFound } from "./NotFound"

/**
 * Route-level error boundary. A thrown 404 response renders the not-found page so a bad URL looks
 * the same however it was reached; anything else is an unexpected failure.
 */
export function ErrorPage() {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />

  const label = isRouteErrorResponse(error) ? `Error ${error.status}` : "Something went wrong"
  const detail = isRouteErrorResponse(error)
    ? error.statusText || undefined
    : error instanceof Error
      ? error.message
      : undefined

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ fontFamily: BODY }}>
      <div className="max-w-sm w-full">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-destructive mb-3" style={{ fontFamily: MONO }}>
          {label}
        </p>
        <h1 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: DISPLAY }}>
          This page didn{"'"}t load
        </h1>
        <p className="text-sm text-muted-foreground mb-7 leading-relaxed">
          Reloading usually fixes it. If it keeps happening, the problem is on our side.
        </p>
        {detail && (
          <p className="mb-7 rounded-xl border border-border bg-card px-4 py-3 text-left text-xs text-muted-foreground break-words" style={{ fontFamily: MONO }}>
            {detail}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all">
            Reload
          </button>
          {/* A full load, not a client-side link: the router state may be what broke. */}
          <a
            href="/"
            className="rounded-xl border-2 border-border px-6 py-3.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-all">
            Home
          </a>
        </div>
      </div>
    </div>
  )
}
