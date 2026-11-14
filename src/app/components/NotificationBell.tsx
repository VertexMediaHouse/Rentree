import { useEffect, useRef, useState } from "react"
import { Bell } from "lucide-react"
import { fetchNotifications, markNotificationsRead } from "../../services/api"
import type { Notification } from "../../services/api"

/**
 * The bell in the NavBar. Polls every 60s while mounted; opening the panel marks everything read.
 * Renders nothing until the first successful fetch so a signed-out or offline session shows no bell.
 */
export function NotificationBell({ onNavigate }: { onNavigate: (href: string) => void }) {
  const [items, setItems] = useState<Notification[] | null>(null)
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const load = () => fetchNotifications().then(r => { setItems(r.data.notifications); setUnread(r.data.unread) }).catch(() => {})

  useEffect(() => {
    load()
    const t = setInterval(load, 60_000) // ponytail: polling; swap for SSE if volume ever matters
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [open])

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (next && unread > 0) {
      setUnread(0)
      setItems(list => list?.map(n => ({ ...n, read: true })) ?? null)
      markNotificationsRead().catch(() => {})
    }
  }

  if (items === null) return null

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        className="relative p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
        <Bell size={16} />
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl border border-border bg-card shadow-lg z-50 text-sm">
          {items.length === 0
            ? <p className="p-4 text-muted-foreground">Nothing yet. Save a building and we will tell you when a unit opens.</p>
            : items.map(n => (
              <button key={n.id} onClick={() => { setOpen(false); if (n.href) onNavigate(n.href) }}
                className={`w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-secondary transition-colors ${n.read ? "" : "bg-primary/5"}`}>
                <p className="font-semibold text-foreground">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}</p>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
