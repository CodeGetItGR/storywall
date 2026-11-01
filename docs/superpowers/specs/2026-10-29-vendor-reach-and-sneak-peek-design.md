# Vendor reach report and sneak peek — design

Date: 2026-10-29
Status: approved
Scope: two vendor features that show hosts and vendors the value of a vendor joining the event. Builds on [Vendors in the event](2026-10-19-vendors-in-the-event-design.md) (Pro album, vendor page, access window) and [Print picks](2026-10-23-print-picks-design.md) (the approved-partner match). The other ideas from the same brainstorm are Jira stories under epic KAN-17.

## Goal

- **Sneak peek:** the photographer or videographer shares up to 20 of their Pro items with every guest soon after (or during) the event. The couple gets a highlight while interest is high, and the vendor is seen by every guest, credited by name.
- **Reach report:** each vendor sees how many guests saw their work. Partners see the full numbers, which gives non-partners a concrete reason to apply.

## Partner rule

Every vendor gets the tools. Partners get the growth features. Here: every photographer and videographer can post a sneak peek; every vendor sees a short reach report; approved partners see the full one. "Approved partner" is the existing match (`ApprovedPartners.isApproved`, exposed as `VendorMeDto.approvedPartner`).

## Decisions

| Topic | Decision |
| --- | --- |
| Sneak peek: who | `PHOTOGRAPHER` and `VIDEOGRAPHER`, through a new capability `SNEAK_PEEK`. |
| Sneak peek: what | A feed post of a new type `SNEAK_PEEK` that links 1–20 of the vendor's own READY Pro items, plus an optional caption. |
| Sneak peek: how many | One per vendor per event. Once it is posted, the vendor cannot post another, even after deleting it. |
| Sneak peek: when | From the event's `startAt` until the vendor's access ends. Off whenever the vendor's tools are off. |
| Sneak peek: approval | None. It appears at once. The host can delete it or unpin it, as with any post. |
| Sneak peek: placement | Pinned to the top of the feed when posted. It stays pinned until the host unpins it. |
| Sneak peek: editing | The vendor can change the items and the caption. Edits do not notify anyone again. |
| Sneak peek: notice | One in-app notification and one email to every member with an account, except the posting vendor. |
| Views | New: one view per member per Pro item, and one per member per vendor post. Only counts are ever shown. |
| Reach report: who | Every vendor sees guests and link taps. Partners also see views, reactions, comments and partner card taps. |
| Reach report: where | A "Reach" section on the vendor page (live), one summary email when the vendor's access ends, and totals across events in the partner portal. |

## Sneak peek

### Posting

- A "Sneak peek" section on the vendor page (`VendorMeScreen`), in the event group after Tools, shown when `SNEAK_PEEK` is in the vendor's capabilities.
  - Before posting: a short line and a "Share a sneak peek" button. Before `startAt` the button is disabled with the date it opens. With no READY Pro items it is disabled with a line saying to add Pro items first.
  - After posting: the post's thumbnails, "Edit" and "Delete". After the access window closes, no actions.
- The button opens a focused sheet: a grid of the vendor's own READY Pro items to tick (1–20), an optional caption (same length limit as a normal post), and "Share with guests". The sheet states that every guest will be notified.
- Delete asks for confirmation in a modal ("Delete sneak peek" / "Keep it") and says it cannot be posted again.

### Rules

- Only Pro items whose `eventVendor` is the caller's vendor row, with `status = READY`. Images and videos both count.
- The post links the existing Pro media through `post_media`. No new upload, no new storage use.
- Deleting the sneak peek (by the vendor or the host) never deletes the Pro items.
- When a linked Pro item is deleted, it drops out of the post. When the last one goes, the post is soft-deleted with it.
- Hiding the vendor from the vendor list, or the vendor opting out, does not remove the sneak peek. Removing the vendor from the event soft-deletes it.
- The vendor cannot pin or unpin. `isPinned = true` is set by the server on create. Among pinned posts the feed keeps its current order (`isPinned DESC, createdAt DESC`).
- The vendor's one sneak peek is used up on create. A `sneak_peeks` row (see data model) records it, so a delete never frees the slot.

