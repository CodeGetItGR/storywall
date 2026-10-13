# Partner applications in admin — design

Date: 2026-10-10
Status: draft, awaiting review
Scope: spec 2 of 2. Spec 1 ([2026-10-10-business-partner-landing-design.md](2026-10-10-business-partner-landing-design.md)) covers the public page and the public endpoints. This spec covers reviewing applications in the admin console, the founding flag, the applicant emails, and the admin endpoints Spring needs.

## Goal

Applications from the public partner page land in admin. An admin reviews each one, then approves it (which creates the partner) or declines it (with a reason sent to the applicant). The founding flag set on approval drives the "X of 20 spots left" count on the public page.

## Decisions

| Topic | Decision |
| --- | --- |
| Where | A new **Applications** item in the admin sidebar, in the Operations group, next to Collaborations. |
| List | A table, with Pending shown first by default. |
| One application | A **detail page** at `#applications/<id>`, replacing the table, with a back link. This deliberately departs from the admin rule "right-side drawer for one record" (CLAUDE.md), at the owner's request: the browser back button works and the link can be shared with another admin. |
| Approve | Creates the collaborator with the application's details filled in, then opens it in Collaborations (`#collaborations/<collaboratorId>`). Codes, rates, the free-event code and the portal link are set there, as today. |
| Founding flag | A checkbox in the approve dialog, ticked by default while spots are left, and disabled at 0. It is stored on the collaborator. |
| Decline | The admin writes a reason, which is **sent to the applicant** in the decline email. The reason is optional; with none, the email uses a short generic line. |
| Emails | To the applicant, in the language they applied in: **received** (on apply), **approved** (on approve), **declined** (on decline). No admin notification email. |
| Approved email | "You're in. We'll email your code and partner page shortly." The admin sends the portal link the way they do today. |

## Founding spots rule

- `foundingSpotsLeft` (public, spec 1) = 20 − the number of collaborators with `founding = true`. Never below 0.
- The flag counts whatever the partner's status is. A suspended founding partner still holds the spot, because the public page promised "the first 20 partners". To free a spot, an admin unticks founding on the partner (see "Collaborations changes").
- Approving with founding ticked when no spots are left fails with a 409 error code (`FOUNDING_SPOTS_FULL`). The dialog then reloads the count and unticks the box.

## Admin UI

### Navigation

- New `AdminTab` key `partnerApplications`, label "Applications", placed in the Operations group right before `collaborations`.
- The sidebar item shows the pending count as a small badge when it's above 0. The count comes from the list response's `totalElements` with `status=PENDING`.
- Hash routing in `lib/adminPartnerApplicationsRouting.ts`, mirroring `lib/adminCollaborationsRouting.ts`:
  - `#applications`: the table.
  - `#applications/<id>`: the detail page.
- `AdminNavigationContext` keeps Applications active on `#applications/<id>`.

### Table (`#applications`)

- **Status filter:** a segmented control above the table: Pending (default) · Approved · Declined · All.
- **Columns:**

  | Column | Content |
  | --- | --- |
  | Received | Date and time |
  | Business | Business name, with the person's name muted underneath |
  | Role | Badge |
  | Country | Name, plus the code in mono |
  | Source | `utmSource` in mono, or "—" |
  | Status | Pill |

- **Pills:** Pending = warn, Approved = success, Declined = neutral (the admin semantic set; coral stays the accent).
- **Order:** newest first.
- **Pagination:** the same component other admin tables use.
- **Opening a row:** the row is a link to `#applications/<id>`.
- **Empty state:** "No applications." for the chosen filter.

### Detail page (`#applications/<id>`)

Built from small components under `components/admin/partnerApplications/`.

- **Back:** "All applications". It uses the same icon-plus-label back link as other admin sub-views, and keeps the filter the admin came from.
- **Header:** business name (h2), status pill, and the received date.
- **Details:** read-only, labeled rows:
  - name, email (mono, `mailto:`)
  - phone (mono, `tel:`, or "—")
  - website or Instagram (opens in a new tab; an `@handle` links to `https://instagram.com/<handle>`)
  - role, country, language applied in
  - source: `utmSource` / `utmMedium` / `utmCampaign`, in mono, or "—"
- **Decision** (approved or declined only):
  - who decided and when
  - for declined: the reason that was sent
  - for approved: a link "Open partner" → `#collaborations/<collaboratorId>`
- **Actions** (pending only):
  - **Approve** (primary, coral)
  - **Decline** (secondary)

### Approve dialog

A confirmation modal (the existing `ConfirmActionModal` pattern):
- **Title:** "Approve {businessName}?"
- **Body:** "This creates the partner. You'll set their code and rates next."
- **Founding checkbox:** "Founding partner ({left} of 20 spots left)". Ticked by default when `left > 0`. Disabled and unticked at 0, with the label "No founding spots left".
- **Buttons:** "Approve" / "Cancel".
- **On success:** go to `#collaborations/<collaboratorId>`, and invalidate the applications list, the pending count, the collaborators list and the public summary query.

### Decline dialog

A modal with a textarea:
- **Label:** "Reason (sent to the applicant)"
- **Limits:** optional, max 1000 characters
- **Helper line:** "Leave empty to send a short generic message."
- **Buttons:** "Decline" / "Cancel". Decline uses the destructive tone.
- **On success:** stay on the detail page, now showing the declined decision.

### Errors

