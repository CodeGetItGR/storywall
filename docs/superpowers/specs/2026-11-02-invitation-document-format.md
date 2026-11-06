# Invitation document format (KAN-44)

Status: draft for review · 2026-11-02 · Epic KAN-43 (Save my date backend)

## Goal

Define the single format that the editor, published page, publish step and old-data converter all share. An invitation is:
- a theme reference,
- the few theme settings a host may change,
- an ordered list of typed sections,
- a `schemaVersion`.

This format replaces the old `theme_editor_state.state` JSON and the 56 frozen renderer copies.

The TypeScript source of truth is [lib/invitation/](../../../lib/invitation). Spring (guestwall-be) must enforce the same rules on every write; the backend tickets port it there.

## Decisions

| Topic | Decision |
| --- | --- |
| Theme changes | Drafts follow the theme live. Publishing freezes a copy of the theme design together with its revision, so a live invitation never changes on its own. |
| Validation | Strict per section type. Unknown fields, unknown section types and out-of-range values are rejected, not dropped. |
| Images | Only references: `{source: 'media', mediaId}` for uploads in our storage, or `{source: 'theme', assetId}` for the theme's own library. No URLs, no base64. The converter uploads any inline images it finds. |
| Role names | Neutral: `partnerA`/`partnerB` and `parentA`/`parentB`, each with an editable label. `church*` becomes `ceremony*`. |
| Web validation | zod (`zod@^4.6.7`). The same schema gives the TS types, the editor's pre-save check and the converter's check. |
| Text | Plain text with line breaks. The old editor never stored inline marks; bold and italic apply to a whole field. |

## Shape

```ts
InvitationDocument {
  schemaVersion: 1
  themeId: string
  overrides: { typographyPresetId?: string, textColor?: Color }   // host-changeable theme bits
  sections: Section[]                                            // max 150, order = page order
}

Section {
  id, type, name, visible, locked
  data: <per type, see below>
  textStyles: { [fieldPath]: TextStyle }   // style of the section's own text fields
  elements: Element[]                      // things added under the fields (old texts[])
  style: SectionStyle
}

PublishedInvitation { document, theme: ThemeDesign, themeRevision, publishedAt }
```

### Shared values

- **Color:** `#rgb` to `#rrggbbaa`, or `transparent`.
- **Font:** a family name. It may not contain `< > " \` ; \ { }` or a line break.
- **Link:** `http`, `https`, `mailto`, `tel`, `sms` or `#anchor`. An empty string means no link.
- **TextStyle:**
  - `font`, `size` (6–400), `color`, `align` (left/center/right)
  - `bold`, `italic`
  - `lineHeight` (0.5–4)
  - `marginTop` and `marginBottom` (-500 to 1000). The old `marginY` sets both.

### Text style paths

A `textStyles` key is the dot path to a text field in `data`, such as `title`, `partnerA.name` or `items.p2.label`.

- **Lists:** a list segment is the item's **id**, never its position, so a style follows its item when it is reordered. The old editor used positions (`items.0.label`); the converter rewrites them.
- **Validation:** a path that does not point to an existing text field is rejected.

### SectionStyle

