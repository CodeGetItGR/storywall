# QR card picture tiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The event's printed QR card shows up to 5 tilted picture tiles under the code (Posts, Stories, Wishes, Reactions, Music), picked automatically from the event plan's available modules.

**Architecture:** The layout model gains an optional `features` box (backend record + validator first, then the frontend type). A pure `lib/qrCardFeatures.ts` picks the tiles and places them in rows of 3 and 2. One small SVG component per tile draws inside `QrCardSvg`, using SVG attributes only, so print and PNG/PDF export keep reusing the same node. A second default layout (`FEATURES_QR_CARD_LAYOUT`) is used by the event's QR card; the gift card and vendor preview keep today's `DEFAULT_QR_CARD_LAYOUT`.

**Tech Stack:** Next.js / React 19 / TypeScript, next-intl, vitest (+ `@resvg/resvg-js` and `jsqr` for the scan test), Storybook. Backend: Spring Boot (Java records, JUnit 5 + AssertJ) in guestwall-be.

**Spec:** [docs/superpowers/specs/2026-11-15-qr-card-feature-cards-design.md](../specs/2026-11-15-qr-card-feature-cards-design.md)

**Approved copy (owner, 2026-11-15). Use these exact strings and no others:**

| Key | English | Greek |
|---|---|---|
| `QrCardPage.tiles.posts` | Posts | Αναρτήσεις |
| `QrCardPage.tiles.stories` | Stories | Ιστορίες |
| `QrCardPage.tiles.wishes` | Wishes | Ευχές |
| `QrCardPage.tiles.reactions` | Reactions | Αντιδράσεις |
| `QrCardPage.tiles.music` | Music | Μουσική |
| `QrCardPage.tiles.songTwo` | Dancing Queen | Dancing Queen |
| `QrCardPage.tiles.songThree` | Perfect | Perfect |
| `AdminPage.qrCards.layout.elements.features` | Pictures | Εικόνες |
| `AdminPage.qrCards.layout.removeFeatures` | Remove pictures | Αφαίρεση εικόνων |
| `AdminPage.qrCards.layout.restoreFeatures` | Add pictures back | Επαναφορά εικόνων |

Reused, not new: `QrCodePage.preview.wishText` (the Wishes note) and `QrCodePage.preview.songTitle` ("September", the first song). The backup tiles' copy (Games, Gifts, Schedule) is approved too but belongs to Task 12, which waits on a mockup.

**Rules from CLAUDE.md that apply throughout:**
- No other text changes. If a step seems to need a string not in the table above, stop and ask the owner in a popup.
- Every `<image>` gets an accessible name through the card's `<title>`: the whole card is one `role="img"`, so tile images are decorative parts of that one image. Don't add `<title>` elements to tiles.
- Add a JSX comment above each visual section (`{/* Tiles */}`, `{/* Label */}`).
- No parallel subagents without the owner's permission.
- Fix lint before handing back.

---

## File map

**guestwall-be** (`C:\Users\User\IdeaProjects\event_social_media`)
- Modify `src/main/java/event_social_media/model/qrcard/QrCardLayout.java`: add the `FeaturesBox features` component.
- Modify `src/main/java/event_social_media/service/qrcard/QrCardLayoutValidator.java`: validate and round it.
- Modify `src/test/java/event_social_media/service/qrcard/QrCardLayoutValidatorTest.java`: tests.

**storywall** (this worktree)
- Modify `lib/api/types.ts`: `QrCardLayoutDto.features`.
- Modify `lib/qrCardLayout.ts`: `features` element, `FEATURES_QR_CARD_LAYOUT`, `DEFAULT_QR_CARD_FEATURES`, `setFeaturesShown`, fallback in `qrCardLayoutOf`.
- Modify `lib/qrCardLayout.test.ts`.
- Modify `lib/qrCard.ts`: `PLAIN_FEATURES_QR_CARD_STYLE`, fallback in `qrCardStyleOf`.
- Create `lib/qrCardFeatures.ts`: `qrCardFeatures`, `layoutFeatureTiles`, types.
- Create `lib/qrCardFeatures.test.ts`.
- Create `components/qrCard/features/tileProps.ts`: shared props and colours.
- Create `components/qrCard/features/QrCardPostsTile.tsx`, `QrCardStoriesTile.tsx`, `QrCardWishesTile.tsx`, `QrCardReactionsTile.tsx`, `QrCardMusicTile.tsx`.
- Create `components/qrCard/features/QrCardFeatureTiles.tsx`: places the tiles, adds shadow and labels.
- Modify `components/qrCard/QrCardSvg.tsx`: `features` and `featureTexts` props.
- Create `components/qrCard/QrCardSvg.test.tsx`; modify `components/qrCard/QrCardSvg.scan.test.tsx`.
- Create `hooks/useQrCardFeatureTexts.ts`.
- Modify `messages/en.json`, `messages/el.json`.
- Modify `hooks/useQrCardDesigner.ts`, `hooks/useQrCardScreen.ts`, `components/qrCard/QrCardScreen.tsx`, `components/qrCard/QrCardDesigner.tsx`.
- Modify `components/admin/qrCards/QrCardTemplatePreview.tsx`, `components/admin/qrCards/layoutEditor/QrCardLayoutCanvas.tsx`, `hooks/useQrCardLook.ts`, `hooks/useQrCardTemplateDrawer.ts`.
- Modify `hooks/useQrCardLayoutEditor.ts`, `components/admin/qrCards/layoutEditor/QrCardLayoutInspector.tsx`, `components/admin/qrCards/layoutEditor/QrCardLayoutAddBar.tsx`.
- Create `components/qrCard/QrCardSvg.stories.tsx`.

---

## Task 0: Branches and ticket

- [ ] **Step 1: Ask the owner about a Jira ticket**

Ask in a popup whether to create a KAN ticket for this work (none exists yet). If yes, create it and use its key below in place of `KAN-215`. If no, drop the key from branch names and commit messages.

- [ ] **Step 2: Frontend branch from the latest staging**

This worktree is on `claude/qr-code-ux-improvements-4384a2`, cut from `main`. Per the worktree memory, check `git diff origin/staging...HEAD --stat` first and ask before resetting.

```bash
git fetch origin
git diff --stat origin/staging HEAD
```

If the only difference is the new spec and plan files (untracked), move to staging:

```bash
git checkout -B claude/kan-215-qr-card-pictures origin/staging
```

The untracked spec and plan files stay in the working tree.

- [ ] **Step 3: Backend branch**

```bash
cd C:/Users/User/IdeaProjects/event_social_media
git fetch origin
git status --short
git checkout -b claude/kan-215-qr-card-features-box origin/staging
```

If `git status --short` shows changes, stop and ask the owner: another session may be working there.

---

## Task 1: Backend: features box on the layout record

**Files:**
- Modify: `src/main/java/event_social_media/model/qrcard/QrCardLayout.java`
- Modify: `src/main/java/event_social_media/service/qrcard/QrCardLayoutValidator.java`
- Test: `src/test/java/event_social_media/service/qrcard/QrCardLayoutValidatorTest.java`

- [ ] **Step 1: Write the failing tests**

Add to `QrCardLayoutValidatorTest` (after the existing tests; the class already imports `List`, `Map`, `UUID`, AssertJ and has `assertRejected`). Add the import `import event_social_media.model.qrcard.QrCardLayout.FeaturesBox;` next to the other nested-record imports.

```java
    /** The event card's layout with tiles: smaller title and code, lines under the code, tiles below. */
    private static final QrCardLayout WITH_FEATURES = new QrCardLayout(
            new TitleBox(8, 10, 89, 11, 7.5, "center"),
            new CodeBox(29.5, 22, 46, true, 4),
            new LinesBox(8, 70, 89, 8, 5, "center"),
            List.of(),
            new FeaturesBox(8, 79, 89, 61));

    @Test
    void aLayoutWithoutFeaturesHasNone() {
        assertThat(QrCardLayoutValidator.validated(DEFAULT, ACTOR).features()).isNull();
    }

    @Test
    void theFeaturesBoxIsKept_andRounded() {
        QrCardLayout layout = new QrCardLayout(WITH_FEATURES.title(), WITH_FEATURES.code(), WITH_FEATURES.lines(), List.of(),
                new FeaturesBox(8.04, 79.06, 89, 60.94));
        assertThat(QrCardLayoutValidator.validated(layout, ACTOR).features()).isEqualTo(new FeaturesBox(8, 79.1, 89, 60.9));
        assertThat(QrCardLayoutValidator.validated(WITH_FEATURES, ACTOR)).isEqualTo(WITH_FEATURES);
    }

    @Test
    void aFeaturesBoxOutsideTheSafeAreaIsRejected() {
        assertRejected(withFeatures(new FeaturesBox(8, 80, 89, 61)), "error.qr_card.layout_outside");
        assertRejected(withFeatures(new FeaturesBox(7.9, 79, 40, 30)), "error.qr_card.layout_outside");
        assertRejected(withFeatures(new FeaturesBox(Double.NaN, 79, 40, 30)), "error.qr_card.layout_outside");
    }

    @Test
    void aFeaturesBoxUnder40By25IsRejected() {
        assertRejected(withFeatures(new FeaturesBox(8, 79, 39.9, 61)), "error.qr_card.layout_too_small");
        assertRejected(withFeatures(new FeaturesBox(8, 79, 89, 24.9)), "error.qr_card.layout_too_small");
        assertThat(QrCardLayoutValidator.validated(withFeatures(new FeaturesBox(8, 79, 40, 25)), ACTOR)).isNotNull();
    }

    private static QrCardLayout withFeatures(FeaturesBox features) {
        return new QrCardLayout(WITH_FEATURES.title(), WITH_FEATURES.code(), WITH_FEATURES.lines(), List.of(), features);
    }
```

