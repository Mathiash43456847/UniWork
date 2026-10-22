# Fix Production Authentication on myuniwork.app (Render.com)

Root-cause analysis and implementation plan to resolve the sign-up and sign-in failure on `myuniwork.app` while preserving exact origin validation, preventing popup blocking, and guaranteeing reliable message delivery.

## User Review & Critical Decisions

> [!IMPORTANT]
> Live testing on `myuniwork.app` confirmed:
> 1. The PostgreSQL database connection is operational (HTTP 200 on `/api/db-status`, 7 registered users).
> 2. Direct auth (`/api/auth/direct`) and account operations are fully functional.
> 3. Google OAuth Redirect URI `https://myuniwork.app/api/auth/google/callback` is authorized and returns HTTP 200/302 from Google.
>
> The failure is caused by three client/server interaction issues during the popup lifecycle that trigger specifically in production mode on `myuniwork.app`.

- **Confirmed Decision 1**: Synchronous Popup Opening (`window.open`). We will eliminate the artificial `setTimeout(..., 300)` delay and pre-fetch the auth URL or open a temporary blank popup synchronously on user click so mobile and desktop browser popup blockers never intercept it.
- **Confirmed Decision 2**: Robust Popup Handshake & Delayed Close. In `server.ts`, we will post the message and allow a small grace period (or handshake acknowledgement) before closing the popup window, ensuring `event.source` and the postMessage payload are not destroyed in-flight.
- **Confirmed Decision 3**: Reliable Source & Origin Validation. We will retain exact origin validation (`event.origin === window.location.origin`) and allow `event.source` verification that tolerates closed/detached window proxy states post-navigation.
- **Confirmed Decision 4**: Optional Fallback Authorization Token / Session Support. Provide a backup query parameter or local storage handoff so if browser Site Isolation cuts `window.opener`, the user is still signed in smoothly.

---

## 1. Investigation Findings: Why it Worked on `run.app` but Fails on `myuniwork.app`

### Finding 1: The `isProduction` Flag Suppresses the Fallback Chooser Only on `myuniwork.app`
In `src/components/SignInView.tsx`:
```tsx
const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('run.app') && !window.location.hostname.includes('127.0.0.1');
```
- On `ais-pre-...run.app`: `isProduction` evaluates to `false`. When popup blockers or auth errors occur, the code triggers `setShowGoogleChooser(true)`. The user can pick a workspace profile and authenticate immediately via `/api/auth/direct`.
- On `myuniwork.app`: `isProduction` evaluates to `true`. Every fallback path explicitly executes `setShowGoogleChooser(false)`. If anything interrupts the popup, the user is hard-blocked with an error banner and has no fallback.

### Finding 2: Transient User Activation Lost Before `window.open`
In `handleStartRealGoogleOAuth`:
```tsx
await new Promise(resolve => setTimeout(resolve, 300));
const res = await fetch(`/api/auth/google/url?intent=${intent}&tz=${encodeURIComponent(userTz)}`);
const data = await res.json();
const authWindow = window.open(data.url, 'google_oauth_popup', ...);
```
Modern browser popup blockers (Safari macOS/iOS, Chrome, Brave, Edge) revoke the "transient user activation" token after an asynchronous delay (`setTimeout` + network `fetch`). Consequently, `window.open` returns `null` (popup blocked). On `myuniwork.app`, this directly causes the failure without presenting any alternative login.

### Finding 3: `event.source !== oauthWindowRef.current` Mismatch & Immediate `window.close()`
In `server.ts` line 1399:
```html
<script>
  if (window.opener) {
    window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: ... }, '${appOrigin}');
    window.close(); // Immediate synchronous close
  }
</script>
```
When `window.close()` runs immediately on the next line after `postMessage`:
1. The browser destroys the popup browsing context before `message` event delivery finishes in the parent window.
2. In Chromium and Safari Site Isolation, `oauthWindowRef.current.closed` becomes `true` and `event.source` becomes `null` or detached.
3. In `SignInView.tsx`:
   ```tsx
   if (!oauthWindowRef.current || event.source !== oauthWindowRef.current) {
     return;
   }
   ```
   Because `event.source` is detached/null or does not strictly match the pre-redirect `WindowProxy`, the message is **silently discarded**, leaving the user permanently on the login screen.

---

## 2. Proposed Technical Changes

```
┌────────────────────────────────────────────────────────┐
│                      Parent Window                     │
│                   (https://myuniwork.app)              │
│                                                        │
│  1. User clicks "Sign up / Log in with Google"         │
│  2. Synchronously open popup window ref                │
│  3. Navigate popup to Google OAuth URL                 │
│  4. Listen for postMessage with exact origin check     │
│  5. Gracefully verify popup window reference / source  │
│  6. Call onSignInSuccess(user)                         │
└───────────────────────────┬────────────────────────────┘
                            │
              window.open   │   postMessage
                            ▼
┌────────────────────────────────────────────────────────┐
│                      OAuth Popup                       │
│  1. Google Consent -> /api/auth/google/callback        │
│  2. Exchanges token & creates/retrieves user in DB     │
│  3. Sends 'OAUTH_AUTH_SUCCESS' to window.opener        │
│  4. Waits 500ms before calling window.close()          │
└────────────────────────────────────────────────────────┘
```

### Proposed Edits:
1. **`src/components/SignInView.tsx`**:
   - Open popup synchronously during the user gesture (`const popup = window.open('about:blank', ...)`) and navigate it once the URL resolves, eliminating popup blocking.
   - Improve `handleOAuthMessage` to validate `event.origin === window.location.origin` strictly, while safely verifying that `oauthWindowRef.current` is either identical to `event.source` or that the event is from our opened window without failing on premature close.
   - Add a fallback mechanism (or allow workspace selection when needed) so users are never locked out.

2. **`server.ts`**:
   - In `/api/auth/google/callback`, add a 500ms delay (`setTimeout(() => window.close(), 500)`) before closing the popup window to guarantee the parent window receives the `postMessage` with an active `event.source`.
   - Ensure `appOrigin` strictly matches the incoming protocol and host header from Render (`https://myuniwork.app`).

---

## 3. Verification Plan

1. **Compilation & Lint**: Run `compile_applet` and `lint_applet` to ensure zero regressions.
2. **Origin & Target Validation**: Verify that `appOrigin` matches `window.location.origin` on both `localhost:3000`, `*.run.app`, and `myuniwork.app`.
3. **Popup Block Resistance**: Test that `window.open` launches without getting blocked across all modern browsers.
4. **End-to-End Simulation**: Simulate the postMessage payload from an exact-origin popup and confirm `onSignInSuccess` is triggered reliably.
