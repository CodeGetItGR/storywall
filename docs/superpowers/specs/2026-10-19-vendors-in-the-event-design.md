# Vendors in the event — design

Date: 2026-10-19
Status: approved in conversation, awaiting written review
Scope: phase 1 of the partner collaboration program. Later phases are listed at the end and are out of scope here.
Shared proposal (Greek, for the business partner): https://claude.ai/artifact/Y1Vi45cxDBz1w9uVVcpdjK

## Goal

Let the professionals a couple hires (photographer, planner, DJ, …) join the couple's event with a role that gives them their own tools, and show guests who they are. This gives vendors a reason to care about StoryWall (their tools, plus exposure to guests who are future clients) and turns every event into a source of new partners.

Today an event has two roles, host and attendee. A co-host has full access, and "member roles" are labels with no permissions. Partners exist only as a discount code, a feed card and a read-only token page.

## Decisions

| Topic | Decision |
| --- | --- |
| Vendor types | Reuse `PartnerRole` (`PLANNER`, `VENUE`, `PHOTOGRAPHER`, `VIDEOGRAPHER`, `DECORATION`, `CATERING`, `MUSIC`, `OTHER`). One taxonomy for partners and vendors. |
| Permissions | Fixed presets per type, not a permission matrix. |
| Non-partner vendors | Allowed, same roles as partners, plus a "Become a partner" prompt. |
| Links | Created by the backend, one per allowed type, when the event has the Vendors module. The host only copies and sends one. |
| Joining | Immediate, no approval. The host is notified and can remove the vendor. The host can reset a link. |
| Guest cap | Vendors do not count toward `maxGuests` or the plan's member limit. The module has its own limit. |
| Feed | Vendors are members: they read and post like guests, with a vendor badge. |
| Partner auto-offer | When an event is activated with a partner's code, Spring emails that partner the link for their type. The checkout partner notice gets one more line saying so. |
| Vendor profile | Account-level, filled once on first join (business name, link, optional logo). Once partner accounts are linked (phase 3), partners show their partner branding instead. |
| Vendor list | Shown to guests. No switch for the whole list. The host removes one vendor; a vendor can opt out per event. |
| Pro album | Ships in this phase (photographer, videographer). Picks and full-quality download come in phase 2. |
| Pro storage | A separate allowance per plan, used only by Pro uploads. When it is full, Pro uploads spill into the event's normal storage, so the existing storage packs cover both. Host and photographer both see the Pro meter. |
| Configuration | Everything is a module, configured per plan in admin. |
| Audit | Every vendor-related action is written to the event audit log, without personal data. |

## Vendor types and tools

| Type | Tools on top of normal member access |
| --- | --- |
| `PHOTOGRAPHER`, `VIDEOGRAPHER` | Pro album: upload, delete own Pro items. Items carry a credit ("Photo: Studio X"). |
| `PLANNER` | Create, edit and delete schedule sessions. Post announcements. Read the RSVP report: counts, names, adults/children, notes. No emails or phone numbers. Read and print existing QR links (table cards, posters). |
| `MUSIC` | Live ranked song request list (the host leaderboard), mark a song played or unplayed. |
| `VENUE`, `DECORATION`, `CATERING`, `OTHER` | Vendor list entry only. |

Rules for every type:
- No access to billing, checkout, upgrades, members, bans, invitations (other than reading QR links for planners), settings, theme, modules, gift handover or event deletion.
- A vendor cannot be a host. A host or co-host who joins through a vendor link keeps their host membership. The vendor row is refused (`VENDOR_IS_HOST`), so one person never holds both.
- Moderation applies as for any member: hosts can delete a vendor's posts and Pro items, and remove the vendor.
- **Access window:** tools stop at `endAt` (or `startAt` when there is no `endAt`) + `accessDaysAfterEvent`. After that the vendor is a plain member, keeps their vendor list entry, and their Pro items stay.
- A suspended or soft-deleted event refuses vendors exactly as it refuses guests (`EventAuthorizationService.refuseIfHidden`).

## Links

