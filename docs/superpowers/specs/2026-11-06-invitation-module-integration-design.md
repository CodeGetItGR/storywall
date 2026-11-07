# Invitations and Storywall modules

How a Save my date invitation connects to Storywall's RSVP, Schedule, places and Gallery: fully integrated when a host has both, fully functional when either is sold on its own.

## The rule

The invitation always holds its own content. Links to Storywall modules are added on top. A section never depends on a module to draw itself: if a module is off, or switches off later, the section shows its saved content.

| The host bought | RSVP | Schedule and places | Gallery |
| --- | --- | --- | --- |
| Invitation only | Works; replies show in Manage → RSVP | Typed in the invitation | Own uploads |
| Storywall only | As today | As today | As today |
| Both | Same replies, one list | Linked to the event, or typed | Own uploads plus photos the host picks from the event |

The invitation-only plan (KAN-82) contains the `save_my_date` and `rsvp` modules, so RSVP needs no new permission rule.

## Linked sections

A linked section keeps its saved content and adds an optional `link` field, so the change to the invitation format only adds a field:

```ts
link?: { source: 'event'; enabled: boolean }
```

- **Sections that can link:** `program`, `programIcons`, `locations`, `gallery`.
- **Editing:** the host turns the link on or off per section. It is on by default when an invitation starts from an event whose plan has the module.
- **Saved copy:** linking or publishing copies the event's current data into the section, so the fallback is never empty or out of date by more than one publish.
- **Live updates:** a published invitation otherwise stays a snapshot (KAN-48). Linked sections are the one exception: event data is applied when the page is read, so a schedule change shows without republishing.
- **Fallback:** the saved copy is shown when the link is off, the module is off, or the event data can't be read.

### Where linking happens

`resolveLinkedSections(document, eventData)` in `lib/invitation/` returns a plain invitation document with the event's data filled in. It runs on the server before `InvitationRenderer`.

The renderer and section components never know about links. This is why the KAN-57 and KAN-58 sections can be built before any of this exists. The public read endpoint (KAN-48) returns `eventData` beside the snapshot, containing only what linked sections need and only for modules that are on.

### Field mapping

Sessions are read in `displayOrder`, without deleted ones.

| Section | Field | Event data |
| --- | --- | --- |
| `program`, `programIcons` | `time` | Session `startAt`, in the event's time zone |
| | `label` | Session `title` |
| `programIcons` | `description` | Session `description` |
| | `icon` | The host's own choice is kept; a new session uses `auto` |
| `locations` | `ceremony`, `ceremonyMap` | Main session (`isMain`): `locationName`, `mapsUrl` |
| | `reception`, `receptionMap` | Secondary session (`isSecondary`): `locationName`, `mapsUrl` |
| | `ceremonyAddress`, `receptionAddress`, `welcome*`, `note` | Not linked: the event has no per-session address, so these stay the host's own |

Each section keeps its title, subtitle and styles. If the event has no main session, `locations` uses `EventLocationDto` (`name`, `address`, `mapsUrl`) for the ceremony, including its address. `isSecondary` is a display convention per event type, so `locations` links only for event types where it means the reception; for others the reception stays typed.

### Gallery

- A linked gallery shows only photos the host picks from the event. Guest uploads never appear automatically, because an invitation is a public link.
- The section stores media ids, up to its existing limit of 10 photos, and may mix them with the host's own uploads.
- A photo deleted from the event, or removed by moderation, disappears from the invitation.
- Event photos are served through the same media access as the rest of the public invitation, and the public read endpoint returns only the picked ids.

## RSVP

Storywall owns the RSVP. There is no separate table.

### The form

- The invitation keeps its own themed form, built in KAN-57. It is not `components/rsvp/`, which needs a signed-in guest and uses the app's look.
- It sends through a function passed in. Until KAN-50 connects it, the staging preview shows the success state and nothing is saved.
- Adults go up to 5 and children up to 4 (`RsvpLimits`). The old form's limit of 10 is not kept.
- Fixed text follows the invitation's language. The Greek is unchanged and the English was approved on 2026-11-06.
- A one-line privacy notice with a link sits under the submit button, with no checkbox. **Its wording needs the owner's approval before it is added.**

### Public route (KAN-50)

`POST /api/public/invitations/{slug}/rsvp`, in a new controller and service method.

1. Finds the published, unexpired invitation by slug, then its event. Unknown or expired answers 404.
2. Checks the RSVP module is available and the event's RSVP deadline hasn't passed.
3. Creates a reply-only guest member with the name, and an `Rsvp` with attendance, phone, email, counts and notes.
4. Is rate limited per address, with a hidden honeypot field, in line with the existing anonymous routes.

Current RSVP routes, `RsvpService.create` and `RsvpService.patch` are not changed.

### Data changes

Both only add to the database:

- `rsvp.email`: optional, filled only by invitation replies, shown to hosts in Manage → RSVP.
- A marker on `event_member` for reply-only guests.

### Reply-only guests

- They show in Manage → RSVP and the reports, and their replies count in the totals.
- They don't count towards the plan's guest limit, can't sign in, and stay out of member lists.
- Replies are never refused because a plan is full.

### Duplicates

- The public form never changes an existing reply. Nobody is signed in there, because KAN-85 keeps session cookies off the invitation host.
- A reply using a phone number already used on that event is saved and marked as a possible duplicate in Manage → RSVP. The signed-in host keeps or removes it. **The mark's wording needs the owner's approval before it is added.**
- The public route's answer is the same either way, so it doesn't reveal whether a phone number has already replied.
- A guest with an account still edits their own reply in the app, as today.

### Tests

- Current RSVP: the existing `RsvpService` and controller tests pass unchanged, plus a test that a signed-in create and patch behave the same with reply-only guests on the event.
- Public route: saved reply, unknown slug, expired invitation, module off, deadline passed, limits above 5 and 4, phone and email validation, rate limit, honeypot.
- Reply-only guests: in the RSVP list, reports and export; not in member lists; not counted by the guest limit.
- Duplicates: same phone is saved and marked, the existing reply is untouched, and the answer is identical.
- Frontend: `resolveLinkedSections` for each section, link off, module off, and missing event data.

## Build order

1. **KAN-57, KAN-58, KAN-59:** sections and effects, with no knowledge of links. The form sends through a function passed in.
2. **KAN-46, KAN-48:** drafts and publishing.
3. **KAN-50:** the public RSVP route, connected to the form. It needs a published invitation to attach a reply to, so it can't come sooner.
4. **KAN-84:** linked sections, the format's `link` field, and the event data in the public read endpoint.

## Ticket changes

- **KAN-57:** move "an RSVP sent from a published invitation lands in the event" to KAN-50. Add that the form shows its sending, success and error states.
- **KAN-50:** add the route, data changes, reply-only guests, duplicates, privacy notice and tests above.
- **KAN-82:** state that the invitation-only plan contains `save_my_date` and `rsvp`.
- **KAN-84:** replace "prefill" with linked sections as described here, and add the gallery picker.
- **KAN-66:** add the per-section link control to the settings panels.
- **Format spec:** add the `link` field when KAN-84 is built, and re-export the JSON Schema for the backend.

## Not included

- Linking the date, couple names, theme or cover to the event. Only RSVP, Schedule, places and Gallery were asked for; KAN-84's prefill can still cover the date.
- Per-session RSVP questions on the invitation form. The old form has none, and `RsvpSessionRespons` rows stay app-only.
- Two-way editing: changing the schedule from inside the invitation editor. Hosts edit it in the Schedule tool.
