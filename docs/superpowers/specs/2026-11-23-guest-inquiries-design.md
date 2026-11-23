# Guest inquiries to partners ("Ask about my date") — design

Ticket: KAN-20 (epic KAN-17). Repos: guestwall-be first, then storywall.
Later users: the vendor demo (`/demo/wedding?vendor=…`, own spec) and the public partner pages (KAN-26).
Plans:
- `docs/superpowers/plans/2026-11-23-guest-inquiries-backend.md`
- `docs/superpowers/plans/2026-11-23-guest-inquiries-frontend.md`

## Goal

A guest at an event sees a partner vendor (photographer, planner…) and asks them about a date for their own event.
The partner gets an email and a list on their My business page, and contacts the guest themselves. There is no chat.

## Decisions

| Topic | Decision |
|---|---|
| Who receives | Approved partners only. Non-partner vendors keep their link-out buttons. |
| Who asks | A signed-in member of the event who is not that partner. Hosts may ask too. |
| Where | The vendor's card on the Vendors page, and the `FEATURE_CARD` style of the feed partner card. The `COMPACT_ROW` and `CREDIT` styles stay a single link. |
| Reply path | Email to the partner, and a list on My business (`/business`). The partner replies by phone or email outside Storywall. |
| Form | Event date (required), phone or email (at least one; the email is prefilled from the account), optional note (≤ 500 characters). The name comes from the guest's account. |
| Consent | A required, unticked checkbox. Send stays disabled until it is ticked. The time of consent is stored. |
| After sending | The sheet shows a short confirmation in place of the form, like "Write to us" on My business. |
| Repeat | One inquiry per guest, per partner, per event, ever. The button then shows "Already sent". |
| Host | Never sees inquiries. |
| Retention | Deleted 12 months after sending. Deleted at once with the event (purge) or with the guest's account. A soft-deleted or suspended partner stops seeing them, and the 12-month clean-up removes them. |
| Admin console | Nothing new. |

## Who the inquiry belongs to

The two entry points lead to different records:

- **Feed card:** an `EventPartnerBranding` row links an event to a `Collaborator` (partner). The partner may have no Storywall account.
- **Vendors page:** an `EventVendor` with a `VendorProfile` (a user account). The account is a partner when its verified email matches an active `Collaborator` (`ApprovedPartners`).

So an inquiry belongs to the **`Collaborator`**:

- The email goes to `Collaborator.contactEmail`, which works with or without an account.
- The list shows for the account that `ApprovedPartners.collaborator(user)` resolves to that partner. A partner without an account can sign up with that email to see it.
- A vendor row is askable only when its account resolves to an active partner.
- The feed card is askable only while `EventPartnerBrandingRepository.findShowing` returns it.

## Backend (guestwall-be)

### Table — `guest_inquiries` (next free migration number)

- `id` UUID PK
- `event_id` → `events`, `ON DELETE CASCADE`
- `collaborator_id` → `collaborators`, `ON DELETE CASCADE`
- `guest_user_id` → `users`, `ON DELETE CASCADE`
- `source`: `VENDOR_LIST` | `FEED_CARD`. KAN-26 will add `PARTNER_PAGE` with a nullable `event_id`.
- `event_date` `DATE NOT NULL`
- `phone` `VARCHAR(40)` NULL, `email` `VARCHAR(254)` NULL, with a check that at least one is set
- `note` `VARCHAR(500)` NULL
- `consent_at` `TIMESTAMPTZ NOT NULL`
- `status` `NEW` | `DONE`, default `NEW`
- `done_at` `TIMESTAMPTZ` NULL
- `created_at` `TIMESTAMPTZ NOT NULL`

Constraints and indexes:

- unique `(event_id, collaborator_id, guest_user_id)`
- `(collaborator_id, created_at DESC, id DESC)` for the list
- `(created_at)` for clean-up
- `(guest_user_id)` for account deletion

### Telling the client what it may do

`VendorRowDto` and `PartnerBrandingDto` gain:

```
inquiry: { canAsk: boolean; sentAt: string | null }   // absent when not askable
```

- It is absent for a non-partner, for the partner's own account, on admin reads and in card previews.
- `canAsk` is false once `sentAt` is set.

### Endpoints

