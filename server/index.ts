import dotenv from "dotenv";
dotenv.config();

// The API runs without a database on purpose: sign-in is self-contained, so the OTP flow can be
// exercised before Postgres exists. Anything that reads or writes stored data answers 503 until
// DATABASE_URL is real — see the P1001 branch in middleware/http.ts.
const url = process.env.DATABASE_URL;
export const DB_CONFIGURED = !!url && !url.includes("PASTE_DB_PASSWORD") && !url.includes("<PASSWORD>");

if (!DB_CONFIGURED) {
  console.warn(
    [
      "",
      "  No database configured — the renter flow runs from memory.",
      "",
      "  Works now:    sign-in codes (Resend), verification, sessions, renter profile,",
      "                passport share + landlord gate + add-on requests",
      "  Returns 503:  listings, applications, leases",
      "  Not kept:     everything above is lost on restart",
      "",
      "  To enable the rest, set DATABASE_URL + DIRECT_URL in .env and run:",
      "    npm run db:migrate && npm run db:seed",
      "",
    ].join("\n")
  );
}

const { createApp } = await import("./app");

const PORT = Number(process.env.PORT) || 5000;
const server = createApp().listen(PORT, async () => {
  console.log(`Rentre backend running on http://localhost:${PORT}`);
  // Reference-call retries and the 48h purge run on a timer; both need the database.
  if (DB_CONFIGURED) {
    const { startSweeper } = await import("./lib/sweeper");
    startSweeper();
  }
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
