# Event Creation Wizard (Frontend, part 4: account, sign-in, sign-up, email code) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-out guest (or an unverified account) finish the wizard: an account step before review with Google first and email sign-up or sign-in as the fallback, and a 6-digit email code screen that verifies the address inside the wizard.

**Architecture:** A new `account` step sits between theme and review in the wizard only. Which account screen shows (choose, sign up, sign in, code, change email) is a search param (`account=`), so Back and the browser's Back work as for the plans sheet. The sign-in and sign-up forms are extracted from today's `/login` and `/register` pages into shared components, so the wizard and the pages render the same form. Pure rules (which steps show, error mapping, countdown) live in `lib/` with unit tests; hooks own the API calls and the "what next" logic; components stay declarative.

**Tech Stack:** Next.js 16 App Router, React 19, next-intl 4, TanStack Query 5, Vitest + Testing Library, Storybook 10 with MSW.

**Spec:** `docs/superpowers/specs/2026-11-10-event-creation-wizard-design.md` sections 3.1, 3.2, 4.3 (accountStepShown), 4.4, 5.7, 5.8, 5.9. Wording: `...-copy.md` rows 49–65 (approved 2026-11-10). Backend: guestwall-be#133 (merged to staging 2026-11-11): `GET /api/plan-tiers` public, `POST /api/auth/email-code`, `POST /api/auth/email-code/verify`, `PUT /api/auth/email-code/email`, register's `emailVerification: "CODE"`. Jira epic KAN-197.

**Not in this part:** the floating phone button and header buttons (later part), the cleanup PR (removing `pendingCreateEvent.ts`, `CreateEventBoundary`). The old flow (flag off) is unchanged.

---

## Before you start

- Branch `claude/kan-197-wizard-account-step` from the latest `staging` (it already has parts 1–3). Open the PR into `staging`.
- If `node_modules` is missing, link it to the main checkout's (memory note "Worktree node_modules junction") when the lockfiles match.
- One test file: `npx vitest run <path>`. Whole suite: `npx vitest run`. Types: `npx tsc --noEmit`. Lint: `npx eslint .`. Format: `npx prettier --write <files>`.
- Commit messages start with `KAN-197:` and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Stage files by name. A local `next dev` run edits `AGENTS.md`: revert it, never commit it.
- Message files contain duplicate keys: edit them as text (the Python snippets below), never with a JSON round-trip.
- Never change user-facing wording beyond what Task 1 lists.
- Every new visual section gets the repo's JSX section comment. Every image gets real alt text.
- Vitest runs without globals: import `afterEach, describe, expect, it, vi` and call `cleanup` in `afterEach`.

## Decisions taken while planning

1. **The step is `account`, wizard only.** `CREATE_EVENT_STEPS` becomes `type, plan, details, theme, account, overview`. The old flow never lists it; a legacy URL with `step=account` is sent to `overview` like a theme step that doesn't apply.
2. **Who sees it:** signed out, or signed in with `emailVerified === false`. `emailVerified === null` (still loading `/api/me`) does not count, so a verified host is never bounced to the account step on a reload. While auth is bootstrapping, the "send back to the reachable step" effect waits.
3. **It stays in the count once shown** (spec 3.1): `accountStepShown` is saved in the draft. Back from review skips the account step when the account no longer needs it, so it can't loop.
4. **Account screens are a search param** `account` = `signup | signin | code | email`; none = the choose screen. Each is its own history entry (kind `'account'`), like the plans sheet. The wizard's Back on a sub-screen goes back to the choose screen; on the code screen it goes back to choose only for a signed-out start (an unverified account has nothing else to choose).
5. **The footer button is hidden on the account step.** Google's button, the email links and each form's own submit are the actions there. The forms reuse one extracted button style (`CreateEventWizardButton`), so they look like the footer button.
6. **After sign-in** (email, Google or Apple): admin → `routes.admin`; verified → review (`overview`, replace); unverified → code screen. If the account's saved language differs from the page's (`localeCookieChanged`), the page reloads; the draft brings the host back.
7. **Sign-up asks the backend for a code** (`emailVerification: 'CODE'`), so it doesn't send a link too. The time the code was sent is kept in sessionStorage per account, so the code screen doesn't send another one and the 60-second countdown survives a reload. Opening the code screen with no code sent in this tab sends one. A 429 on that automatic send is not an error: it means one was just sent, so only the countdown starts.
8. **Code errors:** 3127 → row 63 (wrong), 3125 and 3124 → row 64 (expired), 3126 → row 65 (too many). 5227 (already verified) refetches `/api/me` and moves on. Anything else uses today's `useApiErrorMessage`.
9. **On a verified code**, `/api/me` is refetched (`meQueryKey`); `useMe` merges `emailVerified: true` into the session and decision 6 moves to review.
10. **Change email** (row 61) opens a small form: today's email field (`RegisterPage.fields.email`, `RegisterPage.placeholders.email`) and the code screen's "Confirm" (row 62). It calls `PUT /api/auth/email-code/email`, then refetches `/api/me`, restarts the countdown and returns to the code screen. **Needs the user's OK** (no row covers this form's button).
11. **Summary card** on the account step reuses `DetailsPreview` (photo, title) with the line "date · plan name". No new wording.
12. **Forgot password** in the wizard's sign-in form opens `/forgot-password` in a new tab (spec 5.8).
13. **Theme presets load signed out in the wizard** (`GET /api/theme-presets` is public), so guests get the theme step too. The old flow keeps its signed-in gate.
14. **Public pages:** the pop-up fetches the namespaces the forms use (`LoginPage`, `RegisterPage`, `OAuthButtons`, `OAuthSignupAcceptance`, `AcceptanceCheckboxes`). `i18n/createWizardMessages.test.ts` enforces the list.

## Files

**Create**
- `lib/emailCode.ts` (+ `.test.ts`): code length, digits only, error mapping, countdown, sent-at storage.
- `lib/createEventWizardAccount.ts` (+ `.test.ts`): the account screens, who needs the step, where to go after sign-in.
- `hooks/useCreateEventWizardAccountView.ts`: the `account` param (open, back).
- `hooks/useCreateEventWizardAccount.ts` (+ `.test.tsx`): moves on after sign-in, sends the first code.
- `hooks/useEmailCode.ts` (+ `.test.tsx`): verify, resend, change email, countdown.
- `hooks/useLoginForm.ts`: the login page's form state, now shared.
- `hooks/useSecondsLeft.ts`: a 1-second ticking countdown.
- `components/auth/LoginEmailForm.tsx`, `components/auth/RegisterEmailForm.tsx`: the extracted forms.
- `components/event/create/wizard/CreateEventWizardButton.tsx`: the footer button's look, shared.
- `components/event/create/wizard/account/{AccountStep,AccountChoose,AccountSignUp,AccountSignIn,AccountCode,AccountChangeEmail,EmailCodeInput}.tsx` (+ `AccountStep.test.tsx`, `EmailCodeInput.test.tsx`).

**Modify**
- `messages/en.json`, `messages/el.json`: Task 1 keys.
- `i18n/createWizardMessages.ts`: namespaces.
- `lib/api/types.ts`, `lib/api/endpoints.ts`, `lib/api/errors.ts`: email code API.
- `lib/createEventSteps.ts` (+ test): the `account` step.
- `lib/createEventWizardDraft.ts` (+ test): `accountStepShown`.
- `lib/createEventWizardUrl.ts`, `lib/createEventWizardHistory.ts`: the `account` param and entry kind.
- `providers/createEvent/CreateEventFormContext.tsx`: `goToNextStep`.
- `hooks/useCreateEventFormController.ts` (+ wizard test): account step wiring.
- `hooks/useCreateEventStepNavigation.ts`: a step change clears `account`.
- `hooks/useEventTheme.ts`: signed-out presets for the wizard.
- `hooks/useRegisterForm.ts`: `onSignedIn` and `emailVerification` options.
- `hooks/useCreateEventWizardFooter.ts` (+ test): theme → next step; none on account.
- `components/event/create/wizard/{CreateEventWizard,CreateEventWizardFooter,CreateEventWizardBackButton}.tsx`.
- `app/(main)/login/page.tsx`, `app/(main)/register/page.tsx`: render the extracted forms (no visual change).
- `components/event/create/wizard/CreateEventWizard.stories.tsx`: account stories.

---

### Task 1: The wording

**Files:** `messages/en.json`, `messages/el.json`, `i18n/createWizardMessages.ts`

- [ ] **Step 1: Add the keys after `CreateEventPage.wizard.review.pay`**

Run from the repo root:

```bash
python - <<'EOF'
def add(path, anchor, block):
    s = open(path, encoding='utf-8').read().replace('\r\n', '\n')
    assert s.count(anchor) == 1, (path, anchor)
    s = s.replace(anchor, anchor + block)
    open(path, 'w', encoding='utf-8', newline='\n').write(s)

add('messages/en.json', '"pay": "Pay {amount}"\n            }', ''',
            "account": {
                "heading": "Almost there. Save your event",
                "line": "Sign in so you can manage it from any device."
            },
            "code": {
                "heading": "Check your email",
                "line": "For your security, enter the 6-digit code we sent to {email}",
                "label": "6-digit code",
                "resendIn": "Resend code in {time}",
                "resend": "Resend code",
                "resent": "We sent a new code.",
                "changeEmail": "Change email",
                "confirm": "Confirm",
                "errors": {
                    "wrong": "That code isn't right. Try again.",
                    "expired": "This code has expired. Send a new one.",
                    "tooMany": "Too many tries. Send a new code."
                }
            }''')
add('messages/el.json', '"pay": "Πληρωμή {amount}"\n            }', ''',
            "account": {
                "heading": "Σχεδόν τελειώσαμε. Αποθηκεύστε την εκδήλωσή σας",
                "line": "Συνδεθείτε για να τη διαχειρίζεστε από οποιαδήποτε συσκευή."
            },
            "code": {
                "heading": "Ελέγξτε το email σας",
                "line": "Για την ασφάλειά σας, πληκτρολογήστε τον 6ψήφιο κωδικό που στείλαμε στο {email}",
                "label": "6ψήφιος κωδικός",
                "resendIn": "Νέος κωδικός σε {time}",
                "resend": "Στείλτε νέο κωδικό",
                "resent": "Σας στείλαμε νέο κωδικό.",
                "changeEmail": "Αλλαγή email",
                "confirm": "Επιβεβαίωση",
                "errors": {
                    "wrong": "Ο κωδικός δεν είναι σωστός. Δοκιμάστε ξανά.",
                    "expired": "Ο κωδικός έληξε. Ζητήστε νέο.",
                    "tooMany": "Πολλές προσπάθειες. Ζητήστε νέο κωδικό."
                }
            }''')
EOF
node -e "for (const l of ['en','el']) { const w = require('./messages/' + l + '.json').CreateEventPage.wizard; console.log(l, w.account.heading, '|', w.code.errors.tooMany); }"
```

