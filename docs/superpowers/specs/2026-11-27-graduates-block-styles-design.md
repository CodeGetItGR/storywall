# Graduates block styles (KAN-302)

Owner decisions of 2026-11-27, made from realistic renders of seven candidate looks. This extends the
Graduates block of [the graduation design](2026-11-26-graduation-event-type-design.md) §5 and ships in the
same pull request (#444), before anything is released.

## Goal

The Graduates block should look like a graduation, not like the wedding sponsors block it was copied from.
Hosts choose one of five styles for the whole block. Each style is its own small component with its own
stories, shown with graduation photos, never the wedding samples.

## Where it lives

- The block is a feed block: hosts add it from the feed's Add list, and it shows in the event page's
  Invitation view. The standalone Save my date editor never offers it (`lib/invitation/sectionRules.ts`
  has no GRADUATION entry; a test guards this).
- Its code sits with the other feed invitation blocks in `lib/invitation/` and
  `components/saveMyDate/invitation/`, because the feed draws its blocks with that renderer.

## The five styles

Every style keeps the block's title and each graduate's name, degree and university. Photo sizes follow
the block today: one graduate per row on a phone, two per row on wider screens, the last odd one centred.

| Value | Picker label (EN / EL) | Look |
| --- | --- | --- |
| `plain` | Plain / Απλό | Today's look: rounded photo (370:300, 18px corners), name, degree, university. |
| `cap` | Cap / Καπέλο | Plain, plus a drawn mortarboard with a hanging tassel sitting tilted on the photo's top corner: left on odd graduates, right on even ones, so a list zig-zags. The cap overlaps the photo's edge and the space above it. |
| `stickers` | Stickers / Αυτοκόλλητα | Plain, plus die-cut stickers (white outline, soft shadow) around the photos and the title: a rolled diploma with a ribbon, a stack of books, a champagne bottle with confetti, stars. Placement is fixed by the style and cycles through a set of arrangements by the graduate's position; hosts cannot move them. |
| `polaroids` | Polaroids / Πολαρόιντ | Each graduate is a white polaroid (square photo, wide bottom margin) tilted a little, alternating left and right, with a strip of tape at the top. The name is written in the polaroid's bottom margin; degree and university sit under the polaroid on one line, joined by " · ". |
| `cover` | Cover / Εξώφυλλο | Each graduate is a minimal magazine cover: the photo fills a 4:5 card, a thin white frame sits inside its edge, the university is small, spaced capitals at the top, and the name (title font) and degree (small spaced capitals) are at the bottom. A soft dark fade at the top and bottom keeps the white text readable. |

- New blocks start with `cap`. A block saved before styles existed has no `style` and draws as `plain`.
- The picker is one `SettingsChoices` row in the block's sheet, labelled "Style" / "Στιλ" (owner approved
  the label and the five choice names on 2026-11-27).

### Colours

Nothing is gold. Decorations take the theme's colours, so they follow whatever theme the host picks:

- the cap's board and skull in the theme's text colour, the tassel in the theme's primary colour;
- sticker fills from a small fixed palette mixed with the theme's primary colour, always with the white
  die-cut outline;
- polaroid paper white, tape a translucent tint of the primary colour;
- cover text white over the photo.

### A graduate without a photo

- Guests: a graduate with no photo shows name, degree and university only, in every style, as the plain
  style does today. No empty polaroid or cover is drawn.
- Hosts editing the feed: the style keeps its shape with a soft placeholder where the photo goes, so the
  host sees where a photo will appear and can add one.

### Text that doesn't fit

- `cover`: a long university name wraps to two lines at most, then ends with an ellipsis; a long name
  shrinks to fit the card's width before it wraps.
- `polaroids`: a long name wraps inside the polaroid's margin; the margin grows.
- `cap` and `stickers`: as `plain`.

## Alt text

Event pages and published invitations are closed to crawlers (`app/robots.ts`), so these are for screen
readers. Owner approved, 2026-11-27:

| Decoration | EN | EL |
| --- | --- | --- |
| cap | Graduation cap | Καπέλο αποφοίτησης |
| diploma sticker | Diploma | Δίπλωμα |
| books sticker | Books | Βιβλία |
| champagne sticker | Champagne | Σαμπάνια |
| star sticker | Star | Αστέρι |
| confetti sticker | Confetti | Κομφετί |
| polaroid tape | Tape | Ταινία |

They follow the invitation's language, like the block's other fixed labels. Graduate photos keep using
the graduate's name, as today. If the graduation landing page later shows pictures of this block, those
pictures get their own SEO alt text, approved with that page.

## Data

- `graduates` section data gains `style: 'plain' | 'cap' | 'stickers' | 'polaroids' | 'cover'`, optional,
  missing = `plain`.
- `newSection` gives a new Graduates block `style: 'cap'`.
- Backend `invitation-document.schema.json` gains the same optional enum, so saved layouts validate. This
  needs a guestwall-be pull request into staging before #444 merges.

## Stories and sample photos

- Seven generated photos of fictional Greek graduates in their own dressed-up clothes (no gowns or caps:
  Greek graduates rarely wear them), made with Figma AI on 2026-11-27, kept in the Figma file
  "Graduation sample photos". They go into `.storybook/assets/graduation/` as compressed `.webp`, with
  their own media ids, so no graduation story ever falls back to the wedding picture.
- The `graduates` sample in `lib/invitation/samples.ts` uses those ids.
- Each style has its own stories file: one, two and six graduates, long names and university, a graduate
  without a photo (guest and host views), and a dark background. The Every Section and Sample Theme
  stories show the default style.

## Out of scope

- Moving or adding stickers by hand.
- A sticker library shared with the banner and sticker designer (part 2 of the graduation work). The
  sticker drawings are kept as separate components so that work can reuse them later.
- Any landing page change.
