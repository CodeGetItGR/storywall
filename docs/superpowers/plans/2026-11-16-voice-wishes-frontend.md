# Voice wishes — frontend (KAN-220) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guests can record a spoken wish of up to 1 minute (instead of, or as well as, writing one) on the in-app wishbook and the QR wish page, and change or remove it from "Your messages". Hosts, the author and admins in moderation can play it.

**Architecture:** `useVoiceRecorder` wraps `MediaRecorder` and hands back a recorded `Blob`. `VoiceRecorder` draws record / stop / play back / record again / remove from that hook's state. `VoiceWishPlayer` plays a recording (a blob URL before sending, a presigned URL after). The three wish mutations send `multipart/form-data` (a `wish` JSON blob plus an `audio` file) only when a recording is attached, JSON otherwise. The in-app composer moves out of the wishbook `PageClient.tsx` into its own component and hook while it gains the recorder.

**Tech Stack:** Next.js App Router, React 19, TanStack Query, next-intl, Tailwind, lucide-react, Vitest + Testing Library, Storybook, MSW demo mocks.

**Repo and branch:** storywall. A new worktree on `claude/kan-220-voice-wishes`, cut from `claude/kan-218-private-wishbook` (Part 1, PR storywall#358) while that PR is open, and rebased onto `origin/staging` once #358 merges. The PR goes into `staging`, titled `KAN-220: Voice wishes`. Every commit message starts with `KAN-220: ` and ends with the `Co-Authored-By` line. The backend (KAN-219, guestwall-be) ships first; this PR needs it on staging before the signed-in check.

**Backend contract (KAN-219):**

- `POST /api/events/{eventId}/wishbook`, `POST /api/qr/{token}/wishes`, `PUT /api/wishbook/{entryId}` accept `multipart/form-data`: a `wish` part (a `Blob` of JSON with type `application/json` — a plain string field is rejected) and an optional `audio` file part. JSON keeps working.
- `message` is optional when there is a recording. The `PUT` body adds `removeAudio: boolean`.
- `WishbookEntryResponseDto.audio: { url: string; durationMs: number } | null` and `message: string | null`. Only hosts, co-hosts and the author get `audio`. `ModerationContentDto.audio`, same shape.
- Errors: 3128 too large (413), 3129 not audio, 3130 too long, 3131 could not be saved (422), 3132 neither text nor recording.
- The server accepts up to 62 s; the app stops at 60 s.

**Approved copy (owner, 2026-11-16, in a popup). Use exactly this; change nothing else.**

| Key | English | Greek |
| --- | --- | --- |
| `VoiceWish.record` | Record a message | Ηχογραφήστε ένα μήνυμα |
| `VoiceWish.stop` | Stop | Διακοπή |
| `VoiceWish.recordAgain` | Record again | Νέα ηχογράφηση |
| `VoiceWish.removeRecording` | Remove recording | Αφαίρεση ηχογράφησης |
| `VoiceWish.micBlocked` | Microphone access is blocked. | Η πρόσβαση στο μικρόφωνο είναι αποκλεισμένη. |
| `VoiceWish.play` | Play | Αναπαραγωγή |
| `VoiceWish.pause` | Pause | Παύση |
| `VoiceWish.cantPlay` | This recording can't be played. | Δεν είναι δυνατή η αναπαραγωγή της ηχογράφησης. |
| `ApiErrors.wishAudioTooLarge` | This recording is too large. | Η ηχογράφηση είναι πολύ μεγάλη. |
| `ApiErrors.wishAudioNotAudio` | This recording can't be used. Record it again. | Αυτή η ηχογράφηση δεν μπορεί να χρησιμοποιηθεί. Ηχογραφήστε ξανά. |
| `ApiErrors.wishAudioTooLong` | Recordings can be up to 1 minute. | Οι ηχογραφήσεις μπορούν να διαρκούν έως 1 λεπτό. |
| `ApiErrors.wishAudioConversionFailed` | This recording couldn't be saved. Try again. | Δεν ήταν δυνατή η αποθήκευση της ηχογράφησης. Δοκιμάστε ξανά. |
| `ApiErrors.wishEmpty` | Write a message or record one. | Γράψτε ή ηχογραφήστε ένα μήνυμα. |

Any other visible text this plan seems to need is a blocker: stop and ask the owner in a popup with the exact old and new wording. The timer (`0:12 / 1:00`) is digits only and needs no copy. Icons are lucide SVGs with `aria-hidden`, so they need no alt text; every icon-only button has an `aria-label` from the table.

**Not in this release:** downloads, an online wishbook, a QR in the printed book (KAN-221).

---

## File map

**Create**

- `lib/wishbook/voice.ts` (+ `voice.test.ts`) — limits, mime choice, duration format, file name, multipart body.
- `hooks/useVoiceRecorder.ts` (+ test) — recording state.
- `hooks/useAudioPlayer.ts` (+ test) — playback state for one `<audio>`.
- `components/wishbook/VoiceWishPlayer.tsx` (+ test, + stories).
- `components/wishbook/VoiceRecorder.tsx` (+ test, + stories).
- `hooks/useWishComposer.ts` (+ test) — the in-app write form's state, moved out of `PageClient.tsx`.
- `components/wishbook/WishComposer.tsx` (+ test, + stories) — the in-app write form.

**Modify**

- `lib/api/types.ts`, `lib/api/errors.ts`, `lib/api/errorMessageKeys.ts`, `lib/api/client.ts` (+ `client.test.ts`).
- `messages/en.json`, `messages/el.json`.
- `hooks/useWishbook.ts`, `hooks/useQrWish.ts`, `hooks/useWishEditor.ts`, `hooks/useGuestWishForm.ts` (+ their tests).
- `components/wishbook/WishEditSheet.tsx`, `components/wishbook/MyWishesSection.tsx` (+ tests, stories).
- `components/qrGuest/GuestWishForm.tsx` (+ test, stories).
- `components/admin/moderation/ModerationContentPreview.tsx` (+ test or story if it has one).
- `app/(main)/(app)/(event)/events/[eventId]/tools/wishbook/PageClient.tsx` (+ `PageClient.myWishes.test.tsx`).
- `lib/demo/mockHandlers.ts`.

---

### Task 1: Types, error codes, approved copy

**Files:**
- Modify: `lib/api/types.ts:3213-3354`, `:4729-4737`
- Modify: `lib/api/errors.ts` (beside `WISHBOOK_EDIT_NOT_AUTHOR: 4041`, L196), `lib/api/errorMessageKeys.ts`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Types**

```ts
// A wish's recording (KAN-219). url is presigned and short-lived: refetch the list for a fresh one.
export interface WishAudioDto {
    url: string;
    durationMs: number;
}

export interface WishbookEntryRequestDto {
    // Optional when the request carries a recording; the server needs one of the two (3132).
    message?: string;
    guestName?: string;
}

// PUT /api/wishbook/{entryId} — the author only, while the event is ACTIVE (KAN-217).
export interface WishbookEntryEditDto {
    message?: string;
    // Drops the stored recording. Ignored when a new one is sent.
    removeAudio?: boolean;
}

export interface WishbookEntryResponseDto {
    // ...existing fields, with:
    // null for a voice-only wish (KAN-219).
    message: string | null;
    // Hosts, co-hosts and the author only.
    audio: WishAudioDto | null;
}

export interface QrWishRequestDto {
    guestName: string;
    message?: string;
    ageConfirmed: true;
    acceptedTermsVersion: string;
    acceptedGuidelinesVersion: string;
}

export interface ModerationContentDto {
    // ...existing fields, with:
    // A reported voice wish's recording; null for everything else.
    audio?: WishAudioDto | null;
}
```

- [ ] **Step 2: Run tsc and fix every place that assumed a string message**

Run: `npx tsc --noEmit`
Expected: errors where `entry.message` is used as a string. Known ones: `hooks/useWishEditor.ts` (`setDraft(entry.message)` → `entry.message ?? ''`), `components/wishbook/MyWishesSection.tsx` (fixed properly in Task 9), the host rows in the wishbook `PageClient.tsx` (Task 8), test and story fixtures (add `audio: null`), `lib/demo/mockHandlers.ts` (Task 12; add `audio: null` now so it compiles). Make each compile with the smallest change now; the later tasks do the real UI.

- [ ] **Step 3: Error codes and message keys**

`lib/api/errors.ts`:

```ts
    WISH_AUDIO_TOO_LARGE: 3128,
    WISH_AUDIO_NOT_AUDIO: 3129,
    WISH_AUDIO_TOO_LONG: 3130,
    WISH_AUDIO_CONVERSION_FAILED: 3131,
    WISH_EMPTY: 3132,
```

`lib/api/errorMessageKeys.ts`:

```ts
    [ERROR_CODES.WISH_AUDIO_TOO_LARGE]: 'wishAudioTooLarge',
    [ERROR_CODES.WISH_AUDIO_NOT_AUDIO]: 'wishAudioNotAudio',
    [ERROR_CODES.WISH_AUDIO_TOO_LONG]: 'wishAudioTooLong',
    [ERROR_CODES.WISH_AUDIO_CONVERSION_FAILED]: 'wishAudioConversionFailed',
    [ERROR_CODES.WISH_EMPTY]: 'wishEmpty',
```

(Place them where that file keeps 31xx codes; if it is sorted, keep the order.)

- [ ] **Step 4: Messages**

Add the `ApiErrors` keys from the copy table to `ApiErrors` in both files, and a new top-level `VoiceWish` namespace (place it right after `WishbookPage`):

`messages/en.json`:

```json
"VoiceWish": {
    "record": "Record a message",
    "stop": "Stop",
    "recordAgain": "Record again",
    "removeRecording": "Remove recording",
    "micBlocked": "Microphone access is blocked.",
    "play": "Play",
    "pause": "Pause",
    "cantPlay": "This recording can't be played."
},
```

`messages/el.json`:

```json
"VoiceWish": {
    "record": "Ηχογραφήστε ένα μήνυμα",
    "stop": "Διακοπή",
    "recordAgain": "Νέα ηχογράφηση",
    "removeRecording": "Αφαίρεση ηχογράφησης",
    "micBlocked": "Η πρόσβαση στο μικρόφωνο είναι αποκλεισμένη.",
    "play": "Αναπαραγωγή",
    "pause": "Παύση",
    "cantPlay": "Δεν είναι δυνατή η αναπαραγωγή της ηχογράφησης."
},
```

- [ ] **Step 5: Check**

Run: `npx tsc --noEmit; npx vitest run lib/api messages`
Expected: tsc clean; tests pass (there is usually a test that every error code has a message key and that `en` and `el` have the same keys — both must pass).

- [ ] **Step 6: Commit**

```bash
git add lib/api messages hooks components app lib/demo
git commit -m "KAN-220: Types, error codes and copy for voice wishes"
```

---

### Task 2: Voice helpers and the multipart body

**Files:**
- Create: `lib/wishbook/voice.ts`, `lib/wishbook/voice.test.ts`
- Modify: `lib/api/client.ts:325-358`, `lib/api/client.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';

import { buildWishFormData, formatClipDuration, MAX_RECORDING_MS, pickRecordingMimeType, recordingFileName } from '@/lib/wishbook/voice';

describe('pickRecordingMimeType', () => {
    it('prefers WebM Opus', () => {
        expect(pickRecordingMimeType(() => true)).toBe('audio/webm;codecs=opus');
    });
    it('falls back to MP4 (Safari), then Ogg', () => {
        expect(pickRecordingMimeType((type) => type === 'audio/mp4')).toBe('audio/mp4');
        expect(pickRecordingMimeType((type) => type === 'audio/ogg')).toBe('audio/ogg');
    });
    it('gives undefined when nothing is supported, so the browser picks', () => {
        expect(pickRecordingMimeType(() => false)).toBeUndefined();
    });
});

describe('formatClipDuration', () => {
    it('writes minutes and seconds', () => {
        expect(formatClipDuration(0)).toBe('0:00');
        expect(formatClipDuration(4_200)).toBe('0:04');
        expect(formatClipDuration(MAX_RECORDING_MS)).toBe('1:00');
    });
});

describe('recordingFileName', () => {
    it('names the file after its container', () => {
        expect(recordingFileName('audio/webm;codecs=opus')).toBe('wish.webm');
        expect(recordingFileName('audio/mp4')).toBe('wish.m4a');
        expect(recordingFileName('audio/ogg;codecs=opus')).toBe('wish.ogg');
        expect(recordingFileName('')).toBe('wish.webm');
    });
});

describe('buildWishFormData', () => {
    it('sends the wish as a JSON blob and the recording as a file', async () => {
        const audio = new Blob(['x'], { type: 'audio/mp4' });
        const form = buildWishFormData({ message: 'Hi' }, audio);

        const wish = form.get('wish') as File;
        expect(wish.type).toBe('application/json');
        expect(JSON.parse(await wish.text())).toEqual({ message: 'Hi' });
        expect((form.get('audio') as File).name).toBe('wish.m4a');
    });
    it('leaves the audio part out when there is no recording', () => {
        expect(buildWishFormData({ removeAudio: true }, null).has('audio')).toBe(false);
    });
});
```

And in `lib/api/client.test.ts`, next to the `postForm` test, a `putForm` test copying it with `method: 'PUT'`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run lib/wishbook/voice.test.ts lib/api/client.test.ts`
Expected: FAIL (module not found; `putForm` missing).

- [ ] **Step 3: Implement**

`lib/wishbook/voice.ts`:

```ts
// Voice wishes (KAN-220). The server accepts up to 62 s; the app stops at 60 s.
export const MAX_RECORDING_MS = 60_000;

// First supported wins. WebM Opus: Chrome, Firefox, Android. MP4: Safari. Ogg: some Firefox builds.
const RECORDING_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg'] as const;

export function pickRecordingMimeType(isTypeSupported: (type: string) => boolean): string | undefined {
    return RECORDING_MIME_TYPES.find((type) => isTypeSupported(type));
}

export function formatClipDuration(ms: number): string {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function recordingFileName(mimeType: string): string {
    if (mimeType.startsWith('audio/mp4')) return 'wish.m4a';
    if (mimeType.startsWith('audio/ogg')) return 'wish.ogg';
    return 'wish.webm';
}

// The server reads `wish` as a file part of JSON (a plain string field is refused) and `audio` as the recording.
export function buildWishFormData(wish: object, audio: Blob | null): FormData {
    const form = new FormData();
    form.append('wish', new Blob([JSON.stringify(wish)], { type: 'application/json' }), 'wish.json');
    if (audio) form.append('audio', audio, recordingFileName(audio.type));
    return form;
}
```

`lib/api/client.ts`, after `postForm`:

```ts
    putForm: <T>(path: string, formData: FormData, options?: RequestInit) => apiFetch<T>(path, { ...options, method: 'PUT', body: formData }),
```

- [ ] **Step 4: Run them to see them pass**

Run: `npx vitest run lib/wishbook/voice.test.ts lib/api/client.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/wishbook lib/api/client.ts lib/api/client.test.ts
git commit -m "KAN-220: Voice helpers and multipart PUT"
```

---

### Task 3: The mutations send a recording

**Files:**
- Modify: `hooks/useWishbook.ts` (`useCreateWishbookEntry`, `useEditWishbookEntry`), `hooks/useQrWish.ts`
- Test: `hooks/useWishbook.test.ts`, `hooks/useQrWish.test.ts` (create the second if missing; mirror the first's setup)

- [ ] **Step 1: Write the failing tests**

Follow how `hooks/useWishbook.test.ts` already mocks `api` (`vi.mock('@/lib/api/client', ...)`) and wraps in a `QueryClientProvider`:

```ts
it('creates a text wish as JSON', async () => {
    const { result } = renderHook(() => useCreateWishbookEntry('e1'), { wrapper });
    await result.current.mutateAsync({ message: 'Hi' });
    expect(api.post).toHaveBeenCalledWith('/api/events/e1/wishbook', { message: 'Hi' });
    expect(api.postForm).not.toHaveBeenCalled();
});

it('creates a wish with a recording as multipart', async () => {
    const audio = new Blob(['x'], { type: 'audio/webm' });
    const { result } = renderHook(() => useCreateWishbookEntry('e1'), { wrapper });
    await result.current.mutateAsync({ message: '', audio });
    const [path, form] = vi.mocked(api.postForm).mock.calls[0];
    expect(path).toBe('/api/events/e1/wishbook');
    expect((form as FormData).get('audio')).toBeInstanceOf(Blob);
});

it('edits with a new recording as multipart PUT', async () => {
    const audio = new Blob(['x'], { type: 'audio/mp4' });
    const { result } = renderHook(() => useEditWishbookEntry('e1'), { wrapper });
    await result.current.mutateAsync({ entryId: 'w1', message: 'Hi', audio });
    expect(vi.mocked(api.putForm).mock.calls[0][0]).toBe('/api/wishbook/w1');
});

it('removes a recording with a JSON PUT', async () => {
    const { result } = renderHook(() => useEditWishbookEntry('e1'), { wrapper });
    await result.current.mutateAsync({ entryId: 'w1', message: 'Hi', removeAudio: true });
    expect(api.put).toHaveBeenCalledWith('/api/wishbook/w1', { message: 'Hi', removeAudio: true });
});

it('refreshes the host list after an edit too', async () => {
    // A host-visible wish changed (its recording): the list key is a prefix of "mine", so both refetch.
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useEditWishbookEntry('e1'), { wrapper });
    await result.current.mutateAsync({ entryId: 'w1', message: 'Hi' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['events', 'e1', 'wishbook'] });
});
```

`useQrWish.test.ts`: a recording goes through `api.publicPostForm` to `/api/qr/tok/wishes` with the acceptance fields inside the `wish` JSON part; without one it stays `api.publicPost`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run hooks/useWishbook.test.ts hooks/useQrWish.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`hooks/useWishbook.ts`:

```ts
type CreateWishInput = WishbookEntryRequestDto & { audio?: Blob | null };

export function useCreateWishbookEntry(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ audio, ...wish }: CreateWishInput) =>
            audio
                ? api.postForm<WishbookEntryResponseDto>(endpoints.events.wishbook(eventId), buildWishFormData(wish, audio))
                : api.post<WishbookEntryResponseDto>(endpoints.events.wishbook(eventId), wish),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: wishbookKeys.list(eventId) });
            queryClient.invalidateQueries({ queryKey: wishbookKeys.count(eventId) });
        },
    });
}