Expected: both lines print the heading and the last error. If an anchor assert fails, look at the indentation of `wizard.review.pay` in that file and adjust the anchor's spaces only.

- [ ] **Step 2: Add the forms' namespaces to the pop-up's list**

In `i18n/createWizardMessages.ts`, the array becomes:

```ts
export const CREATE_WIZARD_NAMESPACES = [
    'AcceptanceCheckboxes',
    'ApiErrors',
    'CheckoutReviewPage',
    'Common',
    'CreateEventPage',
    'Durations',
    'EventVoiceFallback',
    'GiftMode.form',
    'Incident',
    'LandingPage.pricing',
    'LoginPage',
    'ManagePage.settings.theme',
    'Modules',
    'OAuthButtons',
    'OAuthSignupAcceptance',
    'ProfilePage.business',
    'RegisterPage',
    'SessionUnavailable',
] as const;
```

- [ ] **Step 3: Run the message tests**

Run: `npx vitest run i18n`
Expected: PASS. (`createWizardMessages.test.ts` fails later, in Task 9, if a component reads a namespace missing here. That's the point of the list.)

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/el.json i18n/createWizardMessages.ts
git commit -m "KAN-197: wording for the wizard's account and email code screens"
```

---

### Task 2: The email code API and its rules

**Files:**
- Modify: `lib/api/types.ts` (RegisterRequestDto), `lib/api/endpoints.ts` (auth), `lib/api/errors.ts` (ERROR_CODES)
- Create: `lib/emailCode.ts`, `lib/emailCode.test.ts`

- [ ] **Step 1: Types, endpoints, codes**

In `RegisterRequestDto` (`lib/api/types.ts`), after `subscribeToNewsletter?: boolean;`:

```ts
    // 'CODE' mails a 6-digit code (the create wizard) instead of a link. Default 'LINK'.
    emailVerification?: 'LINK' | 'CODE';
```

In `endpoints.auth` (`lib/api/endpoints.ts`), after `forgotPassword`:

```ts
        // The create wizard's 6-digit email code (signed in, unverified).
        emailCode: {
            send: '/api/auth/email-code',
            verify: '/api/auth/email-code/verify',
            email: '/api/auth/email-code/email',
        },
```

In `ERROR_CODES` (`lib/api/errors.ts`), next to the other 31xx codes:

```ts
    EMAIL_CODE_NOT_REQUESTED: 3124,
    EMAIL_CODE_EXPIRED: 3125,
    EMAIL_CODE_TOO_MANY_ATTEMPTS: 3126,
    EMAIL_CODE_INVALID: 3127,
```

and next to the 52xx codes:

```ts
    EMAIL_ALREADY_VERIFIED: 5227,
```

- [ ] **Step 2: Write the failing test**

`lib/emailCode.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { emailCodeError, formatCountdown, onlyDigits, readCodeSentAt, rememberCodeSentAt, resendSecondsLeft } from '@/lib/emailCode';

afterEach(() => window.sessionStorage.clear());

describe('emailCodeError', () => {
    it('maps the code errors to the three messages', () => {
        expect(emailCodeError(new ApiError(400, { errorCode: 3127 }))).toBe('wrong');
        expect(emailCodeError(new ApiError(400, { errorCode: 3125 }))).toBe('expired');
        expect(emailCodeError(new ApiError(400, { errorCode: 3124 }))).toBe('expired');
        expect(emailCodeError(new ApiError(400, { errorCode: 3126 }))).toBe('tooMany');
    });

    it('leaves other errors to the usual message', () => {
        expect(emailCodeError(new ApiError(429, { errorCode: 1003 }))).toBeNull();
        expect(emailCodeError(new Error('offline'))).toBeNull();
    });
});

describe('onlyDigits', () => {
    it('keeps up to six digits', () => {
        expect(onlyDigits(' 12-34 567')).toBe('123456');
        expect(onlyDigits('ab')).toBe('');
    });
});

describe('resendSecondsLeft', () => {
    it('counts down 60 seconds from the send', () => {
        expect(resendSecondsLeft(null, 1000)).toBe(0);
        expect(resendSecondsLeft(0, 15_000)).toBe(45);
        expect(resendSecondsLeft(0, 59_001)).toBe(1);
        expect(resendSecondsLeft(0, 61_000)).toBe(0);
    });
});

describe('formatCountdown', () => {
    it('shows minutes and seconds', () => {
        expect(formatCountdown(45)).toBe('0:45');
        expect(formatCountdown(60)).toBe('1:00');
        expect(formatCountdown(5)).toBe('0:05');
    });
});

describe('code sent-at storage', () => {
    it('remembers when a code went to an account', () => {
        expect(readCodeSentAt('u1')).toBeNull();
        rememberCodeSentAt('u1', 1234);
        expect(readCodeSentAt('u1')).toBe(1234);
        expect(readCodeSentAt('u2')).toBeNull();
    });
});
```

- [ ] **Step 3: Run it to make sure it fails**

Run: `npx vitest run lib/emailCode.test.ts`
Expected: FAIL, cannot resolve `@/lib/emailCode`.

- [ ] **Step 4: Write `lib/emailCode.ts`**

```ts
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';

export const EMAIL_CODE_LENGTH = 6;
// The backend allows one send a minute; the screen waits as long before offering another.
export const EMAIL_CODE_RESEND_MS = 60_000;

export type EmailCodeError = 'wrong' | 'expired' | 'tooMany';

// The code screen's own messages (copy rows 63–65); null leaves the error to useApiErrorMessage.
// "None sent" (3124) reads as expired: either way the fix is to send a new one.
export function emailCodeError(error: unknown): EmailCodeError | null {
    const code = getErrorCode(error);
    if (code === ERROR_CODES.EMAIL_CODE_INVALID) return 'wrong';
    if (code === ERROR_CODES.EMAIL_CODE_EXPIRED || code === ERROR_CODES.EMAIL_CODE_NOT_REQUESTED) return 'expired';
    if (code === ERROR_CODES.EMAIL_CODE_TOO_MANY_ATTEMPTS) return 'tooMany';
    return null;
}

export function onlyDigits(value: string): string {
    return value.replace(/\D/g, '').slice(0, EMAIL_CODE_LENGTH);
}

export function resendSecondsLeft(sentAt: number | null, now: number): number {
    if (sentAt === null) return 0;
    return Math.max(0, Math.ceil((sentAt + EMAIL_CODE_RESEND_MS - now) / 1000));
}

export function formatCountdown(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

// When a code last went to this account, in this tab: a reload neither sends another nor resets the wait.
const sentAtKey = (userId: string) => `storywall.emailCodeSentAt.${userId}`;

export function readCodeSentAt(userId: string): number | null {
    try {
        const value = Number(window.sessionStorage.getItem(sentAtKey(userId)));
        return Number.isFinite(value) && value > 0 ? value : null;
    } catch {
        return null;
    }
}

export function rememberCodeSentAt(userId: string, at: number): void {
    try {
        window.sessionStorage.setItem(sentAtKey(userId), String(at));
    } catch {
        // Storage blocked: a reload may send one more code.
    }
}
```

- [ ] **Step 5: Run the test**

Run: `npx vitest run lib/emailCode.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/api/types.ts lib/api/endpoints.ts lib/api/errors.ts lib/emailCode.ts lib/emailCode.test.ts
git commit -m "KAN-197: email code API, error messages and the resend countdown"
```

---

### Task 3: The account step in the step list

**Files:**
- Modify: `providers/createEvent/CreateEventFormContext.tsx:20`, `lib/createEventSteps.ts`, `lib/createEventSteps.test.ts`
- Create: `lib/createEventWizardAccount.ts`, `lib/createEventWizardAccount.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/createEventSteps.test.ts` (keep its imports; add `stepAfter, stepBefore` to the import from `@/lib/createEventSteps`):

```ts
describe('visibleCreateEventSteps with the account step', () => {
    it('puts account between theme and review', () => {
        expect(visibleCreateEventSteps(true, true)).toEqual(['type', 'plan', 'details', 'theme', 'account', 'overview']);
        expect(visibleCreateEventSteps(false, true)).toEqual(['type', 'plan', 'details', 'account', 'overview']);
        expect(visibleCreateEventSteps(false, false)).toEqual(['type', 'plan', 'details', 'overview']);
    });
});

describe('stepAfter and stepBefore', () => {
    const steps = ['type', 'plan', 'details', 'account', 'overview'] as const;

    it('moves along the shown steps', () => {
        expect(stepAfter('details', steps)).toBe('account');
        expect(stepAfter('overview', steps)).toBeNull();
        expect(stepBefore('overview', steps, false)).toBe('account');
    });

    it('steps back over the account step once it is done', () => {
        expect(stepBefore('overview', steps, true)).toBe('details');
    });
});
```

Create `lib/createEventWizardAccount.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { accountDestination, needsAccountStep, parseAccountView } from '@/lib/createEventWizardAccount';

describe('needsAccountStep', () => {
    it('is needed signed out and for a confirmed unverified email', () => {
        expect(needsAccountStep(null)).toBe(true);
        expect(needsAccountStep({ emailVerified: false, role: 'USER' })).toBe(true);
    });

    it('is not needed verified, or while the email state is still loading', () => {
        expect(needsAccountStep({ emailVerified: true, role: 'USER' })).toBe(false);
        expect(needsAccountStep({ emailVerified: null, role: 'USER' })).toBe(false);
    });
});

describe('accountDestination', () => {
    it('sends admins to their console, verified hosts to review, others to the code', () => {
        expect(accountDestination({ emailVerified: true, role: 'ADMIN' })).toBe('admin');
        expect(accountDestination({ emailVerified: true, role: 'USER' })).toBe('review');
        expect(accountDestination({ emailVerified: false, role: 'USER' })).toBe('code');
        expect(accountDestination({ emailVerified: null, role: 'USER' })).toBeNull();
        expect(accountDestination(null)).toBeNull();
    });
});

describe('parseAccountView', () => {
    it('reads the account screen from the URL', () => {
        expect(parseAccountView('signup')).toBe('signup');
        expect(parseAccountView('code')).toBe('code');
        expect(parseAccountView('nope')).toBe('choose');
        expect(parseAccountView(null)).toBe('choose');
    });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run lib/createEventSteps.test.ts lib/createEventWizardAccount.test.ts`
Expected: FAIL (`stepAfter` missing, module missing).

- [ ] **Step 3: Add the step**

`providers/createEvent/CreateEventFormContext.tsx:20`:

```ts
export type CreateEventStep = 'type' | 'plan' | 'details' | 'theme' | 'account' | 'overview';
```

In `lib/createEventSteps.ts`, replace `CREATE_EVENT_STEPS` and `visibleCreateEventSteps`, and add the two helpers:

```ts
// Every step, in order. Theme and account are shown only when they apply (wizard only for account).
export const CREATE_EVENT_STEPS: CreateEventStep[] = ['type', 'plan', 'details', 'theme', 'account', 'overview'];

// The steps the host walks through: the theme step only when there is something to pick, the account
// step only in the wizard and only for a guest or an unverified account (it then stays for the run).
export function visibleCreateEventSteps(themeStepAvailable: boolean, accountStepShown = false): CreateEventStep[] {
    return CREATE_EVENT_STEPS.filter((step) => (step !== 'theme' || themeStepAvailable) && (step !== 'account' || accountStepShown));
}

export function stepAfter(step: CreateEventStep, steps: readonly CreateEventStep[]): CreateEventStep | null {
    return steps[steps.indexOf(step) + 1] ?? null;
}

// Back from review steps over the account step once the account no longer needs it, or it would
// send the host straight forward again.
export function stepBefore(step: CreateEventStep, steps: readonly CreateEventStep[], accountDone: boolean): CreateEventStep | null {
    const before = steps.slice(0, Math.max(steps.indexOf(step), 0)).filter((entry) => !(accountDone && entry === 'account'));
    return before.at(-1) ?? null;
}
```

- [ ] **Step 4: Write `lib/createEventWizardAccount.ts`**

```ts
import type { UserRole } from '@/lib/api/types';

// The account step's screens, as the `account` search param. None in the URL is the choose screen.
export const ACCOUNT_VIEWS = ['choose', 'signup', 'signin', 'code', 'email'] as const;
export type AccountView = (typeof ACCOUNT_VIEWS)[number];

export function parseAccountView(value: string | null): AccountView {
    return ACCOUNT_VIEWS.find((view) => view === value) ?? 'choose';
}

type AccountState = { emailVerified: boolean | null; role: UserRole } | null;

// Signed out, or an email we know isn't verified. Still loading (null) is not "unverified".
export function needsAccountStep(user: AccountState): boolean {
    return user === null || user.emailVerified === false;
}

// Where the account step goes once someone is signed in; null while the email state loads.
export function accountDestination(user: AccountState): 'admin' | 'review' | 'code' | null {
    if (!user) return null;
    if (user.role === 'ADMIN') return 'admin';
    if (user.emailVerified === true) return 'review';
    if (user.emailVerified === false) return 'code';
    return null;
}
```

If `UserRole` isn't exported from `lib/api/types.ts` under that name, use the type of `useAuth().user.role` (grep `role:` in `providers/AuthProvider.tsx`) and import it instead.

- [ ] **Step 5: Run the tests and types**

Run: `npx vitest run lib/createEventSteps.test.ts lib/createEventWizardAccount.test.ts && npx tsc --noEmit`
Expected: PASS, and tsc clean. If tsc reports a `Record<CreateEventStep, …>` missing `account` somewhere (e.g. step titles), add an `account` entry that mirrors `overview`'s and note it in the commit.

- [ ] **Step 6: Commit**

```bash
git add providers/createEvent/CreateEventFormContext.tsx lib/createEventSteps.ts lib/createEventSteps.test.ts lib/createEventWizardAccount.ts lib/createEventWizardAccount.test.ts
git commit -m "KAN-197: the account step in the wizard's step list"
```

---

### Task 4: Remember that the account step was shown, and its screens in the URL

**Files:** `lib/createEventWizardDraft.ts` (+ test), `lib/createEventWizardUrl.ts`, `lib/createEventWizardHistory.ts`, `hooks/useCreateEventStepNavigation.ts`, `hooks/useCreateEventWizardAccountView.ts`

- [ ] **Step 1: Failing draft test**

Append to `lib/createEventWizardDraft.test.ts` (reuse the file's existing full draft fixture; if it has none, copy the object literal from `hooks/useCreateEventFormController.wizard.test.tsx:61-75` into a `const base`):

```ts
it('keeps whether the account step was shown', () => {
    writeCreateEventWizardDraft({ ...base, accountStepShown: true });
    expect(readCreateEventWizardDraft()?.accountStepShown).toBe(true);
    writeCreateEventWizardDraft({ ...base });
    expect(readCreateEventWizardDraft()?.accountStepShown).toBe(false);
});
```

Run: `npx vitest run lib/createEventWizardDraft.test.ts` → FAIL (type error / undefined).

- [ ] **Step 2: Add the field**

In `CreateEventWizardDraft` add (optional, so existing callers and stories still compile):

```ts
    // Once shown, the account step stays in the step count for the run (spec 3.1).
    accountStepShown?: boolean;
```

In `parse`, after `checkoutCode`:

```ts
        accountStepShown: raw.accountStepShown === true,
```

Run the test again → PASS.

- [ ] **Step 3: The `account` param and entry kind**

`lib/createEventWizardUrl.ts`, after `PLANS_SHEET`:

```ts
// The account step's screen (sign up, sign in, code, change email). Its own history entry.
export const CREATE_EVENT_ACCOUNT_PARAM = 'account';
```

and add `CREATE_EVENT_ACCOUNT_PARAM` to `WIZARD_PARAMS` after `CREATE_EVENT_SHEET_PARAM`.

`lib/createEventWizardHistory.ts`: the kind type and its reader become

```ts
export type WizardEntryKind = 'open' | 'step' | 'sheet' | 'account';
```

```ts
    return kind === 'open' || kind === 'step' || kind === 'sheet' || kind === 'account' ? kind : null;
```

`hooks/useCreateEventStepNavigation.ts`: a step change leaves the account screen behind:

```ts
        const urlFor = (step: CreateEventStep) => withWizardParams(new URL(window.location.href), { step, run, account: null });
```

- [ ] **Step 4: The view hook**

`hooks/useCreateEventWizardAccountView.ts`:

```ts
'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import { type AccountView, parseAccountView } from '@/lib/createEventWizardAccount';
import { leaveWizardEntry, pushWizardEntry, replaceWizardEntry } from '@/lib/createEventWizardHistory';
import { CREATE_EVENT_ACCOUNT_PARAM, withWizardParams } from '@/lib/createEventWizardUrl';

const urlFor = (view: AccountView) =>
    withWizardParams(new URL(window.location.href), { [CREATE_EVENT_ACCOUNT_PARAM]: view === 'choose' ? null : view });

// Which account screen shows. Each screen is a Back step, like the plans sheet.
export function useCreateEventWizardAccountView() {
    const searchParams = useSearchParams();
    const view = parseAccountView(searchParams.get(CREATE_EVENT_ACCOUNT_PARAM));

    return useMemo(
        () => ({
            view,
            open: (next: AccountView) => pushWizardEntry(urlFor(next), 'account'),
            // Same entry: the code screen after a sign-in replaces the sign-in screen.
            show: (next: AccountView) => replaceWizardEntry(urlFor(next)),
            back: () => leaveWizardEntry('account', urlFor('choose')),
        }),
        [view],
    );
}
```

- [ ] **Step 5: Types and the touched tests**

Run: `npx tsc --noEmit && npx vitest run lib/createEventWizardDraft.test.ts lib/createEventWizardUrl.test.ts lib/createEventWizardHistory.test.ts hooks/useCreateEventFormController.wizard.test.tsx`
Expected: PASS. If a URL test asserts the exact `WIZARD_PARAMS` it strips, add `account` to its expectation.

- [ ] **Step 6: Commit**

```bash
git add lib/createEventWizardDraft.ts lib/createEventWizardDraft.test.ts lib/createEventWizardUrl.ts lib/createEventWizardHistory.ts hooks/useCreateEventStepNavigation.ts hooks/useCreateEventWizardAccountView.ts
git commit -m "KAN-197: keep the account step in the count, and its screens in the URL"
```

---

### Task 5: Wire the account step into the form

**Files:** `hooks/useCreateEventFormController.ts`, `hooks/useCreateEventFormController.wizard.test.tsx`, `providers/createEvent/CreateEventFormContext.tsx`, `hooks/useEventTheme.ts`

- [ ] **Step 1: Failing controller tests**

In `hooks/useCreateEventFormController.wizard.test.tsx`, widen the auth mock's user type to `null | { emailVerified: boolean | null; role: string }`, add `isBootstrapping: false` to `auth.current`, and append:

```ts
    it('shows the account step to a guest, between details and review', () => {
        const { result } = renderHook(() => useCreateEventFormController({ mode: 'wizard' }));
        expect(result.current.steps).toEqual(['type', 'plan', 'details', 'account', 'overview']);
    });

    it('has no account step for a verified host', () => {
        auth.current = { isAuthenticated: true, isBootstrapping: false, user: { emailVerified: true, role: 'USER' } };
        const { result } = renderHook(() => useCreateEventFormController({ mode: 'wizard' }));
        expect(result.current.steps).not.toContain('account');
    });

    it('keeps the account step in the count once it was shown', () => {
        auth.current = { isAuthenticated: true, isBootstrapping: false, user: { emailVerified: true, role: 'USER' } };
        writeCreateEventWizardDraft({ ...savedDraft, accountStepShown: true });
        const { result } = renderHook(() => useCreateEventFormController({ mode: 'wizard' }));
        expect(result.current.steps).toContain('account');
    });

    it('never shows the account step in the old flow', () => {
        const { result } = renderHook(() => useCreateEventFormController({ mode: 'legacy' }));
        expect(result.current.steps).not.toContain('account');
    });
```

Add near the top, under the mocks, a `savedDraft` constant with the same literal the first test uses (`run: 'r1'`, `step: 'details'`, …), and reset `auth.current = { isAuthenticated: false, isBootstrapping: false, user: null }` in `beforeEach`. (The legacy test may need `mode: 'legacy'` to be the accepted literal; check `CreateEventFlowMode`.)

Run: `npx vitest run hooks/useCreateEventFormController.wizard.test.tsx` → FAIL.

- [ ] **Step 2: Controller changes**

In `hooks/useCreateEventFormController.ts`:

1. Read bootstrapping: `const { isAuthenticated, isBootstrapping, user } = useAuth();`
2. After `const isEmailVerified = …`:

```ts
    // The wizard asks a guest or an unverified account to sign in before review; once shown, the step
    // stays in the count for the run (spec 3.1).
    const needsAccount = isWizard && needsAccountStep(user ? { emailVerified: user.emailVerified, role: user.role } : null);
    const [accountStepShown, setAccountStepShown] = useState(() => saved?.accountStepShown ?? false);
    useEffect(() => {
        if (needsAccount && !isBootstrapping) setAccountStepShown(true);
    }, [isBootstrapping, needsAccount]);
    const showAccountStep = isWizard && (accountStepShown || (needsAccount && !isBootstrapping));
```

3. `const steps = visibleCreateEventSteps(themeStepAvailable, showAccountStep);`
4. Theme presets in the wizard signed out: `const themePresetsQuery = useThemePresetsForType(planHasTheme ? selectedEventType : null, isWizard);`
5. Reachability. Replace the `reachableStep` line:

```ts
    const reachableStep: CreateEventStep = canReachOverview
        ? needsAccount
            ? 'account'
            : 'overview'
        : canReachDetails
          ? 'details'
          : canReachPlan
            ? 'plan'
            : 'type';
```

6. Next and back. Replace `goBack` and add `goToNextStep`:

```ts
    // The step after this one among the steps shown (details → theme → account → review).
    const goToNextStep = useCallback(() => {
        const next = stepAfter(step, steps);
        if (next) goToStep(next);
    }, [goToStep, step, steps]);
    // The top-left Back: the step before this one among the steps shown, over a finished account step.
    const goBack = useCallback(() => {
        const previous = stepBefore(step, steps, !needsAccount);
        if (previous) navigation.back(previous);
    }, [navigation, needsAccount, step, steps]);
```

7. The redirect effect: wait for auth, and drop an account step that doesn't apply:

```ts
    useEffect(() => {
        if (!appConfig || planTiersQuery.isLoading || isBootstrapping) return;
        if (CREATE_EVENT_STEPS.indexOf(step) > CREATE_EVENT_STEPS.indexOf(reachableStep)) {
            navigation.replace(reachableStep);
        } else if (step === 'theme' && !themeStepAvailable) {
            navigation.replace(stepAfter('theme', CREATE_EVENT_STEPS.filter((entry) => entry !== 'theme' && steps.includes(entry))) ?? 'overview');
        } else if (step === 'account' && !showAccountStep) {
            navigation.replace('overview');
        }
    }, [appConfig, isBootstrapping, navigation, planTiersQuery.isLoading, reachableStep, showAccountStep, step, steps, themeStepAvailable]);
```

   The theme branch keeps today's behaviour when there's no account step (`'overview'`) and goes to `account` when there is one. Simpler and equivalent: `navigation.replace(showAccountStep ? 'account' : 'overview')`. Use that form.

8. `handleSubmit` on details: `if (canSubmitDetails) goToNextStep();` instead of the theme/overview ternary (add `goToNextStep` to its dependency list).
9. Draft save: add `accountStepShown` to the saved object and the dependency list.
10. Return value: add `goToNextStep` next to `goBack`.

Imports: `needsAccountStep` from `@/lib/createEventWizardAccount`; `stepAfter, stepBefore` from `@/lib/createEventSteps`.

In `CreateEventFormValue`, after `goBack`:

```ts
    // On to the next step shown (details → theme → account → review).
    goToNextStep: () => void;
```

`hooks/useEventTheme.ts`, `useThemePresetsForType`:

```ts
// GET /api/theme-presets?eventType= — public. The old flow asks only signed in; the wizard asks
// signed out too, so guests get the theme step.
export function useThemePresetsForType(eventType: string | null, allowSignedOut = false) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: eventThemeKeys.presetsForType(eventType ?? ''),
        queryFn: () => api.get<ThemePresetDto[]>(endpoints.themePresets.byEventType(eventType!)),
        enabled: Boolean(eventType) && (isAuthenticated || allowSignedOut),
    });
}
```

If `api.get` attaches no token for guests already (it reads the session), nothing else changes. Check `lib/api/client.ts` sends the request without `Authorization` when signed out.

- [ ] **Step 3: Run the controller tests and types**

Run: `npx vitest run hooks/useCreateEventFormController && npx tsc --noEmit`
Expected: PASS. Fix any stories or mocks of `CreateEventFormValue` that now miss `goToNextStep` by adding `goToNextStep: () => {}`.

- [ ] **Step 4: Commit**

```bash
git add hooks/useCreateEventFormController.ts hooks/useCreateEventFormController.wizard.test.tsx providers/createEvent/CreateEventFormContext.tsx hooks/useEventTheme.ts
git commit -m "KAN-197: guests and unverified accounts get the account step before review"
```

(Add any mock/story files tsc made you touch, by name.)

---

### Task 6: Share the sign-in and sign-up forms

**Files:** Create `hooks/useLoginForm.ts`, `components/auth/LoginEmailForm.tsx`, `components/auth/RegisterEmailForm.tsx`, `components/event/create/wizard/CreateEventWizardButton.tsx`. Modify `hooks/useRegisterForm.ts`, `app/(main)/login/page.tsx`, `app/(main)/register/page.tsx`, `components/event/create/wizard/CreateEventWizardFooter.tsx`.

This task moves markup; the login and register pages must look and behave exactly as before. `app/(main)/login/page.test.tsx` is the guard.

- [ ] **Step 1: `useLoginForm`**

`hooks/useLoginForm.ts`: move the email/password state, `handleSubmit` and the OAuth wiring out of `LoginPage`:

```ts
'use client';

import type { ChangeEvent, SubmitEvent } from 'react';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAuth } from '@/hooks/useAuth';
import { useOAuthSignIn } from '@/hooks/useOAuthSignIn';
import type { AuthSessionDto, OAuthProviderName } from '@/lib/api/types';

