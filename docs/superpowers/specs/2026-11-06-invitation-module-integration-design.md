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

- **Sections that can link:** `program`, `programIcons`, `locations`, and, since 2026-11-12, `top`, `coupleNames`, `baby`, `date`, `rsvp` and `photo` (see [Following the event](#following-the-event-2026-11-12)). A `photoFrame` element can carry the same field for the cover photo. The gallery has no `link`: it holds event photos as image references instead (see [Gallery](#gallery)).
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
- **Format (2026-11-12):** an event photo is a new image reference, `{ source: 'event', mediaId }`, beside `media` and `theme`. Only the gallery and the cover use it. The backend accepts it only for a photo of the draft's own event that isn't deleted.
- **Picking (owner, 2026-11-12):** no switch. When the event's plan has the gallery, the gallery's add-photo step offers "From the event", a sheet of the event's photos. Picked photos stay live: one deleted or removed by moderation on the event is left out of the page's image links, and the gallery skips it.

## Following the event (2026-11-12)

The owner's decisions on 2026-11-12, which replace "the date, couple names, theme and cover are not linked": the hosts should not type twice. What the event already knows fills the invitation and stays in sync.

### What follows the event

| Invitation | Event | Rule |
| --- | --- | --- |
| Names in `top` | `title` | Two `title` texts: the title split on "&" (exactly two non-empty parts) goes into them, the "&" text stays. One `title` text: the whole title. Anything else, or a title that doesn't split: not changed. |
| `coupleNames` | `title` | The same split into `partnerAName` and `partnerBName`. |
| `baby.babyName` | `title` | The whole title. |
| `date` | `schedule.startAt` in the event's time zone | Sets `iso`. When it changes, the date's words are written again in the date's language (`applyDateLanguage`). |
| `rsvp.deadline` | `schedule.rsvpDeadline` in the event's time zone | "Απαντήστε έως {date}" / "Please reply by {date}" in the invitation's language (approved 2026-11-12), e.g. "Απαντήστε έως 5 Ιουλίου", "Please reply by July 5". No reply-by date: the invitation's own line. Only while the RSVP module is on. |
| Cover | `coverMediaId` | The first `photoFrame` in `top`; if the top has none, the first `photo` section. No cover on the event: the invitation keeps its own photo. |
| `program`, `programIcons`, `locations` | Sessions and the event's place | As in [Field mapping](#field-mapping). Program items take the session's id, so their text styles follow them. No sessions: not changed. |

Each section keeps its title, subtitle and styles. The theme is never linked.

### The sync rule

- **By default every field follows the event.** When the editor opens a draft that is on an event, every section above with no `link` yet gets `link: { source: 'event', enabled: true }`, as long as the event can feed it (the schedule module for `program` and `programIcons`, RSVP for the deadline). Sections the host adds later are linked the same way.
- **Editing on the invitation takes the field over.** An edit that changes a followed field sets that section's (or the cover frame's) `enabled` to `false` in the same undo step. Other fields of the section keep following: editing the RSVP title doesn't stop the deadline following. The names and the cover in `top` are separate: the names use the section's `link`, the cover the frame's own.
- **Editing on the invitation never changes the event.** Nothing in the editor writes to the event.
- **Following again (owner, 2026-11-12):** a "Follow the event" switch in the settings of `top`, `date`, `rsvp`, `program`, `programIcons`, `locations`, `coupleNames`, `baby` and `photo`. Turning it on replaces the invitation's copy with the event's, as one undo step. In `top` it covers both the names and the cover.
- **Telling the host:** while the switch is on, its caption says, and the text toolbar repeats it while a followed text is being edited (approved 2026-11-12): en "Comes from your event. If you edit it here, it stops following the event. Your event doesn't change." / el "Έρχεται από την εκδήλωσή σας. Αν το αλλάξετε εδώ, δεν θα ακολουθεί πια την εκδήλωση. Η εκδήλωσή σας δεν αλλάζει." Switch label: en "Follow the event" / el "Ακολουθεί την εκδήλωση".

### How it runs

- **One function, two places.** `resolveLinkedSections(document, eventData)` in `lib/invitation/eventLinks.ts` returns the document with the event's data written into every followed field, and changes nothing else.
  - The **editor** reads the event (`GET /api/events/{id}`, prefetched on the server with the draft) and applies it to the draft as a change outside the undo history, so the saved copy stays current. Edits are compared before and after: a followed field that changed is taken over.
  - The **public page** applies it on the server, before `InvitationRenderer`, to the published copy and the `event` the read endpoint returns. A schedule or date change on the event shows without republishing.
- **Event data** (`InvitationEventData`), the same shape from both sources: `title`, `timezone`, `startAt`, `rsvpDeadline` (null unless RSVP is on), `coverMediaId`, `joinUrl` (null unless the wall is on and the guest link active), `location` (`name`, `address`, `mapsUrl`), and `sessions` (null unless the schedule is on; each with `id`, `title`, `description`, `startAt`, `locationName`, `mapsUrl`, `isMain`, `isSecondary`, in display order, without deleted ones).
- **Public read endpoint:** `GET /api/public/invitations/{slug}` adds `event` (the data above) and puts the URL of the event's cover and of every live picked event photo into `imageUrls`. Nothing else of the event: no ids but the sessions' and the cover's, no members, no counts.
- **Fallback:** with no `event` in the answer, the page shows the published copy as it is.

### Join the event (owner, 2026-11-12)

- When the event's plan has the wall (`posts`) and the event's general guest link (its automatic `EVENT_JOIN` QR link) is active, the RSVP section shows a "Join the event" / "Συμμετοχή στην εκδήλωση" button under the form and in its thank-you state. It opens that link, which starts the guest invite flow.
- No RSVP section on the invitation: no button. The host can't hide it.
- The public read endpoint returns the link as `joinUrl` inside `event`, null otherwise. The editor and preview show the button when the event would.

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
- Following the event (2026-11-12): each row of the table above; an edit taking over only its own field; the switch following again; the public page showing an event change without republishing; an event photo deleted on the event left out; the backend refusing an event photo from another event.

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

- Linking the theme to the event. (The date, names, cover and RSVP deadline follow the event since 2026-11-12; see [Following the event](#following-the-event-2026-11-12).)
- Per-session RSVP questions on the invitation form. The old form has none, and `RsvpSessionRespons` rows stay app-only.
- Two-way editing: changing the schedule from inside the invitation editor. Hosts edit it in the Schedule tool.
