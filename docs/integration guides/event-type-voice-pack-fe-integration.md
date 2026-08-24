# FE integration guide: Event type voice pack

Answers the gap flagged in the FE's own "Event Type Voice Pack" spec: a guest at a baptism was
reading "Join the wedding wall" and "Message for Emma & James" because the creation flow's ~40
user-facing strings never varied by `eventType`, unlike the module matrix, which already does.
`GET /api/config` now carries, for every enabled event type, an identity (icon, accent token) in
`eventTypes[]` and a full locale-mapped identity + curated ten-string **voice pack** in a new
`translations.eventTypes` namespace, every localized field a `{ en, el }` map.
No new endpoint — this rides on the existing `eventTypes`/`eventTypeKeys` pair from
[`event-lifecycle-locks-and-event-types-fe-integration.md`](event-lifecycle-locks-and-event-types-fe-integration.md).

**This is a breaking change to `GET /api/config`'s `eventTypes[]`** (`name`/`tagline`/`voice` moved
out into `translations.eventTypes`, keyed by `eventTypeKey`) **and to the admin
`PlatformEventTypeResponseDto.name`** (`string` → locale map), which **also drops `description`**
— see below. Backend and frontend ship together; there is no dual-read transition period.

## `GET /api/config` — `eventTypes[]` is now slim, copy moved to `translations`

```ts
interface AppEventTypeDto {
  id: string;
  eventTypeKey: string;                   // e.g. "WEDDING"
  icon: string;                           // an emoji, e.g. "💍"
  accentToken: 'rose' | 'sky' | 'amber';  // a design-token name, never a hex/CSS value
  isEnabled: boolean;
  sortOrder: number;
}
```

`name`, `tagline`, and `voice` are **not** on this DTO any more — they live in the sibling
`translations` namespace instead, so a client that only needs icon/accent/ordering (e.g. to render
a picker before a locale is known) doesn't pull ~40 strings × 2 locales it isn't using yet:

```ts
interface AppTranslationsDto {
  eventTypes: Record<string /* eventTypeKey */, AppEventTypeTranslationDto>;
}

interface AppEventTypeTranslationDto {
  name: { en: string; el: string };
  tagline: { en: string; el: string };
  voice: {
    titlePlaceholder: { en: string; el: string };
    locationPlaceholder: { en: string; el: string };
    joinSubtitle: { en: string; el: string };
    joinDisclaimer: { en: string; el: string };
    inviteHeadline: { en: string; el: string };
    rsvpMessageLabel: { en: string; el: string };
    rsvpAttendingConfirmation: { en: string; el: string };
    toolsSubtitle: { en: string; el: string };
    toolsScheduleDescription: { en: string; el: string };
    toolsPlaylistDescription: { en: string; el: string };
  };
}
```

`AppConfigResponseDto.translations` sits alongside `eventTypes[]` at the top level, not nested
inside it — look up copy for a given type with `config.translations.eventTypes[eventTypeKey]`.
`translations.eventTypes` covers exactly the entries in `eventTypes[]`/`eventTypeKeys` (enabled
types only); the namespace is designed to gain sibling keys for other translated content later
(e.g. module copy) without disturbing this one, so don't assume `eventTypes` is its only key going
forward.

`description` is gone from the public shape too, full stop — not deprecated, not nulled, removed
from the payload. Every place that read it should read `translations.eventTypes[key].tagline`
instead (same role: the one-line subhead under the type name).

**Locale maps, not a fixed `{en, el}`-only assumption baked into the FE.** Read whichever locale
key matches the guest's locale; don't destructure assuming exactly two keys stay two keys forever.
A third locale, if it ever ships, is a data change in this response, not a new field name or a FE
deploy.

**`accentToken` is a closed set today: `rose | sky | amber`.** `WEDDING`/`PRIVATE_PARTY` use
`rose`; `BAPTISM`/`CORPORATE`/`CONFERENCE` use `sky`; `SOCIAL_EVENT`/`BIRTHDAY`/`FESTIVAL` use
`amber`. Map each token to whatever the design system's actual color values are on your side; the
backend only ever sends the token name. An event type using a token your palette doesn't have
would be a bug — file it back rather than guessing a color, since the backend enum is meant to be
the complete list.

