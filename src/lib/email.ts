import disposableDomains from "disposable-email-domains";

// Server-only: a large list, never import this from a client component.
const disposable = new Set(disposableDomains.map((d) => d.toLowerCase()));

/** True if the email's domain is a known disposable / temporary-mail provider. */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  return domain ? disposable.has(domain) : false;
}
