# Admin Emails — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "Send email" drawer in the admin Accounts panel (template, language, live preview of the real email, send), and an "Email the host" option with a preview when provisioning an event.

**Architecture:** The backend renders every preview (`{to, subject, html, text}`), and the frontend shows the HTML in a sandboxed `iframe`. Form state lives in `useAccountEmailForm`, server calls in `useAdminEmails`, and request building and validation in `lib/adminEmails.ts`. Components are render shells.

**Tech Stack:** Next.js App Router, React, TanStack Query, next-intl, Tailwind, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-12-admin-emails-design.md`. **Depends on:** the backend plan `docs/superpowers/plans/2026-10-12-admin-emails-backend.md` (endpoints and error codes 3103, 3104, 5175).

**Branch:** `feat/admin-emails` (already created from `staging`; the spec commit is on it).

**Spec adjustments made while planning** (update the spec in Task 1):
- The project has no toast component. After a send, the drawer shows a short "Email sent" state with a Done button instead.
- The "Email the host" checkbox sits on the review step, directly above the preview it controls, not on the first form step.
- `welcome-preview` takes a small body (`hostUserId`, title, start, timezone, location, locale), not the full provisioning body.
- The provision form for demo events never offers the email (the host is the admin's own demo account).

Commands: `npx vitest run <path>`, `npm run type:check`, `npm run lint`.

## File map

| File | Responsibility |
|---|---|
| `lib/api/types.ts` | DTO types |
| `lib/api/endpoints.ts` | `admin.users.emails.*`, `admin.events.welcomePreview` |
| `lib/api/errors.ts`, `lib/api/errorMessageKeys.ts` | codes 3103, 3104, 5175 |
| `lib/adminEmails.ts` (+ test) | template order, token templates, request building, readiness |
| `hooks/useDebouncedValue.ts` | debounce a value |
| `hooks/useAdminEmails.ts` | templates query, preview queries, send mutation |
| `hooks/useAccountEmailForm.ts` (+ test) | drawer state and actions |
| `hooks/useEmailPreviewWidth.ts` | desktop/phone toggle |
| `components/admin/emails/EmailPreviewFrame.tsx` | inbox header + iframe |
| `components/admin/emails/AccountEmailTemplatePicker.tsx` | template segmented control |
| `components/admin/emails/AccountEmailFields.tsx` | event, message, language |
| `components/admin/emails/AccountEmailSent.tsx` | sent state |
| `components/admin/emails/AccountEmailDrawer.tsx` | the drawer |
| `components/admin/AccountDetailDrawer.tsx`, `hooks/useAccountsPanel.ts`, `components/admin/AccountsPanel.tsx` | open the drawer |
| `hooks/useProvisionEventForm.ts` (+ test), `components/admin/ProvisionEventReview.tsx`, `components/admin/ProvisionEventSuccess.tsx`, `hooks/useDemoEventDetail.ts` | notify host + preview |
| `messages/en.json`, `messages/el.json` | copy |

---

### Task 1: Spec touch-up

- [ ] **Step 1:** In `docs/superpowers/specs/2026-10-12-admin-emails-design.md`, make these edits:
  - Replace "On success the drawer shows a toast and closes" with "On success the drawer shows an 'Email sent' state with a Done button".
  - Under "Provision event form", say the checkbox sits on the review step above the preview, and that demo-event provisioning does not offer it.
  - Replace the `welcome-preview` body description with `{hostUserId, title, startAt?, timezone?, locationName?, locationAddress?, locale?}`.
- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-10-12-admin-emails-design.md
git commit -m "docs(spec): admin emails adjustments from planning"
```

---

### Task 2: API types, endpoints, error codes

**Files:** `lib/api/types.ts`, `lib/api/endpoints.ts`, `lib/api/errors.ts`, `lib/api/errorMessageKeys.ts`, `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Types** (append to `lib/api/types.ts`, and change `AdminProvisionEventRequestDto` at line ~816)

```ts
export type AdminEmailTemplateKey = 'PASSWORD_RESET' | 'PROVISIONED_HOST_WELCOME' | 'EMAIL_VERIFICATION' | 'CUSTOM';

export type AdminEmailUnavailableReason =
    | 'ACCOUNT_DELETED'
    | 'NO_EMAIL'
    | 'NOT_ACTIVE'
    | 'NOT_PASSWORD_ACCOUNT'
    | 'ALREADY_VERIFIED'
    | 'NO_HOSTED_EVENTS';

export interface AdminEmailTemplateDto {
    key: AdminEmailTemplateKey;
    available: boolean;
    unavailableReason: AdminEmailUnavailableReason | null;
}

export interface AdminEmailRequestDto {
    template: AdminEmailTemplateKey;
    locale: Locale;
    eventId?: string;
    subject?: string;
    body?: string;
}

// The email as it will be delivered; token links hold a placeholder.
export interface AdminEmailPreviewDto {
    to: string;
    subject: string;
    html: string;
    text: string;
}

