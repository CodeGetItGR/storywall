# Graduation event type — design

Date: 2026-11-26
Status: draft, awaiting the owner's review
Repos: backend (`event_social_media`, guestwall-be), frontend (`storywall`)

## 1. Summary

Add a `GRADUATION` event type for university graduation parties: one graduate, or several friends who
graduate at the same time and celebrate together. It comes with three Graduation-only features:

- a **Graduates** feed block (photo, name, degree and university per graduate);
- a **then & now** photo prompt pre-filled on new Graduation events;
- a **graduation photo frame** guests can add to the photos they upload.

A print shop partner promotes the type. Printing is not part of this spec; it is split into separate
pieces with their own specs (§12).

### The three pieces, in build order

1. **This spec:** the Graduation type and its three features.
2. **Banner and sticker designer:** hosts design banners and stickers from their own photos and text,
   and download a print-ready PDF any print shop can print. Own spec.
3. **Print shops in the app:** a new Printing vendor role, so shops can be listed and shown as places
   to print. Own spec.

## 2. Registering the type (backend)

Follows the REUNION type (spec `2026-10-06-reunion-event-type-design.md` in the backend repo).

- `EventTypeKey.GRADUATION("GRADUATION")`.
- Migration `V237__graduation_event_type.sql` (the next free number on 2026-11-26; confirm it is
  still free before merging):
  1. Both CHECKs that list the event types (`events_event_type_check`,
     `theme_preset_event_types_event_type_check`) gain `GRADUATION`.
  2. A `platform_event_types` row, **disabled**, sorted last.
  3. The module matrix (§3).
  4. The four standard reactions (Like, Love, Laugh, Celebrate), as for REUNION.
  5. The member roles (§4.2).
  6. The `events.upload_frame` column (§7.1).
- Java catalogs, kept in line with the migration by the existing seed tests:
  `EventTypeModuleDefaults`, `EventTypeMemberRoleDefaults`, `ReactionTypeCatalogDefaults`,
  `EventTypeVoicePackDefaults`.
- `invitation-document.schema.json` gains the `graduates` section (§5).

### Rollout

The type is registered disabled. An admin duplicates the **BIRTHDAY** plans into GRADUATION (they
already include wishbook and Save my date), checks the copies, then enables the type. Enabling it
with no plans makes every create fail `PLAN_TIER_NOT_AVAILABLE_FOR_EVENT_TYPE`, as for REUNION.

`gallery.memberArchiveAfterEnd` is already a type-owned key (`TYPE_OWNED_KEYS`), so the duplicated
plans take it from GRADUATION's matrix row (on), not from BIRTHDAY's (off).

## 3. Modules

| Module | GRADUATION |
|---|---|
| posts, rsvp, playlist, stories, co_hosts, schedule, vendors, qr_cards | on |
| gallery | on; `qrUploadEnabled: true`, `memberArchiveAfterEnd: true` |
| member_roles | on; `allowCustom: true` |
| wishbook | on |
| save_my_date | on (the Graduates block and other feed blocks need it) |
| wishlist (gift registry) | unsupported |
| theme | unsupported |
| he_or_she | unsupported |
| quiz_polls | unsupported |

In `EventTypeModuleDefaults`: GRADUATION joins `SAVE_MY_DATE_EVENT_TYPES` and `MEMBER_ARCHIVE_TYPES`,
and `UNSUPPORTED_MODULES_BY_TYPE` gets `GRADUATION → {WISHLIST}`. Theme, he_or_she and quiz_polls are
already off for any type not in their sets.

Several graduates celebrating together use co-hosts: each graduate can be a host and pick the
Graduate role.

## 4. Copy owned by the backend

All wording below was approved by the owner on 2026-11-26.

### 4.1 Voice pack (`EventTypeVoicePackDefaults`)

| Field | English | Greek |
|---|---|---|
| name | Graduation | Αποφοίτηση |
| tagline | Celebrate the graduate with everyone who helped | Γιορτάστε την αποφοίτηση με όλους όσους βοήθησαν |
| emoji | 🎓 | |
| colour | sky | |
| titlePlaceholder | e.g. Maria's Graduation | π.χ. Η αποφοίτηση της Μαρίας |
| locationPlaceholder | e.g. Aristotle University, Thessaloniki | π.χ. Αριστοτέλειο Πανεπιστήμιο, Θεσσαλονίκη |
| joinSubtitle | Sign in to join the celebration. | Συνδεθείτε για να μπείτε στη γιορτή. |
| joinDisclaimer | By joining you agree to share moments from this celebration. After it ends, every member can download the whole gallery. | Μπαίνοντας, συμφωνείτε να μοιραστείτε στιγμές από τη γιορτή. Μετά το τέλος της, κάθε μέλος μπορεί να κατεβάσει ολόκληρη τη συλλογή. |
| inviteHeadline | You're invited to the graduation | Είστε καλεσμένοι στην αποφοίτηση |
| rsvpMessageLabel | Message for the graduate | Μήνυμα για τον απόφοιτο |
| rsvpAttendingConfirmation | Yes! You'll get updates as the day gets closer. | Ωραία! Θα λαμβάνετε ενημερώσεις όσο πλησιάζει η μέρα. |
| toolsSubtitle | Everything you need to enjoy the celebration | Ό,τι χρειάζεστε για να απολαύσετε τη γιορτή |

