# Graduation frontend, part 3 — the graduation photo frame

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An **Add frame** switch at every gallery upload point that draws the event's frame (a graduation cap, the event title and its date) onto each photo in the browser before it is sent, and a **Photo frame** setting on a Graduation host's gallery page to pick the design or turn it off.

**Architecture:** `lib/uploadFrame.ts` builds each design as an SVG string sized to the photo (pure, tested), plus the visit-long on/off choice. `frameImageForUpload` in `lib/uploadImageResize.ts` draws the photo, shrunk to the server's long edge, and the SVG over it on one canvas. `hooks/useUploadFrame` turns an event into a switch and a `prepare(files)` step that the three upload hooks call before sending. The host picks the design in a sheet that saves through `PATCH /api/events/{id}`.

**Tech Stack:** Next.js, React, TypeScript, next-intl, TanStack Query, Canvas 2D, Vitest + Testing Library, Storybook.

**Spec:** `docs/superpowers/specs/2026-11-26-graduation-event-type-design.md` §7, §9, §10. Jira: KAN-304. Builds on part 1 (`claude/kan-301-graduation-frontend`): it needs `GRADUATION` in `EventTypeConvention`. Does not need part 2.

**Backend:** guestwall-be `claude/kan-300-graduation-backend` Tasks 3–5: `uploadFrame` on the event responses and `EventPatchDto`, and `uploadFrame`, `eventStartAt`, `eventTimezone` on `QrLinkResolutionDto`. Every new field is optional here, so a backend without them reads as "no frame" and nothing shows.

**Two things the spec has slightly differently, written down here:**
- The spec counts the gallery page as a guest entry point. Its upload is host-only today (`useGalleryScreen`: guests upload through posts, the feed block and the QR link). The switch is still added there, so the host's own uploads can be framed too.
- The spec says framing happens "in the same canvas pass as `shrinkImageForUpload`, which already shrinks every photo". Only the single upload (`useUploadMedia`) shrinks today; the gallery's batch uploads send photos as picked. `frameImageForUpload` therefore shrinks while it draws, to the same `imageMaxDimension`. Unframed batch uploads stay as they are.

**Approved copy (2026-11-26):**

| Key | English | Greek |
|---|---|---|
| `UploadFrame.add` | Add frame | Προσθήκη κορνίζας |
| `ImageAlt.uploadFramePreview` | Graduation frame preview | Προεπισκόπηση κορνίζας αποφοίτησης |
| `UploadFrame.unframed` | Some photos were uploaded without the frame. | Κάποιες φωτογραφίες ανέβηκαν χωρίς κορνίζα. |
| `UploadFrame.setting` | Photo frame | Κορνίζα φωτογραφιών |
| `UploadFrame.none` | No frame | Χωρίς κορνίζα |
| `UploadFrame.designs.CLASSIC` / `LAUREL` / `CONFETTI` | Classic / Laurel / Confetti | Κλασική / Δάφνη / Κομφετί |

The host sheet's heading reuses **Photo frame**; each design preview's alt is the design's name. No other new words. Any other text the work seems to need: stop and ask the owner in a popup, showing the exact wording.

---

## File map

| File | Change | Responsibility |
|---|---|---|
| `lib/api/types.ts` | Modify | `UploadFrame`, the new optional fields |
| `lib/uploadFrame.ts` | Create | the designs as SVG, the frame's text, the visit-long choice |
| `lib/uploadFrame.test.ts` | Create | |
| `lib/uploadImageResize.ts` | Modify | `frameImageForUpload`, `framePhotosForUpload` |
| `lib/uploadImageResize.test.ts` | Modify | |
| `hooks/useUploadFrame.ts` | Create | an event → the switch and the `prepare` step |
| `hooks/useUploadFrame.test.tsx` | Create | |
| `components/gallery/UploadFramePreview.tsx` | Create | a frame over the sample photo |
| `components/gallery/UploadFrameSwitch.tsx` | Create | **Add frame** |
| `components/gallery/UploadFrame.stories.tsx` | Create | the designs, portrait and landscape; the switch |
| `hooks/useFeedGalleryUpload.ts`, `hooks/useFeedGalleryBlock.ts`, `components/feed/modules/FeedGalleryBlock.tsx` | Modify | the feed Gallery block |
| `hooks/useGalleryScreen.ts`, `components/gallery/GalleryUploadSection.tsx`, `components/gallery/GalleryScreen.tsx` | Modify | the gallery page |
| `lib/qrLinks.ts`, `components/invite/AnonymousQrMediaUploadForm.tsx`, `components/qrLanding/QrLandingScreen.tsx` | Modify | the QR upload form |
| `hooks/useGalleryFrameSetting.ts` | Create | the host's choice |
| `components/gallery/GalleryFrameRow.tsx`, `components/gallery/GalleryFrameSheet.tsx` | Create | **Photo frame** row and sheet |
| `components/gallery/GalleryFrameSheet.test.tsx`, `GalleryFrameSheet.stories.tsx` | Create | |
| `messages/en.json`, `messages/el.json` | Modify | the approved copy |

---

### Task 0: Branch

- [ ] **Step 1: Branch from part 1**

```bash
git checkout claude/kan-301-graduation-frontend
git checkout -b claude/kan-304-upload-frame
```

If part 1 is already merged into `staging`, branch from the latest `origin/staging` instead.

---

### Task 1: Types and the designs (KAN-304)

**Files:**
- Modify: `lib/api/types.ts`
- Create: `lib/uploadFrame.ts`, `lib/uploadFrame.test.ts`

- [ ] **Step 1: The types**

In `lib/api/types.ts`, directly above `export interface EventResponseDto {` add:

```ts
// The frame guests may add to the photos they upload (KAN-304). NONE: no frame is offered.
export type UploadFrame = 'NONE' | 'CLASSIC' | 'LAUREL' | 'CONFETTI';
```

In `EventResponseDto`, after `eventType: EventTypeConvention;` add:

```ts
    // Missing from a backend older than this field: read it as NONE.
    uploadFrame?: UploadFrame;
```

Add the same two lines in `EventDetailResponseDto` after its `eventType: EventTypeConvention;`.

In `QrLinkResolutionDto`, after `eventSubtitle?: string | null;` add:

```ts
    // Only for an active code, like the title. Missing from a backend older than these fields (KAN-304).
    uploadFrame?: UploadFrame;
    eventStartAt?: string | null;
    eventTimezone?: string | null;
```

In `EventPatchDto`, after `rsvpDeadline?: string;` add:

```ts
    // NONE turns the frame off; leave it out to keep the current one.
    uploadFrame?: UploadFrame;
```

- [ ] **Step 2: Write the failing test**

Create `lib/uploadFrame.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';

import { FRAME_DESIGNS, frameLayout, frameSvg, frameSvgDataUrl, frameText, readFrameChoice, saveFrameChoice } from '@/lib/uploadFrame';

const text = { title: 'Μαρία & Νίκος', date: '2 Ιουλίου 2026' };

// Spec 2026-11-26-graduation-event-type-design.md §7.2.
describe('the frame designs', () => {
    it('are classic, laurel and confetti', () => {
        expect(FRAME_DESIGNS).toEqual(['CLASSIC', 'LAUREL', 'CONFETTI']);
    });

    it.each([
        ['portrait', 1500, 2000],
        ['landscape', 2000, 1500],
    ])('cover the whole %s photo, keeping its shape, with the band along the bottom', (_, width, height) => {
        const layout = frameLayout({ width, height });
        expect(layout.border).toBe(Math.round(1500 * 0.035));
        expect(layout.bandTop + layout.band + layout.border).toBe(height);
        for (const design of FRAME_DESIGNS) {
            const svg = frameSvg(design, { width, height }, text);
            expect(svg).toContain(`width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"`);
        }
    });

    it('scale with the short side, so portrait and landscape frames match', () => {
        expect(frameLayout({ width: 1500, height: 2000 }).band).toBe(frameLayout({ width: 2000, height: 1500 }).band);
    });

    it('each draw a graduation cap, the title and the date', () => {
        for (const design of FRAME_DESIGNS) {
            const svg = frameSvg(design, { width: 1500, height: 2000 }, text);
            expect(svg).toContain('data-part="cap"');
            expect(svg).toContain('Μαρία &amp; Νίκος');
            expect(svg).toContain('2 Ιουλίου 2026');
        }
    });

    it('look different from each other', () => {
        expect(frameSvg('LAUREL', { width: 1500, height: 2000 }, text)).toContain('data-part="laurel"');
        expect(frameSvg('CONFETTI', { width: 1500, height: 2000 }, text)).toContain('data-part="confetti"');
        expect(frameSvg('CLASSIC', { width: 1500, height: 2000 }, text)).not.toContain('data-part="laurel"');
    });

    it('never let the title break out of the SVG', () => {
        const svg = frameSvg('CLASSIC', { width: 1500, height: 2000 }, { title: '</text><script>alert(1)</script>', date: '"x"' });
        expect(svg).not.toContain('<script>');
        expect(svg).toContain('&lt;/text&gt;&lt;script&gt;');
        expect(svg).toContain('&quot;x&quot;');
    });

    it('squeeze a long title to the room it has', () => {
        const long = frameSvg('CLASSIC', { width: 1500, height: 2000 }, { title: 'Α'.repeat(80), date: '' });
        expect(long).toContain(`textLength="${frameLayout({ width: 1500, height: 2000 }).textWidth}"`);
        expect(frameSvg('CLASSIC', { width: 1500, height: 2000 }, text)).not.toContain('textLength');
    });

    it('leave the date out when the event has none', () => {
        expect(frameSvg('CLASSIC', { width: 1500, height: 2000 }, { title: 'Μαρία', date: '' })).not.toContain('data-part="date"');
    });

    it('can be used as an image source', () => {
        expect(frameSvgDataUrl('<svg/>')).toBe('data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E');
    });
});