### Feed card

- `FeedPostRenderer` renders `SNEAK_PEEK` with its own card: a "Sneak peek" label, the vendor credit (logo and business name from the vendor profile, as in the Pro album), the caption, a grid of up to 4 thumbnails with "+N" on the last, and a "See all" link that opens the gallery's Pro tab (`?album=pro`, `hooks/useGalleryAlbum.ts`).
- Tapping a thumbnail opens the existing post viewer on that item.
- Reactions and comments work as on any post.
- The vendor badge rule from the vendors spec applies.

### Notification

- New `NotificationType.SNEAK_PEEK_POSTED`, emitted by a `SneakPeekNotifier` modelled on `MemberArchiveNotifier`: every non-deleted member with a user account, except the posting vendor. Hosts are included.
- Category `SYSTEM` (like `MEMBER_ARCHIVE_READY`): photos of the member's own event, not marketing, so it is always emailed.
- Dedupe key `sneak-peek:vendor:{eventVendorId}`, so a retry or an edit never sends it twice.
- CTA opens the post in the feed, never a media URL: a new `NotificationCtaTarget.EVENT_POST` with `{ eventId, postId }`, routed in `lib/notifications.ts` to the feed with the `post` search param the post modal already reads (`hooks/usePostModal.ts`).
- Copy keys `notification.sneak_peek.posted.title` / `.body`, with `{business}` and `{eventTitle}`.
- There is no push to guests' phones today (web push exists only for admin devices). "Notification" here means the in-app notification plus email. Real push is out of scope.

## Views

### What counts

- **Pro item view:** a member opens a Pro item in a viewer (the gallery viewer, or the post viewer from a sneak peek).
- **Vendor post view:** a post authored by a vendor member (including the sneak peek) is at least 50% on screen for at least 1 second in the feed.
- One view per member per item or post, forever. Hosts and the item's own vendor do not count. Anonymous scanners (no member) do not count.

### Recording

- The client collects ids and sends them in batches: `POST /api/events/{eventId}/views` with `{ mediaIds: UUID[], postIds: UUID[] }` (each list at most 50). It flushes every 10 seconds and on `visibilitychange` to hidden (with `keepalive`).
- The server keeps only ids that are Pro media or vendor-authored posts of that event, skips hosts and the vendor themself, and inserts with `ON CONFLICT DO NOTHING`. It returns 204 in every case except auth failures, so the client never retries or shows an error.
- Rate-limited per member like vendor list clicks.
- No IP, device or timestamp beyond `viewed_at` is stored. The member id is stored only to count each member once.

### Retention and rights

- Rows are deleted with the event, the member, the media or the post (`ON DELETE CASCADE`).
- `MeDataExportService` includes the caller's own view rows (ids and dates).
- No one can read who viewed what: there is no endpoint that returns rows, only counts.

## Reach report

### Numbers

Per vendor per event (`GET /api/events/{eventId}/vendors/me/reach`, the vendor only, readable after access ends too):

| Field | Meaning | Who sees it |
| --- | --- | --- |
| `guests` | Members of the event, without hosts and vendors | Every vendor |
| `listTaps` | Taps on their vendor list row (`vendor_list_clicks`) | Every vendor |
| `proViewers` | Members who opened at least one of their Pro items | Partners |
| `proViews` | Member–item views of their Pro items | Partners |
| `postViewers` | Members who saw at least one of their posts | Partners |
| `reactions`, `comments` | On their posts, including the sneak peek | Partners |
| `partnerCardTaps` | Partner feed card taps in this event (`partner_branding_clicks` with this event and their collaborator) | Partners whose card ran |

For a non-partner the server returns the partner fields as null. It never sends numbers the caller may not see.

### Vendor page

