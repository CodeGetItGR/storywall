# FE integration guide: member roles

Added 2026-10-02. Host-only roles added 2026-10-03 (§1.1, `4018`). Members pick a social role for themselves in an event ("Best man", "Κουμπάρος" (best man) and "Κουμπάρα" (maid of honour),
"Friend of the bride", or free text where the event type allows it). The role is shown next to
their name on posts, comments and stories.

Roles are **labels only**. No permission reads a role, and picking one never changes what anyone
can do. Honorees (`isFeatured`) hold no role.

> **BREAKING, deploy together.** `relationshipRole` and `customRelationshipRole` are removed from
> `POST /api/event-members` and `PATCH /api/event-members/{id}` (§7). The BE and the FE must ship
> in the same release.

The module is `member_roles`. It is plan-owned and on by default for every event type, like the
other modules (see [`plan-owned-modules-fe-integration.md`](plan-owned-modules-fe-integration.md)).
There is no host toggle in the UI. Gate on `eventModuleKeys` / the event's module list as usual.

## 1. Data model

A member holds at most one of:

| `roleKey` | `customRole` | Meaning |
|---|---|---|
| null | null | no role |
| `"BEST_MAN"` | null | a catalog role |
| null | `"Uncle from Melbourne"` | custom ("Other") text |

Each event type has its own admin-managed catalog. Which type has which roles is data, not code:
read it from `/api/config` (§5.3), never hardcode it. Custom text is allowed only where the event
type's `allowCustom` is true (today the social event, private party and birthday types).

A role may have a cap (`maxHolders`), for example two best men.

### 1.1 Host-only roles (added 2026-10-03)

A catalog role can be **host-only** (`hostOnly: true` on `MemberRoleCatalogDto`). Only a host or
co-host may give it, to any member including themselves. Guests:

- don't get it in `GET member-roles` (§2.1): it is left out of their `roles` list, not disabled;
- get 403 `4018` if they `PUT` it anyway;
- keep it once a host gave it to them, can re-send it (a no-op 204), and can clear it themselves
  with `DELETE /role`.

Seeded host-only today: `BEST_MAN` and `MAID_OF_HONOUR` (weddings) and `GODPARENT` (baptisms). An
admin can change the flag on any role (§9). Bride, groom and the baptised child are not roles at
all: they are featured honorees (`isFeatured`), which only a host can set.

A host-only role still renders like any other: resolve it from `/api/config` as usual.

## 2. Endpoints

All three member endpoints take the **event member id** (`EventMemberResponseDto.id`), not a user
id. Errors use the usual envelope (`errorCode`, `errorKey`, `message`); §4 lists the codes.

### 2.1 `GET /api/events/{eventId}/member-roles`

The picker's data for one event. Any member of the event may call it (same check as the member
list). A non-member gets 403 `4001`. When the module is off for the event: 409 `5012`.

```ts
interface MemberRoleOptionsDto {
  allowCustom: boolean;   // false: hide the "Other" field
  customLocked: boolean;  // the CALLER's own custom text is locked, see §6.3
  roles: MemberRoleOptionDto[]; // active roles only, ordered by the catalog's sortOrder.
                                // Host-only roles (§1.1) appear only when the caller is a host or co-host.
}
interface MemberRoleOptionDto {
  roleKey: string;
  label: { en: string; el: string };
  emoji: string | null;
  maxHolders: number | null; // null = unlimited
  holders: number;           // members of this event who hold it now
  available: boolean;        // false when capped and full: disable the option
}
```

`holders` and `available` are a snapshot. Someone can take the last slot between this call and
yours, so still handle 409 `5114`.

### 2.2 `PUT /api/event-members/{id}/role`

Body: **exactly one** of the two fields.

```ts
interface MemberRoleRequestDto {
  roleKey?: string;    // max 50
  customRole?: string; // max 200 on the wire, 40 after normalization (see below)
}
```

Response: **204, no body.** The FE must update its own local state (§8).

Who may call it:

- the member themselves, or
- a host or co-host of the event, for anyone (a host may overwrite or clear any member's role).

Anyone else gets 403 `4001`. A soft-deleted event, or a member who has left or been removed,
is a 404 `2001`.

Rules, in the order the server checks them (each failure has its own code, §4):

1. Exactly one field is sent (3040).
2. Custom text is 1 to 40 characters after trimming (3040) and has no blocked term (3042). This is
   checked early, so bad text gets 3040/3042 even where custom roles are off or locked.
3. The event is ACTIVE (5014) and the module is available (5012).
4. The member is not featured (5113).
5. A catalog role must exist for the event's type and not be retired (3041). Re-sending the role
   the member already holds is a no-op 204, with no cap or host-only check.
6. A host-only role (§1.1) needs the caller to be a host or co-host (4018). This comes before the
   cap, so a guest gets 4018 even when the role is full.
7. A cap counts the other holders and rejects when it is full (5114). This applies to hosts too.
8. Custom text needs `allowCustom` (4016) and an unlocked member unless the caller is a host (4017).

Picking a catalog role replaces custom text and vice versa. The server stores the text normalized
(Unicode NFC, control characters stripped, whitespace collapsed, trimmed). Render it as **plain
text**, never as HTML. Use `memberCustomRelationshipRoleMaxLength` from `/api/config` (now 40)
for the input's `maxLength`.

### 2.3 `DELETE /api/event-members/{id}/role`

Clears whichever kind the member holds. 204, no body. Same callers as `PUT`: the member or a host.

Clearing needs only that the event is ACTIVE (5014). It does **not** need the module to be on, so
a host can still remove a role after the module has been switched off. Clearing when there is
nothing to clear is a 204.

### 2.4 `DELETE /api/event-members/{id}/role-lock`

Host or co-host only (403 `4001` otherwise). 204. Lifts the custom-text lock (§6.3). Unlocking
does not restore the removed text. The member can set new text afterwards.

### 2.5 Rate limit

`PUT` and `DELETE` on `/role` share one bucket: **300 per hour per user**. A host labelling a big
guest list can make many calls, hence the high figure. Past it: 429 with `errorCode` `3010`
(`RATE_LIMITED`) and a `Retry-After` header. The limits are also listed in `/api/config`
`rateLimits` under the name `event-member.role`. `role-lock` and the `GET` use the platform default.

## 3. Where roles appear

### 3.1 `AuthorDto`

`PostResponseDto.author`, `CommentResponseDto.author` and `StoryResponseDto.author` all use
`AuthorDto`, which gained two fields:

```ts
interface AuthorDto {
  // ...existing fields
  roleKey: string | null;    // catalog key, resolve via /api/config (§5.3)
  customRole: string | null; // free text
}
```

At most one of the two is set. **Both are null when the module is off for the event**, even if the
member still holds a role: the values are kept, and come back when the module is switched on again.
Feed responses are locale-free by design (so the ETag does not depend on locale): the FE picks the
label by locale itself.

### 3.2 Member list and `/api/me/events`

`EventMemberResponseDto` (from `GET /api/events/{id}/members`, `GET /api/event-members/{id}`, the
`POST`/`PATCH` responses and each item of `GET /api/me/events`) keeps `relationshipRole` and
`customRelationshipRole`. The names are unchanged, the meaning is: `relationshipRole` is the catalog
`roleKey`, `customRelationshipRole` is the free text. Same rule as `AuthorDto`: **both are null when
the module is off for that event.** On `/api/me/events` this is decided per event.

`customRoleLockedAt` is **not** exposed on members. A member learns about their own lock from
`customLocked` on the picker call (§2.1). A host who wants to show "locked" next to a member has no
field for it today.

## 4. Error codes

Messages for `4016`, `4017`, `4018`, `5113`, `5114` and `5115` are localized by the server (`Accept-Language`). `3040`, `3041` and `3042` are English-only, as every 3xxx code is: localize those in the FE by code. The suggested copy is a starting point.

| Code | HTTP | Key | When | What the UI should do |
|---|---|---|---|---|
| `3040` | 400 | `MEMBER_ROLE_INVALID_REQUEST` | `PUT` sent neither or both of `roleKey` / `customRole`, or custom text is empty or over 40 characters after trimming | A client bug for the first case. For the length case show "A role must be 1 to 40 characters." |
| `3041` | 400 | `MEMBER_ROLE_UNKNOWN` | `roleKey` is not in this event type's catalog, or has been retired | Refetch the options (an admin retired it meanwhile) and let the user pick again. |
| `3042` | 400 | `MEMBER_ROLE_CUSTOM_BLOCKED` | The text contains a blocked term. The message never says which | Keep the input, show "That role contains a word we don't allow." Do not hint at the word. |
| `4016` | 403 | `MEMBER_ROLE_CUSTOM_NOT_ALLOWED` | The event type does not allow free text | Hide the "Other" field based on `allowCustom`. If you see this, the options were stale: refetch. |
| `4017` | 403 | `MEMBER_ROLE_CUSTOM_LOCKED` | A host or moderator removed this member's custom text and a host has not unlocked it | Disable the custom field. Catalog roles still work. Show "Your custom role was removed. You can still pick one from the list." |
| `4018` | 403 | `MEMBER_ROLE_HOST_ONLY` | A guest picked a host-only role (§1.1) | The picker never offers these to guests, so the options were stale (an admin flipped the flag): refetch them. Server message: "Only the hosts can give this role." |
| `5113` | 409 | `MEMBER_ROLE_FEATURED_MEMBER` | The member is a featured honoree | Hide the role picker for featured members. |
| `5114` | 409 | `MEMBER_ROLE_CAP_REACHED` | The role's slots are all taken. The message carries the cap | Refetch the options (the option now shows `available: false`) and tell the user "All N places for this role are taken." |
| `5115` | 409 | `MEMBER_ROLE_TEXT_CHANGED` | A **moderator** decision's `expectedContentText` (the case content `text` the admin UI displayed) no longer matches the member's custom text, which changed or vanished since the case was loaded (admin moderation screen only) | Reload the case and ask the moderator to decide again. The decision was rolled back. |
| `5012` | 409 | `MODULE_NOT_AVAILABLE` | The `member_roles` module is off for this event (plan, platform switch or event). Hits `GET member-roles` and `PUT`, not `DELETE` | Hide the whole role UI. |
| `5014` | 409 | `EVENT_NOT_ACTIVE` | The event is not ACTIVE yet (a draft) | Roles can't be edited until the event is active. Show the event's normal "not active" state. |

Also possible, unchanged: `4001` (not you, not a host), `2001` (member or event not found), `3010`
(rate limit, §2.5).

On a suspended StoryWall, `GET member-roles`, `PUT`, `DELETE …/role` and `DELETE …/role-lock` answer
like every other member write: 404 `2001` for a guest, 403 `4015` for a host or co-host. See
[`storywall-suspension-fe-integration.md`](storywall-suspension-fe-integration.md).

## 5. Config and catalog

### 5.1 `/api/config` `memberRolesByEventType`

```ts
memberRolesByEventType: Record<string /* eventTypeKey */, MemberRoleCatalogDto[]>;

interface MemberRoleCatalogDto {
  id: string;
  eventTypeKey: string;
  roleKey: string;
  label: { en: string; el: string };
  /** 2026-10-06: heading of this role's section in the wishbook book; null = the book uses `label`.
   *  See wishbook-book-fe-integration.md §8. */
  sectionLabel: { en: string; el: string } | null;
  emoji: string | null;
  maxHolders: number | null;
  sortOrder: number;
  hostOnly: boolean; // only a host or co-host may give it (§1.1)
  retired: boolean;
}
```

Each list is ordered by `sortOrder`. **Retired roles are included**, flagged `retired: true`,
because members may still hold them.

- To render an author's role: look up `roleKey` in `memberRolesByEventType[event.eventType]`, take
  `label[locale]` (fall back to `en`) and the optional `emoji`. If the key is not found, render
  nothing rather than the raw key.
- For the picker, use the `roles` list from `GET member-roles`: it already leaves out retired roles,
  and host-only ones for guests, and carries `holders` / `available`.
- An admin catalog edit applies to existing events at once (labels, emoji, caps are read live), and
  `/api/config` picks it up after its normal cache refresh.

### 5.2 `memberCustomRelationshipRoleMaxLength`

Now **40** (was 100). `memberRelationshipRoleMaxLength` (50) is unchanged and bounds `roleKey`.
Neither limit applies to `EventMemberRequestDto` / `EventMemberPatchDto` any more.

### 5.3 `ModuleKey`

`'member_roles'` joins the union (eleven canonical keys).

## 6. Moderation

### 6.1 Reporting

Reporting a member (`POST /api/reports`, `targetType: "MEMBER"`) used to be host-only. Now **any
active member of the event may report a member who currently has custom role text.** For a member
without custom text, only hosts and co-hosts can, as before (403 `4001`). The other checks are
unchanged: same-event membership, no self-reports, one open report per reporter and target, rate
limits. Show a "Report" action on a custom role to every member, and keep the host-only "Report
member" action as it is.

### 6.2 Moderation center

In admin moderation, for a `MEMBER` case:

- `content.text` is now **the member's custom role text** (it was always null).
- `allowedActions.removeContent` is true only while that text exists. Removing it clears the text,
  locks the member (§6.3) and records the usual `CONTENT_REMOVED` audit entry with target type
  `MEMBER`.
- The decision request must carry `expectedContentText`: the case content `text` the admin UI
  displayed (required with `removeContent` for a `MEMBER` case, `3039` if missing; ignored for other
  targets). If it differs from the stored text under the lock (changed or removed after the moderator
  loaded the case), the decision fails with 409 `5115` and is rolled back: reload the case.
- Like every action, removing the text needs a statement of reasons (ground, rule, explanation;
  `3039` otherwise). The member is emailed it, with the item shown as "Member profile".
- Remove member, ban, account suspension and StoryWall suspension work as for any other case.

See [`moderation-admin-fe-integration.md`](moderation-admin-fe-integration.md).

### 6.3 The lock

When someone **other than the member** removes their custom text, the server sets a lock on that
membership (per event):

- a host's `DELETE /role` on a member who had custom text,
- a host's `PUT /role` that replaces custom text,
- a moderator's "remove content".

While locked, the member can still pick **catalog** roles but gets 4017 for custom text, and
`customLocked` is true on their picker call. A host unlocks with `DELETE /role-lock` (§2.4). A host
can set custom text on a locked member without unlocking. A member clearing their own text does not
lock them.

### 6.4 The blocklist

Custom text is checked against a word list (English and Greek, vendored, plus admin additions)
on every `PUT`. Matching ignores case, accents, final sigma, common look-alike and leetspeak
characters and repeated letters, and compares whole words, so innocent words that merely contain a
bad one pass. It cannot catch everything: reports (§6.1) are the backstop.

## 7. BREAKING: the member create and PATCH bodies

`relationshipRole` and `customRelationshipRole` are **removed** from:

- `POST /api/event-members` (`EventMemberRequestDto`)
- `PATCH /api/event-members/{id}` (`EventMemberPatchDto`)

`spring.jackson.deserialization.fail-on-unknown-properties` is on, so a body that still carries
either field gets **400** with `errorCode` `3002` (`MALFORMED_REQUEST_BODY`) and
nothing is saved. Remove them from every create and edit form and payload builder. Set roles only
with `PUT /api/event-members/{id}/role`.

Both fields stay on `EventMemberResponseDto`. Setting `isFeatured: true` through the PATCH also
**clears the member's role** in the same transaction (honorees hold no role), so refresh the
member from the PATCH response.

## 8. Feed freshness (read this before building the optimistic UI)

Feed and comment responses are cached by an ETag that follows one per-event counter. A role change
does **not** bump that counter, so:

- A member's own pick, change or clear, or a host assigning a *catalog* role, is **not pushed** to
  other members' feeds right away. Others see it the next time the counter moves (a new post,
  comment or edit). In a quiet event that can be hours. This is accepted.