- [ ] **Step 2: Run them to see them fail**

```bash
./gradlew test --tests "event_social_media.service.qrcard.QrCardLayoutValidatorTest"
```

Expected: compile error, `FeaturesBox` and the 5-argument constructor don't exist. (If the repo uses Maven, `./mvnw -Dtest=QrCardLayoutValidatorTest test`; check which wrapper is in the repo root.)

- [ ] **Step 3: Add the record component**

In `QrCardLayout.java`, replace the record header, compact constructor and 3-arg constructor with:

```java
@JsonIgnoreProperties(ignoreUnknown = true)
public record QrCardLayout(TitleBox title, CodeBox code, LinesBox lines, List<TextField> fields, FeaturesBox features) {

    public QrCardLayout {
        fields = fields == null ? List.of() : List.copyOf(fields);
    }

    public QrCardLayout(TitleBox title, CodeBox code, LinesBox lines, List<TextField> fields) {
        this(title, code, lines, fields, null);
    }

    public QrCardLayout(TitleBox title, CodeBox code, LinesBox lines) {
        this(title, code, lines, List.of(), null);
    }
```

Add the nested record after `TextField`:

```java
    /**
     * Where the picture tiles go: up to five pictures of what guests can do after scanning, picked by the
     * frontend from the event's plan. Null when the admin removed them or the layout was saved before them.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record FeaturesBox(double x, double y, double width, double height) {
    }
```

In the class Javadoc, change the first sentence's list to "its title, code, lines, added text fields and picture tiles", and add to the last paragraph: "{@code features} is null when the admin removed the tiles or the layout was saved before them."

- [ ] **Step 4: Validate it**

In `QrCardLayoutValidator.java`:

Add constants after `FIELD_MAX_TEXT`:

```java
    static final double FEATURES_MIN_WIDTH = 40;
    static final double FEATURES_MIN_HEIGHT = 25;
```

Add the import `import event_social_media.model.qrcard.QrCardLayout.FeaturesBox;`.

Replace the final `return new QrCardLayout(title, code, lines, validatedFields(layout.fields(), actorId));` with:

```java
        return new QrCardLayout(title, code, lines, validatedFields(layout.fields(), actorId), validatedFeatures(layout.features(), actorId));
    }

    /** Rounded, inside the safe area and at least 40 × 25 mm. Null stays null: no tiles. */
    private static FeaturesBox validatedFeatures(FeaturesBox f, UUID actorId) {
        if (f == null) return null;
        FeaturesBox features = new FeaturesBox(round(f.x()), round(f.y()), round(f.width()), round(f.height()));
        if (!new Rect(features.x(), features.y(), features.width(), features.height()).insideSafeArea()) {
            throw rejected("outside", actorId);
        }
        if (features.width() < FEATURES_MIN_WIDTH - EPSILON || features.height() < FEATURES_MIN_HEIGHT - EPSILON) {
            throw rejected("too_small", actorId);
        }
        return features;
```

(The closing brace of `validated` now closes `validatedFeatures`; check the braces compile.)

- [ ] **Step 5: Run the tests**

```bash
./gradlew test --tests "event_social_media.service.qrcard.*" --tests "event_social_media.controller.qrcard.*"
```

Expected: PASS, including the existing controller tests that build layouts with 3 and 4 arguments.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/event_social_media/model/qrcard/QrCardLayout.java src/main/java/event_social_media/service/qrcard/QrCardLayoutValidator.java src/test/java/event_social_media/service/qrcard/QrCardLayoutValidatorTest.java
git commit -m "KAN-215: QR card layout keeps a picture tiles box

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7: Full backend check, push, PR into staging**

```bash
./gradlew build
git push -u origin claude/kan-215-qr-card-features-box
gh pr create --base staging --title "KAN-215: QR card layout keeps a picture tiles box" --body "..."
```

Body: what changed (optional `features` box, validated inside the safe area and at least 40 × 25), "No migration: saved layouts keep no box until an admin adds one", deploy note "Release before the storywall change". End with the Claude Code attribution line. Follow the backend repo's own `CLAUDE.md` for anything else it asks.

---

## Task 2: Frontend type

**Files:**
- Modify: `lib/api/types.ts:1097-1111`

- [ ] **Step 1: Add the field**

In `QrCardLayoutDto`, after `fields?: ...`:

```ts
    // The picture tiles' box. null = removed; absent on layouts saved before it, which also means no tiles.
    features?: { x: number; y: number; width: number; height: number } | null;
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: PASS (the field is optional, nothing reads it yet).

No commit yet; it goes with Task 3.

---

## Task 3: Layout model

**Files:**
- Modify: `lib/qrCardLayout.ts`
- Test: `lib/qrCardLayout.test.ts`

- [ ] **Step 1: Write the failing tests**

In `lib/qrCardLayout.test.ts`, add `DEFAULT_QR_CARD_FEATURES`, `FEATURES_QR_CARD_LAYOUT` and `setFeaturesShown` to the import list. Change the first test's expected object to include `features: null` after `fields: []`. Then add:

```ts
const F = FEATURES_QR_CARD_LAYOUT;

describe('the layout with tiles', () => {
    it('puts a smaller code above the tiles, and is valid', () => {
        expect(F).toEqual({
            title: { x: 8, y: 10, width: 89, height: 11, maxSize: 7.5, align: 'center' },
            code: { x: 29.5, y: 22, size: 46, panel: true, radius: 4 },
            lines: { x: 8, y: 70, width: 89, height: 8, textSize: 5, align: 'center' },
            fields: [],
            features: { x: 8, y: 79, width: 89, height: 61 },
        });
        expect(DEFAULT_QR_CARD_FEATURES).toEqual(F.features);
        expect(isValidQrCardLayout(F)).toBe(true);
    });

    it('draws the tiles above the fields and below the code', () => {
        const withField = addField(F, { id: 'a', kind: 'fixed', color: '#000000' });
        expect(qrCardElements(withField)).toEqual(['title', 'lines', 'field:a', 'features', 'code']);
        expect(elementRect(F, 'features')).toEqual({ x: 8, y: 79, width: 89, height: 61 });
    });

    it('needs the box inside the safe area and at least 40 × 25', () => {
        expect(isValidQrCardLayout({ ...F, features: { x: 8, y: 80, width: 89, height: 61 } })).toBe(false);
        expect(isValidQrCardLayout({ ...F, features: { x: 8, y: 79, width: 39.9, height: 61 } })).toBe(false);
        expect(isValidQrCardLayout({ ...F, features: { x: 8, y: 79, width: 89, height: 24.9 } })).toBe(false);
        expect(isValidQrCardLayout({ ...F, features: { x: 8, y: 79, width: 40, height: 25 } })).toBe(true);
    });

    it('resizes no smaller than 40 × 25, and moves inside the safe area', () => {
        const start = elementRect(F, 'features');
        const shrunk = resizeElement(F, 'features', 'se', start, -80, -80);
        expect(shrunk.features).toEqual({ x: 8, y: 79, width: 40, height: 25 });
        expect(moveElementTo(shrunk, 'features', { x: 90, y: 200 }).features).toEqual({ x: 57, y: 115, width: 40, height: 25 });
    });

    it('can be removed and put back at its spot', () => {
        const removed = setFeaturesShown(F, false);
        expect(removed.features).toBeNull();
        expect(qrCardElements(removed)).not.toContain('features');
        expect(setFeaturesShown(removed, true).features).toEqual(DEFAULT_QR_CARD_FEATURES);
        expect(setFeaturesShown(F, true)).toBe(F);
    });

    it('is named as its own element', () => {
        expect(elementName(F, 'features')).toEqual({ key: 'features', number: 0 });
    });
});
```

Extend the existing `qrCardLayoutOf` test:

```ts
    it('reads a saved box, a missing one as none, and falls back to the layout it is given', () => {
        expect(qrCardLayoutOf({ ...F }).features).toEqual(F.features);
        const { features: _features, ...old } = F;
        expect(qrCardLayoutOf(old).features).toBeNull();
        expect(qrCardLayoutOf(null, F)).toBe(F);
        expect(qrCardLayoutOf(undefined)).toBe(L);
    });
```

- [ ] **Step 2: Run them to see them fail**

```bash
npx vitest run lib/qrCardLayout.test.ts
```

Expected: FAIL, `FEATURES_QR_CARD_LAYOUT` is not exported.

- [ ] **Step 3: Implement**

In `lib/qrCardLayout.ts`:

Types (replace the two lines that define `QrCardLayout` and `QrCardElement`):

```ts
export type QrCardLayout = Omit<QrCardLayoutDto, 'fields' | 'features'> & { fields: QrCardTextField[]; features: Rect | null };
export type QrCardTitleBox = NonNullable<QrCardLayout['title']>;
// An added field is selected as `field:<id>`.
export type QrCardElement = 'title' | 'code' | 'lines' | 'features' | `field:${string}`;
```

`Rect` is declared below these lines; TypeScript type aliases are hoisted, so this compiles.

Limits: add to `QR_CARD_LAYOUT_LIMITS`:

```ts
    featuresMinWidth: 40,
    featuresMinHeight: 25,
