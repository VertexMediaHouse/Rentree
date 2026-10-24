import { HttpError } from "./errors";

// ElevenLabs Conversational AI: outbound phone calls through a Twilio number imported into ElevenLabs.
async function el<T>(path: string, body?: unknown): Promise<T> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new HttpError(503, "AI calls are not configured (ELEVENLABS_API_KEY missing)");
  const res = await fetch(`https://api.elevenlabs.io/v1/convai${path}`, {
    method: body ? "POST" : "GET",
    headers: { "xi-api-key": key, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).catch((err) => {
    console.error("ElevenLabs unreachable:", err.cause?.code ?? err.message);
    throw new HttpError(502, "AI call provider could not be reached. Try again.");
  });
  if (!res.ok) {
    console.error("ElevenLabs error", res.status, await res.text());
    throw new HttpError(502, "AI call provider request failed");
  }
  return res.json() as Promise<T>;
}

export async function startCall(kind: "reference" | "interview", to: string, vars: Record<string, string>) {
  const agentId = kind === "reference" ? process.env.ELEVENLABS_REFERENCE_AGENT_ID : process.env.ELEVENLABS_INTERVIEW_AGENT_ID;
  const phoneId = process.env.ELEVENLABS_PHONE_NUMBER_ID;
  if (!agentId || !phoneId) throw new HttpError(503, `AI ${kind} calls are not configured (agent or phone number id missing)`);
  const r = await el<{ success: boolean; message?: string; conversation_id?: string }>("/twilio/outbound-call", {
    agent_id: agentId,
    agent_phone_number_id: phoneId,
    to_number: to,
    conversation_initiation_client_data: { dynamic_variables: vars },
  });
  if (!r.success || !r.conversation_id) throw new HttpError(502, r.message || "Call could not be placed");
  return r.conversation_id;
}

export const getConversation = (id: string) =>
  el<{
    status: "initiated" | "in-progress" | "processing" | "done" | "failed";
    transcript?: { role: string; message: string | null }[];
    analysis?: { transcript_summary?: string; call_successful?: string };
  }>(`/conversations/${encodeURIComponent(id)}`);
