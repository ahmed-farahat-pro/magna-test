# Auth & sessions — the full flow

The app has **two layers of identity**, and one always-on rule: **every database
read/write is scoped to an owner id** (`where { id, sessionId }`). What changes is
*who that owner is*.

| Layer | Cookie | Who | Lifetime | Purpose |
|-------|--------|-----|----------|---------|
| **Anonymous session** | `acms_sid` | every visitor | **90 days** | zero-friction identity — use the app with no signup |
| **Authenticated account** | `acms_auth` | signed-in users | **7 days** | durable identity that follows the user across devices |

Both cookies are **`httpOnly`** (JavaScript can't read them), **`Secure`** in
production (HTTPS only), **`SameSite=Lax`**, and **HMAC-signed** with
`SESSION_SECRET` (a forged or tampered cookie fails verification and is ignored).

---

## How the owner id is resolved (every request)

```
request
   │
   ▼
getSessionId()
   │
   ├─ acms_auth present & valid?  ──yes──▶  owner = userId  (account data)
   │                                        └ follows the user across devices
   └─ no ──▶  acms_sid (mint if absent) ──▶ owner = anonymous sessionId
                                            └ device-local
```

`getSessionId()` returns the **userId** when a valid `acms_auth` token exists,
otherwise the **anonymous session id**. Because every query already scopes on this
one value, the whole app "just works" for both anonymous and logged-in users with
no other changes.

---

## The flows

### 1 · Anonymous (default)
Edge middleware mints a signed `acms_sid` on the first page load. Generations,
images and brand voices are saved under that id. No account needed.

### 2 · Sign up  (`POST /api/auth/signup`)
```
email + password
   │
   ▼
validate (zod)  ─ email unique?  ─ hash password (scrypt + random salt)
   │
   ▼
create User (id, email, passwordHash)
   │
   ▼
MIGRATE anonymous data:  UPDATE generations / brand_voices
        SET sessionId = userId  WHERE sessionId = <anon id>
   │
   ▼
set acms_auth cookie (7-day signed token)  ──▶  now scoped to the account
```
Everything the visitor made anonymously **moves to the new account** — nothing is
lost, and it's now reachable from any device after signing in.

### 3 · Log in  (`POST /api/auth/login`)
Find the user by email, verify the password (constant-time compare; a dummy hash
runs even for unknown emails so timing can't reveal whether an account exists),
then set the `acms_auth` cookie. Same generic *"Invalid email or password"* for
both wrong-password and unknown-email (no account enumeration).

### 4 · Log out  (`POST /api/auth/logout`)
Clears `acms_auth`. The request falls back to the device's anonymous session.

---

## Lifetimes & expiry

### Anonymous session — ~90 days
`acms_sid` has a 90-day `maxAge`. It persists across visits on the **same browser
on the same device** until it expires or is cleared.

### Authenticated session — 7 days
`acms_auth` is a signed token carrying `{ uid, exp }` with a **7-day** expiry, and
the cookie's `maxAge` matches. After 7 days the token is expired → the request
silently falls back to anonymous, and the user signs in again. (There is no
sliding refresh yet — a natural next step is to re-issue the token on activity.)

---

## What can "corrupt" or lose an anonymous session on the same device

An anonymous session is **only as durable as one browser's cookie**. It is
effectively lost (a *new* session is minted, and the old rows become **orphaned in
the database — not deleted, just unreachable**) when:

- **Cookies / site data are cleared** (manually, or by a "clear on exit" setting).
- **Incognito / private window** — a separate cookie jar; it also evaporates when
  the window closes.
- **A different browser or profile** is used — different cookie store, different id.
- **The 90-day cookie expires.**
- **`SESSION_SECRET` is rotated** — every existing signed cookie fails the HMAC
  check, so all anonymous (and auth) sessions are invalidated at once and re-minted.
- **The cookie is tampered with** — the signature no longer matches, so it's
  rejected and a fresh session is minted.
- **Browser cookie eviction** under storage pressure (rare).

In every case the data still exists in Neon; it's just no longer tied to a
reachable id. **This is exactly the problem accounts solve.**

---

## Why accounts (the benefit)

- **Cross-device.** Sign in anywhere and your content is there — it's tied to your
  account id, not a device cookie.
- **Survives cookie clears / new browsers / incognito.** None of the anonymous
  failure modes above lose your data once it's on an account.
- **Nothing is lost switching over.** Signing up migrates your anonymous work to
  the account automatically.
- **Password-protected & private.** Passwords are hashed with scrypt (random
  per-user salt, constant-time verification); the token is HMAC-signed and
  `httpOnly`; ownership scoping means you only ever see your own data; the app
  **fails closed** if `SESSION_SECRET` is missing in production.

Anonymous mode stays fully supported — accounts are an **additive** layer for
people who want their work to persist beyond one browser.

---

## Security notes & accepted trade-offs

Hardening applied after an adversarial review:

- **Password verify is fixed-length.** `verifyPassword` requires an exact 16-byte
  salt + 32-byte key and compares at a pinned length, so a malformed stored hash
  can never authenticate an empty-vs-empty comparison.
- **Login & signup are rate-limited by client IP** (10 / minute, the `auth`
  bucket), *before* the scrypt work — blunting password brute-force /
  credential-stuffing and the CPU cost of unauthenticated floods. IP-keyed (not
  session) so dropping the cookie doesn't bypass it.
- **No login enumeration.** One generic *"Invalid email or password"* and a dummy
  hash that runs even for unknown emails (equal timing).
- **Concurrent duplicate signup** is caught by the unique index (P2002) and
  returns the normal "email already exists," not a 500.
- **Logout clears both cookies** (`acms_auth` *and* `acms_sid`) so a shared
  browser doesn't hand the next person the previous session.

Two conscious trade-offs:

1. **Signup reveals whether an email is registered** ("email already exists").
   This is inherent to signup UX (you must tell a user their email is taken); it's
   mitigated by the IP rate limit. A fully oracle-free flow would need deferred
   email verification, which we opted not to build here.
2. **Login also claims the current device's anonymous work** (for continuity /
   the cross-device promise). On a *shared* browser this means a logging-in user
   could claim anonymous content a previous visitor left behind. The logout
   clearing the anonymous cookie shrinks this window; a stricter product could
   prompt-to-merge instead of auto-claiming.