```

Defaults: give `DEFAULT_QR_CARD_LAYOUT` a `features: null` entry after `fields: []`, and add after it:

```ts
// Where the picture tiles go on the event's card, and where "Add pictures back" puts them.
export const DEFAULT_QR_CARD_FEATURES: Rect = { x: 8, y: 79, width: 89, height: 61 };

// The event's card: a smaller code, the scan line under it, and the picture tiles below. Plain and every
// template without a saved layout use it on the event's QR page. The gift card keeps DEFAULT_QR_CARD_LAYOUT.
export const FEATURES_QR_CARD_LAYOUT: QrCardLayout = {
    title: { ...DEFAULT_QR_CARD_TITLE, height: 11, maxSize: 7.5 },
    code: { x: 29.5, y: 22, size: 46, panel: true, radius: 4 },
    lines: { x: 8, y: 70, width: 89, height: 8, textSize: 5, align: 'center' },
    fields: [],
    features: DEFAULT_QR_CARD_FEATURES,
};
```

Change the comment above `DEFAULT_QR_CARD_LAYOUT` to: `// Today's fixed spots, with no tiles. The gift card and the vendor page's preview use it.`

`qrCardLayoutOf`:

```ts
// A stored layout, or `fallback` when there is none. Layouts saved before KAN-103 have no fields, and
// those saved before the tiles have no tiles.
export function qrCardLayoutOf(layout: QrCardLayoutDto | null | undefined, fallback: QrCardLayout = DEFAULT_QR_CARD_LAYOUT): QrCardLayout {
    if (!layout) return fallback;
    return { title: layout.title ?? null, code: layout.code, lines: layout.lines, fields: layout.fields ?? [], features: layout.features ?? null };
}
```

`qrCardElements`:

```ts
export function qrCardElements(layout: QrCardLayout): QrCardElement[] {
    return [
        ...(layout.title ? (['title'] as const) : []),
        'lines',
        ...layout.fields.map((field) => fieldElement(field.id)),
        ...(layout.features ? (['features'] as const) : []),
        'code',
    ];
}
```

`elementRect`: replace the `const box = ...` line with:

```ts
    const box =
        element === 'title' ? layout.title : element === 'lines' ? layout.lines : element === 'features' ? layout.features : findField(layout, element);
```

`isValidQrCardLayout`: destructure `features` too, and add before `if (fields.length > LIMITS.fields)`:

```ts
    if (features && (features.width < LIMITS.featuresMinWidth - EPSILON || features.height < LIMITS.featuresMinHeight - EPSILON)) return false;
```

`withRect`: add after the `lines` line:

```ts
    if (element === 'features') return layout.features ? { ...layout, features: { x, y, width, height } } : layout;
```

Resize minimums: replace `minHeightOf` with:

```ts
function minHeightOf(element: QrCardElement): number {
    if (element === 'title') return LIMITS.titleMinHeight;
    if (element === 'lines') return LIMITS.linesMinHeight;
    if (element === 'features') return LIMITS.featuresMinHeight;
    return LIMITS.fieldMinHeight;
}

function minWidthOf(element: QrCardElement): number {
    return element === 'features' ? LIMITS.featuresMinWidth : LIMITS.textMinWidth;
}
```

In `resizedRect`'s `else` branch, add `const minWidth = minWidthOf(element);` next to `minHeight`, and use `minWidth` in place of `LIMITS.textMinWidth` in the two `e`/`w` lines.

After `setTitleShown`:

```ts
// Removes the picture tiles, or puts them back at the event card's spot.
export function setFeaturesShown(layout: QrCardLayout, shown: boolean): QrCardLayout {
    if (shown === (layout.features !== null)) return layout;
    return { ...layout, features: shown ? DEFAULT_QR_CARD_FEATURES : null };
}
```

`elementName`: change the return type's key union and the cast to include `'features'`:

```ts
export function elementName(
    layout: QrCardLayout,
    element: QrCardElement,
): { key: 'title' | 'code' | 'lines' | 'features' | QrCardFieldKind; number: number } {
    const field = findField(layout, element);
    if (!field) return { key: element as 'title' | 'code' | 'lines' | 'features', number: 0 };
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run lib/qrCardLayout.test.ts lib/qrCard.test.ts
```

Expected: PASS. If an existing test compares a layout built from a DTO with `toEqual(L)`, it now needs `features: null` on the expected side; fix the expectation, not the code.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: errors only where a `QrCardLayout` literal lacks `features` (tests, stories, fixtures). Add `features: null` to each. Expected none in app code other than `lib/qrCardLayout.ts`.

- [ ] **Step 6: Commit**

```bash
git add lib/api/types.ts lib/qrCardLayout.ts lib/qrCardLayout.test.ts
git add -u
git commit -m "KAN-215: QR card layout gets a picture tiles box

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(`git add -u` picks up fixtures fixed in Step 5. Check `git status` first and stage nothing unrelated, e.g. `AGENTS.md` edits from a dev run.)

---

## Task 4: Which tiles, and where

**Files:**
- Create: `lib/qrCardFeatures.ts`
- Test: `lib/qrCardFeatures.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';

import { layoutFeatureTiles, QR_CARD_SAMPLE_FEATURES, type QrCardFeature, qrCardFeatures } from '@/lib/qrCardFeatures';
import { DEFAULT_QR_CARD_FEATURES } from '@/lib/qrCardLayout';

function plan(...keys: string[]) {
    return keys.map((moduleKey) => ({ moduleKey, isAvailable: true }));
}

describe('qrCardFeatures', () => {
    it('shows the main five in order for a full plan', () => {
        expect(qrCardFeatures(plan('playlist', 'wishbook', 'stories', 'posts', 'gallery', 'rsvp'))).toEqual([
            'posts',
            'stories',
            'wishes',
            'reactions',
            'music',
        ]);
    });

    it('gives Posts for a gallery alone, but not Reactions', () => {
        expect(qrCardFeatures(plan('gallery'))).toEqual(['posts']);
    });

    it('skips modules the plan does not make available', () => {
        expect(qrCardFeatures([{ moduleKey: 'stories', isAvailable: false }, ...plan('wishbook')])).toEqual(['wishes']);
    });

    it('never shows RSVP, and shows nothing for an empty plan', () => {
        expect(qrCardFeatures(plan('rsvp'))).toEqual([]);
        expect(qrCardFeatures([])).toEqual([]);
    });

    it('samples the main five for admin previews', () => {
        expect(QR_CARD_SAMPLE_FEATURES).toEqual(['posts', 'stories', 'wishes', 'reactions', 'music']);
    });
});

const BOX = DEFAULT_QR_CARD_FEATURES;
const SIZE = 26;

function centreOf(tiles: { x: number; scale: number }[]) {
    const left = tiles[0].x;
    const right = tiles[tiles.length - 1].x + SIZE * tiles[0].scale;
    return (left + right) / 2;
}

describe('layoutFeatureTiles', () => {
    const five: QrCardFeature[] = ['posts', 'stories', 'wishes', 'reactions', 'music'];

    it('places nothing for no tiles', () => {
        expect(layoutFeatureTiles([], BOX)).toEqual([]);
    });

    it('puts five in rows of 3 and 2, each centred, with fixed tilts', () => {
        const tiles = layoutFeatureTiles(five, BOX);
        expect(tiles.map((tile) => tile.feature)).toEqual(five);
        expect(tiles.map((tile) => tile.tilt)).toEqual([-5, 3, -3, 4, -4]);
        expect(new Set(tiles.slice(0, 3).map((tile) => tile.y)).size).toBe(1);
        expect(tiles[3].y).toBe(tiles[4].y);
        expect(tiles[3].y).toBeGreaterThan(tiles[0].y);
        expect(centreOf(tiles.slice(0, 3))).toBeCloseTo(BOX.x + BOX.width / 2, 0);
        expect(centreOf(tiles.slice(3))).toBeCloseTo(BOX.x + BOX.width / 2, 0);
    });

    it('keeps every tile and label inside the box', () => {
        for (let count = 1; count <= 5; count++) {
            for (const tile of layoutFeatureTiles(five.slice(0, count), BOX)) {
                expect(tile.x).toBeGreaterThanOrEqual(BOX.x - 0.1);
                expect(tile.y).toBeGreaterThanOrEqual(BOX.y - 0.1);
                expect(tile.x + SIZE * tile.scale).toBeLessThanOrEqual(BOX.x + BOX.width + 0.1);
                expect(tile.y + (SIZE + 5) * tile.scale).toBeLessThanOrEqual(BOX.y + BOX.height + 0.1);
            }
        }
    });

    it('makes one row for up to three tiles, and grows them no more than 1.2×', () => {
        const two = layoutFeatureTiles(five.slice(0, 2), BOX);
        expect(two[0].y).toBe(two[1].y);
        expect(layoutFeatureTiles(five.slice(0, 1), BOX)[0].scale).toBe(1.2);
    });

    it('shrinks the tiles to fit a small box', () => {
        const tiles = layoutFeatureTiles(five, { x: 8, y: 100, width: 40, height: 25 });
        expect(tiles[0].scale).toBeLessThan(0.5);
    });
});
```

- [ ] **Step 2: Run them to see them fail**

```bash
npx vitest run lib/qrCardFeatures.test.ts
```

Expected: FAIL, cannot resolve `@/lib/qrCardFeatures`.

- [ ] **Step 3: Implement**

`lib/qrCardFeatures.ts`:

```ts
import type { EventModuleResponseDto, ModuleKeyConvention } from '@/lib/api/types';
import type { Rect } from '@/lib/qrCardLayout';