- **Creation:** when an event becomes `ACTIVE` with the Vendors module, or the module is later unlocked, Spring creates one vendor link per allowed type that does not have one yet. A link is an `EventInvitation` with `shared = true`, `role = ATTENDEE` and a new `vendorType` column. This reuses the invite preview page, the token redemption flow and account creation with the token attached.
- **Limits:** a vendor link has no `maxGuests`. Joining is refused with `VENDOR_LIMIT_REACHED` once the event has `maxVendors` active vendors. Vendor memberships are excluded from the guest and member counts in `QuotaGuard` and the usage DTO.
- **Reset:** a host can reset one type's link. The old token stops working at once and a new one is created. Members who already joined stay.
- **Module removed or type disallowed:** links for that type stop working. Existing vendors lose their tools but stay members.
- **Draft events:** no links until activation.

## Joining

1. The vendor opens the link and sees the existing invite preview with one line: "You're invited as the photographer."
2. They sign in or register with the token attached, like any invite.
3. First time only: a short vendor profile sheet (business name required; website or Instagram required; logo optional). In this phase every vendor fills it, partners included.
4. They land on the event feed with their tools in the event menu.
5. The host gets a `VENDOR_JOINED` notification with the vendor's business name and type.

Joining twice through the same link is a no-op. Joining through a second type's link while already a vendor is refused (`ALREADY_A_VENDOR`). The host can remove them, and they can then rejoin with the other link.

## Partner auto-offer

- Trigger: the activation order of an event carrying a live partner code redemption settles, and the event has the Vendors module.
- The partner's type comes from the collaborator's `brandingRole`. If it is null, or not an allowed type for the plan, no email is sent.
- The email goes to the collaborator's `contactEmail`, in the language of the event's primary host. It names the event title and date and carries that type's link. It has no guest data.
- Sent once per event (idempotent on event id + collaborator id). A voided redemption sends nothing more and does not remove a vendor who already joined.
- Checkout: the existing `PartnerBrandingNotice` gains one line: "We'll send {partner} a link to join your event as a vendor."
- Packs (phase 3) will reuse the same trigger.

## Vendor profile

- New `vendor_profiles` table, one row per user: `businessName` (max 80), `vendorType` (default for the sheet only), `link` (https URL or `@handle`, max 500), `logoKey` (optional, same image rules as partner branding logos).
- The vendor edits it from their account profile page. Changes show on every event's vendor list.
- From phase 3, partner vendors whose account is linked to their collaborator show partner branding instead.

## Vendor list for guests

- A "Vendors" page in the event tools (`/events/[eventId]/tools/vendors`), visible to every member when the module is on and at least one vendor is listed.
- Row: logo, business name, localized type, link out. A tap records a click (no IP, user or device, like partner card clicks).
- Hidden rows: a vendor who opted out for this event, or one the host removed from the list. The host can show a hidden row again; the vendor's own opt-out can only be changed by the vendor.
- The partner feed card is unchanged and stays the bigger placement for partners.

## Become a partner

- Vendors who are not partners see a short prompt on their vendor tools page. In this phase "not a partner" means the vendor's account email does not match any collaborator's `contactEmail` and has no pending application. Dismissing it is stored on the vendor profile (`partnerPromptDismissedAt`), and it never shows again for that user.
- It opens an in-app sheet, filled in from the vendor profile and account (name, business name, type, email, link), plus country and optional phone. It submits to the existing `POST /api/public/partner-applications` with `utmSource = "storywall-vendor"` and `utmMedium = <vendorType>`. No personal data goes in a URL.
- A 409 (already applied) shows the existing plain line.

## Pro album and Pro storage

- A Pro item is a `Media` row with a new `collection = 'PRO'` (default `'GUEST'`) and the uploading vendor member. Originals are kept, like gallery media.
- The gallery shows a "Pro" tab when the event has Pro items. Each item shows the vendor credit.
- **Pro storage:** the Vendors module config has `proStorageBytes`.
  - `proUsed` = bytes of live Pro items.
  - Event usage = guest bytes + max(0, `proUsed` − `proStorageBytes`).
  - A guest upload is allowed while event usage + the new file ≤ the plan's limit + extras (unchanged rule).
  - A Pro upload is allowed while `proUsed` + the new file ≤ `proStorageBytes`, or, beyond that, while the overflow fits in the event limit.
  - Guests can never use the Pro allowance.
- The usage DTO gains `proStorageBytes` and `proUsedBytes`. The host sees a Pro meter next to event storage, and the photographer sees the Pro meter on the upload screen.
- `StorageTrimService` and `StorageThresholdRule` use the new event-usage formula. A trim only removes items counted in the event pool (guest items and Pro overflow, newest first). Pro items inside the allowance are never trimmed.

