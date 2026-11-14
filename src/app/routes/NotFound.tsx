import { Link } from "react-router"
import { BODY, DISPLAY, MONO } from "../App"

export function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ fontFamily: BODY }}>
      <div className="max-w-sm w-full">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary mb-3" style={{ fontFamily: MONO }}>
          Error 404
        </p>
        <h1 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: DISPLAY }}>
          This page doesn{"'"}t exist
        </h1>
        <p className="text-sm text-muted-foreground mb-7 leading-relaxed">
          The link may be out of date, or the page may have moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all">
          Back to home
        </Link>
      </div>
    </div>
  )
}
