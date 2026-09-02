# Delete Event Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the primary host of an event delete it (password-confirmed, soft-deleted with a 30-day undo window), surfacing a refund prompt first when eligible.

**Architecture:** Two new mutation hooks wrap the shipped `POST`/`DELETE /api/events/{eventId}/deletion-requests` endpoints. A small orchestrating hook (`useEventDeletionFlow`) owns the confirm-modal/password/error state, the same shape as `useProfileForm`'s password flow. Three new presentational components (danger zone button, confirm modal, pending-deletion banner) live under `components/manage/settings/` and are wired into the existing `SettingsTab.tsx`, which already re-fetches the event on every mount/reload — so the pending-deletion banner needs no new data-fetching path, just a branch on `event.deletionScheduledFor`.

**Tech Stack:** Next.js App Router, TanStack Query, next-intl. No unit test framework exists in this repo (no vitest/jest/testing-library configured) — verification is `npm run type:check`, `npm run lint`, and manual browser verification per CLAUDE.md's UI-change policy, not automated tests.

**Spec:** [`docs/superpowers/specs/2026-09-02-delete-event-design.md`](../specs/2026-09-02-delete-event-design.md)
**Backend contract:** [`docs/integration guides/event-deletion-fe-integration.md`](<../../integration guides/event-deletion-fe-integration.md>)

---

## File Structure

**Create:**
- `hooks/useEventDeletion.ts` — `useRequestEventDeletion`, `useCancelEventDeletion` mutations.
- `hooks/useEventDeletionFlow.ts` — orchestrating hook (modal/password/error state) consumed by `SettingsTab.tsx`.
- `components/manage/settings/EventDangerZone.tsx` — danger-zone block + "Delete event" button.
- `components/manage/settings/EventDeleteConfirmModal.tsx` — confirm modal (refund callout + password field).
- `components/manage/settings/EventPendingDeletionBanner.tsx` — banner shown in place of the settings form while pending deletion.

**Modify:**
- `lib/api/types.ts` — add `deletionScheduledFor` to `EventResponseDto`/`EventDetailResponseDto`, add `EventDeletionRequestDto`.
- `lib/api/endpoints.ts` — add `events.deletionRequests(eventId)`.
- `lib/api/errors.ts` — add `EVENT_DELETE_NOT_PRIMARY_HOST` (4003), `EVENT_DELETE_ALREADY_PENDING` (5064).
- `lib/api/errorMessageKeys.ts` — map the two new codes.
- `lib/eventLifecycle.ts` — add `getPrimaryHostMemberId`, `isPrimaryHost`.
- `components/ui/ConfirmActionModal.tsx` — add optional `confirmDisabled` prop.
- `app/(app)/(event)/events/[eventId]/manage/SettingsTab.tsx` — branch on pending-deletion, render danger zone for the primary host.
- `messages/en.json`, `messages/el.json` — new `ApiErrors` entries and `ManagePage.settings.dangerZone`/`pendingDeletion` blocks.

---

### Task 1: Types and endpoint for event deletion

**Files:**
- Modify: `lib/api/types.ts:424-443` (`EventResponseDto`), `lib/api/types.ts:470-489` (`EventDetailResponseDto`)
- Modify: `lib/api/endpoints.ts:52-93` (`events` object)

- [ ] **Step 1: Add `deletionScheduledFor` to both event response types and a new request DTO**

In `lib/api/types.ts`, add the field to `EventResponseDto` (right after `deletedAt` on line 442):

```ts
export interface EventResponseDto {
    id: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    eventType: EventTypeConvention;
    visibility: EventVisibility;
    startAt: string;
    endAt: string | null;
    timezone: string;
    locationName: string | null;
    locationAddress: string | null;
    mapsUrl: string | null;
    coverMediaId: string | null;
    brandingSettings: Record<string, unknown>;
    rsvpDeadline: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    deletionScheduledFor: string | null; // ISO-8601; non-null while a deletion request is pending
}
```

And to `EventDetailResponseDto` (right after `deletedAt` on line 487):

