# Guest inquiries — frontend implementation plan (KAN-20)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guests ask a partner about a date from the Vendors page and the feed card. Partners see and handle those inquiries on My business.

**Architecture:**
- **Guest side:** one hook, `useAskDates`, per screen. It holds the sheet's form for whichever partner was tapped, sends to the right route, and writes `inquiry.sentAt` into the cache the card was drawn from. The button and sheet are presentational.
- **Partner side:** `useGuestInquiries` (infinite query and done mutation) feeds a section on My business. The section shows rows plus a detail sheet, or a locked sample for non-partners.

**Tech stack:** Next.js App Router, React, TanStack Query, next-intl, Tailwind, Vitest + Testing Library, Storybook (`@storybook/nextjs-vite`).

**Spec:** `docs/superpowers/specs/2026-11-23-guest-inquiries-design.md`
**Backend plan (must be merged into guestwall-be staging first):** `docs/superpowers/plans/2026-11-23-guest-inquiries-backend.md`

**Worktree:** `C:\Users\User\WebstormProjects\storywall-kan-20`, branch `claude/kan-20-guest-inquiries` (from `origin/staging`).

---

## Before you start

- [ ] Bring the branch up to date: `git fetch origin && git merge origin/staging`.
- [ ] Confirm the error codes the backend PR used (3135, 3136, 3137, 5230, unless the backend plan had to move them). Use the backend's numbers in Task 2.
- [ ] Baseline: `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`. Note anything already failing.

## File map

| File | Responsibility |
|---|---|
| `lib/api/types.ts` | `InquiryStateDto`, `GuestInquiryRequestDto`, `GuestInquirySentDto`, `GuestInquiryDto`, `inquiry?` on `VendorRowDto` and `PartnerBrandingDto` |
| `lib/api/endpoints.ts` | 4 routes |
| `lib/api/errors.ts`, `lib/api/errorMessageKeys.ts` | 4 codes → `ApiErrors` keys |
| `lib/inquiries.ts` (+ test) | date bounds, date formatting, cache patchers, sample rows |
| `hooks/useAskDates.ts` (+ test) | guest form state, send, cache write |
| `components/vendors/inquiries/AskDatesButton.tsx`, `AskDatesSheet.tsx` (+ tests, stories) | guest UI |
| `components/vendors/list/VendorListRow.tsx`, `VendorListScreen.tsx` | button on vendor cards, the sheet |
| `components/feed/partner/PartnerFeatureCard.tsx`, `PartnerFeedCard.tsx`, `FeedPageContent.tsx` | `action` slot on the feed card |
| `hooks/useBusinessOverview.ts` | `businessKeys.inquiries` |
| `hooks/useGuestInquiries.ts` (+ test) | partner list and done flag |
| `components/business/GuestInquiriesSection.tsx`, `InquiryRow.tsx`, `InquirySheet.tsx` (+ tests, stories) | partner UI |
| `components/business/BusinessSectionIcon.tsx` | `inquiries` tile |
| `lib/business.ts`, `hooks/useBusinessPage.ts`, `components/business/BusinessScreen.tsx` | place the section |
| `lib/vendors.ts` | `inquiries` moves to the current partner benefits |
| `messages/en.json`, `messages/el.json` | approved copy only |

---

### Task 1: Copy approval (gate)

**Done 2026-11-23.** The owner approved all three tables below as written. They also asked for an animated flying envelope above the `sent` line (the line stays). Its alt text was approved too: `ImageAlt.inquirySent` = "Inquiry sent" / "Η ερώτηση στάλθηκε".

CLAUDE.md: no text is added without the owner's explicit yes, in a popup. Nothing existing changes. Ask in **one AskUserQuestion per group** (guest sheet, errors, My business), showing each table. Options: "Use as written (Recommended)" / "I'll edit it". If they edit, use their wording exactly in Task 2.

Greek: the guest side speaks to the guest in the singular (σου), like the feed. The business side speaks to the partner in the plural (σας), like the rest of My business. Vendor = επαγγελματίας, host = διοργανωτής.

**Guest sheet — `Vendors.inquiry`**

| Key | English | Greek |
|---|---|---|
| `ask` | Ask about my date | Ρώτα για την ημερομηνία μου |
| `alreadySent` | Already sent | Έχει σταλεί |
| `sheetTitle` | Ask {name} | Ερώτηση προς {name} |
| `date` | Your event date | Η ημερομηνία της εκδήλωσής σου |
| `phone` | Phone | Τηλέφωνο |
| `email` | Email | Email |
| `note` | Message (optional) | Μήνυμα (προαιρετικό) |
| `consent` | Share my name and contact details with {name}. | Να δοθούν το όνομα και τα στοιχεία επικοινωνίας μου σε: {name}. |
| `dateRequired` | Pick a date. | Διάλεξε ημερομηνία. |
| `contactRequired` | Add a phone or an email. | Πρόσθεσε τηλέφωνο ή email. |
| `send` | Send | Αποστολή |
| `sending` | Sending… | Αποστολή… |
| `sent` | Sent. {name} will contact you. | Στάλθηκε. Θα επικοινωνήσουν μαζί σου από {name}. |
| `close` | Close | Κλείσιμο |

**Errors — `ApiErrors`**

| Key | English | Greek |
|---|---|---|
| `inquiryDateOutOfRange` | Pick a date from today up to three years ahead. | Διάλεξε ημερομηνία από σήμερα έως τρία χρόνια μετά. |
| `inquiryContactRequired` | Add a phone or an email. | Πρόσθεσε τηλέφωνο ή email. |
| `inquiryConsentRequired` | Tick the box to send. | Τσέκαρε το κουτί για να στείλεις. |
| `inquiryAlreadySent` | You already asked them. | Έχεις ήδη ρωτήσει. |

**My business — `BusinessPage.inquiries`**

| Key | English | Greek |
|---|---|---|
| `title` | Guest inquiries | Ερωτήσεις καλεσμένων |
| `emptyTitle` | No inquiries yet | Καμία ερώτηση ακόμα |
| `emptyBody` | Guests can ask about your dates from your events. | Οι καλεσμένοι ρωτούν για τις ημερομηνίες σας μέσα από τις εκδηλώσεις σας. |
| `loadFailed` | Couldn't load inquiries. | Δεν φορτώθηκαν οι ερωτήσεις. |
| `new` | New | Νέα |
| `date` | Date | Ημερομηνία |
| `event` | Event | Εκδήλωση |
| `call` | Call | Κλήση |
| `writeEmail` | Email | Email |
| `note` | Message | Μήνυμα |
| `markDone` | Mark done | Ολοκληρώθηκε |
| `markNew` | Mark as new | Σήμανση ως νέα |
| `close` | Close | Κλείσιμο |

Reused as they are (no change): `BusinessPage.events.retry` and `BusinessPage.events.more`. The locked label is `Vendors.partner.benefits.inquiries.title`.

The locked sample also shows made-up rows, blurred and hidden from screen readers: "Maria P." and "Nikos K." on 12/06/2027 and 04/09/2027. List these in the third popup too.

- [ ] **Step 1:** Ask the three popups.
- [ ] **Step 2:** Write down the approved wording, to paste in Task 2. Don't continue on a "no"; ask what to change instead.

---

### Task 2: Types, routes, error codes and copy

**Files:** `lib/api/types.ts`, `lib/api/endpoints.ts`, `lib/api/errors.ts`, `lib/api/errorMessageKeys.ts`, `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Types.** In `lib/api/types.ts`:

Add above `VendorRowDto`:

```ts
// --- Guest inquiries (KAN-20) ---

// Present on a partner's card for anyone but that partner. canAsk is false once sentAt is set.
export interface InquiryStateDto {
    canAsk: boolean;
    sentAt: string | null;
}

// POST …/vendors/{vendorId}/inquiries and …/partner-branding/inquiries. eventDate is YYYY-MM-DD.
export interface GuestInquiryRequestDto {
    eventDate: string;
    phone?: string;
    email?: string;
    note?: string;
    consent: boolean;
}

export interface GuestInquirySentDto {
    sentAt: string;
}

export type GuestInquiryStatus = 'NEW' | 'DONE';

// GET /api/me/business/inquiries — one row of the partner's list.
export interface GuestInquiryDto {
    id: string;
    guestName: string;
    eventTitle: string;
    eventDate: string; // YYYY-MM-DD
    phone: string | null;
    email: string | null;
    note: string | null;
    status: GuestInquiryStatus;
    createdAt: string;
}
```

Add to the end of `VendorRowDto` and of `PartnerBrandingDto`:

```ts
    // KAN-20: only on an approved partner's card, never on the partner's own. Absent or null: no "Ask about my date".
    inquiry?: InquiryStateDto | null;
```

- [ ] **Step 2: Routes.** In `lib/api/endpoints.ts`, under `events` next to `vendorMe`:

```ts
        vendorInquiries: (eventId: string, vendorId: string) => `/api/events/${eventId}/vendors/${vendorId}/inquiries`,
        partnerBrandingInquiries: (eventId: string) => `/api/events/${eventId}/partner-branding/inquiries`,
```

Under `me`, next to `businessMessages`:

```ts
        businessInquiries: (page: number, size: number) => `/api/me/business/inquiries?page=${page}&size=${size}`,
        businessInquiry: (id: string) => `/api/me/business/inquiries/${id}`,