// The sign-in form (email and password, Google, Apple). The page navigates after sign-in; the
// create wizard stays put and moves to its next screen.
export function useLoginForm({
    inviteToken,
    initialEmail,
    onSignedIn,
}: {
    inviteToken: string | null;
    initialEmail: string;
    onSignedIn: (session: AuthSessionDto) => void;
}) {
    const { login } = useAuth();
    const toErrorMessage = useApiErrorMessage();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState(initialEmail);
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleEmailChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value), []);
    const handlePasswordChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value), []);
    const handleTogglePassword = useCallback(() => setShowPassword((shown) => !shown), []);

    const handleSubmit = useCallback(
        async (e: SubmitEvent<HTMLFormElement>) => {
            e.preventDefault();
            setError(null);
            setIsSubmitting(true);
            try {
                onSignedIn(await login({ email, password, inviteToken: inviteToken ?? undefined }));
            } catch (err) {
                setError(toErrorMessage(err));
            } finally {
                setIsSubmitting(false);
            }
        },
        [email, inviteToken, login, onSignedIn, password, toErrorMessage],
    );

    const handleOAuthError = useCallback((err: unknown) => setError(toErrorMessage(err)), [toErrorMessage]);
    const oauthSignIn = useOAuthSignIn({ inviteToken, onSignedInAction: onSignedIn, onErrorAction: handleOAuthError });
    const { handleSignIn } = oauthSignIn;
    const handleOAuthSignIn = useCallback(
        async (provider: OAuthProviderName, idToken: string) => {
            setError(null);
            await handleSignIn(provider, idToken);
        },
        [handleSignIn],
    );

    return {
        email,
        password,
        showPassword,
        isSubmitting,
        error,
        oauthSignIn,
        handleEmailChange,
        handlePasswordChange,
        handleTogglePassword,
        handleSubmit,
        handleOAuthSignIn,
        handleOAuthError,
    };
}
```

- [ ] **Step 2: `LoginEmailForm`**

`components/auth/LoginEmailForm.tsx`: the `<form>` from `LoginPage` (email field, password field, "Forgot password?", error, submit) moved as is, with two props:

```tsx
'use client';

