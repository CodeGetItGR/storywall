# Guest inquiries to partners ("Ask about my date") — design

Ticket: KAN-20 (epic KAN-17). Repos: guestwall-be first, then storywall.
Later users: the vendor demo (`/demo/wedding?vendor=…`, own spec) and the public partner pages (KAN-26).

## Goal

A guest at an event sees a partner vendor (photographer, planner…) and asks them about a date for their own event.
The partner gets an email and a list on their vendor page, and contacts the guest themselves. There is no chat.

## Decisions

| Topic | Decision |
|---|---|
| Who receives | Approved partners only. Non-partner vendors keep their link-out buttons. |
| Who asks | A signed-in member of the event who is not that vendor. Hosts may ask too. |
| Where | The vendor's card on the Vendors page, and the `FEATURE_CARD` style of the feed partner card. The `COMPACT_ROW` and `CREDIT` styles stay a single link. |
| Reply path | Email to the partner and an inbox on the vendor page. The partner replies by phone or email outside Storywall. |
| Form | Event date (required), phone or email (at least one, prefilled from the account), optional note (≤ 500 characters). The name comes from the guest's profile. |
| Consent | A required, unticked checkbox. Send stays disabled until it is ticked. The time of consent is stored. |
| Host | Never sees inquiries. |
| Retention | Deleted 12 months after sending, or with the event, partner or guest account. |
| Admin console | Nothing new. |

## Who the request belongs to

The two entry points lead to different records:

- **Feed card:** an `EventPartnerBranding` row links an event to a `Collaborator` (partner). The partner may have no Storywall account.
- **Vendors page:** an `EventVendor` with a `VendorProfile` (a user account). The account is a partner when its verified email matches an active `Collaborator` (`ApprovedPartners`).

So a request belongs to the **`Collaborator`**:

- The email goes to `Collaborator.contactEmail`, which works with or without an account.
- The inbox shows for the account that `ApprovedPartners.collaborator(user)` resolves to that partner.
- A vendor row is askable only when its account resolves to an active partner.
- The feed card is askable only while `PartnerBrandingService#activeFor` shows it.

## Backend (guestwall-be)

### Table — `V232__availability_requests.sql` (next free number at build time)

`availability_requests`:

- `id` UUID PK
- `event_id` → `events`, `ON DELETE CASCADE`
- `collaborator_id` → `collaborators`, `ON DELETE CASCADE`
- `guest_user_id` → `users`, `ON DELETE CASCADE`
- `source` `VARCHAR(16)`: `VENDOR_LIST` | `FEED_CARD`. Reserved for KAN-26: `PARTNER_PAGE`, with a nullable `event_id`, added then.
- `event_date` `DATE NOT NULL`
- `phone` `VARCHAR(40)` NULL, `email` `VARCHAR(254)` NULL, with a check that at least one is set
- `note` `VARCHAR(500)` NULL
- `consent_at` `TIMESTAMPTZ NOT NULL`
- `status` `VARCHAR(8)`: `NEW` | `DONE`, default `NEW`
- `done_at` `TIMESTAMPTZ` NULL
- `created_at` `TIMESTAMPTZ NOT NULL`

Indexes:

- unique `(event_id, collaborator_id, guest_user_id)`: one request per guest, partner and event
- `(collaborator_id, created_at DESC)` for the inbox
- `(created_at)` for clean-up
- `guest_user_id`, for user deletes

### Telling the client what it may do

Both `VendorRowDto` and the feed card's `PartnerBrandingDto` gain:

```
inquiry: { canAsk: boolean; sentAt: string | null } | null
```

- It is null when the vendor is not a partner, or for the vendor's own view.
- `canAsk` is false once `sentAt` is set.

### Endpoints

| Method | Path | Who | Body / result |
|---|---|---|---|
| POST | `/api/events/{eventId}/vendors/{vendorId}/availability-requests` | event member | `{ eventDate, phone?, email?, note?, consent: true }` → 201 `{ sentAt }` |
| POST | `/api/events/{eventId}/partner-branding/availability-requests` | event member | same |
| GET | `/api/vendors/me/availability-requests?page=` | the partner's account | newest first, 20 per page: `{ id, guestName, eventName, eventDate, phone, email, note, status, createdAt }` |
| PATCH | `/api/vendors/me/availability-requests/{id}` | the partner's account | `{ done: boolean }` → the row |

Errors (ProblemDetail, mapped in `lib/api/errorMessageKeys.ts`):

- **404:** not a member; vendor or card not found; not askable (not a partner, card not active, or the guest is that vendor).
- **409:** this guest has already asked this partner on this event.
- **429:** over a limit, through `@RateLimit`:
  - 10 per guest per day
  - 50 per partner per day, spam protection