## Notifications

Host-facing, produced by Spring:
- `VENDOR_JOINED`: "{business} joined as {type}."

No vendor-facing notifications in this phase.

## Admin

- New module key `VENDORS` (`"vendors"`), configured per plan through `plan_tier_module_configs`:

  | Setting | Type | Meaning |
  | --- | --- | --- |
  | `maxVendors` | int ≥ 0 | Most active vendors per event |
  | `accessDaysAfterEvent` | int ≥ 0 | Days the tools keep working after the event |
  | `allowedTypes` | `PartnerRole[]` | Types that get a link |
  | `proStorageBytes` | long ≥ 0 | Pro allowance |

- Purchasable as a module unlock like other modules.
- The admin event detail shows the event's vendors (type, business name, joined date) read-only.

## Audit log

Written to the existing event-scoped `audit_logs` table (`AuditLogService`). Admin actions keep using `AdminAuditService`.

| Action | Entity | Recorded |
| --- | --- | --- |
| `VENDOR_LINK_CREATED`, `VENDOR_LINK_RESET` | `EventInvitation` | type, actor (null for system) |
| `VENDOR_JOINED`, `VENDOR_REMOVED`, `VENDOR_ACCESS_ENDED` | `EventVendor` | type, source (`LINK`, `PARTNER_EMAIL`) |
| `VENDOR_LIST_HIDDEN`, `VENDOR_LIST_SHOWN`, `VENDOR_OPTED_OUT`, `VENDOR_OPTED_IN` | `EventVendor` | who acted |
| `SESSION_CREATE`, `SESSION_UPDATE`, `SESSION_DELETE` by a vendor | `EventSession` | changed field names only |
| `ANNOUNCEMENT_CREATE` by a vendor | `Post` | post id |
| `PRO_MEDIA_UPLOAD`, `PRO_MEDIA_DELETE` | `Media` | size, who deleted |
| `RSVP_REPORT_VIEW` by a vendor | `Event` | report type, row count |
| `SONG_PLAYED`, `SONG_UNPLAYED` | `PlaylistSuggestion` | id |
| `PARTNER_VENDOR_EMAIL_SENT` | `Collaborator` | collaborator id |

Never recorded: guest notes, names, emails, phone numbers, IBANs, VAT numbers, post or comment text, file names. For changed fields that can hold personal data, only the field name is kept, never the old or new value. The IP address is left out of every vendor entry (`ipAddress = null`).

## Spring contract (proposed)

Paths follow existing conventions. Final names are settled in the backend plan.

- `GET /api/events/{eventId}/vendors/links`: host only. `[{ vendorType, url, createdAt }]`.
- `POST /api/events/{eventId}/vendors/links/{vendorType}/reset`: host only.
- `GET /api/events/{eventId}/vendors`: any member. Listed vendors for guests; hosts also get hidden rows with `hiddenByHost` and `optedOut`.
- `DELETE /api/events/{eventId}/vendors/{vendorId}`: host only. Removes the vendor role and membership.
- `PATCH /api/events/{eventId}/vendors/{vendorId}`: host `{ hiddenByHost }`, the vendor themself `{ optedOut }`.
- `POST /api/events/{eventId}/vendors/{vendorId}/clicks`: any member, rate-limited.
- `GET /api/events/{eventId}/vendors/me`: the caller's vendor role, type, tool access and access end date, or 404.
- `GET`/`PUT /api/me/vendor-profile`, and `POST /api/me/vendor-profile/dismiss-partner-prompt`.
- `PATCH /api/events/{eventId}/playlist/suggestions/{id}/played`: host or `MUSIC` vendor.
- Gallery upload gains `collection: "PRO"`, allowed for photographer and videographer vendors only.
- Opened to vendors by type (no new path): schedule create/patch/delete and announcements for planners, the RSVP report for planners (a vendor variant without contact fields), QR link list for planners, the playlist leaderboard for music vendors.
- Authorization: a new `EventAuthorizationService.requireHostOrVendor(eventId, userId, VendorCapability)`. It passes for hosts, and for vendors whose type grants the capability and whose access window is open. Every other `requireHost` call stays as it is.
- New error codes: `VENDOR_LIMIT_REACHED`, `VENDOR_IS_HOST`, `ALREADY_A_VENDOR`, `VENDOR_ACCESS_ENDED`, `VENDOR_CAPABILITY_MISSING`.