import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { AppLink } from '@/components/ui/AppLink';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useContentLimits } from '@/hooks/useContentLimits';
import type { useLoginForm } from '@/hooks/useLoginForm';
import { routes } from '@/lib/routes';

type Props = {
    form: ReturnType<typeof useLoginForm>;
    // Above the fields (the login page's "password changed" notes).
    status?: ReactNode;
    // The wizard keeps its place: the reset page opens in a new tab.
    forgotPasswordInNewTab?: boolean;
    // The wizard's own button; the page keeps its gradient one.
    submitButton?: ReactNode;
};

export function LoginEmailForm({ form, status, forgotPasswordInNewTab = false, submitButton }: Props) {
    const t = useTranslations('LoginPage');
    const limits = useContentLimits();

    return (
        <form onSubmit={form.handleSubmit} className="flex flex-col gap-4">
            {/* Status */}
            {status}

            {/* Email */}
            {/* …the email FormFieldLabel block from LoginPage, with value={form.email} onChange={form.handleEmailChange}… */}

            {/* Password */}
            {/* …the password block, with form.showPassword / form.password / form.handlePasswordChange / form.handleTogglePassword… */}

            {/* Password recovery */}
            <AppLink
                href={routes.forgotPassword}
                target={forgotPasswordInNewTab ? '_blank' : undefined}
                rel={forgotPasswordInNewTab ? 'noopener' : undefined}
                className="-mt-2 self-end text-xs font-semibold text-ink-muted transition-colors hover:text-ink hover:underline"
            >
                {t('forgotPassword')}
            </AppLink>

            {/* Feedback */}
            {form.error && (
                <p role="alert" className="-mt-1 text-center text-xs text-red-500">
                    {form.error}
                </p>
            )}

            {/* Actions */}
            {submitButton ?? (
                <button
                    type="submit"
                    disabled={form.isSubmitting}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {form.isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            {t('submit')}
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </button>
            )}
        </form>
    );
}
```

Copy the two field blocks verbatim from `app/(main)/login/page.tsx` (Email and Password sections), changing only the bindings named in the comments. Check `AppLink` forwards `target`/`rel`; if not, use a plain `<a>` for the new-tab case only.

- [ ] **Step 3: `LoginPage` uses them**

In `app/(main)/login/page.tsx`: delete the moved state, handlers and form; keep `useAuthPageRedirect`, the invite card, the OAuth divider, `OAuthButtons`, the acceptance modal and the bottom link. Build the form with:

```tsx
    const handleSignedIn = useCallback(
        (session: AuthSessionDto) => navigateAfterSignIn(getPostAuthRedirectPath(session.role, returnPath)),
        [navigateAfterSignIn, returnPath],
    );
    const form = useLoginForm({ inviteToken, initialEmail: searchParams.get('email') ?? '', onSignedIn: handleSignedIn });
```

and render

```tsx
            <LoginEmailForm
                form={form}
                status={
                    <>
                        {passwordChanged && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{t('passwordChanged')}</p>}
                        {accountDeleted && <p className="rounded-2xl bg-surface-muted px-4 py-3 text-sm text-ink">{t('accountDeleted')}</p>}
                    </>
                }
            />
```

The OAuth buttons use `form.handleOAuthSignIn` / `form.handleOAuthError`, the modal `form.oauthSignIn.*`.

- [ ] **Step 4: `useRegisterForm` options and `RegisterEmailForm`**

`useRegisterForm` takes two more options:

```ts
    // The create wizard: stay put after sign-up, and ask for a 6-digit code instead of a link.
    onSignedIn?: (session: AuthSessionDto) => void;
    emailVerification?: 'LINK' | 'CODE';
```

`handleSignedIn` becomes

```ts
    const handleSignedIn = useCallback(
        (session: AuthSessionDto) => {
            if (onSignedIn) onSignedIn(session);
            else navigateAfterSignIn(getPostRegisterRedirectPath(session.role, Boolean(inviteToken), returnPath));
        },
        [inviteToken, navigateAfterSignIn, onSignedIn, returnPath],
    );
```

and the `register({...})` call gains `emailVerification` (undefined keeps today's default).

`components/auth/RegisterEmailForm.tsx`: the register page's `{/* Email form */}` `<form>` (names, email, password, newsletter, acceptance, error, submit) moved verbatim, with props `{ form: ReturnType<typeof useRegisterForm>; submitButton?: ReactNode }`; `submitButton ?? <today's gradient button>` exactly as in Step 2. The register page renders `<RegisterEmailForm form={form} />` in its place.

- [ ] **Step 5: `CreateEventWizardButton`**

`components/event/create/wizard/CreateEventWizardButton.tsx`: the footer's button, as a component both the footer and the account forms use:

```tsx
'use client';

import { Loader2, Lock } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    label: string;
    pending?: boolean;
    lock?: boolean;
};

// The wizard's full-width gradient button with an ink label (6.3:1 and up; white fails).
export function CreateEventWizardButton({ label, pending = false, lock = false, type = 'button', ...rest }: Props) {
    return (
        <button
            type={type}
            {...rest}
            className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-[linear-gradient(120deg,#ff6fa0,#ff7a59_55%,#ffb259)] text-[15px] font-bold text-ink focus-ring transition-[opacity,transform] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:active:scale-100"
        >
            {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : lock && <Lock aria-hidden="true" className="size-4.5" strokeWidth={2.4} />}
            {label}
        </button>
    );
}
```

`CreateEventWizardFooter` renders `<CreateEventWizardButton type={action.submitsForm ? 'submit' : 'button'} form={action.submitsForm} disabled={action.disabled} onClick={action.onClick} label={action.label} pending={action.pending} lock={action.lock} />` in place of its `<button>`.

- [ ] **Step 6: Run the guards**

Run: `npx vitest run app/\(main\)/login app/\(main\)/register components/event/create/wizard hooks/useRegisterForm && npx tsc --noEmit && npx eslint app/\(main\)/login app/\(main\)/register components/auth hooks/useLoginForm.ts hooks/useRegisterForm.ts components/event/create/wizard`
Expected: PASS, clean.

- [ ] **Step 7: Commit**

```bash
git add hooks/useLoginForm.ts hooks/useRegisterForm.ts components/auth/LoginEmailForm.tsx components/auth/RegisterEmailForm.tsx "app/(main)/login/page.tsx" "app/(main)/register/page.tsx" components/event/create/wizard/CreateEventWizardButton.tsx components/event/create/wizard/CreateEventWizardFooter.tsx
git commit -m "KAN-197: share the sign-in and sign-up forms so the wizard can show them"
```

---

### Task 7: The email code logic

**Files:** Create `hooks/useSecondsLeft.ts`, `hooks/useEmailCode.ts`, `hooks/useEmailCode.test.tsx`

- [ ] **Step 1: `useSecondsLeft`**

```ts
'use client';

import { useEffect, useState } from 'react';

import { resendSecondsLeft } from '@/lib/emailCode';

// Seconds until a resend is allowed, ticking once a second while above zero.
export function useSecondsLeft(sentAt: number | null): number {
    const [now, setNow] = useState(() => Date.now());
    const left = resendSecondsLeft(sentAt, now);

    useEffect(() => {
        if (left <= 0) return;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [left]);

    return left;
}
```

- [ ] **Step 2: Failing hook test**

`hooks/useEmailCode.test.tsx`:

```tsx
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useEmailCode } from '@/hooks/useEmailCode';
import { ApiError } from '@/lib/api/client';
import { readCodeSentAt, rememberCodeSentAt } from '@/lib/emailCode';

const api = vi.hoisted(() => ({ post: vi.fn(), put: vi.fn() }));
const refetchMe = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/client', async (original) => ({ ...(await original<typeof import('@/lib/api/client')>()), api }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { userId: 'u1', email: 'anna@example.com' } }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: refetchMe }) }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'generic' }));

beforeEach(() => {
    window.sessionStorage.clear();
    api.post.mockResolvedValue(undefined);
    api.put.mockResolvedValue(undefined);
});
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('useEmailCode', () => {
    it('sends a first code when none went to this account in this tab', async () => {
        renderHook(() => useEmailCode());
        await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/auth/email-code'));
        expect(readCodeSentAt('u1')).not.toBeNull();
    });

    it('does not send another code right after sign-up sent one', () => {
        rememberCodeSentAt('u1', Date.now());
        const { result } = renderHook(() => useEmailCode());
        expect(api.post).not.toHaveBeenCalled();
        expect(result.current.secondsLeft).toBeGreaterThan(55);
    });

    it('verifies the code and refreshes the account', async () => {
        rememberCodeSentAt('u1', Date.now());
        const { result } = renderHook(() => useEmailCode());
        await act(() => result.current.verify('123456'));
        expect(api.post).toHaveBeenCalledWith('/api/auth/email-code/verify', { code: '123456' });
        expect(refetchMe).toHaveBeenCalled();
    });

    it('shows the wrong-code message and clears the boxes', async () => {
        rememberCodeSentAt('u1', Date.now());
        api.post.mockRejectedValueOnce(new ApiError(400, { errorCode: 3127 }));
        const { result } = renderHook(() => useEmailCode());
        act(() => result.current.setCode('123456'));
        await act(() => result.current.verify('123456'));
        expect(result.current.errorKey).toBe('wrong');
        expect(result.current.code).toBe('');
    });

    it('treats an already verified email as done', async () => {
        rememberCodeSentAt('u1', Date.now());
        api.post.mockRejectedValueOnce(new ApiError(409, { errorCode: 5227 }));
        const { result } = renderHook(() => useEmailCode());
        await act(() => result.current.verify('123456'));
        expect(refetchMe).toHaveBeenCalled();
        expect(result.current.errorKey).toBeNull();
    });

    it('starts only the countdown when the first send is rate limited', async () => {
        api.post.mockRejectedValueOnce(new ApiError(429, { errorCode: 1003 }));
        const { result } = renderHook(() => useEmailCode());
        await waitFor(() => expect(result.current.secondsLeft).toBeGreaterThan(0));
        expect(result.current.error).toBeNull();
    });
});
```

Run: `npx vitest run hooks/useEmailCode.test.tsx` → FAIL (module missing).

- [ ] **Step 3: `useEmailCode`**

```ts
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAuth } from '@/hooks/useAuth';
import { meQueryKey } from '@/hooks/useMe';
import { useSecondsLeft } from '@/hooks/useSecondsLeft';
import { api, ApiError } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import { type EmailCodeError, emailCodeError, onlyDigits, readCodeSentAt, rememberCodeSentAt } from '@/lib/emailCode';

// The code screen: the six digits, verify, resend with its countdown, and change email.
export function useEmailCode() {
    const { user } = useAuth();
    const userId = user?.userId ?? null;
    const queryClient = useQueryClient();
    const toErrorMessage = useApiErrorMessage();
    const [code, setCodeValue] = useState('');
    const [sentAt, setSentAt] = useState<number | null>(() => (userId ? readCodeSentAt(userId) : null));
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [resent, setResent] = useState(false);
    const [errorKey, setErrorKey] = useState<EmailCodeError | null>(null);
    const [error, setError] = useState<string | null>(null);
    const secondsLeft = useSecondsLeft(sentAt);

    const markSent = useCallback(() => {
        if (!userId) return;
        const at = Date.now();
        rememberCodeSentAt(userId, at);
        setSentAt(at);
    }, [userId]);

    const refreshAccount = useCallback(() => queryClient.invalidateQueries({ queryKey: meQueryKey }), [queryClient]);

    const failWith = useCallback(
        (err: unknown) => {
            const key = emailCodeError(err);
            setErrorKey(key);
            setError(key ? null : toErrorMessage(err));
        },
        [toErrorMessage],
    );

    // `quiet`: the automatic first send. A 429 then means one was just sent; start the wait only.
    const send = useCallback(
        async (quiet: boolean) => {
            setIsSending(true);
            setErrorKey(null);
            setError(null);
            try {
                await api.post(endpoints.auth.emailCode.send);
                markSent();
                if (!quiet) setResent(true);
            } catch (err) {
                if (quiet && err instanceof ApiError && err.status === 429) markSent();
                else failWith(err);
            } finally {
                setIsSending(false);
            }
        },
        [failWith, markSent],
    );

    // A first code, once, when none went to this account in this tab (sign-up already sent one).
    const firstSendDone = useRef(false);
    useEffect(() => {
        if (!userId || firstSendDone.current) return;
        firstSendDone.current = true;
        if (readCodeSentAt(userId) === null) void send(true);
    }, [send, userId]);

    const verify = useCallback(
        async (value: string) => {
            setIsVerifying(true);
            setErrorKey(null);
            setError(null);
            try {
                await api.post(endpoints.auth.emailCode.verify, { code: value });
                await refreshAccount();
            } catch (err) {
                if (getErrorCode(err) === ERROR_CODES.EMAIL_ALREADY_VERIFIED) {
                    await refreshAccount();
                    return;
                }
                failWith(err);
                setCodeValue('');
            } finally {
                setIsVerifying(false);
            }
        },
        [failWith, refreshAccount],
    );

    const changeEmail = useCallback(
        async (email: string): Promise<boolean> => {
            setIsSending(true);
            setErrorKey(null);
            setError(null);
            try {
                await api.put(endpoints.auth.emailCode.email, { email });
                markSent();
                setResent(false);
                await refreshAccount();
                return true;
            } catch (err) {
                failWith(err);
                return false;
            } finally {
                setIsSending(false);
            }
        },
        [failWith, markSent, refreshAccount],
    );

    const setCode = useCallback((value: string) => {
        setCodeValue(onlyDigits(value));
        setErrorKey(null);
        setError(null);
    }, []);

    return {
        email: user?.email ?? '',
        code,
        setCode,
        verify,
        resend: () => send(false),
        changeEmail,
        secondsLeft,
        resent,
        isVerifying,
        isSending,
        errorKey,
        error,
    };
}
```

Check `api.put` exists in `lib/api/client.ts` (grep `put:`); if the client names it differently, use that name in both the hook and the test mock.

- [ ] **Step 4: Run the test**

Run: `npx vitest run hooks/useEmailCode.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add hooks/useSecondsLeft.ts hooks/useEmailCode.ts hooks/useEmailCode.test.tsx
git commit -m "KAN-197: verify, resend and change email for the 6-digit code"
```

---

### Task 8: What happens after sign-in

**Files:** Create `hooks/useCreateEventWizardAccount.ts`, `hooks/useCreateEventWizardAccount.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateEventWizardAccount } from '@/hooks/useCreateEventWizardAccount';

const auth = vi.hoisted(() => ({ current: { isBootstrapping: false, user: null as null | { emailVerified: boolean | null; role: string } } }));
const router = vi.hoisted(() => ({ replace: vi.fn() }));
const view = vi.hoisted(() => ({ current: { view: 'choose', open: vi.fn(), show: vi.fn(), back: vi.fn() } }));
const form = vi.hoisted(() => ({ current: { step: 'account', goToStep: vi.fn() } }));

vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth.current }));
vi.mock('@/hooks/useCreateEventWizardAccountView', () => ({ useCreateEventWizardAccountView: () => view.current }));
vi.mock('@/providers/createEvent/CreateEventFormContext', () => ({ useCreateEventForm: () => form.current }));

beforeEach(() => {
    auth.current = { isBootstrapping: false, user: null };
    view.current = { view: 'choose', open: vi.fn(), show: vi.fn(), back: vi.fn() };
});
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('useCreateEventWizardAccount', () => {
    it('waits on the choose screen while signed out', () => {
        renderHook(() => useCreateEventWizardAccount());
        expect(form.current.goToStep).not.toHaveBeenCalled();
        expect(view.current.show).not.toHaveBeenCalled();
    });

    it('goes to review once the account is verified', () => {
        auth.current.user = { emailVerified: true, role: 'USER' };
        renderHook(() => useCreateEventWizardAccount());
        expect(form.current.goToStep).toHaveBeenCalledWith('overview');
    });

    it('opens the code screen for an unverified account', () => {
        auth.current.user = { emailVerified: false, role: 'USER' };
        renderHook(() => useCreateEventWizardAccount());
        expect(view.current.show).toHaveBeenCalledWith('code');
    });

    it('leaves the change email screen alone', () => {
        auth.current.user = { emailVerified: false, role: 'USER' };
        view.current.view = 'email';
        renderHook(() => useCreateEventWizardAccount());
        expect(view.current.show).not.toHaveBeenCalled();
    });

    it('sends an admin to the console', () => {
        auth.current.user = { emailVerified: true, role: 'ADMIN' };
        renderHook(() => useCreateEventWizardAccount());
        expect(router.replace).toHaveBeenCalledWith('/admin');
    });
});
```

(Check `routes.admin`'s value; use it in the assertion via `import { routes } from '@/lib/routes'` instead of the literal.)

Run: `npx vitest run hooks/useCreateEventWizardAccount.test.tsx` → FAIL.

- [ ] **Step 2: The hook**

```ts
'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useCreateEventWizardAccountView } from '@/hooks/useCreateEventWizardAccountView';
import { localeCookieChanged } from '@/hooks/useNavigateAfterSignIn';
import { accountDestination } from '@/lib/createEventWizardAccount';
import { routes } from '@/lib/routes';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// The account step's "what next": once someone is signed in, review for a verified account, the code
// for an unverified one, the console for an admin. A sign-in that restored another language reloads
// the page (the draft brings the host back here).
export function useCreateEventWizardAccount() {
    const router = useRouter();
    const { user, isBootstrapping } = useAuth();
    const { step, goToStep } = useCreateEventForm();
    const accountView = useCreateEventWizardAccountView();
    const destination = isBootstrapping ? null : accountDestination(user ? { emailVerified: user.emailVerified, role: user.role } : null);
    const { view, show } = accountView;

    useEffect(() => {
        if (step !== 'account' || !destination) return;
        if (destination === 'admin') router.replace(routes.admin);
        else if (destination === 'review') goToStep('overview');
        else if (view !== 'code' && view !== 'email') show('code');
    }, [destination, goToStep, router, show, step, view]);

    // Passed to the forms: after a sign-in, only the language needs handling here.
    const onSignedIn = useCallback(() => {
        if (localeCookieChanged()) window.location.reload();
    }, []);

    return { ...accountView, onSignedIn };
}
```

Export `localeCookieChanged` from `hooks/useNavigateAfterSignIn.ts` (add `export` to the function; nothing else changes there).

"Review" uses `goToStep('overview')` (a push), so Back from review returns to the account step, which `stepBefore` skips (Task 5). Using `push` keeps the history consistent with the other steps.

- [ ] **Step 3: Run the test**

Run: `npx vitest run hooks/useCreateEventWizardAccount.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 4: Commit**

```bash
git add hooks/useCreateEventWizardAccount.ts hooks/useCreateEventWizardAccount.test.tsx hooks/useNavigateAfterSignIn.ts
git commit -m "KAN-197: after signing in, the wizard moves to the code or to review"
```

---

### Task 9: The account screens

**Files:** Create `components/event/create/wizard/account/{EmailCodeInput,AccountChoose,AccountSignUp,AccountSignIn,AccountCode,AccountChangeEmail,AccountStep}.tsx`, `EmailCodeInput.test.tsx`, `AccountStep.test.tsx`

- [ ] **Step 1: Failing input test**

`components/event/create/wizard/account/EmailCodeInput.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EmailCodeInput } from '@/components/event/create/wizard/account/EmailCodeInput';
import { onlyDigits } from '@/lib/emailCode';

afterEach(cleanup);

function Harness({ onComplete }: { onComplete: (code: string) => void }) {
    const [code, setCode] = useState('');
    return <EmailCodeInput label="6-digit code" value={code} onChange={(v) => setCode(onlyDigits(v))} onComplete={onComplete} />;
}

describe('EmailCodeInput', () => {
    it('is one numeric one-time-code field', () => {
        render(<Harness onComplete={vi.fn()} />);
        const input = screen.getByLabelText('6-digit code');
        expect(input).toHaveAttribute('autocomplete', 'one-time-code');
        expect(input).toHaveAttribute('inputmode', 'numeric');
    });

    it('fills all six boxes from a paste and submits on the sixth digit', () => {
        const onComplete = vi.fn();
        render(<Harness onComplete={onComplete} />);
        fireEvent.change(screen.getByLabelText('6-digit code'), { target: { value: '12 34 56' } });
        expect(screen.getAllByTestId('code-box').map((box) => box.textContent)).toEqual(['1', '2', '3', '4', '5', '6']);
        expect(onComplete).toHaveBeenCalledWith('123456');
    });
});
```

Run: `npx vitest run components/event/create/wizard/account` → FAIL.

- [ ] **Step 2: `EmailCodeInput`**

```tsx
'use client';

import { EMAIL_CODE_LENGTH, onlyDigits } from '@/lib/emailCode';

type Props = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    onComplete: (code: string) => void;
    disabled?: boolean;
    invalid?: boolean;
};