- **400:**
  - `eventDate` before today, or more than 3 years ahead
  - neither phone nor email
  - bad phone or email (the same patterns as `VendorProfile`)
  - `note` over 500 characters
  - `consent` not true

### Email

- `TransactionalMailService`, in Greek like the other partner emails, sent after the commit.
- Contents:
  - the guest's name, the event's name and the date asked about
  - `tel:` / `mailto:` links and the note
  - a link to the vendor page inbox when the partner has an account
- A failed send is logged. The request stays in the inbox.

### Audit

One `AuditLog` entry per send. It holds the event, partner and source, and no name, phone, email or note.

### Clean-up

`AvailabilityRequestCleanupJob` (`@Scheduled`, nightly, like `CampaignVisitCleanupJob`) deletes rows older than 12 months.

### Tests

- **Service:**
  - send from each entry point
  - not a partner; card inactive; the vendor asking themself
  - duplicate (409); both limits (429); each validation (400)
  - consent stored; email sent after commit; failed email keeps the row
  - audit entry has no personal data
- **Inbox:**
  - only the partner's own rows, paged
  - done / undone
  - another account gets 404
- **Deletes:** cascades on event, partner and user delete; clean-up job age limit.
- **Controller:** routes, auth, error shapes.
- **DTOs:** `inquiry` on vendor rows and the branding card, for a guest, a host, the vendor themself and a non-partner.

## Frontend (storywall)

### Guest side — `components/vendors/inquiries/`

- `AskDatesButton`: shown when `inquiry?.canAsk`. When `sentAt` is set it shows a disabled "Already sent" state instead.
- `AskDatesSheet`: a bottom sheet on mobile and a dialog on desktop, with the date, phone, email, note, consent checkbox and Send.
- `hooks/useAskDates.ts`:
  - form state and prefill from the account
  - validation and the send mutation
  - error mapping
  - patches the vendor list and feed caches with `sentAt` on success
- Placement:
  - `VendorListRow`: next to the call / email buttons.
  - `PartnerFeatureCard`: a button under the card, outside `PartnerCardLink`, so a tap on it does not open the website.
- After sending: the sheet closes and a toast confirms.

### Vendor side — vendor page

- `GuestInquiriesSection` on `VendorMeScreen`.
  - **Partners:** compact read-only rows (`InquiryRow`): guest name, date asked about, event, when it arrived, a New badge, and call/email buttons.
  - **Non-partners:** `LockedPreview`, like the other partner benefits.
- `InquirySheet`: the note in full, and Mark done / Mark as new.
- `hooks/useGuestInquiries.ts`: an infinite query on `/api/vendors/me/availability-requests` and the done mutation. It exports its query key factory and page size.
- `lib/vendors.ts`: `inquiries` moves from `COMING_PARTNER_BENEFITS` to the current benefits. Its wording stays as it is.
- Data loading follows CLAUDE.md: the vendor page's server prefetch seeds the first inbox page with the hook's exact key, when the page already prefetches.

### Tests

- Vitest:
  - `useAskDates`: validation, prefill, error mapping, cache patch
  - `AskDatesSheet`: Send disabled until consent and a contact are filled
  - `AskDatesButton`: three states
  - `GuestInquiriesSection`: partner, locked and empty states
  - `useGuestInquiries`: done toggle
- Storybook stories for `AskDatesSheet`, `AskDatesButton`, `InquiryRow`, `InquirySheet`, `GuestInquiriesSection` and the feature card with its button. They feed the visual check.
- `tsc --noEmit`, `eslint .`, `vitest run`, `next build`.

## Copy — needs the owner's yes before it is added

New strings only. Nothing existing changes. Wording to be proposed in a popup during implementation (EN and EL), for:

- the button
- "Already sent"
- the sheet title
- the field labels: date, phone, email, note
- the consent checkbox, which names the vendor
- Send
- the success toast
- each error
- the inbox section title, its empty state, the New badge, Mark done / Mark as new
- the email subject and body
- the image alt text in the email

Greek uses επαγγελματίας for the vendor and διοργανωτής for the host.

Privacy policy / terms lines that cover sharing a guest's contact with a vendor are needed too (KAN-20). They also need the owner's wording.

## Out of scope

- Chat or in-app replies.
- Showing guests their own sent requests.
- Admin console views.
- The demo (vendor demo spec).
- The public partner page entry point (KAN-26).

## Release

guestwall-be first (migration, endpoints, DTO fields), then storywall. The DTO fields are additive, so an older frontend ignores them.