| Field | Meaning |
| --- | --- |
| `background` | One of three kinds: `{kind:'theme', slot:'auto'\|'top'\|'content'\|'extra'}`, `{kind:'color', color?}` (no colour means the theme's secondary colour) or `{kind:'image', image}`. `auto` alternates top and content backgrounds by position. |
| `themeBackgroundDefault` | The slot that "reset" returns to (set by the admin). |
| `hostBackgrounds` | `{enabled, allowed[]}`: which theme backgrounds the host may pick. |
| `effect` | `{type, speed: slow\|normal, intensity: subtle\|strong}`, with the 31 effect types of the old effects engine. |
| `minHeight`, `paddingY` | 44–3000 and 0–1000 px. |
| `transition` | `{assetId, edge: top\|bottom}`, pointing to a theme transition. |
| `textContrast` | `auto`, `light` (white text) or `base` (theme text colour). |

### Elements

Elements are what the editor's "Add" menu inserts. Their ids are unique across the whole document.

| kind | Fields | Notes |
| --- | --- | --- |
| `text` | `role` (title/subtitle/paragraph), `text`, `style`, `fullWidth?` | `fullWidth` is allowed only in custom (`blank`) sections. |
| `spacer` | `height` | |
| `image` | `image`, `width` | Usually a theme element. |
| `link` | `text`, `url` | Rendered as a theme button. |
| `photoFrame` | frame fields (below) | Only admins can add these; the editor enforces that. Any section may hold them. |
| `columnBreak` | (no fields) | Allowed only in custom sections, at most one. Elements before it form column one. |

**Frame fields:**
- `frameId`: a theme frame, or empty.
- `photo?`
- `imageX` and `imageY` (0–100)
- `zoom` and `boxScale`
- `imageWidth` and `imageHeight`
- `animation`: one of 16 frame animations.

### Section types (30)

`blank`, `photo` and `photoFrame` may appear more than once. Every other type appears at most once. `footer` is locked and always last.

| Type | `data` |
| --- | --- |
| top | `{}` |
| baby | `babyName`, `babyPhoto?`, `babyMessage` |
| parentsPhoto | `parentsTitle`, `parentA` and `parentB` (`{label, name, photo?}`) |
| godparents | `godparentsTitle`, `godparents[]` (`{id, name, photo?}`, max 20) |
| parentsSimple | `parentsTitle`, `parentAName`, `parentBName`, `godparentsTitle`, `godparents[]` (`{id, name}`), `decoration?` |
| invitation | `text` |
| date | `iso` (`YYYY-MM-DDTHH:mm`), `displayStyle` (8 styles), `displayLanguage` (el/en), `day`, `number`, `month`, `monthName`, `monthGenitive?`, `monthNumber`, `time`, `yearLabel`, `yearShort`, `periodLabel?` |
| countdown | `label`, `numberStyle?` (`{font, size, color}`) |
| locations | `ceremony`, `ceremonyAddress`, `ceremonyMap`, `welcomeEnabled`, `welcome`, `welcomeAddress`, `welcomeMap`, `note`, `reception`, `receptionAddress`, `receptionMap`, `desktopColumns` (1–3) |
| parents | `parents`, `godparents` (free text) |
| rsvp | `title`, `deadline`, `formStyle?`. Answers go to the Storywall event; there is no RSVP data in the document. |
| gift | `title`, `bank`, `iban` |
| accommodation | `title`, `subtitle`, `items[]` (`{id, name, address, phone, email, website, mapUrl}`), `cardStyle?` |
| program | `title`, `items[]` (`{id, time, label}`), `programStyle?` |
| programIcons | `title`, `subtitle`, `items[]` (`{id, time, label, description, icon}`), `programStyle?`. `icon` is one of `auto`, `none`, a preset (19 icons), or `custom` (`{image, mode: image\|mask, name}`). |
| contact | `title`, `phone`, `sms`, `email`, `facebook`, `instagram`, `tiktok`, `iconStyle?` |
| gallery | `title`, `images[]` (max 10), `layout` (grid/masonry/carousel/featured), `shape` (round/square/rectangle/roundedSquare) |
| faq | `title`, `items[]` (`{id, question, answer}`), `faqStyle?` |
| blank | `{}` (all of its content is elements) |
| photo | `photo?`, `imageY` |
| coupleNames | `partnerAName`, `partnerBName` |
| ourStoryProposal | `block1Title`, `block1Subtitle`, `block1Body`, `block2Title`, `block2Subtitle`, `block2Body` |
| dressCode | `title`, `note`, `colors[]` (max 12) |
| coupleContact | `title`, `partnerA` and `partnerB` (`{name, phone, sms, email, facebook, instagram, tiktok}`), `iconStyle?` |
| weddingSponsors | `sponsorsTitle`, `sponsors[]` (`{id, name, photo?}`) |
| coupleProfiles | `partnerA` and `partnerB` (`{name, role, familyLabel, familyNames, photo?}`), `desktopColumns` |
| coupleProfilesSimple | the same without `photo`, plus `decoration?` |
| weddingSponsorsSimple | `sponsorsTitle`, `sponsorsNames` (one name per line), `decoration?` |
| photoFrame | `{}`. Like a custom section, its frames are `photoFrame` elements; a new one starts with one frame. |
| footer | `text`, `textColor?`, `font?`, `link` |

**Notes on the table:**
- `decoration` is `{image, width}`: a theme element shown between the blocks (the old `element1` and `element1Width`).
- The `*Style` objects hold the section-specific look settings the old editor kept in `data`. They are listed field by field in [sections.ts](../../../lib/invitation/sections.ts).

The ticket said 32 section types; the old registry has 30 (29 addable types plus `footer`).

### ThemeDesign (admin-owned)

| Field | Contents |
| --- | --- |
| `backgrounds` | `top`, `content` and `extra`, each `{desktop?, mobile?, mode: cover\|repeat\|texture, stableRepeat}` |
| `art` | `main`, `ceremonyIcon`, `welcomeIcon` and `receptionIcon`, each `{image, scale 0.4–2.5, animation}` (20 artwork animations) |
| `colors` | `primary`, `secondary`, `text`, `buttonBg?`, `buttonText?` |
| `fonts` | `title`, `body`, `button?` |
| Other settings | `typographyPresetId?`, `autoTextContrast`, `photoShape` (13 shapes), `textAnimation` (26 animations) |
| Libraries | `elements[]`, `frames[]` (`{art, mask, width, height}`), `transitions[]` (`{desktop, mobile?}`). Asset ids are unique across the three. |

**Where the rest of a theme lives:**
- The theme's starter sections are an `InvitationDocument` that belongs to the theme.
- Listing data stays on the theme record (KAN-45), not in the design:
  - name, slug, SEO fields, OG image, card thumbnail, product photos with alt text.

`findMissingThemeAssets(document, theme)` lists the asset ids an invitation uses that its theme does not have. Spring must run the same check on publish.

## Versioning

- Every stored document carries `schemaVersion`.
- When a shape changes, bump `INVITATION_SCHEMA_VERSION` and add an upgrade from N to N + 1 in `INVITATION_UPGRADES`, with its own test.
- `upgradeInvitationDocument` runs the upgrades in order and then validates the result.
- Spring runs the same chain when it reads an older document.
- There are no frozen renderers. A published snapshot is upgraded like any other document, and the parity tests (KAN-53) catch visual drift.

## Mapping the old state

Checked against the backup of 2 November 2026: the 41 templates and the 12 customer sites (draft and published). The converter in [lib/invitation/convert/](../../../lib/invitation/convert/) does this mapping and reports every old key it neither reads nor drops on purpose; on that backup there are none.

### Document and theme

| Old | New |
| --- | --- |
| `theme.topBg`, `topBgMobile`, `topBgMode`, `topBgStableRepeat` (and the same for `content` and `extra`) | `theme.backgrounds.<slot>` |
| `theme.mainArt` + `mainArtScale` + `mainArtScaleAnim` | `theme.art.main` |
| `theme.churchIcon`, `welcomeIcon`, `receptionIcon` + `*Scale` + `*ScaleAnim` | `theme.art.ceremonyIcon`, `welcomeIcon`, `receptionIcon` |
| `theme.primary`, `secondary`, `textColor`, `buttonBg`, `buttonTextColor` | `theme.colors.*` |
| `theme.titleFont`, `bodyFont`, `buttonFont` | `theme.fonts.*` |
| `theme.typographyPresetId`, `autoTextContrast`, `photoShape`, `textAnimation` | the same names in `theme` |
| `theme.elements` (list of URLs) | `theme.elements[]`, ids made from the URL, named "<theme name>, διακοσμητικό <n>" |
| `theme.frames`, `theme.transitions` | the same, with uploaded files |
| `theme.ogImage`, `cardThumb`, `productPhotos`, `productPhotoAlts` | the theme record (KAN-45) |
| A host's own `typographyPresetId` (it differs from the theme's, or `typographyPresetForce` is true or missing) / `textColor` | `overrides` |
| `sections[]` | `sections[]` (below) |