// Six boxes that act as one field: one real input over them, so paste and the phone's code
// suggestion fill all six at once. The sixth digit submits.
export function EmailCodeInput({ label, value, onChange, onComplete, disabled = false, invalid = false }: Props) {
    return (
        <div className="relative">
            {/* Boxes */}
            <div aria-hidden="true" className="grid grid-cols-6 gap-2">
                {Array.from({ length: EMAIL_CODE_LENGTH }, (_, index) => (
                    <span
                        key={index}
                        data-testid="code-box"
                        className={`flex h-14 items-center justify-center rounded-2xl bg-[#fbf1e6] text-[22px] font-bold text-ink ${
                            invalid ? 'ring-2 ring-red-400' : index === value.length ? 'ring-2 ring-[#ff7a59]' : ''
                        }`}
                    >
                        {value[index] ?? ''}
                    </span>
                ))}
            </div>

            {/* Field */}
            <input
                aria-label={label}
                aria-invalid={invalid}
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={EMAIL_CODE_LENGTH + 8}
                autoFocus
                disabled={disabled}
                value={value}
                onChange={(e) => {
                    const next = onlyDigits(e.target.value);
                    onChange(next);
                    if (next.length === EMAIL_CODE_LENGTH) onComplete(next);
                }}
                className="absolute inset-0 h-full w-full cursor-text opacity-0"
            />
        </div>
    );
}
```

(`maxLength` leaves room for a pasted "123 456"; `onlyDigits` trims to six.)

- [ ] **Step 3: The screens**

`AccountChoose.tsx` (spec 5.7: card, heading, line, Google/Apple, email links):

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { OAuthSignupAcceptanceModal } from '@/components/auth/OAuthSignupAcceptanceModal';
import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';
import { DetailsPreview } from '@/components/event/create/wizard/details/DetailsPreview';
import type { useLoginForm } from '@/hooks/useLoginForm';
import type { AccountView } from '@/lib/createEventWizardAccount';

type Props = {
    preview: React.ComponentProps<typeof DetailsPreview>;
    oauth: ReturnType<typeof useLoginForm>;
    onOpen: (view: AccountView) => void;
};

export function AccountChoose({ preview, oauth, onOpen }: Props) {
    const t = useTranslations('CreateEventPage.wizard.account');
    const tRegister = useTranslations('RegisterPage');

    return (
        <div className="flex flex-col gap-5">
            {/* Summary */}
            <DetailsPreview {...preview} />

            {/* Heading */}
            <div className="flex flex-col gap-1.5">
                <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="font-editorial text-[26px] leading-[1.15] tracking-[-0.02em] text-ink">
                    {t('heading')}
                </h1>
                <p className="text-[15px] text-[#6f6257]">{t('line')}</p>
            </div>

            {/* Google and Apple */}
            <OAuthButtons onSignIn={oauth.handleOAuthSignIn} onError={oauth.handleOAuthError} />
            {oauth.error && (
                <p role="alert" className="text-center text-xs text-red-500">
                    {oauth.error}
                </p>
            )}
            {oauth.oauthSignIn.pendingSignup && (
                <OAuthSignupAcceptanceModal
                    versions={oauth.oauthSignIn.pendingSignup.versions}
                    onConfirmAction={oauth.oauthSignIn.handleSignupConfirm}
                    onErrorAction={oauth.oauthSignIn.handleSignupError}
                    onCloseAction={oauth.oauthSignIn.handleSignupCancel}
                />
            )}

            {/* Email */}
            <button type="button" onClick={() => onOpen('signup')} className="text-sm font-semibold text-ink underline-offset-4 hover:underline focus-ring">
                {tRegister('orWithEmail')}
            </button>
            <p className="text-center text-xs text-ink-muted">
                {tRegister('haveAccount')}{' '}
                <button type="button" onClick={() => onOpen('signin')} className="font-semibold text-ink hover:underline focus-ring">
                    {tRegister('signInLink')}
                </button>
            </p>
        </div>
    );
}
```

