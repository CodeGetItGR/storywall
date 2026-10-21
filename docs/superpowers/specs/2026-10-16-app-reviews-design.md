# App reviews — design

Date: 2026-10-16

## Goal

Ask signed-in users (hosts and guests) once, after an event they took part in has ended, how Storywall was. Collect a star rating and optional comment. With explicit consent and admin approval, show selected reviews on the landing page.

## Decisions

- **Trigger:** an event the user hosted or joined has ended between 12h and 30 days ago. No time-based trigger.
- **Audience:** same prompt for hosts and guests; the role is stored with the review.
- **Placement:** bottom sheet shown the next time the user opens the home or an event screen.
- **Landing attribution:** first name · role · occasion (e.g. "Maria · Host · Wedding"). No surname or photo.
- **Eligibility is owned by the backend**, so "ask once" holds across devices.
- **Admins are never asked.** Guest accounts no longer exist, so every member is a full account.
- **Landing reviews come from `GET /api/config`** (`landingReviews`), like the pricing tabs, not a separate public endpoint.
- **Language:** each review stores the reviewer's app locale; each landing page language shows only reviews in that language.

## Backend (Spring, `guestwall-be`)

### Table `app_review`

| column | type | notes |
| --- | --- | --- |
| id | uuid | |
| user_id | fk, on delete cascade | accounts are soft-deleted, so anonymizing a user deletes their rows |
| event_id | uuid, no FK | the event the prompt was about; no FK so the row outlives the event's purge |
| event_type | varchar(50) | copied from the event |
| event_end_at | timestamp | copied from the event; used by the dismissal rule |
| locale | varchar(10) | the reviewer's app locale at answer time |
| role | enum `HOST` / `GUEST` | role in that event at answer time |
| stars | smallint, nullable | 1–5; null means dismissed |
| comment | varchar(500), nullable | |
| public_consent | boolean | false by default |
| status | enum `PENDING` / `APPROVED` / `HIDDEN` | `PENDING` on create |
| featured | boolean | shown on landing; only allowed when `APPROVED` and `public_consent` |
| created_at | timestamp | |

Unique on (`user_id`, `event_id`).

### Prompt rule

`GET /me/review-prompt` returns `{ eventId, eventName, role, occasion }` or `null` (204).

Return an event when all hold:

1. The user has no row with `stars` set (a user who rated is never asked again).
2. The user has at most one dismissal row (`stars` null). If they have one, the candidate event must have `endAt` later than that dismissed event's `endAt`.
3. The candidate is an event the user hosts or is an active member of, with `now - 30d <= endAt <= now - 12h`, and no `app_review` row for (user, event).
4. If several match, pick the one with the latest `endAt`.

### Endpoints

- `POST /me/reviews` `{ eventId, stars, comment?, publicConsent }` — validates the event is the user's eligible one; `publicConsent` is forced false unless `stars >= 4` and comment is non-empty.
- `POST /me/reviews/dismiss` `{ eventId }`.
- Admin: `GET /admin/reviews` (paginated, filter by status), `PATCH /admin/reviews/{id}` `{ status?, featured? }`.
- Public: `GET /api/config` gains `landingReviews` — up to 24 `featured` reviews from active accounts, newest first, each `{ id, stars, comment, firstName, role, eventType, locale }`. `firstName` is the account's first name. Admin patches drop the config cache at once.

## Frontend

### Prompt

- `lib/api` types + `reviewKeys` query key factory.
- `hooks/useReviewPrompt.ts`: fetches `/me/review-prompt` after mount (no server prefetch — non-critical overlay); exposes `prompt`, `submit`, `dismiss`, state for sending / sent.
- `components/review/`:
  - `ReviewPromptSheet.tsx` — bottom sheet shell.
  - `ReviewStars.tsx` — 1–5 star input, keyboard and screen-reader accessible.
  - `ReviewForm.tsx` — stars, optional comment, consent checkbox.
  - `ReviewSent.tsx` — short thank-you.
- Consent checkbox ("Can we show this on our website?") appears only when stars ≥ 4 and the comment is not empty.
- Shown on home and event screens only; never while the composer, camera, or an open post overlay is active. Closing the sheet calls dismiss.
- Copy: "How was Storywall for {eventName}?" — all strings localized.

### Admin

- New "Reviews" section in the admin console sidebar.
- Table rows: stars, role badge, occasion, consent badge, status pill, featured badge, date.
- Drawer per review: full comment, status segmented control (Pending / Approved / Hidden), "Show on landing" switch (enabled only when approved and consented).

### Landing

- `components/landing/LandingReviews.tsx`, rendered from the config the landing page already prefetches.
- Shows only reviews in the page's language, at most 6; hidden when fewer than 3 of them exist.
- No review / AggregateRating structured data (self-serving reviews are not eligible for rich results).
- Follows `docs/seo-guidelines.md`.

## Error handling

- Prompt fetch fails → no sheet, silently.
- Submit fails → inline error in the sheet, keep the user's input, allow retry.
- Landing fetch fails → section not rendered.

## Testing

- Backend: prompt rule (rated, one dismissal, later event after dismissal, second dismissal, 12h boundary, latest event wins), consent forcing, featured guard.
- Frontend: `useReviewPrompt` states; form shows consent only at 4–5 stars with a comment; landing section hidden under 3 reviews.
- Visual check of the sheet on mobile and desktop; admin panel on desktop.

## Out of scope

- Email prompts.
- Different questions for hosts and guests.
- Reviewer photos or editable display names.