```ts
export interface EventDetailResponseDto {
    id: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    eventType: EventTypeConvention;
    visibility: EventVisibility;
    schedule: EventScheduleDto;
    location: EventLocationDto;
    coverMedia: MediaResponseDto | null; // resolved, with a fresh presigned mediaUrl
    brandingSettings: Record<string, unknown>;
    hosts: EventHostResponseDto[];
    modules: EventModuleResponseDto[];
    sessions: EventSessionResponseDto[];
    rsvpSummary: EventRsvpSummaryDto;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    deletionScheduledFor: string | null; // ISO-8601; non-null while a deletion request is pending
    status: EventStatus;
}
```

Then add a new request DTO right after `EventPatchDto` (currently ending at line 820):

```ts
export interface EventDeletionRequestDto {
    currentPassword: string;
}
```

- [ ] **Step 2: Add the deletion-requests endpoint**

In `lib/api/endpoints.ts`, add this line inside the `events` object, right after `refundRequests` (line 88):

```ts
        deletionRequests: (eventId: string) => `/api/events/${eventId}/deletion-requests`,
```

- [ ] **Step 3: Type-check**

Run: `npm run type:check`
Expected: no errors (these are additive changes only).

- [ ] **Step 4: Commit**

```bash
git add lib/api/types.ts lib/api/endpoints.ts
git commit -m "$(cat <<'EOF'
Add types and endpoint for event deletion requests

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Error codes, message keys, and ApiErrors translations

**Files:**
- Modify: `lib/api/errors.ts:6-91` (`ERROR_CODES`)
- Modify: `lib/api/errorMessageKeys.ts` (type union, map)
- Modify: `messages/en.json` (`ApiErrors`), `messages/el.json` (`ApiErrors`)

- [ ] **Step 1: Add the two new numeric error codes**

In `lib/api/errors.ts`, add to `ERROR_CODES` (anywhere in the object, e.g. right after `COLLABORATION_EARNING_NOT_PAYABLE`):

```ts
    EVENT_DELETE_NOT_PRIMARY_HOST: 4003,
    EVENT_DELETE_ALREADY_PENDING: 5064,
```

- [ ] **Step 2: Add message keys**

In `lib/api/errorMessageKeys.ts`, add two entries to the `ApiErrorMessageKey` union (alphabetically, near the other `event*` keys):

```ts
    | 'eventDeleteAlreadyPending'
    | 'eventDeleteNotPrimaryHost'
```

And two entries to `API_ERROR_MESSAGE_KEYS` (near the other `EVENT_*` mappings):

```ts
    [ERROR_CODES.EVENT_DELETE_ALREADY_PENDING]: 'eventDeleteAlreadyPending',
    [ERROR_CODES.EVENT_DELETE_NOT_PRIMARY_HOST]: 'eventDeleteNotPrimaryHost',
```

- [ ] **Step 3: Add English copy**

In `messages/en.json`, inside `"ApiErrors"` (after `"invalidPlanTierScope"` on the line just before the closing brace at line 2889), add:

```json
        "invalidPlanTierScope": "That restriction only applies to event plans.",
        "eventDeleteNotPrimaryHost": "Only the event's original host can delete it.",
        "eventDeleteAlreadyPending": "This event already has a deletion scheduled."
```

(replacing the old trailing `"invalidPlanTierScope": "That restriction only applies to event plans."` line with the three lines above, keeping it as the second-to-last entry before the closing `}`.)

- [ ] **Step 4: Add Greek copy**

In `messages/el.json`, find the equivalent `"ApiErrors"` block and add the same two keys, mirroring wherever `"invalidPlanTierScope"` (or the block's last entry) sits there:

```json
        "eventDeleteNotPrimaryHost": "Μόνο ο αρχικός διοργανωτής της εκδήλωσης μπορεί να τη διαγράψει.",
        "eventDeleteAlreadyPending": "Αυτή η εκδήλωση έχει ήδη προγραμματισμένη διαγραφή."
```

- [ ] **Step 5: Type-check**

Run: `npm run type:check`
Expected: no errors — `API_ERROR_MESSAGE_KEYS satisfies Record<KnownApiErrorCode, ApiErrorMessageKey>` will fail to compile if either mapping is missing, so this step is the real verification for Steps 1-2.

- [ ] **Step 6: Commit**

```bash
git add lib/api/errors.ts lib/api/errorMessageKeys.ts messages/en.json messages/el.json
git commit -m "$(cat <<'EOF'
Add error codes and copy for event deletion errors

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Primary-host helper