### Section envelope

| Old | New |
| --- | --- |
| `liveVisible` | `visible` |
| `locked`, `id`, `type`, `name` | the same |
| `data._style[key]` | `textStyles[path]`, with list positions rewritten to item ids and renamed fields rewritten (`dad.name` → `parentA.name`). `marginY` fills in a missing `marginTop` or `marginBottom`. A style whose field no longer exists is left out with a warning. |
| `texts[]` | `elements[]`. A text with no kind or `kind: 'title'/'subtitle'` becomes `kind: 'text'` with a role. Other kinds keep their name; `src` becomes `image`. |
| `style.mode` + `color` / `image` / `themeBg` | `style.background` |
| `style.clientThemeBgConfigured`, `clientThemeBgEnabled`, `clientThemeBgAllowed` | `style.hostBackgrounds`. When not configured, everything is allowed (old behaviour). |
| `style.bgEffect` | `style.effect`. `parallax` becomes `cinematicPulse` and `tsFireworks` becomes `canvasFireworks`, as the old sanitizer did. |
| `style.textContrast` | the same; a missing value becomes `auto` |
| `style.transition`, a frame element's `frameId` pointing at another theme's asset | removed / left empty, as the old app drew them (no transition, an empty frame) |
| type `actionButton` | an empty custom section (`blank`). The old app never drew it. |