The Google and Apple buttons here sign in through `useLoginForm`'s OAuth handlers (same `useOAuthSignIn` as both pages, so a new Google account gets today's acceptance modal).

`AccountSignUp.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { RegisterEmailForm } from '@/components/auth/RegisterEmailForm';
import { CreateEventWizardButton } from '@/components/event/create/wizard/CreateEventWizardButton';
import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';
import { useRegisterForm } from '@/hooks/useRegisterForm';
import type { AuthSessionDto } from '@/lib/api/types';
import { rememberCodeSentAt } from '@/lib/emailCode';

export function AccountSignUp({ onSignedIn }: { onSignedIn: () => void }) {
    const t = useTranslations('RegisterPage');
    const form = useRegisterForm({
        inviteToken: null,
        returnPath: null,
        initialFields: { email: '', firstName: '', lastName: '' },
        emailVerification: 'CODE',
        // Sign-up mailed a code: the code screen must not send another one.
        onSignedIn: (session: AuthSessionDto) => {
            rememberCodeSentAt(session.userId, Date.now());
            onSignedIn();
        },
    });

    return (
        <div className="flex flex-col gap-5">
            {/* Heading */}
            <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="font-editorial text-[26px] leading-[1.15] tracking-[-0.02em] text-ink">
                {t('title')}
            </h1>

            {/* Form */}
            <RegisterEmailForm form={form} submitButton={<CreateEventWizardButton type="submit" label={t('submit')} pending={form.isSubmitting} disabled={form.isSubmitting} />} />
        </div>
    );
}
```