```

- [ ] **Step 3: Error codes.** In `lib/api/errors.ts`, after `EVENT_START_BEFORE_PURCHASE: 3134,`:

```ts
    // Guest inquiries (KAN-20).
    INQUIRY_DATE_OUT_OF_RANGE: 3135,
    INQUIRY_CONTACT_REQUIRED: 3136,
    INQUIRY_CONSENT_REQUIRED: 3137,
```

After `EMAIL_ALREADY_VERIFIED: 5227,`:

```ts
    INQUIRY_ALREADY_SENT: 5230,
```

In `lib/api/errorMessageKeys.ts`, after the `EMAIL_ALREADY_VERIFIED` line:

```ts
    [ERROR_CODES.INQUIRY_DATE_OUT_OF_RANGE]: 'inquiryDateOutOfRange',
    [ERROR_CODES.INQUIRY_CONTACT_REQUIRED]: 'inquiryContactRequired',
    [ERROR_CODES.INQUIRY_CONSENT_REQUIRED]: 'inquiryConsentRequired',
    [ERROR_CODES.INQUIRY_ALREADY_SENT]: 'inquiryAlreadySent',
```

- [ ] **Step 4: Copy.** Add the approved keys from Task 1:
  - `Vendors.inquiry`: a new object in `Vendors`
  - `ApiErrors`: 4 keys
  - `BusinessPage.inquiries`: a new object in `BusinessPage`
  - `ImageAlt.inquirySent`: "Inquiry sent" / "Η ερώτηση στάλθηκε", next to `qrWishSent`

Do this in both `messages/en.json` and `messages/el.json`, at the same place in each, and keep both files' key order the same.

- [ ] **Step 5: Check.** `npx tsc --noEmit`, then run the message parity test if there is one: `npx vitest run messages`. Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add lib/api/types.ts lib/api/endpoints.ts lib/api/errors.ts lib/api/errorMessageKeys.ts messages/en.json messages/el.json
git commit -m "KAN-20: guest inquiry types, routes, error codes and copy"
```

---

### Task 3: `lib/inquiries.ts`

**Files:** Create `lib/inquiries.ts`, `lib/inquiries.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import type { EventDetailResponseDto, PartnerBrandingDto, VendorRowDto } from '@/lib/api/types';
import { inquiryDateBounds, formatInquiryDate, markCardInquirySent, markVendorInquirySent } from '@/lib/inquiries';

describe('inquiryDateBounds', () => {
    it('runs from the local today to three years ahead', () => {
        expect(inquiryDateBounds(new Date(2026, 10, 23, 23, 30))).toEqual({ min: '2026-11-23', max: '2029-11-23' });
    });
});

describe('formatInquiryDate', () => {
    it('formats a calendar date without shifting it', () => {
        expect(formatInquiryDate('en', '2027-06-12')).toBe('Jun 12, 2027');
    });
});

describe('markVendorInquirySent', () => {
    it('closes the ask on that vendor only', () => {
        const rows = [
            { id: 'a', inquiry: { canAsk: true, sentAt: null } },
            { id: 'b', inquiry: { canAsk: true, sentAt: null } },
        ] as VendorRowDto[];
        const next = markVendorInquirySent(rows, 'a', '2026-11-23T10:00:00Z');
        expect(next?.[0].inquiry).toEqual({ canAsk: false, sentAt: '2026-11-23T10:00:00Z' });
        expect(next?.[1].inquiry).toEqual({ canAsk: true, sentAt: null });
    });
});

describe('markCardInquirySent', () => {
    it('closes the ask on the feed card', () => {
        const event = { partnerBranding: { inquiry: { canAsk: true, sentAt: null } } as PartnerBrandingDto } as EventDetailResponseDto;
        expect(markCardInquirySent(event, '2026-11-23T10:00:00Z')?.partnerBranding?.inquiry).toEqual({
            canAsk: false,
            sentAt: '2026-11-23T10:00:00Z',
        });
    });

    it('leaves an event without a card alone', () => {
        const event = { partnerBranding: null } as EventDetailResponseDto;
        expect(markCardInquirySent(event, 'x')).toBe(event);
    });
});
```

- [ ] **Step 2: Run it and confirm it fails.** Run `npx vitest run lib/inquiries.test.ts`. Expected: the module isn't found.

- [ ] **Step 3: Implement**

```ts
import type { EventDetailResponseDto, VendorRowDto } from '@/lib/api/types';

export const INQUIRY_NOTE_MAX = 500;
const YEARS_AHEAD = 3;

// YYYY-MM-DD for the device's own calendar day, as <input type="date"> expects.
function localIsoDate(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// The dates a guest may ask about: today to three years ahead. The server checks the same range in Athens time.
export function inquiryDateBounds(now: Date = new Date()): { min: string; max: string } {
    const max = new Date(now);
    max.setFullYear(now.getFullYear() + YEARS_AHEAD);
    return { min: localIsoDate(now), max: localIsoDate(max) };
}

// "2027-06-12" → "Jun 12, 2027". A calendar date, so UTC keeps it from moving a day.
export function formatInquiryDate(locale: string, isoDate: string): string {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${isoDate}T00:00:00Z`));
}

const sent = (sentAt: string) => ({ canAsk: false, sentAt });

// The vendor list with one vendor's ask closed.
export function markVendorInquirySent(rows: VendorRowDto[] | undefined, vendorId: string, sentAt: string): VendorRowDto[] | undefined {
    return rows?.map((row) => (row.id === vendorId && row.inquiry ? { ...row, inquiry: sent(sentAt) } : row));
}

// The event with its feed card's ask closed.
export function markCardInquirySent(event: EventDetailResponseDto | undefined, sentAt: string): EventDetailResponseDto | undefined {
    if (!event?.partnerBranding?.inquiry) return event;
    return { ...event, partnerBranding: { ...event.partnerBranding, inquiry: sent(sentAt) } };
}