type EditWishInput = { entryId: string; audio?: Blob | null } & WishbookEntryEditDto;

export function useEditWishbookEntry(eventId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ entryId, audio, ...wish }: EditWishInput) =>
            audio
                ? api.putForm<WishbookEntryResponseDto>(endpoints.wishbook.byId(entryId), buildWishFormData(wish, audio))
                : api.put<WishbookEntryResponseDto>(endpoints.wishbook.byId(entryId), wish),
        onSuccess: () => {
            // The list key is a prefix of "mine": one invalidation refreshes both.
            queryClient.invalidateQueries({ queryKey: wishbookKeys.list(eventId) });
        },
    });
}
```

Keep the existing JSON call shape when there is no recording: the existing test that expects `api.put(..., { message })` must still pass (`wish` is `{ message }` then).

`hooks/useQrWish.ts`:

```ts
interface SendQrWishInput {
    token: string;
    guestName: string;
    message: string;
    audio?: Blob | null;
    acceptance: QrUploadAcceptance;
}

export function useSendQrWish() {
    return useMutation({
        mutationFn: ({ token, guestName, message, audio, acceptance }: SendQrWishInput) => {
            const wish = {
                guestName,
                ...(message ? { message } : {}),
                ageConfirmed: true,
                acceptedTermsVersion: acceptance.termsVersion,
                acceptedGuidelinesVersion: acceptance.guidelinesVersion,
            } satisfies QrWishRequestDto;
            return audio
                ? api.publicPostForm<QrWishResponseDto>(endpoints.qrLinks.wishes(token), buildWishFormData(wish, audio))
                : api.publicPost<QrWishResponseDto>(endpoints.qrLinks.wishes(token), wish);
        },
    });
}
```

- [ ] **Step 4: Run them to see them pass**

Run: `npx vitest run hooks/useWishbook.test.ts hooks/useQrWish.test.ts hooks/useWishEditor.test.ts hooks/useGuestWishForm.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks
git commit -m "KAN-220: Wish mutations send a recording"
```

---

### Task 4: useVoiceRecorder

**Files:**
- Create: `hooks/useVoiceRecorder.ts`, `hooks/useVoiceRecorder.test.ts`

State: `status` is `'idle' | 'recording' | 'recorded' | 'denied' | 'unsupported'`. `'unsupported'` comes from `useSyncExternalStore` (false on the server, so the first render matches; no `setState` in an effect). Actions: `start`, `stop`, `discard`. "Record again" is `start` from `recorded` (it discards first). Stops itself at 60 s. Releases the microphone on stop, discard and unmount, and revokes the blob URL it made.

A microphone error named `NotAllowedError` or `SecurityError` is `denied`. Any other error (no microphone: `NotFoundError`) is treated as unsupported for this session, so the control hides.

- [ ] **Step 1: Write the failing test**

```ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { MAX_RECORDING_MS } from '@/lib/wishbook/voice';

