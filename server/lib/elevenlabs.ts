import crypto from "node:crypto";
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

/**
 * Delete the stored conversation (audio + transcript) at ElevenLabs. Called by the purge sweeper
 * 48h after the landlord first views results, so our copy and the vendor's are removed together.
 * Best-effort: a 404 means it is already gone, which is success for our purposes.
 */
export async function deleteConversation(id: string): Promise<void> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new HttpError(503, "AI calls are not configured (ELEVENLABS_API_KEY missing)");
  const res = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "xi-api-key": key },
  }).catch((err) => {
    console.error("ElevenLabs unreachable (delete):", err.cause?.code ?? err.message);
    throw new HttpError(502, "AI call provider could not be reached. Try again.");
  });
  if (!res.ok && res.status !== 404) {
    console.error("ElevenLabs delete error", res.status, await res.text());
    throw new HttpError(502, "AI call provider delete failed");
  }
}

/** Verify an ElevenLabs post-call webhook HMAC. Header format: "t=<ts>,v0=<hex>". */
export function verifyWebhookSignature(rawBody: Buffer, header: string | undefined, secret: string): boolean {
  if (!header) return false;
  // Split on the FIRST "=" only, so a padded base64 signature survives intact.
  const parts = Object.fromEntries(header.split(",").map((p) => [p.slice(0, p.indexOf("=")).trim(), p.slice(p.indexOf("=") + 1)] as [string, string]));
  const ts = parts.t;
  const sig = parts.v0;
  if (!ts || !sig) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${ts}.${rawBody.toString("utf8")}`).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Obtain a WebRTC conversation token for an agent.
 * Enables low-latency authenticated WebRTC voice sessions from the browser.
 */
export async function getConversationToken(agentId?: string): Promise<{ token: string; conversation_id?: string }> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new HttpError(503, "AI calls are not configured (ELEVENLABS_API_KEY missing)");

  // This endpoint is public (the voice launcher renders for signed-out visitors), so a
  // caller-supplied agent id must never reach ElevenLabs on our API key — otherwise anyone can mint
  // tokens against any agent and bill it to us. Only ids we configured are allowed through.
  const allowed = [process.env.ELEVENLABS_VOICE_AGENT_ID, process.env.ELEVENLABS_REFERENCE_AGENT_ID, process.env.ELEVENLABS_INTERVIEW_AGENT_ID].filter(Boolean) as string[];
  const fallback = allowed[0];
  if (!fallback) throw new HttpError(503, "AI voice is not configured (no agent id set)");
  if (agentId && !allowed.includes(agentId)) throw new HttpError(403, "Unknown agent");
  const targetAgentId = agentId || fallback;

  const res = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(targetAgentId)}`, {
    headers: { "xi-api-key": key },
  }).catch((err) => {
    console.error("ElevenLabs unreachable (token):", err.cause?.code ?? err.message);
    throw new HttpError(502, "AI call provider could not be reached. Try again.");
  });

  if (!res.ok) {
    // Log the provider's body, don't return it: it can echo account/agent details to the client.
    console.error("ElevenLabs token error", res.status, await res.text());
    throw new HttpError(502, "Failed to obtain conversation token");
  }

  return res.json() as Promise<{ token: string; conversation_id?: string }>;
}

