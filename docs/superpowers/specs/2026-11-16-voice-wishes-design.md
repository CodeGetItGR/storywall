# Voice wishes and private wishbook — design

Date: 2026-11-16
Repos: storywall (frontend), guestwall-be (backend)
Jira: epic KAN-216. Part 1: KAN-217 (BE), KAN-218 (FE). Part 2: KAN-219 (BE), KAN-220 (FE). Follow-up: KAN-221.

Guests can record a spoken wish, in addition to or instead of writing one. Hosts listen to them later in the
wishbook. Before that, the wishbook becomes private to the hosts, which closes a gap that exists today.

The work ships in two parts, each with its own backend and frontend PRs:

1. **Private wishbook** — wishes are readable only by hosts and co-hosts; signed-in guests see, edit and delete
   their own.
2. **Voice wishes** — recording, upload, conversion, playback.

## Decisions

| Question | Decision |
| --- | --- |
| Where voice wishes live | Inside the existing wishbook module, not a new tool. |
| Who can record | Everyone who can write a wish: signed-in guests in the app and guests with no account on the QR page. |
| Wish shape | Text, a recording, or both. At least one is required. |
| Max length | 60 seconds. |
| Printed book | Text only for now. Voice-only wishes are left out. A follow-up ticket covers an online wishbook or a single QR in the book that opens a page with all voice wishes. |
| Plans | Available on every plan that has the wishbook. No new plan gate. |
| Who can read and listen | Hosts and co-hosts only, plus the author for their own wish. Nobody else. |
| Guests and their own wishes | Signed-in guests see, edit and delete their own. QR guests with no account do not (they get the sent confirmation, as today). |
| Editing a starred wish | The star stays; a built book is marked out of date. |
| Downloads | Not in this release. Part of the follow-up ticket. |
| Recording format | Converted on upload to AAC `.m4a` by the backend, synchronously (approach A). |

## Part 1 — Private wishbook

### Problem