class FakeMediaRecorder {
    static isTypeSupported = vi.fn((type: string) => type === 'audio/mp4');
    static last: FakeMediaRecorder | null = null;
    state: 'inactive' | 'recording' = 'inactive';
    mimeType: string;
    ondataavailable: ((e: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    constructor(public stream: MediaStream, options?: { mimeType?: string }) {
        this.mimeType = options?.mimeType ?? '';
        FakeMediaRecorder.last = this;
    }
    start() {
        this.state = 'recording';
    }
    stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['sound'], { type: this.mimeType }) });
        this.onstop?.();
    }
}

const stopTrack = vi.fn();
const stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;

beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
    URL.createObjectURL = vi.fn(() => 'blob:wish');
    URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    stopTrack.mockReset();
});

describe('useVoiceRecorder', () => {
    it('records, stops and hands back the recording', async () => {
        const { result } = renderHook(() => useVoiceRecorder());
        expect(result.current.status).toBe('idle');

        await act(() => result.current.start());
        expect(result.current.status).toBe('recording');
        expect(FakeMediaRecorder.last?.mimeType).toBe('audio/mp4');

        act(() => vi.advanceTimersByTime(4_000));
        expect(result.current.elapsedMs).toBeGreaterThanOrEqual(4_000);

        act(() => result.current.stop());
        expect(result.current.status).toBe('recorded');
        expect(result.current.recording?.url).toBe('blob:wish');
        expect(result.current.recording?.blob.type).toBe('audio/mp4');
        expect(result.current.recording?.durationMs).toBeGreaterThanOrEqual(4_000);
        expect(stopTrack).toHaveBeenCalled();
    });

    it('stops itself at one minute', async () => {
        const { result } = renderHook(() => useVoiceRecorder());
        await act(() => result.current.start());
        act(() => vi.advanceTimersByTime(MAX_RECORDING_MS + 500));
        expect(result.current.status).toBe('recorded');
        expect(result.current.recording?.durationMs).toBeLessThanOrEqual(MAX_RECORDING_MS + 500);
    });

    it('says the microphone is blocked when permission is refused', async () => {
        vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(Object.assign(new Error('no'), { name: 'NotAllowedError' }));
        const { result } = renderHook(() => useVoiceRecorder());
        await act(() => result.current.start());
        expect(result.current.status).toBe('denied');
    });

    it('hides itself when there is no microphone', async () => {
        vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(Object.assign(new Error('no'), { name: 'NotFoundError' }));
        const { result } = renderHook(() => useVoiceRecorder());
        await act(() => result.current.start());
        expect(result.current.status).toBe('unsupported');
    });

    it('is unsupported without MediaRecorder', () => {
        vi.stubGlobal('MediaRecorder', undefined);
        const { result } = renderHook(() => useVoiceRecorder());
        expect(result.current.status).toBe('unsupported');
    });

    it('discards the recording and frees its URL', async () => {
        const { result } = renderHook(() => useVoiceRecorder());
        await act(() => result.current.start());
        act(() => result.current.stop());
        act(() => result.current.discard());
        expect(result.current.status).toBe('idle');
        expect(result.current.recording).toBeNull();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:wish');
    });

    it('records again from a finished recording', async () => {
        const { result } = renderHook(() => useVoiceRecorder());
        await act(() => result.current.start());
        act(() => result.current.stop());
        await act(() => result.current.start());
        expect(result.current.status).toBe('recording');
        expect(result.current.recording).toBeNull();
    });

    it('releases the microphone when unmounted mid-recording', async () => {
        const { result, unmount } = renderHook(() => useVoiceRecorder());
        await act(() => result.current.start());
        unmount();
        expect(stopTrack).toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run hooks/useVoiceRecorder.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { MAX_RECORDING_MS, pickRecordingMimeType } from '@/lib/wishbook/voice';

export type VoiceRecorderStatus = 'idle' | 'recording' | 'recorded' | 'denied' | 'unsupported';

export interface VoiceRecording {
    blob: Blob;
    url: string;
    durationMs: number;
}

const TICK_MS = 250;

function subscribeNever() {
    return () => {};
}
function canRecord() {
    return typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
}
function canRecordOnServer() {
    return false;
}

// Records one spoken wish with MediaRecorder. Stops at 60 s; frees the microphone and the blob URL.
export function useVoiceRecorder() {
    const supported = useSyncExternalStore(subscribeNever, canRecord, canRecordOnServer);
    const [phase, setPhase] = useState<Exclude<VoiceRecorderStatus, 'unsupported'> | 'noMicrophone'>('idle');
    const [elapsedMs, setElapsedMs] = useState(0);
    const [recording, setRecording] = useState<VoiceRecording | null>(null);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const startedAtRef = useRef(0);
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const urlRef = useRef<string | null>(null);

    const releaseMicrophone = useCallback(() => {
        if (tickRef.current) clearInterval(tickRef.current);
        tickRef.current = null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    }, []);

    const forgetRecording = useCallback(() => {
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
        setRecording(null);
    }, []);

    const stop = useCallback(() => {
        const recorder = recorderRef.current;
        if (recorder && recorder.state === 'recording') recorder.stop();
    }, []);

    const start = useCallback(async () => {
        forgetRecording();
        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (error) {
            const name = error instanceof Error ? error.name : '';
            setPhase(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'noMicrophone');
            return;
        }
        streamRef.current = stream;
        const mimeType = pickRecordingMimeType((type) => MediaRecorder.isTypeSupported(type));
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        const chunks: Blob[] = [];
        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) chunks.push(event.data);
        };
        recorder.onstop = () => {
            const durationMs = Math.min(Date.now() - startedAtRef.current, MAX_RECORDING_MS + TICK_MS * 2);
            releaseMicrophone();
            const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
            const url = URL.createObjectURL(blob);
            urlRef.current = url;
            setRecording({ blob, url, durationMs });
            setElapsedMs(durationMs);
            setPhase('recorded');
        };
        recorderRef.current = recorder;
        startedAtRef.current = Date.now();
        setElapsedMs(0);
        recorder.start();
        setPhase('recording');
        tickRef.current = setInterval(() => {
            const elapsed = Date.now() - startedAtRef.current;
            setElapsedMs(elapsed);
            if (elapsed >= MAX_RECORDING_MS) stop();
        }, TICK_MS);
    }, [forgetRecording, releaseMicrophone, stop]);

    const discard = useCallback(() => {
        forgetRecording();
        setElapsedMs(0);
        setPhase('idle');
    }, [forgetRecording]);

    useEffect(
        () => () => {
            const recorder = recorderRef.current;
            if (recorder && recorder.state === 'recording') {
                recorder.onstop = null;
                recorder.stop();
            }
            releaseMicrophone();
            if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        },
        [releaseMicrophone],
    );

    const status: VoiceRecorderStatus = !supported || phase === 'noMicrophone' ? 'unsupported' : phase;
    return { status, elapsedMs, recording, start, stop, discard };
}

export type VoiceRecorder = ReturnType<typeof useVoiceRecorder>;
```

The fake timers in the test drive `Date.now()` too (Vitest fakes `Date` by default with `useFakeTimers`).

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run hooks/useVoiceRecorder.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/useVoiceRecorder.ts hooks/useVoiceRecorder.test.ts
git commit -m "KAN-220: Voice recorder hook"
```

---

### Task 5: useAudioPlayer and VoiceWishPlayer

**Files:**
- Create: `hooks/useAudioPlayer.ts`, `hooks/useAudioPlayer.test.ts`, `components/wishbook/VoiceWishPlayer.tsx`, `components/wishbook/VoiceWishPlayer.test.tsx`, `components/wishbook/VoiceWishPlayer.stories.tsx`

A round play/pause button (44 px, thumb-friendly) and the time: the duration when stopped, the position while playing. A MediaRecorder WebM often reports `Infinity` as its duration in the browser, so the `durationMs` prop (from the server, or the recorder's own clock) is what is shown; the element's duration is used only when it is finite. If playback fails, one short line (`VoiceWish.cantPlay`). A fresh `src` (the list refetched a new presigned URL) clears the error.

- [ ] **Step 1: Write the failing tests**

`hooks/useAudioPlayer.test.ts`:

```ts
it('plays and pauses', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const { result } = renderHook(() => useAudioPlayer('https://r2.test/a.m4a', 4200));
    const audio = document.createElement('audio');
    act(() => result.current.audioRef(audio));

    await act(() => result.current.toggle());
    expect(play).toHaveBeenCalled();
    act(() => audio.dispatchEvent(new Event('play')));
    expect(result.current.isPlaying).toBe(true);

    await act(() => result.current.toggle());
    expect(pause).toHaveBeenCalled();
});

it('shows the given duration when the element reports Infinity', () => {
    const { result } = renderHook(() => useAudioPlayer('blob:x', 4200));
    expect(result.current.durationMs).toBe(4200);
});

it('marks a failed load and clears it for a new src', () => {
    const { result, rerender } = renderHook(({ src }) => useAudioPlayer(src, 4200), { initialProps: { src: 'a' } });
    act(() => result.current.onError());
    expect(result.current.failed).toBe(true);
    rerender({ src: 'b' });
    expect(result.current.failed).toBe(false);
});

it('a refused play() counts as a failure', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('NotSupportedError'));
    const { result } = renderHook(() => useAudioPlayer('a', 1000));
    act(() => result.current.audioRef(document.createElement('audio')));
    await act(() => result.current.toggle());
    expect(result.current.failed).toBe(true);
});
```

`components/wishbook/VoiceWishPlayer.test.tsx` (mock `next-intl` as `WishEditSheet.test.tsx` does):

```ts
it('labels the button Play, then Pause', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    render(<VoiceWishPlayer src="a.m4a" durationMs={42_000} />);
    expect(screen.getByText('0:42')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'play' });
    fireEvent.click(button);
    fireEvent.play(document.querySelector('audio')!);
    expect(screen.getByRole('button', { name: 'pause' })).toBeInTheDocument();
});

it('says when a recording cannot be played', () => {
    render(<VoiceWishPlayer src="a.m4a" durationMs={42_000} />);
    fireEvent.error(document.querySelector('audio')!);
    expect(screen.getByText('cantPlay')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run hooks/useAudioPlayer.test.ts components/wishbook/VoiceWishPlayer.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement the hook**

```ts
'use client';

import { useCallback, useRef, useState } from 'react';

// Play/pause state for one <audio>. The given duration wins over the element's: a MediaRecorder WebM reports Infinity.
export function useAudioPlayer(src: string, durationMs: number) {
    const elementRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [positionMs, setPositionMs] = useState(0);
    const [elementDurationMs, setElementDurationMs] = useState<number | null>(null);
    const [failedSrc, setFailedSrc] = useState<string | null>(null);

    const audioRef = useCallback((element: HTMLAudioElement | null) => {
        elementRef.current = element;
    }, []);

    async function toggle() {
        const element = elementRef.current;
        if (!element) return;
        if (!element.paused) {
            element.pause();
            return;
        }
        try {
            await element.play();
        } catch {
            setFailedSrc(src);
        }
    }

    return {
        audioRef,
        isPlaying,
        positionMs,
        durationMs: elementDurationMs ?? durationMs,
        // Keyed to the src: a fresh presigned URL gets a fresh try.
        failed: failedSrc === src,
        toggle,
        onPlay: () => setIsPlaying(true),
        onPause: () => setIsPlaying(false),
        onEnded: () => {
            setIsPlaying(false);
            setPositionMs(0);
        },
        onTimeUpdate: () => setPositionMs((elementRef.current?.currentTime ?? 0) * 1000),
        onLoadedMetadata: () => {
            const seconds = elementRef.current?.duration ?? Number.NaN;
            setElementDurationMs(Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null);
        },
        onError: () => setFailedSrc(src),
    };
}
```

`toggle` is an async function; the test's `play` event is dispatched by hand because jsdom's `play()` doesn't fire events. Wire `onPlay`/`onPause` etc. to the element in the component, so the hook state follows the element, not the click.

- [ ] **Step 4: Implement the component**

```tsx
'use client';

import { Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { formatClipDuration } from '@/lib/wishbook/voice';

// A wish's recording: one round play/pause button and its time. Thumb-sized, no chrome.
export function VoiceWishPlayer({ src, durationMs }: { src: string; durationMs: number }) {
    const t = useTranslations('VoiceWish');
    const player = useAudioPlayer(src, durationMs);
    const shownMs = player.isPlaying || player.positionMs > 0 ? player.positionMs : player.durationMs;

    return (
        <div className="flex flex-col gap-1">
            {/* Controls */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={player.toggle}
                    aria-label={player.isPlaying ? t('pause') : t('play')}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white bg-gradient-brand transition-opacity hover:opacity-90"
                >
                    {player.isPlaying ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4 translate-x-px" aria-hidden="true" />}
                </button>
                <span className="text-sm text-ink-muted tabular-nums">{formatClipDuration(shownMs)}</span>
                <audio
                    ref={player.audioRef}
                    src={src}
                    preload="metadata"
                    onPlay={player.onPlay}
                    onPause={player.onPause}
                    onEnded={player.onEnded}
                    onTimeUpdate={player.onTimeUpdate}
                    onLoadedMetadata={player.onLoadedMetadata}
                    onError={player.onError}
                    className="hidden"
                />
            </div>

            {/* Error */}
            {player.failed ? <p className="text-xs text-rose-600">{t('cantPlay')}</p> : null}
        </div>
    );
}
```

`onClick={player.toggle}` passes the event to an async function that ignores it; if lint objects (`no-misused-promises`), wrap it: `function toggle() { void player.toggle(); }`.

- [ ] **Step 5: Stories**

`components/wishbook/VoiceWishPlayer.stories.tsx`, `title: 'Wishbook/VoiceWishPlayer'`, args `{ src: '/storybook/voice-wish.m4a', durationMs: 42_000 }`, stories `Default` and `Failed` (src `'/missing.m4a'`, `play` function that fires `error` on the audio element and expects the `cantPlay` text). Add a 1 s silent `public/storybook/voice-wish.m4a` only if `public/storybook/` already exists for fixtures; otherwise use the `Failed` story's missing path for both and let `Default` show the idle state (it never plays in a screenshot anyway). Make the story deterministic: no autoplay.

- [ ] **Step 6: Run and commit**

Run: `npx vitest run hooks/useAudioPlayer.test.ts components/wishbook/VoiceWishPlayer.test.tsx`
Expected: PASS.

```bash
git add hooks/useAudioPlayer.ts hooks/useAudioPlayer.test.ts components/wishbook/VoiceWishPlayer*
git commit -m "KAN-220: Voice wish player"
```

---

### Task 6: VoiceRecorder component

**Files:**
- Create: `components/wishbook/VoiceRecorder.tsx`, `components/wishbook/VoiceRecorder.test.tsx`, `components/wishbook/VoiceRecorder.stories.tsx`

Props: `recorder: VoiceRecorder` (from Task 4), `disabled?: boolean`, and for the edit sheet `existing?: WishAudioDto | null` with `onRemoveExisting?: () => void`.

What it draws, by state:

| State | Shown |
| --- | --- |
| `unsupported` | nothing |
| `idle`, `existing` given | `VoiceWishPlayer` of the existing recording; **Record again**; **Remove recording** |
| `idle` | **Record a message** (mic icon) |
| `denied` | **Record a message**, and under it "Microphone access is blocked." |
| `recording` | **Stop** (square icon), a pulsing red dot and `0:12 / 1:00` |
| `recorded` | `VoiceWishPlayer` of the blob; **Record again**; **Remove recording** |

Pill buttons like the app's other secondary buttons (`min-h-11 rounded-full bg-surface-muted px-4 text-sm font-semibold text-ink`); Remove in rose text like the edit sheet's delete. One row on a phone, wrapping if needed.

- [ ] **Step 1: Write the failing test**

```tsx
import { VoiceRecorder } from '@/components/wishbook/VoiceRecorder';
import type { VoiceRecorder as VoiceRecorderState } from '@/hooks/useVoiceRecorder';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

function recorder(overrides: Partial<VoiceRecorderState> = {}): VoiceRecorderState {
    return { status: 'idle', elapsedMs: 0, recording: null, start: vi.fn(), stop: vi.fn(), discard: vi.fn(), ...overrides };
}

it('draws nothing where recording is not possible', () => {
    const { container } = render(<VoiceRecorder recorder={recorder({ status: 'unsupported' })} />);
    expect(container).toBeEmptyDOMElement();
});

it('starts recording', () => {
    const r = recorder();
    render(<VoiceRecorder recorder={r} />);
    fireEvent.click(screen.getByRole('button', { name: 'record' }));
    expect(r.start).toHaveBeenCalled();
});

it('shows the time and stops', () => {
    const r = recorder({ status: 'recording', elapsedMs: 12_000 });
    render(<VoiceRecorder recorder={r} />);
    expect(screen.getByText('0:12 / 1:00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'stop' }));
    expect(r.stop).toHaveBeenCalled();
});

it('plays back, records again or removes a finished recording', () => {
    const r = recorder({ status: 'recorded', recording: { blob: new Blob(), url: 'blob:x', durationMs: 4_000 } });
    render(<VoiceRecorder recorder={r} />);
    expect(screen.getByRole('button', { name: 'play' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'recordAgain' }));
    expect(r.start).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'removeRecording' }));
    expect(r.discard).toHaveBeenCalled();
});

it('says the microphone is blocked', () => {
    render(<VoiceRecorder recorder={recorder({ status: 'denied' })} />);
    expect(screen.getByText('micBlocked')).toBeInTheDocument();
});

it('offers to replace or remove an existing recording', () => {
    const r = recorder();
    const onRemoveExisting = vi.fn();
    render(<VoiceRecorder recorder={r} existing={{ url: 'https://r2.test/a.m4a', durationMs: 9_000 }} onRemoveExisting={onRemoveExisting} />);
    fireEvent.click(screen.getByRole('button', { name: 'recordAgain' }));
    expect(r.start).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'removeRecording' }));
    expect(onRemoveExisting).toHaveBeenCalled();
});

it('disables its buttons while the form sends', () => {
    render(<VoiceRecorder recorder={recorder()} disabled />);
    expect(screen.getByRole('button', { name: 'record' })).toBeDisabled();
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/wishbook/VoiceRecorder.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
'use client';

import { Mic, RotateCcw, Square, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { VoiceWishPlayer } from '@/components/wishbook/VoiceWishPlayer';
import type { VoiceRecorder as VoiceRecorderState } from '@/hooks/useVoiceRecorder';
import type { WishAudioDto } from '@/lib/api/types';
import { formatClipDuration, MAX_RECORDING_MS } from '@/lib/wishbook/voice';

const PILL = 'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold disabled:opacity-40';

type Props = {
    recorder: VoiceRecorderState;
    disabled?: boolean;
    // The edit sheet: the wish's stored recording, shown until it is replaced or removed.
    existing?: WishAudioDto | null;
    onRemoveExisting?: () => void;
};

// Record a spoken wish, then play it back, record it again or remove it before sending.
export function VoiceRecorder({ recorder, disabled = false, existing = null, onRemoveExisting }: Props) {
    const t = useTranslations('VoiceWish');

    if (recorder.status === 'unsupported') return null;

    const finished = recorder.status === 'recorded' && recorder.recording ? recorder.recording : null;
    const kept = !finished && recorder.status === 'idle' ? existing : null;

    function start() {
        void recorder.start();
    }

    if (recorder.status === 'recording') {
        return (
            /* Recording */
            <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={recorder.stop} className={`${PILL} bg-surface-muted text-ink`}>
                    <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    {t('stop')}
                </button>
                <span className="flex items-center gap-2 text-sm text-ink-muted tabular-nums">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" aria-hidden="true" />
                    {`${formatClipDuration(recorder.elapsedMs)} / ${formatClipDuration(MAX_RECORDING_MS)}`}
                </span>
            </div>
        );
    }

    const playback = finished ?? kept;
    if (playback) {
        return (
            /* Playback */
            <div className="flex flex-wrap items-center gap-2">
                <VoiceWishPlayer src={playback.url} durationMs={playback.durationMs} />
                <button type="button" onClick={start} disabled={disabled} className={`${PILL} bg-surface-muted text-ink`}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    {t('recordAgain')}
                </button>
                <button
                    type="button"
                    onClick={finished ? recorder.discard : onRemoveExisting}
                    disabled={disabled}
                    className={`${PILL} text-rose-600 hover:bg-rose-50`}
                >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    {t('removeRecording')}
                </button>
            </div>
        );
    }

    return (
        /* Record */
        <div className="flex flex-col items-start gap-1.5">
            <button type="button" onClick={start} disabled={disabled} className={`${PILL} bg-surface-muted text-ink`}>
                <Mic className="h-4 w-4 text-primary" aria-hidden="true" />
                {t('record')}
            </button>
            {recorder.status === 'denied' ? <p className="text-xs text-ink-muted">{t('micBlocked')}</p> : null}
        </div>
    );
}
```

Note: Record again on the existing recording starts a new one; if the guest then removes the new recording, the existing one comes back (the recorder is `idle` again and `existing` is still set), which is the safe reading of "Remove" there.

- [ ] **Step 4: Stories**

`title: 'Wishbook/VoiceRecorder'`, a fake `recorder` built with `fn()` (like `WishEditSheet.stories.tsx` builds its editor), stories: `Idle`, `Recording` (`elapsedMs: 12_000`), `Recorded` (`recording.url` the same fixture path as the player story), `Denied`, `Existing`. No timers in stories: every state is a fixed prop.

- [ ] **Step 5: Run and commit**

Run: `npx vitest run components/wishbook/VoiceRecorder.test.tsx`
Expected: PASS.

```bash
git add components/wishbook/VoiceRecorder*
git commit -m "KAN-220: Voice recorder control"
```

---

### Task 7: In-app composer gets the recorder

The composer moves out of `PageClient.tsx` (CLAUDE.md: thin pages, state in hooks) and gains the recorder. Behaviour otherwise stays as it is: the sent confirmation for 5 s, the demo builder's signature rule, the character count.

**Files:**
- Create: `hooks/useWishComposer.ts` (+ test), `components/wishbook/WishComposer.tsx` (+ test, + stories)
- Modify: `app/(main)/(app)/(event)/events/[eventId]/tools/wishbook/PageClient.tsx:63-208`

- [ ] **Step 1: Write the failing hook test**

Mock `useCreateWishbookEntry` and `useVoiceRecorder` (`vi.mock('@/hooks/useWishbook', ...)`, `vi.mock('@/hooks/useVoiceRecorder', ...)`):

```ts
it('sends text only as before', async () => {
    const { result } = renderHook(() => useWishComposer({ eventId: 'e1', guestName: 'Maria', maxMessageLength: 2000 }));
    act(() => result.current.changeMessage({ target: { value: ' Hi ' } } as ChangeEvent<HTMLTextAreaElement>));
    await act(() => result.current.submit(fakeSubmitEvent()));
    expect(mutateAsync).toHaveBeenCalledWith({ message: 'Hi', guestName: 'Maria', audio: null });
    expect(result.current.showSent).toBe(true);
});

it('sends a recording without text', async () => {
    recorderState.status = 'recorded';
    recorderState.recording = { blob: new Blob(['x']), url: 'blob:x', durationMs: 3000 };
    const { result } = renderHook(() => useWishComposer({ eventId: 'e1', guestName: 'Maria', maxMessageLength: 2000 }));
    expect(result.current.canSend).toBe(true);
    await act(() => result.current.submit(fakeSubmitEvent()));
    expect(mutateAsync).toHaveBeenCalledWith({ message: '', guestName: 'Maria', audio: recorderState.recording!.blob });
    expect(recorderState.discard).toHaveBeenCalled();
});

it('cannot send while recording or with nothing', () => {
    recorderState.status = 'recording';
    const { result } = renderHook(() => useWishComposer({ eventId: 'e1', guestName: 'Maria', maxMessageLength: 2000 }));
    expect(result.current.canSend).toBe(false);
});

it('keeps the recording when sending fails', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('3131'));
    // ...recorded state...
    await act(() => result.current.submit(fakeSubmitEvent()));
    expect(recorderState.discard).not.toHaveBeenCalled();
    expect(result.current.showSent).toBe(false);
});

it('hides the sent note after five seconds', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useWishComposer({ eventId: 'e1', guestName: 'Maria', maxMessageLength: 2000 }));
    act(() => result.current.changeMessage({ target: { value: 'Hi' } } as ChangeEvent<HTMLTextAreaElement>));
    await act(() => result.current.submit(fakeSubmitEvent()));
    expect(result.current.showSent).toBe(true);
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.showSent).toBe(false);
    vi.useRealTimers();
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run hooks/useWishComposer.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the hook**

```ts
'use client';

import type React from 'react';
import { useEffect, useState } from 'react';

import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useCreateWishbookEntry } from '@/hooks/useWishbook';

const SENT_NOTE_MS = 5000;

// The in-app write form: text, a recording, or both. guestName undefined lets the backend sign it.
export function useWishComposer({ eventId, guestName, maxMessageLength }: { eventId: string; guestName: string | undefined; maxMessageLength: number }) {
    const createEntry = useCreateWishbookEntry(eventId);
    const recorder = useVoiceRecorder();
    const [message, setMessage] = useState('');
    const [showSent, setShowSent] = useState(false);

    useEffect(() => {
        if (!showSent) return;
        const timeout = setTimeout(() => setShowSent(false), SENT_NOTE_MS);
        return () => clearTimeout(timeout);
    }, [showSent]);

    const trimmed = message.trim();
    const audio = recorder.status === 'recorded' ? (recorder.recording?.blob ?? null) : null;
    const canSend = (trimmed !== '' || audio !== null) && recorder.status !== 'recording' && !createEntry.isPending;

    function changeMessage(event: React.ChangeEvent<HTMLTextAreaElement>) {
        setMessage(event.target.value.slice(0, maxMessageLength));
    }

    async function submit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!canSend) return;
        setShowSent(false);
        try {
            await createEntry.mutateAsync({ message: trimmed, guestName, audio });
        } catch {
            return; // createEntry.error shows under the form; keep the text and the recording
        }
        setMessage('');
        recorder.discard();
        setShowSent(true);
    }

    return {
        message,
        changeMessage,
        recorder,
        canSend,
        isSending: createEntry.isPending,
        sendError: createEntry.error,
        showSent,
        submit,
    };
}

export type WishComposerState = ReturnType<typeof useWishComposer>;
```

The page used to let `mutateAsync` reject unhandled; catching here is deliberate so a failed upload keeps the recording.

- [ ] **Step 4: Implement the component**

Move the composer JSX from `PageClient.tsx` (the sent note and the `<form>`, L176–208) into `components/wishbook/WishComposer.tsx` unchanged except for:

- `{/* Recording */}` `<VoiceRecorder recorder={composer.recorder} disabled={composer.isSending} />` between the textarea and the count/send row;
- the send button's `disabled={!composer.canSend}`;
- the error line uses `toErrorMessage(composer.sendError)`.

```tsx
export function WishComposer({ composer, maxMessageLength }: { composer: WishComposerState; maxMessageLength: number }) {
    const t = useTranslations('WishbookPage');
    const toErrorMessage = useApiErrorMessage();
    if (composer.showSent) {
        return (/* Sent */ /* the existing pink confirmation block, unchanged */);
    }
    return (
        <form onSubmit={composer.submit} className="mt-8 space-y-4">
            {/* Message */}
            {/* the existing textarea, value={composer.message} onChange={composer.changeMessage} disabled={composer.isSending} */}

            {/* Recording */}
            <VoiceRecorder recorder={composer.recorder} disabled={composer.isSending} />

            {/* Send */}
            {/* the existing count + button row, disabled={!composer.canSend}, spinner when composer.isSending */}
            {composer.sendError && <p className="text-xs text-rose-600">{toErrorMessage(composer.sendError)}</p>}
        </form>
    );
}
```

Write the JSX out in full in the file (copy the classes from `PageClient.tsx`); the comments above only mark where each existing piece goes.

In `PageClient.tsx`: remove `message`, `showSentConfirmation`, the timeout effect, `submit`, `changeMessage`, `createEntry` and the `Loader2`/`Send` imports they used; add

```tsx
// A demo builder's wish is signed by whoever they post as, which the backend fills in.
const composer = useWishComposer({
    eventId,
    guestName: contentAccess.isDemoBuilder ? undefined : (member?.displayName ?? undefined),
    maxMessageLength,
});
```

and render `{canWrite ? <WishComposer composer={composer} maxMessageLength={maxMessageLength} /> : null}` under `{/* Composer */}`.

- [ ] **Step 5: Component test and stories**

`WishComposer.test.tsx`: with a fake `composer` (like `WishEditSheet.test.tsx` builds an editor) — the send button is disabled when `canSend` is false; the recorder's Record button shows; `showSent` shows `wishSentTitle`. Stories `title: 'Wishbook/WishComposer'`: `Empty`, `WithRecording`, `Sent`.

- [ ] **Step 6: Run**

Run: `npx vitest run hooks/useWishComposer.test.ts components/wishbook/WishComposer.test.tsx "app/(main)/(app)/(event)/events/[eventId]/tools/wishbook"`
Expected: PASS, including the existing page tests.

- [ ] **Step 7: Commit**

```bash
git add hooks/useWishComposer* components/wishbook/WishComposer* "app/(main)/(app)/(event)/events/[eventId]/tools/wishbook/PageClient.tsx"
git commit -m "KAN-220: Record a wish in the app"
```

---

### Task 8: Hosts play recordings

**Files:**
- Modify: `app/(main)/(app)/(event)/events/[eventId]/tools/wishbook/PageClient.tsx:236-288`
- Test: `app/(main)/(app)/(event)/events/[eventId]/tools/wishbook/PageClient.myWishes.test.tsx` (or the page's host test, whichever renders host rows)

- [ ] **Step 1: Write the failing test**

```tsx
it('a host plays a voice wish', () => {
    // host list with one entry: message null, audio { url: 'https://r2.test/a.m4a', durationMs: 42000 }
    renderPageAsHost();
    expect(screen.getByRole('button', { name: 'play' })).toBeInTheDocument();
});

it('a voice-only row has no empty text line', () => {
    renderPageAsHost();
    const row = screen.getByRole('article');
    expect(row.querySelectorAll('p.whitespace-pre-wrap')).toHaveLength(0);
});
```

Mock `next-intl` so `VoiceWish` keys come back as the key, as the existing test does for `WishbookPage`.

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run "app/(main)/(app)/(event)/events/[eventId]/tools/wishbook"`
Expected: FAIL.

- [ ] **Step 3: Implement**

Replace the row's message line (L286):

```tsx
{entry.message ? (
    <p className="mt-3 text-sm leading-6 wrap-break-word whitespace-pre-wrap text-ink">{entry.message}</p>
) : null}
{entry.audio ? (
    <div className="mt-3">
        <VoiceWishPlayer src={entry.audio.url} durationMs={entry.audio.durationMs} />
    </div>
) : null}
```

- [ ] **Step 4: Run and commit**

Run: `npx vitest run "app/(main)/(app)/(event)/events/[eventId]/tools/wishbook"`
Expected: PASS.

```bash
git add "app/(main)/(app)/(event)/events/[eventId]/tools/wishbook"
git commit -m "KAN-220: Hosts play voice wishes"
```

---

### Task 9: "Your messages" rows

**Files:**
- Modify: `components/wishbook/MyWishesSection.tsx`, its test and stories

An editable row is one button that opens the edit sheet, so it can't hold a play button inside it. There the row shows a small mic icon and the length (`0:42`) next to the text, and the recording plays in the edit sheet (Task 10). A read-only row (the event no longer takes writes) has no button, so it shows the player itself.

- [ ] **Step 1: Write the failing tests**

```tsx
it('shows a voice wish as a mic and its length on an editable row', () => {
    render(<MyWishesSection {...props} canEdit entries={[voiceOnly]} />);
    expect(screen.getByText('0:42')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'play' })).not.toBeInTheDocument();
});

it('plays a voice wish on a read-only row', () => {
    render(<MyWishesSection {...props} canEdit={false} entries={[voiceOnly]} />);
    expect(screen.getByRole('button', { name: 'play' })).toBeInTheDocument();
});
```

`voiceOnly` = an entry with `message: null`, `audio: { url: 'https://r2.test/a.m4a', durationMs: 42_000 }`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run components/wishbook/MyWishesSection.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`MyWishRowText` takes `playable: boolean`:

```tsx
function MyWishRowText({ entry, playable }: { entry: WishbookEntryResponseDto; playable: boolean }) {
    return (
        <span className="min-w-0 flex-1">
            {entry.message ? (
                <span className="line-clamp-2 text-sm leading-6 wrap-break-word whitespace-pre-wrap text-ink">{entry.message}</span>
            ) : null}
            {entry.audio && playable ? (
                <span className="mt-1 block">
                    <VoiceWishPlayer src={entry.audio.url} durationMs={entry.audio.durationMs} />
                </span>
            ) : null}
            {entry.audio && !playable ? (
                <span className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted tabular-nums">
                    <Mic className="h-4 w-4 text-primary" aria-hidden="true" />
                    {formatClipDuration(entry.audio.durationMs)}
                </span>
            ) : null}
            <time dateTime={entry.createdAt} className="mt-1 block text-xs text-ink-faint">
                {dateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.createdAt))}
            </time>
        </span>
    );
}
```

The editable row passes `playable={false}`, the read-only one `playable`. `VoiceWishPlayer` renders a `<div>` inside a `<span>`; if that trips a nesting lint or test, make the wrapper a `<div>` in the read-only branch only.

Add a `VoiceWish` story variant to `MyWishesSection.stories.tsx` (one text row, one voice-only row, one with both).

- [ ] **Step 4: Run and commit**

Run: `npx vitest run components/wishbook/MyWishesSection.test.tsx`
Expected: PASS.

```bash
git add components/wishbook/MyWishesSection*
git commit -m "KAN-220: Voice wishes in Your messages"
```

---

### Task 10: Edit sheet — replace or remove the recording

**Files:**
- Modify: `hooks/useWishEditor.ts`, `hooks/useWishEditor.test.ts`, `components/wishbook/WishEditSheet.tsx`, `WishEditSheet.test.tsx`, `WishEditSheet.stories.tsx`

The editor keeps a recorder and a `removeExisting` flag. What gets saved:

- text: the draft, trimmed (empty is allowed when the wish keeps or gets a recording);
- a new recording if one is finished; otherwise `removeAudio: true` if the guest removed the stored one.

`canSave` = something changed, the result has text or a recording, nothing is recording, not saving.

- [ ] **Step 1: Write the failing hook tests**

Mock `useVoiceRecorder` as in Task 7.

```ts
it('saves a new recording for a text wish', async () => {
    const { result } = renderHook(() => useWishEditor('e1'), { wrapper });
    act(() => result.current.open(textWish)); // message 'Hi', audio null
    recorderState.status = 'recorded';
    recorderState.recording = { blob: new Blob(['x']), url: 'blob:x', durationMs: 3000 };
    // re-render so the hook sees the recorder state
    expect(result.current.canSave).toBe(true);
    await act(() => result.current.save());
    expect(editMutate).toHaveBeenCalledWith({ entryId: 'w1', message: 'Hi', audio: recorderState.recording!.blob });
});