export interface AdminWelcomePreviewRequestDto {
    hostUserId: string;
    title: string;
    startAt?: string;
    timezone?: string;
    locationName?: string;
    locationAddress?: string;
    locale?: Locale;
}
```

```ts
export interface AdminProvisionEventRequestDto {
    hostUserId: string;
    event: EventRequestDto;
    // Emails the host a welcome; the server treats a missing value as true.
    notifyHost?: boolean;
}
```

(`Locale` is the type already used by `UserResponseDto.locale` in this file.)

- [ ] **Step 2: Endpoints.** In `lib/api/endpoints.ts`, extend `admin.users` (line ~448) and `admin.events`:

```ts
        users: {
            planTier: (userId: string) => `/api/admin/users/${userId}/plan-tier`,
            emails: {
                templates: (userId: string) => `/api/admin/users/${userId}/emails/templates`,
                preview: (userId: string) => `/api/admin/users/${userId}/emails/preview`,
                send: (userId: string) => `/api/admin/users/${userId}/emails/send`,
            },
        },
        events: {
            provision: '/api/admin/events',
            welcomePreview: '/api/admin/events/welcome-preview',
            // ...existing entries unchanged
```

- [ ] **Step 3: Error codes.** In `lib/api/errors.ts` `ERROR_CODES`, add near the other 3xxx and 5xxx entries:

```ts
    EMAIL_EVENT_NOT_HOSTED: 3103,
    EMAIL_MESSAGE_REQUIRED: 3104,
    EMAIL_TEMPLATE_UNAVAILABLE: 5175,
```

In `lib/api/errorMessageKeys.ts`, add `'emailEventNotHosted' | 'emailMessageRequired' | 'emailTemplateUnavailable'` to the `ApiErrorMessageKey` union (alphabetical position), and to `API_ERROR_MESSAGE_KEYS`:

```ts
    [ERROR_CODES.EMAIL_EVENT_NOT_HOSTED]: 'emailEventNotHosted',
    [ERROR_CODES.EMAIL_MESSAGE_REQUIRED]: 'emailMessageRequired',
    [ERROR_CODES.EMAIL_TEMPLATE_UNAVAILABLE]: 'emailTemplateUnavailable',
```

In `messages/en.json` → `ApiErrors` (line ~5152), keeping alphabetical order:

```json
        "emailEventNotHosted": "This account doesn't host that event.",
        "emailMessageRequired": "Add a subject and a message.",
        "emailTemplateUnavailable": "This email can't be sent to this account.",
```

In `messages/el.json` → `ApiErrors` (line ~5172):

```json
        "emailEventNotHosted": "Αυτός ο λογαριασμός δεν διοργανώνει αυτή την εκδήλωση.",
        "emailMessageRequired": "Προσθέστε θέμα και μήνυμα.",
        "emailTemplateUnavailable": "Αυτό το email δεν μπορεί να σταλεί σε αυτόν τον λογαριασμό.",
```

- [ ] **Step 4: Check**

Run: `npm run type:check`
Expected: no errors. (If a test asserts every `ERROR_CODES` entry has a message key, it now passes because the keys were added.)

- [ ] **Step 5: Commit**

```bash
git add lib/api messages
git commit -m "feat(admin-emails): API types, endpoints and error copy"
```

---

### Task 3: `lib/adminEmails.ts`

**Files:** Create `lib/adminEmails.ts` and `lib/adminEmails.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { ADMIN_EMAIL_TEMPLATE_ORDER, adminEmailRequest, hasTokenLink } from '@/lib/adminEmails';

const BASE = { locale: 'en' as const, eventId: '', subject: '', body: '' };

describe('adminEmailRequest', () => {
    it('sends only the fields the template uses', () => {
        expect(adminEmailRequest({ ...BASE, template: 'PASSWORD_RESET', eventId: 'e1', subject: 's', body: 'b' })).toEqual({
            template: 'PASSWORD_RESET',
            locale: 'en',
        });
        expect(adminEmailRequest({ ...BASE, template: 'PROVISIONED_HOST_WELCOME', eventId: 'e1' })).toEqual({
            template: 'PROVISIONED_HOST_WELCOME',
            locale: 'en',
            eventId: 'e1',
        });
        expect(adminEmailRequest({ ...BASE, template: 'CUSTOM', subject: ' Hi ', body: ' There ' })).toEqual({
            template: 'CUSTOM',
            locale: 'en',
            subject: 'Hi',
            body: 'There',
        });
    });

    it('is null until the template has what it needs', () => {
        expect(adminEmailRequest({ ...BASE, template: null })).toBeNull();
        expect(adminEmailRequest({ ...BASE, template: 'PROVISIONED_HOST_WELCOME' })).toBeNull();
        expect(adminEmailRequest({ ...BASE, template: 'CUSTOM', subject: 'Hi', body: '  ' })).toBeNull();
    });
});

describe('hasTokenLink', () => {
    it('is true only for templates that carry a single-use link', () => {
        expect(ADMIN_EMAIL_TEMPLATE_ORDER.filter(hasTokenLink)).toEqual(['PASSWORD_RESET', 'EMAIL_VERIFICATION']);
    });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run lib/adminEmails.test.ts`
Expected: FAIL, cannot resolve `@/lib/adminEmails`.

- [ ] **Step 3: Implement**

```ts
import type { Locale } from '@/i18n/config';
import type { AdminEmailRequestDto, AdminEmailTemplateKey } from '@/lib/api/types';

export const ADMIN_EMAIL_TEMPLATE_ORDER: readonly AdminEmailTemplateKey[] = [
    'PROVISIONED_HOST_WELCOME',
    'PASSWORD_RESET',
    'EMAIL_VERIFICATION',
    'CUSTOM',
];

export const CUSTOM_SUBJECT_MAX_LENGTH = 150;
export const CUSTOM_BODY_MAX_LENGTH = 5000;

export type AdminEmailDraft = {
    template: AdminEmailTemplateKey | null;
    locale: Locale;
    eventId: string;
    subject: string;
    body: string;
};

// The preview shows a placeholder for these links; the real one is made on send.
export function hasTokenLink(template: AdminEmailTemplateKey): boolean {
    return template === 'PASSWORD_RESET' || template === 'EMAIL_VERIFICATION';
}

// The request body for preview and send, or null while the draft is incomplete.
export function adminEmailRequest(draft: AdminEmailDraft): AdminEmailRequestDto | null {
    if (!draft.template) return null;
    const base = { template: draft.template, locale: draft.locale };
    if (draft.template === 'PROVISIONED_HOST_WELCOME') return draft.eventId ? { ...base, eventId: draft.eventId } : null;
    if (draft.template === 'CUSTOM') {
        const subject = draft.subject.trim();
        const body = draft.body.trim();
        return subject && body ? { ...base, subject, body } : null;
    }
    return base;
}
```

If `Locale` in `lib/api/types.ts` is not the `i18n/config` type, import it from `@/lib/api/types` instead, so both files use the same type.

- [ ] **Step 4: Run, expect pass**

Run: `npx vitest run lib/adminEmails.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/adminEmails.ts lib/adminEmails.test.ts
git commit -m "feat(admin-emails): request building"
```

---

### Task 4: Data hooks

**Files:** Create `hooks/useDebouncedValue.ts`, `hooks/useAdminEmails.ts`

- [ ] **Step 1: `useDebouncedValue`**

```ts
'use client';

import { useEffect, useState } from 'react';

// The value as it was `delay` ms after it last changed.
export function useDebouncedValue<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}
```

- [ ] **Step 2: `useAdminEmails`**

```ts
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminEmailPreviewDto, AdminEmailRequestDto, AdminEmailTemplateDto, AdminWelcomePreviewRequestDto } from '@/lib/api/types';

export const adminEmailKeys = {
    templates: (userId: string) => ['admin', 'emails', 'templates', userId] as const,
    preview: (userId: string, request: AdminEmailRequestDto | null) => ['admin', 'emails', 'preview', userId, request] as const,
    welcomePreview: (request: AdminWelcomePreviewRequestDto | null) => ['admin', 'emails', 'welcome-preview', request] as const,
};

export function useAdminEmailTemplates(userId: string) {
    return useQuery({
        queryKey: adminEmailKeys.templates(userId),
        queryFn: () => api.get<AdminEmailTemplateDto[]>(endpoints.admin.users.emails.templates(userId)),
    });
}

// A render, not a write: POST only because the body is too rich for a query string.
export function useAdminEmailPreview(userId: string, request: AdminEmailRequestDto | null) {
    return useQuery({
        queryKey: adminEmailKeys.preview(userId, request),
        queryFn: () => api.post<AdminEmailPreviewDto>(endpoints.admin.users.emails.preview(userId), request),
        enabled: request !== null,
        placeholderData: keepPreviousData,
        retry: false,
    });
}

export function useWelcomeEmailPreview(request: AdminWelcomePreviewRequestDto | null) {
    return useQuery({
        queryKey: adminEmailKeys.welcomePreview(request),
        queryFn: () => api.post<AdminEmailPreviewDto>(endpoints.admin.events.welcomePreview, request),
        enabled: request !== null,
        placeholderData: keepPreviousData,
        retry: false,
    });
}

// A 409 carries no reason: re-read the templates so the picker shows why it's unavailable now.
export function useSendAdminEmailMutation(userId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (request: AdminEmailRequestDto) => api.post<void>(endpoints.admin.users.emails.send(userId), request),
        onError: () => queryClient.invalidateQueries({ queryKey: adminEmailKeys.templates(userId) }),
    });
}
```

Check `api.post` handles a `204` with no body (`grep -n "204" lib/api/client.ts`). Another admin mutation that returns `void` is the pattern to copy if it needs special handling.

- [ ] **Step 3: Check and commit**

Run: `npm run type:check`
Expected: no errors.

```bash
git add hooks/useDebouncedValue.ts hooks/useAdminEmails.ts
git commit -m "feat(admin-emails): data hooks"
```

---

### Task 5: `useAccountEmailForm`

**Files:** Create `hooks/useAccountEmailForm.ts` and `hooks/useAccountEmailForm.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAccountEmailForm } from '@/hooks/useAccountEmailForm';
import type { AdminEmailRequestDto, UserResponseDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({ sent: [] as AdminEmailRequestDto[], previewRequests: [] as (AdminEmailRequestDto | null)[] }));