The disclaimer mentions the gallery download because every member can download the gallery after a
Graduation event (§3), as REUNION's does.

### 4.2 Member roles (`EventTypeMemberRoleDefaults`, sort order = list index)

| Key | Emoji | English | Greek |
|---|---|---|---|
| GRADUATE | 🎓 | Graduate | Απόφοιτος / Απόφοιτη |
| FAMILY | 🏡 | Family | Οικογένεια |
| FRIEND | 🥂 | Friend | Φίλος / Φίλη |
| FELLOW_STUDENT | 📚 | Fellow student | Συμφοιτητής / Συμφοιτήτρια |
| PROFESSOR | 🍎 | Professor | Καθηγητής / Καθηγήτρια |

No holder limit and none host-only, so several graduates can each hold GRADUATE.

## 5. The Graduates feed block

A new Save my date section type, `graduates`, offered in the feed's Add section list for GRADUATION.
It is a paid block like `coupleProfiles`: it needs the `save_my_date` module.

### 5.1 Data

```ts
graduates: z.object({
    title: text,
    graduates: z.array(graduateSchema).min(1).max(10),
    desktopColumns: columns,
}).strict()

const graduateSchema = z.object({
    id: idSchema,
    name: text,
    degree: text,      // e.g. "Πτυχίο Νομικής"
    university: text,  // e.g. "ΑΠΘ"
    photo: imageRefSchema.optional(),
}).strict();
```

- `lib/invitation/sections.ts`: the schema. One Graduates block per event: it does not join
  `MULTI_INSTANCE_SECTION_TYPES`.
- `lib/invitation/newSection.ts`: a new block starts with one empty graduate.
- `lib/invitation/photoSlots.ts`: one photo slot per graduate (`graduates.{id}.photo`).
- `lib/invitation/samples.ts` and `lib/saveMyDatePreview.ts`: a sample with two graduates.
- `lib/feedLayout.ts`: `graduates` joins `PAID_FEED_SECTION_TYPES`.
- `lib/feedAddList.ts`: a GRADUATION list: `invitation`, `graduates`, `gallery`, `program`, `faq`,
  `accommodation`, `contact`.
- `lib/invitation/sectionRules.ts`: a GRADUATION entry: the BIRTHDAY default and optional lists, plus
  `graduates` as optional.
- Backend `invitation-document.schema.json`: the same shape, so saved layouts validate.

### 5.2 Look and editing

The block reuses `PhotoPeopleSection` and `FamilyPhoto` (the godparents and sponsors blocks): a grid of round photos, each with
the name, then degree and university in smaller text under it. On mobile, one or two per row; on
desktop, `desktopColumns`. Editing follows the sponsors block: the host adds, removes and reorders
graduates in the block's sheet, one graduate's fields at a time.

## 6. Then & now prompt

New GRADUATION events start with the existing `feedPrompt` block filled in:

- EN: "Then & now: post an old photo with the graduate"
- EL: "Τότε και τώρα: μια παλιά σας φωτογραφία μαζί"

Both are under `FEED_PROMPT_MAX_LENGTH` (80). The host can edit or hide it like any prompt.

`defaultFeedLayout()` takes the event type: `defaultFeedLayout(eventType?: string)`. For GRADUATION
the `feedPrompt` block starts visible with the text in the event's language; every other type is
unchanged. Every caller that knows the event passes its type; the rest keep today's layout.

## 7. Graduation photo frame

When a guest uploads photos to the gallery, they can turn on **Add frame**. The frame is drawn onto
each photo in the browser before it is uploaded, so the photo looks the same everywhere it appears,
downloads included. Videos are never framed.

### 7.1 The host's choice (backend)

- New column `events.upload_frame VARCHAR(20) NULL` with a CHECK listing the designs. Null means no
  frame is offered.
- Java enum `UploadFrame { CLASSIC, LAUREL, CONFETTI }`.
- On create, a GRADUATION event gets `CLASSIC`; every other type gets null.
- The host changes it through the existing event update (`EventRequestDto.uploadFrame`). Only hosts
  can change it; any value outside the enum is a 400.
- It is returned on the event response and on the public event data the QR upload page reads, so
  signed-out QR uploaders see the switch too.
- Any type may hold a frame, but the host setting is only shown for GRADUATION (§7.3). Other types
  can get it later without a migration.

Hosts cannot change module settings today (those come from the plan), so the choice is an event field
rather than a `gallery` module key.

### 7.2 The designs (frontend)

Three built-in designs, each an SVG drawn over the photo: a graduation cap, the **event title** and
the **event's start date**, formatted in the uploader's app language. No other fixed words. Each design adapts to portrait and
landscape photos and keeps the photo's own aspect ratio.

