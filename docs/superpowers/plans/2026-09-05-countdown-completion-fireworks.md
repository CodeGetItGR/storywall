# Countdown Completion Fireworks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an event's countdown reaches zero (live, or on page load within 30 minutes of start), play a brand-colored fireworks animation once per guest per event, and replace the dead `0 0 0 0` end-state with a "started" label.

**Architecture:** A new `hooks/useCountdownCelebration.ts` owns trigger/suppression logic (grace window, `localStorage` seen-flag, reduced-motion check) and is consumed by `components/feed/Countdown.tsx`, which now branches to a "started" label once the target time passes. A new `lib/fireworks.ts` wraps `canvas-confetti` in a pure, framework-agnostic burst loop, invoked by a new `components/feed/CountdownFireworks.tsx` overlay component that `Countdown` mounts conditionally.

**Tech Stack:** React 19, Next.js (client component), `canvas-confetti` (new dependency), `next-intl` for copy, Vitest + Testing Library for tests.

---

## File Structure

- **Create `lib/fireworks.ts`** — pure `runFireworks(canvas, onDone?)` function and `FIREWORKS_DURATION_MS` constant. Wraps `canvas-confetti`, no React/DOM-outside-canvas dependency.
- **Create `lib/fireworks.test.ts`** — unit tests for the burst loop's timing/cadence using mocked `canvas-confetti` and fake timers.
- **Create `hooks/useCountdownCelebration.ts`** — decides `shouldCelebrate` based on `hasFinished`, `targetTime`, `eventId`, grace window, `localStorage`, and reduced motion.
- **Create `hooks/useCountdownCelebration.test.ts`** — tests every branch (already celebrated, outside grace window, reduced motion, happy path).
- **Create `components/feed/CountdownFireworks.tsx`** — mounts a fixed full-viewport `<canvas>`, runs `runFireworks`, calls `onCompleteAction` and unmounts after `FIREWORKS_DURATION_MS`.
- **Modify `components/feed/Countdown.tsx`** — add `eventId` prop, branch render on `hasFinished`, wire up `useCountdownCelebration` and `CountdownFireworks`.
- **Modify `components/feed/Header.tsx`** — accept and forward a new `eventId` prop to `Countdown`.
- **Modify `app/(app)/(event)/events/[eventId]/feed/FeedPageContent.tsx`** — pass `eventId` to `Header`.
- **Modify `messages/en.json` and `messages/el.json`** — add `Countdown.started` key.
- **Modify `package.json`** — add `canvas-confetti` (runtime) and `@types/canvas-confetti` (dev) dependencies.

---

## Task 1: Add dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the runtime and type packages**

Run:
```bash
npm install canvas-confetti@1.9.4
npm install -D @types/canvas-confetti@1.9.0
```
Expected: `package.json` gains `"canvas-confetti": "1.9.4"` under `dependencies` and `"@types/canvas-confetti": "1.9.0"` under `devDependencies`; `package-lock.json` updates.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add canvas-confetti dependency for countdown fireworks"
```

---

## Task 2: `lib/fireworks.ts` — the particle burst loop

**Files:**
- Create: `lib/fireworks.ts`
- Test: `lib/fireworks.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/fireworks.test.ts`:

```typescript
import confetti from 'canvas-confetti';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FIREWORKS_DURATION_MS, runFireworks } from '@/lib/fireworks';

vi.mock('canvas-confetti', () => {
    const createInstance = vi.fn(() => Object.assign(vi.fn(), { reset: vi.fn() }));
    return {
        default: Object.assign(vi.fn(), { create: createInstance }),
    };
});

