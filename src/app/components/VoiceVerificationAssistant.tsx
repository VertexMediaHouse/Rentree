import { useCallback, useEffect, useRef, useState } from "react"
import { useConversation } from "@elevenlabs/react"
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneCall,
  PhoneOff,
  Sparkles,
  ShieldCheck,
  Send,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Radio,
  Sliders,
} from "lucide-react"
import { DISPLAY, MONO } from "../fonts"
import { VoiceVerificationVisualizer } from "./VoiceVerificationVisualizer"

// Public agent id (safe to ship; it is not a secret). Unset = let the server choose from its env.
export const RENTRE_AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID || ""
export const RENTRE_AGENT_NAME = "Rentre Verification"

export interface MessageItem {
  id: string
  role: "user" | "agent"
  text: string
  timestamp: string
}

interface VoiceVerificationAssistantProps {
  applicationId?: string
  tenantName?: string
  listingAddress?: string
  compact?: boolean
  onClose?: () => void
}

export function VoiceVerificationAssistant({
  applicationId,
  tenantName,
  listingAddress,
  compact = false,
  onClose,
}: VoiceVerificationAssistantProps) {
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [inputText, setInputText] = useState("")
  const [volume, setVolumeLevel] = useState(0.8)
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false)
  const [connectionType, setConnectionType] = useState<"webrtc" | "websocket">("webrtc")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [copiedTranscript, setCopiedTranscript] = useState(false)
  const [duration, setDuration] = useState(0)
  const [userRating, setUserRating] = useState<"up" | "down" | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const conversation = useConversation({
    onConnect: () => {
      setErrorMessage(null)
      setDuration(0)
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    },
    onDisconnect: () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    },
    onMessage: (messagePayload: any) => {
      // payload may have { message: string, role: "user" | "agent" | "ai" }
      const text = messagePayload?.message || ""
      if (!text.trim()) return

      const rawRole = messagePayload?.role || messagePayload?.source || "agent"
      const role: "user" | "agent" = rawRole === "user" ? "user" : "agent"

      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).slice(2, 9),
          role,
          text,
          timestamp: now,
        },
      ])
    },
    onError: (err: any) => {
      console.error("ElevenLabs Conversation error:", err)
      const errStr = typeof err === "string" ? err : err?.message || "Conversation connection failed."
      setErrorMessage(errStr)
    },
  })

  const { status, isSpeaking, isListening, isMuted, setMuted } = conversation

  // Auto-scroll transcript
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Start conversation session
  const startConversation = useCallback(async () => {
    setErrorMessage(null)
    setUserRating(null)
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true })
      }
    } catch (permErr: any) {
      setErrorMessage("Microphone access is required. Please grant permission in your browser.")
      return
    }

    try {
      // Dynamic variables / context overrides
      const dynamicVars: Record<string, string> = {
        platform: "Rentre",
      }
      if (applicationId) dynamicVars.application_id = applicationId
      if (tenantName) dynamicVars.applicant_name = tenantName
      if (listingAddress) dynamicVars.listing_address = listingAddress

      let sessionToken: string | undefined = undefined
      try {
        const tokenRes = await fetch(`/api/elevenlabs/token${RENTRE_AGENT_ID ? `?agent_id=${encodeURIComponent(RENTRE_AGENT_ID)}` : ""}`)
        if (tokenRes.ok) {
          const json = await tokenRes.json()
          if (json?.data?.token) {
            sessionToken = json.data.token
          }
        }
      } catch (tokenErr) {
        // Fall back to direct agentId
        console.warn("Could not retrieve conversation token from server, connecting via agent ID:", tokenErr)
      }

      if (sessionToken) {
        await conversation.startSession({
          conversationToken: sessionToken,
          connectionType: "webrtc",
          dynamicVariables: dynamicVars,
        })
      } else if (RENTRE_AGENT_ID) {
        await conversation.startSession({
          agentId: RENTRE_AGENT_ID,
          connectionType,
          dynamicVariables: dynamicVars,
        })
      } else {
        // No token and no public agent id: nothing to connect to. Surface it instead of hanging.
        throw new Error("Voice verification is unavailable right now. Please try again later.")
      }
    } catch (err: any) {
      console.error("Failed to start session:", err)
      setErrorMessage(err?.message || "Failed to start AI conversation session.")
    }
  }, [conversation, connectionType, applicationId, tenantName, listingAddress])

  // Stop conversation session
  const stopConversation = useCallback(async () => {
    try {
      await conversation.endSession()
    } catch (err) {
      console.error("Failed to end session:", err)
    }
  }, [conversation])

  // Volume handler
  const handleVolumeChange = (newVol: number) => {
    setVolumeLevel(newVol)
    setIsSpeakerMuted(newVol === 0)
    conversation.setVolume({ volume: newVol })
  }

  const toggleSpeakerMute = () => {
    if (isSpeakerMuted) {
      setIsSpeakerMuted(false)
      const vol = volume > 0 ? volume : 0.8
      setVolumeLevel(vol)
      conversation.setVolume({ volume: vol })
    } else {
      setIsSpeakerMuted(true)
      conversation.setVolume({ volume: 0 })
    }
  }

  // Send typed user message
  const handleSendTextMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputText.trim()) return

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    const text = inputText.trim()
    setInputText("")

    // Add to local message list
    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2, 9),
        role: "user",
        text,
        timestamp: now,
      },
    ])

    // Send to agent
    try {
      conversation.sendUserMessage(text)
    } catch (err) {
      console.error("Error sending text message:", err)
    }
  }

  // Quick suggestion prompts
  const quickPrompts = [
    "Verify my identity and income details",
    "What documents are needed for my Renter Passport?",
    "Simulate a landlord reference check interview",
    "How does Rentre protect my privacy?",
  ]

  const handlePromptClick = (prompt: string) => {
    if (status === "connected") {
      setInputText(prompt)
      conversation.sendUserMessage(prompt)
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).slice(2, 9),
          role: "user",
          text: prompt,
          timestamp: now,
        },
      ])
    } else {
      setInputText(prompt)
    }
  }

  // Copy transcript
  const copyTranscript = () => {
    if (messages.length === 0) return
    const formatted = messages
      .map((m) => `[${m.timestamp}] ${m.role === "agent" ? RENTRE_AGENT_NAME : "Applicant"}: ${m.text}`)
      .join("\n")
    navigator.clipboard.writeText(formatted)
    setCopiedTranscript(true)
    setTimeout(() => setCopiedTranscript(false), 2000)
  }

  // Feedback
  const handleFeedback = (rating: "up" | "down") => {
    setUserRating(rating)
    try {
      conversation.sendFeedback(rating === "up")
    } catch {
      // ignore
    }
  }

  const isConnected = status === "connected"
  const isConnecting = status === "connecting"

  return (
    <div className={`flex flex-col bg-card rounded-2xl border border-border shadow-xl overflow-hidden ${compact ? "max-w-md" : "max-w-2xl w-full"}`}>
      {/* ── Header ── */}
      <div className="border-b border-border bg-secondary/40 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <Sparkles size={18} />
            {isConnected && (
              <span className="absolute -top-1 -right-1 flex size-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex size-3 rounded-full bg-green-500"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground tracking-tight" style={{ fontFamily: DISPLAY }}>
                {RENTRE_AGENT_NAME}
              </h3>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-primary uppercase">
                Conversational AI
              </span>
            </div>
            <p className="font-mono text-[10px] text-muted-foreground flex items-center gap-1.5">
              <span>Agent ID: {RENTRE_AGENT_ID}</span>
              <span className="inline-block size-1 rounded-full bg-border"></span>
              <span className="text-primary font-medium">{connectionType.toUpperCase()}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isConnected && (
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 font-mono text-xs font-semibold text-foreground">
              <Radio size={12} className="text-red-500 animate-pulse" />
              <span>{formatTime(duration)}</span>
            </div>
          )}

          <button
            onClick={() => setShowSettings(!showSettings)}
            title="Connection Settings"
            className={`p-2 rounded-lg border text-muted-foreground transition hover:text-foreground hover:bg-secondary ${
              showSettings ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card"
            }`}
          >
            <Sliders size={15} />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Settings Drawer (Collapsible) ── */}
      {showSettings && (
        <div className="border-b border-border bg-secondary/30 px-5 py-3 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-muted-foreground">Connection Protocol:</span>
            <div className="flex rounded-md border border-border bg-card p-0.5">
              <button
                disabled={isConnected}
                onClick={() => setConnectionType("webrtc")}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                  connectionType === "webrtc"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                WebRTC (Low Latency)
              </button>
              <button
                disabled={isConnected}
                onClick={() => setConnectionType("websocket")}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                  connectionType === "websocket"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                WebSocket
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground">Provider: ElevenLabs ConvAI</span>
          </div>
        </div>
      )}

      {/* ── Error Banner ── */}
      {errorMessage && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{errorMessage}</p>
            <p className="text-[11px] text-red-500/80 mt-0.5">Ensure microphone access is allowed in your browser settings.</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Visualizer & Active Call State ── */}
      <div className="px-5 pt-4 pb-2 bg-gradient-to-b from-card to-secondary/20">
        <VoiceVerificationVisualizer
          isSpeaking={isSpeaking}
          isListening={isListening}
          status={status}
          getInputData={conversation.getInputByteFrequencyData}
          getOutputData={conversation.getOutputByteFrequencyData}
        />

        {/* ── Primary Call Controls ── */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {!isConnected ? (
            <button
              onClick={startConversation}
              disabled={isConnecting}
              className={`flex items-center gap-2.5 rounded-xl px-6 py-3.5 text-sm font-semibold shadow-lg transition-all ${
                isConnecting
                  ? "bg-amber-600 text-white cursor-wait opacity-90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] shadow-primary/25"
              }`}
            >
              {isConnecting ? (
                <>
                  <RefreshCw size={17} className="animate-spin" />
                  Connecting to Agent...
                </>
              ) : (
                <>
                  <PhoneCall size={17} />
                  Start Voice Verification
                </>
              )}
            </button>
          ) : (
            <>
              {/* Mic Mute / Unmute */}
              <button
                onClick={() => setMuted(!isMuted)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold transition ${
                  isMuted
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "border-border bg-card text-foreground hover:bg-secondary"
                }`}
                title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {isMuted ? <MicOff size={16} className="text-amber-600" /> : <Mic size={16} className="text-primary" />}
                <span>{isMuted ? "Mic Muted" : "Mute Mic"}</span>
              </button>

              {/* End Conversation */}
              <button
                onClick={stopConversation}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-xs font-semibold text-white shadow-md shadow-red-600/20 transition hover:bg-red-700"
              >
                <PhoneOff size={16} />
                End Conversation
              </button>

              {/* Speaker Volume Toggle */}
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs">
                <button
                  onClick={toggleSpeakerMute}
                  className="text-muted-foreground hover:text-foreground"
                  title={isSpeakerMuted ? "Unmute Audio" : "Mute Audio"}
                >
                  {isSpeakerMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isSpeakerMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-16 accent-primary h-1.5 rounded-lg cursor-pointer bg-secondary"
                  title={`Volume: ${Math.round((isSpeakerMuted ? 0 : volume) * 100)}%`}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Live Transcript Feed ── */}
      <div className="border-t border-border px-5 py-3 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <p className="font-mono text-[10px] font-semibold tracking-wider uppercase text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-primary" />
            Live Verification Transcript ({messages.length})
          </p>
          {messages.length > 0 && (
            <button
              onClick={copyTranscript}
              className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground transition"
            >
              {copiedTranscript ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
              <span>{copiedTranscript ? "Copied" : "Copy"}</span>
            </button>
          )}
        </div>

        <div className="h-48 overflow-y-auto pr-1 space-y-2.5 rounded-xl border border-border bg-secondary/20 p-3 text-xs">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
              <Sparkles size={20} className="text-primary/60 mb-2" />
              <p className="font-medium text-foreground">Ready for Real-Time Verification</p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                Click "Start Voice Verification" to speak with the Rentre AI Agent, or select one of the prompts below.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="font-mono text-[9px] text-muted-foreground uppercase font-semibold">
                    {m.role === "agent" ? RENTRE_AGENT_NAME : "You"}
                  </span>
                  <span className="text-[9px] text-muted-foreground/60">{m.timestamp}</span>
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed text-xs ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-card border border-border text-foreground shadow-sm rounded-tl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Quick Prompts ── */}
        <div className="mt-3">
          <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5">
            Suggested Verification Questions:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((p) => (
              <button
                key={p}
                onClick={() => handlePromptClick(p)}
                className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-foreground text-left"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* ── Text Fallback Input Bar ── */}
        <form onSubmit={handleSendTextMessage} className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isConnected ? "Send a message or response to the agent..." : "Type here or click Start to speak..."}
            className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition disabled:opacity-40 hover:bg-primary/90"
            title="Send Message"
          >
            <Send size={14} />
          </button>
        </form>

        {/* ── Feedback Bar ── */}
        {isConnected && (
          <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
            <span>How is this conversation?</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleFeedback("up")}
                className={`p-1 rounded hover:bg-secondary ${userRating === "up" ? "text-green-600" : ""}`}
                title="Good response"
              >
                <ThumbsUp size={13} />
              </button>
              <button
                onClick={() => handleFeedback("down")}
                className={`p-1 rounded hover:bg-secondary ${userRating === "down" ? "text-red-500" : ""}`}
                title="Poor response"
              >
                <ThumbsDown size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-border bg-secondary/30 px-5 py-2.5 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={12} className="text-primary" />
          <span>Encrypted WebRTC Audio Session</span>
        </div>
        <span>ElevenLabs v1.x ConvAI</span>
      </div>
    </div>
  )
}
