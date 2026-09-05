# Countdown Completion Fireworks — Design

## Problem

`Countdown` ([components/feed/Countdown.tsx](../../../components/feed/Countdown.tsx)) ticks down to an event's `startAt` and, once the target time passes, clamps at `0 0 0 0` forever. There is no acknowledgement that the event has started. We want a celebratory animation when the countdown completes, without it becoming a nuisance on repeat visits or firing for guests arriving long after the event started.

## Trigger & Scope

The animation lives entirely inside `Countdown.tsx`, the only place a countdown reaching zero is observable (it is only rendered from [components/feed/Header.tsx](../../../components/feed/Header.tsx) on the event feed).

It fires in exactly two cases:

1. **Live rollover** — the ticking counter reaches `00:00:00:00` while the component is mounted (guest is watching it happen).
2. **Grace-window arrival** — on mount, if `now - startAt` is between `0` and `30 minutes`.

It does **not** fire if the page loads more than 30 minutes after `startAt`. In that case the countdown just renders its post-event end-state (see "End-state copy") with no animation — arriving hours or days late should never trigger fireworks for an event that's clearly already underway.

## Replay Suppression

A `localStorage` flag, `countdown-celebrated:<eventId>`, is set the moment the animation plays. Before triggering (either case above), we check for this flag and skip if present.

This makes it a once-per-device-per-event moment:
- Refreshing the feed, navigating away and back, or reopening the app later never replays it.
- A guest who watches the live rollover has "spent" their one showing at the best possible moment.

If `localStorage` is unavailable (private browsing, quota exceeded, SSR), we fail open — treat it as "not yet celebrated." Worst case is a harmless replay, never a thrown error.

## Visual Treatment

- **New dependency:** `canvas-confetti`.
- A helper (`lib/fireworks.ts`) runs a short interval loop (~3.5s total) firing repeated bursts from randomized horizontal positions near the bottom of the viewport. Each burst uses `startVelocity`, `gravity`, `spread`, and `ticks` tuned to read as a rising-then-exploding firework, not a flat confetti dump.
- **Colors** are pulled from the existing brand palette defined in [app/globals.css](../../../app/globals.css): `--primary` (`#ff7a59`), `--accent-pink` (`#ff6fa0`), `--accent-orange` (`#ffb259`), plus the logo gradient's `#c777b1` and `#fec463`. This keeps the effect feeling designed/on-brand rather than generic rainbow confetti.
- Rendered as a `fixed inset-0 z-50 pointer-events-none` canvas overlay covering the full viewport, above the sticky header, matching the "briefly fill in the page" ask. It unmounts itself when the sequence completes (~3.5–4s).
- No sound.

## Countdown End-State Copy

Once `diff <= 0`, `Countdown` replaces its four number tiles with a single short, localized label (e.g. "It's happening!" — exact wording TBD at copy review, added under the existing `Countdown` namespace in `messages/en.json` / `messages/el.json`). This applies regardless of whether fireworks played, so a guest arriving well after the grace window sees a clean "started" state instead of dead zeros.

## Reduced Motion

If `prefers-reduced-motion: reduce` is set, `canvas-confetti` is skipped entirely — the global CSS rule in `app/globals.css:777` only flattens CSS animations, not a JS/canvas particle system, so this must be checked explicitly (`window.matchMedia('(prefers-reduced-motion: reduce)')`). In that case we go straight to the end-state copy. The `localStorage` "seen" flag is still set, so it won't attempt to retrigger on subsequent loads.

## Structure

Following this repo's hook/lib/component conventions:

- **`hooks/useCountdownCelebration.ts`** — owns trigger/suppression logic: grace-window check against `startAt`, `localStorage` read/write for the seen-flag, and the reduced-motion check. Returns plain values (e.g. `{ shouldCelebrate: boolean }`) with no rendering concerns.
- **`lib/fireworks.ts`** — pure `runFireworks()` function wrapping `canvas-confetti`'s burst-interval loop. No React dependency, independently testable.
- **`components/feed/CountdownFireworks.tsx`** — mounts the fixed canvas overlay, calls `runFireworks()` once on mount, and unmounts itself after the sequence finishes.
- **`Countdown.tsx`** stays the orchestrator: computes `diff` as today, renders either the four `CountdownCounter`s or the end-state label based on `diff <= 0`, and conditionally renders `<CountdownFireworks />` based on `useCountdownCelebration`'s signal.

## Edge Cases

- **Multiple tabs open at rollover:** each tab has its own JS timer and fires independently the instant it crosses zero — acceptable, since it's the same real moment rather than a repeat visit. Whichever tab's write to `localStorage` lands first "wins"; a second tab racing to trigger in the same tick may also render its own burst since there's no cross-tab lock — a rare double-firing in that exact case is an acceptable tradeoff for keeping this simple (no `BroadcastChannel`/storage-event coordination).
- **Host previewing before the event starts:** no host/guest special-casing — anyone genuinely viewing the feed at start time gets the moment.
- **SSR:** `Countdown` is already a client component (uses `useState`/`useEffect`), so no hydration mismatch concerns. All `localStorage`/`matchMedia` access is guarded for `typeof window !== 'undefined'`.
- **`/demo/feed`:** reuses the real `FeedPageContent` → `Header` → `Countdown` chain, so this behavior applies there automatically with no extra wiring.

## Out of Scope

- Cross-tab coordination to prevent a rare double-fire.
- Sound effects.
- Host-configurable animation styles/colors.
- Server-persisted "seen" state (device-local `localStorage` only).