Data model:
- `event_vendors`: `id`, `event_id`, `member_id` (unique), `vendor_type`, `source`, `collaborator_id` (nullable), `hidden_by_host`, `opted_out`, `joined_at`, `removed_at`.
- `vendor_profiles`: see above, plus `partner_prompt_dismissed_at`.
- `event_invitations.vendor_type` (nullable).
- `media.collection` (`GUEST` default, `PRO`).
- `playlist_suggestions.played_at` (nullable).
- `vendor_list_clicks`: `id`, `event_id`, `event_vendor_id`, `clicked_at`.
- `partner_vendor_emails`: `event_id` + `collaborator_id` unique, `sent_at`.

## Frontend

Following the CLAUDE.md structure, prefetch and copy rules:
- **Manage → Vendors** (host): the type links as compact rows (type, copy, share, QR, reset behind a confirmation modal), and joined vendors as read-only rows. A row opens a focused sheet with "Hide from list" and "Remove" (with a confirmation modal).
- **Event tools → Vendors** (all members): the vendor list.
- **Vendor tools**: the planner gets the existing schedule editor, announcement composer, RSVP report and QR print screens, reached from the event menu. The DJ gets a full-screen live request list with "Played". The photographer gets the Pro upload with the Pro meter.
- **Vendor badge** on posts and comments by vendors.
- **Vendor profile sheet** on first join, and a section on the profile page.
- **Become a partner** prompt and sheet.
- **Checkout** partner notice line.
- **Gallery** Pro tab and credit.
- **Usage**: Pro meter on the host's plan/usage screen.
- Server prefetch + hydrate for the new pages (the vendor list and the Manage Vendors data), with keys exported from the hooks.
- All copy localized in el and en, plain and short.

SEO: no new public routes. Invite pages and event pages are already in `PRIVATE_PATHS` and noindex. No blockers.

## Legal

Terms and the privacy notice need lines saying that vendors the host invites can see the event, that planners can see RSVP names and notes, and that vendors appear in a list visible to members. The checkout partner notice gains the auto-offer line. Copy is reviewed before release.

## Testing

Exhaustive, for regressions and for the new features. Every item below is a test that must exist and pass before merge. Existing suites (624 backend test files, 364 frontend test files) must pass unchanged, apart from tests updated on purpose for the new usage formula.

### Backend: regression

- **Authorization stays closed.** A parameterized test runs every endpoint behind `requireHost` (one case per call site) as an attendee and as each vendor type. Each must keep its current refusal, except the endpoints this spec opens to vendors. This is the main guard against a vendor gaining host powers.
- Primary-host-only flows (deletion, primary transfer, withdrawal, gift handover) refuse vendors.
- Existing `*ControllerSecurityTest` classes (invitations, collaboration preview, etc.) pass unchanged.
- **Invitations:** guest links, named invites, co-host invites, shared QR links and their `guestKey` behaviour work as before. `maxGuests` and expiry are unchanged for non-vendor links.
- **Quotas:** guest count, member limit and storage limit are unchanged for events with no vendors and no Pro items. `QuotaGuard` refuses the same uploads as today when the module is off.
- **Storage trim and thresholds:** `StorageTrimServiceTest` and `StorageTrimNotifierTest` pass. New cases cover events with Pro items.
- **Partner codes:** `CheckoutCollaborationTest`, `BillingRefundCollaborationTest` and `CollaborationEarningServiceTest` pass. A refund or void after a partner email changes nothing about the vendor.
- **Moderation, suspension and soft delete** hide the event from vendors exactly as from guests.
- **Notifications:** existing rules fire as before. `VENDOR_JOINED` does not appear for guests or co-hosts.
- **Data export and account deletion** (`MeDataExportService`): include the vendor profile and vendor rows. Deleting a vendor's account keeps the event's audit rows (actor set null) and removes the profile.
- **Migrations:** migration tests for each new column and table, including defaults on existing rows (`collection = 'GUEST'`, `vendor_type = null`).

### Backend: new features

