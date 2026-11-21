# Announcement as a Feed Composer Mode (KAN-232)

**Goal:** Announcement stops being its own page. The feed composer gets a third mode chip, Announcement, beside Post and Music. Only hosts and planners (vendors with ANNOUNCE) see it. It is text only, posts today's `ANNOUNCEMENT` post type, and has a Post button.

**Mockup:** AC1 on the "Host Overview redesign" canvas. Rejected: a switch beside Add media (it would allow photos).

## Decisions (owner, 2026-11-18)

- Old links `/events/{id}/tools/announcement` redirect to `/events/{id}/feed?compose=announcement`, which opens the composer in Announcement mode. Anyone who can't announce lands on the feed with no composer.
- The Overview's On the day quick tool and After stop go to the feed and open the composer there.
- Announcement leaves the host's Event menu (mobile) and the desktop right-panel host actions. Planners keep it in their tools menu, vendor page and feed quick actions, now pointing at the composer.
- Wording: no new strings. The chip and the Overview label use `PostCard.announcement` ("Announcement" / "Ανακοίνωση"). The mode reuses `ComposerCard.captionPlaceholder`, `.captionAriaLabel`, `.captionCharacterCount`, `.post`, `.posting`. Server errors use today's `ApiErrors` copy.
- Deleted keys (en + el): `Vendors.announcement.title`, `.back`, `.label`, `.send`, `.empty`; `MobileTabBar.hostMenu.announcement.label`, `.description`.

## Behaviour

- `?compose=announcement` is a one-shot trigger (like `?sheet=role`): it is replaced away with `replacePageUrl`, then the composer opens in Announcement mode if the viewer can announce.
- On the feed, a planner's Announcement link (quick action, tools menu, right panel) opens the composer in place, with no navigation. Elsewhere it navigates to the feed link.
- In Announcement mode the textarea and character count stay; the media row, media hint and Add media are hidden. The typed text is shared with Post mode; photos added in Post mode stay in the Post draft and are not sent with an announcement.
- Posting calls `createPost` with `type: 'ANNOUNCEMENT'` directly (not the publish queue), shows "Posting…" on the button, closes the composer on success and shows the server's error inline on failure.
- The chip shows when the viewer can post (`canComposePost`), is a host or has the ANNOUNCE vendor capability, and is not a demo visitor.

## File map

Create:
- `lib/announcementComposer.ts` (+ test): the `compose` param, the feed link, `withoutComposeParam`, `canAnnounce`, and in-place open requests (`requestAnnouncementComposer`, `handleAnnouncementLinkClick`, `subscribeAnnouncementComposerRequests`).
- `hooks/useAnnouncementPost.ts` (+ test): posts an announcement, exposes `isPosting`, `error`, `reset`.
- `hooks/useAnnouncementComposerTrigger.ts` (+ test) and `components/composer/AnnouncementComposerTrigger.tsx`: consumes `?compose=announcement` and in-place requests; mounted in the event layout.
- `hooks/useHostAnnouncementLink.ts`: the Overview's label + href, or null.

Modify:
- `hooks/useComposerController.ts`, `providers/composer/ComposerContext.tsx`: `announcement` mode, `canAnnounce`, `openAnnouncementComposer`, `selectAnnouncementMode`, `submitAnnouncement`.
- `components/composer/ComposerModal.tsx`, `ComposerModeToggle.tsx`: the chip and the text-only form (+ stories).
- `lib/routes.ts`: `feed` takes `compose`; `tools.announcement` removed.
- `hooks/useToolsMenuItems.ts`: host menu entry removed; planner entry repointed.
- `lib/vendors.ts`: planner tool link repointed.
- `hooks/useDayJourney.ts`, `hooks/useAfterJourney.ts`: use `useHostAnnouncementLink`.
- `components/feed/quickActions/*`, `components/layout/MobileTabBar.tsx`, `components/layout/right-context-panel/MemberActionsSection.tsx`: open in place on the feed.
- `app/(main)/(app)/(event)/events/[eventId]/tools/announcement/page.tsx`: server redirect only.
- `messages/en.json`, `messages/el.json`.

Delete:
- `app/.../tools/announcement/PageClient.tsx` (+ test), `components/announcement/AnnouncementScreen.tsx` (+ test), `hooks/useAnnouncementComposer.ts` (+ test), `lib/announcement.ts` (+ test).

## Checks

`npx tsc --noEmit`, `npx eslint .`, `npx vitest run`; signed-in check at 375px and 1280px, English and Greek: a host posts an announcement, a guest sees no chip, an old link lands in the composer.
