import { useEffect, useRef } from "react"

const FOCUSABLE = [
  "a[href]", "button:not([disabled])", "input:not([disabled])",
  "select:not([disabled])", "textarea:not([disabled])", '[tabindex]:not([tabindex="-1"])',
].join(",")

// Topmost shell wins Escape, so a modal opened over another one closes alone.
const stack: symbol[] = []

/**
 * Keyboard behaviour for the hand-rolled modals in App.tsx: Escape closes, Tab stays inside,
 * focus returns to whatever opened it, and the page behind stops scrolling.
 *
 * Drop it in as the first child of the modal's outermost element — it adopts that element as
 * the trap boundary, so no modal has to give up its own markup, roles or layout classes.
 */
export function ModalKeys({ onClose }: { onClose: () => void }) {
  const anchor = useRef<HTMLSpanElement>(null)
  // Call sites pass inline arrows, so read onClose through a ref and keep the effect at mount-only.
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const container = anchor.current?.parentElement
    if (!container) return

    const id = Symbol("modal")
    stack.push(id)
    const opener = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const focusable = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))

    // Start the keyboard inside the modal rather than back on the page behind it.
    focusable()[0]?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return
      if (e.key === "Escape") { close.current(); return }
      if (e.key !== "Tab") return
      const items = focusable()
      if (items.length === 0) return
      const active = document.activeElement
      const leaving = e.shiftKey ? items[0] : items[items.length - 1]
      if (active === leaving || !container.contains(active)) {
        e.preventDefault()
        ;(e.shiftKey ? items[items.length - 1] : items[0]).focus()
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      stack.splice(stack.indexOf(id), 1)
      if (stack.length === 0) document.body.style.overflow = prevOverflow
      opener?.focus()
    }
  }, [])

  return <span ref={anchor} hidden />
}