**Files:**
- Modify: `lib/eventLifecycle.ts`

- [ ] **Step 1: Add `getPrimaryHostMemberId` and `isPrimaryHost`**

Replace the full contents of `lib/eventLifecycle.ts` with:

```ts
import type { EventHostResponseDto, EventStatus } from '@/lib/api/types';

export function isEventWritable(status: EventStatus | null | undefined): boolean {
    return status === 'ACTIVE';
}

// The host with the lowest displayOrder created the event — deletion is
// gated to that one host even though co-hosts can do almost everything
// else. See event-deletion-fe-integration.md §2.
export function getPrimaryHostMemberId(hosts: EventHostResponseDto[]): string | null {
    if (hosts.length === 0) return null;
    return [...hosts].sort((a, b) => a.displayOrder - b.displayOrder)[0].memberId;
}

export function isPrimaryHost(hosts: EventHostResponseDto[], memberId: string | null | undefined): boolean {
    if (!memberId) return false;
    return getPrimaryHostMemberId(hosts) === memberId;
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type:check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/eventLifecycle.ts
git commit -m "$(cat <<'EOF'
Add primary-host helper for event deletion gating

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Deletion mutation hooks

**Files:**
- Create: `hooks/useEventDeletion.ts`

- [ ] **Step 1: Write the two mutation hooks**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { eventKeys } from '@/hooks/useEvent';
import { myEventsKeys } from '@/hooks/useMyEvents';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { EventDeletionRequestDto, EventResponseDto } from '@/lib/api/types';

// POST /api/events/{eventId}/deletion-requests — primary host only,
// password-confirmed. Response is the flat EventResponseDto (not the nested
// EventDetailResponseDto the detail cache holds), so — same as
// useUpdateEvent — invalidate rather than setQueryData with it.
export function useRequestEventDeletion(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: EventDeletionRequestDto) => api.post<EventResponseDto>(endpoints.events.deletionRequests(eventId), input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
            queryClient.invalidateQueries({ queryKey: myEventsKeys.all });
        },
    });
}

// DELETE /api/events/{eventId}/deletion-requests — any host, no password
// ("Undo"). A no-op 200 if nothing was pending, so it's safe to call from a
// stale button without a pre-check.
export function useCancelEventDeletion(eventId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => api.del<EventResponseDto>(endpoints.events.deletionRequests(eventId)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
            queryClient.invalidateQueries({ queryKey: myEventsKeys.all });
        },
    });
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run type:check && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add hooks/useEventDeletion.ts
git commit -m "$(cat <<'EOF'
Add event deletion request/undo mutation hooks

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `ConfirmActionModal` — add `confirmDisabled`

**Files:**
- Modify: `components/ui/ConfirmActionModal.tsx`

- [ ] **Step 1: Add the prop and wire it into the confirm button's `disabled`**

Change the props type (currently lines 8-22):

```ts
type ConfirmActionModalProps = {
    open: boolean;
    title: string;
    body: ReactNode;
    confirmLabel: string;
    cancelLabel: string;
    onCloseAction: () => void;
    onConfirmAction: () => void | Promise<void>;
    isConfirming?: boolean;
    confirmDisabled?: boolean;
    tone?: 'danger' | 'default';
    icon?: ReactNode;
    size?: 'sm' | 'md';
    showCancelAction?: boolean;
    showCloseButton?: boolean;
};
```

Add the corresponding destructured prop with a default (in the function signature, currently lines 24-38):

```ts
export function ConfirmActionModal({
    open,
    title,
    body,
    confirmLabel,
    cancelLabel,
    onCloseAction,
    onConfirmAction,
    isConfirming = false,
    confirmDisabled = false,
    tone = 'danger',
    icon,
    size = 'sm',
    showCancelAction = true,
    showCloseButton = true,
}: ConfirmActionModalProps) {
```

And update the confirm `<button>`'s `disabled` (currently `disabled={isConfirming}` around line 74):

```tsx
                        <button
                            type="button"
                            onClick={onConfirmAction}
                            disabled={isConfirming || confirmDisabled}
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run type:check && npm run lint`
Expected: no errors — `confirmDisabled` is optional so every existing call site (28 files) stays valid unchanged.

- [ ] **Step 3: Commit**

```bash
git add components/ui/ConfirmActionModal.tsx
git commit -m "$(cat <<'EOF'
Add optional confirmDisabled prop to ConfirmActionModal

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `ManagePage.settings` translations for danger zone and pending deletion

**Files:**
- Modify: `messages/en.json:1076-1112` (`ManagePage.settings`)
- Modify: `messages/el.json` (equivalent block)

- [ ] **Step 1: Add English copy**

In `messages/en.json`, inside `"ManagePage"."settings"`, add two new sibling keys after `"readOnly"` (currently the last key in that object, line 1111):

```json
            "readOnly": "This event is read-only. Event details and cover photo changes are paused until the event is active again.",
            "dangerZone": {
                "title": "Danger zone",
                "body": "Deleting this event hides it immediately. You'll have a grace period to undo this before it's permanently deleted.",
                "delete": "Delete event",
                "confirmTitle": "Delete this event?",
                "confirmBody": "This event will be hidden from everyone right away. You'll be able to undo this from this page until it's permanently deleted.",
                "confirmAction": "Delete event",
                "cancelAction": "Cancel",
                "refundCallout": "You may be eligible for a refund on this event's activation payment.",
                "refundLink": "Request a refund instead",
                "password": {
                    "label": "Current password",
                    "errors": {
                        "currentPasswordInvalid": "Your current password is incorrect."
                    }
                }
            },
            "pendingDeletion": {
                "title": "This event is scheduled for deletion",
                "body": "It will be permanently deleted on {date}. Guests can no longer see it.",
                "undo": "Undo deletion",
                "undoing": "Restoring…"
            }
```

- [ ] **Step 2: Add Greek copy**

In `messages/el.json`, inside the equivalent `"ManagePage"."settings"` block, add after `"readOnly"` (line 1049):

```json
            "readOnly": "Η εκδήλωση είναι μόνο για ανάγνωση. Οι αλλαγές λεπτομερειών και φωτογραφίας εξωφύλλου έχουν σταματήσει μέχρι να ενεργοποιηθεί ξανά.",
            "dangerZone": {
                "title": "Ζώνη κινδύνου",
                "body": "Η διαγραφή αυτής της εκδήλωσης την αποκρύπτει άμεσα. Θα έχετε μια περίοδο χάριτος για να την αναιρέσετε πριν διαγραφεί οριστικά.",
                "delete": "Διαγραφή εκδήλωσης",
                "confirmTitle": "Διαγραφή αυτής της εκδήλωσης;",
                "confirmBody": "Η εκδήλωση θα αποκρυφτεί αμέσως από όλους. Θα μπορείτε να αναιρέσετε αυτή την ενέργεια από αυτή τη σελίδα μέχρι να διαγραφεί οριστικά.",
                "confirmAction": "Διαγραφή εκδήλωσης",
                "cancelAction": "Ακύρωση",
                "refundCallout": "Μπορεί να δικαιούστε επιστροφή χρημάτων για την πληρωμή ενεργοποίησης αυτής της εκδήλωσης.",
                "refundLink": "Αίτημα επιστροφής αντ' αυτού",
                "password": {
                    "label": "Τρέχων κωδικός πρόσβασης",
                    "errors": {
                        "currentPasswordInvalid": "Ο τρέχων κωδικός πρόσβασης είναι λανθασμένος."
                    }
                }
            },
            "pendingDeletion": {
                "title": "Αυτή η εκδήλωση έχει προγραμματιστεί για διαγραφή",
                "body": "Θα διαγραφεί οριστικά στις {date}. Οι καλεσμένοι δεν μπορούν πλέον να τη δουν.",
                "undo": "Αναίρεση διαγραφής",
                "undoing": "Επαναφορά…"
            }
```

- [ ] **Step 3: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/el.json','utf8')); console.log('ok')"`
Expected: `ok` (catches a trailing-comma or bracket mistake before it reaches the app).

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/el.json
git commit -m "$(cat <<'EOF'
Add danger zone and pending deletion copy to ManagePage.settings

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: `EventDangerZone` component

**Files:**
- Create: `components/manage/settings/EventDangerZone.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function EventDangerZone({ onDeleteOpenAction, disabled }: { onDeleteOpenAction: () => void; disabled?: boolean }) {
    const t = useTranslations('ManagePage');

    return (
        <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
            <p className="text-sm font-semibold text-rose-700">{t('settings.dangerZone.title')}</p>
            <p className="mt-1 text-xs leading-relaxed text-rose-700/80">{t('settings.dangerZone.body')}</p>
            <button
                type="button"
                onClick={onDeleteOpenAction}
                disabled={disabled}
                className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-rose-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {t('settings.dangerZone.delete')}
            </button>
        </div>
    );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run type:check && npm run lint`
Expected: no errors. (Not yet imported anywhere, so no visual check possible until Task 11.)

- [ ] **Step 3: Commit**

```bash
git add components/manage/settings/EventDangerZone.tsx
git commit -m "$(cat <<'EOF'
Add EventDangerZone component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: `EventPendingDeletionBanner` component

**Files:**
- Create: `components/manage/settings/EventPendingDeletionBanner.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { RotateCcw } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { formatDate } from '@/lib/datetime';

export function EventPendingDeletionBanner({
    deletionScheduledFor,
    onUndoAction,
    isUndoing,
}: {
    deletionScheduledFor: string;
    onUndoAction: () => void;
    isUndoing: boolean;
}) {
    const t = useTranslations('ManagePage');
    const locale = useLocale();
    const date = formatDate(locale, deletionScheduledFor, { dateStyle: 'long' });

    return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-center">
            <p className="text-sm font-semibold text-rose-700">{t('settings.pendingDeletion.title')}</p>
            <p className="mt-1 text-xs leading-relaxed text-rose-700/80">{t('settings.pendingDeletion.body', { date })}</p>
            <button
                type="button"
                onClick={onUndoAction}
                disabled={isUndoing}
                className="mt-4 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-rose-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {isUndoing ? t('settings.pendingDeletion.undoing') : t('settings.pendingDeletion.undo')}
            </button>
        </div>
    );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run type:check && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/manage/settings/EventPendingDeletionBanner.tsx
git commit -m "$(cat <<'EOF'
Add EventPendingDeletionBanner component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: `EventDeleteConfirmModal` component

**Files:**
- Create: `components/manage/settings/EventDeleteConfirmModal.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { ChangeEvent } from 'react';

import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { routes } from '@/lib/routes';

export function EventDeleteConfirmModal({
    eventId,
    open,
    password,
    onPasswordChangeAction,
    passwordInvalid,
    deleteError,
    isConfirming,
    isRefundEligible,
    onCloseAction,
    onConfirmAction,
}: {
    eventId: string;
    open: boolean;
    password: string;
    onPasswordChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    passwordInvalid: boolean;
    deleteError: string | null;
    isConfirming: boolean;
    isRefundEligible: boolean;
    onCloseAction: () => void;
    onConfirmAction: () => void;
}) {
    const t = useTranslations('ManagePage');

    return (
        <ConfirmActionModal
            open={open}
            title={t('settings.dangerZone.confirmTitle')}
            size="md"
            body={
                <div className="flex flex-col gap-3">
                    <p>{t('settings.dangerZone.confirmBody')}</p>

                    {isRefundEligible && (
                        <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            <p>{t('settings.dangerZone.refundCallout')}</p>
                            <Link href={routes.events.manage(eventId, { tab: 'refund' })} className="mt-1 inline-block font-semibold underline">
                                {t('settings.dangerZone.refundLink')}
                            </Link>
                        </div>
                    )}

                    <label className="flex flex-col gap-1.5 text-left">
                        <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t('settings.dangerZone.password.label')}</span>
                        <input
                            type="password"
                            value={password}
                            onChange={onPasswordChangeAction}
                            autoComplete="current-password"
                            className="w-full rounded-xl bg-surface-muted px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        {passwordInvalid && (
                            <span className="text-xs text-rose-600">{t('settings.dangerZone.password.errors.currentPasswordInvalid')}</span>
                        )}
                    </label>

                    {deleteError && <p className="text-xs text-rose-600">{deleteError}</p>}
                </div>
            }
            confirmLabel={t('settings.dangerZone.confirmAction')}
            cancelLabel={t('settings.dangerZone.cancelAction')}
            onCloseAction={onCloseAction}
            onConfirmAction={onConfirmAction}
            isConfirming={isConfirming}
            confirmDisabled={password.length === 0}
        />
    );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run type:check && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/manage/settings/EventDeleteConfirmModal.tsx
git commit -m "$(cat <<'EOF'
Add EventDeleteConfirmModal component

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: `useEventDeletionFlow` orchestrating hook

**Files:**
- Create: `hooks/useEventDeletionFlow.ts`

- [ ] **Step 1: Write the hook**

```ts
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { type ChangeEvent, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useRefundEligibility } from '@/hooks/useBilling';
import { eventKeys } from '@/hooks/useEvent';
import { useCancelEventDeletion, useRequestEventDeletion } from '@/hooks/useEventDeletion';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';

// Mirrors useProfileForm's password-confirmation shape: local state for the
// confirm modal, the password field, and the two error surfaces (a
// wrong-password field error vs. every other failure as a banner message).
export function useEventDeletionFlow(eventId: string) {
    const queryClient = useQueryClient();
    const toErrorMessage = useApiErrorMessage();

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordInvalid, setPasswordInvalid] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const refundEligibility = useRefundEligibility(eventId);
    const requestDeletion = useRequestEventDeletion(eventId);
    const cancelDeletion = useCancelEventDeletion(eventId);

    function openConfirm() {
        setPassword('');
        setPasswordInvalid(false);
        setDeleteError(null);
        setConfirmOpen(true);
    }

    function closeConfirm() {
        if (requestDeletion.isPending) return;
        setConfirmOpen(false);
    }

    function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
        setPassword(event.target.value);
        setPasswordInvalid(false);
    }

    async function confirmDelete() {
        setPasswordInvalid(false);
        setDeleteError(null);

        try {
            await requestDeletion.mutateAsync({ currentPassword: password });
            setConfirmOpen(false);
        } catch (error) {
            const code = getErrorCode(error);
            if (code === ERROR_CODES.INVALID_CREDENTIALS) {
                setPasswordInvalid(true);
                return;
            }
            if (code === ERROR_CODES.EVENT_DELETE_ALREADY_PENDING) {
                // Someone else (or a stale tab) already requested deletion —
                // refetch so the pending-deletion banner takes over instead
                // of leaving the confirm modal open on a dead request.
                setConfirmOpen(false);
                queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
                return;
            }
            setDeleteError(toErrorMessage(error));
        }
    }

    async function undoDeletion() {
        await cancelDeletion.mutateAsync();
    }

    return {
        confirmOpen,
        openConfirm,
        closeConfirm,
        password,
        handlePasswordChange,
        passwordInvalid,
        deleteError,
        confirmDelete,
        isDeleting: requestDeletion.isPending,
        undoDeletion,
        isUndoing: cancelDeletion.isPending,
        isRefundEligible: Boolean(refundEligibility.data?.eligible),
    };
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npm run type:check && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add hooks/useEventDeletionFlow.ts
git commit -m "$(cat <<'EOF'
Add useEventDeletionFlow orchestrating hook

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Wire deletion into `SettingsTab.tsx`