it('removes the stored recording', async () => {
    act(() => result.current.open(voiceAndText)); // message 'Hi', audio {...}
    act(() => result.current.removeExisting());
    await act(() => result.current.save());
    expect(editMutate).toHaveBeenCalledWith({ entryId: 'w1', message: 'Hi', removeAudio: true });
});

it('lets a voice wish lose its text', async () => {
    act(() => result.current.open(voiceAndText));
    act(() => result.current.changeDraft(''));
    expect(result.current.canSave).toBe(true);
});

it('will not save a wish with neither', () => {
    act(() => result.current.open(voiceOnly));
    act(() => result.current.removeExisting());
    expect(result.current.canSave).toBe(false);
});

it('opening another wish clears the recording and the removal', () => {
    act(() => result.current.open(voiceAndText));
    act(() => result.current.removeExisting());
    act(() => result.current.open(textWish));
    expect(result.current.existingAudio).toBeNull();
    expect(recorderState.discard).toHaveBeenCalled();
});
```

Update the existing tests' expectations: a text-only save now calls `mutateAsync({ entryId, message })` exactly as before (no `removeAudio` key when nothing was removed).

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run hooks/useWishEditor.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the hook changes**

```ts
const recorder = useVoiceRecorder();
const [removedExisting, setRemovedExisting] = useState(false);