// Made-up rows behind the locked list on My business. Blurred and hidden from assistive tech; never real data.
export const SAMPLE_INQUIRIES: readonly { guestName: string; eventDate: string }[] = [
    { guestName: 'Maria P.', eventDate: '2027-06-12' },
    { guestName: 'Nikos K.', eventDate: '2027-09-04' },
];
```

Check the shape of the vendor list cache first. `grep -n "queryKey: vendorKeys.list" -A4 hooks/*.ts`. If it isn't `VendorRowDto[]`, change `markVendorInquirySent` to that shape and update its test.

- [ ] **Step 4: Run and confirm it passes.** Run `npx vitest run lib/inquiries.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add lib/inquiries.ts lib/inquiries.test.ts
git commit -m "KAN-20: inquiry date bounds and cache helpers"
```

---

### Task 4: `useAskDates`

**Files:** Create `hooks/useAskDates.ts`, `hooks/useAskDates.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { eventKeys } from '@/hooks/useEvent';
import { useAskDates } from '@/hooks/useAskDates';
import { vendorKeys } from '@/hooks/useVendors';
import { ApiError } from '@/lib/api/client';
import type { VendorRowDto } from '@/lib/api/types';
import { inquiryDateBounds } from '@/lib/inquiries';
import messages from '@/messages/en.json';

const post = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { post },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { email: 'maria@example.com' } }) }));

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={client}>
            <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
                {children}
            </NextIntlClientProvider>
        </QueryClientProvider>
    );
}

const { min } = inquiryDateBounds();

describe('useAskDates', () => {
    beforeEach(() => {
        client = new QueryClient();
        post.mockReset();
    });

    it('opens with the account email filled in and nothing else', () => {
        const { result } = renderHook(() => useAskDates('evt-1'), { wrapper });
        act(() => result.current.openForVendor('v1', 'Lens & Light'));

        expect(result.current.target).toEqual({ kind: 'vendor', vendorId: 'v1', name: 'Lens & Light' });
        expect(result.current.email).toBe('maria@example.com');
        expect(result.current.date).toBe('');
        expect(result.current.consent).toBe(false);
        expect(result.current.canSend).toBe(false);
    });

    it('asks for a date and a way to reach the guest before sending', async () => {
        const { result } = renderHook(() => useAskDates('evt-1'), { wrapper });
        act(() => {
            result.current.openForVendor('v1', 'Lens & Light');
            result.current.setEmail('');
            result.current.setConsent(true);
        });
        await act(() => result.current.submit());

        expect(post).not.toHaveBeenCalled();
        expect(result.current.dateError).toBe('Pick a date.');
        expect(result.current.contactError).toBe('Add a phone or an email.');
    });

    it('sends to the vendor route and closes the ask in the vendor list', async () => {
        client.setQueryData<VendorRowDto[]>(vendorKeys.list('evt-1'), [
            { id: 'v1', inquiry: { canAsk: true, sentAt: null } } as VendorRowDto,
        ]);
        post.mockResolvedValue({ sentAt: '2026-11-23T10:00:00Z' });
        const { result } = renderHook(() => useAskDates('evt-1'), { wrapper });
        act(() => {
            result.current.openForVendor('v1', 'Lens & Light');
            result.current.setDate(min);
            result.current.setNote('  Summer wedding  ');
            result.current.setConsent(true);
        });
        await act(() => result.current.submit());

        expect(post).toHaveBeenCalledWith('/api/events/evt-1/vendors/v1/inquiries', {
            eventDate: min,
            email: 'maria@example.com',
            note: 'Summer wedding',
            consent: true,
        });
        expect(result.current.sent).toBe(true);
        expect(client.getQueryData<VendorRowDto[]>(vendorKeys.list('evt-1'))?.[0].inquiry).toEqual({
            canAsk: false,
            sentAt: '2026-11-23T10:00:00Z',
        });
    });

    it('sends to the feed card route', async () => {
        client.setQueryData(eventKeys.detail('evt-1'), { partnerBranding: { inquiry: { canAsk: true, sentAt: null } } });
        post.mockResolvedValue({ sentAt: '2026-11-23T10:00:00Z' });
        const { result } = renderHook(() => useAskDates('evt-1'), { wrapper });
        act(() => {
            result.current.openForCard('Aegean Weddings');
            result.current.setDate(min);
            result.current.setPhone('+30 690 000 0000');
            result.current.setConsent(true);
        });
        await act(() => result.current.submit());

        expect(post.mock.calls[0][0]).toBe('/api/events/evt-1/partner-branding/inquiries');
        expect(post.mock.calls[0][1].phone).toBe('+30 690 000 0000');
    });

    it('shows the server error in the sheet', async () => {
        post.mockRejectedValue(new ApiError(409, { status: 409, code: 5230, detail: 'already' }));
        const { result } = renderHook(() => useAskDates('evt-1'), { wrapper });
        act(() => {
            result.current.openForVendor('v1', 'Lens & Light');
            result.current.setDate(min);
            result.current.setConsent(true);
        });
        await act(() => result.current.submit());

        expect(result.current.sent).toBe(false);
        expect(result.current.sendError).toBe('You already asked them.');
    });
});
```

The `ApiError` constructor and the code field may differ. Before you run the test, check `lib/api/client.ts` and copy how an existing test builds one: `grep -rn "new ApiError(" --include=*.test.ts* . | head -3`.

- [ ] **Step 2: Run it and confirm it fails.** Run `npx vitest run hooks/useAskDates.test.tsx`.

- [ ] **Step 3: Implement**

```ts
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAuth } from '@/hooks/useAuth';
import { eventKeys } from '@/hooks/useEvent';
import { vendorKeys } from '@/hooks/useVendors';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EventDetailResponseDto, GuestInquiryRequestDto, GuestInquirySentDto, VendorRowDto } from '@/lib/api/types';
import { inquiryDateBounds, markCardInquirySent, markVendorInquirySent } from '@/lib/inquiries';

export type AskDatesTarget = { kind: 'vendor'; vendorId: string; name: string } | { kind: 'card'; name: string };

// "Ask about my date": the sheet's fields for whichever partner was tapped, the send, and the card's new state.
export function useAskDates(eventId: string) {
    const t = useTranslations('Vendors.inquiry');
    const toErrorMessage = useApiErrorMessage();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [target, setTarget] = useState<AskDatesTarget | null>(null);
    const [date, setDateValue] = useState('');
    const [phone, setPhoneValue] = useState('');
    const [email, setEmailValue] = useState('');
    const [note, setNote] = useState('');
    const [consent, setConsent] = useState(false);
    const [dateError, setDateError] = useState<string | null>(null);
    const [contactError, setContactError] = useState<string | null>(null);
    const [sendError, setSendError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);
    // Fixed for the screen's life: a sheet left open past midnight still lets the server have the last word.
    const dateBounds = useMemo(() => inquiryDateBounds(), []);
    const send = useMutation({
        mutationFn: ({ to, body }: { to: AskDatesTarget; body: GuestInquiryRequestDto }) =>
            api.post<GuestInquirySentDto>(
                to.kind === 'vendor' ? endpoints.events.vendorInquiries(eventId, to.vendorId) : endpoints.events.partnerBrandingInquiries(eventId),
                body,
            ),
    });

    const open = useCallback(
        (next: AskDatesTarget) => {
            setTarget(next);
            setDateValue('');
            setPhoneValue('');
            setEmailValue(user?.email?.trim() ?? '');
            setNote('');
            setConsent(false);
            setDateError(null);
            setContactError(null);
            setSendError(null);
            setSent(false);
        },
        [user?.email],
    );
    const openForVendor = useCallback((vendorId: string, name: string) => open({ kind: 'vendor', vendorId, name }), [open]);
    const openForCard = useCallback((name: string) => open({ kind: 'card', name }), [open]);
    const close = useCallback(() => setTarget(null), []);

    const setDate = useCallback((next: string) => {
        setDateValue(next);
        setDateError(null);
    }, []);
    const setPhone = useCallback((next: string) => {
        setPhoneValue(next);
        setContactError(null);
    }, []);
    const setEmail = useCallback((next: string) => {
        setEmailValue(next);
        setContactError(null);
    }, []);

    const markSent = useCallback(
        (to: AskDatesTarget, sentAt: string) => {
            if (to.kind === 'vendor') {
                queryClient.setQueryData<VendorRowDto[]>(vendorKeys.list(eventId), (rows) => markVendorInquirySent(rows, to.vendorId, sentAt));
            } else {
                queryClient.setQueryData<EventDetailResponseDto>(eventKeys.detail(eventId), (event) => markCardInquirySent(event, sentAt));
            }
        },
        [eventId, queryClient],
    );

    const submit = useCallback(async () => {
        if (!target) return;
        const trimmedPhone = phone.trim();
        const trimmedEmail = email.trim();
        const trimmedNote = note.trim();
        setDateError(date ? null : t('dateRequired'));
        setContactError(trimmedPhone || trimmedEmail ? null : t('contactRequired'));
        if (!date || !(trimmedPhone || trimmedEmail) || !consent) return;
        setSendError(null);
        try {
            const result = await send.mutateAsync({
                to: target,
                body: {
                    eventDate: date,
                    ...(trimmedPhone && { phone: trimmedPhone }),
                    ...(trimmedEmail && { email: trimmedEmail }),
                    ...(trimmedNote && { note: trimmedNote }),
                    consent: true,
                },
            });
            markSent(target, result.sentAt);
            setSent(true);
        } catch (error) {
            setSendError(toErrorMessage(error));
        }
    }, [consent, date, email, markSent, note, phone, send, t, target, toErrorMessage]);

    return {
        target,
        openForVendor,
        openForCard,
        close,
        date,
        setDate,
        phone,
        setPhone,
        email,
        setEmail,
        note,
        setNote,
        consent,
        setConsent,
        dateError,
        contactError,
        sendError,
        sent,
        isSending: send.isPending,
        // Send stays off until the guest agrees to share their details.
        canSend: consent && !send.isPending,
        dateBounds,
        submit,
    };
}
```

- [ ] **Step 4: Run and confirm it passes.** Run `npx vitest run hooks/useAskDates.test.tsx`.

- [ ] **Step 5: Commit**

```bash
git add hooks/useAskDates.ts hooks/useAskDates.test.tsx
git commit -m "KAN-20: useAskDates hook"
```

---

### Task 5: `AskDatesButton` and `AskDatesSheet`

**Files:**
- Create: `components/vendors/inquiries/AskDatesButton.tsx`, `AskDatesSheet.tsx`
- Create: `components/vendors/inquiries/AskDatesSheet.test.tsx`, `AskDatesButton.test.tsx`
- Create: `components/vendors/inquiries/AskDatesSheet.stories.tsx`

Before writing, run the `design:design-system` skill on `BusinessContactSheet` and `VendorCardAction`, as CLAUDE.md asks for UI work. Then match their spacing, sizes and focus handling.

- [ ] **Step 1: Write the failing tests**

`AskDatesButton.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AskDatesButton } from '@/components/vendors/inquiries/AskDatesButton';
import messages from '@/messages/en.json';

function renderButton(sentAt: string | null, onAsk = vi.fn()) {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <AskDatesButton state={{ canAsk: sentAt === null, sentAt }} onAskAction={onAsk} />
        </NextIntlClientProvider>,
    );
    return onAsk;
}

describe('AskDatesButton', () => {
    afterEach(cleanup);

    it('opens the sheet', () => {
        const onAsk = renderButton(null);
        fireEvent.click(screen.getByRole('button', { name: 'Ask about my date' }));
        expect(onAsk).toHaveBeenCalled();
    });

    it('shows it was sent and does nothing', () => {
        renderButton('2026-11-23T10:00:00Z');
        expect(screen.getByRole('button', { name: 'Already sent' })).toBeDisabled();
    });
});
```

`AskDatesSheet.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AskDatesSheet } from '@/components/vendors/inquiries/AskDatesSheet';
import messages from '@/messages/en.json';

function renderSheet(overrides: Partial<ComponentProps<typeof AskDatesSheet>> = {}) {
    const props: ComponentProps<typeof AskDatesSheet> = {
        name: 'Lens & Light',
        date: '',
        phone: '',
        email: 'maria@example.com',
        note: '',
        consent: false,
        dateBounds: { min: '2026-11-23', max: '2029-11-23' },
        dateError: null,
        contactError: null,
        sendError: null,
        sent: false,
        isSending: false,
        canSend: false,
        onDateChangeAction: vi.fn(),
        onPhoneChangeAction: vi.fn(),
        onEmailChangeAction: vi.fn(),
        onNoteChangeAction: vi.fn(),
        onConsentChangeAction: vi.fn(),
        onSubmitAction: vi.fn(),
        onCloseAction: vi.fn(),
        ...overrides,
    };
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <AskDatesSheet {...props} />
        </NextIntlClientProvider>,
    );
    return props;
}

describe('AskDatesSheet', () => {
    afterEach(cleanup);

    it('keeps Send off until the guest agrees to share their details', () => {
        renderSheet();
        expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
        expect(screen.getByRole('checkbox', { name: 'Share my name and contact details with Lens & Light.' })).not.toBeChecked();
    });

    it('limits the date to today and three years ahead', () => {
        renderSheet();
        const date = screen.getByLabelText('Your event date');
        expect(date).toHaveAttribute('min', '2026-11-23');
        expect(date).toHaveAttribute('max', '2029-11-23');
    });

    it('sends', () => {
        const props = renderSheet({ consent: true, canSend: true, date: '2027-06-12' });
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));
        expect(props.onSubmitAction).toHaveBeenCalled();
    });

    it('shows field errors next to their fields', () => {
        renderSheet({ dateError: 'Pick a date.', contactError: 'Add a phone or an email.' });
        expect(screen.getByLabelText('Your event date')).toHaveAccessibleDescription('Pick a date.');
        expect(screen.getByText('Add a phone or an email.')).toBeInTheDocument();
    });

    it('replaces the form with a confirmation once sent', () => {
        renderSheet({ sent: true });
        expect(screen.getByRole('status')).toHaveTextContent('Sent. Lens & Light will contact you.');
        expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
    });
});
```

The expected strings above are the proposed copy. Use the wording the owner approved in Task 1.

- [ ] **Step 2: Run them and confirm they fail.** Run `npx vitest run components/vendors/inquiries`.

- [ ] **Step 3: Implement the button**

```tsx
'use client';

import { CalendarCheck, CalendarDays } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import type { InquiryStateDto } from '@/lib/api/types';

// "Ask about my date" on a partner's card. Once sent it stays, disabled, so the guest knows they already asked.
export function AskDatesButton({ state, onAskAction, className }: { state: InquiryStateDto; onAskAction: () => void; className?: string }) {
    const t = useTranslations('Vendors.inquiry');

    return state.canAsk ? (
        <Button type="button" size="sm" onClick={onAskAction} className={className}>
            <CalendarDays className="size-4" aria-hidden="true" />
            {t('ask')}
        </Button>
    ) : (
        <Button type="button" size="sm" variant="outline" disabled className={className}>
            <CalendarCheck className="size-4" aria-hidden="true" />
            {t('alreadySent')}
        </Button>
    );
}
```

Look at `VendorCardAction` for the size and rounding the vendor card's buttons use, and give this button the same (for example `rounded-full`).

- [ ] **Step 4: Implement the sheet**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useId } from 'react';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { INQUIRY_NOTE_MAX } from '@/lib/inquiries';

const FIELD = 'min-h-11 rounded-lg border border-border bg-background px-3';

// "Ask about my date": the date, a way to reach the guest, a note and their consent, then a short confirmation.
// It can't be dismissed while sending.
export function AskDatesSheet({
    name,
    date,
    phone,
    email,
    note,
    consent,
    dateBounds,
    dateError,
    contactError,
    sendError,
    sent,
    isSending,
    canSend,
    onDateChangeAction,
    onPhoneChangeAction,
    onEmailChangeAction,
    onNoteChangeAction,
    onConsentChangeAction,
    onSubmitAction,
    onCloseAction,
}: {
    name: string;
    date: string;
    phone: string;
    email: string;
    note: string;
    consent: boolean;
    dateBounds: { min: string; max: string };
    dateError: string | null;
    contactError: string | null;
    sendError: string | null;
    sent: boolean;
    isSending: boolean;
    canSend: boolean;
    onDateChangeAction: (value: string) => void;
    onPhoneChangeAction: (value: string) => void;
    onEmailChangeAction: (value: string) => void;
    onNoteChangeAction: (value: string) => void;
    onConsentChangeAction: (value: boolean) => void;
    onSubmitAction: () => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('Vendors.inquiry');
    const dateErrorId = useId();
    const contactErrorId = useId();

    const onDate = (event: ChangeEvent<HTMLInputElement>) => onDateChangeAction(event.target.value);
    const onPhone = (event: ChangeEvent<HTMLInputElement>) => onPhoneChangeAction(event.target.value);
    const onEmail = (event: ChangeEvent<HTMLInputElement>) => onEmailChangeAction(event.target.value);
    const onNote = (event: ChangeEvent<HTMLTextAreaElement>) => onNoteChangeAction(event.target.value);
    const onConsent = (event: ChangeEvent<HTMLInputElement>) => onConsentChangeAction(event.target.checked);
    function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        onSubmitAction();
    }

    return (
        <Modal open onClose={onCloseAction} variant="sheet" size="sm" closeDisabled={isSending} ariaLabel={t('sheetTitle', { name })} closeLabel={t('close')}>
            <Modal.Body className="px-5 pt-5 pb-6">
                {/* Header */}
                <h2 className="pr-8 text-base font-bold text-ink">{t('sheetTitle', { name })}</h2>

                {sent ? (
                    /* Sent */
                    <div className="mt-4 flex flex-col gap-4">
                        <InquirySentArt />
                        <p role="status" className="text-sm text-ink">
                            {t('sent', { name })}
                        </p>
                        <Button type="button" size="lg" onClick={onCloseAction}>
                            {t('close')}
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4" noValidate>
                        {/* Date */}
                        <div className="flex flex-col gap-1">
                            <label className="flex flex-col gap-1 text-sm text-ink">
                                {t('date')}
                                <input
                                    type="date"
                                    value={date}
                                    min={dateBounds.min}
                                    max={dateBounds.max}
                                    onChange={onDate}
                                    aria-invalid={dateError ? true : undefined}
                                    aria-describedby={dateError ? dateErrorId : undefined}
                                    className={FIELD}
                                />
                            </label>
                            {dateError && (
                                <p id={dateErrorId} role="alert" className="text-xs text-status-danger">
                                    {dateError}
                                </p>
                            )}
                        </div>

                        {/* Contact */}
                        <div className="flex flex-col gap-3">
                            <label className="flex flex-col gap-1 text-sm text-ink">
                                {t('phone')}
                                <input
                                    type="tel"
                                    autoComplete="tel"
                                    value={phone}
                                    onChange={onPhone}
                                    maxLength={40}
                                    aria-describedby={contactError ? contactErrorId : undefined}
                                    className={FIELD}
                                />
                            </label>
                            <label className="flex flex-col gap-1 text-sm text-ink">
                                {t('email')}
                                <input
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={onEmail}
                                    maxLength={254}
                                    aria-describedby={contactError ? contactErrorId : undefined}
                                    className={FIELD}
                                />
                            </label>
                            {contactError && (
                                <p id={contactErrorId} role="alert" className="text-xs text-status-danger">
                                    {contactError}
                                </p>
                            )}
                        </div>

                        {/* Note */}
                        <label className="flex flex-col gap-1 text-sm text-ink">
                            {t('note')}
                            <textarea
                                value={note}
                                onChange={onNote}
                                maxLength={INQUIRY_NOTE_MAX}
                                rows={3}
                                className="rounded-lg border border-border bg-background px-3 py-2"
                            />
                        </label>

                        {/* Consent */}
                        <label className="flex items-start gap-3 text-sm text-ink">
                            <input type="checkbox" checked={consent} onChange={onConsent} className="mt-0.5 size-5 shrink-0 accent-primary" />
                            <span>{t('consent', { name })}</span>
                        </label>

                        {/* Send error */}
                        {sendError && (
                            <p role="alert" className="text-sm text-status-danger">
                                {sendError}
                            </p>
                        )}

                        {/* Footer */}
                        <Button type="submit" size="lg" disabled={!canSend}>
                            {isSending ? t('sending') : t('send')}
                        </Button>
                    </form>
                )}
            </Modal.Body>
        </Modal>
    );
}
```

- [ ] **Step 4b: The sent illustration (owner's request).** Create `components/vendors/inquiries/InquirySentArt.tsx` and `InquirySentArt.test.tsx`. Render it above the `sent` line, as shown in the sheet above.
  - Draw an inline SVG of an envelope, about 160px wide and centred. Use the brand coral and warm gradient from `public/icons` (read two of those SVGs for the colours). Don't use a 3D emoji or hearts.
  - Animate it with `framer-motion` (`import { motion, useReducedMotion } from 'framer-motion'`, as in `QrWeddingFinalCtaButton`). Once, on mount, over about 1.2s: the envelope closes its flap, lifts and tilts, then flies up and to the right while a soft dashed trail draws behind it. It then settles back into place, small and floating gently. It shouldn't vanish, so the screen never looks empty.
  - With `useReducedMotion()` true, show the final still envelope with no motion.
  - Accessibility: on the `<svg>`, set `role="img"` and `aria-label={tAlt('inquirySent')}`, with `tAlt = useTranslations('ImageAlt')`. Never leave it empty.
  - Test: it renders `getByRole('img', { name: 'Inquiry sent' })`, and the sheet test's `Sent` case also finds that image.
  - The `Sent` story shows it. The visual check runs with reduced motion or a settled frame. Check how other framer-motion stories avoid flaky shots, and make sure the final frame is what gets captured.

- [ ] **Step 5: Run and confirm they pass.** Run `npx vitest run components/vendors/inquiries`.

- [ ] **Step 6: Stories.** Create `AskDatesSheet.stories.tsx`, modelled on `PartnerFeedCard.stories.tsx`. Use `fn()` from `storybook/test` for every `on…Action` prop. Stories:
  - `Empty`
  - `Filled`: date, email, note, consent ticked, `canSend`
  - `Errors`: `dateError` and `contactError` set
  - `SendError`: `sendError` set
  - `Sent`

Put the `AskDatesButton` stories in the same file as a second export. If that clashes with the project's one-component-per-file rule, use a separate `AskDatesButton.stories.tsx` with `CanAsk` and `AlreadySent`.

- [ ] **Step 7: Commit**

```bash
git add components/vendors/inquiries
git commit -m "KAN-20: Ask about my date button and sheet"
```

---

### Task 6: On the Vendors page

**Files:** Modify `components/vendors/list/VendorListRow.tsx`, `components/vendors/list/VendorListScreen.tsx`. Test: extend `VendorListRow`'s test if it has one (`ls components/vendors/list/*.test.tsx`); otherwise create `VendorListRow.test.tsx`.

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VendorListRow } from '@/components/vendors/list/VendorListRow';
import type { VendorRowDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const VENDOR: VendorRowDto = {
    id: 'v1',
    memberId: 'm1',
    vendorType: 'PHOTOGRAPHER',
    businessName: 'Lens & Light',
    link: null,
    logoUrl: null,
    joinedAt: '2026-10-01T10:00:00Z',
};

function renderRow(vendor: VendorRowDto, onAsk = vi.fn()) {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <ul>
                <VendorListRow vendor={vendor} onOpenAction={vi.fn()} onAskAction={onAsk} />
            </ul>
        </NextIntlClientProvider>,
    );
    return onAsk;
}

describe('VendorListRow asking', () => {
    afterEach(cleanup);

    it('offers no ask on a vendor who is not a partner', () => {
        renderRow(VENDOR);
        expect(screen.queryByRole('button', { name: 'Ask about my date' })).not.toBeInTheDocument();
    });

    it('asks a partner', () => {
        const onAsk = renderRow({ ...VENDOR, inquiry: { canAsk: true, sentAt: null } });
        fireEvent.click(screen.getByRole('button', { name: 'Ask about my date' }));
        expect(onAsk).toHaveBeenCalledWith(expect.objectContaining({ id: 'v1' }));
    });
});
```

If `VendorBanner` or `VendorLogo` need mocks (`next/image`), copy the mocks an existing vendors test uses.

- [ ] **Step 2: Run it and confirm it fails.**

- [ ] **Step 3: Implement.** In `VendorListRow`:
  1. Add a prop `onAskAction: (vendor: VendorRowDto) => void`.
  2. Show the links block when there are actions **or** an inquiry, and put the button last in it:

```tsx
                {/* Links and ask */}
                {(actions.length > 0 || vendor.inquiry) && (
                    <div className="mt-auto flex flex-wrap gap-2 pt-4">
                        {actions.map((action) => (
                            <VendorCardAction key={action.kind} action={action} vendor={vendor} onOpenAction={onOpenAction} />
                        ))}
                        {vendor.inquiry && <AskDatesButton state={vendor.inquiry} onAskAction={() => onAskAction(vendor)} />}
                    </div>
                )}