- `PUT` and `DELETE` return 204 with **no body**. The member's own client must update its local
  state (author labels in cached posts and comments, the member list) itself, on success.
- **Exception, immediate:** custom text removed by a host (`DELETE /role`, or a `PUT` that replaces
  it) or by a moderator bumps the counter and wakes the feed stream at once. Open feeds refetch
  and the offending text disappears. If you subscribe to the feed stream (see
  [`posts-feed-push-and-etag-fe-integration.md`](posts-feed-push-and-etag-fe-integration.md)),
  nothing extra is needed.
- The public demo (`/demo`) shows role changes within its 60 second snapshot cache.

## 9. Admin: role catalog

`/api/admin/member-roles` (ADMIN only; 403 `4001` for anyone else). Writes are logged, not written
to the admin audit log, like the other catalogs. A write refreshes `/api/config`.

| Method | Path | Body | Result |
|---|---|---|---|
| `GET` | `/api/admin/member-roles?eventTypeKey=WEDDING` | | `MemberRoleCatalogDto[]`, **including retired**. `eventTypeKey` is required |
| `POST` | `/api/admin/member-roles` | `MemberRoleCatalogRequestDto` | 201 `MemberRoleCatalogDto` |
| `PATCH` | `/api/admin/member-roles/{id}` | `MemberRoleCatalogPatchDto` | `MemberRoleCatalogDto` |
| `POST` | `/api/admin/member-roles/{id}/retire` | none | `MemberRoleCatalogDto` |
| `POST` | `/api/admin/member-roles/{id}/unretire` | none | `MemberRoleCatalogDto` |