- `lib/uploadFrame.ts`: the designs and how each lays out on a given photo size.
- Drawing happens in the same canvas pass as `shrinkImageForUpload` (`lib/uploadImageResize.ts`),
  which already shrinks every photo to the server's 2560 px long edge, so large phone photos never
  hit the browser's canvas limits. A photo that can't be drawn (an unsupported type, a canvas error)
  is uploaded without the frame, and the guest is told once.

### 7.3 Where it shows

- **Guests:** an **Add frame** switch with a small preview of the frame, shown above the upload
  button when the event has a frame. It is off by default and remembered for the rest of the visit.
  It appears at every gallery upload entry point: the gallery screen (`useGalleryScreen`), the feed
  Gallery block (`useFeedGalleryUpload`) and the signed-out QR upload form
  (`AnonymousQrMediaUploadForm`).
- **Hosts:** a **Photo frame** row in the host's gallery tool page, opening a sheet with the three
  designs previewed on a sample photo plus **No frame**. GRADUATION only.

## 8. Frontend type wiring

- `lib/api/types.ts`: `GRADUATION` in `EventTypeConvention`; `uploadFrame` on the event types.
- `lib/createEventCatalog.ts`: the create-event card image (§11, open item 1).
- `lib/createEventFeatures.ts`: GRADUATION → `gallery`, `wishbook`, `rsvp`, `stories`, `co_hosts`,
  `schedule`, `posts`.
- `lib/occasions/occasions.ts`: `{ eventType: 'GRADUATION', slugs: { en: 'graduations', el: 'apofoitisi' }, ready: false, launched: false }`.
  The occasion page needs its own copy and SEO review later; until then it does not render.
- Storybook fixtures: a GRADUATION type in `.storybook/fixtures.ts` for the new stories.

## 9. Frontend copy still to approve

Proposed wording for the new screens. Nothing here ships without the owner's yes.

| Where | English | Greek |
|---|---|---|
| Add section list, block name | Graduates | Απόφοιτοι |
| Block's default title | Our graduates | Οι απόφοιτοί μας |
| Field label | Name | Όνομα |
| Field label | Degree | Πτυχίο |
| Field label | University | Πανεπιστήμιο |
| Button | Add graduate | Προσθήκη αποφοίτου |
| Button | Remove graduate | Αφαίρεση αποφοίτου |
| Guest switch | Add frame | Προσθήκη κορνίζας |
| Frame preview alt | Graduation frame preview | Προεπισκόπηση κορνίζας αποφοίτησης |
| Notice when a photo can't be framed | Some photos were uploaded without the frame. | Κάποιες φωτογραφίες ανέβηκαν χωρίς κορνίζα. |
| Host row | Photo frame | Κορνίζα φωτογραφιών |
| Host option | No frame | Χωρίς κορνίζα |
| Design names | Classic · Laurel · Confetti | Κλασική · Δάφνη · Κομφετί |
| Create-event card image alt | depends on the photo chosen (§11) | |

A graduate's photo uses the graduate's name as its alt text, with the shared `photoAlt` fallback, as
`FamilyPhoto` does for godparents and sponsors. No new alt copy.

## 10. Testing

- **Backend:** the seed tests that compare the migration with the Java catalogs; create sets
  `upload_frame = CLASSIC` for GRADUATION and null otherwise; host update accepts each design and
  null, rejects other values and non-hosts; the schema accepts a valid `graduates` section and rejects
  more than 10 graduates.
- **Frontend unit:** `defaultFeedLayout('GRADUATION')` pre-fills the prompt; `feedAddList` for
  GRADUATION; `sectionsForEventType('GRADUATION')`; the `graduates` schema; frame layout for portrait
  and landscape sizes; the frame failure path uploads the plain photo.
- **Component:** the Graduates block (view and edit sheet), the Add frame switch at each entry point,
  the host's frame sheet.
- **Storybook:** stories for the Graduates block (one, two and six graduates; mobile and desktop),
  each frame design on a portrait and a landscape photo, and the host frame sheet. They feed the
  `visual-regression` check.
- **Staging:** create a Graduation event after the admin duplicates the plans and enables the type,
  on mobile and desktop: the then & now prompt is there, add a Graduates block with two graduates,
  upload a framed photo as a guest and through the QR form, change the frame as host, download the
  gallery as a non-host member after the event ends.

## 11. Open items

1. **Create-event card photo.** There is no graduation photo in `public/landing`. The owner supplies
   one (or approves a licensed stock photo); its alt text goes through §9.
2. **"Μήνυμα για τον απόφοιτο"** (approved) is masculine. If most hosts turn out to be female or
   several graduates, a neutral form can replace it later.
3. **Jira:** a KAN epic with one ticket per part (backend type, Graduates block, then & now prompt,
   photo frame) before implementation starts.

## 12. Out of scope

- The banner and sticker designer and the print shop listing (pieces 2 and 3, §1).
- The Graduation occasion landing page and its copy.
- Invitation themes made for Graduation (Save my date works on the event's own look until then).
- Quiz & polls, the gift registry and event themes for Graduation.
- Framing photos attached to posts, and framing videos.
