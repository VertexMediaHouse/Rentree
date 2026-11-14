-- Landlord-written reference questions, unusable until a human reviewer approves one by email.
CREATE TABLE "custom_questions" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "decidedAt" TIMESTAMPTZ(6),
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "custom_questions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "custom_questions_token_key" ON "custom_questions"("token");
CREATE INDEX "custom_questions_ownerId_approved_idx" ON "custom_questions"("ownerId", "approved");

ALTER TABLE "custom_questions" ADD CONSTRAINT "custom_questions_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
