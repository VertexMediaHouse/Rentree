import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import authRouter from "./routes/auth";
import calculateRouter from "./routes/calculate";
import listingsRouter from "./routes/listings";
import applicationsRouter from "./routes/applications";
import leadsRouter from "./routes/leads";
import profileRouter from "./routes/profile";
import leaseRouter from "./routes/lease";
import passportRouter from "./routes/passport";
import leaseSigningRouter from "./routes/leases";
import { errorHandler, notFound } from "./middleware/http";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());

  const origins = (process.env.CORS_ORIGINS || "http://localhost:5173").split(",").map((s) => s.trim());
  app.use(cors({ origin: origins }));
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

  app.use("/api/leads", leadsRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/lease", leaseRouter);
  app.use("/api/passport", passportRouter);
  app.use("/api/leases", leaseSigningRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