| Method | Path | Who | Body → result |
|---|---|---|---|
| POST | `/api/events/{eventId}/vendors/{vendorId}/inquiries` | event member | `{ eventDate, phone?, email?, note?, consent }` → 201 `{ sentAt }` |
| POST | `/api/events/{eventId}/partner-branding/inquiries` | event member | same |
| GET | `/api/me/business/inquiries?page=&size=` | the partner's account | `Page<{ id, guestName, eventTitle, eventDate, phone, email, note, status, createdAt }>`, newest first, ≤ 50 per page |
| PATCH | `/api/me/business/inquiries/{id}` | the partner's account | `{ done }` → the row |

Errors (`ProblemDetail` with a `code`):

- **403 `NOT_EVENT_MEMBER`:** not a member of the event, the same answer as the vendor list.
- **404:**
  - vendor or card not found, or not askable: not a partner, the card isn't showing, or the caller is that partner
  - not a partner (list); inquiry not theirs (PATCH)
- **409 `INQUIRY_ALREADY_SENT`:** this guest already asked this partner on this event.
- **429:**
  - more than 10 a day per guest (`@RateLimit`)
  - 50 a day per partner (`RATE_LIMITED`)
- **400:**
  - `INQUIRY_DATE_OUT_OF_RANGE`: a date before today (Athens) or more than 3 years ahead
  - `INQUIRY_CONTACT_REQUIRED`: neither phone nor email
  - `INQUIRY_CONSENT_REQUIRED`: consent not true
  - `VALIDATION_FAILED`: a bad phone or email, or a note over 500 characters

### Email

- `TransactionalMailService.sendGuestInquiry`, in Greek, delivered after commit; a failure is logged.
- Contents:
  - Heading and body: the guest's name, the event's title and the date asked about.
  - Info lines: date, phone, email and note, each only when present.
  - CTA: "My business" (`/business`).

### Audit

`VendorAuditWriter`: action `GUEST_INQUIRY_SENT`, with `collaboratorId` and `source` only.

### Clean-up

`GuestInquiryCleanupJob` runs nightly and deletes rows older than 12 months. `UserAnonymizer` deletes the guest's rows.

## Frontend (storywall)

### Guest side — `components/vendors/inquiries/`

- `AskDatesButton`: shown when `inquiry` is present. A disabled "Already sent" state when `sentAt` is set.
- `AskDatesSheet` (`Modal variant="sheet"`): the date (`<input type="date">`, min today), phone, email, note, consent checkbox and Send. After sending, a confirmation replaces the form.
- `hooks/useAskDates.ts`:
  - form state, with the email prefilled from the account
  - checks before sending
  - the send
  - error mapping (`useApiErrorMessage`)
  - on success, writes `sentAt` into the vendor list cache or the event detail cache
- Placement:
  - `VendorListRow`: under the link buttons.
  - `PartnerFeatureCard`: through a new optional `action` slot rendered under the link. `PartnerFeedCard` fills it, and admin previews never do.

### Partner side — My business

- `GuestInquiriesSection` sits in the main column, under Events:
  - **Partners:** compact read-only rows (`InquiryRow`): guest name, date asked about, event, a New badge. Tapping a row opens `InquirySheet`.
  - **Non-partners:** `LockedPreview` with sample rows. `canApply={false}`, because the page's one partner prompt is in Insights.
- `InquirySheet`: the date, event, phone and email as call/email buttons, the note, and Mark done / Mark as new.
- `hooks/useGuestInquiries.ts`: an infinite query (`businessKeys.inquiries`) and the done mutation.
- `lib/vendors.ts`: `inquiries` moves from `COMING_PARTNER_BENEFITS` to `PARTNER_BENEFITS`. Its existing wording stays.

### Tests

- Vitest for the hooks, the sheet, the button and the section.
- Storybook stories for the new components. They feed the visual check.
- `tsc --noEmit`, `eslint .`, `vitest run`, `next build`.

## Copy — needs the owner's yes before it is added

New strings only. Nothing existing changes. The plans list the proposed wording (EN and EL). Each set is approved in a popup before it is added. Greek uses επαγγελματίας for the vendor and διοργανωτής for the host.

Privacy policy lines that cover sharing a guest's contact with a partner are needed too (KAN-20). They follow the legal pages' own versioning and are approved separately by the owner.

## Out of scope

- Chat or in-app replies.
- Showing guests their own sent inquiries.
- Admin console views.
- The demo (vendor demo spec).
- The public partner page entry point (KAN-26).

## Release

guestwall-be first (migration, endpoints, DTO fields), then storywall. The new DTO fields are additive.