// The picture tiles under the event card's code: what guests can do after scanning.
export type QrCardFeature = 'posts' | 'stories' | 'wishes' | 'reactions' | 'music';

// The words a tile prints, already in the host's language: its label, and the sample text it shows.
export type QrCardFeatureTexts = {
    labels: Record<QrCardFeature, string>;
    wish: string;
    songs: [string, string, string];
};

export const QR_CARD_FEATURE_LIMIT = 5;

// In print order. A tile shows when the plan makes any of its modules available. RSVP never shows.
const FEATURE_RULES: { feature: QrCardFeature; modules: ModuleKeyConvention[] }[] = [
    { feature: 'posts', modules: ['posts', 'gallery'] },
    { feature: 'stories', modules: ['stories'] },
    { feature: 'wishes', modules: ['wishbook'] },
    { feature: 'reactions', modules: ['posts'] },
    { feature: 'music', modules: ['playlist'] },
];

// What the admin previews show: a full plan.
export const QR_CARD_SAMPLE_FEATURES: QrCardFeature[] = FEATURE_RULES.map((rule) => rule.feature).slice(0, QR_CARD_FEATURE_LIMIT);

export function qrCardFeatures(modules: Pick<EventModuleResponseDto, 'moduleKey' | 'isAvailable'>[]): QrCardFeature[] {
    const available = new Set(modules.filter((module) => module.isAvailable).map((module) => module.moduleKey));
    return FEATURE_RULES.filter((rule) => rule.modules.some((key) => available.has(key)))
        .map((rule) => rule.feature)
        .slice(0, QR_CARD_FEATURE_LIMIT);
}

// A tile draws in a SIZE mm square with its label in the LABEL mm under it, then scales to fit the box.
export const QR_CARD_TILE = { size: 26, label: 5, gap: 3, rowGap: 2, maxScale: 1.2 } as const;
// Each place's tilt in degrees, like stickers.
const TILTS = [-5, 3, -3, 4, -4];

export type PlacedFeatureTile = { feature: QrCardFeature; x: number; y: number; scale: number; tilt: number };

function round(value: number, step: number): number {
    return Math.round(value / step) * step;
}

function rowWidth(count: number): number {
    return count * QR_CARD_TILE.size + (count - 1) * QR_CARD_TILE.gap;
}

// Rows of 3 then 2 (1–3 tiles make one row), each centred, the block centred in the box. All tiles share
// one scale: the largest that fits, up to maxScale.
export function layoutFeatureTiles(features: QrCardFeature[], box: Rect): PlacedFeatureTile[] {
    if (features.length === 0) return [];
    const { size, label, gap, rowGap, maxScale } = QR_CARD_TILE;
    const rows = features.length <= 3 ? [features] : [features.slice(0, 3), features.slice(3)];
    const cellHeight = size + label;
    const contentWidth = Math.max(...rows.map((row) => rowWidth(row.length)));
    const contentHeight = rows.length * cellHeight + (rows.length - 1) * rowGap;
    const scale = Math.min(maxScale, box.width / contentWidth, box.height / contentHeight);
    const top = box.y + (box.height - contentHeight * scale) / 2;
    let place = 0;
    return rows.flatMap((row, rowIndex) => {
        const left = box.x + (box.width - rowWidth(row.length) * scale) / 2;
        const y = top + rowIndex * (cellHeight + rowGap) * scale;
        return row.map((feature, column) => ({
            feature,
            x: round(left + column * (size + gap) * scale, 0.1),
            y: round(y, 0.1),
            scale: round(scale, 0.001),
            tilt: TILTS[place++],
        }));
    });
}
```

`ModuleKeyConvention` is exported from `lib/api/types.ts` (line ~45). `EventModuleResponseDto.moduleKey` is a `string`, so `available.has(key)` type-checks.

Floating rounding: `round(value, 0.1)` can give `12.500000000000002`. If a test fails on that, use `Math.round(value * 10) / 10` and `Math.round(value * 1000) / 1000` instead (same as `roundMm`).

- [ ] **Step 4: Run the tests**

```bash
npx vitest run lib/qrCardFeatures.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/qrCardFeatures.ts lib/qrCardFeatures.test.ts
git commit -m "KAN-215: pick and place the QR card's picture tiles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 5: Tile drawings

Each tile draws in a 26 × 26 mm local square, SVG attributes only (no classes, no `foreignObject`). Photos are `<image>` elements with app-relative URLs from `QR_JOIN_PREVIEW_IMAGES`; `inlineImages` already inlines them for export. Shapes that need clipping use ids built from the `ids` prefix, so two cards on one page (print copies) stay valid.

**Files:**
- Create: `components/qrCard/features/tileProps.ts`
- Create: `components/qrCard/features/QrCardPostsTile.tsx`
- Create: `components/qrCard/features/QrCardStoriesTile.tsx`
- Create: `components/qrCard/features/QrCardWishesTile.tsx`
- Create: `components/qrCard/features/QrCardReactionsTile.tsx`
- Create: `components/qrCard/features/QrCardMusicTile.tsx`

- [ ] **Step 1: Shared props**

`components/qrCard/features/tileProps.ts`:

```ts
import type { QrCardFeatureTexts } from '@/lib/qrCardFeatures';

// What every tile gets: the card's translated sample text, and a prefix for its clip-path ids.
export type QrCardTileProps = { texts: QrCardFeatureTexts; ids: string };

export const TILE_SIZE = 26;
export const TILE_PAPER = '#FFFFFF';
export const TILE_INK = '#1F1A17';
export const TILE_MUTED = '#5B514B';
export const TILE_ACCENT = '#F0645A';
export const TILE_ACCENT_SOFT = '#FFF1EC';
export const TILE_SERIF = "Georgia, 'Times New Roman', serif";
```

- [ ] **Step 2: Posts**

`components/qrCard/features/QrCardPostsTile.tsx`:

```tsx
import { TILE_INK, TILE_PAPER, TILE_SIZE } from '@/components/qrCard/features/tileProps';
import { QR_CARD_FONT } from '@/lib/qrCard';
import { QR_JOIN_PREVIEW_IMAGES } from '@/lib/qrLanding';

// A 24-unit heart (Material "favorite").
const HEART =
    'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

// A guest photo in a polaroid frame, with a heart count under it.
export function QrCardPostsTile() {
    return (
        <>
            {/* Frame */}
            <rect width={TILE_SIZE} height={TILE_SIZE} rx={1} fill={TILE_PAPER} />
            {/* Photo */}
            <image href={QR_JOIN_PREVIEW_IMAGES.post} x={1.8} y={1.8} width={22.4} height={17.4} preserveAspectRatio="xMidYMid slice" />
            {/* Likes */}
            <path d={HEART} transform="translate(2.2 20.6) scale(0.15)" fill="#E8466C" />
            <text x={6.3} y={23.6} fontSize={2.6} fontFamily={QR_CARD_FONT} fontWeight={700} fill={TILE_INK}>
                24
            </text>
        </>
    );
}
```

"24" is a number, not copy, so it isn't localized (same as the vote counts below).

- [ ] **Step 3: Stories**

`components/qrCard/features/QrCardStoriesTile.tsx`:

```tsx
import { TILE_ACCENT, TILE_PAPER, type QrCardTileProps } from '@/components/qrCard/features/tileProps';
import { QR_JOIN_PREVIEW_IMAGES } from '@/lib/qrLanding';

const BARS = [7, 11.1, 15.2];

// A tall story frame: a sunset photo, progress bars along the top and a ringed profile picture.
export function QrCardStoriesTile({ ids }: Pick<QrCardTileProps, 'ids'>) {
    const photoClip = `${ids}-story`;
    const ringClip = `${ids}-ring`;
    return (
        <>
            <defs>
                <clipPath id={photoClip}>
                    <rect x={6} y={1} width={14} height={24} rx={1.4} />
                </clipPath>
                <clipPath id={ringClip}>
                    <circle cx={9.2} cy={5.8} r={1.9} />
                </clipPath>
            </defs>
            {/* Frame */}
            <rect x={5} width={16} height={26} rx={2} fill={TILE_PAPER} />
            {/* Photo */}
            <image
                href={QR_JOIN_PREVIEW_IMAGES.photos[0]}
                x={6}
                y={1}
                width={14}
                height={24}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${photoClip})`}
            />
            {/* Progress */}
            {BARS.map((x, index) => (
                <rect key={x} x={x} y={2} width={3.8} height={0.5} rx={0.25} fill={TILE_PAPER} opacity={index === 0 ? 1 : 0.5} />
            ))}
            {/* Profile */}
            <circle cx={9.2} cy={5.8} r={2.3} fill="none" stroke={TILE_ACCENT} strokeWidth={0.5} />
            <image
                href={QR_JOIN_PREVIEW_IMAGES.stories[0]}
                x={7.3}
                y={3.9}
                width={3.8}
                height={3.8}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${ringClip})`}
            />
        </>
    );
}
```

- [ ] **Step 4: Wishes**

`components/qrCard/features/QrCardWishesTile.tsx`:

```tsx
import { type QrCardTileProps, TILE_INK, TILE_SERIF, TILE_SIZE } from '@/components/qrCard/features/tileProps';
import { fitText } from '@/lib/qrCard';

const LINE_HEIGHT = 1.25;

// A note card with the sample wish in italic serif, centred.
export function QrCardWishesTile({ texts }: Pick<QrCardTileProps, 'texts'>) {
    const wish = fitText(texts.wish, { width: 20, maxLines: 4, maxSize: 3.2, minSize: 2, maxHeight: 18 });
    const lineHeight = wish.fontSize * LINE_HEIGHT;
    const first = TILE_SIZE / 2 - (wish.lines.length * lineHeight) / 2 + wish.fontSize * 0.85;
    return (
        <>
            {/* Card */}
            <rect width={TILE_SIZE} height={TILE_SIZE} rx={1} fill="#FFFDF8" />
            {/* Wish */}
            <text x={TILE_SIZE / 2} textAnchor="middle" fontSize={wish.fontSize} fontFamily={TILE_SERIF} fontStyle="italic" fill={TILE_INK}>
                {wish.lines.map((line, index) => (
                    <tspan key={index} x={TILE_SIZE / 2} y={first + index * lineHeight}>
                        {line}
                    </tspan>
                ))}
            </text>
        </>
    );
}
```

`fitText` is exported from `lib/qrCard.ts:311` and measures with Arial widths; italic serif runs a little narrower, so the text fits.

- [ ] **Step 5: Reactions**

First check whether the app already has a reaction emoji list:

```bash
git grep -n "😍" -- lib components | head
```

If a shared constant lists ❤️ 😍 🎉 😂, import those four from it. Otherwise use the constant below.

`components/qrCard/features/QrCardReactionsTile.tsx`:

```tsx
import { TILE_ACCENT_SOFT, TILE_PAPER, TILE_SIZE } from '@/components/qrCard/features/tileProps';

// Reaction bubbles, as the app's reactions show them. They print in the device's emoji font, like the app.
const BUBBLES = [
    { emoji: '❤️', x: 8, y: 8.5, r: 5.2 },
    { emoji: '😍', x: 18.5, y: 8, r: 4.4 },
    { emoji: '🎉', x: 9.5, y: 19, r: 4.4 },
    { emoji: '😂', x: 18.8, y: 18.5, r: 5 },
];

export function QrCardReactionsTile() {
    return (
        <>
            {/* Card */}
            <rect width={TILE_SIZE} height={TILE_SIZE} rx={1} fill={TILE_PAPER} />
            {/* Bubbles */}
            {BUBBLES.map((bubble) => (
                <g key={bubble.emoji}>
                    <circle cx={bubble.x} cy={bubble.y} r={bubble.r} fill={TILE_ACCENT_SOFT} />
                    <text x={bubble.x} y={bubble.y + bubble.r * 0.38} textAnchor="middle" fontSize={bubble.r * 1.1}>
                        {bubble.emoji}
                    </text>
                </g>
            ))}
        </>
    );
}
```

- [ ] **Step 6: Music**

`components/qrCard/features/QrCardMusicTile.tsx`:

```tsx
import {
    type QrCardTileProps,
    TILE_ACCENT,
    TILE_ACCENT_SOFT,
    TILE_INK,
    TILE_MUTED,
    TILE_PAPER,
    TILE_SIZE,
} from '@/components/qrCard/features/tileProps';
import { fitText, QR_CARD_FONT } from '@/lib/qrCard';
import { QR_JOIN_PREVIEW_IMAGES } from '@/lib/qrLanding';

const VOTES = [12, 9, 7];
const ROW_TOP = 3;
const ROW_STEP = 7.4;
const ROW_HEIGHT = 6.4;

// A short playlist: three songs with cover thumbnails and vote pills, the top one highlighted.
export function QrCardMusicTile({ texts }: Pick<QrCardTileProps, 'texts'>) {
    return (
        <>
            {/* Card */}
            <rect width={TILE_SIZE} height={TILE_SIZE} rx={1} fill={TILE_PAPER} />
            {/* Songs */}
            {texts.songs.map((song, index) => {
                const top = ROW_TOP + index * ROW_STEP;
                const leading = index === 0;
                const title = fitText(song, { width: 10.6, maxLines: 1, maxSize: 2.4, minSize: 1.6 });
                return (
                    <g key={index}>
                        {leading && <rect x={1.6} y={top} width={22.8} height={ROW_HEIGHT} rx={1.2} fill={TILE_ACCENT_SOFT} />}
                        <image
                            href={QR_JOIN_PREVIEW_IMAGES.photos[1]}
                            x={2.4}
                            y={top + 0.9}
                            width={4.6}
                            height={4.6}
                            preserveAspectRatio="xMidYMid slice"
                        />
                        <text x={8} y={top + 4} fontSize={title.fontSize} fontFamily={QR_CARD_FONT} fontWeight={700} fill={TILE_INK}>
                            {title.lines[0] ?? ''}
                        </text>
                        <rect x={19.2} y={top + 1.5} width={4.4} height={3.4} rx={1.7} fill={leading ? TILE_ACCENT : '#F2EEEA'} />
                        <text
                            x={21.4}
                            y={top + 3.95}
                            textAnchor="middle"
                            fontSize={2.2}
                            fontFamily={QR_CARD_FONT}
                            fontWeight={700}
                            fill={leading ? TILE_PAPER : TILE_MUTED}
                        >
                            {VOTES[index]}
                        </text>
                    </g>
                );
            })}
        </>
    );
}
```

- [ ] **Step 7: Type-check and lint the new files**

```bash
npx tsc --noEmit
npx eslint components/qrCard/features
```

Expected: PASS. If `react/jsx-no-bind` or import-order rules complain, fix as the rule says.

- [ ] **Step 8: Commit**

```bash
git add components/qrCard/features
git commit -m "KAN-215: draw the QR card's picture tiles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 6: Draw the tiles on the card

**Files:**
- Create: `components/qrCard/features/QrCardFeatureTiles.tsx`
- Modify: `components/qrCard/QrCardSvg.tsx`
- Test: `components/qrCard/QrCardSvg.test.tsx`
- Modify: `components/qrCard/QrCardSvg.scan.test.tsx`

- [ ] **Step 1: Write the failing component test**

`components/qrCard/QrCardSvg.test.tsx`:

```tsx
// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { QrCardSvg } from '@/components/qrCard/QrCardSvg';
import { PLAIN_FEATURES_QR_CARD_STYLE, PLAIN_QR_CARD_STYLE } from '@/lib/qrCard';
import type { QrCardFeature, QrCardFeatureTexts } from '@/lib/qrCardFeatures';

const TEXTS: QrCardFeatureTexts = {
    labels: { posts: 'Posts', stories: 'Stories', wishes: 'Wishes', reactions: 'Reactions', music: 'Music' },
    wish: 'So happy to celebrate with you!',
    songs: ['September', 'Dancing Queen', 'Perfect'],
};

function markup(features: QrCardFeature[], style = PLAIN_FEATURES_QR_CARD_STYLE) {
    return renderToStaticMarkup(
        <QrCardSvg
            style={style}
            url="https://storywall.gr/q/7Hk2pQx9Lm"
            title="Maria & Nikos"
            lines={[{ text: 'Scan to join', tone: 'body' }]}
            label="QR card"
            features={features}
            featureTexts={TEXTS}
        />,
    );
}

function count(html: string, pattern: RegExp) {
    return html.match(pattern)?.length ?? 0;
}

