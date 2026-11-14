import { useEffect, useRef } from "react"
import type { ConversationStatus } from "@elevenlabs/react"

interface VisualizerProps {
  isSpeaking: boolean
  isListening: boolean
  status: ConversationStatus | string
  getInputData?: () => Uint8Array
  getOutputData?: () => Uint8Array
}

export function VoiceVerificationVisualizer({
  isSpeaking,
  isListening,
  status,
  getInputData,
  getOutputData,
}: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let phase = 0

    const render = () => {
      const width = canvas.width
      const height = canvas.height
      ctx.clearRect(0, 0, width, height)

      const isLive = status === "connected"
      let freqData: Uint8Array | null = null

      if (isSpeaking && getOutputData) {
        try {
          freqData = getOutputData()
        } catch {
          freqData = null
        }
      } else if (isListening && getInputData) {
        try {
          freqData = getInputData()
        } catch {
          freqData = null
        }
      }

      // Calculate audio energy level from frequency data if available
      let energy = 0
      if (freqData && freqData.length > 0) {
        let sum = 0
        const sampleCount = Math.min(freqData.length, 64)
        for (let i = 0; i < sampleCount; i++) {
          sum += freqData[i]
        }
        energy = Math.min(1, (sum / sampleCount) / 128)
      } else if (isSpeaking) {
        energy = 0.5 + 0.3 * Math.sin(phase * 4)
      } else if (isListening) {
        energy = 0.25 + 0.15 * Math.sin(phase * 3)
      } else if (isLive) {
        energy = 0.1 + 0.05 * Math.sin(phase * 2)
      }

      phase += 0.04

      const centerX = width / 2
      const centerY = height / 2

      // ── Background Glow ──
      const glowRadius = Math.max(20, 60 * (1 + energy * 0.8))
      const glow = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, glowRadius)
      if (isSpeaking) {
        glow.addColorStop(0, "rgba(217, 168, 78, 0.45)")
        glow.addColorStop(0.5, "rgba(45, 90, 60, 0.25)")
        glow.addColorStop(1, "rgba(45, 90, 60, 0)")
      } else if (isListening) {
        glow.addColorStop(0, "rgba(59, 130, 246, 0.4)")
        glow.addColorStop(0.5, "rgba(37, 99, 235, 0.2)")
        glow.addColorStop(1, "rgba(37, 99, 235, 0)")
      } else if (isLive) {
        glow.addColorStop(0, "rgba(34, 197, 94, 0.3)")
        glow.addColorStop(1, "rgba(34, 197, 94, 0)")
      } else {
        glow.addColorStop(0, "rgba(160, 160, 160, 0.15)")
        glow.addColorStop(1, "rgba(160, 160, 160, 0)")
      }
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2)
      ctx.fill()

      // ── Dynamic Audio Wave Bars (Frequency Spectrum) ──
      const barCount = 36
      const barWidth = 3.5
      const spacing = (width - 40) / barCount
      const startX = 20

      for (let i = 0; i < barCount; i++) {
        const x = startX + i * spacing
        const distFromCenter = Math.abs(i - barCount / 2) / (barCount / 2)
        const taper = Math.cos(distFromCenter * (Math.PI / 2.3))

        let barHeight = 4
        if (isLive) {
          if (freqData && freqData.length > i * 2) {
            const rawVal = freqData[i * 2] / 255
            barHeight = Math.max(4, rawVal * (height * 0.75) * taper)
          } else {
            const wave = Math.sin(phase * 3 + i * 0.35) * Math.cos(phase * 2 - i * 0.2)
            barHeight = Math.max(4, (12 + 40 * energy * Math.abs(wave)) * taper)
          }
        }

        const y = centerY - barHeight / 2

        // Color based on role
        const grad = ctx.createLinearGradient(x, y, x, y + barHeight)
        if (isSpeaking) {
          grad.addColorStop(0, "#e6b84f")
          grad.addColorStop(0.5, "#2d5a3c")
          grad.addColorStop(1, "#1e3d28")
        } else if (isListening) {
          grad.addColorStop(0, "#60a5fa")
          grad.addColorStop(0.5, "#3b82f6")
          grad.addColorStop(1, "#1d4ed8")
        } else if (isLive) {
          grad.addColorStop(0, "#4ade80")
          grad.addColorStop(1, "#15803d")
        } else {
          grad.addColorStop(0, "#9ca3af")
          grad.addColorStop(1, "#4b5563")
        }

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, Math.max(barHeight, 4), 2)
        ctx.fill()
      }

      // ── Central Pulsing Core ──
      const coreRadius = isLive ? 12 + energy * 8 : 10
      ctx.beginPath()
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2)
      ctx.fillStyle = isSpeaking
        ? "#e6b84f"
        : isListening
        ? "#60a5fa"
        : isLive
        ? "#22c55e"
        : "#9ca3af"
      ctx.shadowColor = ctx.fillStyle
      ctx.shadowBlur = isLive ? 14 : 4
      ctx.fill()
      ctx.shadowBlur = 0

      animFrameRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [isSpeaking, isListening, status, getInputData, getOutputData])

  return (
    <div className="relative flex flex-col items-center justify-center py-2">
      <canvas
        ref={canvasRef}
        width={380}
        height={110}
        className="w-full max-w-[380px] h-[110px]"
      />
      <div className="mt-1 flex items-center gap-2">
        <span
          className={`size-2 rounded-full ${
            status === "connected"
              ? isSpeaking
                ? "bg-[#e6b84f] animate-ping"
                : isListening
                ? "bg-blue-500 animate-pulse"
                : "bg-green-500"
              : status === "connecting"
              ? "bg-amber-500 animate-pulse"
              : "bg-muted-foreground/40"
          }`}
        />
        <span className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {status === "connected"
            ? isSpeaking
              ? "Agent Speaking..."
              : isListening
              ? "Listening to your voice..."
              : "Connected · Ready"
            : status === "connecting"
            ? "Connecting to WebRTC audio..."
            : status === "disconnecting"
            ? "Disconnecting..."
            : "Offline · Click Start to Connect"}
        </span>
      </div>
    </div>
  )
}
