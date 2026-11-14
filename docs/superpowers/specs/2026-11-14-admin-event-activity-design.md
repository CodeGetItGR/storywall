# Admin event Activity tab (KAN-214)

## Goal

Give platform admins an easy-to-read picture of how much an event was used: how many posts, stories, gallery uploads, wishes, reactions and so on, and when the activity happened (per hour, per day, peak times). All numbers are anonymous counts. No names, avatars, captions or media appear anywhere on the tab.

## Decisions (agreed 2026-11-14)

| Topic | Decision |
|---|---|
| Placement | A new **Activity** tab on the admin event page, next to the current view (which becomes the **Settings** tab). |
| Metric groups | Feed, stories, gallery / QR uploads, other modules (wishbook, playlist, quiz, RSVP). |
| People | Counts of people are allowed: members, members who contributed, share of members who contributed. |
| Time charts | Per hour, per day, hour-of-day heatmap, top 3 peak hours. |
| Removed content | Left out of every count and chart. One **Removed** tile shows how much was removed, per type. |
| Time zone | The event's own time zone (`Event.timezone`) for every hour and day. |
| Hourly range | Defaults to the event's day(s). A day picker moves through other days that had activity. The per-day chart covers the whole lifetime. |
| Freshness | Counted live when the tab opens, with a refresh button. No auto-refresh, no snapshots. |
| Big total | No large headline number. The tiles alone carry the totals. |
| Gallery | Guest uploads only (members + QR scanners), with an "N via QR" subline. Professional (`PRO` collection) uploads get their own tile, shown only when there are any. |
| Module tiles | Wishbook, playlist, quiz and RSVP tiles show only when the event has that module. |
| Backend shape | One admin endpoint returning totals plus hour buckets per type. The page builds the day view, heatmap and peaks from those. |

## Layout

The approved mockup (v2), top to bottom:

1. **Tabs**: Settings, Activity. The tab lives in the hash (`#events/<id>` = Settings, `#events/<id>/activity` = Activity), so a reload or a shared link reopens the same tab. The back link stays as it is today.
2. **Toolbar**: the time of the last refresh and a refresh icon button, right-aligned.
3. **Members line**: "121 of 184 members contributed · 66%", written as one compact line rather than a tile.
4. **Stat tiles**: a grid, 4 per row on desktop and 2 per row on mobile. Each tile has a small tinted icon, a label, a number and an optional muted subline:
   - Posts: subline is the number of photos and videos in posts.
   - Stories: subline is the number of story views.
   - Gallery: subline is "N via QR".
   - Professional uploads: shown only when the count is above 0.
   - Reactions: hovering or tapping shows the count for each reaction type.
   - Comments.
   - Wishes (wishbook module).
   - Playlist: songs suggested, with the vote count as subline (playlist module).
   - Quiz answers (quiz module).
   - RSVP: attending, with declined as subline (RSVP module; `AttendanceStatus` has only ATTENDING and DECLINED).
   - Removed: the total, with a per-type subline. Shown only when the total is above 0.