describe('the frame text', () => {
    it("is the event's title and its start date in the uploader's language, on the event's own calendar day", () => {
        // 21:30 UTC is already the 2nd in Athens.
        const event = { title: ' Μαρία ', startAt: '2026-07-01T21:30:00Z', timezone: 'Europe/Athens' };
        expect(frameText(event, 'el')).toEqual({ title: 'Μαρία', date: '2 Ιουλίου 2026' });
        expect(frameText(event, 'en').date).toBe('July 2, 2026');
    });

    it('has no date for an event without one', () => {
        expect(frameText({ title: 'Μαρία', startAt: null, timezone: null }, 'el')).toEqual({ title: 'Μαρία', date: '' });
    });
});

describe('the Add frame choice', () => {
    afterEach(() => sessionStorage.clear());

    it('is off until turned on, and kept per event for the rest of the visit', () => {
        expect(readFrameChoice('e1')).toBe(false);
        saveFrameChoice('e1', true);
        expect(readFrameChoice('e1')).toBe(true);
        expect(readFrameChoice('e2')).toBe(false);
        expect(sessionStorage.getItem('storywall:upload-frame:e1')).toBe('on');
    });
});
```

- [ ] **Step 3: Run it to make sure it fails**

Run: `npx vitest run lib/uploadFrame.test.ts`
Expected: FAIL — `@/lib/uploadFrame` does not exist.

- [ ] **Step 4: The designs**

Create `lib/uploadFrame.ts`:

```ts
import type { UploadFrame } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

// The graduation frame (KAN-304, spec 2026-11-26 §7.2): each design is an SVG the size of the photo, drawn over it
// in the browser before upload. The same SVG is the preview, so what the guest sees is what gets uploaded.

export type FramedDesign = Exclude<UploadFrame, 'NONE'>;
export const FRAME_DESIGNS: readonly FramedDesign[] = ['CLASSIC', 'LAUREL', 'CONFETTI'];
export const UPLOAD_FRAME_OPTIONS: readonly UploadFrame[] = ['NONE', ...FRAME_DESIGNS];

export type FrameText = { title: string; date: string };
export type FrameSize = { width: number; height: number };

// The previews' size: a 4:5 portrait, like most phone photos.
export const FRAME_PREVIEW_SIZE: FrameSize = { width: 1200, height: 1500 };

// An SVG drawn as an image can't load web fonts, so the text uses fonts every device has.
const SERIF = "Georgia, 'Times New Roman', serif";
const NAVY = '#1f2a44';
const GOLD = '#c9a227';
const WHITE = '#ffffff';
const CORAL = '#e2725b';
const CONFETTI_COLORS = [GOLD, CORAL, '#4f7cac', '#7bb661'];
// Where the confetti falls, as fractions of the photo, and each piece's turn in degrees. Kept off the middle
// of the photo, where the people are.
const CONFETTI_PIECES: ReadonlyArray<readonly [number, number, number]> = [
    [0.06, 0.05, 20], [0.18, 0.09, -30], [0.31, 0.04, 60], [0.45, 0.08, 10], [0.58, 0.03, -50], [0.71, 0.07, 35],
    [0.84, 0.04, -15], [0.94, 0.09, 45], [0.04, 0.2, -40], [0.95, 0.22, 25], [0.07, 0.36, 55], [0.93, 0.4, -20],
    [0.05, 0.55, 15], [0.95, 0.6, -45],
];

const n = (value: number) => Math.round(value * 10) / 10;
const xml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Where things sit on a photo of this size. Everything follows the short side, so a portrait and a landscape
// photo get the same proportions and the photo keeps its own shape.
export function frameLayout({ width, height }: FrameSize) {
    const short = Math.min(width, height);
    const border = Math.round(short * 0.035);
    const band = Math.round(short * 0.17);
    return {
        short,
        border,
        band,
        bandTop: height - border - band,
        capSize: Math.round(band * 0.5),
        titleSize: Math.round(band * 0.3),
        dateSize: Math.round(band * 0.2),
        // The band less a band's width on each side for the ornaments.
        textWidth: Math.max(0, width - 2 * border - 2 * band),
    };
}

type Layout = ReturnType<typeof frameLayout>;

// A mortarboard drawn in a 24-unit box at (x, y), size units wide.
function cap(x: number, y: number, size: number, color: string): string {
    return (
        `<g data-part="cap" transform="translate(${n(x)} ${n(y)}) scale(${n(size / 24)})" fill="${color}">` +
        '<path d="M12 3 23 8 12 13 1 8Z"/>' +
        '<path d="M5.5 10.2V15c0 1.7 3 3 6.5 3s6.5-1.3 6.5-3v-4.8L12 13z"/>' +
        `<path d="M21 8.9v5.6" stroke="${color}" stroke-width="1.2" fill="none"/>` +
        '<circle cx="21" cy="15.2" r="1.1"/>' +
        '</g>'
    );
}

// Five leaves up a slight curve, mirrored for the right-hand side.
function laurel(cx: number, cy: number, size: number, mirrored: boolean): string {
    const side = mirrored ? -1 : 1;
    const leaves = [0, 1, 2, 3, 4]
        .map((i) => {
            const x = cx + side * Math.sin((i / 4) * Math.PI) * size * 0.12;
            const y = cy + size * 0.4 - i * size * 0.2;
            return `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(size * 0.07)}" ry="${n(size * 0.15)}" transform="rotate(${side * 35} ${n(x)} ${n(y)})"/>`;
        })
        .join('');
    return `<g data-part="laurel" fill="${GOLD}">${leaves}</g>`;
}

function confetti({ width, height }: FrameSize, short: number): string {
    const pieces = CONFETTI_PIECES.map(([fx, fy, turn], i) => {
        const x = n(fx * width);
        const y = n(fy * height);
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        if (i % 3 === 0) return `<circle cx="${x}" cy="${y}" r="${n(short * 0.012)}" fill="${color}"/>`;
        const w = n(short * 0.03);
        const h = n(short * 0.012);
        return `<rect x="${n(x - w / 2)}" y="${n(y - h / 2)}" width="${w}" height="${h}" fill="${color}" transform="rotate(${turn} ${x} ${y})"/>`;
    }).join('');
    return `<g data-part="confetti">${pieces}</g>`;
}

// The title, squeezed to the room it has when it would run past it, and the date under it.
function lines(size: FrameSize, layout: Layout, text: FrameText, titleColor: string, dateColor: string): string {
    const x = n(size.width / 2);
    const hasDate = text.date.length > 0;
    const titleY = n(layout.bandTop + layout.band * (hasDate ? 0.45 : 0.6));
    const tooWide = text.title.length * layout.titleSize * 0.56 > layout.textWidth;
    const squeeze = tooWide ? ` textLength="${layout.textWidth}" lengthAdjust="spacingAndGlyphs"` : '';
    const title =
        `<text data-part="title" x="${x}" y="${titleY}" text-anchor="middle" font-family="${SERIF}" font-weight="700" ` +
        `font-size="${layout.titleSize}" fill="${titleColor}"${squeeze}>${xml(text.title)}</text>`;
    if (!hasDate) return title;
    const dateY = n(layout.bandTop + layout.band * 0.78);
    return (
        title +
        `<text data-part="date" x="${x}" y="${dateY}" text-anchor="middle" font-family="${SERIF}" ` +
        `font-size="${layout.dateSize}" fill="${dateColor}">${xml(text.date)}</text>`
    );
}

function classic(size: FrameSize, layout: Layout, text: FrameText): string {
    const { border: b, band, bandTop, capSize } = layout;
    return (
        `<rect x="${n(b / 2)}" y="${n(b / 2)}" width="${size.width - b}" height="${size.height - b}" fill="none" stroke="${WHITE}" stroke-width="${b}"/>` +
        `<rect x="${b}" y="${bandTop}" width="${size.width - 2 * b}" height="${band}" fill="${WHITE}"/>` +
        cap(b + band * 0.25, bandTop + (band - capSize) / 2, capSize, NAVY) +
        lines(size, layout, text, NAVY, GOLD)
    );
}

