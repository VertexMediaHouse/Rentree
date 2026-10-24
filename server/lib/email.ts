import { HttpError } from "./errors";

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendEmail(msg: { to: string; subject: string; html: string; replyTo?: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new HttpError(503, "Email is not configured (RESEND_API_KEY missing)");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Rentre <onboarding@resend.dev>",
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
    }),
  }).catch((err) => {
    // Network/DNS failure: report it as a provider problem, not a crash
    console.error("Resend unreachable:", err.cause?.code ?? err.message);
    throw new HttpError(502, "Email provider could not be reached. Try again.");
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("Resend error", res.status, body);
    // Resend's sandbox sender rejects any recipient other than the account owner with a 403
    throw new HttpError(502, res.status === 403 ? "Email provider refused this recipient (sandbox sender only delivers to your Resend account email)" : "Failed to send email");
  }
  return (await res.json()) as { id: string };
}