```

  3. Update the component comment: the card itself is not a link; only the buttons are, and a partner's card also lets guests ask about a date.

In `VendorListScreen`:

```tsx
    const ask = useAskDates(eventId);
    const { openForVendor } = ask;
    const askVendor = useCallback((vendor: VendorRowDto) => openForVendor(vendor.id, vendor.businessName ?? ''), [openForVendor]);
```

Pass `onAskAction={askVendor}` to each `VendorListRow`, and after the list:

```tsx
            {/* Ask sheet */}
            {ask.target && (
                <AskDatesSheet
                    name={ask.target.name}
                    date={ask.date}
                    phone={ask.phone}
                    email={ask.email}
                    note={ask.note}
                    consent={ask.consent}
                    dateBounds={ask.dateBounds}
                    dateError={ask.dateError}
                    contactError={ask.contactError}
                    sendError={ask.sendError}
                    sent={ask.sent}
                    isSending={ask.isSending}
                    canSend={ask.canSend}
                    onDateChangeAction={ask.setDate}
                    onPhoneChangeAction={ask.setPhone}
                    onEmailChangeAction={ask.setEmail}
                    onNoteChangeAction={ask.setNote}
                    onConsentChangeAction={ask.setConsent}
                    onSubmitAction={ask.submit}
                    onCloseAction={ask.close}
                />
            )}
