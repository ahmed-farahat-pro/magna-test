import disposableDomains from "disposable-email-domains";

// Server-only: a large list, never import this from a client component.
const base = new Set(disposableDomains.map((d) => d.toLowerCase()));

// ── Curated supplement ───────────────────────────────────────────────────────
// The packaged list is broad but lags behind the temp-mail services people use
// *today*. These are current, popular providers (and their many rotating alias /
// receiving domains) that the base list misses. Kept explicit so it stays
// auditable and easy to extend.
const EXTRA: string[] = [
  // temp-mail.org / temp-mail.io family
  "temp-mail.io", "tempmail.com", "tempmail.dev", "tempmailo.com", "temp-mail.us",
  // tempmail.plus + its alias/receiving domains
  "tempmail.plus", "mailto.plus", "fexpost.com", "fexbox.org", "fextemp.com",
  "rover.info", "chitthi.in", "any.pink", "merepost.com", "mailbox.in.ua",
  "tafmail.com", "vwhins.com", "dpptd.com", "mailpwr.com", "givmail.com",
  // 1secmail + its rotating random domains
  "1secmail.com", "1secmail.org", "1secmail.net", "esiix.com", "wwjmp.com",
  "xojxe.com", "yoggm.com", "kzccv.com", "qiott.com", "vjuum.com", "laafd.com",
  "txcct.com", "1secmail.xyz", "dpptd.org", "ezztt.com",
  // mail.tm / mail.gw family
  "mail.tm", "mail.gw", "dcctb.com", "punkass.com", "internetkeno.com",
  "otmove.com", "indigobird.info", "ballsofsteel.net",
  // other big current ones
  "emailondeck.com", "minuteinbox.com", "disposablemail.com", "etempmail.net",
  "etempmail.com", "mailtemp.net", "mailtemp.info", "luxusmail.org", "luxusmail.com",
  "tmpmail.org", "tmpmail.net", "smailpro.com", "cs.email", "mytemp.email",
  "tempinbox.com", "tempr.email", "harakirimail.com", "tmail.ws", "tmails.net",
  "zetmail.com", "generator.email", "edu.auction", "moakt.cc", "moakt.ws",
  "mailnesia.net", "inboxkitten.com", "emlpro.com", "emltmp.com", "linshiyouxiang.net",
  "tempemail.co", "tempemails.net", "throwawaymail.com", "getairmail.com",
  "mailcatch.com", "spamgourmet.com", "10minutemail.net", "10minutemail.org",
  "20minutemail.com", "30minutemail.com", "yopmail.fr", "yopmail.net",
  "burnermail.io", "guerrillamailblock.com", "pokemail.net", "grr.la",
];
const extra = new Set(EXTRA);

// ── Signal-token heuristic ───────────────────────────────────────────────────
// A last net for the endless rotating alias domains these services spin up. Each
// token is unmistakably a throwaway-mail brand — no legitimate business email
// domain contains them — so the false-positive risk is effectively nil.
const SIGNAL_TOKENS: string[] = [
  "tempmail", "temp-mail", "10minutemail", "throwawaymail", "guerrillamail",
  "mailinator", "yopmail", "sharklasers", "dispostable", "disposablemail",
  "minuteinbox", "emailondeck", "fakemail", "trashmail", "getairmail",
  "getnada", "mohmal", "burnermail",
];

/**
 * True if the email's domain is a known — or unmistakably disposable — temporary
 * mail provider. Checks, in order: the exact domain against the base list + the
 * curated supplement, then every parent domain (so `inbox.tempmail.plus` is
 * caught), then a conservative brand-token heuristic for rotating alias domains.
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return false;

  if (base.has(domain) || extra.has(domain)) return true;

  // Parent-domain match: block subdomains of any known provider.
  const parts = domain.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    const parent = parts.slice(i).join(".");
    if (base.has(parent) || extra.has(parent)) return true;
  }

  // Brand-token fallback for the never-ending supply of new alias domains.
  return SIGNAL_TOKENS.some((token) => domain.includes(token));
}