describe('runFireworks', () => {
    let canvas: HTMLCanvasElement;

    beforeEach(() => {
        vi.useFakeTimers();
        canvas = document.createElement('canvas');
        vi.mocked(confetti.create).mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('creates a confetti instance scoped to the given canvas', () => {
        runFireworks(canvas);
        expect(confetti.create).toHaveBeenCalledWith(canvas, { resize: true, useWorker: true });
    });

    it('fires more than one burst over the animation duration', () => {
        const instance = vi.fn();
        vi.mocked(confetti.create).mockReturnValue(Object.assign(instance, { reset: vi.fn() }));

        runFireworks(canvas);
        vi.advanceTimersByTime(FIREWORKS_DURATION_MS);

        expect(instance.mock.calls.length).toBeGreaterThan(1);
    });

    it('stops firing once the returned cleanup function is called', () => {
        const instance = vi.fn();
        vi.mocked(confetti.create).mockReturnValue(Object.assign(instance, { reset: vi.fn() }));

        const stop = runFireworks(canvas);
        vi.advanceTimersByTime(300);
        const callsBeforeStop = instance.mock.calls.length;

        stop();
        vi.advanceTimersByTime(FIREWORKS_DURATION_MS);

        expect(instance.mock.calls.length).toBe(callsBeforeStop);
    });

    it('calls reset on the confetti instance when stopped', () => {
        const resetFn = vi.fn();
        vi.mocked(confetti.create).mockReturnValue(Object.assign(vi.fn(), { reset: resetFn }));

        const stop = runFireworks(canvas);
        stop();

        expect(resetFn).toHaveBeenCalledTimes(1);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/fireworks.test.ts`
Expected: FAIL — `Cannot find module '@/lib/fireworks'` (or similar, since the file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `lib/fireworks.ts`:

```typescript
import confetti from 'canvas-confetti';

export const FIREWORKS_DURATION_MS = 3500;

const BURST_INTERVAL_MS = 300;

const FIREWORK_COLORS = ['#ff7a59', '#ff6fa0', '#ffb259', '#c777b1', '#fec463'];

export function runFireworks(canvas: HTMLCanvasElement): () => void {
    const fire = confetti.create(canvas, { resize: true, useWorker: true });
    const endAt = Date.now() + FIREWORKS_DURATION_MS;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    function burst() {
        if (Date.now() >= endAt) return;

        fire({
            particleCount: 40,
            startVelocity: 55,
            spread: 360,
            gravity: 0.9,
            ticks: 90,
            origin: { x: Math.random(), y: Math.random() * 0.4 + 0.2 },
            colors: FIREWORK_COLORS,
        });

        timeoutId = setTimeout(burst, BURST_INTERVAL_MS);
    }

    burst();

    return () => {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
        fire.reset();
    };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/fireworks.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/fireworks.ts lib/fireworks.test.ts
git commit -m "feat: add fireworks burst loop wrapping canvas-confetti"
```

---

## Task 3: `hooks/useCountdownCelebration.ts` — trigger and suppression logic

**Files:**
- Create: `hooks/useCountdownCelebration.ts`
- Test: `hooks/useCountdownCelebration.test.ts`

- [ ] **Step 1: Write the failing test**

Create `hooks/useCountdownCelebration.test.ts`:

```typescript
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCountdownCelebration } from '@/hooks/useCountdownCelebration';

const EVENT_ID = 'event-123';
const STORAGE_KEY = 'countdown-celebrated:event-123';

function renderCelebration(props: { hasFinished: boolean; targetTime: number }) {
    return renderHook((p: { hasFinished: boolean; targetTime: number }) => useCountdownCelebration({ eventId: EVENT_ID, ...p }), {
        initialProps: props,
    });
}

describe('useCountdownCelebration', () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('does not celebrate while the countdown has not finished', () => {
        const { result } = renderCelebration({ hasFinished: false, targetTime: Date.now() + 60_000 });
        expect(result.current.shouldCelebrate).toBe(false);
    });

    it('celebrates on live rollover (target time just now)', () => {
        const targetTime = Date.now();
        const { result } = renderCelebration({ hasFinished: true, targetTime });
        expect(result.current.shouldCelebrate).toBe(true);
    });

    it('celebrates when loading within the 30-minute grace window', () => {
        const targetTime = Date.now() - 10 * 60 * 1000;
        const { result } = renderCelebration({ hasFinished: true, targetTime });
        expect(result.current.shouldCelebrate).toBe(true);
    });

    it('does not celebrate when loading more than 30 minutes after start', () => {
        const targetTime = Date.now() - 45 * 60 * 1000;
        const { result } = renderCelebration({ hasFinished: true, targetTime });
        expect(result.current.shouldCelebrate).toBe(false);
    });

    it('does not celebrate again once already marked as celebrated', () => {
        window.localStorage.setItem(STORAGE_KEY, '1');
        const { result } = renderCelebration({ hasFinished: true, targetTime: Date.now() });
        expect(result.current.shouldCelebrate).toBe(false);
    });

    it('marks the event as celebrated in localStorage once triggered', () => {
        renderCelebration({ hasFinished: true, targetTime: Date.now() });
        expect(window.localStorage.getItem(STORAGE_KEY)).toBe('1');
    });

    it('does not set shouldCelebrate when the user prefers reduced motion, but still marks as seen', () => {
        vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
        const { result } = renderCelebration({ hasFinished: true, targetTime: Date.now() });
        expect(result.current.shouldCelebrate).toBe(false);
        expect(window.localStorage.getItem(STORAGE_KEY)).toBe('1');
    });

    it('resets shouldCelebrate when onCelebrationComplete is called', () => {
        const { result } = renderCelebration({ hasFinished: true, targetTime: Date.now() });
        expect(result.current.shouldCelebrate).toBe(true);

        act(() => result.current.onCelebrationComplete());

        expect(result.current.shouldCelebrate).toBe(false);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run hooks/useCountdownCelebration.test.ts`
Expected: FAIL — `Cannot find module '@/hooks/useCountdownCelebration'`.

- [ ] **Step 3: Write the implementation**

Create `hooks/useCountdownCelebration.ts`:

```typescript
import { useCallback, useEffect, useState } from 'react';

const GRACE_WINDOW_MS = 30 * 60 * 1000;

function getStorageKey(eventId: string): string {
    return `countdown-celebrated:${eventId}`;
}

function hasAlreadyCelebrated(eventId: string): boolean {
    if (typeof window === 'undefined') return true;

    try {
        return window.localStorage.getItem(getStorageKey(eventId)) === '1';
    } catch {
        return false;
    }
}

function markCelebrated(eventId: string): void {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(getStorageKey(eventId), '1');
    } catch {
        // localStorage unavailable (private mode, quota) — nothing to persist.
    }
}

function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useCountdownCelebration({
    eventId,
    hasFinished,
    targetTime,
}: {
    eventId: string;
    hasFinished: boolean;
    targetTime: number;
}) {
    const [shouldCelebrate, setShouldCelebrate] = useState(false);

    useEffect(() => {
        if (!hasFinished) return;
        if (hasAlreadyCelebrated(eventId)) return;

        const elapsedSinceStart = Date.now() - targetTime;
        if (elapsedSinceStart > GRACE_WINDOW_MS) return;

        markCelebrated(eventId);

        if (prefersReducedMotion()) return;

        setShouldCelebrate(true);
    }, [eventId, hasFinished, targetTime]);

    const onCelebrationComplete = useCallback(() => setShouldCelebrate(false), []);

    return { shouldCelebrate, onCelebrationComplete };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run hooks/useCountdownCelebration.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add hooks/useCountdownCelebration.ts hooks/useCountdownCelebration.test.ts
git commit -m "feat: add useCountdownCelebration hook for fireworks trigger logic"
```

---

## Task 4: `components/feed/CountdownFireworks.tsx` — the overlay component

**Files:**
- Create: `components/feed/CountdownFireworks.tsx`

No dedicated test file for this task: it's a thin DOM-mounting wrapper around `runFireworks` (already unit-tested in Task 2) with no branching logic of its own. It's covered indirectly by the `Countdown.tsx` tests in Task 5, and visually by the manual browser check in Task 7.

- [ ] **Step 1: Write the component**

Create `components/feed/CountdownFireworks.tsx`:

```typescript
import { useEffect, useRef } from 'react';

import { FIREWORKS_DURATION_MS, runFireworks } from '@/lib/fireworks';

export function CountdownFireworks({ onCompleteAction }: { onCompleteAction: () => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const stop = runFireworks(canvas);
        const timeoutId = setTimeout(onCompleteAction, FIREWORKS_DURATION_MS);

        return () => {
            stop();
            clearTimeout(timeoutId);
        };
    }, [onCompleteAction]);

    return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-50" />;
}
```

- [ ] **Step 2: Run the full test suite to confirm nothing broke**

Run: `npx vitest run`
Expected: PASS (all existing tests, no regressions).

- [ ] **Step 3: Commit**

```bash
git add components/feed/CountdownFireworks.tsx
git commit -m "feat: add CountdownFireworks overlay component"
```

---

## Task 5: Wire `Countdown.tsx` up to celebration + "started" end-state

**Files:**
- Modify: `components/feed/Countdown.tsx`
- Test: `components/feed/Countdown.test.tsx` (new)
- Modify: `messages/en.json`
- Modify: `messages/el.json`

- [ ] **Step 1: Add the `started` translation key**

In `messages/en.json`, update the `Countdown` block:

```json
"Countdown": {
    "days": "Days",
    "daysShort": "D",
    "hours": "Hours",
    "hoursShort": "H",
    "minutes": "Minutes",
    "minutesShort": "M",
    "seconds": "Seconds",
    "secondsShort": "S",
    "started": "It's happening!"
},
```

In `messages/el.json`, update the `Countdown` block:

```json
"Countdown": {
    "days": "Ημέρες",
    "daysShort": "η",
    "hours": "Ώρες",
    "hoursShort": "ω",
    "minutes": "Λεπτά",
    "minutesShort": "λ",
    "seconds": "Δευτερόλεπτα",
    "secondsShort": "δ",
    "started": "Ξεκίνησε!"
},
```

- [ ] **Step 2: Write the failing test**

Create `components/feed/Countdown.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Countdown } from '@/components/feed/Countdown';

const messages = {
    Countdown: {
        days: 'Days',
        daysShort: 'D',
        hours: 'Hours',
        hoursShort: 'H',
        minutes: 'Minutes',
        minutesShort: 'M',
        seconds: 'Seconds',
        secondsShort: 'S',
        started: "It's happening!",
    },
};

function renderCountdown(time: number) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <Countdown eventId="event-123" time={time} />
        </NextIntlClientProvider>,
    );
}

describe('Countdown', () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders day/hour/minute/second tiles while time remains', () => {
        renderCountdown(Date.now() + 2 * 24 * 60 * 60 * 1000);

        expect(screen.getByText('D')).toBeInTheDocument();
        expect(screen.getByText('H')).toBeInTheDocument();
        expect(screen.getByText('M')).toBeInTheDocument();
        expect(screen.getByText('S')).toBeInTheDocument();
    });

    it('shows the started label instead of zeroed tiles once the target time has passed', () => {
        renderCountdown(Date.now() - 60_000);

        expect(screen.getByText("It's happening!")).toBeInTheDocument();
        expect(screen.queryByText('D')).not.toBeInTheDocument();
    });

    it('renders the fireworks overlay canvas when within the grace window', () => {
        const { container } = renderCountdown(Date.now() - 60_000);

        expect(container.querySelector('canvas')).not.toBeNull();
    });

    it('does not render the fireworks overlay when outside the grace window', () => {
        const { container } = renderCountdown(Date.now() - 45 * 60 * 1000);

        expect(container.querySelector('canvas')).toBeNull();
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run components/feed/Countdown.test.tsx`
Expected: FAIL — the "started" label test fails because `Countdown` still renders zeroed tiles, and the `eventId` prop doesn't exist yet on the component's type.

- [ ] **Step 4: Update the implementation**

Replace the contents of `components/feed/Countdown.tsx`:

```typescript
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { CountdownCounter } from '@/components/feed/CountdownCounter';
import { CountdownFireworks } from '@/components/feed/CountdownFireworks';
import { useCountdownCelebration } from '@/hooks/useCountdownCelebration';
import { cn } from '@/lib/utils';

export function Countdown({ eventId, time, className }: { eventId: string; time: number; className?: string }) {
    const t = useTranslations('Countdown');
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1_000);

        return () => clearInterval(interval);
    }, []);

    const { days, hours, minutes, seconds, hasFinished } = useMemo(() => {
        const target = new Date(time).getTime();
        const diff = target - now;

        if (diff <= 0) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0, hasFinished: true };
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        return { days, hours, minutes, seconds, hasFinished: false };
    }, [time, now]);

    const { shouldCelebrate, onCelebrationComplete } = useCountdownCelebration({ eventId, hasFinished, targetTime: time });

    if (hasFinished) {
        return (
            <div className={cn(className, 'flex shrink-0 items-center')}>
                <span className="abhaya-body text-[1.4rem] font-bold text-black xxs:text-[1.55rem] xs:text-[1.75rem] sm:text-[1.95rem] md:text-[2.1rem] lg:text-[2.2rem]">
                    {t('started')}
                </span>
                {shouldCelebrate && <CountdownFireworks onCompleteAction={onCelebrationComplete} />}
            </div>
        );
    }

    return (
        <div className={cn(className, 'flex shrink-0 justify-between gap-2 xxs:gap-2.5 md:gap-3')}>
            <CountdownCounter text={t('days')} shortText={t('daysShort')} count={days} />
            <CountdownCounter text={t('hours')} shortText={t('hoursShort')} count={hours} />
            <CountdownCounter text={t('minutes')} shortText={t('minutesShort')} count={minutes} />
            <CountdownCounter text={t('seconds')} shortText={t('secondsShort')} count={seconds} />
        </div>
    );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run components/feed/Countdown.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add components/feed/Countdown.tsx components/feed/Countdown.test.tsx messages/en.json messages/el.json
git commit -m "feat: show started label and trigger fireworks when countdown finishes"
```

---

## Task 6: Thread `eventId` through `Header` and `FeedPageContent`

**Files:**
- Modify: `components/feed/Header.tsx`
- Modify: `app/(app)/(event)/events/[eventId]/feed/FeedPageContent.tsx`

- [ ] **Step 1: Update `Header` to accept and forward `eventId`**

Replace the contents of `components/feed/Header.tsx`:

```typescript
import { Logo } from '@/components/common/Logo';

import { Countdown } from './Countdown';

export function Header({ countdownTime, eventId }: { countdownTime: number; eventId: string }) {
    return (
        <div className="sticky top-0 z-20 w-full bg-background">
            {/* Header */}
            <div className="relative flex items-center justify-between gap-4 p-4 pb-2">
                <Logo direction="row" wordmarkClassName="h-7 w-auto xxs:h-7 xs:h-8 sm:h-12" />
                {/* Countdown */}
                <Countdown eventId={eventId} time={countdownTime} className="sm:ml-2" />
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Pass `eventId` from `FeedPageContent`**

In `app/(app)/(event)/events/[eventId]/feed/FeedPageContent.tsx`, update the `Header` usage:

```typescript
            {/* Header */}
            <Header countdownTime={event.schedule.startAt ? new Date(event.schedule.startAt).getTime() : 0} eventId={eventId} />
```

- [ ] **Step 3: Run typecheck and the full test suite**

Run:
```bash
npx tsc --noEmit
npx vitest run
```
Expected: both PASS with no errors.

- [ ] **Step 4: Commit**

```bash
git add components/feed/Header.tsx "app/(app)/(event)/events/[eventId]/feed/FeedPageContent.tsx"
git commit -m "feat: thread eventId into Header/Countdown for celebration tracking"
```

---

## Task 7: Manual verification in the browser

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server and open the demo feed**

Run the app locally (e.g. `npm run dev`) and open `/demo/feed` (or a real event feed with a known `startAt`), since it reuses `FeedPageContent` → `Header` → `Countdown` directly.

- [ ] **Step 2: Verify the live-rollover path**

Using the browser devtools or a temporary local edit, set an event's `startAt` to a few seconds in the future. Confirm:
- The four counters count down normally.
- At zero, the fireworks canvas overlay plays for ~3.5s across the full viewport in the brand colors (coral/pink/orange/purple/gold), then disappears.
- The counters are replaced by the "It's happening!" label.
- Refreshing the page does not replay the fireworks (grace-window arrival still shows the label, no second burst).

- [ ] **Step 3: Verify the grace-window-arrival path**

Set `startAt` to ~10 minutes in the past, clear `localStorage` for the `countdown-celebrated:*` key, and load the page fresh. Confirm fireworks play once on load.

- [ ] **Step 4: Verify the outside-grace-window path**

Set `startAt` to 45+ minutes in the past, clear the relevant `localStorage` key, and load the page fresh. Confirm no fireworks play and the "It's happening!" label shows immediately.

- [ ] **Step 5: Verify reduced motion**

Enable "prefers reduced motion" in the OS/browser, clear the `localStorage` key, and reload with `startAt` in the past within the grace window. Confirm no fireworks canvas appears, the label still shows, and the `localStorage` flag is still set (reload again and confirm it still doesn't fire).

- [ ] **Step 6: Check mobile breakpoint**

Resize to a mobile viewport and repeat the live-rollover check from Step 2. Confirm the fireworks overlay still covers the full viewport and the header/label layout doesn't break.

---

## Self-Review Notes

- **Spec coverage:** trigger cases (live rollover, grace window) → Task 3/5; replay suppression via `localStorage` → Task 3; visual treatment via `canvas-confetti` with brand colors → Task 2; end-state copy → Task 5; reduced motion → Task 3; file structure (hook/lib/component split) → Tasks 2–4; edge cases (multi-tab accepted race, SSR guards, `/demo/feed` reuse) → covered by the `typeof window` guards in Task 3 and the fact that `/demo/feed` needs no separate wiring (confirmed during brainstorming — it already renders `FeedPageContent`).
- **Placeholder scan:** none found — every step has runnable code and exact commands.
- **Type consistency:** `useCountdownCelebration({ eventId, hasFinished, targetTime })` signature and `{ shouldCelebrate, onCelebrationComplete }` return shape are identical across Task 3's implementation, its tests, and Task 5's `Countdown.tsx` usage. `runFireworks(canvas)` / `FIREWORKS_DURATION_MS` names match between Task 2 and Task 4. `onCompleteAction` prop name on `CountdownFireworks` matches the codebase's existing `onOpenStoryAction`/`onCloseAction` convention seen in `FeedPageContent.tsx`.