- A "Reach" section in the event group of `VendorMeScreen`, for every vendor type.
- The numbers each vendor can see as compact stat tiles, in one grid. No sentence restating them.
- Non-partners: the two tiles, then one line saying partners see the full report. While `showPartnerPrompt` is true, the line carries the existing "Become a partner" action (`BecomePartnerSheet`). Otherwise the line stays without the action.
- Fetched when the page opens. No polling.

### Summary email

- When `VendorAccessSweepJob` records `VENDOR_ACCESS_ENDED`, it also emits `NotificationType.VENDOR_REACH_SUMMARY` to that vendor (in-app and email, category `SYSTEM`, dedupe `vendor-reach:vendor:{eventVendorId}`), in the same transaction's after-commit hook.
- The body carries the final numbers the vendor may see. A non-partner's email adds one line about the full report with a link to the partner page in their locale.
- CTA opens the vendor page (the existing `EVENT_VENDOR_PAGE` target).
- Not sent when the vendor was removed, the event is deleted, or the module was off (the sweep already skips those).

### Partner portal

- `PartnerPortalResponseDto` gains `reach`: totals across every event where an account matched to this collaborator was a vendor: `events`, `guests`, `proViews`, `postViewers`, `listTaps`, and the 10 most recent events (date, type, guests, views). No event titles or ids: the portal opens with the link alone and stays aggregate-only until it gets sign-in (KAN-28).
- The portal shows it as a "Reach" section after earnings: stat tiles, then compact rows for the recent events.
- Events whose host deleted them drop out.

## Spring contract

- `POST /api/events/{eventId}/vendors/me/sneak-peek` `{ mediaIds, caption? }` → the post. Errors: `VENDOR_CAPABILITY_MISSING`, `VENDOR_ACCESS_ENDED`, `SNEAK_PEEK_NOT_OPEN` (before `startAt`), `SNEAK_PEEK_USED`, `SNEAK_PEEK_MEDIA_INVALID` (not their READY Pro item, or count outside 1–20).
- `PATCH /api/events/{eventId}/vendors/me/sneak-peek` `{ mediaIds?, caption? }`: same checks, while access is open.
- `DELETE /api/events/{eventId}/vendors/me/sneak-peek`: the vendor. The host uses the existing post delete.
- `GET /api/events/{eventId}/vendors/me` gains `sneakPeek: { postId, mediaIds, used }` (null for types without the capability).
- `POST /api/events/{eventId}/views` as above.
- `GET /api/events/{eventId}/vendors/me/reach` as above.
- `GET /api/public/partners/{token}/portal` gains `reach`.
- `VendorCapability.SNEAK_PEEK(EnumSet.of(PHOTOGRAPHER, VIDEOGRAPHER))`.
- `PostService` refuses `type = SNEAK_PEEK` on the normal create endpoint, and keeps refusing `isPinned` changes from non-hosts.

## Data model

- `sneak_peeks`: `id`, `event_id`, `event_vendor_id` (unique), `post_id` (nullable, set null when the post is purged), `created_at`. Records that the one sneak peek was used.
- `content_views`: `id`, `event_id`, `member_id`, `media_id` (nullable), `post_id` (nullable), `viewed_at`. Check: exactly one of `media_id`, `post_id` is set. Unique `(member_id, media_id)` and `(member_id, post_id)`. Index on `media_id`, `post_id`.
- `posts.type` gains `SNEAK_PEEK` (no constraint change; the column is free text).
- `NotificationType` gains `SNEAK_PEEK_POSTED` and `VENDOR_REACH_SUMMARY`. `NotificationCtaTarget` gains `EVENT_POST`.

## Audit

| Action | Entity | Recorded |
| --- | --- | --- |
| `SNEAK_PEEK_CREATE`, `SNEAK_PEEK_UPDATE`, `SNEAK_PEEK_DELETE` | `Post` | item count, who deleted (vendor or host) |
| `SNEAK_PEEK_NOTIFIED` | `Post` | member count told |
| `VENDOR_REACH_SUMMARY_SENT` | `EventVendor` | partner or not |

Views write no audit rows. No caption text, names or emails in any row.

## Frontend