describe('QrCardSvg tiles', () => {
    it('draws one tile and one label per feature', () => {
        const html = markup(['posts', 'stories', 'music']);
        expect(count(html, /data-qr-feature="/g)).toBe(3);
        expect(html).toContain('>Posts<');
        expect(html).toContain('>Stories<');
        expect(html).toContain('>Music<');
        expect(html).not.toContain('>Wishes<');
    });

    it('draws nothing for no features', () => {
        expect(count(markup([]), /data-qr-feature="/g)).toBe(0);
    });

    it('draws nothing on a layout without a tiles box', () => {
        expect(count(markup(['posts'], PLAIN_QR_CARD_STYLE), /data-qr-feature="/g)).toBe(0);
    });

    it('draws the tiles before the code, so the code stays on top', () => {
        const html = markup(['posts']);
        expect(html.indexOf('data-qr-feature')).toBeGreaterThan(-1);
        expect(html.indexOf('data-qr-feature')).toBeLessThan(html.indexOf('data-qr-code'));
    });
});
```

`data-qr-code` is a marker Step 5 puts on the code's `<path>`.

- [ ] **Step 2: Run it to see it fail**

```bash
npx vitest run components/qrCard/QrCardSvg.test.tsx
```

Expected: FAIL, `PLAIN_FEATURES_QR_CARD_STYLE` is not exported.

- [ ] **Step 3: Plain style with tiles**

In `lib/qrCard.ts`, add `FEATURES_QR_CARD_LAYOUT` to the import from `@/lib/qrCardLayout`, and after `PLAIN_QR_CARD_STYLE`:

```ts
// Plain on the event's QR page: the layout with picture tiles.
export const PLAIN_FEATURES_QR_CARD_STYLE: QrCardStyle = { ...PLAIN_QR_CARD_STYLE, layout: FEATURES_QR_CARD_LAYOUT };
```

Change `qrCardStyleOf`:

```ts
// `fallback` is the layout for a template without a saved one.
export function qrCardStyleOf(template: QrCardTemplateDto, fallback: QrCardLayout = DEFAULT_QR_CARD_LAYOUT): QrCardStyle {
```

and its `layout:` line to `layout: qrCardLayoutOf(template.layout, fallback),`. Import the `QrCardLayout` type from `@/lib/qrCardLayout` if `lib/qrCard.ts` doesn't already.

- [ ] **Step 4: The tiles group**

`components/qrCard/features/QrCardFeatureTiles.tsx`:

```tsx
import type { ReactNode } from 'react';

import { QrCardMusicTile } from '@/components/qrCard/features/QrCardMusicTile';
import { QrCardPostsTile } from '@/components/qrCard/features/QrCardPostsTile';
import { QrCardReactionsTile } from '@/components/qrCard/features/QrCardReactionsTile';
import { QrCardStoriesTile } from '@/components/qrCard/features/QrCardStoriesTile';
import { QrCardWishesTile } from '@/components/qrCard/features/QrCardWishesTile';
import { type QrCardTileProps, TILE_SIZE } from '@/components/qrCard/features/tileProps';
import { QR_CARD_FONT } from '@/lib/qrCard';
import { layoutFeatureTiles, QR_CARD_TILE, type QrCardFeature, type QrCardFeatureTexts } from '@/lib/qrCardFeatures';
import type { Rect } from '@/lib/qrCardLayout';

const TILES: Record<QrCardFeature, (props: QrCardTileProps) => ReactNode> = {
    posts: QrCardPostsTile,
    stories: QrCardStoriesTile,
    wishes: QrCardWishesTile,
    reactions: QrCardReactionsTile,
    music: QrCardMusicTile,
};

const LABEL_SIZE = 3.2;

// The tiles in the layout's box: each tilted with a soft shadow, its label straight under it in the
// card's line colour.
export function QrCardFeatureTiles({
    features,
    box,
    texts,
    labelColor,
    ids,
}: {
    features: QrCardFeature[];
    box: Rect;
    texts: QrCardFeatureTexts;
    labelColor: string;
    ids: string;
}) {
    const shadow = `${ids}-shadow`;
    return (
        <g>
            <defs>
                <filter id={shadow} x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx={0} dy={0.6} stdDeviation={0.7} floodColor="#000000" floodOpacity={0.22} />
                </filter>
            </defs>
            {layoutFeatureTiles(features, box).map((tile) => {
                const Tile = TILES[tile.feature];
                return (
                    <g key={tile.feature} data-qr-feature={tile.feature} transform={`translate(${tile.x} ${tile.y}) scale(${tile.scale})`}>
                        {/* Tile */}
                        <g transform={`rotate(${tile.tilt} ${TILE_SIZE / 2} ${TILE_SIZE / 2})`} filter={`url(#${shadow})`}>
                            <Tile texts={texts} ids={`${ids}-${tile.feature}`} />
                        </g>
                        {/* Label */}
                        <text
                            x={TILE_SIZE / 2}
                            y={TILE_SIZE + QR_CARD_TILE.label - 0.9}
                            textAnchor="middle"
                            fontSize={LABEL_SIZE}
                            fontFamily={QR_CARD_FONT}
                            fontWeight={700}
                            fill={labelColor}
                        >
                            {texts.labels[tile.feature]}
                        </text>
                    </g>
                );
            })}
        </g>
    );
}
```

Tiles that don't use `texts` or `ids` declare `Pick<…>` props or none; a component typed `() => ReactNode` is assignable to `(props: QrCardTileProps) => ReactNode`, so the record type-checks.

- [ ] **Step 5: Wire it into QrCardSvg**

In `components/qrCard/QrCardSvg.tsx`:

Imports:

```tsx
import { QrCardFeatureTiles } from '@/components/qrCard/features/QrCardFeatureTiles';
import type { QrCardFeature, QrCardFeatureTexts } from '@/lib/qrCardFeatures';
```

After `const NO_FIELDS ...`:

```tsx
const NO_FEATURES: QrCardFeature[] = [];
```

Props: add `features = NO_FEATURES,` and `featureTexts,` to the destructuring, and to the type:

```tsx
    // The picture tiles to draw in the layout's tiles box, with their words. Callers without tiles leave both out.
    features?: QrCardFeature[];
    featureTexts?: QrCardFeatureTexts;
```

After `const titleId = useId();`:

```tsx
    // useId's colons and guillemets aren't safe inside url(#…).
    const ids = `qr${titleId.replace(/[^A-Za-z0-9_-]/g, '')}`;
```

In the JSX, after the `{/* Fields */}` block and before `{/* Code */}`:

```tsx
            {/* Tiles */}
            {layout.features && featureTexts && features.length > 0 && (
                <QrCardFeatureTiles features={features} box={layout.features} texts={featureTexts} labelColor={style.textColor} ids={ids} />
            )}
```

Give the code path a marker: `<path data-qr-code="" d={code.d} … />`.

Update the component's comment to mention the tiles: "…then the title, the lines, the added fields and the picture tiles, and the code on top…".

- [ ] **Step 6: Run the component test**

```bash
npx vitest run components/qrCard/QrCardSvg.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Scan test at 46 mm**

In `components/qrCard/QrCardSvg.scan.test.tsx`, add a `features` case so the smaller code still decodes with the tiles drawn. Import `PLAIN_FEATURES_QR_CARD_STYLE` and `QR_CARD_SAMPLE_FEATURES`, give `scan` an optional `features` argument passed through with sample texts, and add:

```tsx
const TEXTS = {
    labels: { posts: 'Posts', stories: 'Stories', wishes: 'Wishes', reactions: 'Reactions', music: 'Music' },
    wish: 'So happy to celebrate with you!',
    songs: ['September', 'Dancing Queen', 'Perfect'] as [string, string, string],
};

describe('QrCardSvg scans with picture tiles', () => {
    it.each(CASES)('a $link link at 46 mm, logo $centerLogo', ({ url, centerLogo }) => {
        expect(scan(url, { ...PLAIN_FEATURES_QR_CARD_STYLE, centerLogo }, 840, QR_CARD_SAMPLE_FEATURES, TEXTS)).toBe(url);
    });
});
```

with `scan` changed to:

```tsx
function scan(url: string, style: Partial<QrCardStyle>, width = 840, features: QrCardFeature[] = [], featureTexts?: QrCardFeatureTexts): string | null {
    const markup = renderToStaticMarkup(
        <QrCardSvg
            style={{ ...PLAIN_QR_CARD_STYLE, ...style }}
            url={url}
            title="Maria & Nikos"
            lines={[{ text: 'Scan to join', tone: 'body' }]}
            label="QR card"
            features={features}
            featureTexts={featureTexts}
        />,
    );
```

Resvg can't load the relative `/landing/...` image URLs in the test; it skips them, which is fine: the test checks the code, not the photos.

```bash
npx vitest run components/qrCard/QrCardSvg.scan.test.tsx
```

Expected: PASS for all cases. If the long link fails at 46 mm with the logo, stop and tell the owner: the code may need to stay larger (the minimum code size is 30 mm, but a long link packs more modules).

- [ ] **Step 8: Commit**

```bash
git add components/qrCard lib/qrCard.ts
git commit -m "KAN-215: QR card draws its picture tiles under the code

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 7: Messages and the texts hook

**Files:**
- Modify: `messages/en.json` (`QrCardPage`, ~line 6870; `AdminPage.qrCards.layout`, ~line 5634)
- Modify: `messages/el.json` (same paths)
- Create: `hooks/useQrCardFeatureTexts.ts`

- [ ] **Step 1: Add the approved strings**

`messages/en.json`, inside `QrCardPage` after `"lines": { … }`:

```json
        "tiles": {
            "posts": "Posts",
            "stories": "Stories",
            "wishes": "Wishes",
            "reactions": "Reactions",
            "music": "Music",
            "songTwo": "Dancing Queen",
            "songThree": "Perfect"
        }
```

`messages/el.json`, same place:

```json
        "tiles": {
            "posts": "Αναρτήσεις",
            "stories": "Ιστορίες",
            "wishes": "Ευχές",
            "reactions": "Αντιδράσεις",
            "music": "Μουσική",
            "songTwo": "Dancing Queen",
            "songThree": "Perfect"
        }
```

`messages/en.json`, `AdminPage.qrCards.layout.elements`: add `"features": "Pictures"` after `"lines"`. After `"removeTitle"` add `"removeFeatures": "Remove pictures"`, and after `"restoreTitle"` add `"restoreFeatures": "Add pictures back"`.

`messages/el.json`, same keys: `"features": "Εικόνες"`, `"removeFeatures": "Αφαίρεση εικόνων"`, `"restoreFeatures": "Επαναφορά εικόνων"`.

Mind the commas so the JSON stays valid.

- [ ] **Step 2: Check the catalogs**

```bash
node -e "for (const l of ['en','el']) { const m = require('./messages/' + l + '.json'); console.log(l, Object.keys(m.QrCardPage.tiles).length, m.AdminPage.qrCards.layout.elements.features, m.AdminPage.qrCards.layout.removeFeatures, m.AdminPage.qrCards.layout.restoreFeatures) }"
```

Expected: `en 7 Pictures Remove pictures Add pictures back` and `el 7 Εικόνες Αφαίρεση εικόνων Επαναφορά εικόνων`. If the repo has a message-parity test (`git grep -ln "el.json" -- "*.test.ts"`), run it too.

- [ ] **Step 3: The texts hook**

`hooks/useQrCardFeatureTexts.ts`:

```ts
'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { QrCardFeatureTexts } from '@/lib/qrCardFeatures';

// The tiles' labels and sample text in the host's language. The wish and the first song are the scan
// page's own samples.
export function useQrCardFeatureTexts(): QrCardFeatureTexts {
    const t = useTranslations('QrCardPage.tiles');
    const preview = useTranslations('QrCodePage.preview');
    return useMemo(
        () => ({
            labels: { posts: t('posts'), stories: t('stories'), wishes: t('wishes'), reactions: t('reactions'), music: t('music') },
            wish: preview('wishText'),
            songs: [preview('songTitle'), t('songTwo'), t('songThree')],
        }),
        [t, preview],
    );
}
```

- [ ] **Step 4: Type-check and commit**

```bash
npx tsc --noEmit
git add messages/en.json messages/el.json hooks/useQrCardFeatureTexts.ts
git commit -m "KAN-215: words for the QR card's picture tiles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 8: The event's QR page prints the tiles

**Files:**
- Modify: `hooks/useQrCardDesigner.ts`
- Modify: `hooks/useQrCardScreen.ts`
- Modify: `components/qrCard/QrCardScreen.tsx:29-33`
- Modify: `components/qrCard/QrCardDesigner.tsx:18-40`

- [ ] **Step 1: Designer picks the layout**

In `hooks/useQrCardDesigner.ts`, import `PLAIN_FEATURES_QR_CARD_STYLE` from `@/lib/qrCard`. Add an optional `withFeatures` argument:

```ts
export function useQrCardDesigner({
    templates,
    defaults,
    lineKey,
    withFeatures = false,
}: {
    templates: QrCardTemplateDto[];
    defaults: QrCardDefaults;
    lineKey: QrCardWordingKey | null;
    // The event's card: Plain and unsaved templates get the layout with picture tiles. The gift card leaves it off.
    withFeatures?: boolean;
}) {
```

Replace the `style` line:

```ts
    const plain = withFeatures ? PLAIN_FEATURES_QR_CARD_STYLE : PLAIN_QR_CARD_STYLE;
    const style = useMemo(() => (picked ? qrCardStyleOf(picked, plain.layout) : plain), [picked, plain]);
```

The gift card (`hooks/useGiftCardPrint.ts`) doesn't pass `withFeatures`, so it keeps today's layout.

- [ ] **Step 2: Screen hook computes the tiles**

In `hooks/useQrCardScreen.ts`:

```ts
import { useCallback, useEffect, useMemo } from 'react';

import { useQrCardFeatureTexts } from '@/hooks/useQrCardFeatureTexts';
import { qrCardFeatures } from '@/lib/qrCardFeatures';
```

Pass `withFeatures: true` to `useQrCardDesigner`. After `const lines …`:

```ts
    const features = useMemo(() => qrCardFeatures(activeEvent.modules), [activeEvent.modules]);
    const featureTexts = useQrCardFeatureTexts();
```

Return `features` and `featureTexts` next to `lines`.

- [ ] **Step 3: Pass them through**

`components/qrCard/QrCardScreen.tsx`, on `<QrCardDesigner …>` after `lines={screen.lines}`:

```tsx
                    features={screen.features}
                    featureTexts={screen.featureTexts}
```

`components/qrCard/QrCardDesigner.tsx`: add `features` and `featureTexts` to the props (both optional, typed `QrCardFeature[]` and `QrCardFeatureTexts` from `@/lib/qrCardFeatures`), and to `card`:

```tsx
    const card = { style: designer.style, url, title: designer.text.title, lines, fields: designer.fieldTexts, label, features, featureTexts };
```

`QrCardPrintCopies` spreads `card` into each copy, so print copies get the tiles with no change there.

- [ ] **Step 4: Check it**

```bash
npx tsc --noEmit
npx vitest run components/qrCard hooks lib/qrCard
```

Expected: PASS.

- [ ] **Step 5: Look at it in the app**

Use the run skill / an existing dev server. Per memory: never `preview_start {name}` in this repo; only `preview_start {url: "http://localhost:3000/"}` against a server already running from this worktree. Signed-in checks need the local test login: ask the owner for it.

Open an event's QR card page (`/events/<id>/…/qr/<qrLinkId>` via the event's QR page). Check at 375 px and desktop:
- Plain shows the smaller code, "Scan to join" under it, then the tiles.
- A plan with only the gallery shows the Posts tile alone, centred.
- The gift card print page looks exactly as before.

- [ ] **Step 6: Commit**

```bash
git add hooks/useQrCardDesigner.ts hooks/useQrCardScreen.ts components/qrCard/QrCardScreen.tsx components/qrCard/QrCardDesigner.tsx
git commit -m "KAN-215: the event's QR card prints the plan's picture tiles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 9: Admin previews show the tiles

**Files:**
- Modify: `components/admin/qrCards/QrCardTemplatePreview.tsx`
- Modify: `components/admin/qrCards/layoutEditor/QrCardLayoutCanvas.tsx`
- Modify: `hooks/useQrCardLook.ts:66`
- Modify: `hooks/useQrCardTemplateDrawer.ts:89-93`

- [ ] **Step 1: Unsaved templates start from the layout with tiles**

`hooks/useQrCardLook.ts:66`: `layout: qrCardLayoutOf(template.layout, FEATURES_QR_CARD_LAYOUT),` (import it from `@/lib/qrCardLayout`).

`hooks/useQrCardTemplateDrawer.ts:89`: same change. Line 93: `PLAIN_QR_CARD_STYLE` → `PLAIN_FEATURES_QR_CARD_STYLE` (import from `@/lib/qrCard`, drop the unused import).

- [ ] **Step 2: Previews draw the main five**

`components/admin/qrCards/QrCardTemplatePreview.tsx`: import `useQrCardFeatureTexts` and `QR_CARD_SAMPLE_FEATURES`. In the component body: `const featureTexts = useQrCardFeatureTexts();`. On `<QrCardSvg>` add:

```tsx
                    features={QR_CARD_SAMPLE_FEATURES}
                    featureTexts={featureTexts}
```

`components/admin/qrCards/layoutEditor/QrCardLayoutCanvas.tsx`: same two props on its `<QrCardSvg>`, with the hook call in the component body.

The admin catalog is wrapped in `NextIntlClientProvider` with the whole catalog, so `QrCardPage.tiles` and `QrCodePage.preview` resolve there. Check by opening the admin QR card templates page.

- [ ] **Step 3: Check and commit**

```bash
npx tsc --noEmit
npx vitest run components/admin hooks
git add components/admin/qrCards hooks/useQrCardLook.ts hooks/useQrCardTemplateDrawer.ts
git commit -m "KAN-215: admin QR card previews show the picture tiles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 10: Layout editor: select, move, remove, add back

**Files:**
- Modify: `hooks/useQrCardLayoutEditor.ts:82, 224-233, 239, 317`
- Modify: `components/admin/qrCards/layoutEditor/QrCardLayoutInspector.tsx:138-148`
- Modify: `components/admin/qrCards/layoutEditor/QrCardLayoutAddBar.tsx:27-32`

Selecting, moving and resizing already work through `qrCardElements`, `elementRect`, `moveElementTo` and `resizeElement`, which Task 3 taught about `features`. The canvas names the hit target with `elements.features` (Task 7).

- [ ] **Step 1: Write the failing hook test**

Check for an existing test: `git ls-files hooks | grep -i layoutEditor`. If `hooks/useQrCardLayoutEditor.test.ts(x)` exists, add to it; otherwise skip to Step 3 and rely on the `lib` tests from Task 3 (the hook only calls `setFeaturesShown`). If it exists, add:

```tsx
it('removes the selected tiles box and puts it back', () => {
    const { result } = renderEditor(); // use the file's existing render helper
    act(() => result.current.select('features'));
    act(() => result.current.removeSelected());
    expect(result.current.layout.features).toBeNull();
    act(() => result.current.restoreFeatures());
    expect(result.current.layout.features).toEqual(DEFAULT_QR_CARD_FEATURES);
    expect(result.current.selected).toBe('features');
});
```

Adapt `renderEditor` and `select` to the names the file already uses.

- [ ] **Step 2: Run it to see it fail**

```bash
npx vitest run hooks/useQrCardLayoutEditor
```

Expected: FAIL, `restoreFeatures` is not a function.

- [ ] **Step 3: Implement in the hook**

In `hooks/useQrCardLayoutEditor.ts`, import `FEATURES_QR_CARD_LAYOUT` and `setFeaturesShown` from `@/lib/qrCardLayout`.

Line 82: `const saved = useMemo(() => qrCardLayoutOf(template.layout, FEATURES_QR_CARD_LAYOUT), [template.layout]);`

`removeSelected`:

```ts
    const removeSelected = useCallback(() => {
        if (selected === 'title') setLayout((current) => setTitleShown(current, false));
        if (selected === 'features') setLayout((current) => setFeaturesShown(current, false));
        const id = selected ? fieldIdOf(selected) : null;
        if (id) setLayout((current) => removeField(current, id));
        setSelected(null);
    }, [selected]);
```

After `restoreTitle`:

```ts
    const restoreFeatures = useCallback(() => {
        setLayout((current) => setFeaturesShown(current, true));
        setSelected('features');
    }, []);
```

`reset`: `const reset = useCallback(() => setLayout(FEATURES_QR_CARD_LAYOUT), []);` and drop `DEFAULT_QR_CARD_LAYOUT` from the imports if it's now unused.

Return `restoreFeatures` next to `restoreTitle` (line ~317).

- [ ] **Step 4: Inspector remove button**

`components/admin/qrCards/layoutEditor/QrCardLayoutInspector.tsx`, the `{/* Remove */}` block:

```tsx
                    {/* Remove */}
                    {(selected === 'title' || selected === 'features' || selectedField) && (
                        <button
                            type="button"
                            onClick={editor.removeSelected}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-status-danger hover:bg-status-danger/10"
                        >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            {selected === 'title' ? t('removeTitle') : selected === 'features' ? t('removeFeatures') : t('removeField')}
                        </button>
                    )}
```

Check the panels above it: if the inspector shows a size/align panel by element (e.g. `selected === 'lines' && <LinesPanel/>`), `features` needs none. The position/size read-out from `elementRect` works as is.

- [ ] **Step 5: Add bar restore button**

`components/admin/qrCards/layoutEditor/QrCardLayoutAddBar.tsx`, after the `restoreTitle` button:

```tsx
                {editor.layout.features === null && (
                    <button type="button" onClick={editor.restoreFeatures} className={BUTTON_CLASS}>
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('restoreFeatures')}
                    </button>
                )}
```

- [ ] **Step 6: Check it**

```bash
npx tsc --noEmit
npx vitest run hooks components/admin lib/qrCardLayout.test.ts
```

Expected: PASS.

Open the admin layout editor in the browser (desktop first, it's admin UI), on a template without a saved layout and on one with a saved layout:
- Unsaved: tiles show at the new spot; select, drag and resize them; resizing stops at 40 × 25.
- Saved (no box): no tiles; "Add pictures back" puts them at x 8, y 79; move them clear of the code; save; reload; the box is still there (needs the Task 1 backend running locally).

- [ ] **Step 7: Commit**

```bash
git add hooks/useQrCardLayoutEditor.ts components/admin/qrCards/layoutEditor
git add hooks/useQrCardLayoutEditor.test.tsx 2>/dev/null || true
git commit -m "KAN-215: admins can move, remove and add back the QR card's pictures

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 11: Stories for the visual check

**Files:**
- Create: `components/qrCard/QrCardSvg.stories.tsx`

Read [docs/storybook.md](../../storybook.md) first. Stories are captured at 375 and 1280 px in English and Greek; the language comes from the toolbar, so `useQrCardFeatureTexts` follows it.

- [ ] **Step 1: Write the stories**

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs';

import { QrCardSvg } from '@/components/qrCard/QrCardSvg';
import { useQrCardFeatureTexts } from '@/hooks/useQrCardFeatureTexts';
import { PLAIN_FEATURES_QR_CARD_STYLE, type QrCardStyle } from '@/lib/qrCard';
import { QR_CARD_SAMPLE_FEATURES, type QrCardFeature, qrCardFeatures } from '@/lib/qrCardFeatures';

// A card as the host prints it, with the tiles' words in the toolbar's language.
function Card({ features, style = PLAIN_FEATURES_QR_CARD_STYLE }: { features: QrCardFeature[]; style?: QrCardStyle }) {
    const featureTexts = useQrCardFeatureTexts();
    return (
        <div className="mx-auto w-full max-w-xs">
            <QrCardSvg
                style={style}
                url="https://storywall.gr/q/7Hk2pQx9Lm"
                title="Maria & Nikos"
                lines={[{ text: 'Scan to join', tone: 'body' }]}
                label="QR card"
                features={features}
                featureTexts={featureTexts}
                className="block h-auto w-full"
            />
        </div>
    );
}

const meta = {
    title: 'QrCard/QrCardSvg',
    component: Card,
    tags: ['visual-mobile-only'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullPlan: Story = { args: { features: QR_CARD_SAMPLE_FEATURES } };
export const ThreeTiles: Story = { args: { features: ['posts', 'stories', 'wishes'] } };
export const TwoTiles: Story = { args: { features: ['posts', 'music'] } };
export const GalleryOnly: Story = { args: { features: qrCardFeatures([{ moduleKey: 'gallery', isAvailable: true }]) } };
export const NoTiles: Story = { args: { features: [] } };
```

The title, line and label strings here are story fixtures, not app copy (like the scan test's). If the repo's lint flags literal strings in stories, read them from the catalog with `useTranslations('QrCardPage')` (`lines.join`, `cardLabel`) instead.

`visual-mobile-only`: the card is a fixed-ratio SVG, so 1280 px adds nothing. If the owner prefers both sizes, drop the tag.

Check the Storybook framework import used by other stories (`git grep -h "from '@storybook" -- "*.stories.tsx" | sort | uniq -c`) and match it.

The layout editor story with `features` selected: if `components/admin/qrCards/layoutEditor/*.stories.tsx` exists, add one story there with `features` selected, following that file's setup. If none exists, skip it and note it in the PR.

- [ ] **Step 2: Build Storybook**

```bash
npm run build-storybook
```

Expected: builds. Open the stories with `npm run storybook` and look at each in English and Greek: labels don't clip, tiles don't run outside the card, Greek "Αναρτήσεις" and "Αντιδράσεις" fit under their tiles at 3.2 mm. If a Greek label is wider than the 26 mm tile, show the owner before changing the size.

- [ ] **Step 3: Commit**

```bash
git add components/qrCard/QrCardSvg.stories.tsx
git commit -m "KAN-215: stories for the QR card's picture tiles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 12: Backup tiles (Games, Gifts, Schedule): gated

Don't start this until the owner approves a mockup of the three backup tiles in the same picture style. Until then, `qrCardFeatures` returns only the main five.

- [ ] **Step 1: Mockup**

Render the three tiles next to the main five on a card (as the earlier mockups were made) and ask the owner in a popup to approve them.

- [ ] **Step 2: After approval, write the failing tests**

Add to `lib/qrCardFeatures.test.ts`:

```ts
    it('fills free places with backups in order, up to five', () => {
        expect(qrCardFeatures(plan('gallery', 'he_or_she', 'wishlist', 'schedule'))).toEqual(['posts', 'games', 'gifts', 'schedule']);
        expect(qrCardFeatures(plan('posts', 'stories', 'wishbook', 'quiz_polls', 'wishlist'))).toEqual([
            'posts',
            'stories',
            'wishes',
            'reactions',
            'games',
        ]);
    });

    it('drops backups when the main five fill the card', () => {
        expect(qrCardFeatures(plan('posts', 'stories', 'wishbook', 'playlist', 'quiz_polls'))).not.toContain('games');
    });
```

- [ ] **Step 3: Implement**

- Widen `QrCardFeature` with `'games' | 'gifts' | 'schedule'`, and `QrCardFeatureTexts` with the games question and answers, the gift line, IBAN and button, and the two schedule rows.
- Split `FEATURE_RULES` into `MAIN_RULES` (today's list) and `BACKUP_RULES`: games (`quiz_polls`, `he_or_she`), gifts (`wishlist`), schedule (`schedule`). `qrCardFeatures` returns the main matches, then the backup matches, sliced to 5. `QR_CARD_SAMPLE_FEATURES` stays the main five.
- Add the approved strings to `QrCardPage.tiles` in both catalogs (exact text in the spec's "Sample text" list; the schedule rows reuse `SchedulePage.host.sessionManagement.ceremony.title` and `SchedulePage.host.placeholders.title` with the times 18:00 and 20:00 as numbers).
- Draw `QrCardGamesTile`, `QrCardGiftsTile`, `QrCardScheduleTile` exactly as the approved mockup shows, register them in `TILES`, extend `useQrCardFeatureTexts`.
- Add a `NeedsBackups` story.

- [ ] **Step 4: Run, check, commit**

```bash
npx vitest run lib/qrCardFeatures.test.ts components/qrCard
npx tsc --noEmit
git add lib/qrCardFeatures.ts lib/qrCardFeatures.test.ts components/qrCard hooks/useQrCardFeatureTexts.ts messages/en.json messages/el.json
git commit -m "KAN-215: backup picture tiles fill free places on the QR card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 13: Verify and open the PR

- [ ] **Step 1: Export check**

Export a card with tiles to PNG and PDF from the QR card page (local dev, signed in). Open both files:
- every photo shows (no broken image box), so `inlineImages` inlined them;
- the shadows render. If the PNG drops `feDropShadow`, tell the owner and offer a plain offset grey rect behind each tile instead.

If `lib/qrCardExport.test.ts` exists, add a case: a card with `QR_CARD_SAMPLE_FEATURES` passes through `inlineImages` with no `href="/landing/` left.

- [ ] **Step 2: All checks**

```bash
npx tsc --noEmit
npx eslint .
npx vitest run
npm run build
```

All must be clean. A `next dev` run may append to `AGENTS.md`: revert it and stage files by name.

- [ ] **Step 3: SEO and copy check**

No routes, metadata or landing copy change. Check [docs/seo-guidelines.md](../../seo-guidelines.md) anyway and list any rule broken as a **BLOCKER** (expected: none). Confirm `git diff origin/staging -- messages` shows only the strings in the copy table.

- [ ] **Step 4: Bring the branch up to date and push**

```bash
git fetch origin
git rebase origin/staging
git push -u origin claude/kan-215-qr-card-pictures
```

Wait until the backend PR from Task 1 is merged into `staging` and deployed before marking this PR ready, since the editor's save depends on it.

- [ ] **Step 5: Open the PR into staging**

Title `KAN-215: QR card shows what guests can do`. Body: summary; what changed; the deploy note (backend PR link, backend first, no migration); "Saved templates show no pictures until an admin adds them: <list of templates with a saved layout>" (get the list from the admin templates page or ask the owner); screenshots of Plain with 5, 3 and 1 tiles in English and Greek; the testing done. Name only this PR's own Jira key in the body. End with the Claude Code attribution line.

The `visual-regression` check will flag the new stories. Never tick its approve box; send the owner the report link.

- [ ] **Step 6: Manual check on staging after merge**

On https://staging.storywall.gr, signed in as a host:
- Print an A6 card from a full plan and from a gallery-only plan, at mobile and desktop widths.
- Scan both printed cards with a phone.
- Check shadows and photos on paper.
- Print a gift card and check it looks as before.
