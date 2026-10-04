# Legal documents: cross-check and pre-release list (2026-10-04)

The five legal drafts (Terms of Use, Privacy Policy, Cookie Policy, Cancellations & Withdrawal,
Contact) were checked against the backend (`guestwall-be`) and this frontend. The remaining work is listed in
[2026-10-04-legal-release-todo.md](2026-10-04-legal-release-todo.md). Corrected versions are
published as version `2026-10-04`, in Greek and English, and linked from the site.

## What shipped in this change

- **Backend** (`guestwall-be`): new texts in `src/main/resources/legal/2026-10-04/{el,en}/`:
  `terms-of-use.md`, `privacy-policy.md`, `cookie-policy.md`, `contact.md`, and a new withdrawal
  version (`withdrawal-information.md`, `model-withdrawal-form.md`).
  - `GET /api/legal/documents/{terms|privacy|cookies|contact}[/{version}]?locale=` (public).
  - New config, filled into the texts when served. A blank value shows as `[pending]` / `[εκκρεμεί]`;
    blank emails fall back to `LEGAL_TRADER_EMAIL`:
    `LEGAL_SUPPORT_EMAIL`, `LEGAL_PRIVACY_EMAIL`, `LEGAL_VAT_NUMBER`, `LEGAL_TAX_OFFICE`,
    `LEGAL_GEMI_NUMBER`, `LEGAL_POLICIES_VERSION` (default `2026-10-04`).
  - The current withdrawal terms version is now `2026-10-04`
    (`BILLING_WITHDRAWAL_TERMS_VERSION`). Versions `2026-09-24` and `2026-09-25` are untouched, so
    existing orders still point at the text they accepted. If production sets this env var
    explicitly, update it there too.
- **Frontend**: pages `/legal/terms`, `/legal/privacy`, `/legal/cookies`, `/contact`. All legal pages
  (including withdrawal, Community Guidelines and report content) share `LegalPageShell`, which is the
  scroll container. Before this, these pages could not scroll: the body is locked to the viewport.
  The landing footer's legal labels are now links. Legal Markdown supports links and auto-links emails.

## Before release: blockers

1. **Fill in company details** in production env: `LEGAL_TRADER_NAME`, `LEGAL_TRADER_ADDRESS`,
   `LEGAL_TRADER_EMAIL`, `LEGAL_VAT_NUMBER`, `LEGAL_TAX_OFFICE`, `LEGAL_GEMI_NUMBER`, and the support,
   privacy and reports emails. Until then the pages show placeholders.
2. **Lawyer review** of all five texts, in particular: the withdrawal model (parts with different
   refund rules), the B2C/B2B wording, the controller/processor split between StoryWall and Hosts,
   legal bases, and the cookieless analytics position (below). The drafts cited Greek law
   5317/2026 and a July 2026 CJEU ruling; those were not verified and are not repeated in the texts.
3. **Terms and Privacy acceptance at sign-up.** Registration only asks to accept the Community
   Guidelines (`guidelines_acceptances`). Nothing records acceptance of the Terms or acknowledgement of
   the Privacy Policy, and there is no 18+ confirmation. The Terms say both are required.
4. **QR Photo Upload** collects only an optional name. The drafts promised email, 18+ confirmation
   and recorded acceptance; none exist. The texts now describe what really happens; decide whether
   an 18+ checkbox is needed.
5. **Account deletion.** There is no self-service account deletion (`/api/me` has no delete). Only an
   admin can delete or set `status=DELETED`. The drafts described a two-option deletion. The texts now
   say "email us" with a `[pending]` marker. GDPR erasure requests are manual until this exists.
6. ~~**Marketing emails without consent (bug).**~~ Fixed: `UPGRADE_OFFER` emails now go only to
   accounts with a confirmed newsletter subscription and include its unsubscribe link. The
   `users.marketing_emails_enabled` column is dropped (`V139`).