vi.mock('@/hooks/useDebouncedValue', () => ({ useDebouncedValue: <T,>(value: T) => value }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useAdminEvents', () => ({
    useAdminEvents: () => ({ data: { content: [{ id: 'event-1', title: 'Party', startAt: '2027-06-01T15:00:00Z' }] }, isLoading: false }),
}));
vi.mock('@/hooks/useAdminEmails', () => ({
    useAdminEmailTemplates: () => ({
        data: [
            { key: 'PASSWORD_RESET', available: true, unavailableReason: null },
            { key: 'PROVISIONED_HOST_WELCOME', available: true, unavailableReason: null },
            { key: 'EMAIL_VERIFICATION', available: false, unavailableReason: 'ALREADY_VERIFIED' },
            { key: 'CUSTOM', available: true, unavailableReason: null },
        ],
        isLoading: false,
    }),
    useAdminEmailPreview: (_userId: string, request: AdminEmailRequestDto | null) => {
        mocks.previewRequests.push(request);
        return { data: undefined, isFetching: false, error: null };
    },
    useSendAdminEmailMutation: () => ({
        mutateAsync: async (request: AdminEmailRequestDto) => {
            mocks.sent.push(request);
        },
        isPending: false,
        error: null,
        reset: () => undefined,
    }),
}));

const ACCOUNT = { id: 'user-1', email: 'host@example.com', locale: 'el' } as UserResponseDto;