Check `AuthSessionDto` has `userId` (grep its interface); use the field it has for the account id, matching what `useAuth().user.userId` reads.

`AccountSignIn.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { LoginEmailForm } from '@/components/auth/LoginEmailForm';
import { CreateEventWizardButton } from '@/components/event/create/wizard/CreateEventWizardButton';
import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';
import { useLoginForm } from '@/hooks/useLoginForm';

export function AccountSignIn({ onSignedIn }: { onSignedIn: () => void }) {
    const t = useTranslations('LoginPage');
    const form = useLoginForm({ inviteToken: null, initialEmail: '', onSignedIn });

    return (
        <div className="flex flex-col gap-5">
            {/* Heading */}
            <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="font-editorial text-[26px] leading-[1.15] tracking-[-0.02em] text-ink">
                {t('title')}
            </h1>

            {/* Form */}
            <LoginEmailForm
                form={form}
                forgotPasswordInNewTab
                submitButton={<CreateEventWizardButton type="submit" label={t('submit')} pending={form.isSubmitting} disabled={form.isSubmitting} />}
            />
        </div>
    );
}
```

`AccountCode.tsx`:

```tsx
'use client';

import { MailCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CreateEventWizardButton } from '@/components/event/create/wizard/CreateEventWizardButton';
import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';
import { EmailCodeInput } from '@/components/event/create/wizard/account/EmailCodeInput';
import type { useEmailCode } from '@/hooks/useEmailCode';
import { EMAIL_CODE_LENGTH, formatCountdown } from '@/lib/emailCode';

type Props = { emailCode: ReturnType<typeof useEmailCode>; onChangeEmail: () => void };

export function AccountCode({ emailCode, onChangeEmail }: Props) {
    const t = useTranslations('CreateEventPage.wizard.code');
    const { code, setCode, verify, resend, secondsLeft, resent, isVerifying, isSending, errorKey, error, email } = emailCode;
    const message = errorKey ? t(`errors.${errorKey}`) : error;

    return (
        <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
                e.preventDefault();
                if (code.length === EMAIL_CODE_LENGTH) void verify(code);
            }}
        >
            {/* Heading */}
            <div className="flex flex-col items-start gap-3">
                <span className="flex size-12 items-center justify-center rounded-full bg-[#fbf1e6] text-ink">
                    <MailCheck aria-hidden="true" className="size-6" />
                </span>
                <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="font-editorial text-[26px] leading-[1.15] tracking-[-0.02em] text-ink">
                    {t('heading')}
                </h1>
                <p className="text-[15px] text-[#6f6257]">{t('line', { email })}</p>
            </div>

            {/* Code */}
            <EmailCodeInput label={t('label')} value={code} onChange={setCode} onComplete={(value) => void verify(value)} disabled={isVerifying} invalid={Boolean(errorKey)} />
            {message && (
                <p role="alert" className="-mt-2 text-sm text-red-600">
                    {message}
                </p>
            )}
            {resent && !message && <p className="-mt-2 text-sm text-[#6f6257]">{t('resent')}</p>}

            {/* Links */}
            <div className="flex items-center justify-between text-sm font-semibold">
                <button type="button" disabled={secondsLeft > 0 || isSending} onClick={() => void resend()} className="text-ink disabled:text-[#9a8c80] focus-ring">
                    {secondsLeft > 0 ? t('resendIn', { time: formatCountdown(secondsLeft) }) : t('resend')}
                </button>
                <button type="button" onClick={onChangeEmail} className="text-ink underline-offset-4 hover:underline focus-ring">
                    {t('changeEmail')}
                </button>
            </div>

            {/* Confirm */}
            <CreateEventWizardButton type="submit" label={t('confirm')} pending={isVerifying} disabled={isVerifying || code.length < EMAIL_CODE_LENGTH} />
        </form>
    );
}
```

The spec's "mail icon with a shield": lucide has no single mail-with-shield icon; `MailCheck` is the closest one-icon match. It's decorative (`aria-hidden`), so no alt text is needed.