```ts
interface MemberRoleCatalogRequestDto {
  eventTypeKey: string;              // must be a known event type
  roleKey: string;                   // ^[A-Z][A-Z0-9_]{1,49}$, immutable after creation
  label: { en: string; el: string }; // see rules
  sectionLabel?: { en: string; el: string } | null; // 2026-10-06, optional wishbook-book section title; same rules as label
  emoji?: string | null;
  maxHolders?: number | null;        // >= 1; omit for unlimited
  sortOrder: number;                 // >= 0
  hostOnly?: boolean;                // omit for false: anyone may pick it
}
interface MemberRoleCatalogPatchDto { // null / omitted fields are left unchanged
  label?: { en: string; el: string };
  sectionLabel?: { en: string; el: string }; // 2026-10-06: replaces the whole map when sent; same rules as label
  clearSectionLabel?: boolean;      // true removes the section title; wins over sectionLabel
  emoji?: string;                   // "" clears it
  maxHolders?: number;              // >= 1
  clearMaxHolders?: boolean;        // true makes the role unlimited
  sortOrder?: number;               // >= 0
  hostOnly?: boolean;               // flipping it leaves current holders alone
}
```

Validation (400 `3001` `VALIDATION_FAILED` with a message; 409 for a duplicate):

- **`label` must have exactly the keys `en` and `el`**, nothing missing and nothing extra. Each is
  1 to **40** characters **after trimming** (the server normalizes whitespace first).