### Renamed section fields

- **parentsPhoto:**
  - `dad` → `parentA`
  - `mom` → `parentB`
- **parentsSimple:**
  - `dadName` → `parentAName`
  - `momName` → `parentBName`
  - `element1` + `element1Width` → `decoration`
- **coupleNames:**
  - `name1` → `partnerAName`
  - `name2` → `partnerBName`
- **coupleContact:** `bride` → `partnerA`, `groom` → `partnerB` (the order they render in).
- **coupleProfiles / coupleProfilesSimple:** `groom` → `partnerA`, `bride` → `partnerB` (the order they render in).
- **weddingSponsorsSimple:**
  - `element1` → `decoration`
  - older `sponsor1Name` + `sponsor2Name` → `sponsorsNames` (one per line), keeping `sponsor1Name`'s style, as the old editor did
- **locations:** `church*` → `ceremony*`; the older `churchMapUrl` / `receptionMapUrl` fill in an empty map link
- **countdown:** `numStyle` → `numberStyle`; a missing `label` becomes "Ραντεβού σε..."
- **rsvp:** `rsvpStyle` → `formStyle`; `btn*` → `button*`
- **accommodation:** `stayStyle` → `cardStyle`
- **faq:**
  - items `{q, a}` → `{id, question, answer}`
  - `faqStyle.q*` / `a*` → `question*` / `answer*`
- **programIcons:**
  - `iconKey` with `customIconSrc` / `customIconMode` / `customIconName` → `icon`
- **photo:** `src` → `photo`
- **photoFrame elements:** `src` → `photo`, `frameAnimation` → `animation`
- **Lists without ids** get generated ids.

### Dropped on purpose

| Old | Why |
| --- | --- |
| `selectedSection`, `activeText`, `insertAfter`, `pending` | Editor UI state; the old server already cleared them. |
| `lastSectionColor` | An editor preference; it moves to the editor's local settings. |
| `_wedart` (renderer and schema stamp) | Replaced by `schemaVersion`. |
| `theme.name`, `theme.typographyPresetName` | Read from the theme record and the preset. |
| `theme.typographyPresetForce` | It marked a preset the host picked (true) versus one the admin set (false). That is now where the preset lives: a host's preset is in `overrides` and replaces every font on the page; the theme's preset only fills in text with no font of its own. |
| `style.columnLayoutVersion` | A one-off migration flag of the old editor. |
| `gallery.active`, image `id` and `name` | The carousel's current slide and the upload's file name. |
| `recentTextColors`, `_bgEffectEditingSectionId`, `pendingTextSection` | Editor UI state. |
| `dressCode.code` and its style | Never shown on the page. |
| `contact.phone1`, `phone2` | From an early default; nothing showed them. |
| `faq` item `open` | Whether the answer was open in the editor. |
| `columnBreak.color` | Only tinted the editor's column marker. |
| `actionButton` `title`, `buttonText`, `url` | The section was never drawn. |
| `data` keys with a dot (`items.0.address`) | Strays the old editor wrote next to the real field. |
| `theme.openingEnvelope*` | Off in every exported state. |
| Legacy `data.frameId`, `zoom`, `imageX` and similar on `photoFrame` sections | Superseded by the frame element in the old editor itself; the converter reads them only as a fallback. |

## Open points

- **desktopColumns:** every exported value is 2; the 1–3 range stays.
- **Program icons:** the 19 preset keys come from the old picker. `auto` keeps picking an icon from the row's label, as before.

## Files

- [lib/invitation/primitives.ts](../../../lib/invitation/primitives.ts): ids, text, colour, font, link, image refs, `TextStyle`
- [lib/invitation/sectionStyle.ts](../../../lib/invitation/sectionStyle.ts): backgrounds, effects, transitions
- [lib/invitation/elements.ts](../../../lib/invitation/elements.ts): added elements
- [lib/invitation/sections.ts](../../../lib/invitation/sections.ts): the 30 section types and the text-style path check
- [lib/invitation/theme.ts](../../../lib/invitation/theme.ts): `ThemeDesign`
- [lib/invitation/document.ts](../../../lib/invitation/document.ts): document, published snapshot, upgrades, theme asset check
- [lib/invitation/samples.ts](../../../lib/invitation/samples.ts): one sample per section type, a sample theme and a sample document
- [lib/invitation/document.test.ts](../../../lib/invitation/document.test.ts): every sample validates, plus the rejection rules
