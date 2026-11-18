# Danger Zone Says What Deleting Does (KAN-233)

**Goal:** Replace the host's Danger zone (pink box + a two-step modal: warning, then emailed code) with the agreed D2 layout: three icon lines on the page saying what deleting does, a red-outline "Delete event" button that goes straight to sending the emailed code, and the code step as today's words in a bottom sheet on phones.

**Architecture:** `DangerZoneTab` stays a thin shell. The three lines are a presentational `DangerConsequences` component; the button and its error live in `EventDangerZone`. `hooks/useDangerZoneDownloads.ts` decides which download actions show (gallery / wishbook in the plan) and owns the gallery archive window's open state. `useEventDeletionFlow` gets a `codeFirst` option: `startDeletion()` sends the code and opens the sheet on the code step; code errors (expired, not requested, too many attempts) stay on the code step with "Send a new code" ready. Drafts keep today's flow. No backend change.

**Mockup:** D2 on the "Host Overview redesign" canvas (claude.ai artifact `CDygEzhyHjNzSeVsrSxWXy`).

## Decisions (owner, 2026-11-16 and 2026-11-17)

- No pink box. Three lines, each with an icon: guests lose access, still available until permanently deleted (with actions), can't be undone.
- Line 2 has two actions, each only when the plan has the module:
  - "Download all" opens today's Gallery download window (`GalleryArchiveDownloadModal`) on the Danger zone page.
  - A link to the Wishbook page labelled with today's module name for the event type ("Wishbook" / "Βιβλίο Ευχών"), where the keepsake PDF lives.
- Red-outline "Delete event" sends the code at once; the warning step is dropped. If the first send fails, the error shows under the button.
- Code step: today's title "Delete this event?" and words, `variant="sheet"` (bottom sheet on phones).
- Code errors stay on the code step with today's error text; "Send a new code" is ready (cooldown reset).
- The small "Delete event" heading above the box goes (the button already says it).
- Drafts (`DraftDeleteSection`) keep today's warning → code flow and centered modal.

## Wording (approved 2026-11-17)

New keys under `ManagePage.settings.dangerZone.consequences`:

| Key | English | Greek |
|---|---|---|
| `guestsLoseAccess` | `Guests lose access right away.` | `Οι καλεσμένοι χάνουν άμεσα την πρόσβαση.` |
| `stillAvailable` | `Until it is permanently deleted, you can still view and download photos, videos and wishes.` | `Μέχρι να διαγραφεί οριστικά, μπορείτε ακόμα να βλέπετε και να κατεβάζετε φωτογραφίες, βίντεο και ευχές.` |
| `cannotUndo` | `This can't be undone.` | `Δεν μπορεί να αναιρεθεί.` |

Reused: `GalleryPage.downloadGallery` ("Download all" / "Λήψη όλων"), the wishbook module name, `ManagePage.settings.dangerZone.delete`, `.confirmTitle`, `.confirmAction`, `.cancelAction`, `.otp.*`.

Removed (keys deleted from `messages/en.json` and `messages/el.json`):
- `ManagePage.settings.dangerZone.body` (the pink box text)
- `ManagePage.settings.dangerZone.confirmBody` (the modal warning)

## File map

Create:
- `components/manage/danger/DangerConsequences.tsx` (+ test, + stories)
- `hooks/useDangerZoneDownloads.ts` (+ test)

Modify:
- `hooks/useEventDeletionFlow.ts` (+ test): `codeFirst` option, `startDeletion()`
- `components/manage/danger/EventDangerZone.tsx` (+ test, + stories): lines + red-outline button + error
- `components/manage/danger/EventDeleteConfirmModal.tsx`: `variant` passthrough, drop `confirmBody`
- `components/ui/ConfirmActionModal.tsx`: optional `variant` passed to `Modal`
- `app/(main)/(app)/(event)/events/[eventId]/manage/DangerZoneTab.tsx`: compose the above + gallery window
- `messages/en.json`, `messages/el.json`

## Tasks

- [ ] 1. Hook: `codeFirst` + `startDeletion` with tests (send success opens on verify; send failure stays closed with error; code errors keep verify).
- [ ] 2. `ConfirmActionModal` / `EventDeleteConfirmModal` variant passthrough; drop the live warning step text.
- [ ] 3. Messages: add the three lines, remove `body` and `confirmBody`.
- [ ] 4. `useDangerZoneDownloads` + `DangerConsequences` + `EventDangerZone` with tests and stories.
- [ ] 5. `DangerZoneTab` composition.
- [ ] 6. `tsc`, `eslint`, `vitest`; signed-in check at 375px and 1280px in EN and EL on an isolated stack, delete flow only up to the code step (or on the throwaway database).