const existingAudio = selected?.audio && !removedExisting ? selected.audio : null;
const newAudio = recorder.status === 'recorded' ? (recorder.recording?.blob ?? null) : null;
const trimmed = draft.trim();
const textChanged = trimmed !== (selected?.message ?? '');
const audioChanged = newAudio !== null || (removedExisting && Boolean(selected?.audio));
const hasContent = trimmed !== '' || newAudio !== null || existingAudio !== null;
const canSave = Boolean(selected) && hasContent && (textChanged || audioChanged) && recorder.status !== 'recording' && !edit.isPending;

function open(entry: WishbookEntryResponseDto) {
    edit.reset();
    recorder.discard();
    setRemovedExisting(false);
    setSelected(entry);
    setDraft(entry.message ?? '');
    setIsConfirmingDelete(false);
}
function close() {
    recorder.discard();
    setSelected(null);
    setIsConfirmingDelete(false);
}
async function save() {
    if (!selected || !canSave) return;
    try {
        await edit.mutateAsync({
            entryId: selected.id,
            message: trimmed,
            ...(newAudio ? { audio: newAudio } : removedExisting && selected.audio ? { removeAudio: true } : {}),
        });
    } catch {
        return; // edit.error shows in the sheet; keep what was typed and recorded
    }
    close();
}
```

Return also `recorder`, `existingAudio`, `removeExisting: () => setRemovedExisting(true)`. `recorder.discard` in `close` frees the microphone and blob when the sheet closes.

- [ ] **Step 4: The sheet**

Between the character count and the error line in `WishEditSheet.tsx`:

```tsx
{/* Recording */}
<VoiceRecorder recorder={editor.recorder} disabled={editor.isSaving} existing={editor.existingAudio} onRemoveExisting={editor.removeExisting} />
```

Update the test's and the story's fake `editor` with `recorder` (status `'idle'`), `existingAudio: null`, `removeExisting: fn()`. Add a story `WithRecording` (`existingAudio` set) and a test that the existing recording's Remove calls `removeExisting`.

- [ ] **Step 5: Run and commit**

Run: `npx vitest run hooks/useWishEditor.test.ts components/wishbook/WishEditSheet.test.tsx "app/(main)/(app)/(event)/events/[eventId]/tools/wishbook"`
Expected: PASS.

```bash
git add hooks/useWishEditor* components/wishbook/WishEditSheet*
git commit -m "KAN-220: Change or remove a wish's recording"
```

---

### Task 11: QR wish page

**Files:**
- Modify: `hooks/useGuestWishForm.ts`, `hooks/useGuestWishForm.test.ts`, `components/qrGuest/GuestWishForm.tsx`, `GuestWishForm.test.tsx`, `GuestWishForm.stories.tsx`

- [ ] **Step 1: Write the failing hook tests**

Mock `useVoiceRecorder` as in Task 7; keep the existing mocks.

```ts
it('can send a recording without text', async () => {
    // name filled, accepted, message '', recorder recorded
    expect(result.current.canSubmit).toBe(true);
    await act(() => result.current.submit(fakeSubmitEvent()));
    expect(sendMutate).toHaveBeenCalledWith(expect.objectContaining({ message: '', audio: recorderState.recording!.blob }));
});

