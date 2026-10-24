/**
 * The NavBar's back arrow used to read AppShell's `backMap`, which named a parent screen for each
 * screen. These are the same parent relationships expressed as paths — a back arrow that steps up
 * the hierarchy, which is not always the same as the previous history entry.
 *
 * First match wins, so more specific patterns come first.
 */
const PARENTS: Array<[RegExp, string | ((m: RegExpMatchArray) => string)]> = [
  [/^\/listings\/[^/]+\/request-viewing$/, m => m[0].replace(/\/request-viewing$/, "")],
  [/^\/applications\/[^/]+\/payment$/, m => m[0].replace(/\/payment$/, "/offer")],
  [/^\/applications\/[^/]+\/offer$/, "/applications"],
  [/^\/applications\/[^/]+\/confirmed$/, "/"],
  [/^\/applications$/, "/search"],
  [/^\/listings\/[^/]+$/, "/search"],
  [/^\/listings$/, "/search"],
  [/^\/buildings\/[^/]+$/, "/buildings"],
  [/^\/buildings$/, "/search"],
  [/^\/passport\/share$/, "/passport"],
  [/^\/passport$/, "/search"],
  [/^\/landlord\/(listings\/new|applications|crm)$/, "/landlord"],
  [/^\/landlord$/, "/for-landlords"],
  [/^\/mortgage\/results$/, "/mortgage"],
  [/^\/mortgage$/, "/"],
  [/^\/for-landlords$/, "/"],
  [/^\/search$/, "/"],
  [/^\/onboarding$/, "/"],
  [/^\/signin$/, "/"],
]

export function parentPath(pathname: string): string | undefined {
  // Trailing slashes would otherwise defeat the exact-match patterns above.
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname
  for (const [pattern, parent] of PARENTS) {
    const m = path.match(pattern)
    if (m) return typeof parent === "function" ? parent(m) : parent
  }
  return undefined
}
