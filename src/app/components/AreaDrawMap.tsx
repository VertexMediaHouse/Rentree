import { useEffect, useMemo, useRef, useState } from "react"
import { Circle, MapContainer, Polygon, TileLayer, Tooltip as LeafletTooltip, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet-draw/dist/leaflet.draw.css"
import "leaflet-draw"
import { Pencil, Trash2 } from "lucide-react"
import { pointInPolygon } from "../areaFilter"
import type { LatLng } from "../areaFilter"

/** The whole world, as a ring wound the opposite way to the hole — see GreyOutside. */
const WORLD_RING: LatLng[] = [
  [-90, -360],
  [-90, 360],
  [90, 360],
  [90, -360],
]

/**
 * Greys out everything outside the drawn area. Leaflet renders a Polygon's second ring as a hole,
 * so a world-sized outer ring with the drawn area as its hole gives exactly "everything except
 * here" in one shape — cheaper and seam-free compared to stitching four rectangles around it.
 */
function GreyOutside({ ring }: { ring: LatLng[] }) {
  return (
    <Polygon
      positions={[WORLD_RING, ring]}
      interactive={false}
      pathOptions={{ color: "transparent", weight: 0, fillColor: "#0f172a", fillOpacity: 0.55, fillRule: "evenodd" }}
    />
  )
}

/**
 * Wires Leaflet.draw's polygon handler to the map. Kept as a child of MapContainer because that
 * is the only place `useMap()` returns the live map instance.
 *
 * `drawing` is driven from React rather than Leaflet's own toolbar: the toolbar is a floating
 * Leaflet control that cannot be styled to match the rest of the UI, so the button lives outside
 * the map and this component only enables/disables the handler.
 */
function DrawHandler({ drawing, onDrawn, onCancel }: {
  drawing: boolean
  onDrawn: (ring: LatLng[]) => void
  onCancel: () => void
}) {
  const map = useMap()
  // Callbacks live in a ref so enabling the handler does not depend on their identity; otherwise
  // every parent render would tear down and rebuild a handler mid-draw.
  const cbs = useRef({ onDrawn, onCancel })
  cbs.current = { onDrawn, onCancel }

  useEffect(() => {
    if (!drawing) return

    const handler = new (L as any).Draw.Polygon(map, {
      allowIntersection: false,
      showArea: false,
      shapeOptions: { color: "#2563eb", weight: 2, fillColor: "#2563eb", fillOpacity: 0.12 },
    })

    const created = (e: any) => {
      const ring: LatLng[] = e.layer.getLatLngs()[0].map((p: L.LatLng) => [p.lat, p.lng] as LatLng)
      // Leaflet.draw adds its own layer to the map; we render the shape ourselves from state, so
      // drop theirs to avoid two stacked outlines.
      map.removeLayer(e.layer)
      if (ring.length >= 3) cbs.current.onDrawn(ring)
      else cbs.current.onCancel()
    }

    map.on((L as any).Draw.Event.CREATED, created)
    handler.enable()

    return () => {
      map.off((L as any).Draw.Event.CREATED, created)
      handler.disable()
    }
  }, [drawing, map])

  // A drawn area is only usable if the person can see all of it, so pressing Escape bails out.
  useEffect(() => {
    if (!drawing) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") cbs.current.onCancel() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [drawing])

  return null
}

/** Frames the map on whatever is relevant: the drawn area if there is one, else the city's zones. */
function FitTo({ ring, zones }: { ring: LatLng[] | null; zones: { lat: number; lng: number }[] }) {
  const map = useMap()
  useEffect(() => {
    if (ring?.length) {
      map.fitBounds(ring as L.LatLngBoundsExpression, { padding: [28, 28] })
      return
    }
    if (zones.length) map.fitBounds(zones.map(z => [z.lat, z.lng] as LatLng), { padding: [36, 36] })
  }, [map, ring, zones])
  return null
}

export interface AreaDrawMapProps {
  center: LatLng
  zoom: number
  zones: { id: string; label: string; lat: number; lng: number; r: number; popular?: boolean }[]
  /** Zone ids currently selected by clicking. Drawing takes over from these while active. */
  selectedZoneIds?: string[]
  onToggleZone?: (id: string) => void
  /** The drawn area, owned by the parent so filtering can use it. */
  area: LatLng[] | null
  onAreaChange: (ring: LatLng[] | null) => void
  /** Pins to show, e.g. the listings currently matching the other filters. */
  pins?: { id: string; lat: number; lng: number; label?: string }[]
  height?: number
}

/**
 * The map with a freeform "draw your own area" tool. Zone circles keep working exactly as before;
 * a drawn area simply takes precedence while it exists, which is why drawing clears nothing and
 * clearing the area restores the zone selection untouched.
 */
export function AreaDrawMap({
  center, zoom, zones, selectedZoneIds = [], onToggleZone,
  area, onAreaChange, pins = [], height = 320,
}: AreaDrawMapProps) {
  const [drawing, setDrawing] = useState(false)

  const pinsInside = useMemo(
    () => (area ? pins.filter(p => pointInPolygon([p.lat, p.lng], area)) : pins),
    [area, pins],
  )

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { if (area) onAreaChange(null); setDrawing(d => !d) }}
            aria-pressed={drawing}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              drawing
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-foreground hover:border-primary/40 hover:bg-secondary"
            }`}>
            <Pencil size={12} />
            {drawing ? "Click the map to draw" : area ? "Redraw area" : "Draw your own area"}
          </button>
          {area && !drawing && (
            <button
              type="button"
              onClick={() => onAreaChange(null)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
              <Trash2 size={12} />
              Clear area
            </button>
          )}
        </div>
        {area && (
          <span className="text-[10px] text-muted-foreground">
            {pinsInside.length} of {pins.length} in your area
          </span>
        )}
      </div>

      <div className="relative rounded-xl overflow-hidden border border-border" style={{ height }}>
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
          className="z-0">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <FitTo ring={area} zones={zones} />
          <DrawHandler
            drawing={drawing}
            onDrawn={ring => { onAreaChange(ring); setDrawing(false) }}
            onCancel={() => setDrawing(false)}
          />

          {/* Zone circles stay available, but are hidden under a drawn area so the two selection
              models never appear to be fighting each other on screen. */}
          {!area && zones.map(z => {
            const sel = selectedZoneIds.includes(z.id)
            return (
              <Circle
                key={z.id}
                center={[z.lat, z.lng]}
                radius={z.r}
                pathOptions={{
                  color: sel ? "#1d4ed8" : "#64748b",
                  weight: sel ? 2 : 1,
                  fillColor: sel ? "#2563eb" : "#94a3b8",
                  fillOpacity: sel ? 0.35 : 0.12,
                }}
                eventHandlers={onToggleZone ? { click: () => onToggleZone(z.id) } : {}}>
                <LeafletTooltip direction="center" permanent className="rentre-zone-label">
                  {z.label}{z.popular && !sel ? " · Popular" : ""}
                </LeafletTooltip>
              </Circle>
            )
          })}

          {area && (
            <>
              <GreyOutside ring={area} />
              <Polygon
                positions={area}
                interactive={false}
                pathOptions={{ color: "#2563eb", weight: 2, fillColor: "#2563eb", fillOpacity: 0.1 }}
              />
            </>
          )}

          {pinsInside.map(p => (
            <Circle
              key={p.id}
              center={[p.lat, p.lng]}
              radius={110}
              pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#2563eb", fillOpacity: 1 }}>
              {p.label && <LeafletTooltip direction="top">{p.label}</LeafletTooltip>}
            </Circle>
          ))}
        </MapContainer>

        {drawing && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[400] bg-foreground/80 px-3 py-2 text-center text-[11px] font-medium text-background">
            Click to add points · click the first point to close the shape · Esc to cancel
          </div>
        )}
      </div>
    </div>
  )
}