**Files:**
- Modify: `app/(app)/(event)/events/[eventId]/manage/SettingsTab.tsx`

- [ ] **Step 1: Add the new imports**

The existing `@/...` import block (lines 8-25) is sorted alphabetically by module path (enforced by the active `simple-import-sort/imports` eslint rule) — replace it with the same imports plus the six new ones already merged in the correct position:

```ts
import { TargetedSection } from '@/components/manage/TargetedSection';
import { EventDangerZone } from '@/components/manage/settings/EventDangerZone';
import { EventDeleteConfirmModal } from '@/components/manage/settings/EventDeleteConfirmModal';
import { EventPendingDeletionBanner } from '@/components/manage/settings/EventPendingDeletionBanner';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useUpdateEvent } from '@/hooks/useEvent';
import { useEventDeletionFlow } from '@/hooks/useEventDeletionFlow';
import { useUploadMedia } from '@/hooks/useMedia';
import { getFieldErrors } from '@/lib/api/errors';
import type { EventDetailResponseDto, EventPatchDto } from '@/lib/api/types';
import {
    getCurrentDatetimeLocalValue,
    getScheduleDatetimeLocalBounds,
    isDatetimeLocalAfter,
    isDatetimeLocalBefore,
    toDatetimeLocalValue,
} from '@/lib/datetime';
import { getEventEndPresets } from '@/lib/eventEndPresets';
import { isPrimaryHost } from '@/lib/eventLifecycle';
import { COVER_PHOTO_SECTION_ID } from '@/lib/manageSectionTargets';
import { cn } from '@/lib/utils';
import { useActiveMember } from '@/providers/EventProvider';
```

