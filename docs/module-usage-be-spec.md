# BE spec: admin module usage metrics

Shipped 2026-10-11 in both repos (`ModuleUsageService`, `ModuleUsageRepository` on the backend).
The admin console's **Overview → Module usage** tab (`#module-usage`) reads it.

Goal: see, anonymously, how much each event module is used, so we can spot modules that are on
but ignored. **Aggregates only**: no event ids, titles, user ids, names or content in the
response.

## Endpoint

`GET /api/admin/metrics/module-usage` (platform admin only, same guard as `/api/admin/metrics/funnel`).

| Query param    | Type                    | Meaning                                                                             |
| -------------- | ----------------------- | ----------------------------------------------------------------------------------- |
| `since`        | ISO-8601 with offset    | Optional. Events with `createdAt >= since`.                                         |
| `until`        | ISO-8601 with offset    | Optional, exclusive. Events with `createdAt < until`.                               |
| `eventTypeKey` | string                  | Optional. Only events of this type.                                                 |
| `planCode`     | string                  | Optional. Only events whose current plan tier has this code (archived plans count). |

`since`/`until` work exactly like the funnel endpoint (the admin's local midnights, `until`
exclusive). `until` before `since` → the same 400 `DATE_RANGE_INVALID` the funnel returns. A filter
that isn't 1–64 characters of `A-Z a-z 0-9 _ -` → 400 `VALIDATION_FAILED`.

## Which events count ("events in scope")

- `status = ACTIVE` (no drafts), not a demo event, not deleted.
- Created in `[since, until)` and matching `eventTypeKey` / `planCode` when given.
- All of an event's activity counts, from creation to now. The range picks **events**, not
  activity dates.

## Small-group suppression (must happen server-side)

`minEvents = 5`. Hiding it only in the UI would still leak through the API.

- If fewer than `minEvents` events are in scope: `eventsInScope = null` and every row is
  `suppressed: true`.
- Per module: if fewer than `minEvents` events in scope have the module on, that row is
  `suppressed: true` with `eventsWithModule`, `eventsUsed` = `null` and `metrics = []`.

## Response

```ts
type ModuleUsageModuleKey = 'posts' | 'gallery' | 'stories' | 'rsvp' | 'playlist' | 'schedule' | 'wishbook' | 'wishlist' | 'qr_links';
type ModuleUsageMetricKind = 'PER_EVENT' | 'PER_POST' | 'SHARE';

interface ModuleUsageResponseDto {
    minEvents: number; // 5
    eventsInScope: number | null; // null when < minEvents
    modules: ModuleUsageRowDto[]; // one per module key below, any order
}

interface ModuleUsageRowDto {
    moduleKey: ModuleUsageModuleKey;
    suppressed: boolean;
    eventsWithModule: number | null; // events in scope with the module on
    eventsUsed: number | null; // of those, events that used it (see table)
    metrics: ModuleUsageMetricDto[];
}

interface ModuleUsageMetricDto {
    key: string; // see table
    kind: ModuleUsageMetricKind;
    average: number | null; // PER_EVENT / PER_POST only, else null
    median: number | null; // PER_EVENT / PER_POST only, else null
    share: number | null; // SHARE only, 0–1, else null
}
```

Full TS types: `lib/api/types.ts` (`ModuleUsage*`).

## Number rules

- **"Module on"** = what `ModuleAvailabilityService` gates on, minus the suspension check: the
  platform has the module enabled, the event paid for it (plan, unlock add-on or admin grant) and
  the host has it switched on. `qr_links` is not a module: its base is every event in scope.
- **PER_EVENT**: one value per event with the module on, **including events with 0 items**.
  `average` = mean, `median` = median of those values. `null` when the base is empty.
- **PER_POST**: one value per post (in events with `posts` on). `average` = total / posts,
  `median` = median per post. `null` when there are no posts.
- **SHARE**: a 0–1 ratio as described per metric. `null` when the denominator is 0.
- Count only items that exist now (exclude soft-deleted / moderated-away items).
- Count host and guest items alike.

## Modules and metrics

| moduleKey  | `eventsUsed` means                | metrics (key · kind · definition)                                                                                                                                                                                                                                                                            |
| ---------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `posts`    | ≥1 post                           | `posts` · PER_EVENT · posts per event<br>`comments` · PER_EVENT · comments per event<br>`reactions` · PER_EVENT · reactions per event<br>`commentsPerPost` · PER_POST<br>`reactionsPerPost` · PER_POST<br>`eventsWithComments` · SHARE · events with ≥1 comment / events with module on<br>`eventsWithReactions` · SHARE · same for reactions |
| `gallery`  | ≥1 media item                     | `media` · PER_EVENT · media per event<br>`photoShare` · SHARE · images / all media<br>`videoShare` · SHARE · videos / all media<br>`qrUploadShare` · SHARE · media uploaded through a QR link (anonymous upload) / all media                                                                                     |
| `stories`  | ≥1 story                          | `stories` · PER_EVENT                                                                                                                                                                                                                                                                                        |
| `wishbook` | ≥1 wish                           | `wishes` · PER_EVENT                                                                                                                                                                                                                                                                                         |
| `rsvp`     | ≥1 RSVP response                  | `responses` · PER_EVENT                                                                                                                                                                                                                                                                                      |
| `playlist` | ≥1 song suggestion                | `suggestions` · PER_EVENT<br>`votes` · PER_EVENT                                                                                                                                                                                                                                                             |
| `schedule` | ≥1 session the host added         | `sessions` · PER_EVENT (the seeded main session is not counted)                                                                                                                                                                                                                                                                                       |
| `wishlist` | bank details saved                | none                                                                                                                                                                                                                                                                                                         |
| `qr_links` | ≥1 QR link created (any status)   | `qrJoins` · PER_EVENT · joins through a QR link per event<br>`qrUploads` · PER_EVENT · uploads through a QR link per event                                                                                                                                                                                   |

QR resolves still record nothing (by design), so there are no scan counts. A **QR join** is a live
member who joined through a QR link's invitation. A **QR upload** is a live media item with no
uploader member (an anonymous upload through a QR media link) or uploaded by a QR-joined member.
`qrUploadShare` uses the same definition.

The FE ignores module and metric keys it doesn't know, so new ones (e.g. the quiz module) can
ship on the BE first; the FE adds labels when it is ready.

## Example

```json
{
    "minEvents": 5,
    "eventsInScope": 140,
    "modules": [
        {
            "moduleKey": "posts",
            "suppressed": false,
            "eventsWithModule": 120,
            "eventsUsed": 90,
            "metrics": [
                { "key": "posts", "kind": "PER_EVENT", "average": 12.3, "median": 8, "share": null },
                { "key": "commentsPerPost", "kind": "PER_POST", "average": 1.5, "median": 1, "share": null },
                { "key": "eventsWithComments", "kind": "SHARE", "average": null, "median": null, "share": 0.42 }
            ]
        },
        { "moduleKey": "schedule", "suppressed": true, "eventsWithModule": null, "eventsUsed": null, "metrics": [] }
    ]
}
```
