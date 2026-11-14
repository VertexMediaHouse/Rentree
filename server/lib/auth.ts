import crypto from "node:crypto";

const isProd = process.env.NODE_ENV === "production";
if (isProd && !process.env.AUTH_SECRET) throw new Error("AUTH_SECRET must be set in production");
// Dev fallback is random per-process, so tokens die on restart rather than being guessable.
const SECRET = process.env.AUTH_SECRET || crypto.randomBytes(32).toString("hex");
const TOKEN_TTL_SEC = 60 * 60 * 24 * 7;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64url");
const sign = (data: string) => crypto.createHmac("sha256", SECRET).update(data).digest("base64url");

export interface TokenPayload {
  sub: string;
  role: "tenant" | "landlord";
  exp: number;
}

export function issueToken(sub: string, role: TokenPayload["role"]): string {
  const body = b64(JSON.stringify({ sub, role, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC }));
  return `${body}.${sign(body)}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as TokenPayload;
    return payload.exp > Date.now() / 1000 ? payload : null;
  } catch {
    return null;
  }
}