```

`openForVendor` is stable (a `useCallback` in the hook), so `askVendor` is too.

- [ ] **Step 4: Run** `npx vitest run components/vendors` and `npx tsc --noEmit`. Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add components/vendors/list
git commit -m "KAN-20: ask a partner from the Vendors page"
```

---

### Task 7: On the feed card

**Files:**
- Modify: `components/feed/partner/PartnerFeatureCard.tsx`, `components/feed/partner/PartnerFeedCard.tsx`
- Modify: `app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageContent.tsx`
- Modify: `components/feed/partner/PartnerFeedCard.stories.tsx`
- Test: `components/feed/partner/PartnerFeedCard.test.tsx` (create, or extend the existing one)

The whole feature card is one link. A button can't sit inside a link, so the ringed frame moves to a wrapper, and the action sits under the link inside that frame. Without an action, the card looks exactly as it does now.

- [ ] **Step 1: Write the failing test**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PartnerFeedCard } from '@/components/feed/partner/PartnerFeedCard';
import type { PartnerBrandingDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { email: 'maria@example.com' } }) }));

const BRANDING: PartnerBrandingDto = {
    variant: 'FEATURE_CARD',
    displayName: 'Aegean Weddings',
    role: 'PLANNER',
    logoUrl: '/landing/decor-03.webp',
    coverUrl: '/landing/03-wedding-ceremony-santorini.webp',
    tagline: { en: 'Island weddings.', el: 'Γάμοι στα νησιά.' },
    services: { en: 'Planning', el: 'Οργάνωση' },
    linkUrl: '/api/partner-branding/click/abc',
    placement: { firstAfter: 2, every: 6 },
};

function renderCard(branding: PartnerBrandingDto) {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
                <PartnerFeedCard branding={branding} eventId="evt-1" />
            </NextIntlClientProvider>
        </QueryClientProvider>,
    );
}

describe('PartnerFeedCard asking', () => {
    afterEach(cleanup);

    it('opens the ask sheet from the feature card, outside its link', () => {
        renderCard({ ...BRANDING, inquiry: { canAsk: true, sentAt: null } });
        const ask = screen.getByRole('button', { name: 'Ask about my date' });
        expect(ask.closest('a')).toBeNull();
        fireEvent.click(ask);
        expect(screen.getByRole('dialog', { name: 'Ask Aegean Weddings' })).toBeInTheDocument();
    });

    it('offers no ask without an inquiry state', () => {
        renderCard(BRANDING);
        expect(screen.queryByRole('button', { name: 'Ask about my date' })).not.toBeInTheDocument();
    });

    it('offers no ask on the compact row', () => {
        renderCard({ ...BRANDING, variant: 'COMPACT_ROW', inquiry: { canAsk: true, sentAt: null } });
        expect(screen.queryByRole('button', { name: 'Ask about my date' })).not.toBeInTheDocument();
    });
});
```

Check how `PartnerCardLink` and `ProtectedImage` behave in jsdom, and how the Modal labels its dialog. If an existing feed test mocks them, copy those mocks.

- [ ] **Step 2: Run it and confirm it fails.**

- [ ] **Step 3: `PartnerFeatureCard`.** Add `action?: ReactNode` and restructure:

```tsx
// Variant FEATURE_CARD: cover photo, tagline and a button. coverSizes is the cover's rendered width when the card
// sits somewhere narrower than the feed (a preview). action sits under the link, inside the card: the feed puts
// "Ask about my date" there; previews leave it out.
export function PartnerFeatureCard({
    content,
    coverSizes = FEED_COVER_SIZES,
    action,
}: {
    content: PartnerBrandingCardContent;
    coverSizes?: string;
    action?: ReactNode;
}) {
    return (
        <article className="border-b border-event-card-line bg-event-card px-2 py-4">
            <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
                <PartnerCardLink href={content.href} newTabLabel={content.newTabLabel} className="group block">
                    {/* Cover */}
                    {/* …unchanged… */}

                    {/* Partner */}
                    {/* …unchanged… */}

                    {/* Tagline */}
                    {/* …unchanged… */}

                    {/* Visit */}
                    <div className={action ? 'px-4 pt-3' : 'px-4 pt-3 pb-4'}>
                        {/* …unchanged span… */}
                    </div>
                </PartnerCardLink>

                {/* Ask */}
                {action && <div className="px-4 pt-2 pb-4">{action}</div>}
            </div>
        </article>
    );
}
```

Keep the four inner blocks exactly as they are. Only the outer frame moves. Rename the old `{/* Action */}` comment to `{/* Visit */}`.

- [ ] **Step 4: `PartnerFeedCard`.** Add `eventId`, and own the sheet:

```tsx
export function PartnerCardVariant({
    variant,
    content,
    coverSizes,
    action,
}: {
    variant: BrandingVariant;
    content: PartnerBrandingCardContent;
    coverSizes?: string;
    action?: ReactNode;
}) {
    if (variant === 'FEATURE_CARD') return <PartnerFeatureCard content={content} coverSizes={coverSizes} action={action} />;
    if (variant === 'COMPACT_ROW') return <PartnerCompactRow content={content} />;
    return <PartnerCredit content={content} />;
}