7. **Third-party embeds load without consent.** Spotify and YouTube previews on song suggestions
   (`components/playlist/PlaylistItemRow.tsx`) and the Google Maps embed on a schedule item's venue
   page (`components/schedule/ScheduleMapPreview.tsx`) load automatically and can set third-party
   cookies. Make them click-to-load, or add consent. The Cookie Policy describes the current behaviour.
8. **Stripe "Refundable within 14 days of purchase".** This text is not in our code. Our checkout
   footer is the detailed withdrawal text. It comes from a Stripe Dashboard setting (Checkout policies).
   Remove it or align it there.
9. **Invoices / myDATA.** Only Stripe receipts and the admin accounting export exist. The Terms carry
   a `[pending]` marker.

## Things the drafts got wrong (now corrected in the texts)

| Draft said | Code does |
|---|---|
| GA, GTM, Google Ads, Meta Pixel, Sentry are used | None of them exist. Only Vercel Web Analytics (cookieless) and an in-house crash reporter. |
| Cookie banner / CMP / "Cookie settings" link | No optional cookies, so no banner. "Cookie Settings" removed from the footer. Add a CMP before any tracker is added. |
| Google sign-in only | Google **and Apple** sign-in. |
| Last name optional | Required at sign-up. |
| Email verified before normal access | Verification only gates creating an event. |
| START/STORY/SIGNATURE = 3/6/9 months | Plans and coverage lengths are admin data. The texts don't hard-code them. |
| Warnings 30, 7 and 0 days before expiry | 7 days and 1 day. |
| 30-day grace period with extension to restore | No extension after coverage ends (5085). Hosts get 30 days read-only + download, then purge. |
| Ownership transfer not supported | Main-host transfer and gift-mode handover both exist. |
| Co-hosts' powers unknown | Co-hosts manage content, members, invites, settings. Only the main host buys, withdraws, deletes, sets the IBAN, transfers. |
| Only the post author edits text | Author **or any host** can edit the text; it still shows the author's name. Consider if hosts should be able to rewrite guests' words. |
| Post media can only be removed by deleting the post | True in the app; the API (`DELETE /api/post-medias/{id}`) allows it. |
| Reactions: identity maybe not stored | Stored per member; `GET /api/posts/{id}/reactions` returns `memberId` to any member, so "who reacted" is visible through the API. |
| Stories deleted after 24h | Only hidden; kept until the event is purged. Story view lists are recorded and shown to author and hosts (not in the drafts). |
| "Companions" = not access | True for RSVP plus-ones; invite links separately have a "guest limit" of people who can join. |
| RSVP fields | Also stores a phone number, exported in PDFs. |
| Schedule change notifications | None are sent. Notifications are host-only. |
| Only hosts download full resolution | Originals exist only with the keep-originals add-on; host **and uploader** can download them. Everyone can download the display version (≤2560px). |
| Online withdrawal / immediate-start checkbox to be built | Both exist (button with preview, emailed receipt, consent recorded per order). |

## Other risks found

- **Retention** is undefined for sessions (IP + user agent), admin and event audit logs, bug reports
  (with screenshots), error events, inactive accounts and backups. The Privacy Policy carries a
  `[pending]` marker. Also decide the tax-record retention period.
- **Hosting regions** of Railway, Vercel, Cloudflare R2, Brevo are not in the code; transfer
  mechanisms need confirming (`[pending]` in the Privacy Policy).
- **Failed video uploads** keep the raw file (`VideoTranscodeService`); raw videos may contain GPS
  metadata. Check whether a FAILED video is served to members.
- **Withdrawal holds** auto-release after `BILLING_WITHDRAWAL_HOLD_DAYS` (10). The texts promise
  refunds within 14 days, so keep that setting below 14.
- **Google sign-in script** (`accounts.google.com/gsi/client`) loads on page view of login/register,
  before the user clicks. Check with the lawyer whether that needs consent.
- **Vercel Web Analytics** runs without consent on the basis that it stores nothing on the device.
  Confirm with the lawyer.
- **Newsletter** offers a discount for signing up; consent must still be freely given (lawyer).
- `design.md` says presigned URLs last 15 minutes; the config default is 60.
- Backend: `graphify` was not available, so `graphify update .` was not run.
