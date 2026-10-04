# Legal release: remaining changes

Everything still needed before the legal pages (version `2026-10-04`) can go live. Background and
evidence are in [2026-10-04-legal-docs-pre-release.md](2026-10-04-legal-docs-pre-release.md).

Owner: **Dev**, **Business** or **Legal**. "Docs" says what to change in the legal texts
(`guestwall-be/src/main/resources/legal/2026-10-04/{el,en}/`) once the item is done.

Done in this branch: marketing (upgrade-offer) emails now go only to accounts with a confirmed
newsletter subscription and carry its unsubscribe link; the always-on `marketing_emails_enabled`
flag is dropped (migration `V139`).

## Blockers

### 1. Company details (Business)
Set in production: `LEGAL_TRADER_NAME`, `LEGAL_TRADER_ADDRESS`, `LEGAL_TRADER_EMAIL`,
`LEGAL_VAT_NUMBER`, `LEGAL_TAX_OFFICE`, `LEGAL_GEMI_NUMBER`, `LEGAL_SUPPORT_EMAIL`,
`LEGAL_PRIVACY_EMAIL`, `LEGAL_REPORTS_EMAIL`.
Until then the pages show `[pending]` / `[εκκρεμεί]`.
Docs: none, values fill in automatically.

### 2. Accept Terms and Privacy Policy at sign-up, and confirm 18+ (Dev)
Today registration only records acceptance of the Community Guidelines.
- Backend: record the Terms version accepted and when (same pattern as `guidelines_acceptances`),
  for email sign-up and Google/Apple sign-up. Refuse registration without it, like
  `acceptedGuidelinesVersion`.
- Backend: record an 18+ confirmation.
- Frontend: replace the sign-up checkbox wording with "I accept the Terms of Use and Community
  Guidelines and have read the Privacy Policy", linked to the three pages, plus an 18+ checkbox.
  Same for the Google/Apple first sign-in.
- When a new Terms version is published, ask existing accounts to accept it (like the
  Community Guidelines gate).
Docs: Terms §2 can then say we record the Terms version too.

### 3. QR Photo Upload: age and acceptance (Dev + Legal)
Today it takes only an optional name. The text says "by uploading you accept the Community Guidelines".
- Legal: decide whether an explicit 18+ and Terms checkbox is required for account-less uploads.
- Dev, if yes: add the checkbox to `components/invite/AnonymousQrMediaUploadForm.tsx` and require it
  on `POST /api/qr/{token}/media[/batch]`.
Docs: Terms §2, §16 and Privacy §13 if anything is collected.

### 4. Account deletion in the app (Dev + Business)
There is no self-service deletion; only an admin can delete an account.
- Business: pick the behaviour. The drafts offered two options: delete account and content, or
  delete account and keep posted content without a profile.
- Dev: `DELETE /api/me` (with re-authentication or an email code), the content handling chosen,
  the newsletter row anonymised (`NewsletterSubscriptionService.forgetUser` exists), sessions
  revoked, and a host's events handled first (transfer or delete).
- Frontend: a "Delete account" action in the profile with a confirmation modal.
Docs: replace the `[pending]` lines in Terms §26 and Privacy §28.

### 5. Third-party embeds load without consent (Dev)
Spotify and YouTube previews (`components/playlist/PlaylistItemRow.tsx`) and the Google Maps map
(`components/schedule/ScheduleMapPreview.tsx`) load automatically.
- Make them click-to-load: show a placeholder with "Show preview" / "Show map" and load the iframe
  only after the click. Keep the existing "open in Spotify/YouTube/Maps" link working.
Docs: Cookie Policy §7 and Privacy §37 should then say the content loads only when you choose to.

### 6. Stripe checkout text (Business)
"Refundable within 14 days of purchase" is not in our code. It comes from the Stripe Dashboard
(Settings → Checkout and Payment Links → Policies). Turn it off; our own checkout text already
explains withdrawal.
Docs: none.

### 7. Lawyer review (Legal)
Review all five texts in both languages, in particular:
- the withdrawal model (setup, event-day and coverage parts with different refund rules),
- business purchases with no right of withdrawal,
- who is controller for the details Hosts enter about guests,
- the legal bases in Privacy §22,
- Vercel Web Analytics running without consent (it stores nothing on the device),
- the Google sign-in script loading on the login and sign-up pages before any click,
- the newsletter discount offered for signing up (consent must be freely given),
- whether a cookie banner is needed at all today.
The original drafts cited Greek law 5317/2026 and a July 2026 CJEU ruling. Neither was verified
and neither appears in the texts.

### 8. Invoices and myDATA (Business + Dev)
Only Stripe receipts and the admin accounting export exist.
- Business: choose the invoicing provider and process for business buyers.
- Dev: integrate it.
Docs: replace the `[pending]` line in Terms §31.

## Before launch, not blocking the pages

### 9. Retention periods (Business + Legal, then Dev)
Nothing is ever deleted for: sessions (IP + user agent), event audit logs, bug reports and
screenshots, error events, inactive accounts, purchase records. Backups depend on Railway.
- Decide a period for each and the tax-record period.
- Dev: add cleanup to the billing sweep, or a new scheduled job, for each.
Docs: replace the `[pending]` line in Privacy §27.

### 10. Hosting regions and transfers (Business)
Confirm the region of Railway, Vercel, Cloudflare R2 and Brevo, and sign their data processing
agreements.
Docs: replace the `[pending]` line in Privacy §26.

### 11. Reactions are visible through the API (Dev)
`GET /api/posts/{id}/reactions` returns `memberId` to every member, while the app shows reactions
anonymously. Return counts per type plus the caller's own reaction, without other members' ids.
Docs: Terms §14 and Privacy §11 can then drop "the app does not show".

### 12. Hosts can rewrite guests' posts (Business, then Dev)
`PATCH /api/posts/{id}` lets any host change another member's text, still shown under that
member's name. Decide: author-only editing (hosts can still delete), or show "edited by a host".
Docs: Terms §13.

### 13. Failed video uploads keep the raw file (Dev)
When transcoding fails, the raw upload stays as the playable file (`VideoTranscodeService`).
Raw phone videos can contain GPS. Strip the metadata (e.g. `ffmpeg -map_metadata -1 -c copy`)
or don't serve FAILED videos to members.
Docs: none.

### 14. Withdrawal hold length (Dev / Ops)
`BILLING_WITHDRAWAL_HOLD_DAYS` (default 10) must stay below 14: the withdrawal text promises
refunds within 14 days. Add a startup check.

### 15. Production config
- `BILLING_WITHDRAWAL_TERMS_VERSION`: if set explicitly in production, change it to `2026-10-04`.
- `LEGAL_POLICIES_VERSION`: leave unset (default `2026-10-04`) unless publishing a newer version.
- Run migration `V139` (drops `users.marketing_emails_enabled`). Postgres-backed tests did not run
  in this environment, so run the Postgres test suite in CI first.

### 16. Small cleanups (Dev)
- `docs/integration guides/design.md` says presigned URLs last 15 minutes; the default is 60.
- Run `graphify update .` in the backend (not installed in this environment).

## When adding anything later

- A new tracker (Google Analytics, Meta Pixel, etc.): add a cookie banner with Accept all /
  Reject all / Settings, off by default, a "Cookie settings" footer link, and update the Cookie
  Policy and Privacy Policy first.
- Any wording change to a published text: publish a new dated version folder and bump the version
  setting. Never edit a version that is live. Orders and acceptances point at it.
