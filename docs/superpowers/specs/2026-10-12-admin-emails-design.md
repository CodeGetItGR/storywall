# Admin emails: provisioned-host welcome and on-demand templates

Date: 2026-10-12
Repos: backend `event_social_media` (Spring), frontend `storywall` (Next.js)

## Goal

1. When an admin provisions an event, the host can be emailed about it.
2. Admins can send a small set of predefined transactional emails to one account on demand, after
   seeing a preview that is the real rendered email.

Out of scope: marketing or bulk mail, admin-editable templates, a sent-mail history view.

## Templates

Fixed in backend code. Admins cannot edit them.

| Key | Needs | Call to action | Token |
|---|---|---|---|
| `PASSWORD_RESET` | account is `ACTIVE`, `LOCAL`, has a password hash, not a guest | "Choose a new password" → `/reset-password?token=` | New `PASSWORD_RESET` token, as Forgot password issues |
| `PROVISIONED_HOST_WELCOME` | account + an event they host (`eventId`) | "Open your event" → `/events/{eventId}/feed` | None |
| `EMAIL_VERIFICATION` | account has an email that is not verified | existing verification link | New `EMAIL_VERIFICATION` token |
| `CUSTOM` | account has an email; admin-written `subject` (≤ 150 chars) and `body` (≤ 5000 chars), plain text | none | None |

- `PROVISIONED_HOST_WELCOME` never carries, creates or invalidates a password link. A provisioned
  host keeps the set-password email from account creation. If it expired they use Forgot password,
  or an admin sends `PASSWORD_RESET`.
- The welcome body greets the host by first name and names the event. The info block shows When /
  Where, built by the existing `eventInfoLines` (no RSVP line).
- Every template uses the existing `EmailLayout.compose` card, with no unsubscribe footer.
- `CUSTOM` bodies are escaped by `EmailLayout` like every other body. Only plain text is supported,
  and line breaks are kept (`white-space:pre-line`).

### Availability

Each template is either available or unavailable with a reason code, for example:
`NO_EMAIL`, `ACCOUNT_DELETED`, `NOT_PASSWORD_ACCOUNT`, `ALREADY_VERIFIED`, `NOT_ACTIVE`,
`NO_HOSTED_EVENTS`. For a deleted account, or one with no email, every template is unavailable.
Preview and send both re-check availability and return `409` (`5175`) when it fails. The `409` carries
no reason code; the client re-reads the templates list to show the current reason.

## Backend

### Separate composing from delivery

Split every `TransactionalMailService.sendX` that the admin templates reuse (password reset,
verification) into a `composeX(...) → EmailMessage` and the existing `deliver`. Move the shared
helpers (`greetingArgs`, `eventInfoLines`, `absolute`) to where both can use them. Existing callers
keep their current behaviour. Add `composeProvisionedHostWelcome` and `composeCustom`.

### `AdminEmailService`

- `templatesFor(userId) → List<{key, available, unavailableReason}>`
- `preview(userId, request) → {to, subject, html, text}`. Builds the email through the same compose
  method `send` uses, with token links filled by a fixed placeholder token. It creates no token,
  sends nothing, writes nothing.
- `send(userId, request, actor)` checks availability and creates the token where the template
  needs one (through `UserTokenService.issue`, with the same validity settings as the
  self-service flows). It delivers after commit and records `AdminAuditAction.EMAIL_SENT` with
  details `{template, locale, eventId?}`. It never records the subject or body.
- `request = {template, locale, eventId?, subject?, body?}`. `locale` is `en` or `el`, and the
  frontend defaults it to the account's saved locale. `eventId` is required for the welcome template
  and must be an event the account hosts (otherwise `400`). `subject`/`body` are required for
  `CUSTOM` only.
- A password reset sent this way bypasses the per-address request budget (`requireWithinPerAddressBudget`)
  because an admin sent it, but in every other way it behaves like Forgot password: any earlier unused
  reset token is replaced.

### Endpoints (all `hasRole('ADMIN')`)

- `GET  /api/admin/users/{id}/emails/templates`
- `POST /api/admin/users/{id}/emails/preview`
- `POST /api/admin/users/{id}/emails/send` → `204`
- `POST /api/admin/events`: new optional top-level `notifyHost` (default `true`). When true, the
  welcome email is sent in the host's saved locale after the provisioning transaction commits. A
  delivery failure is logged and never fails provisioning (as with all transactional mail).
- `POST /api/admin/events/welcome-preview` takes `{hostUserId, title, startAt?, timezone?,
  locationName?, locationAddress?, locale?}` and returns `{to, subject, html, text}` for the welcome
  email that provisioning would send, without creating anything. The host must exist and have an
  email.

### i18n

New keys in `messages.properties` and `messages_el.properties`:
`email.provisioned_welcome.{subject,body,cta}`. The welcome heading reuses the subject. Custom emails
use the admin's subject as both subject and heading.

## Frontend

### Account drawer → "Send email"

- `AccountDetailDrawer` gets a "Send email" action. It opens `AccountEmailDrawer` (right-side
  slide-over, admin design system), always addressed to that account.
- Sections: **Template** (segmented control; unavailable options disabled with their reason as a
  one-line caption), **Event** (select from the account's hosted events, welcome only), **Message**
  (subject + body, custom only), **Language** (EN / EL, default account locale), **Preview**,
  **Footer** (Cancel / Send).
- **Preview:** an inbox-style header showing "To" and "Subject", above the returned `html` in a
  sandboxed `iframe` (`sandbox=""`, `srcDoc`). It has a Desktop / Phone width toggle (600 / 375). It
  refetches when any input changes (custom text debounced). For token templates a short caption says
  the link in the sent email will be a new one.
- **Send** opens a confirmation modal (the recipient's address and the template name, "Send email" /
  "Cancel"). On success the drawer shows an "Email sent" state with a Done button. On `409` the drawer
  shows a short error and re-reads the templates, so the picker shows the current reason.
- Hooks: `useAccountEmailTemplates`, `useEmailPreview`, `useSendAccountEmail`, `useAccountEmailForm`
  (form state). Components stay presentational.

### Provision event form

- An "Email the host" checkbox, ticked by default, on the review step directly above the preview. Its
  value is sent as `notifyHost`.
- When it's ticked, the review step shows the same preview frame, fed by `welcome-preview`.
- Demo-event provisioning does not offer it (sends `notifyHost: false`).
- The success screen says whether the host was emailed.

### Copy

All new labels in `messages/en.json` and `messages/el.json` under `AdminPage.accounts.emails` and
`AdminPage.accounts.provision`.

## Testing

Backend:
- Compose output for each template contains the expected subject, greeting, event lines and link.
- Preview creates no token, sends nothing, writes no audit row. Send does all three.
- Availability rules for each reason code. A `409` when sending an unavailable template.
- `notifyHost=false` sends nothing, and `true` sends one welcome email after commit.
- A welcome email never issues a `PASSWORD_RESET` token.

Frontend:
- Hook tests for form state (template switching clears irrelevant fields, default locale) and for
  disabling unavailable templates.
- Provision form sends `notifyHost` and hides the preview when unticked.
- Visual check of the drawer and the preview on desktop, plus a quick check at a narrow width.