5. **Per hour**: a stacked column chart for one day (00:00 to 23:59 in the event's time zone), with one stack per type: posts, stories, gallery, wishes. Each column shows its total above it. Hovering or tapping a column shows a breakdown by type. The day's peak column is drawn at full strength with a bold label; the other columns are slightly muted. A day picker (previous / next arrows and the day's label) steps only through days that had activity. It opens on the event's start day, or on the busiest day when the start day had no activity. Hours with no activity before the first and after the last active hour of the day are trimmed, so a wedding shows roughly 16:00 to 04:00 rather than 24 mostly empty columns. Hours with no activity inside that range stay, at zero.
6. **Busiest hours of the day** (left) and **Peak moments** (right), side by side on desktop and stacked on mobile.
   - Heatmap: one row per type and 24 columns (00 to 23), summed across all days. One blue sequential ramp, with a tooltip showing the hour and the count.
   - Peak moments: the top 3 single hours across the event's lifetime, each with a rank badge, a day and hour ("Sat 23:00") and a total.
7. **Per day**: columns covering the lifetime from the first to the last active day, with the total above each column and the type breakdown on hover. Days with no activity inside the range stay, at zero. The range is capped at the last 60 days, with older days folded into a first "earlier" column.

**Empty state**: when an event has no activity yet, the tiles show 0 and the chart area shows one short line (copy to be approved).

**Look**: the admin slate palette, with brand coral only for the active tab indicator. Series colors use the fixed categorical order: posts blue, stories orange, gallery aqua, wishes yellow. Columns are at most 22 px wide, with 4 px rounded tops, hairline gridlines and tabular numbers. Sections are separated by whitespace, not borders.

## Backend (guestwall-be)

### Endpoint

`GET /api/admin/events/{eventId}/activity` on `AdminEventController`, admin only, read-only. It returns 404 when the event doesn't exist. It works for closed and deleted events too, so admins can still review what happened.

### Response

```jsonc
{
  "timezone": "Europe/Athens",
  "eventStartAt": "2026-06-14T16:00:00+03:00",   // nullable
  "eventEndAt": "2026-06-15T04:00:00+03:00",     // nullable
  "generatedAt": "2026-11-14T14:02:11Z",
  "members": { "total": 184, "contributed": 121 },
  "totals": {
    "posts": 312, "postMedia": 601,
    "stories": 97, "storyViews": 2410,
    "galleryUploads": 866, "galleryViaQr": 402, "proUploads": 0,
    "comments": 688,
    "reactions": 3905,
    "reactionsByType": [{ "code": "heart", "count": 2100 }],
    "wishes": 74,                                   // null when the module is off
    "playlist": { "suggestions": 58, "votes": 410 }, // null when the module is off
    "quizAnswers": 230,                             // null when the module is off
    "rsvp": { "attending": 120, "declined": 6 }     // null when the module is off
  },
  "removed": { "posts": 8, "stories": 3, "galleryUploads": 0, "comments": 0, "wishes": 0 },
  "hours": [
    // only hours with activity; local hour in the event's time zone
    { "hour": "2026-06-14T23:00", "posts": 60, "stories": 30, "gallery": 90, "wishes": 34 }
  ]
}
```

### Definitions

- **Members**: live `EventMember` rows of the event (not deleted, not reply-only RSVP guests). **Contributed**: distinct members who authored at least one non-removed post, story, gallery upload, comment, reaction or wish.
- **Posts**: `Post` rows with `deletedAt IS NULL`. **Post media**: the `PostMedia` rows on those posts.
- **Stories**: `Story` rows with `deletedAt IS NULL`, expired ones included (an expired story still happened). **Story views**: the `StoryView` rows on those stories.
- **Gallery uploads**: `Media` rows in the `GUEST` collection that are not linked from a `PostMedia` row or a `Story`, with `deletedAt IS NULL` and a status other than `FAILED`. **Via QR**: the subset with no `uploaderMember`. **Professional uploads**: the same rule applied to the `PRO` collection.
- **Comments**: `Comment` rows with `deletedAt IS NULL` on non-removed posts. **Reactions**: `Reaction` rows on non-removed posts, grouped by `ReactionType.code`.
- **Wishes**: `WishbookEntry` rows with `deletedAt IS NULL`. **Playlist**: `PlaylistSuggestion` and `PlaylistVote` counts. **Quiz answers**: `QuizAnswer` count. **RSVP**: `Rsvp` rows grouped by status.
- **Removed**: the same types counted with `deletedAt IS NOT NULL`.
- **Hours**: `createdAt` truncated to the hour in the event's time zone (in SQL: `date_trunc('hour', created_at AT TIME ZONE :tz)`), for posts, stories, gallery uploads and wishes. Comments and reactions are counted in the tiles but are not charted, which keeps the chart to the four things guests create.
- When `Event.timezone` is null, the platform default is used and returned in `timezone`.

The plan confirms each module flag and status field name against the entities before writing the queries.

### Performance

Each count is a grouped aggregate on `event_id`. The plan checks that the indexes on `(event_id, created_at)` exist for posts, stories, media and wishbook entries, and adds a migration for any that are missing. For our event sizes the response stays small: at most a few hundred hour rows.

## Frontend (storywall)

- `lib/api/types.ts`: `AdminEventActivityDto`.
- `hooks/useAdminEventActivity.ts`: a `useQuery` keyed by `adminEventKeys.activity(eventId)`, enabled only while the Activity tab is open. It exposes `refetch` and `dataUpdatedAt` for the toolbar.
- `lib/adminEventActivity.ts`: pure helpers, each unit tested:
  - `activeDays(hours)`: the sorted local days that had activity.
  - `defaultDay(activity)`: the start day if it had activity, otherwise the busiest day.
  - `hourlyForDay(hours, day)`: the trimmed list of 0-filled hour columns, with totals.
  - `dailySeries(hours)`: the 0-filled day columns, with the 60-day cap and an "earlier" bucket.
  - `hourOfDayHeatmap(hours)`: a 4 × 24 matrix.
  - `topPeaks(hours, 3)`.
  - Formatting of day and hour labels in the event's time zone, using the existing `lib/datetime` helpers.
- `hooks/useEventDetailTab.ts`: reads and writes the tab in the hash through the existing admin hash helpers in `lib/adminEvents.ts` (`parseEventsHash`/`formatEventsHash` gain an optional `activity` segment).
- Components under `components/admin/events/activity/`, each small:
  - `EventActivityTab` (composition only)
  - `EventActivityToolbar`
  - `EventActivityMembers`
  - `EventActivityTiles` and `EventActivityTile`
  - `EventActivityHourly` (with `EventActivityDayPicker`)
  - `EventActivityHeatmap`
  - `EventActivityPeaks`
  - `EventActivityDaily`
  - `EventActivityEmpty`
  - `EventActivitySkeleton`
- Charts use `recharts` (already used in `VisitorsDaily`), with `LabelList` for the column totals and a custom tooltip. The heatmap is a plain CSS grid.
- Icons come from `lucide-react`, which the admin console already uses.
- `EventDetailPage` gains the tab bar. `EventDetail` stays as the Settings tab, unchanged.
- **Copy**: every label goes into `messages/en.json` and `messages/el.json` under `AdminPage.events.activity`. The exact English and Greek wording is shown to the owner for approval before any string is added.
- **Data fetching**: the admin console is a client-rendered hash app (the event page is client-fetched today). The Activity query follows that pattern, so there is no server prefetch to add.

## Error handling

- **Loading**: a skeleton of tiles and chart blocks.
- **Error**: the existing `AdminPage.errors.*` message, plus the refresh button to retry.
- **Partial data**: each module's value is `null` when the module is off, and its tile is hidden. When a value is 0, the tile still shows, with 0.

## Testing

- **Backend**: integration tests on a seeded event. They cover:
  - Each count, and that removed content is excluded and counted separately.
  - The gallery rule: post and story media are excluded, QR uploads are counted, `PRO` uploads are kept separate.
  - Hour bucketing in a non-UTC time zone, across midnight and across a DST change.
  - Module-off nulls.
  - 403 for non-admins and 404 for an unknown event.
- **Frontend**:
  - Vitest unit tests for every helper in `lib/adminEventActivity.ts`.
  - Component tests for the tab with a fixture: tiles hidden when a module is off, the day picker stepping, the totals shown on the columns, and the empty state.
  - A hash-routing test in the existing `AdminNavigationContext.events.test.tsx` style.
- **Storybook**: stories for the Activity tab with a wedding fixture, an empty event, and a multi-day event. These feed the visual-regression check.
- **Visual check**: run locally at desktop width, with a mobile sanity check.

## Out of scope

- Per-person breakdowns, leaderboards and names.
- Host-facing versions of the dashboard.
- Exporting the data.
- Live auto-refresh.
- Comparing one event with another.