function laurelDesign(size: FrameSize, layout: Layout, text: FrameText): string {
    const { border: b, band, bandTop, capSize } = layout;
    const inset = n(b * 1.6);
    const badge = capSize * 0.75;
    return (
        `<rect x="${n(b / 2)}" y="${n(b / 2)}" width="${size.width - b}" height="${size.height - b}" fill="none" stroke="${WHITE}" stroke-width="${b}"/>` +
        `<rect x="${inset}" y="${inset}" width="${n(size.width - 2 * inset)}" height="${n(size.height - 2 * inset)}" fill="none" stroke="${GOLD}" stroke-width="${n(b * 0.15)}"/>` +
        `<rect x="${b}" y="${bandTop}" width="${size.width - 2 * b}" height="${band}" fill="${NAVY}"/>` +
        laurel(b + band * 0.5, bandTop + band * 0.5, band * 0.9, false) +
        laurel(size.width - b - band * 0.5, bandTop + band * 0.5, band * 0.9, true) +
        `<circle cx="${n(size.width / 2)}" cy="${n(b + badge)}" r="${n(badge)}" fill="${NAVY}"/>` +
        cap(size.width / 2 - capSize * 0.5, b + badge - capSize * 0.5, capSize, GOLD) +
        lines(size, layout, text, WHITE, GOLD)
    );
}

function confettiDesign(size: FrameSize, layout: Layout, text: FrameText): string {
    const { border: b, band, bandTop, capSize, short } = layout;
    return (
        `<rect x="${n(b * 0.3)}" y="${n(b * 0.3)}" width="${n(size.width - b * 0.6)}" height="${n(size.height - b * 0.6)}" fill="none" stroke="${WHITE}" stroke-width="${n(b * 0.6)}"/>` +
        confetti(size, short) +
        `<rect x="${b}" y="${bandTop}" width="${size.width - 2 * b}" height="${band}" fill="${WHITE}" fill-opacity="0.92"/>` +
        cap(b + band * 0.25, bandTop + (band - capSize) / 2, capSize, NAVY) +
        lines(size, layout, text, NAVY, CORAL)
    );
}

const DESIGNS: Record<FramedDesign, (size: FrameSize, layout: Layout, text: FrameText) => string> = {
    CLASSIC: classic,
    LAUREL: laurelDesign,
    CONFETTI: confettiDesign,
};

export function frameSvg(design: FramedDesign, size: FrameSize, text: FrameText): string {
    const { width, height } = size;
    return (
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
        DESIGNS[design](size, frameLayout(size), text) +
        '</svg>'
    );
}

export const frameSvgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

// The event's title and start date, the date in the uploader's language on the event's own calendar day.
export function frameText(event: { title?: string | null; startAt?: string | null; timezone?: string | null }, locale: string): FrameText {
    const date = event.startAt
        ? formatDate(locale, event.startAt, { dateStyle: 'long', ...(event.timezone ? { timeZone: event.timezone } : {}) })
        : '';
    return { title: (event.title ?? '').trim(), date };
}

// Add frame stays as the guest left it for the rest of the visit, per event. Held in memory too, for a
// browser that refuses session storage.
const choices = new Map<string, boolean>();
const listeners = new Set<() => void>();
const choiceKey = (eventId: string) => `storywall:upload-frame:${eventId}`;

export function readFrameChoice(eventId: string): boolean {
    const held = choices.get(eventId);
    if (held !== undefined) return held;
    try {
        return sessionStorage.getItem(choiceKey(eventId)) === 'on';
    } catch {
        return false;
    }
}

export function saveFrameChoice(eventId: string, on: boolean): void {
    choices.set(eventId, on);
    try {
        sessionStorage.setItem(choiceKey(eventId), on ? 'on' : 'off');
    } catch {
        // Memory still holds it for this page.
    }
    listeners.forEach((listener) => listener());
}

export function subscribeFrameChoice(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

// What a switch needs: whether it is on, how to flip it, and its preview.
export type UploadFrameControl = { on: boolean; toggle: () => void; previewSrc: string; label: string; alt: string };
```

The in-memory map outlives `sessionStorage.clear()` within a test file, so each test uses event ids no other test has saved.

- [ ] **Step 5: Run the test**

Run: `npx vitest run lib/uploadFrame.test.ts`
Expected: PASS. If the `el` date reads differently on this Node (for example `2 Ιουλ 2026`), the Node build lacks full ICU: run `node -e "console.log(new Intl.DateTimeFormat('el',{dateStyle:'long'}).format(new Date()))"` and report it rather than changing the expectation.

- [ ] **Step 6: Commit**

```bash
git add lib/api/types.ts lib/uploadFrame.ts lib/uploadFrame.test.ts
git commit -m "KAN-304: the three graduation frame designs as SVG

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Drawing the frame onto a photo (KAN-304)

**Files:**
- Modify: `lib/uploadImageResize.ts`, `lib/uploadImageResize.test.ts`

- [ ] **Step 1: Write the failing test**

In `lib/uploadImageResize.test.ts`, change the import to

```ts
import { framePhotosForUpload, frameImageForUpload, shrinkImageForUpload, shrinkImagesForUpload } from '@/lib/uploadImageResize';
```

and append:

```ts
describe('frameImageForUpload', () => {
    const text = { title: 'Μαρία', date: '2 Ιουλίου 2026' };
    let loaded: string[];

    beforeEach(() => {
        loaded = [];
        // jsdom doesn't decode images: the frame's SVG "loads" at once.
        vi.stubGlobal(
            'Image',
            class {
                set src(value: string) {
                    loaded.push(value);
                }
                decode() {
                    return Promise.resolve();
                }
            },
        );
    });

    it('draws the photo, shrunk to the long edge, then the frame over it, keeping its name and type', async () => {
        const file = photo('a.jpg', 'image/jpeg', 4_000_000);
        const framed = await frameImageForUpload(file, 'CLASSIC', text, 2560);

        expect(canvasSize).toEqual({ width: 2560, height: 1920 });
        expect(drawImage).toHaveBeenCalledTimes(2);
        expect(drawImage.mock.calls[1].slice(1)).toEqual([0, 0, 2560, 1920]);
        expect(decodeURIComponent(loaded[0])).toContain('width="2560" height="1920"');
        expect(framed).toMatchObject({ name: 'a.jpg', type: 'image/jpeg', lastModified: 1234 });
    });

    it('frames a small photo at its own size', async () => {
        vi.mocked(createImageBitmap).mockResolvedValue(bitmapOf(1200, 1600) as unknown as ImageBitmap);
        await frameImageForUpload(photo('a.jpg', 'image/jpeg', 300_000), 'LAUREL', text, 2560);
        expect(canvasSize).toEqual({ width: 1200, height: 1600 });
    });

    it("gives up on a photo it can't draw", async () => {
        expect(await frameImageForUpload(photo('a.gif', 'image/gif', 1000), 'CLASSIC', text, 2560)).toBeNull();
        vi.mocked(createImageBitmap).mockRejectedValue(new Error('decode'));
        expect(await frameImageForUpload(photo('a.jpg', 'image/jpeg', 1000), 'CLASSIC', text, 2560)).toBeNull();
        encoded = null;
        vi.mocked(createImageBitmap).mockResolvedValue(bitmapOf(400, 300) as unknown as ImageBitmap);
        expect(await frameImageForUpload(photo('b.jpg', 'image/jpeg', 1000), 'CLASSIC', text, 2560)).toBeNull();
    });
});

describe('framePhotosForUpload', () => {
    const text = { title: 'Μαρία', date: '' };

    beforeEach(() => {
        vi.stubGlobal('Image', class { src = ''; decode() { return Promise.resolve(); } });
    });

    it('frames the photos, leaves videos alone, and counts the photos it sent without the frame', async () => {
        const jpeg = photo('a.jpg', 'image/jpeg', 4_000_000);
        const gif = photo('b.gif', 'image/gif', 1000);
        const video = photo('c.mp4', 'video/mp4', 9_000_000);

        const result = await framePhotosForUpload([jpeg, gif, video], 'CONFETTI', text, 2560);

        expect(result.files.map((file) => file.name)).toEqual(['a.jpg', 'b.gif', 'c.mp4']);
        expect(result.files[0]).not.toBe(jpeg);
        expect(result.files[1]).toBe(gif);
        expect(result.files[2]).toBe(video);
        expect(result.unframed).toBe(1);
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run lib/uploadImageResize.test.ts`
Expected: FAIL — `frameImageForUpload` is not exported.

- [ ] **Step 3: The drawing**

In `lib/uploadImageResize.ts`, add the import at the top

```ts
import { type FramedDesign, type FrameText, frameSvg, frameSvgDataUrl } from '@/lib/uploadFrame';
```

and append:

```ts
async function loadImage(src: string): Promise<HTMLImageElement> {
    const image = new Image();
    image.src = src;
    await image.decode();
    return image;
}

// The graduation frame (KAN-304): the photo, shrunk to the server's long edge like shrinkImageForUpload, with the
// frame drawn over it in one canvas pass. Same name and type: the upload matches results back to files by name.
// null when it can't be drawn; the caller then sends the photo as it was.
export async function frameImageForUpload(file: File, design: FramedDesign, text: FrameText, maxDimension: number): Promise<File | null> {
    if (!SHRINKABLE_TYPES.has(file.type)) return null;
    let bitmap: ImageBitmap | null = null;
    try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        const scale = maxDimension > 0 ? Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height)) : 1;
        const width = Math.round(bitmap.width * scale);
        const height = Math.round(bitmap.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) return null;
        context.imageSmoothingQuality = 'high';
        context.drawImage(bitmap, 0, 0, width, height);
        context.drawImage(await loadImage(frameSvgDataUrl(frameSvg(design, { width, height }, text))), 0, 0, width, height);

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type, ENCODE_QUALITY));
        if (!blob) return null;
        return new File([blob], file.name, { type: file.type, lastModified: file.lastModified });
    } catch {
        return null;
    } finally {
        bitmap?.close();
    }
}

// One at a time, like shrinkImagesForUpload. Videos are never framed; a photo that can't be is sent as it was and counted.
export async function framePhotosForUpload(
    files: File[],
    design: FramedDesign,
    text: FrameText,
    maxDimension: number,
): Promise<{ files: File[]; unframed: number }> {
    const out: File[] = [];
    let unframed = 0;
    for (const file of files) {
        if (file.type.startsWith('video/')) {
            out.push(file);
            continue;
        }
        const framed = await frameImageForUpload(file, design, text, maxDimension);
        if (framed) {
            out.push(framed);
        } else {
            out.push(file);
            unframed += 1;
        }
    }
    return { files: out, unframed };
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run lib/uploadImageResize.test.ts lib/uploadFrame.test.ts`
Expected: PASS, the old `shrinkImageForUpload` cases included.

- [ ] **Step 5: Commit**

```bash
git add lib/uploadImageResize.ts lib/uploadImageResize.test.ts
git commit -m "KAN-304: draw the frame onto a photo before upload, sending it plain when it can't

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The switch (KAN-304)

**Files:**
- Create: `hooks/useUploadFrame.ts`, `hooks/useUploadFrame.test.tsx`
- Create: `components/gallery/UploadFramePreview.tsx`, `components/gallery/UploadFrameSwitch.tsx`, `components/gallery/UploadFrame.stories.tsx`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: The copy**

`messages/en.json`: directly above the line `    "ImageAlt": {` insert

```json
    "UploadFrame": {
        "add": "Add frame",
        "unframed": "Some photos were uploaded without the frame.",
        "setting": "Photo frame",
        "none": "No frame",
        "designs": {
            "CLASSIC": "Classic",
            "LAUREL": "Laurel",
            "CONFETTI": "Confetti"
        }
    },
```

and replace `        "photoPreview": "Photo preview",` with

```json
        "photoPreview": "Photo preview",
        "uploadFramePreview": "Graduation frame preview",
```

`messages/el.json`: above `    "ImageAlt": {`

```json
    "UploadFrame": {
        "add": "Προσθήκη κορνίζας",
        "unframed": "Κάποιες φωτογραφίες ανέβηκαν χωρίς κορνίζα.",
        "setting": "Κορνίζα φωτογραφιών",
        "none": "Χωρίς κορνίζα",
        "designs": {
            "CLASSIC": "Κλασική",
            "LAUREL": "Δάφνη",
            "CONFETTI": "Κομφετί"
        }
    },
```

and replace `        "photoPreview": "Προεπισκόπηση φωτογραφίας",` with

```json
        "photoPreview": "Προεπισκόπηση φωτογραφίας",
        "uploadFramePreview": "Προεπισκόπηση κορνίζας αποφοίτησης",
```

Each anchor appears once per file (`grep -c '^    "ImageAlt": {' messages/en.json` and `grep -c '"photoPreview":' messages/en.json` print 1). Edit as text; the files hold duplicate keys, so never parse and rewrite them.

- [ ] **Step 2: Write the failing test**

Create `hooks/useUploadFrame.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type UploadFrameSource, useUploadFrame } from '@/hooks/useUploadFrame';
import en from '@/messages/en.json';

const { framePhotosForUpload } = vi.hoisted(() => ({ framePhotosForUpload: vi.fn() }));
vi.mock('@/lib/uploadImageResize', () => ({ framePhotosForUpload }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: undefined }) }));