Following the CLAUDE.md structure, prefetch and copy rules:
- `lib/api/types.ts`: `PostType` gains `'SNEAK_PEEK'`; `VendorMeDto.sneakPeek`; `VendorReachDto`; portal `reach`.
- `lib/vendors.ts`: `SNEAK_PEEK` in `CAPABILITY_TYPES`.
- `lib/vendorReach.ts`: which tiles a vendor sees, number formatting.
- `hooks/useSneakPeek.ts`: create, update, delete, with the vendor `me` cache updated.
- `hooks/useVendorReach.ts`: exports `vendorReachKeys`.
- `hooks/useContentViews.ts`: the batched recorder (queue, 10 s flush, flush on hide). `hooks/useVendorPostViewTracking.ts`: the IntersectionObserver rule for vendor posts.
- `components/vendors/me/SneakPeekSection.tsx`, `SneakPeekSheet.tsx`, `SneakPeekDeleteModal.tsx`, `ReachSection.tsx`.
- `components/feed/post/SneakPeekCard.tsx`, wired in `FeedPostRenderer`.
- Gallery and post viewers call the recorder when a Pro item is shown.
- `components/partners/` gains a reach section for the portal.
- **Prefetch:** the vendor page's server `page.tsx` seeds `vendorReachKeys.me(eventId)` with the same gating as its existing vendor prefetch.
- Copy in en and el, plain and short. Greek uses επαγγελματίας for vendors. "Sneak peek" in Greek: «Πρώτη ματιά». Final wording through `design:ux-copy`.

SEO: no new public routes. The partner portal is under `/partners/`, already private. No blockers.

## Legal

- Privacy notice: a line saying StoryWall records which Pro photos and vendor posts a member opens or sees, to show vendors totals, and that vendors never see who.
- Terms: vendors may share a sneak peek that every member is notified about.
- Copy reviewed before release.

## Testing

### Backend

- **Regression:** existing post create, patch and delete keep their rules. Non-hosts still cannot pin. The normal create refuses `SNEAK_PEEK`. `MemberArchiveNotifier` and existing notification rules unchanged. `VendorAccessSweepJob` records exactly as before, plus one summary.
- **Sneak peek:** each refusal code. Only the vendor's own READY Pro items. 1 and 20 accepted, 0 and 21 refused. Second create refused after delete. Pinned on create. Deleting the post keeps the Pro items. Deleting the last linked item soft-deletes the post. Removing the vendor soft-deletes it. Edits keep it pinned and send nothing.
- **Notification:** every member with an account except the vendor, hosts included; anonymous scanners skipped; sent once under retries.
- **Views:** foreign ids, guest media and guest posts ignored. Hosts and the vendor themself not counted. Duplicates collapse. Cascade deletes. Rate limit. Data export includes own rows.
- **Reach:** each field against seeded data. Partner fields null for non-partners (asserted on the serialized JSON). Readable after access ends. Other vendors and guests refused.
- **Summary email:** once per vendor, partner and non-partner bodies, none for removed vendors or deleted events.
- **Portal:** totals across events, deleted events excluded.

### Frontend (Vitest)

- Hooks: sneak peek mutations, reach query (loading, empty, error, data; key matches the prefetch), the view recorder (batching, dedupe within a session, flush on hide, silent on failure).
- Components: sneak peek section states (not open yet, no Pro items, ready, posted, access ended), sheet selection limits, delete modal, feed card ("+N", credit, link), reach tiles for partner and non-partner.
- Localization parity check.
- `npm run lint`, TypeScript and `npm test` clean.

### Manual

Local backend, dev server on :3000, signed in as host, guest, photographer (partner and non-partner) and planner. Mobile first at 375 px, desktop sanity check:
- Photographer posts a sneak peek; guests get the notification and email; the card is pinned; the host unpins and deletes it.
- Views from a guest raise the photographer's numbers; views from the host do not.
- Move the event into the past and run the sweep; the summary email arrives.

## Out of scope

- Push notifications to guests' phones.
- Sneak peeks for other vendor types.
- View counts for guest posts and guest media.
- Reach numbers for hosts.
