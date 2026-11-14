import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db";
import { escapeHtml, sendEmail } from "../lib/email";
import { HttpError } from "../lib/errors";
import { requireAuth, validate } from "../middleware/http";
import {
  memCreateCustomQuestion,
  memCustomQuestionByToken,
  memCustomQuestions,
  memDecideCustomQuestion,
  orMemory,
} from "../lib/memoryStore";

// Landlord-written reference questions. A custom question is unusable until a human reviewer
// approves it from an emailed link: free text reaching a reference is a legal exposure, so the
// fixed bank's safety rules are enforced by a person, not by a regex.
const router = Router();

const appUrl = () => (process.env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/$/, "");
const apiUrl = () => (process.env.PUBLIC_API_URL || process.env.PUBLIC_APP_URL || "http://localhost:5000").replace(/\/$/, "");
const reviewer = () => process.env.QUESTION_REVIEW_EMAIL || "h.kansara106@gmail.com";

const createSchema = z.object({ text: z.string().trim().min(10).max(300) });

const present = (q: { id: string; text: string; approved: boolean; decidedAt: Date | null }) => ({
  id: q.id,
  text: q.text,
  // pending until a reviewer decides; rejected questions stay visible so the landlord knows why one vanished
  status: q.decidedAt === null ? ("pending" as const) : q.approved ? ("approved" as const) : ("rejected" as const),
  custom: true as const,
});

// The landlord's own custom questions, any status.
router.get("/", requireAuth("landlord"), async (req, res) => {
  const rows = await orMemory(
    () => db.customQuestion.findMany({ where: { ownerId: req.auth!.sub }, orderBy: { createdAt: "asc" } }),
    () => memCustomQuestions(req.auth!.sub),
  );
  res.json({ success: true, data: rows.map(present) });
});

router.post("/", requireAuth("landlord"), validate(createSchema), async (req, res) => {
  const text: string = req.body.text;
  const token = crypto.randomUUID();
  const q = await orMemory(
    () => db.customQuestion.create({ data: { ownerId: req.auth!.sub, text, token } }),
    () => memCreateCustomQuestion(req.auth!.sub, text, token),
  );

  const landlord = await orMemory(
    () => db.user.findUnique({ where: { id: req.auth!.sub }, select: { email: true, name: true } }),
    () => null,
  );
  const link = (verdict: "approve" | "reject") => `${apiUrl()}/api/custom-questions/review/${token}/${verdict}`;
  await sendEmail({
    to: reviewer(),
    subject: "Rentre: reference question awaiting approval",
    html: `<p><strong>${escapeHtml(landlord?.name ?? "A landlord")}</strong> (${escapeHtml(landlord?.email ?? "unknown")}) wants to ask a reference:</p>
      <blockquote style="border-left:3px solid #ccc;margin:16px 0;padding:8px 16px;font-size:16px">${escapeHtml(text)}</blockquote>
      <p>Approve only if it asks for a fact the reference witnessed, and does not touch children or household size, age, source of income or public assistance, health or disability, pets, relationship status, religion or origin.</p>
      <p><a href="${link("approve")}" style="background:#2f6f4e;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Approve</a>
         &nbsp;&nbsp;<a href="${link("reject")}">Reject</a></p>`,
  }).catch((err) => {
    // The question is stored but nobody was asked to review it: surface that rather than imply it is queued.
    // The link is logged so the question can still be reviewed while email is unconfigured.
    console.error("Review email failed for custom question", q.id, (err as Error).message);
    console.warn("[review] approve:", link("approve"));
    console.warn("[review] reject: ", link("reject"));
  });

  res.status(201).json({ success: true, data: present(q) });
});

// Clicked from the review email. The token is the capability — it only ever went to the reviewer.
// GET because mail clients only follow links; first decision wins, repeat clicks just show it.
router.get("/review/:token/:verdict", async (req, res) => {
  const verdict = req.params.verdict;
  if (verdict !== "approve" && verdict !== "reject") throw new HttpError(404, "Not found");
  const token = req.params.token as string;
  const q = await orMemory(
    () => db.customQuestion.findUnique({ where: { token } }),
    () => memCustomQuestionByToken(token),
  );
  if (!q) throw new HttpError(404, "This review link is not valid");

  const final = q.decidedAt
    ? q
    : await orMemory(
        () =>
          db.customQuestion.update({
            where: { id: q.id },
            data: { decidedAt: new Date(), approved: verdict === "approve" },
          }),
        () => memDecideCustomQuestion(q.id, verdict === "approve"),
      );

  res
    .status(200)
    .type("html")
    .send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
      <div style="font:16px/1.5 system-ui;max-width:34rem;margin:15vh auto;padding:0 1rem">
        <h1 style="font-size:1.25rem">${final.approved ? "Approved" : "Rejected"}${q.decidedAt ? " already" : ""}</h1>
        <blockquote style="border-left:3px solid #ccc;padding:8px 16px;color:#444">${escapeHtml(final.text)}</blockquote>
        <p style="color:#666">${final.approved ? "The landlord can now include this question in a reference call." : "This question cannot be used in a reference call."}</p>
        <p><a href="${appUrl()}">Back to Rentre</a></p>
      </div>`);
});

export default router;
