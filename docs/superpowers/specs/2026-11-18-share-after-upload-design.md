# Share after upload

Date: 2026-11-18. Status: approved by the owner in chat (scope, look, wording, frequency).

## Goal

A guest who has just posted photos or videos can put them on their own Instagram or Facebook
story (or anywhere else) in as few taps as a website allows.

## Why the phone's share menu

Instagram's and Facebook's "open straight in Stories" hand-off only works from native apps: the
app puts the file in a native-only clipboard slot (iOS) or an Android intent, then opens
`instagram-stories://share`. A web page can do neither, and Meta's publishing API needs App Review
and business accounts. The Web Share API with files (`navigator.share({ files })`) opens the
phone's share menu with the photos loaded: Share → Instagram (→ Story) → post. That is the
shortest path from the web.

## Scope

- Only right after the guest's own upload finishes: a post with photos or videos, or stories.
  The files are still on the phone, so nothing is downloaded.
- Not in the post viewer or the story viewer. Those would need the file from R2, whose bucket has
  no CORS rules (checked 2026-11-18: preflight 403 for every origin), and `connect-src` would need
  the media hosts. Left for later.
- Songs and text-only posts: nothing to share.

## Behaviour

- When a post or story job reaches `success` and the device can share those files, a bottom sheet
  opens over the feed (`Modal variant="sheet"`).
- "Can share" = `navigator.canShare({ files })` is true and the main pointer is coarse (a phone or
  tablet). Desktop Chrome can share files too, but its share menu has no Instagram story.
- Files shared are the ones that were uploaded: a post photo with a filter is baked again with
  `bakeStoryFilter`; a story item already holds its baked file. Files are prepared before the sheet
  opens, so the Share tap calls `navigator.share` straight away (Safari refuses a share that waits
  on work after the tap).
- Only `files` are passed. No text or url: some apps drop out of the menu when text comes along.
- **Share**: opens the share menu. If it completes, the sheet closes and the job card goes. If the
  guest cancels the share menu, the sheet stays.
- **Not now** (or closing the sheet any other way): the sheet closes, the job card goes, and one
  decline is counted for this event.
- After 2 declines in an event (kept in `localStorage`, per event, per browser), the sheet stops
  opening. Instead the "Posted" card shows a small **Share** button and stays until the guest taps
  Share or ✕. Without sharing support the card hides after 4 seconds as before.

## Copy (approved)

| Key | English | Ελληνικά |
|---|---|---|
| Sheet title | Share the moment | Μοιραστείτε τη στιγμή |
| Sheet line | Share it on Instagram, Facebook or your favorite social media. | Μοιραστείτε το στο Instagram, στο Facebook ή στο αγαπημένο σας κοινωνικό δίκτυο. |
| Primary | Share | Κοινοποίηση |
| Secondary | Not now | Όχι τώρα |
| Card button | Share | Κοινοποίηση |

Illustration: `public/images/qr-upload-sent.webp` through `QrSentArt` (its existing alt). Brand
icons: Instagram, Facebook and a generic "more" icon, hidden from screen readers because the line
above names them. The card's Share button has no icon so Greek labels fit at 375px.

## Code

- `lib/shareFiles.ts`: `canShareFiles(files)`, `sharePromptDeclines(eventId)` / `recordSharePromptDecline(eventId)` (localStorage, try/catch).
- `hooks/useShareAfterUpload.ts`: watches the queue's jobs, prepares the files of a job that just
  succeeded, decides sheet vs card button, exposes `share`, `decline`, `close`.
- `components/feed/ShareAfterUploadSheet.tsx`: the sheet (render only).
- `PublishQueueCard`: optional `onShare`; when set on a success card it shows the button and skips
  the 4-second hide.
- `PublishQueueCards`: wires the hook, the sheet and the card button.

## Tests

- `lib/shareFiles.test.ts`: decline counting, storage failures, canShare gating.
- `hooks/useShareAfterUpload.test.tsx`: sheet opens on success with files; not for songs or
  text-only posts; not without share support; card button after 2 declines; cancel keeps the
  sheet; a finished share dismisses the job.
- `PublishQueueCard` test: Share button shows and the card stays.
- Stories for the sheet and the card with a Share button.
- Real phones (iPhone Safari, Android Chrome) on staging: the menu opens with the photos and
  Instagram → Story works.