it('cannot send while recording', () => { /* status 'recording' → canSubmit false */ });

it('the message is required only without a recording', () => {
    expect(result.current.messageRequired).toBe(true);
    // recorded → false
});

it('writing another wish clears the recording', () => {
    act(() => result.current.writeAnother());
    expect(recorderState.discard).toHaveBeenCalled();
});

it('shows a recording error from the server', async () => {
    sendMutate.mockRejectedValueOnce(apiError(3130));
    await act(() => result.current.submit(fakeSubmitEvent()));
    expect(result.current.submitError).toBe('error'); // via toErrorMessage, as other unmapped errors
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run hooks/useGuestWishForm.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the hook changes**

```ts
const recorder = useVoiceRecorder();
const audio = recorder.status === 'recorded' ? (recorder.recording?.blob ?? null) : null;
const hasContent = message.trim() !== '' || audio !== null;
const canSubmit = !INCIDENT_MODE && !isPending && recorder.status !== 'recording' && guestName.trim() !== '' && hasContent && acceptedDocuments;
```

`submit` passes `message: message.trim(), audio`; after `setSent(true)` it calls `recorder.discard()`. `writeAnother` also calls `recorder.discard()`. Return `recorder` and `messageRequired: audio === null`. The error mapping stays: 3128–3132 have message keys (Task 1), so they fall through to `toErrorMessage`.

- [ ] **Step 4: The form**

In `GuestWishForm.tsx`, under the message box and its count:

```tsx
{/* Recording */}
<VoiceRecorder recorder={form.recorder} disabled={form.isPending} />
```

and `required={form.messageRequired}` on the message's `FormFieldLabel` (no copy change: the label stays, only its required mark comes and goes). The textarea stays as it is.

Update the test (a recording makes the send button enabled with an empty message) and add a story `WithRecording`.

- [ ] **Step 5: Run and commit**

Run: `npx vitest run hooks/useGuestWishForm.test.ts components/qrGuest`
Expected: PASS.

```bash
git add hooks/useGuestWishForm* components/qrGuest/GuestWishForm*
git commit -m "KAN-220: Record a wish on the QR page"
```

---

### Task 12: Moderation preview and the demo

**Files:**
- Modify: `components/admin/moderation/ModerationContentPreview.tsx:25-35`
- Modify: `lib/demo/mockHandlers.ts:454-480`, `lib/demo/demoNetworkGuard.test.ts` if it lists request shapes

- [ ] **Step 1: Moderation**

After the `{/* Text */}` block:

```tsx
{/* Recording */}
{content.audio ? <VoiceWishPlayer src={content.audio.url} durationMs={content.audio.durationMs} /> : null}
```

Add a test (or a story, matching what the file already has: `ls components/admin/moderation | grep ModerationContentPreview`) with a voice-only wish: `text: null`, `audio` set → the Play button shows.

- [ ] **Step 2: Demo mocks**

The demo visitor can write wishes, so its mock must take a multipart body. Replace the wishbook `buildCreateHandler` with a handler that reads either body, and teach the `PUT` handler the same:

```ts
// A wish arrives as JSON, or as multipart with a recording (KAN-220). The recording plays from a
// blob URL in this tab; the demo has no storage.
async function readWish(request: Request): Promise<{ wish: Record<string, unknown>; audio: WishAudioDto | null }> {
    if (!request.headers.get('content-type')?.includes('multipart/form-data')) {
        return { wish: (await request.json()) as Record<string, unknown>, audio: null };
    }
    const form = await request.formData();
    const wishPart = form.get('wish');
    const wish = wishPart instanceof Blob ? (JSON.parse(await wishPart.text()) as Record<string, unknown>) : {};
    const audioPart = form.get('audio');
    return { wish, audio: audioPart instanceof Blob ? { url: URL.createObjectURL(audioPart), durationMs: 0 } : null };
}
```

```ts
http.post(`${API_BASE_URL}/api/events/:eventId/wishbook`, async ({ request }) => {
    const { wish, audio } = await readWish(request);
    const record = db.create('wishbook', {
        id: newId('demo-wishbook'),
        eventId,
        authorMemberId: null,
        guestName: String(wish.guestName ?? 'Guest'),
        message: wish.message ? String(wish.message) : null,
        createdAt: nowIso(),
        canDelete: true,
        highlighted: null,
        audio,
    });
    return HttpResponse.json(record, { status: 201 });
}),
```

and in the `PUT` handler: `const { wish, audio } = await readWish(request);` then `message: wish.message === undefined ? w.message : (String(wish.message).trim() || null)` and `audio: audio ?? (wish.removeAudio ? null : w.audio)`.

`durationMs: 0` makes the player show the element's own duration once loaded (an MP4 blob) or `0:00` (a WebM blob, whose duration the browser can't read). That is acceptable for the demo; note it in the PR.

- [ ] **Step 3: Run and commit**

Run: `npx vitest run components/admin/moderation lib/demo`
Expected: PASS.

```bash
git add components/admin/moderation lib/demo
git commit -m "KAN-220: Moderation plays voice wishes; demo accepts recordings"
```

---

### Task 13: Checks, local test, PR

- [ ] **Step 1: Automated checks**

Run: `npx tsc --noEmit; npx eslint .; npx vitest run`
Expected: all clean. If the full vitest run shows timeouts under load (known flake), re-run the failing files alone and report both runs.

- [ ] **Step 2: Storybook**

Run: `npm run build-storybook` (or the project's storybook build script; see `docs/storybook.md`).
Expected: builds; the new stories render. The visual check on the PR will flag new stories as new snapshots: that is expected; only the owner approves.

- [ ] **Step 3: Local signed-in check**

Follow the memory notes: worktree dev server on :3000 only through `preview_start {url}`, local backend with the KAN-219 branch running (ffmpeg on PATH). If :3000/:8080 are taken, use the isolated stack (own ports, throwaway Postgres). Revert any `AGENTS.md` change `next dev` makes.

Check, at phone width (375) first and then desktop:

1. Guest, in-app: record ~5 s, stop, play back, record again, remove, record, send without text → sent note; "Your messages" shows the mic and length; tap → sheet plays it; remove it and save → refused when there is no text (Save disabled); add text and save → OK.
2. Guest: deny the microphone in the browser → "Microphone access is blocked." and the text field still works.
3. Host: the voice wish plays in the list; the book panel still builds from written wishes.
4. QR page (signed out): record and send with a name, no text → sent screen; "Write another" clears it.
5. Admin moderation: report the voice wish as the guest, open the case as admin → it plays.

Screenshots of each at phone width go in the PR.

- [ ] **Step 4: Real devices before release**

Record and play on a real iPhone (Safari) and an Android phone (Chrome), signed in and through the QR page, on staging after both PRs merge (spec). The Android phone can be driven over adb as in the memory notes; the iPhone needs the owner. Record the results in the release PR's test cases, not this PR.

- [ ] **Step 5: Push and open the PR**

```bash
git push -u origin claude/kan-220-voice-wishes
gh pr create --base staging --title "KAN-220: Voice wishes" --body-file <body>
```

Body: what changed (short), "Needs guestwall-be KAN-219 on staging first", the approved copy table, the local check results with screenshots, the demo `0:00` note, the SEO check (no routes added or changed: no blockers) and the attribution line. Name only KAN-220 in the body.

---

## Self-review notes

- Spec coverage: `useVoiceRecorder` with the three mime types, five states, 60 s stop, microphone release (T4); recorder on the in-app form, QR form and edit sheet (T6, T7, T10, T11); denied line, hidden without MediaRecorder (T4, T6); multipart only with a recording (T2, T3); `VoiceWishPlayer` on host rows, "Your messages" and moderation (T5, T8, T9, T12); a failed load shows a short line and a refetched URL retries (T5); stories for each new component (T5–T7); copy approved and localized (T1).
- Judgement calls to point out in the PR: an editable "Your messages" row shows mic + length and plays in the sheet, because the row itself is a button; a read-only row plays in place. The composer moved into its own hook and component.
- Type names used across tasks: `VoiceRecorder` (hook return type) vs `VoiceRecorder` (component) — the component file imports the type as `VoiceRecorderState` to avoid the clash; other files import only one of them.
