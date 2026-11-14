import { useState } from "react"
import { Sparkles, Mic, X } from "lucide-react"
import { useVoiceVerification } from "../context/VoiceVerificationContext"
import { MONO } from "../fonts"

export function VoiceVerificationLauncher() {
  const { openVerification, isOpen } = useVoiceVerification()
  const [minimized, setMinimized] = useState(false)

  if (isOpen) return null

  if (minimized) {
    return (
      <button
        onClick={() => {
          setMinimized(false)
          openVerification()
        }}
        className="fixed bottom-6 right-6 z-40 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition hover:scale-105 hover:bg-primary/90"
        title="Open Rentre AI Voice Verification"
      >
        <Mic size={20} />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 group animate-in slide-in-from-bottom-5 duration-300">
      <button
        onClick={() => openVerification()}
        className="flex items-center gap-2.5 rounded-full border border-primary/30 bg-card/95 py-2.5 pl-3.5 pr-4 text-xs font-semibold text-foreground shadow-[0_8px_30px_rgba(45,90,60,0.18)] backdrop-blur-md transition-all hover:border-primary hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(45,90,60,0.25)]"
      >
        <span className="relative flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles size={14} className="animate-pulse" />
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-green-400 ring-2 ring-card animate-ping" />
        </span>
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground">AI Voice Verification</span>
            <span className="rounded bg-primary/10 px-1 py-0.2 font-mono text-[9px] font-bold text-primary" style={{ fontFamily: MONO }}>
              LIVE
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground block -mt-0.5">
            ElevenLabs ConvAI
          </span>
        </div>
      </button>

      <button
        onClick={() => setMinimized(true)}
        className="flex size-7 items-center justify-center rounded-full border border-border bg-card/80 text-muted-foreground hover:text-foreground hover:bg-secondary backdrop-blur transition"
        title="Minimize"
      >
        <X size={12} />
      </button>
    </div>
  )
}