const wrapper = ({ children }: { children: ReactNode }) => (
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
        {children}
    </NextIntlClientProvider>
);
let nextId = 0;
const source = (frame: UploadFrameSource['frame']): UploadFrameSource => ({
    eventId: `e${++nextId}`,
    frame,
    title: 'Maria',
    startAt: '2026-07-01T10:00:00Z',
    timezone: 'Europe/Athens',
});
const photo = new File(['x'], 'a.jpg', { type: 'image/jpeg' });

afterEach(() => {
    framePhotosForUpload.mockReset();
    sessionStorage.clear();
});

describe('useUploadFrame', () => {
    it('offers nothing on an event without a frame, and sends the files as they are', async () => {
        for (const frame of [undefined, 'NONE' as const]) {
            const { result } = renderHook(() => useUploadFrame(source(frame)), { wrapper });
            expect(result.current.control).toBeNull();
            expect(await result.current.prepare([photo])).toEqual({ files: [photo], notice: null });
        }
        expect(framePhotosForUpload).not.toHaveBeenCalled();
    });

    it('starts off, with the frame preview', async () => {
        const { result } = renderHook(() => useUploadFrame(source('CLASSIC')), { wrapper });
        expect(result.current.control).toMatchObject({ on: false, label: 'Add frame', alt: 'Graduation frame preview' });
        expect(result.current.control?.previewSrc).toMatch(/^data:image\/svg\+xml/);
        expect(await result.current.prepare([photo])).toEqual({ files: [photo], notice: null });
    });

    it('frames the photos once turned on, with the title and date, and says when some went without', async () => {
        const framed = new File(['y'], 'a.jpg', { type: 'image/jpeg' });
        framePhotosForUpload.mockResolvedValue({ files: [framed], unframed: 1 });
        const { result } = renderHook(() => useUploadFrame(source('LAUREL')), { wrapper });

        act(() => result.current.control!.toggle());
        expect(result.current.control?.on).toBe(true);

        expect(await result.current.prepare([photo])).toEqual({ files: [framed], notice: 'Some photos were uploaded without the frame.' });
        expect(framePhotosForUpload).toHaveBeenCalledWith([photo], 'LAUREL', { title: 'Maria', date: 'July 1, 2026' }, expect.any(Number));
    });

    it('remembers the choice for the rest of the visit', () => {
        const event = source('CONFETTI');
        const first = renderHook(() => useUploadFrame(event), { wrapper });
        act(() => first.result.current.control!.toggle());
        first.unmount();

        expect(renderHook(() => useUploadFrame(event), { wrapper }).result.current.control?.on).toBe(true);
    });
});
```

- [ ] **Step 3: Run it to make sure it fails**

Run: `npx vitest run hooks/useUploadFrame.test.tsx`
Expected: FAIL — `@/hooks/useUploadFrame` does not exist.

- [ ] **Step 4: The hook**

Create `hooks/useUploadFrame.ts`:

```ts
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import type { UploadFrame } from '@/lib/api/types';
import {
    FRAME_PREVIEW_SIZE,
    frameSvg,
    frameSvgDataUrl,
    frameText,
    readFrameChoice,
    saveFrameChoice,
    subscribeFrameChoice,
    type UploadFrameControl,
} from '@/lib/uploadFrame';
import { framePhotosForUpload } from '@/lib/uploadImageResize';
import { getUploadLimits } from '@/lib/uploadLimits';

// The event a gallery upload goes to, as far as the frame needs it.
export type UploadFrameSource = {
    eventId: string;
    frame?: UploadFrame | null;
    title?: string | null;
    startAt?: string | null;
    timezone?: string | null;
};

// Add frame (KAN-304): the switch, when the event has a frame, and the step every gallery upload runs on its
// files before sending them.
export function useUploadFrame(source: UploadFrameSource | null) {
    const t = useTranslations('UploadFrame');
    const tAlt = useTranslations('ImageAlt');
    const locale = useLocale();
    const { data: appConfig } = useAppConfig();
    const { imageMaxDimension } = getUploadLimits(appConfig?.media);

    const eventId = source?.eventId ?? null;
    const design = source?.frame && source.frame !== 'NONE' ? source.frame : null;
    const title = source?.title ?? null;
    const startAt = source?.startAt ?? null;
    const timezone = source?.timezone ?? null;

    // Off on the server and on the first paint; the visit's choice once the browser has it.
    const on = useSyncExternalStore(
        subscribeFrameChoice,
        () => (eventId ? readFrameChoice(eventId) : false),
        () => false,
    );
    const toggle = useCallback(() => {
        if (eventId) saveFrameChoice(eventId, !readFrameChoice(eventId));
    }, [eventId]);

    const text = useMemo(() => frameText({ title, startAt, timezone }, locale), [locale, startAt, timezone, title]);
    const previewSrc = useMemo(() => (design ? frameSvgDataUrl(frameSvg(design, FRAME_PREVIEW_SIZE, text)) : null), [design, text]);

    const prepare = useCallback(
        async (files: File[]): Promise<{ files: File[]; notice: string | null }> => {
            if (!design || !on) return { files, notice: null };
            const framed = await framePhotosForUpload(files, design, text, imageMaxDimension);
            return { files: framed.files, notice: framed.unframed > 0 ? t('unframed') : null };
        },
        [design, imageMaxDimension, on, t, text],
    );

    const control: UploadFrameControl | null = useMemo(
        () => (design && previewSrc ? { on, toggle, previewSrc, label: t('add'), alt: tAlt('uploadFramePreview') } : null),
        [design, on, previewSrc, t, tAlt, toggle],
    );

    return { control, prepare };
}
```

- [ ] **Step 5: The preview and the switch**

Create `components/gallery/UploadFramePreview.tsx`:

```tsx
import Image from 'next/image';