The wishbook screen hides the list from guests (`hidden={!isHost}` in the wishbook `PageClient.tsx`), but the
backend still returns every wish to any event member: `GET /api/events/{eventId}/wishbook` and
`/wishbook/count` only check membership. The client also fetches the list for guests and only hides it. Any guest
can read all wishes through the API. `WishbookService` still documents the original design ("guests read each
other's wishes"), which no longer holds.

### Backend

- `GET /api/events/{eventId}/wishbook` and `GET /api/events/{eventId}/wishbook/count`: host only. "Host" is a row
  in `EventHost`, which includes co-hosts. A member who is not a host gets 403. Demo access keeps working as it
  does today for the demo builder and demo visitors.
- New `GET /api/events/{eventId}/wishbook/mine`: the caller's own non-deleted wishes, newest first, paged like the
  host list. Membership required. Matched on the caller's membership or on `authorUserId` = the caller's account,
  so a wish written before the account was attached still counts as theirs.
- New `PUT /api/wishbook/{entryId}`: the author edits the message. Only the author; hosts cannot edit someone
  else's words. Same availability rule as writing (`requireAvailable`: the event must be `ACTIVE`). Keeps
  `highlightedAt`. Calls `WishbookBookInvalidator` so a built book is marked out of date.
- Delete is unchanged: the author or a host.
- Moderation always shows the wish's current text.
- Rewrite the `WishbookService` class comment to describe the host-only rule.
- Update `docs/fe-guides` for the new endpoints and the 403.

### Frontend

- `useWishbook` runs only for hosts. Guests never request the full list or the count.
- New `useMyWishes` hook for `/wishbook/mine`, with an exported query key factory and page size so the server page
  can prefetch it. The wishbook `page.tsx` prefetches the host list for hosts and the own list for guests,
  mirroring the client's gating.
- Guests: under the write form, a compact read-only "My wishes" list. Tapping a row opens a focused edit sheet
  with the message field and a delete action. Delete asks for confirmation in a modal.
- Hosts: unchanged.
- QR page: unchanged.
- Any summary card or right-panel section that shows the wish count (`WishbookSummarySection`) is checked against
  the new host-only count and hidden for guests.
- New copy (Greek and English) is shown to the owner with the exact wording for approval before it is added.

## Part 2 — Voice wishes

### Data (backend)

Flyway migration on `wishbook_entries`:

- `audio_key` — nullable, the R2 object key of the converted recording.
- `audio_duration_ms` — nullable integer.
- `message` becomes nullable.
- Check constraint: `message` is not blank or `audio_key` is not null.

`WishbookEntry.message` loses `@NotBlank` and keeps `@Size(max = 2000)`. Request validation enforces "text or
audio" with one clear error.

### API (backend)

`POST /api/events/{eventId}/wishbook`, `POST /api/qr/{token}/wishes` and `PUT /api/wishbook/{entryId}` accept
`multipart/form-data`:

- `wish` part: the existing JSON DTO (message optional now). The `PUT` DTO adds `removeAudio: boolean`.
- `audio` part: optional file.

The existing JSON body (`application/json`) keeps working on all three, so the backend can ship first without
breaking the current frontend.

Responses add:

```ts
audio: { url: string; durationMs: number } | null;
```

`url` is a presigned, short-lived R2 link, the same kind used for media today. It is included only for hosts and
for the author's own wish (Part 1 already limits who receives wishes at all).

### Upload and conversion (backend)

1. Cap the `audio` part at 5 MB.
2. Detect the real type from the bytes with `MediaTypeDetector`. Accept WebM, Ogg and MP4 audio only.
3. `ffprobe`: must contain an audio stream; reject a duration above 62 s (a 2 s margin over the 60 s client cap).
4. One `ffmpeg` pass through `FfmpegRunner`: mono, 64 kbps AAC, `.m4a`, metadata stripped. A 60 s clip takes well
   under a second, so this runs in the request; there is no queue and no "processing" state.
5. Store the object privately in R2 under its own prefix. Follow `MediaFileUploadTransaction`'s rule: if the wish
   transaction rolls back after the upload, delete the object.
6. On `PUT` with a new recording or `removeAudio`, the old object is deleted only after the change commits
   (see Storage cleanup).

Storage cleanup — required, not optional (owner decisions 2026-11-16):

- Recordings live under their own prefix `wishbook-audio/{eventId}/`, not under `events/`.
  `OrphanedObjectSweepService` lists only `events/`, so it never sees them and can't delete a live one.
- A replaced or removed recording, and the recording of a deleted wish, is deleted right after the change
  commits. A failed delete is logged; the file goes with the event purge.
- `MediaPurgeService` clears the event's prefix when the event is purged.
- Account deletion deletes the account's recordings. A wish with text keeps its text; a voice-only wish is
  removed.

The QR endpoint keeps its existing rate limits. A recording counts as one wish.

Errors use the existing error format, one code each: file too large, not audio, too long, conversion failed.

### Recording (frontend)

- `useVoiceRecorder` hook in `hooks/`: wraps `MediaRecorder`; picks the first supported type from
  `audio/webm;codecs=opus`, `audio/mp4`, `audio/ogg`; exposes state (`idle`, `recording`, `recorded`, `denied`,
  `unsupported`), elapsed time, and actions (start, stop, discard, re-record). Stops itself at 60 s. Releases the
  microphone when stopped or unmounted.
- Recorder component under `components/wishbook/`: record / stop with a timer, then play back, re-record or
  discard before sending.
- Shown on the in-app wish form, the QR wish page (`GuestWishForm`) and the Part 1 edit sheet (re-record or
  remove the recording).
- Microphone denied: one short line saying so; the text field still works.
- No `MediaRecorder`: the record control is not shown.
- Sending uses multipart when a recording is present.

### Playback (frontend)

- `VoiceWishPlayer` component: play / pause and duration, small and thumb-friendly.
- Used on host wish rows, on the guest's "My wishes" rows, and in the admin moderation preview
  (`ModerationContentPreview`) so a reported voice wish can be reviewed.
- An expired presigned URL is refetched with the list; the player shows a short error line if it still fails.

### Book

The book stays text-only. A wish with text and a recording keeps its text; a voice-only wish is skipped. Adding,
changing or removing only the recording does not mark the book out of date.

### Copy and images

All new strings (record, stop, re-record, remove recording, microphone blocked, errors, "My wishes", edit, delete
confirmation) are localized in Greek and English and shown to the owner with exact wording before they are added.
Any icon drawn as an image gets real localized alt text.

## Testing

- Backend: service and controller tests for host-only reads, `/mine`, edit rules, and the "text or audio" rule;
  upload tests with real WebM and MP4 sample files through ffmpeg; too-long, wrong-type and too-large rejections;
  purge and orphan-sweep tests that cover wish audio keys.
- Frontend: `useVoiceRecorder` tests with a mocked `MediaRecorder`; component tests for the recorder, player, My
  wishes list and edit sheet; Storybook stories for each new component (these feed the visual check).
- Manual: record and play on a real iPhone (Safari) and Android phone (Chrome), signed in and through the QR page,
  before release.

## Out of scope (follow-up ticket KAN-221)

- An online, interactive wishbook page, or a single QR in the printed book that opens a page with all voice wishes.
- Downloading recordings.

## Release order

For each part: backend first (it accepts the old requests), then the frontend.
