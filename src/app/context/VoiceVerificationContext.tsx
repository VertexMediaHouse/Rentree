import { createContext, useContext, useState, type ReactNode } from "react"

export interface VoiceVerificationOptions {
  applicationId?: string
  tenantName?: string
  listingAddress?: string
}

interface VoiceVerificationContextType {
  isOpen: boolean
  options: VoiceVerificationOptions
  openVerification: (opts?: VoiceVerificationOptions) => void
  closeVerification: () => void
}

const VoiceVerificationContext = createContext<VoiceVerificationContextType | null>(null)

export function VoiceVerificationContextProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<VoiceVerificationOptions>({})

  const openVerification = (opts?: VoiceVerificationOptions) => {
    if (opts) setOptions(opts)
    setIsOpen(true)
  }

  const closeVerification = () => {
    setIsOpen(false)
  }

  return (
    <VoiceVerificationContext.Provider
      value={{
        isOpen,
        options,
        openVerification,
        closeVerification,
      }}
    >
      {children}
    </VoiceVerificationContext.Provider>
  )
}

export function useVoiceVerification() {
  const ctx = useContext(VoiceVerificationContext)
  if (!ctx) {
    throw new Error("useVoiceVerification must be used within a VoiceVerificationContextProvider")
  }
  return ctx
}