// No reactions, comments, reporting or menu. A tap opens the click redirect in a new tab. On the feature card, a guest
// can also ask the partner about a date.
export function PartnerFeedCard({ branding, eventId }: { branding: PartnerBrandingDto; eventId: string }) {
    const content = usePartnerBrandingCard(branding);
    const ask = useAskDates(eventId);
    const action = branding.inquiry ? (
        <AskDatesButton state={branding.inquiry} onAskAction={() => ask.openForCard(branding.displayName)} />
    ) : undefined;

    return (
        <>
            <PartnerCardVariant variant={branding.variant} content={content} action={action} />

            {/* Ask sheet */}
            {ask.target && <AskDatesSheet {/* same props as in VendorListScreen, from ask */} />}
        </>
    );
}
```

Spell out every prop, as in Task 6. Don't use a spread helper that hides them.

The sheet is the same in both places. If spelling it out twice bothers you, add `components/vendors/inquiries/AskDatesSheetFor.tsx`. It takes the whole `useAskDates` result as one `ask` prop and renders `AskDatesSheet` with it. Use it in both places. Then `AskDatesSheet` stays presentational and the wiring lives in one file.

- [ ] **Step 5: `FeedPageContent.tsx`.** Pass `eventId={eventId}` to `PartnerFeedCard`.

- [ ] **Step 6: Stories.** In `PartnerFeedCard.stories.tsx`:
  - add `eventId: 'evt-demo'` to `args`
  - add the stories `FeatureCardAsk` (`inquiry: { canAsk: true, sentAt: null }`) and `FeatureCardAlreadySent` (`inquiry: { canAsk: false, sentAt: '2026-11-23T10:00:00Z' }`)

If the stories file has no QueryClient decorator and the component now needs one, add the project's usual decorator; see `.storybook/preview.tsx`.

- [ ] **Step 7: Run** `npx vitest run components/feed/partner` and `npx tsc --noEmit`. Expected: pass. Other `PartnerFeedCard` callers (`grep -rn "<PartnerFeedCard\|<PartnerCardVariant" app components`) must still compile. Only the feed passes `eventId`, so make it required, and fix any other caller.

- [ ] **Step 8: Commit**

```bash
git add components/feed/partner "app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageContent.tsx" components/vendors/inquiries
git commit -m "KAN-20: ask the feed card's partner about a date"
```

---

### Task 8: `useGuestInquiries`

**Files:**
- Modify: `hooks/useBusinessOverview.ts` (key)
- Create: `hooks/useGuestInquiries.ts`, `hooks/useGuestInquiries.test.tsx`

- [ ] **Step 1: Key.** Add `inquiries: ['business', 'inquiries'] as const,` to `businessKeys`.

- [ ] **Step 2: Write the failing test**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGuestInquiries } from '@/hooks/useGuestInquiries';
import type { GuestInquiryDto } from '@/lib/api/types';

const get = vi.hoisted(() => vi.fn());
const patch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/api/client')>()),
    api: { get, patch },
}));

const ROW: GuestInquiryDto = {
    id: 'q1',
    guestName: 'Maria P',
    eventTitle: 'Anna & Nikos',
    eventDate: '2027-06-12',
    phone: null,
    email: 'maria@example.com',
    note: null,
    status: 'NEW',
    createdAt: '2026-11-23T10:00:00Z',
};

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useGuestInquiries', () => {
    beforeEach(() => {
        client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        get.mockReset();
        patch.mockReset();
    });

    it('reads nothing for a non-partner', () => {
        renderHook(() => useGuestInquiries(false), { wrapper });
        expect(get).not.toHaveBeenCalled();
    });

    it('lists the first page and opens one', async () => {
        get.mockResolvedValue({ content: [ROW], page: { number: 0, size: 20, totalElements: 1, totalPages: 1 } });
        const { result } = renderHook(() => useGuestInquiries(true), { wrapper });
        await waitFor(() => expect(result.current.inquiries).toHaveLength(1));

        expect(get).toHaveBeenCalledWith('/api/me/business/inquiries?page=0&size=20');
        expect(result.current.hasMore).toBe(false);
        act(() => result.current.open('q1'));
        expect(result.current.selected?.id).toBe('q1');
    });

    it('marks one done and updates the row in place', async () => {
        get.mockResolvedValue({ content: [ROW], page: { number: 0, size: 20, totalElements: 1, totalPages: 1 } });
        patch.mockResolvedValue({ ...ROW, status: 'DONE' });
        const { result } = renderHook(() => useGuestInquiries(true), { wrapper });
        await waitFor(() => expect(result.current.inquiries).toHaveLength(1));
        act(() => result.current.open('q1'));
        await act(() => result.current.setDone(true));

        expect(patch).toHaveBeenCalledWith('/api/me/business/inquiries/q1', { done: true });
        expect(result.current.inquiries[0].status).toBe('DONE');
        expect(result.current.selected?.status).toBe('DONE');
    });
});
```

- [ ] **Step 3: Run it and confirm it fails.**

- [ ] **Step 4: Implement**

```ts
'use client';

import { type InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { businessKeys } from '@/hooks/useBusinessOverview';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { Page } from '@/lib/api/pagination';
import type { GuestInquiryDto } from '@/lib/api/types';

export const GUEST_INQUIRIES_PAGE_SIZE = 20;

// The partner's guest inquiries on My business, newest first, and the one open in the sheet. Read only for partners.
export function useGuestInquiries(enabled: boolean) {
    const queryClient = useQueryClient();
    const toErrorMessage = useApiErrorMessage();
    const [openId, setOpenId] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const query = useInfiniteQuery({
        queryKey: businessKeys.inquiries,
        queryFn: ({ pageParam }) => api.get<Page<GuestInquiryDto>>(endpoints.me.businessInquiries(pageParam, GUEST_INQUIRIES_PAGE_SIZE)),
        initialPageParam: 0,
        getNextPageParam: (last) => (last.page.number + 1 < last.page.totalPages ? last.page.number + 1 : undefined),
        enabled,
    });
    const save = useMutation({
        mutationFn: ({ id, done }: { id: string; done: boolean }) => api.patch<GuestInquiryDto>(endpoints.me.businessInquiry(id), { done }),
        onSuccess: (row) =>
            queryClient.setQueryData<InfiniteData<Page<GuestInquiryDto>>>(businessKeys.inquiries, (data) =>
                data
                    ? { ...data, pages: data.pages.map((page) => ({ ...page, content: page.content.map((item) => (item.id === row.id ? row : item)) })) }
                    : data,
            ),
    });
    const inquiries = query.data?.pages.flatMap((page) => page.content) ?? [];

    const open = useCallback((id: string) => {
        setSaveError(null);
        setOpenId(id);
    }, []);
    const close = useCallback(() => setOpenId(null), []);
    const setDone = useCallback(
        async (done: boolean) => {
            if (!openId) return;
            setSaveError(null);
            try {
                await save.mutateAsync({ id: openId, done });
            } catch (error) {
                setSaveError(toErrorMessage(error));
            }
        },
        [openId, save, toErrorMessage],
    );

    return {
        inquiries,
        isLoading: query.isLoading,
        loadFailed: Boolean(query.error) && inquiries.length === 0,
        hasMore: Boolean(query.hasNextPage),
        isLoadingMore: query.isFetchingNextPage,
        loadMore: () => void query.fetchNextPage(),
        retry: () => void query.refetch(),
        selected: inquiries.find((item) => item.id === openId) ?? null,
        open,
        close,
        setDone,
        isSaving: save.isPending,
        saveError,
    };
}
```

If `api.patch` doesn't exist in `lib/api/client.ts`, use whatever the other PATCH hooks use (`grep -rn "api\.patch\|method: 'PATCH'" hooks | head -3`).

- [ ] **Step 5: Run and confirm it passes.**

- [ ] **Step 6: Commit**

```bash
git add hooks/useBusinessOverview.ts hooks/useGuestInquiries.ts hooks/useGuestInquiries.test.tsx
git commit -m "KAN-20: useGuestInquiries hook"
```

---

### Task 9: The partner's section, rows and sheet

**Files:**
- Create: `components/business/GuestInquiriesSection.tsx`, `InquiryRow.tsx`, `InquirySheet.tsx`
- Create: `components/business/GuestInquiriesSection.test.tsx`, `InquirySheet.test.tsx`, `GuestInquiriesSection.stories.tsx`, `InquirySheet.stories.tsx`
- Modify: `components/business/BusinessSectionIcon.tsx`

Run the `design:design-system` skill against `BusinessEventsSection` and `BusinessEventRow` first. The new section must read as a sibling of Events, with the same section frame, row height, dividers and More button.

- [ ] **Step 1: Write the failing tests**

