import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import authRouter from "./routes/auth";
import calculateRouter from "./routes/calculate";
import listingsRouter from "./routes/listings";
import applicationsRouter from "./routes/applications";
import customQuestionsRouter from "./routes/customQuestions";
import leadsRouter from "./routes/leads";
import notificationsRouter from "./routes/notifications";
import profileRouter from "./routes/profile";
import rentRollRouter from "./routes/rentRoll";
import leaseRouter from "./routes/lease";
import passportRouter from "./routes/passport";
import leaseSigningRouter from "./routes/leases";
import elevenlabsWebhookRouter from "./routes/elevenlabsWebhook";
import elevenlabsTokenRouter from "./routes/elevenlabsToken";
import { errorHandler, notFound } from "./middleware/http";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());

  const origins = (process.env.CORS_ORIGINS || "http://localhost:5173").split(",").map((s) => s.trim());
  app.use(cors({ origin: origins }));

  // Mounted BEFORE express.json(): the ElevenLabs webhook verifies an HMAC over the raw bytes, so
  // it parses its own raw body. Everything after this point gets the JSON parser.
  app.use("/api/webhooks/elevenlabs", elevenlabsWebhookRouter);

  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy", service: "Rentre API", timestamp: new Date().toISOString() });
  });

  app.use("/api", rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-7", legacyHeaders: false }));
  // Stricter limit on credential endpoints to slow brute-forcing
  app.use("/api/auth", rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false }));

  app.use("/api/auth", authRouter);
  app.use("/api/calculate", calculateRouter);
  app.use("/api/listings", listingsRouter);
  app.use("/api/applications", applicationsRouter);
  app.use("/api/custom-questions", customQuestionsRouter);

  app.use("/api/leads", leadsRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/rent-roll", rentRollRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/lease", leaseRouter);
  app.use("/api/passport", passportRouter);
  app.use("/api/leases", leaseSigningRouter);
  // Public and mints billable provider tokens, so it gets a far tighter limit than the global one.
  app.use("/api/elevenlabs", rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false }), elevenlabsTokenRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