(this replaces everything from `import { TargetedSection }` through `from '@/lib/utils';` — the `React`/`react`/`lucide-react`/`next/image`/`next-intl` imports above that block are unaffected.)

- [ ] **Step 2: Derive `canDelete` and the deletion flow, and branch early for the pending-deletion state**

Right after the existing `const disabled = !canWrite;` line (line 212), add:

```ts
    const activeMember = useActiveMember();
    const canDelete = isPrimaryHost(event.hosts, activeMember?.id);
    const deletionFlow = useEventDeletionFlow(event.id);

    if (event.deletionScheduledFor) {
        return (
            <EventPendingDeletionBanner
                deletionScheduledFor={event.deletionScheduledFor}
                onUndoAction={deletionFlow.undoDeletion}
                isUndoing={deletionFlow.isUndoing}
            />
        );
    }
```

- [ ] **Step 3: Render the danger zone and confirm modal**

Right after the closing `</form>` tag and before the final closing `</div>` of the component's return statement, add:

```tsx
            {canDelete && (
                <>
                    {/* Danger zone */}
                    <EventDangerZone onDeleteOpenAction={deletionFlow.openConfirm} disabled={deletionFlow.isDeleting} />

                    <EventDeleteConfirmModal
                        eventId={event.id}
                        open={deletionFlow.confirmOpen}
                        password={deletionFlow.password}
                        onPasswordChangeAction={deletionFlow.handlePasswordChange}
                        passwordInvalid={deletionFlow.passwordInvalid}
                        deleteError={deletionFlow.deleteError}
                        isConfirming={deletionFlow.isDeleting}
                        isRefundEligible={deletionFlow.isRefundEligible}
                        onCloseAction={deletionFlow.closeConfirm}
                        onConfirmAction={deletionFlow.confirmDelete}
                    />
                </>
            )}
```