`GuestInquiriesSection.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GuestInquiriesSection } from '@/components/business/GuestInquiriesSection';
import type { GuestInquiryDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const ROW: GuestInquiryDto = {
    id: 'q1',
    guestName: 'Maria P',
    eventTitle: 'Anna & Nikos',
    eventDate: '2027-06-12',
    phone: '+30 690 000 0000',
    email: null,
    note: 'Summer wedding',
    status: 'NEW',
    createdAt: '2026-11-23T10:00:00Z',
};

function renderSection(overrides: Partial<ComponentProps<typeof GuestInquiriesSection>> = {}) {
    const props: ComponentProps<typeof GuestInquiriesSection> = {
        partner: true,
        inquiries: [ROW, { ...ROW, id: 'q2', guestName: 'Nikos K', status: 'DONE' }],
        isLoading: false,
        loadFailed: false,
        hasMore: false,
        isLoadingMore: false,
        onOpenAction: vi.fn(),
        onLoadMoreAction: vi.fn(),
        onRetryAction: vi.fn(),
        ...overrides,
    };
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <GuestInquiriesSection {...props} />
        </NextIntlClientProvider>,
    );
    return props;
}

describe('GuestInquiriesSection', () => {
    afterEach(cleanup);

    it('lists inquiries with a New badge only on new ones, and opens one', () => {
        const props = renderSection();
        expect(screen.getAllByText('New')).toHaveLength(1);
        fireEvent.click(screen.getByRole('button', { name: /Maria P/ }));
        expect(props.onOpenAction).toHaveBeenCalledWith('q1');
    });

    it('says when there are none', () => {
        renderSection({ inquiries: [] });
        expect(screen.getByText('No inquiries yet')).toBeInTheDocument();
    });

    it('offers a retry when the list failed', () => {
        const props = renderSection({ inquiries: [], loadFailed: true });
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(props.onRetryAction).toHaveBeenCalled();
    });

    it('shows a locked sample to a non-partner, with nothing to tap', () => {
        renderSection({ partner: false, inquiries: [] });
        expect(screen.getByText('Guest inquiries', { selector: 'p' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Maria/ })).not.toBeInTheDocument();
    });
});
```

`InquirySheet.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InquirySheet } from '@/components/business/InquirySheet';
import type { GuestInquiryDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

const ROW: GuestInquiryDto = {
    id: 'q1',
    guestName: 'Maria P',
    eventTitle: 'Anna & Nikos',
    eventDate: '2027-06-12',
    phone: '+30 690 000 0000',
    email: 'maria@example.com',
    note: 'Summer wedding',
    status: 'NEW',
    createdAt: '2026-11-23T10:00:00Z',
};

function renderSheet(inquiry: GuestInquiryDto, onDone = vi.fn()) {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
            <InquirySheet inquiry={inquiry} isSaving={false} error={null} onSetDoneAction={onDone} onCloseAction={vi.fn()} />
        </NextIntlClientProvider>,
    );
    return onDone;
}

describe('InquirySheet', () => {
    afterEach(cleanup);

    it('shows the date, event, note and ways to reply', () => {
        renderSheet(ROW);
        expect(screen.getByText('Jun 12, 2027')).toBeInTheDocument();
        expect(screen.getByText('Anna & Nikos')).toBeInTheDocument();
        expect(screen.getByText('Summer wedding')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Call/ })).toHaveAttribute('href', 'tel:+306900000000');
        expect(screen.getByRole('link', { name: /Email/ })).toHaveAttribute('href', 'mailto:maria@example.com');
    });

    it('leaves out a way to reply the guest did not give', () => {
        renderSheet({ ...ROW, phone: null });
        expect(screen.queryByRole('link', { name: /Call/ })).not.toBeInTheDocument();
    });

    it('marks done, and back to new', () => {
        const onDone = renderSheet(ROW);
        fireEvent.click(screen.getByRole('button', { name: 'Mark done' }));
        expect(onDone).toHaveBeenCalledWith(true);
        cleanup();
        const onNew = renderSheet({ ...ROW, status: 'DONE' });
        fireEvent.click(screen.getByRole('button', { name: 'Mark as new' }));
        expect(onNew).toHaveBeenCalledWith(false);
    });
});
```

- [ ] **Step 2: Run them and confirm they fail.**

- [ ] **Step 3: Section icon.** In `BusinessSectionIcon.tsx`:
  - add `'inquiries'` to `BusinessSectionKey`
  - add a tile: `inquiries: { icon: Inbox, wash: 'bg-status-good-wash', ink: 'text-status-good' },`

Contact already uses the good tones, so pick a wash/ink pair no other section uses. Check `app/globals.css` for the `status-*-wash` tokens. Update `BusinessSectionIcon.test.tsx` if it lists every key.

- [ ] **Step 4: `InquiryRow.tsx`**

```tsx
'use client';

import { ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import type { GuestInquiryDto } from '@/lib/api/types';
import { formatInquiryDate } from '@/lib/inquiries';

// One inquiry: who asked, the date they asked about and from which event, and New until the partner marks it done.
export function InquiryRow({ inquiry, onOpenAction }: { inquiry: GuestInquiryDto; onOpenAction: (id: string) => void }) {
    const t = useTranslations('BusinessPage.inquiries');
    const locale = useLocale();

    return (
        <li>
            <button type="button" onClick={() => onOpenAction(inquiry.id)} className="flex min-h-14 w-full items-center gap-3 py-3 text-left focus-ring">
                {/* Guest and date */}
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{inquiry.guestName}</p>
                    <p className="truncate text-xs leading-snug text-ink-muted">
                        {formatInquiryDate(locale, inquiry.eventDate)} · {inquiry.eventTitle}
                    </p>
                </div>

                {/* Status */}
                {inquiry.status === 'NEW' && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary-dark">{t('new')}</span>
                )}

                {/* Open marker */}
                <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            </button>
        </li>
    );
}
```

- [ ] **Step 5: `GuestInquiriesSection.tsx`**

```tsx
'use client';

import { Inbox } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { BusinessEmptyState } from '@/components/business/BusinessEmptyState';
import { BusinessSectionIcon } from '@/components/business/BusinessSectionIcon';
import { InquiryRow } from '@/components/business/InquiryRow';
import { Button } from '@/components/ui/button';
import { LockedPreview } from '@/components/vendors/me/LockedPreview';
import { VendorMeSection } from '@/components/vendors/me/VendorMeSection';
import { VendorRowsSkeleton } from '@/components/vendors/VendorsSkeletons';
import type { GuestInquiryDto } from '@/lib/api/types';
import { formatInquiryDate, SAMPLE_INQUIRIES } from '@/lib/inquiries';

// Guests' questions about the partner's dates, newest first. Non-partners see a locked sample; the page's one
// "Become a partner" prompt is in Insights, so this one only says it's for partners.
export function GuestInquiriesSection({
    partner,
    inquiries,
    isLoading,
    loadFailed,
    hasMore,
    isLoadingMore,
    onOpenAction,
    onLoadMoreAction,
    onRetryAction,
}: {
    partner: boolean;
    inquiries: GuestInquiryDto[];
    isLoading: boolean;
    loadFailed: boolean;
    hasMore: boolean;
    isLoadingMore: boolean;
    onOpenAction: (id: string) => void;
    onLoadMoreAction: () => void;
    onRetryAction: () => void;
}) {
    const t = useTranslations('BusinessPage.inquiries');
    const tEvents = useTranslations('BusinessPage.events');
    const tPartner = useTranslations('Vendors.partner.benefits.inquiries');
    const locale = useLocale();

    return (
        <VendorMeSection id="business-inquiries-title" title={t('title')} icon={<BusinessSectionIcon section="inquiries" />} busy={partner && isLoading}>
            {!partner ? (
                /* Locked */
                <LockedPreview label={tPartner('title')} canApply={false} onApplyAction={() => {}}>
                    <ul className="divide-y divide-border">
                        {SAMPLE_INQUIRIES.map((sample) => (
                            <li key={sample.guestName} className="flex min-h-14 flex-col justify-center py-3">
                                <p className="text-sm font-semibold text-ink">{sample.guestName}</p>
                                <p className="text-xs text-ink-muted">{formatInquiryDate(locale, sample.eventDate)}</p>
                            </li>
                        ))}
                    </ul>
                </LockedPreview>
            ) : isLoading ? (
                <VendorRowsSkeleton />
            ) : loadFailed ? (
                /* Failed */
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-ink-muted">{t('loadFailed')}</p>
                    <Button type="button" variant="outline" size="sm" onClick={onRetryAction} className="rounded-full">
                        {tEvents('retry')}
                    </Button>
                </div>
            ) : inquiries.length === 0 ? (
                /* Empty */
                <BusinessEmptyState icon={Inbox} title={t('emptyTitle')} body={t('emptyBody')} />
            ) : (
                <>
                    {/* Rows */}
                    <ul className="-my-3 divide-y divide-border">
                        {inquiries.map((inquiry) => (
                            <InquiryRow key={inquiry.id} inquiry={inquiry} onOpenAction={onOpenAction} />
                        ))}
                    </ul>

                    {/* More */}
                    {hasMore && (
                        <Button type="button" variant="outline" onClick={onLoadMoreAction} disabled={isLoadingMore} className="self-center rounded-full">
                            {tEvents('more')}
                        </Button>
                    )}
                </>
            )}
        </VendorMeSection>
    );
}
```

The locked test checks the label by `selector: 'p'`, because the section title has the same words. If the sample label and the section title reading the same looks repetitive on screen (CLAUDE.md: never show the same fact twice), tell the owner and suggest dropping the section title for non-partners. Don't change it without asking.

- [ ] **Step 6: `InquirySheet.tsx`**