describe('useAccountEmailForm', () => {
    beforeEach(() => {
        mocks.sent.length = 0;
        mocks.previewRequests.length = 0;
    });

    it('starts on the first available template in the account language', () => {
        const { result } = renderHook(() => useAccountEmailForm(ACCOUNT));
        expect(result.current.template).toBe('PROVISIONED_HOST_WELCOME');
        expect(result.current.locale).toBe('el');
        // The first hosted event is preselected, so the welcome preview loads at once.
        expect(result.current.request).toEqual({ template: 'PROVISIONED_HOST_WELCOME', locale: 'el', eventId: 'event-1' });
    });

    it('ignores an unavailable template', () => {
        const { result } = renderHook(() => useAccountEmailForm(ACCOUNT));
        act(() => result.current.changeTemplate('EMAIL_VERIFICATION'));
        expect(result.current.template).toBe('PROVISIONED_HOST_WELCOME');
    });

    it('builds a custom request from the typed text', () => {
        const { result } = renderHook(() => useAccountEmailForm(ACCOUNT));
        act(() => result.current.changeTemplate('CUSTOM'));
        expect(result.current.request).toBeNull();
        act(() => result.current.setSubject('Hello'));
        act(() => result.current.setBody('Text'));
        expect(result.current.request).toEqual({ template: 'CUSTOM', locale: 'el', subject: 'Hello', body: 'Text' });
    });

    it('sends the current request after confirmation and shows the sent state', async () => {
        const { result } = renderHook(() => useAccountEmailForm(ACCOUNT));
        act(() => result.current.changeTemplate('PASSWORD_RESET'));
        act(() => result.current.requestSend());
        expect(result.current.confirmOpen).toBe(true);
        await act(() => result.current.confirmSend());
        expect(mocks.sent).toEqual([{ template: 'PASSWORD_RESET', locale: 'el' }]);
        expect(result.current.sent).toBe(true);
    });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run hooks/useAccountEmailForm.test.tsx`
Expected: FAIL, cannot resolve `@/hooks/useAccountEmailForm`.

- [ ] **Step 3: Implement**

```ts
'use client';

import { useState } from 'react';

import { useAdminEmailPreview, useAdminEmailTemplates, useSendAdminEmailMutation } from '@/hooks/useAdminEmails';
import { useAdminEvents } from '@/hooks/useAdminEvents';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { Locale } from '@/i18n/config';
import { ADMIN_EMAIL_TEMPLATE_ORDER, adminEmailRequest } from '@/lib/adminEmails';
import { EMPTY_EVENT_FILTERS } from '@/lib/adminEvents';
import type { AdminEmailTemplateKey, UserResponseDto } from '@/lib/api/types';

const EVENT_PICKER_SIZE = 50;
const TEXT_DEBOUNCE_MS = 400;

// The Send email drawer: which template, for which event, in which language, and the send itself.
export function useAccountEmailForm(account: UserResponseDto) {
    const toErrorMessage = useApiErrorMessage();
    const templatesQuery = useAdminEmailTemplates(account.id);
    const eventsQuery = useAdminEvents({ filters: { ...EMPTY_EVENT_FILTERS, hostUserId: account.id }, page: 0, size: EVENT_PICKER_SIZE });
    const send = useSendAdminEmailMutation(account.id);

    const [pickedTemplate, setPickedTemplate] = useState<AdminEmailTemplateKey | null>(null);
    const [locale, setLocale] = useState<Locale>(account.locale ?? 'en');
    const [pickedEventId, setPickedEventId] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [sent, setSent] = useState(false);

    const templates = ADMIN_EMAIL_TEMPLATE_ORDER.map((key) => templatesQuery.data?.find((item) => item.key === key)).filter(
        (item) => item !== undefined,
    );
    const isAvailable = (key: AdminEmailTemplateKey) => templates.some((item) => item.key === key && item.available);
    // Until the admin picks one, the first template this account can receive.
    const template = pickedTemplate ?? templates.find((item) => item.available)?.key ?? null;
    const events = eventsQuery.data?.content ?? [];
    const eventId = pickedEventId || events[0]?.id || '';
    // Typing only re-renders the preview once the admin pauses.
    const debouncedSubject = useDebouncedValue(subject, TEXT_DEBOUNCE_MS);
    const debouncedBody = useDebouncedValue(body, TEXT_DEBOUNCE_MS);
    const request = adminEmailRequest({ template, locale, eventId, subject, body });
    const previewRequest = adminEmailRequest({ template, locale, eventId, subject: debouncedSubject, body: debouncedBody });
    const previewQuery = useAdminEmailPreview(account.id, previewRequest);

    function changeTemplate(next: AdminEmailTemplateKey) {
        if (!isAvailable(next)) return;
        setPickedTemplate(next);
        send.reset();
    }

    function requestSend() {
        if (request) setConfirmOpen(true);
    }

    function closeConfirm() {
        if (!send.isPending) setConfirmOpen(false);
    }

    async function confirmSend() {
        if (!request) return;
        try {
            await send.mutateAsync(request);
            setSent(true);
        } catch {
            // The error shows in the drawer.
        } finally {
            setConfirmOpen(false);
        }
    }

    return {
        templates,
        templatesQuery,
        template,
        changeTemplate,
        locale,
        setLocale,
        events,
        eventsQuery,
        eventId,
        setEventId: setPickedEventId,
        subject,
        setSubject,
        body,
        setBody,
        request,
        preview: previewQuery.data ?? null,
        isPreviewLoading: previewQuery.isFetching,
        previewError: previewQuery.error ? toErrorMessage(previewQuery.error) : null,
        canSend: request !== null && !send.isPending,
        isSending: send.isPending,
        sendError: send.error ? toErrorMessage(send.error) : null,
        confirmOpen,
        requestSend,
        closeConfirm,
        confirmSend,
        sent,
    };
}

export type AccountEmailForm = ReturnType<typeof useAccountEmailForm>;
```

If `UserResponseDto.locale` is typed with the `lib/api/types` `Locale` and that differs from `i18n/config`'s, use the `lib/api/types` one here and in `lib/adminEmails.ts`.

- [ ] **Step 4: Run, expect pass**

Run: `npx vitest run hooks/useAccountEmailForm.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/useAccountEmailForm.ts hooks/useAccountEmailForm.test.tsx
git commit -m "feat(admin-emails): send email form hook"
```

---

### Task 6: Copy for the drawer and provisioning

**Files:** `messages/en.json`, `messages/el.json`

- [ ] **Step 1:** In both files, add `"sendEmail"` to `AdminPage.accounts.detail` and a new `AdminPage.accounts.emails` object next to it. Add three keys to `AdminPage.accounts.provision`.

`en.json`:

```json
                "sendEmail": "Send email"
```

```json
            "emails": {
                "title": "Send email",
                "close": "Close",
                "template": "Email",
                "templates": {
                    "PROVISIONED_HOST_WELCOME": "Welcome",
                    "PASSWORD_RESET": "Password reset",
                    "EMAIL_VERIFICATION": "Verify email",
                    "CUSTOM": "Custom"
                },
                "templateHints": {
                    "PROVISIONED_HOST_WELCOME": "Tells the host their event is ready, with a button to open it.",
                    "PASSWORD_RESET": "Sends a new link to choose a password. Earlier links stop working.",
                    "EMAIL_VERIFICATION": "Sends a new link to confirm their email address.",
                    "CUSTOM": "Your own subject and message, in the standard layout."
                },
                "unavailable": {
                    "ACCOUNT_DELETED": "The account is deleted.",
                    "NO_EMAIL": "The account has no email address.",
                    "NOT_ACTIVE": "The account is not active.",
                    "NOT_PASSWORD_ACCOUNT": "The account signs in without a password.",
                    "ALREADY_VERIFIED": "The email is already verified.",
                    "NO_HOSTED_EVENTS": "The account hosts no events."
                },
                "event": "Event",
                "untitledEvent": "Untitled event",
                "subject": "Subject",
                "message": "Message",
                "language": "Language",
                "languages": { "en": "English", "el": "Greek" },
                "preview": "Preview",
                "previewTo": "To",
                "previewSubject": "Subject",
                "previewFrame": "Email preview",
                "previewDesktop": "Desktop",
                "previewPhone": "Phone",
                "previewLoading": "Loading preview...",
                "previewEmpty": "Fill in the fields to see the email.",
                "tokenNote": "The link in the email will be a new one.",
                "send": "Send email",
                "cancel": "Cancel",
                "confirmTitle": "Send this email?",
                "confirmBody": "{template} goes to {email}.",
                "sentTitle": "Email sent",
                "sentBody": "Sent to {email}.",
                "done": "Done",
                "loading": "Loading..."
            },
```

```json
                "notifyHost": "Email the host",
                "hostEmailed": "The host was emailed.",
                "hostNotEmailed": "The host was not emailed."
```

`el.json` (same structure):

```json
                "sendEmail": "Αποστολή email"
```

```json
            "emails": {
                "title": "Αποστολή email",
                "close": "Κλείσιμο",
                "template": "Email",
                "templates": {
                    "PROVISIONED_HOST_WELCOME": "Καλωσόρισμα",
                    "PASSWORD_RESET": "Επαναφορά κωδικού",
                    "EMAIL_VERIFICATION": "Επιβεβαίωση email",
                    "CUSTOM": "Προσαρμοσμένο"
                },
                "templateHints": {
                    "PROVISIONED_HOST_WELCOME": "Ενημερώνει τον διοργανωτή ότι η εκδήλωση είναι έτοιμη, με κουμπί για να την ανοίξει.",
                    "PASSWORD_RESET": "Στέλνει νέο σύνδεσμο για επιλογή κωδικού. Οι παλιοί σύνδεσμοι σταματούν να λειτουργούν.",
                    "EMAIL_VERIFICATION": "Στέλνει νέο σύνδεσμο για επιβεβαίωση της διεύθυνσης email.",
                    "CUSTOM": "Δικό σας θέμα και μήνυμα, στην τυπική μορφή."
                },
                "unavailable": {
                    "ACCOUNT_DELETED": "Ο λογαριασμός έχει διαγραφεί.",
                    "NO_EMAIL": "Ο λογαριασμός δεν έχει email.",
                    "NOT_ACTIVE": "Ο λογαριασμός δεν είναι ενεργός.",
                    "NOT_PASSWORD_ACCOUNT": "Ο λογαριασμός συνδέεται χωρίς κωδικό.",
                    "ALREADY_VERIFIED": "Το email έχει ήδη επιβεβαιωθεί.",
                    "NO_HOSTED_EVENTS": "Ο λογαριασμός δεν διοργανώνει εκδηλώσεις."
                },
                "event": "Εκδήλωση",
                "untitledEvent": "Εκδήλωση χωρίς τίτλο",
                "subject": "Θέμα",
                "message": "Μήνυμα",
                "language": "Γλώσσα",
                "languages": { "en": "Αγγλικά", "el": "Ελληνικά" },
                "preview": "Προεπισκόπηση",
                "previewTo": "Προς",
                "previewSubject": "Θέμα",
                "previewFrame": "Προεπισκόπηση email",
                "previewDesktop": "Υπολογιστής",
                "previewPhone": "Κινητό",
                "previewLoading": "Φόρτωση προεπισκόπησης...",
                "previewEmpty": "Συμπληρώστε τα πεδία για να δείτε το email.",
                "tokenNote": "Ο σύνδεσμος στο email θα είναι καινούργιος.",
                "send": "Αποστολή email",
                "cancel": "Ακύρωση",
                "confirmTitle": "Αποστολή αυτού του email;",
                "confirmBody": "Το «{template}» θα σταλεί στο {email}.",
                "sentTitle": "Το email στάλθηκε",
                "sentBody": "Στάλθηκε στο {email}.",
                "done": "Τέλος",
                "loading": "Φόρτωση..."
            },
```

```json
                "notifyHost": "Αποστολή email στον διοργανωτή",
                "hostEmailed": "Στάλθηκε email στον διοργανωτή.",
                "hostNotEmailed": "Δεν στάλθηκε email στον διοργανωτή."
```

- [ ] **Step 2: Validate JSON and commit**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json'));JSON.parse(require('fs').readFileSync('messages/el.json'));console.log('ok')"`
Expected: `ok`. (If the repo has a test that compares key sets between locales, run `npx vitest run messages` or the matching test to confirm parity.)

```bash
git add messages/en.json messages/el.json
git commit -m "feat(admin-emails): copy"
```

---

### Task 7: Preview frame

**Files:** Create `hooks/useEmailPreviewWidth.ts`, `components/admin/emails/EmailPreviewFrame.tsx`

- [ ] **Step 1: Hook**

```ts
'use client';

import { useState } from 'react';

export type EmailPreviewWidth = 'desktop' | 'phone';

export const EMAIL_PREVIEW_WIDTH_PX: Record<EmailPreviewWidth, number> = { desktop: 600, phone: 375 };

export function useEmailPreviewWidth() {
    const [width, setWidth] = useState<EmailPreviewWidth>('desktop');
    return { width, setWidth, widthPx: EMAIL_PREVIEW_WIDTH_PX[width] };
}
```

- [ ] **Step 2: Component**

The `iframe` uses `sandbox=""` (no scripts, no same-origin access) and `srcDoc`, so the email's HTML can't touch the admin page.

```tsx
'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { FunnelSegmented } from '@/components/admin/funnel/FunnelSegmented';
import { type EmailPreviewWidth, useEmailPreviewWidth } from '@/hooks/useEmailPreviewWidth';
import type { AdminEmailPreviewDto } from '@/lib/api/types';

export function EmailPreviewFrame({
    preview,
    isLoading,
    error,
    note,
}: {
    preview: AdminEmailPreviewDto | null;
    isLoading: boolean;
    error: string | null;
    note?: string | null;
}) {
    const t = useTranslations('AdminPage.accounts.emails');
    const { width, setWidth, widthPx } = useEmailPreviewWidth();
    const widthOptions = [
        { value: 'desktop' as EmailPreviewWidth, label: t('previewDesktop') },
        { value: 'phone' as EmailPreviewWidth, label: t('previewPhone') },
    ];

    return (
        <section aria-labelledby="email-preview-heading" className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <h3 id="email-preview-heading" className="flex items-center gap-2 text-xs font-bold tracking-wide text-ink-faint uppercase">
                    {t('preview')}
                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label={t('previewLoading')} /> : null}
                </h3>
                <FunnelSegmented label={t('preview')} options={widthOptions} value={width} onChangeAction={setWidth} />
            </div>

            {error ? <p role="alert" className="text-sm text-status-danger">{error}</p> : null}
            {!preview && !error ? <p className="text-sm text-ink-muted">{isLoading ? t('previewLoading') : t('previewEmpty')}</p> : null}

            {preview ? (
                <div className="overflow-hidden rounded-lg border border-border">
                    {/* Inbox header */}
                    <dl className="space-y-1 border-b border-border bg-canvas px-4 py-3 text-sm">
                        <div className="flex gap-2">
                            <dt className="w-16 shrink-0 text-ink-faint">{t('previewTo')}</dt>
                            <dd className="min-w-0 truncate font-mono text-xs leading-5 text-ink">{preview.to}</dd>
                        </div>
                        <div className="flex gap-2">
                            <dt className="w-16 shrink-0 text-ink-faint">{t('previewSubject')}</dt>
                            <dd className="min-w-0 font-semibold text-ink">{preview.subject}</dd>
                        </div>
                    </dl>
                    {/* Email */}
                    <div className="overflow-x-auto bg-[#FFFAF3]">
                        <iframe
                            title={t('previewFrame')}
                            sandbox=""
                            srcDoc={preview.html}
                            style={{ width: widthPx }}
                            className="mx-auto block h-[600px] max-w-none border-0"
                        />
                    </div>
                </div>
            ) : null}

            {preview && note ? <p className="text-xs text-ink-faint">{note}</p> : null}
        </section>
    );
}
```

- [ ] **Step 3: Check and commit**

Run: `npm run type:check && npx eslint components/admin/emails hooks/useEmailPreviewWidth.ts`
Expected: no errors.

```bash
git add hooks/useEmailPreviewWidth.ts components/admin/emails/EmailPreviewFrame.tsx
git commit -m "feat(admin-emails): preview frame"
```

---

### Task 8: Send email drawer

**Files:** Create `components/admin/emails/AccountEmailTemplatePicker.tsx`, `AccountEmailFields.tsx`, `AccountEmailSent.tsx`, `AccountEmailDrawer.tsx`

- [ ] **Step 1: Template picker** (follows `VisibilitySegmentedControl`'s look; a disabled option shows why underneath)

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { type MouseEvent } from 'react';

import type { AdminEmailTemplateDto, AdminEmailTemplateKey } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function AccountEmailTemplatePicker({
    templates,
    value,
    onChangeAction,
}: {
    templates: AdminEmailTemplateDto[];
    value: AdminEmailTemplateKey | null;
    onChangeAction: (template: AdminEmailTemplateKey) => void;
}) {
    const t = useTranslations('AdminPage.accounts.emails');
    const unavailable = templates.filter((item) => !item.available && item.unavailableReason);

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        onChangeAction(event.currentTarget.dataset.template as AdminEmailTemplateKey);
    }

    return (
        <section aria-labelledby="email-template-heading">
            <h3 id="email-template-heading" className="mb-2 text-xs font-bold tracking-wide text-ink-faint uppercase">
                {t('template')}
            </h3>
            {/* Options */}
            <div role="group" aria-labelledby="email-template-heading" className="grid grid-cols-2 gap-1 rounded-lg bg-canvas p-1 sm:grid-cols-4">
                {templates.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        data-template={item.key}
                        onClick={handleClick}
                        disabled={!item.available}
                        aria-pressed={value === item.key}
                        className={cn(
                            'rounded-md px-2 py-1.5 text-[12.5px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                            value === item.key ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                        )}
                    >
                        {t(`templates.${item.key}`)}
                    </button>
                ))}
            </div>
            {value ? <p className="mt-2 text-xs leading-5 text-ink-faint">{t(`templateHints.${value}`)}</p> : null}
            {/* Unavailable */}
            {unavailable.length > 0 ? (
                <ul className="mt-2 space-y-0.5 text-xs leading-5 text-ink-faint">
                    {unavailable.map((item) => (
                        <li key={item.key}>
                            <span className="font-semibold">{t(`templates.${item.key}`)}:</span> {t(`unavailable.${item.unavailableReason}`)}
                        </li>
                    ))}
                </ul>
            ) : null}
        </section>
    );
}
```

- [ ] **Step 2: Fields**

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { FunnelSegmented } from '@/components/admin/funnel/FunnelSegmented';
import type { AccountEmailForm } from '@/hooks/useAccountEmailForm';
import type { Locale } from '@/i18n/config';
import { CUSTOM_BODY_MAX_LENGTH, CUSTOM_SUBJECT_MAX_LENGTH } from '@/lib/adminEmails';
import { formatAdminDate } from '@/lib/adminOrders';

export function AccountEmailFields({ form }: { form: AccountEmailForm }) {
    const t = useTranslations('AdminPage.accounts.emails');
    const uiLocale = useLocale();
    const languageOptions = [
        { value: 'en' as Locale, label: t('languages.en') },
        { value: 'el' as Locale, label: t('languages.el') },
    ];

    function handleEventChange(event: ChangeEvent<HTMLSelectElement>) {
        form.setEventId(event.target.value);
    }

    function handleSubjectChange(event: ChangeEvent<HTMLInputElement>) {
        form.setSubject(event.target.value);
    }

    function handleBodyChange(event: ChangeEvent<HTMLTextAreaElement>) {
        form.setBody(event.target.value);
    }

    return (
        <div className="space-y-4">
            {/* Event */}
            {form.template === 'PROVISIONED_HOST_WELCOME' ? (
                <AdminField label={t('event')}>
                    <select value={form.eventId} onChange={handleEventChange} className={adminInputClass()}>
                        {form.events.map((event) => (
                            <option key={event.id} value={event.id}>
                                {(event.title ?? t('untitledEvent')) + (event.startAt ? ` · ${formatAdminDate(uiLocale, event.startAt)}` : '')}
                            </option>
                        ))}
                    </select>
                </AdminField>
            ) : null}

            {/* Message */}
            {form.template === 'CUSTOM' ? (
                <>
                    <AdminField label={t('subject')} required>
                        <input value={form.subject} onChange={handleSubjectChange} maxLength={CUSTOM_SUBJECT_MAX_LENGTH} className={adminInputClass()} />
                    </AdminField>
                    <AdminField label={t('message')} required>
                        <textarea
                            value={form.body}
                            onChange={handleBodyChange}
                            maxLength={CUSTOM_BODY_MAX_LENGTH}
                            rows={8}
                            className={adminInputClass('resize-y')}
                        />
                    </AdminField>
                </>
            ) : null}

            {/* Language */}
            <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('language')}</span>
                <FunnelSegmented label={t('language')} options={languageOptions} value={form.locale} onChangeAction={form.setLocale} />
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Sent state**

```tsx
'use client';

import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function AccountEmailSent({ email }: { email: string }) {
    const t = useTranslations('AdminPage.accounts.emails');

    return (
        <section className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            {/* Sent */}
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-status-good-wash text-status-good">
                <CheckCircle2 className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-lg font-bold text-ink">{t('sentTitle')}</h3>
            <p className="mt-1 text-sm text-ink-muted">{t('sentBody', { email })}</p>
        </section>
    );
}
```

- [ ] **Step 4: Drawer**

```tsx
'use client';

import { Loader2, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AccountEmailFields } from '@/components/admin/emails/AccountEmailFields';
import { AccountEmailSent } from '@/components/admin/emails/AccountEmailSent';
import { AccountEmailTemplatePicker } from '@/components/admin/emails/AccountEmailTemplatePicker';
import { EmailPreviewFrame } from '@/components/admin/emails/EmailPreviewFrame';
import { LoadingState } from '@/components/ui/LoadingState';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useAccountEmailForm } from '@/hooks/useAccountEmailForm';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { hasTokenLink } from '@/lib/adminEmails';
import type { UserResponseDto } from '@/lib/api/types';

export function AccountEmailDrawer({ account, onCloseAction }: { account: UserResponseDto; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage.accounts.emails');
    const toErrorMessage = useApiErrorMessage();
    const form = useAccountEmailForm(account);
    const email = account.email ?? '';
    const templateLabel = form.template ? t(`templates.${form.template}`) : '';

    const footer = form.sent ? (
        <div className="flex w-full justify-end">
            <button type="button" onClick={onCloseAction} className="min-h-10 rounded-md bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90">
                {t('done')}
            </button>
        </div>
    ) : (
        <div className="flex w-full items-center justify-end gap-2">
            <button type="button" onClick={onCloseAction} className="min-h-10 rounded-md px-4 text-sm font-semibold text-ink-muted hover:bg-canvas">
                {t('cancel')}
            </button>
            <button
                type="button"
                onClick={form.requestSend}
                disabled={!form.canSend}
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45"
            >
                {form.isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t('send')}
            </button>
        </div>
    );

    return (
        <AdminDrawer open size="wide" onClose={onCloseAction} closeLabel={t('close')} title={t('title')} subtitle={email} footer={footer} closeDisabled={form.isSending}>
            {form.sent ? <AccountEmailSent email={email} /> : null}

            {!form.sent && form.templatesQuery.isLoading ? <LoadingState label={t('loading')} className="min-h-48" /> : null}
            {!form.sent && form.templatesQuery.error ? (
                <p role="alert" className="text-sm text-status-danger">{toErrorMessage(form.templatesQuery.error)}</p>
            ) : null}

            {!form.sent && form.templatesQuery.data ? (
                <>
                    {/* Template */}
                    <AccountEmailTemplatePicker templates={form.templates} value={form.template} onChangeAction={form.changeTemplate} />

                    {/* Details */}
                    {form.template ? <AccountEmailFields form={form} /> : null}

                    {/* Preview */}
                    {form.template ? (
                        <EmailPreviewFrame
                            preview={form.preview}
                            isLoading={form.isPreviewLoading}
                            error={form.previewError}
                            note={hasTokenLink(form.template) ? t('tokenNote') : null}
                        />
                    ) : null}

                    {form.sendError ? (
                        <p role="alert" className="rounded-lg bg-status-danger-wash px-4 py-3 text-sm text-status-danger">{form.sendError}</p>
                    ) : null}
                </>
            ) : null}

            {/* Send confirmation */}
            <ConfirmActionModal
                open={form.confirmOpen}
                onCloseAction={form.closeConfirm}
                title={t('confirmTitle')}
                body={t('confirmBody', { template: templateLabel, email })}
                confirmLabel={t('send')}
                cancelLabel={t('cancel')}
                tone="default"
                isConfirming={form.isSending}
                onConfirmAction={form.confirmSend}
            />
        </AdminDrawer>
    );
}
```

Check `LoadingState`'s props (`grep -n "export function LoadingState" -A5 components/ui/LoadingState.tsx`). `AccountsPanel` already uses `label` and `className`.

- [ ] **Step 5: Check and commit**

Run: `npm run type:check && npx eslint components/admin/emails`
Expected: no errors.

```bash
git add components/admin/emails
git commit -m "feat(admin-emails): send email drawer"
```

---

### Task 9: Open the drawer from the account

**Files:** `hooks/useAccountsPanel.ts`, `components/admin/AccountsPanel.tsx`, `components/admin/AccountDetailDrawer.tsx`

- [ ] **Step 1: Panel state.** In `useAccountsPanel`, add the following, mirroring `provisionAccount` (one drawer at a time, as `provisionFor` already does):

```ts
    const [emailAccount, setEmailAccount] = useState<UserResponseDto | null>(null);

    function emailTo(account: UserResponseDto) {
        setSelectedAccount(null);
        setEmailAccount(account);
    }
```

Return `emailAccount`, `setEmailAccount`, `emailTo`.

- [ ] **Step 2: Panel render.** In `AccountsPanel`:

```tsx
    function closeEmail() {
        panel.setEmailAccount(null);
    }
```

Pass `onSendEmailAction={panel.emailTo}` to `AccountDetailDrawer`, and after the provision drawer add:

```tsx
            {panel.emailAccount ? <AccountEmailDrawer key={panel.emailAccount.id} account={panel.emailAccount} onCloseAction={closeEmail} /> : null}
```

with `import { AccountEmailDrawer } from '@/components/admin/emails/AccountEmailDrawer';`.

- [ ] **Step 3: Detail drawer action.** In `AccountDetailDrawer`, add the prop `onSendEmailAction: (account: UserResponseDto) => void` and a link-style button beside "Orders" in the Account section. Use the same style, with `Mail` from `lucide-react`, and hide it for deleted accounts:

```tsx
    function sendEmail() {
        onSendEmailAction(account);
    }
```

```tsx
                <div className="flex flex-wrap items-center gap-4">
                    <button type="button" onClick={openOrders} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink hover:underline">
                        <ShoppingBag className="h-3.5 w-3.5" />
                        {t('orders')}
                    </button>
                    {account.status !== 'DELETED' && account.email ? (
                        <button type="button" onClick={sendEmail} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink hover:underline">
                            <Mail className="h-3.5 w-3.5" />
                            {t('sendEmail')}
                        </button>
                    ) : null}
                </div>
```

This replaces the existing lone Orders `<button>`.

- [ ] **Step 4: Check and commit**

Run: `npm run type:check && npm run lint`
Expected: no errors.

```bash
git add hooks/useAccountsPanel.ts components/admin/AccountsPanel.tsx components/admin/AccountDetailDrawer.tsx
git commit -m "feat(admin-emails): send email from the account drawer"
```

---

### Task 10: Notify the host when provisioning

**Files:** `hooks/useProvisionEventForm.ts`, `hooks/useProvisionEventForm.test.tsx`, `components/admin/ProvisionEventReview.tsx`, `components/admin/ProvisionEventSuccess.tsx`, `hooks/useDemoEventDetail.ts`

- [ ] **Step 1: Write the failing tests** (append inside the existing `describe` in `hooks/useProvisionEventForm.test.tsx`; also add this mock beside the others):

```tsx
vi.mock('@/hooks/useAdminEmails', () => ({
    useWelcomeEmailPreview: (request: unknown) => ({ data: request ? { to: 'host@example.com', subject: 's', html: '', text: '' } : undefined, isFetching: false, error: null }),
}));
```

```tsx
    it('emails the host by default and sends notifyHost', async () => {
        const { result } = renderHook(() => useProvisionEventForm(HOST));
        act(() => fillRequired(result.current));
        await act(() => result.current.submit(submitEvent));
        expect(result.current.notifyHost).toBe(true);
        expect(result.current.welcomePreview).not.toBeNull();
        await act(() => result.current.submit(submitEvent));
        expect((mocks.calls.at(-1) as AdminProvisionEventRequestDto).notifyHost).toBe(true);
    });

    it('can skip the email, and then has no preview', async () => {
        const { result } = renderHook(() => useProvisionEventForm(HOST));
        act(() => fillRequired(result.current));
        await act(() => result.current.submit(submitEvent));
        act(() => result.current.setNotifyHost(false));
        expect(result.current.welcomePreview).toBeNull();
        await act(() => result.current.submit(submitEvent));
        expect((mocks.calls.at(-1) as AdminProvisionEventRequestDto).notifyHost).toBe(false);
    });

    it('never offers the email when the caller turns it off', () => {
        const { result } = renderHook(() => useProvisionEventForm(HOST, { canNotifyHost: false }));
        expect(result.current.canNotifyHost).toBe(false);
        expect(result.current.notifyHost).toBe(false);
    });
```

`fillRequired` may set fields in separate `act` calls already. If the first `submit` doesn't reach `'review'` because state hasn't flushed, split the fill into its own `act` as the existing tests in this file do.

- [ ] **Step 2: Run, expect failure**

Run: `npx vitest run hooks/useProvisionEventForm.test.tsx`
Expected: FAIL, `notifyHost` undefined.

- [ ] **Step 3: Implement in `useProvisionEventForm`**

Add to `ProvisionEventOptions`:

```ts
    // False hides "Email the host" (e.g. demo events, hosted by the admin's own demo account).
    canNotifyHost?: boolean;
```

Inside the hook (after the other `useState`s):

```ts
    const canNotifyHost = options.canNotifyHost ?? true;
    const [notifyHostChoice, setNotifyHost] = useState(true);
    const notifyHost = canNotifyHost && notifyHostChoice;
```

After `canReview` is computed:

```ts
    // The welcome email as provisioning will send it, once the admin reaches the review step.
    const welcomePreviewRequest =
        step === 'review' && notifyHost && canReview
            ? {
                  hostUserId: host.id,
                  title: title.trim(),
                  startAt: datetimeLocalValueToIso(startAt) ?? undefined,
                  timezone,
                  locationName: locationName.trim() || undefined,
                  locationAddress: locationAddress.trim() || undefined,
              }
            : null;
    const welcomePreviewQuery = useWelcomeEmailPreview(welcomePreviewRequest);
```

In `mutateAsync({...})`, add `notifyHost,` beside `hostUserId`. Import `useWelcomeEmailPreview` from `@/hooks/useAdminEmails`. Add to the returned object:

```ts
        canNotifyHost,
        notifyHost,
        setNotifyHost,
        welcomePreview: welcomePreviewQuery.data ?? null,
        isWelcomePreviewLoading: welcomePreviewQuery.isFetching,
        welcomePreviewError: welcomePreviewQuery.error ? toErrorMessage(welcomePreviewQuery.error) : null,
        // What the success step reports: the choice that was submitted.
        hostEmailed: Boolean(provisionEvent.data) && notifyHost,
```

The preview's language is left to the backend default (the host's saved language), which is the language provisioning sends in.

- [ ] **Step 4: Run, expect pass**

Run: `npx vitest run hooks/useProvisionEventForm.test.tsx`
Expected: PASS (old and new tests).

- [ ] **Step 5: Review step UI.** In `ProvisionEventReview`, between the review list and the activation notice, add:

```tsx
            {/* Host email */}
            {form.canNotifyHost ? (
                <section className="space-y-4 border-t border-border pt-5">
                    <label className="flex items-center gap-3 text-sm font-semibold text-ink">
                        <input type="checkbox" checked={form.notifyHost} onChange={handleNotifyHostChange} className="h-4 w-4 accent-primary" />
                        {t('notifyHost')}
                    </label>
                    {form.notifyHost ? (
                        <EmailPreviewFrame preview={form.welcomePreview} isLoading={form.isWelcomePreviewLoading} error={form.welcomePreviewError} />
                    ) : null}
                </section>
            ) : null}
```

```tsx
    function handleNotifyHostChange(event: ChangeEvent<HTMLInputElement>) {
        form.setNotifyHost(event.target.checked);
    }
```

with imports `type ChangeEvent` from `react` and `EmailPreviewFrame` from `@/components/admin/emails/EmailPreviewFrame`. `EmailPreviewFrame` reads `AdminPage.accounts.emails` copy, which applies here too.

- [ ] **Step 6: Success step.** In `ProvisionEventSuccess`, under `successBody`:

```tsx
                {form.canNotifyHost ? <p className="mb-4 text-sm text-ink-muted">{t(form.hostEmailed ? 'hostEmailed' : 'hostNotEmailed')}</p> : null}
```

- [ ] **Step 7: Demo events.** In `hooks/useDemoEventDetail.ts`, add `canNotifyHost: false,` to the `provisionOptions` object.

- [ ] **Step 8: Check and commit**

Run: `npm run type:check && npm run lint && npx vitest run hooks components/admin`
Expected: no errors, all tests pass.

```bash
git add hooks/useProvisionEventForm.ts hooks/useProvisionEventForm.test.tsx components/admin/ProvisionEventReview.tsx components/admin/ProvisionEventSuccess.tsx hooks/useDemoEventDetail.ts
git commit -m "feat(provisioning): email the host, with a preview"
```

---

### Task 11: Verify in the browser

Needs the backend branch running locally with these endpoints.

- [ ] **Step 1:** Open the running dev server with `preview_start {url: "http://localhost:3000/"}` only. Never start a server by name here, because it shares `.next` with the user's server. Ask the user for the local admin login; the browser pane starts signed out.
- [ ] **Step 2:** Admin → Accounts → open a provisioned host → Send email. Then check:
  - Each template renders a preview.
  - Verification is disabled with its reason for a verified account.
  - The language switch changes the preview.
  - Phone width narrows the email.
  - Custom text updates the preview after a pause.
  - Send → confirm → "Email sent". The backend log shows a send.
- [ ] **Step 3:** Provision an event for a test host. The review step shows the welcome preview; unticking hides it; the success step says whether the host was emailed.
- [ ] **Step 4:** Check the drawer at a narrow width (e.g. 768 and 390). Look for overlap, cramped text, and that the preview scrolls sideways instead of breaking the layout.
- [ ] **Step 5:** Run the final checks: `npm run type:check && npm run lint && npm test`. Fix anything they report.
- [ ] **Step 6: SEO check.** No routes were added or changed, so `docs/seo-guidelines.md` doesn't apply. Say so in the PR description.
- [ ] **Step 7:** Push `feat/admin-emails` and open a PR into `staging` only when the user asks.