| Case | What the admin sees |
| --- | --- |
| 409 `PARTNER_APPLICATION_NOT_PENDING` | Someone else decided it first. "This application was already decided." The page reloads. |
| 409 `FOUNDING_SPOTS_FULL` | In the approve dialog: "No founding spots left." The box unticks and the count reloads. |
| 409 `COLLABORATOR_EMAIL_EXISTS` | "A partner with this email already exists." Includes a link to that partner (from the error details) and leaves the application pending. |
| Anything else | The admin error toast used elsewhere. |

### Collaborations changes

- `CollaboratorResponseDto` and `CollaboratorRequestDto` get `founding: boolean`.
- The partner pane header shows a small "Founding" badge when it's true.
- The partner edit drawer gets a "Founding partner" checkbox. Unticking it frees a spot. Ticking it at 0 spots left fails with `FOUNDING_SPOTS_FULL`, shown on the field.
- Creating a partner by hand in Collaborations defaults to `founding: false`.

## How approve fills the collaborator

Spring does the mapping, so the frontend only sends `{ founding }`.

| Collaborator field | From the application |
| --- | --- |
| `name` | `businessName` |
| `contactEmail` | `email` |
| `contactPersonName` | `name` |
| `contactPhone` | `phone`, normalized to E.164 when it parses. Otherwise the raw value goes into `notes`. |
| `websiteUrl` | `link` when it's an `https://` URL |
| `notes` | `Instagram: @handle` when `link` is a handle. Plus `Country: <code>` when the country is outside the VIES list. Plus `Applied via <utmSource>` when set. Plus `Role: <role>` (the `PartnerRole` the applicant picked). |
| `countryCode` | The VIES code when the country is in the EU (`GR` → `EL`). Otherwise null. |
| `founding` | The dialog's checkbox |
| `status` | `ACTIVE` |

The application stores `collaboratorId`, `decidedAt` and `decidedBy`.

## Spring contract

All admin endpoints need an admin session, like the existing `/api/admin/collaborators`.

```ts
export type PartnerApplicationStatus = 'PENDING' | 'APPROVED' | 'DECLINED';

export interface AdminPartnerApplicationDto {
    id: string;
    status: PartnerApplicationStatus;
    createdAt: string;
    name: string;
    businessName: string;
    role: PartnerRole;
    email: string;
    link: string;
    countryCode: string;     // ISO 3166-1 alpha-2
    phone: string | null;
    locale: string;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    decidedAt: string | null;
    decidedByEmail: string | null;
    declineReason: string | null;
    collaboratorId: string | null; // set once approved
}

// GET  /api/admin/partner-applications?status=PENDING|APPROVED|DECLINED&page=0&size=25
//      → the paged shape other admin lists use (content + totalElements); no status = all, newest first
// GET  /api/admin/partner-applications/{id} → AdminPartnerApplicationDto
// POST /api/admin/partner-applications/{id}/approve  { founding: boolean }
//      → 200 { collaboratorId: string }
//      409 PARTNER_APPLICATION_NOT_PENDING | FOUNDING_SPOTS_FULL | COLLABORATOR_EMAIL_EXISTS (details: { collaboratorId })
// POST /api/admin/partner-applications/{id}/decline  { reason: string | null }  (max 1000)
//      → 200 AdminPartnerApplicationDto
//      409 PARTNER_APPLICATION_NOT_PENDING
```

Collaborator changes: `founding: boolean` on `CollaboratorResponseDto` and on the create/update request (`CollaboratorRequestDto`). `FOUNDING_SPOTS_FULL` is returned there too.

New error codes get numbers from Spring and are added to `ERROR_CODES` in `lib/api/errors.ts`.

## Emails (sent by Spring, in the application's `locale`)

The copy follows the project's plain-copy rule. Spring owns the templates; this text is the content to use.

**Received**

| | English | Greek |
| --- | --- | --- |
| Subject | We got your application | Λάβαμε την αίτησή σας |
| Body | Thanks for applying to partner with StoryWall. We'll review it and reply by email. | Ευχαριστούμε για την αίτηση συνεργασίας με το StoryWall. Θα την εξετάσουμε και θα σας απαντήσουμε με email. |

**Approved**

| | English | Greek |
| --- | --- | --- |
| Subject | You're a StoryWall partner | Είστε συνεργάτης του StoryWall |
| Body | You're in. We'll email your code and partner page shortly. | Η αίτησή σας εγκρίθηκε. Θα σας στείλουμε σύντομα τον κωδικό και τη σελίδα συνεργάτη. |

For a founding partner, the body adds one line: "You're one of our founding partners." / "Είστε ένας από τους ιδρυτικούς μας συνεργάτες."

**Declined**

| | English | Greek |
| --- | --- | --- |
| Subject | About your StoryWall application | Σχετικά με την αίτησή σας στο StoryWall |
| Body | Thanks for applying. We can't take your application forward right now. | Ευχαριστούμε για την αίτηση. Αυτή τη στιγμή δεν μπορούμε να προχωρήσουμε. |

When the admin wrote a reason, it follows the body as its own paragraph, as written. With no reason, nothing more is added.

## Out of scope

- Creating codes or the free-event code during approval (done in Collaborations as today).
- An admin notification email for new applications.
- Bulk approve or decline.
- Reopening a decided application. Re-applying is allowed once the earlier application is no longer pending.

## Testing

- **Unit tests:**
  - the hash routing helpers
  - the approve dialog's founding-checkbox state (ticked, disabled at 0)
  - the 409 error mapping
  - the instagram handle → URL helper
- **Hook tests:** approve (navigates to the partner, invalidates the four queries) and decline (stays, shows the decision).
- **Visual checks:** desktop first (admin), with a mobile pass for review and simple actions.
- **Checks:** `tsc` and lint clean.