```tsx
'use client';

import { Mail, Phone } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { GuestInquiryDto } from '@/lib/api/types';
import { formatInquiryDate } from '@/lib/inquiries';

// One inquiry: the date and event, ways to answer the guest, their note, and the partner's own done mark.
export function InquirySheet({
    inquiry,
    isSaving,
    error,
    onSetDoneAction,
    onCloseAction,
}: {
    inquiry: GuestInquiryDto;
    isSaving: boolean;
    error: string | null;
    onSetDoneAction: (done: boolean) => void;
    onCloseAction: () => void;
}) {
    const t = useTranslations('BusinessPage.inquiries');
    const locale = useLocale();
    const done = inquiry.status === 'DONE';

    return (
        <Modal open onClose={onCloseAction} variant="sheet" size="sm" ariaLabel={inquiry.guestName} closeLabel={t('close')}>
            <Modal.Body className="px-5 pt-5 pb-6">
                {/* Header */}
                <h2 className="pr-8 text-base font-bold text-ink">{inquiry.guestName}</h2>

                {/* Details */}
                <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                    <dt className="text-ink-muted">{t('date')}</dt>
                    <dd className="text-ink">{formatInquiryDate(locale, inquiry.eventDate)}</dd>
                    <dt className="text-ink-muted">{t('event')}</dt>
                    <dd className="min-w-0 truncate text-ink">{inquiry.eventTitle}</dd>
                </dl>

                {/* Note */}
                {inquiry.note && (
                    <div className="mt-4">
                        <p className="text-sm text-ink-muted">{t('note')}</p>
                        <p className="mt-1 text-sm whitespace-pre-line text-ink">{inquiry.note}</p>
                    </div>
                )}

                {/* Reply */}
                <div className="mt-5 flex flex-wrap gap-2">
                    {inquiry.phone && (
                        <Button asChild variant="outline" className="rounded-full">
                            <a href={`tel:${inquiry.phone.replace(/[^+\d]/g, '')}`}>
                                <Phone className="size-4" aria-hidden="true" />
                                {t('call')} {inquiry.phone}
                            </a>
                        </Button>
                    )}
                    {inquiry.email && (
                        <Button asChild variant="outline" className="rounded-full">
                            <a href={`mailto:${inquiry.email}`}>
                                <Mail className="size-4" aria-hidden="true" />
                                {t('writeEmail')} {inquiry.email}
                            </a>
                        </Button>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <p role="alert" className="mt-4 text-sm text-status-danger">
                        {error}
                    </p>
                )}

                {/* Footer */}
                <Button type="button" size="lg" variant={done ? 'outline' : 'default'} disabled={isSaving} onClick={() => onSetDoneAction(!done)} className="mt-5 w-full">
                    {done ? t('markNew') : t('markDone')}
                </Button>
            </Modal.Body>
        </Modal>
    );
}
```

Check that `Button` supports `asChild` (`grep -n "asChild" components/ui/button.tsx`). If it doesn't, style the links the way `VendorCardAction` styles its links.

- [ ] **Step 7: Run and confirm they pass.** Run `npx vitest run components/business`.

- [ ] **Step 8: Stories.** Base them on the existing business stories, or if there are none on `PartnerFeedCard.stories.tsx`.
  - `GuestInquiriesSection.stories.tsx`: `List` (3 rows, one DONE), `Empty`, `LoadFailed`, `Locked` (`partner: false`), `Loading`.
  - `InquirySheet.stories.tsx`: `New` (phone, email, note), `Done`, `EmailOnly`, `SaveError`.

- [ ] **Step 9: Commit**

```bash
git add components/business
git commit -m "KAN-20: guest inquiries section on My business"
```

---

### Task 10: Place it on My business, and list it as a partner benefit

**Files:**
- Modify: `hooks/useBusinessPage.ts`, `components/business/BusinessScreen.tsx`
- Modify: `lib/vendors.ts`
- Modify: `components/vendors/me/PartnerBenefitsSection.tsx`, only if its `ICONS` map is typed per key list
- Test: `components/business/BusinessScreen.test.tsx`

- [ ] **Step 1: Write the failing test.** Add to `BusinessScreen.test.tsx`, following how it already mocks the overview for a partner and for a non-partner:
  - a partner sees "Guest inquiries" with their rows (mock the `/api/me/business/inquiries?page=0&size=20` GET)
  - a non-partner sees the locked sample, and no request goes to that URL

- [ ] **Step 2: Run it and confirm it fails.**

- [ ] **Step 3: Hook.** In `useBusinessPage`:

```ts
    const inquiries = useGuestInquiries(partner);
```

Return `inquiries` and `partner`.

- [ ] **Step 4: Screen.** In `BusinessScreen`, in the main column right after `{/* Events */}`:

```tsx
                        {/* Guest inquiries */}
                        <GuestInquiriesSection
                            partner={overview.partner}
                            inquiries={page.inquiries.inquiries}
                            isLoading={page.inquiries.isLoading}
                            loadFailed={page.inquiries.loadFailed}
                            hasMore={page.inquiries.hasMore}
                            isLoadingMore={page.inquiries.isLoadingMore}
                            onOpenAction={page.inquiries.open}
                            onLoadMoreAction={page.inquiries.loadMore}
                            onRetryAction={page.inquiries.retry}
                        />
```

Next to the other sheets:

```tsx
            {/* Inquiry sheet */}
            {page.inquiries.selected && (
                <InquirySheet
                    inquiry={page.inquiries.selected}
                    isSaving={page.inquiries.isSaving}
                    error={page.inquiries.saveError}
                    onSetDoneAction={page.inquiries.setDone}
                    onCloseAction={page.inquiries.close}
                />
            )}
```

- [ ] **Step 5: Benefits.** In `lib/vendors.ts`:

```ts
export type PartnerBenefitKey = 'discount' | 'feedCard' | 'reach' | 'inquiries' | 'printPrices';
export type ComingPartnerBenefitKey = 'printKit' | 'eventPacks';

// What partners get today, for the vendor page's partner block. Print prices only mean something to photographers.
export function partnerBenefits(type: PartnerRole): PartnerBenefitKey[] {
    const benefits: PartnerBenefitKey[] = ['discount', 'feedCard', 'reach', 'inquiries'];
    return capabilitiesOfType(type).includes('PRINT_PICKS') ? [...benefits, 'printPrices'] : benefits;
}

// Partner features still being built (Jira KAN-22, KAN-21). Move one to partnerBenefits when it ships.
export const COMING_PARTNER_BENEFITS: readonly ComingPartnerBenefitKey[] = ['printKit', 'eventPacks'];
```

The wording `Vendors.partner.benefits.inquiries` stays as it is. Search for anything else that lists the benefits and update it:

```bash
grep -rn "'inquiries'\|COMING_PARTNER_BENEFITS\|partnerBenefits(" lib hooks components app --include=*.ts --include=*.tsx
```

Look for test expectations, the `ICONS` map, and the "coming soon" grid's `sm:grid-cols-3`, which now has 2 items. Ask the owner whether that grid should become 2 columns; don't change it unasked.

- [ ] **Step 6: Run** `npx vitest run components/business components/vendors lib hooks` and `npx tsc --noEmit`. Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add hooks/useBusinessPage.ts components/business lib/vendors.ts components/vendors/me
git commit -m "KAN-20: guest inquiries on My business; inquiries is a current partner benefit"
```

---

### Task 11: Checks, a look in the browser, and the PR

- [ ] **Step 1: Every check:** run `npx tsc --noEmit`, `npx eslint .`, `npx vitest run` and `npx next build`. All must be clean. Fix lint errors.

- [ ] **Step 2: Look at it.** Follow memory: open the browser pane only with `preview_start {url: "http://localhost:3000/"}`, never by name. Signed-in screens need the local backend from the backend branch, and the test login from the user.
  - **Vendors page as a guest:** check at 375px and at desktop width. Ask, send and confirm; then reload and confirm "Already sent".
  - **Feed card:** check the feature card, with and without the ask, and that the link still opens.
  - **My business as a partner:** check the list, the sheet, and Mark done and Mark as new.
  - **My business as a non-partner:** check the locked sample.

Make sure no text overlaps or wraps badly, and that the sections stay clearly separated.

- [ ] **Step 3: SEO check.** No route is new or changed, so `docs/seo-guidelines.md` doesn't apply. Say so in the PR.

- [ ] **Step 4: Demo.** The demo mocks every endpoint itself (memory: the demo inherits nothing). Without `inquiry` in its data, no ask button shows there, which is right for now. The vendor demo spec will add it.

- [ ] **Step 5: Merge the latest staging**, then re-run Step 1.

- [ ] **Step 6: PR, only when the user says so.**
  - into `staging`
  - title: `KAN-20: guest inquiries to partners`
  - body:
    - what changed
    - the backend PR link, and the order: backend first
    - the copy, as approved
    - the checks
    - screenshots
    - "No SEO blockers"
  - name only KAN-20
  - end with the attribution line
  - then send the owner the visual-check report link, and never tick its approve box

---

## Not in this plan

- Privacy policy lines about sharing a guest's contact with a partner. The legal pages have their own versioning, and the owner approves that wording separately. Raise it with the owner before the release PR; the feature shouldn't go to production without them.
- The vendor demo.
- The public partner page entry point (KAN-26).

## Self-review notes

- **Spec coverage:**

  | Spec item | Task |
  |---|---|
  | button and sheet | 5 |
  | placements | 6, 7 |
  | the hook and the cache write | 4 |
  | My business section, rows, sheet, locked state | 9, 10 |
  | `businessKeys.inquiries` | 8 |
  | benefits move | 10 |
  | copy gate | 1 |
  | tests and stories | each task |
  | checks | 11 |

- **Names:**
  - `useAskDates` returns `target`, `openForVendor`, `openForCard` and `canSend`; Tasks 6 and 7 use exactly these.
  - `useGuestInquiries` returns `selected`, `open`, `setDone`, `isSaving` and `saveError`; Task 10 uses exactly these.