`AccountChangeEmail.tsx` (decision 10, pending the user's OK):

```tsx
'use client';

import { Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { CreateEventWizardButton } from '@/components/event/create/wizard/CreateEventWizardButton';
import { CREATE_EVENT_WIZARD_HEADING_ID } from '@/components/event/create/wizard/createEventWizardIds';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useContentLimits } from '@/hooks/useContentLimits';
import type { useEmailCode } from '@/hooks/useEmailCode';

type Props = { emailCode: ReturnType<typeof useEmailCode>; onDone: () => void };

export function AccountChangeEmail({ emailCode, onDone }: Props) {
    const t = useTranslations('CreateEventPage.wizard.code');
    const tRegister = useTranslations('RegisterPage');
    const limits = useContentLimits();
    const [email, setEmail] = useState(emailCode.email);

    return (
        <form
            className="flex flex-col gap-5"
            onSubmit={async (e) => {
                e.preventDefault();
                if (await emailCode.changeEmail(email.trim())) onDone();
            }}
        >
            {/* Heading */}
            <h1 id={CREATE_EVENT_WIZARD_HEADING_ID} className="font-editorial text-[26px] leading-[1.15] tracking-[-0.02em] text-ink">
                {t('changeEmail')}
            </h1>

            {/* Email */}
            <FormFieldLabel label={tRegister('fields.email')} required>
                <div className="flex items-center gap-3 rounded-xl bg-surface-muted/70 px-4 py-3 transition focus-within:ring-2 focus-within:ring-primary/30">
                    <Mail className="h-4 w-4 shrink-0 text-ink-muted" />
                    <input
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={limits.emailMaxLength}
                        placeholder={tRegister('placeholders.email')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                    />
                </div>
            </FormFieldLabel>
            {emailCode.error && (
                <p role="alert" className="-mt-2 text-sm text-red-600">
                    {emailCode.error}
                </p>
            )}

            {/* Confirm */}
            <CreateEventWizardButton type="submit" label={t('confirm')} pending={emailCode.isSending} disabled={emailCode.isSending} />
        </form>
    );
}
```

`AccountStep.tsx`: picks the screen. The code and change-email screens share one `useEmailCode`, so the countdown survives switching between them:

```tsx
'use client';

import { AccountChangeEmail } from '@/components/event/create/wizard/account/AccountChangeEmail';
import { AccountChoose } from '@/components/event/create/wizard/account/AccountChoose';
import { AccountCode } from '@/components/event/create/wizard/account/AccountCode';
import { AccountSignIn } from '@/components/event/create/wizard/account/AccountSignIn';
import { AccountSignUp } from '@/components/event/create/wizard/account/AccountSignUp';
import { useAuth } from '@/hooks/useAuth';
import { useCreateEventWizardAccount } from '@/hooks/useCreateEventWizardAccount';
import { useCreateEventWizardAccountPreview } from '@/hooks/useCreateEventWizardAccountPreview';
import { useLoginForm } from '@/hooks/useLoginForm';

export function AccountStep() {
    const { view, open, show, onSignedIn } = useCreateEventWizardAccount();
    const { user } = useAuth();
    const preview = useCreateEventWizardAccountPreview();
    const oauth = useLoginForm({ inviteToken: null, initialEmail: '', onSignedIn });

    // Signed in but unverified: only the code screens apply.
    if (user && (view === 'code' || view === 'email')) return <AccountCodeScreens view={view} show={show} />;
    if (view === 'signup') return <AccountSignUp onSignedIn={onSignedIn} />;
    if (view === 'signin') return <AccountSignIn onSignedIn={onSignedIn} />;
    return <AccountChoose preview={preview} oauth={oauth} onOpen={open} />;
}
```

with `AccountCodeScreens` in the same file:

```tsx
function AccountCodeScreens({ view, show }: { view: 'code' | 'email'; show: (view: AccountView) => void }) {
    const emailCode = useEmailCode();
    return view === 'email' ? (
        <AccountChangeEmail emailCode={emailCode} onDone={() => show('code')} />
    ) : (
        <AccountCode emailCode={emailCode} onChangeEmail={() => show('email')} />
    );
}
```

(imports: `useEmailCode`, `type AccountView`). "Change email" uses `show` (replace), so Back from it doesn't bounce through the code screen; the wizard Back from the code screen returns to the step before (Task 10).

`hooks/useCreateEventWizardAccountPreview.ts`: the summary card's values:

```ts
'use client';

import { useLocale } from 'next-intl';

import { useLocalizedAppEventTypeCopy } from '@/hooks/useLocalizedAppEventTypeCopy';
import { createEventTypePhoto } from '@/lib/createEventCatalog';
import { joinLine, previewWhen } from '@/lib/createEventWizardReview';
import { useCreateEventForm } from '@/providers/createEvent/CreateEventFormContext';

// The account step's card: photo, title, then date · plan.
export function useCreateEventWizardAccountPreview() {
    const locale = useLocale();
    const form = useCreateEventForm();
    const typeCopy = useLocalizedAppEventTypeCopy();
    const type = form.eventTypes.find((entry) => entry.eventTypeKey === form.selectedEventType);

    return {
        photoSrc: createEventTypePhoto(form.selectedEventType, type?.imageUrl ?? null),
        alt: typeCopy(form.selectedEventType).name,
        title: form.trimmedTitle,
        titleIsPlaceholder: false,
        line: joinLine([previewWhen(locale, form.startAt), form.selectedPlan?.name ?? null]),
    };
}
```

Check `DetailsPreview`'s props match these names (`photoSrc, alt, title, titleIsPlaceholder, line`, from part 3); it hides the "Preview" label only if a prop says so: if it always shows "Preview" (`wizard.details.preview`), add an optional `showLabel = true` prop to `DetailsPreview` and pass `showLabel={false}` here, since this card is a summary, not a preview.

- [ ] **Step 4: AccountStep test**

`components/event/create/wizard/account/AccountStep.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AccountStep } from '@/components/event/create/wizard/account/AccountStep';

const state = vi.hoisted(() => ({ view: 'choose', user: null as null | { userId: string } }));

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}`, useLocale: () => 'en' }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('@/hooks/useCreateEventWizardAccount', () => ({
    useCreateEventWizardAccount: () => ({ view: state.view, open: vi.fn(), show: vi.fn(), onSignedIn: vi.fn() }),
}));
vi.mock('@/hooks/useCreateEventWizardAccountPreview', () => ({
    useCreateEventWizardAccountPreview: () => ({ photoSrc: '/p.jpg', alt: 'Wedding', title: 'Anna & Kostas', titleIsPlaceholder: false, line: '12 Sep 2026 · STORY' }),
}));
vi.mock('@/hooks/useLoginForm', () => ({
    useLoginForm: () => ({ error: null, oauthSignIn: { pendingSignup: null }, handleOAuthSignIn: vi.fn(), handleOAuthError: vi.fn() }),
}));
vi.mock('@/hooks/useEmailCode', () => ({
    useEmailCode: () => ({ email: 'anna@example.com', code: '', setCode: vi.fn(), verify: vi.fn(), resend: vi.fn(), changeEmail: vi.fn(), secondsLeft: 42, resent: false, isVerifying: false, isSending: false, errorKey: null, error: null }),
}));
vi.mock('@/components/auth/OAuthButtons', () => ({ OAuthButtons: () => <div data-testid="oauth" /> }));
vi.mock('@/components/auth/RegisterEmailForm', () => ({ RegisterEmailForm: () => <form data-testid="register" /> }));
vi.mock('@/components/auth/LoginEmailForm', () => ({ LoginEmailForm: () => <form data-testid="login" /> }));
vi.mock('@/hooks/useRegisterForm', () => ({ useRegisterForm: () => ({ isSubmitting: false }) }));
vi.mock('@/components/common/ProtectedImage', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    ProtectedImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

afterEach(cleanup);

describe('AccountStep', () => {
    it('offers Google first, then email sign-up and sign-in', () => {
        state.view = 'choose';
        state.user = null;
        render(<AccountStep />);
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('CreateEventPage.wizard.account.heading');
        expect(screen.getByTestId('oauth')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'RegisterPage.orWithEmail' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'RegisterPage.signInLink' })).toBeInTheDocument();
        expect(screen.getByAltText('Wedding')).toBeInTheDocument();
    });

    it('shows the sign-up form', () => {
        state.view = 'signup';
        render(<AccountStep />);
        expect(screen.getByTestId('register')).toBeInTheDocument();
    });

    it('shows the code screen with the email and the countdown', () => {
        state.view = 'code';
        state.user = { userId: 'u1' };
        render(<AccountStep />);
        expect(screen.getByText('CreateEventPage.wizard.code.line')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'CreateEventPage.wizard.code.resendIn' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'CreateEventPage.wizard.code.confirm' })).toBeDisabled();
    });
});
```

(The mock `t` ignores values, so `line` and `resendIn` render as their keys.)

- [ ] **Step 5: Run the tests**

Run: `npx vitest run components/event/create/wizard/account i18n/createWizardMessages.test.ts`
Expected: PASS. If `createWizardMessages.test.ts` names a namespace a new component reads that Task 1 missed, add it to `CREATE_WIZARD_NAMESPACES`.

- [ ] **Step 6: Commit**

```bash
git add components/event/create/wizard/account hooks/useCreateEventWizardAccountPreview.ts components/event/create/wizard/details/DetailsPreview.tsx i18n/createWizardMessages.ts
git commit -m "KAN-197: the account step's screens: choose, sign up, sign in, code, change email"
```

---

### Task 10: Put the account step in the wizard

**Files:** `components/event/create/wizard/CreateEventWizard.tsx`, `CreateEventWizardBackButton.tsx`, `CreateEventWizardFooter.tsx`, `hooks/useCreateEventWizardFooter.ts` (+ `CreateEventWizardFooter.test.tsx`)

- [ ] **Step 1: Failing footer test**

In `components/event/create/wizard/CreateEventWizardFooter.test.tsx`, add (following the file's existing `setup` pattern for the form mock; add `goToNextStep: vi.fn()` to its base form):

```tsx
    it('continues from the theme step to the next step shown', () => {
        const form = setup({ step: 'theme' });
        fireEvent.click(screen.getByRole('button'));
        expect(form.goToNextStep).toHaveBeenCalled();
    });

    it('has no footer button on the account step', () => {
        setup({ step: 'account' });
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
```

Run: `npx vitest run components/event/create/wizard/CreateEventWizardFooter.test.tsx` → FAIL.

- [ ] **Step 2: Footer**

`useCreateEventWizardFooter` returns `WizardFooterAction | null`:

```ts
    if (form.step === 'theme') {
        return { ...base, label: t('plan.continue'), disabled: false, onClick: form.goToNextStep };
    }
    // The account screens carry their own buttons (Google, the forms, Confirm).
    if (form.step === 'account') return null;
```

(Update the function's return type to `WizardFooterAction | null`.) `CreateEventWizardFooter` starts with `if (!action) return null;`.

- [ ] **Step 3: Wizard body and Back**

`CreateEventWizard.tsx`: render the account step outside the step `<form>` (its screens have their own forms; forms can't nest):

```tsx
                {step === 'plan' && (
                    <div className="px-5 pb-6">
                        <PlanStep />
                    </div>
                )}
                {step === 'account' && (
                    <div className="px-5 pb-6">
                        <AccountStep />
                    </div>
                )}
                {!isType && step !== 'plan' && step !== 'account' && (
```

`CreateEventWizardBackButton.tsx`: on an account sub-screen of a signed-out start, Back returns to the choose screen; otherwise the step before:

```tsx
export function CreateEventWizardBackButton() {
    const t = useTranslations('CreateEventPage.actions');
    const { goBack, step } = useCreateEventForm();
    const { isAuthenticated } = useAuth();
    const accountView = useCreateEventWizardAccountView();
    const backToChoose = step === 'account' && !isAuthenticated && (accountView.view === 'signup' || accountView.view === 'signin');

    return (
        <button
            type="button"
            aria-label={t('back')}
            onClick={backToChoose ? accountView.back : goBack}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#fbf1e6] text-ink focus-ring"
        >
            <ArrowLeft className="size-4.5" aria-hidden="true" />
        </button>
    );
}
```

Update the comment above it: "Top-left from the plan step on: back one step, or from sign-up or sign-in back to the account choices."

- [ ] **Step 4: Run the wizard tests and types**

Run: `npx vitest run components/event/create hooks/useCreateEvent && npx tsc --noEmit && npx eslint components/event/create hooks`
Expected: PASS, clean.

- [ ] **Step 5: Commit**

```bash
git add components/event/create/wizard/CreateEventWizard.tsx components/event/create/wizard/CreateEventWizardBackButton.tsx components/event/create/wizard/CreateEventWizardFooter.tsx components/event/create/wizard/CreateEventWizardFooter.test.tsx hooks/useCreateEventWizardFooter.ts
git commit -m "KAN-197: the wizard shows the account step before review"
```

---

### Task 11: Stories

**Files:** `components/event/create/wizard/CreateEventWizard.stories.tsx`

- [ ] **Step 1: Add stories**

Follow the part 3 pattern (`DetailsStep` story: seed the draft with `writeCreateEventWizardDraft` in `beforeEach`, return `clearCreateEventWizardDraft`). Add:

- `AccountStep`: signed out (`user: null`, the meta default), draft at `step: 'account'` with a title, date (`'2026-09-12T18:00'`), place and address, URL `?create=1&run=r1&step=account`.
- `AccountSignUp`: same, URL with `&account=signup`.
- `AccountCode`: `app: { user: { ...storyUser, emailVerified: false }, appConfig: storyWizardAppConfig }`, URL with `&account=code`, an MSW handler `http.post('*/api/auth/email-code', () => new HttpResponse(null, { status: 204 }))`, and `beforeEach` that also calls `rememberCodeSentAt(storyUser.userId, Date.now())` so the countdown shows.
- `AccountCodeWrong`: as `AccountCode`, plus `http.post('*/api/auth/email-code/verify', () => HttpResponse.json({ errorCode: 3127, status: 400 }, { status: 400 }))` and a `play` that types `123456` into the "6-digit code" field.

The countdown ticks; tag `AccountCode` and `AccountCodeWrong` `visual-skip` if the captured text varies between runs (docs/storybook.md).

- [ ] **Step 2: Build and look**

Run: `npx storybook build --test -o /tmp/sb-wizard` (or the repo's story test command from docs/storybook.md) and open the four stories at 375 and 1280 widths.
Expected: card, heading, line, Google button placeholder, email links; the sign-up form with the wizard button; the code boxes with "Resend code in 0:5x" and "Change email".

- [ ] **Step 3: Commit**

```bash
git add components/event/create/wizard/CreateEventWizard.stories.tsx
git commit -m "KAN-197: stories for the wizard's account and code screens"
```

---

### Task 12: Full checks and a look in the app

- [ ] **Step 1: Every check**

Run, in order: `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`, `npx next build`.
Expected: all clean. Revert `AGENTS.md` if the build touched it.

- [ ] **Step 2: In the app, signed out (staging data)**

Run the worktree's dev server on :3000 against the local backend (memory "Local backend CORS is :3000 only"), open `/?create=1`, and walk: type → plan → details → (theme) → account.
Check, at 375 and 1280:
- the step counter counts the account step (wedding signed out: 5 steps);
- "Or sign up with email" → sign-up form → create an account with a test address → the code screen opens with that address and a countdown;
- the code from the local mail log (or the backend's dev mail sink) verifies → review → Pay is enabled once the boxes are ticked;
- Back from review goes to the step before the account step;
- a wrong code shows "That code isn't right. Try again." and clears the boxes;
- "Change email" → new address → back on the code screen with the new address.

- [ ] **Step 3: Signed in, unverified**

Sign in as an unverified test account (memory "Shared test account revokes mid-run" lists them), open `/?create=1`, fill the steps: the account step opens straight on the code screen and one code is sent.

- [ ] **Step 4: Old flow untouched**

With the flag off locally (`showsCreateWizard` false), `/events/new` signed in walks type → plan → details → overview as before.

---

## Self-review notes

- Spec 3.1 (count, sticky): Tasks 3–5. 3.2 (who): Tasks 3, 5, 8. 4.3 (`accountStepShown` saved): Task 4. 4.4 (presets public): Task 5. 5.7: Tasks 8–9. 5.8: Tasks 6, 9 (forgot password new tab). 5.9: Tasks 2, 7, 9.
- Not covered on purpose: the email verification page reopening the wizard (`?create=1` on home after a link): this part verifies by code, and link sign-ups don't come from the wizard. Left for the cleanup PR with `pendingCreateEvent.ts`.
