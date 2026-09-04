# FE integration guide: notification `ctaRoute` replaced by `ctaTarget`/`ctaParams`

Covers a change shipped 2026-09-04: `NotificationResponseDto.ctaRoute` — a literal, backend-built
path like `"/events/{id}/settings/plan"` — is gone, replaced by `ctaTarget` (a closed key) and
`ctaParams` (its substitution values). See `frontend-api-types.ts` for the updated type and
`billing-fe-guide.md` §10 for the billing-notification-specific note; this doc is the "what changed
and why" record.

## Why

`ctaRoute` was a string the backend built by concatenating literals — `"/events/" + eventId +
"/settings/plan"` — and shipped as-is, assuming it matched this app's router exactly. It didn't stay
in sync: the backend had no way to know when this app's routes changed shape, so the assumption
silently went stale. `ctaTarget` fixes the actual problem instead of patching the symptom: the
backend now sends a screen *identity*, and this app is the one place that knows how its own router
turns that identity into a URL. A backend route rename can no longer break in-app navigation.

## What actually changed (breaking for any code reading `ctaRoute`)

### 1. `ctaRoute: string | null` is gone from `NotificationResponseDto`

Replaced by two fields:

```jsonc
// Before
{ "ctaLabel": "View plans", "ctaRoute": "/events/9f3a1c.../settings/plan", … }

// Now
{ "ctaLabel": "View plans", "ctaTarget": "EVENT_PLAN_SETTINGS", "ctaParams": { "eventId": "9f3a1c..." }, … }
```

`ctaTarget` is null exactly when `ctaLabel` is null — a notification with no action has neither.
`ctaParams` is always an object, empty (`{}`) when `ctaTarget` is null.

### 2. You now own route resolution

There is no wire format for a route any more, only a key. Resolve it yourself, e.g.:

```ts
const CTA_ROUTES: Record<NotificationCtaTarget, (params: Record<string, string>) => string> = {
  EVENT_PLAN_SETTINGS: (p) => `/events/${p.eventId}/settings/plan`,
  EVENT_GALLERY: (p) => `/events/${p.eventId}/gallery`,
  EVENT_GUESTS: (p) => `/events/${p.eventId}/guests`,
};

function resolveCta(n: NotificationResponseDto): string | null {
  if (!n.ctaTarget) return null;
  const build = CTA_ROUTES[n.ctaTarget];
  return build ? build(n.ctaParams) : null; // unrecognized target: hide the CTA, don't crash
}
```

The `else` branch matters as much as the happy path: `ctaTarget` is a closed set today
(`EVENT_PLAN_SETTINGS`, `EVENT_GALLERY`, `EVENT_GUESTS`), but it is expected to grow as new
notification types ship. A target this app doesn't recognize yet should degrade to "no CTA shown",
not a broken link or a thrown error.

### 3. The three current targets, and what each needs in `ctaParams`

| `ctaTarget` | needs | today's suggested route |
|---|---|---|
| `EVENT_PLAN_SETTINGS` | `eventId` | `/events/{eventId}/settings/plan` |
| `EVENT_GALLERY` | `eventId` | `/events/{eventId}/gallery` |
| `EVENT_GUESTS` | `eventId` | `/events/{eventId}/guests` |

These happen to match the old literal `ctaRoute` values exactly, so if your router already has
routes at those paths, wiring `CTA_ROUTES` above to point at them is a drop-in replacement — the
only actual behavior change is that *you* now own that mapping instead of trusting a backend string.

## What did not change

- `ctaLabel` — still a plain string, still null exactly when there's no action.
- Every other `NotificationResponseDto` field, the notification feed endpoints, and email delivery
  are unaffected. Outbound notification emails still link to the same paths as before; the backend
  builds that link itself now from `ctaTarget`, not from a stored route.
- Which notification types carry a CTA, and their `ctaLabel` copy, are unchanged.

## Checklist

- [ ] Remove any type/interface field for `ctaRoute` and replace with `ctaTarget` + `ctaParams`.
- [ ] Add a `ctaTarget` → route-builder map (see §2) instead of using the API value as a route
      directly.
- [ ] Handle an unrecognized `ctaTarget` by hiding the CTA, not by crashing or navigating nowhere.
- [ ] Confirm the three current targets resolve to working routes in your router (see the table in
      §3) — if your existing routes already lived at those paths, this should require no route
      changes, only the resolution logic itself.