**`voice` is always present with all ten keys for every entry in `translations.eventTypes`** — the
backend fails to start if any enabled type's voice pack is incomplete, so a partial object is not a
case you need to handle defensively. Use it to replace every hardcoded wedding-flavored string in
the creation flow, invite screen, RSVP form, and the tools/schedule/playlist module descriptions —
see the FE's own spec for the full inventory of ~40 call sites; this response is what backs all of
them.

## Admin: full voice pack shape, `name`/`description` are no longer writable

`GET /api/admin/platform-event-types` (all eight keys, including disabled ones) returns the full
decorated shape — unlike the public endpoint, the admin listing keeps everything inline on one
object rather than splitting it into a `translations` namespace, since an admin console previewing
a type's copy before switching it on has no need for the split:

```ts
interface PlatformEventTypeResponseDto {
  id: string;
  eventTypeKey: string;              // e.g. "WEDDING"
  name: { en: string; el: string };  // was `string` — now a locale map, same as tagline/voice below
  tagline: { en: string; el: string };  // replaces `description`, which is gone
  icon: string;
  accentToken: 'rose' | 'sky' | 'amber';
  voice: { /* same ten keys as AppEventTypeTranslationDto.voice above */ };
  isEnabled: boolean;
  sortOrder: number;
}
```

```
PATCH /api/admin/platform-event-types/{eventTypeKey}
```

now only accepts `isEnabled` and `sortOrder`. Sending `name` or `description` (from a stale client
still built against the old contract) returns **`400`** rather than silently doing nothing —
display copy moved entirely into a deploy-managed catalog with no admin owner, so there is no
longer a code path that would apply an admin-supplied name. If any admin-console UI still has
fields for editing an event type's name/description, remove them; the toggle-only admin list from
`event-lifecycle-locks-and-event-types-fe-integration.md` (`isEnabled`, `sortOrder`) is now the
complete admin surface for this resource.

## Caching and `ETag`

`GET /api/config` is served from an in-memory cache instead of re-querying on every call, and
responds with an `ETag` header plus `Cache-Control: public, max-age=60, must-revalidate`.

If your HTTP client already forwards `If-None-Match` automatically (most do, including the
browser's native `fetch` when a shared cache is involved, and most query-library HTTP layers),
this needs no code change — a matching `If-None-Match` now gets back **`304 Not Modified`** with
an empty body instead of the full payload. If you're fetching manually and want to take advantage
of it, store the `ETag` response header alongside the cached config and send it back as
`If-None-Match` on the next fetch.

This is purely a transport optimization — the response shape and the "fetch once, cache it"
guidance from
[`app-config-fe-integration.md`](app-config-fe-integration.md) are unchanged. The cache is
invalidated immediately — not just after the 60-second `max-age` lapses — the moment any admin
write touches something `GET /api/config` surfaces (a feature flag, a plan, a paid service, a
module, or an event type), so the `ETag` is safe to use as a cheap "did anything change" signal
right after an admin action, not only as a periodic-refresh check.

## Acceptance check

An admin enabling a previously-disabled type (e.g. `BIRTHDAY`) via
`PATCH /api/admin/platform-event-types/BIRTHDAY { "isEnabled": true }` should make a subsequent
`GET /api/config` show `BIRTHDAY` in `eventTypeKeys`, with `eventTypes[]` carrying its icon/accent
and `translations.eventTypes.BIRTHDAY` carrying a fully populated, correctly-worded voice pack in
both locales — and the creation flow, invite screen, and RSVP/tools copy for that type should read
as if it were designed for a birthday, not a wedding, with **no frontend deploy**.

## Known gaps, not covered here

Confirmed FE-only, no backend dependency, out of scope for this change: host display name
resolution from `hosts[]`, the raw `event.eventType` enum leaking into the feed header, cover
gradients, placeholder badge counts, per-event document metadata, and Quiz removal / retiring
`lib/mock-data.ts`. Per-type *module composition* (which modules a type gets, as opposed to what
they're called) is unchanged and still lives at
`GET /api/event-types/{key}/modules` — see
`event-lifecycle-locks-and-event-types-fe-integration.md`.

**The Greek copy in `voice`/`name`/`tagline` is an unreviewed first draft**, carried over verbatim
from the FE's own spec plus backend-authored copy for the five not-yet-enabled types. Flag any
correction back rather than assuming it's final — fixing it is a one-file backend change with no
schema impact and no FE deploy needed.