- [ ] **Step 4: Type-check and lint**

Run: `npm run type:check && npm run lint`
Expected: no type errors. `simple-import-sort/imports` is an active eslint rule, so if the new import lines added in Step 1 aren't in sorted order, lint will fail on ordering only — if so, run `npm run lint:fix` (auto-sorts imports) and re-run `npm run lint` to confirm it's clean.

- [ ] **Step 5: Manual browser verification**

Start the dev server and drive through both flows on an event where the signed-in user is the primary host:

Run: `npm run dev`

Then in the browser:
1. Open that event's Manage → Settings tab. Confirm the "Danger zone" block renders below the form with a "Delete event" button.
2. Click it — confirm the modal opens with the password field, the confirm button disabled until text is typed, and (if that event is refund-eligible) the refund callout with a working "Request a refund instead" link to the Refund tab.
3. Type the wrong password and confirm — expect the inline "Your current password is incorrect" error, modal stays open.
4. Type the correct password and confirm — expect the modal to close and the Settings tab to immediately show the pending-deletion banner with the correct purge date.
5. Reload the page — confirm the banner still renders (this is the durability the backend fix provides — no toast, no redirect needed).
6. Click "Undo deletion" — confirm the banner disappears and the normal settings form returns.
7. On a second account that is a co-host (not primary) of some event, or on a plain member view, confirm the danger zone block does not render at all.

Expected: all seven checks pass. Note any visual issue (spacing, contrast, dark-mode if applicable) and fix before moving on.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/(event)/events/[eventId]/manage/SettingsTab.tsx"
git commit -m "$(cat <<'EOF'
Wire event deletion into the Settings tab

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Post-plan notes (not implemented here, per spec §4)

- Co-host notification on deletion — undecided, not built.
- Refund-request-in-flight-at-deletion-time interaction — not addressed by either backend contract; both actions currently just work independently.
- `billing-fe-guide.md` §9 still has a stale line contradicting the revised `event-deletion-fe-integration.md` — worth a doc fix at the source, not a frontend code change.