import { cn } from '@/lib/utils';

// The photo the frame previews sit on: only a backdrop, so it carries no alt of its own.
export const FRAME_SAMPLE_PHOTO = '/landing/friends-and-family-celebrating-at-sunset.webp';

// A frame drawn over the sample photo (KAN-304). src null: the photo alone ("No frame"); alt names what is shown.
export function UploadFramePreview({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
    return (
        <span className={cn('relative block overflow-hidden bg-surface-muted bg-cover bg-center', className)} style={{ backgroundImage: `url(${FRAME_SAMPLE_PHOTO})` }}>
            {src ? (
                <Image src={src} alt={alt} fill unoptimized className="object-fill" />
            ) : (
                <span role="img" aria-label={alt} className="absolute inset-0" />
            )}
        </span>
    );
}
```

Create `components/gallery/UploadFrameSwitch.tsx`:

```tsx
'use client';

import { useId } from 'react';

import { UploadFramePreview } from '@/components/gallery/UploadFramePreview';
import type { UploadFrameControl } from '@/lib/uploadFrame';
import { cn } from '@/lib/utils';

// Add frame (KAN-304): a small preview, the label and the switch, above the upload button.
export function UploadFrameSwitch({ control, className }: { control: UploadFrameControl; className?: string }) {
    const labelId = useId();

    return (
        <button
            type="button"
            role="switch"
            aria-checked={control.on}
            aria-labelledby={labelId}
            onClick={control.toggle}
            className={cn('flex min-h-12 w-full items-center gap-3 rounded-xl text-left focus-ring', className)}
        >
            {/* Preview */}
            <UploadFramePreview src={control.previewSrc} alt={control.alt} className="aspect-[4/5] w-10 shrink-0 rounded-md" />
            {/* Label */}
            <span id={labelId} className="min-w-0 flex-1 text-sm font-semibold text-ink">
                {control.label}
            </span>
            {/* Switch */}
            <span className={cn('h-6 w-10 shrink-0 rounded-full p-0.5 transition-colors', control.on ? 'bg-ink' : 'bg-surface-muted')}>
                <span className={cn('block size-5 rounded-full bg-white shadow-sm transition-transform', control.on && 'translate-x-4')} />
            </span>
        </button>
    );
}
```

- [ ] **Step 6: The stories**

Create `components/gallery/UploadFrame.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { UploadFramePreview } from '@/components/gallery/UploadFramePreview';
import { UploadFrameSwitch } from '@/components/gallery/UploadFrameSwitch';
import { FRAME_DESIGNS, FRAME_PREVIEW_SIZE, frameSvg, frameSvgDataUrl } from '@/lib/uploadFrame';

const text = { title: 'Η αποφοίτηση της Μαρίας', date: '2 Ιουλίου 2026' };
const src = (design: (typeof FRAME_DESIGNS)[number], width: number, height: number) => frameSvgDataUrl(frameSvg(design, { width, height }, text));

const meta = {
    title: 'Gallery/UploadFrame',
    component: UploadFrameSwitch,
    args: { control: { on: false, toggle: fn(), previewSrc: src('CLASSIC', FRAME_PREVIEW_SIZE.width, FRAME_PREVIEW_SIZE.height), label: 'Add frame', alt: 'Graduation frame preview' } },
    decorators: [(Story) => <div className="max-w-sm p-4">{Story()}</div>],
} satisfies Meta<typeof UploadFrameSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SwitchOff: Story = {};

export const SwitchOn: Story = { args: { control: { ...meta.args.control, on: true } } };

// Each design on a portrait and a landscape photo (spec §10).
export const Designs: Story = {
    tags: ['visual-desktop-only'],
    render: () => (
        <div className="flex flex-col gap-6">
            {FRAME_DESIGNS.map((design) => (
                <div key={design} className="flex items-start gap-4">
                    <UploadFramePreview src={src(design, 1500, 2000)} alt={design} className="aspect-[3/4] w-60 rounded-lg" />
                    <UploadFramePreview src={src(design, 2000, 1500)} alt={design} className="aspect-[4/3] w-80 rounded-lg" />
                </div>
            ))}
        </div>
    ),
};

export const LongTitle: Story = {
    render: () => (
        <UploadFramePreview
            src={frameSvgDataUrl(frameSvg('CLASSIC', { width: 1500, height: 2000 }, { title: 'Η αποφοίτηση της Μαρίας, του Νίκου και της Ελένης από τη Νομική', date: text.date }))}
            alt="CLASSIC"
            className="aspect-[3/4] w-72 rounded-lg"
        />
    ),
};
```

`Designs` is wide, so it is captured on desktop only; the switch stories run at both widths. The fixed `text` keeps the shots stable (no "today").

- [ ] **Step 7: Run the tests**

Run: `npx vitest run hooks/useUploadFrame.test.tsx lib/uploadFrame.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add hooks/useUploadFrame.ts hooks/useUploadFrame.test.tsx components/gallery/UploadFramePreview.tsx components/gallery/UploadFrameSwitch.tsx components/gallery/UploadFrame.stories.tsx messages/en.json messages/el.json
git commit -m "KAN-304: Add frame switch, off by default and kept for the visit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The switch at each upload point (KAN-304)

**Files:**
- Modify: `hooks/useFeedGalleryUpload.ts`, `hooks/useFeedGalleryBlock.ts`, `components/feed/modules/FeedGalleryBlock.tsx`, `components/feed/modules/FeedGalleryBlock.test.tsx`
- Modify: `hooks/useGalleryScreen.ts`, `components/gallery/GalleryUploadSection.tsx`, `components/gallery/GalleryScreen.tsx`
- Modify: `lib/qrLinks.ts`, `components/invite/AnonymousQrMediaUploadForm.tsx`, `components/qrLanding/QrLandingScreen.tsx`
- Create: `components/invite/AnonymousQrMediaUploadForm.frame.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `components/feed/modules/FeedGalleryBlock.test.tsx` (inside the file, after the existing `describe`):

```tsx
describe('FeedGalleryBlock frame', () => {
    const frame = { on: false, toggle: vi.fn(), previewSrc: 'data:image/svg+xml,x', label: 'Add frame', alt: 'Graduation frame preview' };

    it('shows Add frame above the upload button when the event has a frame', () => {
        renderBlock({ upload: { ...upload, frame } });
        const toggle = screen.getByRole('switch', { name: 'Add frame' });
        expect(toggle).toHaveAttribute('aria-checked', 'false');
        expect(screen.getByRole('img', { name: 'Graduation frame preview' })).toBeInTheDocument();
        expect(toggle.compareDocumentPosition(screen.getByText(en.FeedModuleBlocks.galleryUpload)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('has no switch without one', () => {
        renderBlock({ upload: { ...upload, frame: null } });
        expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    });
});
```

and change `const upload = { onFiles: vi.fn(), uploading: false, notice: null, accept: 'image/*' };` to

```ts
const upload = { onFiles: vi.fn(), uploading: false, notice: null, accept: 'image/*', frame: null };
```

Create `components/invite/AnonymousQrMediaUploadForm.frame.test.tsx` (its mocks are the failures test's, plus the frame):

```tsx
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnonymousQrMediaUploadForm } from '@/components/invite/AnonymousQrMediaUploadForm';

const { mutateAsync, prepare } = vi.hoisted(() => ({ mutateAsync: vi.fn(), prepare: vi.fn() }));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('@/hooks/useApiErrorMessage', () => ({ useApiErrorMessage: () => () => 'error' }));
vi.mock('@/hooks/useFilePreviews', () => ({
    useFilePreviews: (files: File[]) => files.map((file) => ({ file, url: `blob:${file.name}`, isVideo: false })),
}));
vi.mock('@/components/common/ProtectedImage', () => ({ ProtectedImage: ({ src }: { src: string }) => <span data-preview={src} /> }));
vi.mock('@/hooks/useMedia', () => ({ useUploadMediaBatch: () => ({ isPending: false, mutateAsync: vi.fn() }) }));
vi.mock('@/hooks/useQrMediaUpload', () => ({ useUploadQrMediaBatch: () => ({ isPending: false, mutateAsync }) }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: undefined }) }));
vi.mock('@/hooks/useUploadAccept', () => ({ useUploadAccept: () => ({ media: 'image/*,video/*' }) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('@/hooks/useTermsVersion', () => ({ termsVersionQueryKey: ['legal', 'terms'], useTermsVersion: () => ({ data: '2026-10-04' }) }));
vi.mock('@/hooks/useCommunityGuidelinesVersion', () => ({
    communityGuidelinesQueryKey: ['legal', 'community-guidelines'],
    useCommunityGuidelinesVersion: () => ({ data: '2026-09-30' }),
}));
vi.mock('@/components/legal/SignupAcceptanceCheckbox', () => ({
    SignupAcceptanceCheckbox: (props: { checked: boolean; onChangeAction: () => void }) => (
        <input type="checkbox" aria-label="accept" checked={props.checked} onChange={props.onChangeAction} />
    ),
}));
vi.mock('@/hooks/useUploadFrame', () => ({
    useUploadFrame: (source: unknown) => ({
        control: source ? { on: true, toggle: vi.fn(), previewSrc: 'data:image/svg+xml,x', label: 'Add frame', alt: 'Graduation frame preview' } : null,
        prepare,
    }),
}));

afterEach(() => {
    cleanup();
    mutateAsync.mockReset();
    prepare.mockReset();
});

const source = { eventId: 'e1', frame: 'CLASSIC' as const, title: 'Maria', startAt: '2026-07-01T10:00:00Z', timezone: 'Europe/Athens' };

describe('AnonymousQrMediaUploadForm frame', () => {
    it('sends the framed photos and tells the uploader about any that went without', async () => {
        const original = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
        const framed = new File(['y'], 'a.jpg', { type: 'image/jpeg' });
        prepare.mockResolvedValue({ files: [framed], notice: 'UploadFrame.unframed' });
        mutateAsync.mockResolvedValue({ created: [{ id: 'm', originalFilename: 'a.jpg' }], failed: [] });
        const { container } = render(<AnonymousQrMediaUploadForm token="t" frameSource={source} />);

        expect(screen.getByRole('switch', { name: 'Add frame' })).toBeInTheDocument();
        fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [original] } });
        fireEvent.click(screen.getByRole('checkbox', { name: 'accept' }));
        fireEvent.submit(container.querySelector('form')!);

        await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ files: [framed] })));
        expect(prepare).toHaveBeenCalledWith([original]);
    });

    it('has no switch when the event has no frame', () => {
        render(<AnonymousQrMediaUploadForm token="t" />);
        expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run components/feed/modules/FeedGalleryBlock.test.tsx components/invite/AnonymousQrMediaUploadForm.frame.test.tsx`
Expected: FAIL — no switch is drawn and `frameSource` is not a prop.

- [ ] **Step 3: The feed Gallery block**

`hooks/useFeedGalleryUpload.ts`: add the imports `import type { EventDetailResponseDto } from '@/lib/api/types';` and `import { useUploadFrame } from '@/hooks/useUploadFrame';`, change the signature to

```ts
export function useFeedGalleryUpload(event: EventDetailResponseDto) {
    const eventId = event.id;
```

and after `const [busy, setBusy] = useState(false);` add

```ts
    const frame = useUploadFrame({
        eventId,
        frame: event.uploadFrame,
        title: event.title,
        startAt: event.schedule.startAt,
        timezone: event.schedule.timezone,
    });
    // Framing runs before the upload starts, so the button shows it is busy from the pick.
    const [framing, setFraming] = useState(false);
```

Replace the `try { ... }` inside `onFiles` with

```ts
            let prepared: { files: File[]; notice: string | null } = { files: picked.files, notice: null };
            setFraming(true);
            try {
                prepared = await frame.prepare(picked.files);
            } finally {
                setFraming(false);
            }
            try {
                const result = await upload.mutateAsync({ eventId, files: prepared.files, onBusy: setBusy });
                // A pick that left files out keeps saying so after the upload.
                setNotice([notices.picked(picked.notice), prepared.notice, notices.uploaded(result)].filter(Boolean).join(' '));
            } catch (error) {
                setNotice(notices.failed(error));
            }
```

add `frame` to the `useCallback` deps (`[eventId, frame, limits, notices, upload]`), and return

```ts
    return {
        onFiles,
        uploading: upload.isPending || framing,
        notice: busy ? notices.busy : slow ? notices.slow : notice,
        frame: frame.control,
    };
```

`hooks/useFeedGalleryBlock.ts`: `const upload = useFeedGalleryUpload(event);`.

`components/feed/modules/FeedGalleryBlock.tsx`: add `import { UploadFrameSwitch } from '@/components/gallery/UploadFrameSwitch';` and `import type { UploadFrameControl } from '@/lib/uploadFrame';`, add to `FeedGalleryUpload`

```ts
    // Add frame, when the event has one (KAN-304).
    frame: UploadFrameControl | null;
```

and directly above `{/* Upload */}` add

```tsx
            {/* Frame */}
            {available && upload?.frame && <UploadFrameSwitch control={upload.frame} />}
```

- [ ] **Step 4: The gallery page**

`hooks/useGalleryScreen.ts`: add `import { useUploadFrame } from '@/hooks/useUploadFrame';`; after `const notices = useGalleryUploadNotices(uploadLimits);` add

```ts
    const uploadFrame = useUploadFrame(
        activeEvent && eventId
            ? {
                  eventId,
                  frame: activeEvent.uploadFrame,
                  title: activeEvent.title,
                  startAt: activeEvent.schedule.startAt,
                  timezone: activeEvent.schedule.timezone,
              }
            : null,
    );
    const [isFraming, setIsFraming] = useState(false);
```

replace the body of `handleUpload` from `setUploadNotice(null);` to its end with

```ts
        setUploadNotice(null);
        setIsFraming(true);
        let prepared: { files: File[]; notice: string | null };
        try {
            prepared = await uploadFrame.prepare(selectedFiles);
        } finally {
            setIsFraming(false);
        }
        let result;
        try {
            result = await uploadMediaBatch.mutateAsync({
                eventId,
                files: prepared.files,
                onBusy: setIsUploadBusy,
            });
        } catch (error) {
            setUploadNotice(notices.failed(error));
            return;
        }

        setSelectedFiles([]);
        setUploadNotice([prepared.notice, notices.uploaded(result)].filter(Boolean).join(' '));
    }, [activeMember, canUpload, eventId, notices, selectedFiles, uploadFrame, uploadMediaBatch]);
```

and add to the returned object, after `uploadMediaBatch,`:

```ts
        isUploading: uploadMediaBatch.isPending || isFraming,
        uploadFrame: uploadFrame.control,
```

`components/gallery/GalleryUploadSection.tsx`: add `import { UploadFrameSwitch } from '@/components/gallery/UploadFrameSwitch';` and `import type { UploadFrameControl } from '@/lib/uploadFrame';`, add the prop `frame: UploadFrameControl | null;` (destructured as `frame`), and directly above `{/* Incident note */}` add

```tsx
            {/* Frame */}
            {frame && <UploadFrameSwitch control={frame} className="mt-3" />}
```

`components/gallery/GalleryScreen.tsx`: take `isUploading` and `uploadFrame` from `useGalleryScreen()`, and in `<GalleryUploadSection ...>` replace `isUploading={uploadMediaBatch.isPending}` with `isUploading={isUploading}` and add `frame={uploadFrame}`. If `uploadMediaBatch` is then unused in `GalleryScreen.tsx`, drop it from the destructuring (lint says so).

The spec puts the switch above the upload button; on this page the button is in the header row beside the title, so the switch sits right under that row, above the picked files and the Upload button that sends them.

- [ ] **Step 5: The QR form**

`lib/qrLinks.ts`, append:

```ts
// The frame details a QR upload needs (KAN-304): only for an active code, like the title.
export function qrUploadFrameSource(resolution: QrLinkResolutionDto | undefined) {
    if (resolution?.status !== 'ACTIVE' || !resolution.eventId) return null;
    return {
        eventId: resolution.eventId,
        frame: resolution.uploadFrame,
        title: resolution.eventTitle,
        startAt: resolution.eventStartAt,
        timezone: resolution.eventTimezone,
    };
}
```

(Add `QrLinkResolutionDto` to the file's `@/lib/api/types` import if it isn't there.)

`components/invite/AnonymousQrMediaUploadForm.tsx`: add the imports `import { UploadFrameSwitch } from '@/components/gallery/UploadFrameSwitch';` and `import { type UploadFrameSource, useUploadFrame } from '@/hooks/useUploadFrame';`; add to the props interface

```ts
    // The event's frame, when it has one: Add frame shows above the upload button (KAN-304).
    frameSource?: UploadFrameSource | null;
```

destructure `frameSource = null`, and after `const previews = useFilePreviews(files);` add

```ts
    const uploadFrame = useUploadFrame(frameSource);
    const [isFraming, setIsFraming] = useState(false);
```

In `handleSubmit`, replace everything from `setSubmitError(null);` to the end of the `const result = member ...;` statement (the `try {` between them included) with

```ts
        setSubmitError(null);
        setIsFraming(true);
        let prepared: { files: File[]; notice: string | null };
        try {
            prepared = await uploadFrame.prepare(files);
        } finally {
            setIsFraming(false);
        }
        try {
            const result = member
                ? await memberUploadBatch.mutateAsync({ eventId: member.eventId, files: prepared.files, onBusy: setIsBusy })
                : await qrUploadBatch.mutateAsync({
                      token,
                      files: prepared.files,
                      uploaderName: uploaderName.trim() || undefined,
                      acceptance: { termsVersion: termsVersion.data!, guidelinesVersion: guidelinesVersion.data! },
                      onBusy: setIsBusy,
                  });
```

Everything after that statement (the failed-files check, `setDone(true)`, the `catch`) stays as it is. The refused files are matched back by name and the framed copies keep their names, so a refused photo stays in the list as the guest picked it and is framed again on the next try.

Where the sent screen shows, a frame notice must not be lost: after `setDone(true);` nothing more is shown, so put the notice on the sent screen only if it exists. Replace

```tsx
                <p className="text-base font-semibold text-ink">{t('anonymousUpload.success')}</p>
```

with

```tsx
                <p className="text-base font-semibold text-ink">{t('anonymousUpload.success')}</p>
                {frameNotice && <p className="text-sm text-ink-muted">{frameNotice}</p>}
```

with `const [frameNotice, setFrameNotice] = useState<string | null>(null);` beside the other state, `setFrameNotice(prepared.notice);` right after `prepared` is set, and `setFrameNotice(null);` in `handleUploadMore`.

Directly above `{/* Upload */}` (the submit button) add

```tsx
            {/* Frame */}
            {uploadFrame.control && <UploadFrameSwitch control={uploadFrame.control} />}
```

and in the submit button, use `uploadBatch.isPending || isFraming` both for `disabled` and for the spinner.

`components/qrLanding/QrLandingScreen.tsx`: add `import { qrUploadFrameSource } from '@/lib/qrLinks';` and pass `frameSource={qrUploadFrameSource(landing.resolution)}` to `<AnonymousQrMediaUploadForm ...>`.

- [ ] **Step 6: The other tests that render these**

The existing `AnonymousQrMediaUploadForm.acceptance.test.tsx` and `AnonymousQrMediaUploadForm.failures.test.tsx` mock `next-intl` without `useLocale`. In each, change the `next-intl` mock to also return `useLocale: () => 'en'`. If any other existing test now fails because it renders `useGalleryScreen`, `useFeedGalleryUpload` or the QR form without a `useLocale`, add the same, or mock the hook:

```ts
vi.mock('@/hooks/useUploadFrame', () => ({ useUploadFrame: () => ({ control: null, prepare: async (files: File[]) => ({ files, notice: null }) }) }));
```

- [ ] **Step 7: Run the tests**

Run: `npx vitest run components/feed components/invite components/gallery components/qrLanding hooks lib`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: clean. A caller of `useFeedGalleryUpload(event.id)` other than `useFeedGalleryBlock` would show here: pass it the event.

- [ ] **Step 8: Commit**

```bash
git add hooks/useFeedGalleryUpload.ts hooks/useFeedGalleryBlock.ts components/feed/modules/FeedGalleryBlock.tsx components/feed/modules/FeedGalleryBlock.test.tsx hooks/useGalleryScreen.ts components/gallery/GalleryUploadSection.tsx components/gallery/GalleryScreen.tsx lib/qrLinks.ts components/invite/AnonymousQrMediaUploadForm.tsx components/invite/AnonymousQrMediaUploadForm.frame.test.tsx components/invite/AnonymousQrMediaUploadForm.acceptance.test.tsx components/invite/AnonymousQrMediaUploadForm.failures.test.tsx components/qrLanding/QrLandingScreen.tsx
git commit -m "KAN-304: Add frame on the feed Gallery block, the gallery page and the QR upload

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The host's Photo frame setting (KAN-304)

**Files:**
- Create: `hooks/useGalleryFrameSetting.ts`, `components/gallery/GalleryFrameRow.tsx`, `components/gallery/GalleryFrameSheet.tsx`, `components/gallery/GalleryFrameSheet.test.tsx`, `components/gallery/GalleryFrameSheet.stories.tsx`
- Modify: `components/gallery/GalleryScreen.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/gallery/GalleryFrameSheet.test.tsx`:

```tsx
import { cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GalleryFrameRow } from '@/components/gallery/GalleryFrameRow';
import { GalleryFrameSheet } from '@/components/gallery/GalleryFrameSheet';
import { storyEvent } from '@/.storybook/fixtures';
import { useGalleryFrameSetting } from '@/hooks/useGalleryFrameSetting';
import en from '@/messages/en.json';

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
vi.mock('@/hooks/useEvent', () => ({ useUpdateEvent: () => ({ mutateAsync, isPending: false }) }));

const wrapper = ({ children }: { children: ReactNode }) => (
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
        {children}
    </NextIntlClientProvider>
);
const graduation = storyEvent({ eventType: 'GRADUATION', status: 'ACTIVE', uploadFrame: 'CLASSIC' });

afterEach(() => {
    cleanup();
    mutateAsync.mockReset();
});

function Screen({ event = graduation, isHost = true }) {
    const setting = useGalleryFrameSetting(event, isHost);
    return setting ? (
        <>
            <GalleryFrameRow setting={setting} />
            <GalleryFrameSheet setting={setting} />
        </>
    ) : null;
}

describe('Photo frame setting', () => {
    it("is only for a graduation's host", () => {
        expect(renderHook(() => useGalleryFrameSetting(graduation, false), { wrapper }).result.current).toBeNull();
        expect(renderHook(() => useGalleryFrameSetting(storyEvent({ eventType: 'BIRTHDAY' }), true), { wrapper }).result.current).toBeNull();
        expect(renderHook(() => useGalleryFrameSetting(graduation, true), { wrapper }).result.current).not.toBeNull();
    });

    it('shows the current design, and saves the one the host picks', async () => {
        mutateAsync.mockResolvedValue({});
        render(<Screen />, { wrapper });

        // The open sheet hides the page from assistive tech, so the row is read first.
        expect(screen.getByRole('button', { name: 'Photo frame Classic' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Photo frame/ }));
        expect(screen.getByRole('radio', { name: 'Classic' })).toHaveAttribute('aria-checked', 'true');
        for (const name of ['No frame', 'Laurel', 'Confetti']) expect(screen.getByRole('img', { name })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('radio', { name: 'Laurel' }));
        expect(mutateAsync).toHaveBeenCalledWith({ uploadFrame: 'LAUREL' });
    });

    it('turns the frame off with No frame', () => {
        mutateAsync.mockResolvedValue({});
        render(<Screen />, { wrapper });
        fireEvent.click(screen.getByRole('button', { name: /Photo frame/ }));
        fireEvent.click(screen.getByRole('radio', { name: 'No frame' }));
        expect(mutateAsync).toHaveBeenCalledWith({ uploadFrame: 'NONE' });
    });
});
```

If `storyEvent` doesn't accept `status: 'ACTIVE'` because it is already ACTIVE, leave it out. If `@/.storybook/fixtures` can't be imported from a test (check another test that does: `grep -rl "storybook/fixtures" --include=*.test.tsx components hooks | head -1`), build the event inline with the fields the hook reads (`id`, `title`, `eventType`, `status`, `deletedAt`, `uploadFrame`, `schedule`).

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run components/gallery/GalleryFrameSheet.test.tsx`
Expected: FAIL — the files don't exist.

- [ ] **Step 3: The hook**

Create `hooks/useGalleryFrameSetting.ts`:

```ts
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useUpdateEvent } from '@/hooks/useEvent';
import type { EventDetailResponseDto, UploadFrame } from '@/lib/api/types';
import { isEventDeleted, isEventWritable } from '@/lib/eventLifecycle';
import { FRAME_PREVIEW_SIZE, frameSvg, frameSvgDataUrl, frameText, UPLOAD_FRAME_OPTIONS } from '@/lib/uploadFrame';

// The host's Photo frame (KAN-304): which design guests may add to their photos, or none. Graduations only for now.
export function useGalleryFrameSetting(event: EventDetailResponseDto | null, isHost: boolean) {
    const t = useTranslations('UploadFrame');
    const locale = useLocale();
    const toErrorMessage = useApiErrorMessage();
    const update = useUpdateEvent(event?.id ?? null);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const current: UploadFrame = event?.uploadFrame ?? 'NONE';
    const title = event?.title ?? null;
    const startAt = event?.schedule.startAt ?? null;
    const timezone = event?.schedule.timezone ?? null;
    const options = useMemo(() => {
        const text = frameText({ title, startAt, timezone }, locale);
        return UPLOAD_FRAME_OPTIONS.map((frame) => ({
            frame,
            label: frame === 'NONE' ? t('none') : t(`designs.${frame}`),
            previewSrc: frame === 'NONE' ? null : frameSvgDataUrl(frameSvg(frame, FRAME_PREVIEW_SIZE, text)),
        }));
    }, [locale, startAt, t, timezone, title]);

    const openSheet = useCallback(() => {
        setError(null);
        setOpen(true);
    }, []);
    const close = useCallback(() => setOpen(false), []);
    const choose = useCallback(
        async (frame: UploadFrame) => {
            if (frame === current) {
                setOpen(false);
                return;
            }
            setError(null);
            try {
                await update.mutateAsync({ uploadFrame: frame });
                setOpen(false);
            } catch (failure) {
                setError(toErrorMessage(failure));
            }
        },
        [current, toErrorMessage, update],
    );

    const shown = Boolean(event) && isHost && event?.eventType === 'GRADUATION' && isEventWritable(event.status) && !isEventDeleted(event);
    if (!shown) return null;
    return {
        label: t('setting'),
        value: options.find((option) => option.frame === current)?.label ?? t('none'),
        options,
        current,
        open,
        openSheet,
        close,
        choose,
        saving: update.isPending,
        error,
    };
}

export type GalleryFrameSetting = NonNullable<ReturnType<typeof useGalleryFrameSetting>>;
```

- [ ] **Step 4: The row and the sheet**

Create `components/gallery/GalleryFrameRow.tsx`:

```tsx
'use client';

import { ChevronRight } from 'lucide-react';

import type { GalleryFrameSetting } from '@/hooks/useGalleryFrameSetting';

// Photo frame on the host's gallery page: the design guests may add, opening the sheet to change it.
export function GalleryFrameRow({ setting }: { setting: GalleryFrameSetting }) {
    return (
        <button type="button" onClick={setting.openSheet} className="mb-5 flex min-h-12 w-full items-center gap-3 rounded-md px-1 text-left focus-ring">
            {/* Label */}
            <span className="min-w-0 flex-1 text-sm font-semibold text-ink">{setting.label}</span>
            {/* Current design */}
            <span className="text-sm text-ink-muted">{setting.value}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
        </button>
    );
}
```

Create `components/gallery/GalleryFrameSheet.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { UploadFramePreview } from '@/components/gallery/UploadFramePreview';
import { Modal } from '@/components/ui/modal';
import type { GalleryFrameSetting } from '@/hooks/useGalleryFrameSetting';
import { cn } from '@/lib/utils';

// The host picks the frame: each design on the sample photo, and No frame. A pick saves at once.
export function GalleryFrameSheet({ setting }: { setting: GalleryFrameSetting }) {
    const tCommon = useTranslations('Common');
    const titleId = useId();

    return (
        <Modal open={setting.open} onClose={setting.close} variant="sheet" size="sm" labelledBy={titleId} closeLabel={tCommon('close')} closeDisabled={setting.saving}>
            {/* Header */}
            <h2 id={titleId} className="text-base font-bold text-ink">
                {setting.label}
            </h2>

            {/* Designs */}
            <div role="radiogroup" aria-labelledby={titleId} className="mt-4 grid grid-cols-2 gap-3">
                {setting.options.map((option) => {
                    const labelId = `${titleId}-${option.frame}`;
                    const selected = option.frame === setting.current;
                    return (
                        <button
                            key={option.frame}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            aria-labelledby={labelId}
                            disabled={setting.saving}
                            onClick={() => setting.choose(option.frame)}
                            className={cn(
                                'flex flex-col gap-2 rounded-xl p-2 text-left focus-ring disabled:opacity-60',
                                selected ? 'bg-primary/10 ring-2 ring-primary' : 'bg-surface-muted/60',
                            )}
                        >
                            <UploadFramePreview src={option.previewSrc} alt={option.label} className="aspect-[4/5] w-full rounded-lg" />
                            <span id={labelId} className="text-sm font-semibold text-ink">
                                {option.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Error */}
            {setting.error && (
                <p role="alert" className="mt-3 text-xs text-red-500">
                    {setting.error}
                </p>
            )}
        </Modal>
    );
}
```

- [ ] **Step 5: On the gallery page**

`components/gallery/GalleryScreen.tsx`: add the imports

```ts
import { GalleryFrameRow } from '@/components/gallery/GalleryFrameRow';
import { GalleryFrameSheet } from '@/components/gallery/GalleryFrameSheet';
import { useGalleryFrameSetting } from '@/hooks/useGalleryFrameSetting';
```

after the `useGalleryScreen()` call add `const frameSetting = useGalleryFrameSetting(activeEvent, isHost);`, and directly after the `{/* Upload */}` block's closing `)}` add

```tsx
            {/* Photo frame */}
            {showUpload && frameSetting && (
                <>
                    <GalleryFrameRow setting={frameSetting} />
                    <GalleryFrameSheet setting={frameSetting} />
                </>
            )}
```

If a `GalleryScreen.*.test.tsx` now fails on `useUpdateEvent` or `useLocale`, mock the hook in that file: `vi.mock('@/hooks/useGalleryFrameSetting', () => ({ useGalleryFrameSetting: () => null }));`.

- [ ] **Step 6: The stories**

Create `components/gallery/GalleryFrameSheet.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { GalleryFrameRow } from '@/components/gallery/GalleryFrameRow';
import { GalleryFrameSheet } from '@/components/gallery/GalleryFrameSheet';
import type { GalleryFrameSetting } from '@/hooks/useGalleryFrameSetting';
import { FRAME_PREVIEW_SIZE, frameSvg, frameSvgDataUrl, UPLOAD_FRAME_OPTIONS } from '@/lib/uploadFrame';

const LABELS = { NONE: 'No frame', CLASSIC: 'Classic', LAUREL: 'Laurel', CONFETTI: 'Confetti' } as const;
const text = { title: 'Η αποφοίτηση της Μαρίας', date: '2 Ιουλίου 2026' };

const setting: GalleryFrameSetting = {
    label: 'Photo frame',
    value: 'Classic',
    options: UPLOAD_FRAME_OPTIONS.map((frame) => ({
        frame,
        label: LABELS[frame],
        previewSrc: frame === 'NONE' ? null : frameSvgDataUrl(frameSvg(frame, FRAME_PREVIEW_SIZE, text)),
    })),
    current: 'CLASSIC',
    open: true,
    openSheet: fn(),
    close: fn(),
    choose: fn(),
    saving: false,
    error: null,
};

const meta = {
    title: 'Gallery/GalleryFrameSheet',
    component: GalleryFrameSheet,
    args: { setting },
} satisfies Meta<typeof GalleryFrameSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Classic: Story = {};

export const NoFrame: Story = { args: { setting: { ...setting, current: 'NONE', value: 'No frame' } } };

export const Row: Story = {
    render: () => (
        <div className="max-w-md p-4">
            <GalleryFrameRow setting={{ ...setting, open: false }} />
        </div>
    ),
};
```

- [ ] **Step 7: Run the tests and checks**

Run: `npx vitest run components/gallery hooks lib`
Expected: PASS.

Run: `npx tsc --noEmit`, `npx eslint components hooks lib`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add hooks/useGalleryFrameSetting.ts components/gallery/GalleryFrameRow.tsx components/gallery/GalleryFrameSheet.tsx components/gallery/GalleryFrameSheet.test.tsx components/gallery/GalleryFrameSheet.stories.tsx components/gallery/GalleryScreen.tsx
git commit -m "KAN-304: graduation hosts pick the photo frame, or none, from the gallery page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Full check and the real thing

- [ ] **Step 1: Every check**

Run: `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`
Expected: all clean.

- [ ] **Step 2: In a real browser, on a real photo**

The canvas and SVG steps are mocked in tests, so this is the check that the frame really draws. Dev server only through `preview_start {url: "http://localhost:3000/"}`, backend branch running locally (`claude/kan-300-graduation-backend`, with V237/V238 applied), a GRADUATION event with the gallery:

1. Host, gallery page, 375 px then 1280 px: **Photo frame** row says Classic; the sheet shows No frame and the three designs on the sample photo, the title and date readable; pick Laurel; the row says Laurel.
2. Same page: **Add frame** is off; turn it on, upload one portrait and one landscape JPEG and a video; open each: both photos carry the laurel frame with the event title and date and keep their own shape; the video is untouched. Download a photo's original: it is framed too.
3. Reload: **Add frame** is still on for this event. Open a non-graduation event's gallery: no switch, no Photo frame row.
4. Feed Gallery block as a guest (another browser): **Add frame** above the button; upload with it on and off.
5. Signed out, the event's QR upload link: **Add frame** shows; upload with it on; the photo in the gallery is framed.
6. Pick a GIF with Add frame on: it uploads plain and the line **Some photos were uploaded without the frame.** shows once.
7. On an iPhone (or the WebKit setup in the memory notes): one framed upload from the QR form, since Safari is where an SVG drawn on a canvas is most likely to differ.
8. Host turns it to **No frame**: the switch disappears from all three places.

- [ ] **Step 3: Push and open the PR into staging**

Once part 1 is merged into `staging`, rebase on it (`git fetch origin staging -q && git rebase origin/staging`), then:

```bash
git push -u origin claude/kan-304-upload-frame
gh pr create --base staging --title "KAN-304: Graduation photo frame" --body-file <file>
```

The body: what the frame does and where it shows, the two deviations from the spec above, that it needs guestwall-be `claude/kan-300-graduation-backend` deployed first (without it nothing shows), the real-browser results from Step 2, the ticket key KAN-304 only, and ends with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