- **Links:** created on activation and on module unlock, one per allowed type. None for drafts. Idempotent on re-run. Reset invalidates the old token at once. A disallowed type's link stops working.
- **Joining:** each type joins. The limit is enforced at `maxVendors` under concurrent joins (two joins racing for the last slot). Host-joins-vendor-link is refused. A second type's link is refused. Rejoin after removal works. Vendors are excluded from guest and member counts.
- **Capabilities:** for each type, every tool endpoint allows the right type and refuses the others. Each refuses after the access window. Window edge cases: no `endAt`, a time-zone boundary, and `accessDaysAfterEvent = 0`.
- **Planner RSVP variant** never contains emails or phone numbers (asserted on the serialized JSON).
- **Pro album:** only photographer and videographer can upload `PRO`. Guests sending `PRO` are refused. A host can delete Pro items. The credit resolves from the vendor profile.
- **Pro storage:** usage formula unit tests (below the allowance, exactly at it, overflow, overflow at the event limit). A guest cannot use the Pro allowance. Trim never removes Pro items inside the allowance. Deleting Pro items lowers overflow first.
- **Partner email:** sent once per event and collaborator, on settled activation only. Not sent when there's no `brandingRole`, the type is disallowed, the module is off, or the redemption was voided before settlement. The language follows the primary host. No guest data in the body.
- **Vendor list:** hidden and opted-out rows are excluded for guests and included for hosts. Opt-out can be set only by the vendor. Click recording is rate-limited and stores no IP or user.
- **Become a partner:** the request carries `utmSource = storywall-vendor` and the type. A duplicate application gets 409.
- **Audit:** each action in the audit table writes exactly one row with the listed fields. A scan test asserts that no vendor audit row contains an email, a phone number, a guest note or a non-null IP. It runs over the `changes` JSON of rows produced by the full feature test suite.
- **Played mark:** music vendor and host only. It is idempotent and does not change the ranking.

### Frontend (Vitest)

- Hooks: vendor links, vendor list, my vendor role, vendor profile, Pro usage. Each covers loading, empty, error and data states, and query keys match the server prefetch.
- Components: Manage Vendors rows and sheet, reset and remove confirmation modals, vendor list rows (hidden state for hosts), vendor badge, profile sheet validation, become-a-partner sheet (prefill, 409, 429), DJ live list ("Played" toggle), Pro meter (below, at and over the allowance), gallery Pro tab and credit.
- Tool visibility: each vendor type sees only its tools in the event menu, and none after the access window.
- Checkout notice shows the auto-offer line only when a partner code is applied and the plan has the module.
- Localization: every new key exists in el and en (the existing message parity check).
- Regression: existing manage, gallery, playlist, schedule, RSVP, checkout and partner card tests pass.
- `npm run lint`, TypeScript and `npm test` all clean.

### End-to-end and manual checks

Run against a local backend with the dev server on :3000, signed in, for each role: host, guest, photographer, planner, DJ, venue.
- Full flow: activate an event with a partner code → partner email arrives with the right link → partner joins → host notified → partner appears in the vendor list.
- Each vendor type: join, profile sheet, tools present, tools absent for other types, host-only screens refused when opened by URL.
- Guest view: vendor list, hidden rows absent, vendor badge on posts.
- Pro storage: upload past the allowance and see the overflow reach event storage; the guest upload is refused when the event pool is full while Pro still has room.
- Access window: move the event date in the past and confirm tools turn off.
- Breakpoints: mobile first (375 px) for host, guest and vendor screens; desktop for a layout sanity check.
- iPhone: the vendor join and upload flow in the WebKit setup.

## Out of scope (later phases)

1. **Photo picks:** the host picks from Pro and guest photos; the photographer downloads picks at full quality.
2. **Partner workspace and event packs:** signed-in partner accounts, client list, buying packs, gifting and set-up-and-handover, earnings, share kit, self-edited branding. Packs reuse the auto-offer trigger.
3. **DJ export:** text/CSV export and "Open in Spotify" per song. Direct Spotify playlist push is not possible for an app our size under Spotify's 2026 developer rules.
4. **Partner pages:** each partner gets a public page: their profile, the events they worked on (with the host's consent), photos the host allows, and an "Inquire" button. This can grow into a public directory of vendors by type and city, which also brings search traffic (it needs its own SEO spec: one indexable page per partner, structured data, consent rules).