- **`sectionLabel`** (2026-10-06, the wishbook book's section heading for this role) follows the
  same rule as `label` when it is sent: exactly `en` and `el`, each 1 to 40 characters. It is
  optional on create and on `PATCH`; `clearSectionLabel: true` removes it. Roles with equal section
  titles share one section in the book (`wishbook-book-fe-integration.md` §8).
- **`emoji` is at most 16 characters** after trimming. On `PATCH`, an **empty string clears** it
  (on create, omit it or send null).
- **`clearMaxHolders: true` wins over `maxHolders`** when both are sent. To change a cap, send
  `maxHolders`; to remove it, send `clearMaxHolders: true`.
- Lowering `maxHolders` below the current number of holders is allowed: existing holders keep the
  role, new picks get 5114 until the count drops under the cap.
- `roleKey` and `eventTypeKey` cannot be changed. Creating a `roleKey` that already exists for that
  event type is a 409.
- **Roles are never deleted, only retired.** A retired role cannot be newly picked (3041) but its
  holders keep it and still render (the role stays in `/api/config`, flagged). `unretire` brings
  it back. There is no `DELETE`.
- `PATCH`, `retire` and `unretire` on an unknown id are 404.

Whether an event type allows custom text (`allowCustom`) is **not** here: it is the `member_roles`
module config of the event type's plan, edited through the existing plan-tier module config
endpoints (a non-boolean value is rejected).

## 10. Admin: blocklist additions

`/api/admin/blocked-terms` (ADMIN only). Adds to the vendored English and Greek lists; those
cannot be viewed or removed here.

| Method | Path | Body | Result |
|---|---|---|---|
| `GET` | `/api/admin/blocked-terms` | | `BlockedTermDto[]` |
| `POST` | `/api/admin/blocked-terms` | `{ term: string }` | 201 `BlockedTermDto` |
| `DELETE` | `/api/admin/blocked-terms/{id}` | | 204 |

```ts
interface BlockedTermDto { id: string; term: string; createdAt: string }
interface BlockedTermRequestDto { term: string } // max 60
```

`POST` is a 400 for a blank term, a term that starts with `#`, or one with no letter or digit, and
a 409 when the term is already blocked (compared after folding case, accents, final sigma and
look-alikes; repeated letters are not folded, so `fuck` and `fuuck` are separate terms). There is no locale field. Every term applies to every
language. A term with several words matches those words in sequence. An edit takes effect within
about a minute on every instance.

## 11. FE checklist

- Remove `relationshipRole` / `customRelationshipRole` from member create and edit forms and types.
- Add the picker: `GET member-roles`, show `roles` (disable `!available`), show "Other" only when
  `allowCustom`, and as read-only help text when `customLocked`.
- Render `AuthorDto.roleKey` / `customRole` on posts, comments and stories, resolving from
  `/api/config` by `roleKey` and locale. Plain text only.
- Update local state yourself after `PUT` / `DELETE` (204, no body).
- Handle 3040, 3041, 3042, 4016, 4017, 4018, 5113, 5114, 5012, 5014 per §4.
- Offer "Report" on custom role text to every member, and "Unlock custom role" to hosts.
- Moderation center: show `content.text` for `MEMBER` cases and handle 5115.
- Admin: catalog and blocklist screens (§9, §10), with a "Host only" toggle on each role.
