import type { NotificationKind } from "@prisma/client";
import { db } from "../lib/db";
import { escapeHtml, sendEmail } from "../lib/email";

const appUrl = () => (process.env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/$/, "");

const shell = (title: string, body: string) => `<!doctype html><html><body style="margin:0;background:#FAF7F0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#24352B">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
  <p style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#174B3A;font-weight:700;margin:0 0 8px">Rentre</p>
  <h1 style="font-size:22px;margin:0 0 16px">${escapeHtml(title)}</h1>${body}
</div></body></html>`;

export interface NotifyInput {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Path within the app, e.g. "/listings/abc". Becomes the email's button too. */
  href?: string;
}

/**
 * Writes an in-app notification and tries to email it.
 *
 * The row is written first and the email is best-effort: a renter who misses the email still
 * finds the vacancy in the bell, whereas a failed send that rolled back the row would lose it
 * entirely. Email is also optional infrastructure here — RESEND_API_KEY may be unset in dev, and
 * that must not fail the landlord's upload.
 */
export async function notify(input: NotifyInput) {
  const row = await db.notification.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
    },
  });

  const user = await db.user.findUnique({ where: { id: input.userId }, select: { email: true, deletedAt: true } });
  if (!user?.email || user.deletedAt) return row;

  const button = input.href
    ? `<p style="text-align:center;margin:28px 0"><a href="${appUrl()}${input.href}" style="display:inline-block;background:#16261D;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:12px">View in Rentre →</a></p>`
    : "";

  await sendEmail({
    to: user.email,
    subject: input.title,
    html: shell(input.title, `<p style="font-size:14px;line-height:1.6">${escapeHtml(input.body)}</p>${button}`),
  }).catch((err) => console.error("Notification email failed", input.userId, err.message));

  return row;
}

/** Fire several notifications without letting one bad recipient stop the rest. */
export async function notifyAll(inputs: NotifyInput[]) {
  const results = await Promise.allSettled(inputs.map(notify));
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length) console.error(`${failed.length}/${inputs.length} notifications failed to write`);
  return results.filter((r) => r.status === "fulfilled").length;
}
