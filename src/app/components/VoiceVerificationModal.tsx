import { ModalKeys } from "./ModalKeys"
import { VoiceVerificationAssistant } from "./VoiceVerificationAssistant"
import { useVoiceVerification } from "../context/VoiceVerificationContext"

export function VoiceVerificationModal() {
  const { isOpen, options, closeVerification } = useVoiceVerification()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <ModalKeys onClose={closeVerification} />
      <div
        className="w-full max-w-2xl transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <VoiceVerificationAssistant
          applicationId={options.applicationId}
          tenantName={options.tenantName}
          listingAddress={options.listingAddress}
          onClose={closeVerification}
        />
      </div>
    </div>
  )
}
