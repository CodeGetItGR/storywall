# QR card templates — frontend implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This repo's CLAUDE.md forbids parallel subagents unless the user allows them for the task: run one task at a time.

**Goal:** Hosts print their QR codes as designed A6 cards (Print, PNG, PDF), picked from an admin-curated catalog per event type, on events whose plan has the `qr_cards` module.

**Architecture:** The card is one SVG in millimetres (`QrCardSvg`): artwork, title, a white panel holding a QR drawn from `uqr`'s module grid, and lines. The same node prints (with an A6 `@page`), and is serialized with its images and font inlined as data URIs, drawn on a 1240 × 1748 canvas for the PNG, and wrapped by `pdf-lib` for the PDF. `GET /api/events/{eventId}/qr-card-templates` answers `{ available, templates }`; the designer and the "Print" link to the card page show only when `available` is true. The admin catalog copies the theme preset panel (table plus drawer).

**Tech stack:** Next.js 16 App Router, React 19, TanStack Query, next-intl, vitest + Testing Library (jsdom; `// @vitest-environment node` for the scan test), `uqr`, `pdf-lib`, dev-only `@resvg/resvg-js` and `jsqr`.

**Spec:** [docs/superpowers/specs/2026-10-28-qr-card-templates-design.md](../specs/2026-10-28-qr-card-templates-design.md). **Backend:** [2026-10-28-qr-card-templates-backend.md](2026-10-28-qr-card-templates-backend.md) and its FE guide, `docs/fe-guides/qr-card-templates-fe-integration.md` in `event_social_media`. The backend PR lands first; until it is on staging, run it locally (Task 19).

---

## File map

**Create**

| File | Responsibility |
| --- | --- |
| `lib/qrCardCode.ts` (+ test) | QR module grid from `uqr`, logo clearing, one SVG path of plain square modules. |
| `lib/qrCard.ts` (+ test) | Card constants, Plain style, template → style, text fitting and layout, default line keys, gift lines, file name. |
| `lib/qrCardExport.ts` (+ test) | Standalone SVG (data URIs), PNG raster, PDF bytes, file save. |
| `lib/api/prefetchQrCardTemplates.ts` | Server-side seed of the template list. |
| `lib/adminQrCards.ts` (+ test) | Admin draft, validation, payloads, status, filter. |
| `components/qrCard/QrCardSvg.tsx` (+ scan test) | The card SVG. |
| `components/qrCard/QrCardDesigner.tsx` | Preview, template strip, text fields, options slot, actions. |
| `components/qrCard/QrCardTemplateStrip.tsx` (+ test) | Plain plus the event's templates. |
| `components/qrCard/QrCardTextFields.tsx` | Title, line, giver inputs. |
| `components/qrCard/QrCardActions.tsx` | Print, Save PNG, Save PDF, inline error. |
| `components/qrCard/QrCardPrintStyle.tsx` | A6 `@page` and print sizing while mounted. |
| `components/qrCard/QrCardSkeletons.tsx` | Designer and page skeletons. |
| `components/qrCard/QrCardScreen.tsx` | The card page for a share link or the gallery QR. |
| `components/giftMode/GiftCardPlain.tsx` | Today's gift card, moved out of the screen unchanged. |
| `components/giftMode/GiftCardPinOption.tsx` | The PIN checkbox, shared by both gift layouts. |
| `components/admin/qrCards/QrCardTemplatesPanel.tsx` | Admin panel. |
| `components/admin/qrCards/QrCardTemplatesTable.tsx` | Admin table. |
| `components/admin/qrCards/QrCardTemplateRow.tsx` | Admin row. |
| `components/admin/qrCards/QrCardTemplateDrawer.tsx` (+ test) | Admin drawer. |
| `components/admin/qrCards/QrCardTemplatePreview.tsx` | Live preview in the drawer. |
| `hooks/useQrCardTemplates.ts` (+ test) | `qrCardTemplateKeys`, `useQrCardTemplates`, `useQrCardHref`. No `'use client'`: server pages import the keys. |
| `hooks/useQrCardDesigner.ts` (+ test) | Selected template and card text. |
| `hooks/useQrCardExport.ts` (+ test) | Print, PNG, PDF state. |
| `hooks/useQrCardScreen.ts` (+ test) | The card page's data, gating and states. |
| `hooks/useAdminQrCardTemplates.ts` (+ test) | Admin queries and mutations. |
| `hooks/useQrCardTemplatesCatalog.ts` | Admin search, filter, order, drawer state. |
| `hooks/useQrCardTemplateDrawer.ts` (+ test) | Admin drawer form. |
| `hooks/useGiftCardPrint.test.tsx` | The gift card hook, now with designs. |
| `components/admin/AdminNavigationContext.qrCards.test.tsx` | The admin tab's hash and place. |
| `app/api/qr-card-artwork/[templateId]/[version]/route.ts` (+ test) | Same-origin artwork proxy. |
| `app/(main)/(app)/(event)/events/[eventId]/manage/qr/[qrLinkId]/card/page.tsx` (+ test) | Server prefetch. |
| `…/manage/qr/[qrLinkId]/card/PageClient.tsx` | Route gate. |
| `…/manage/qr/[qrLinkId]/card/loading.tsx` | Skeleton. |
| `…/tools/gallery/qr/page.test.tsx`, `…/manage/gift/card/page.test.tsx` | Prefetch tests. |

**Modify**

`package.json`, `package-lock.json`, `lib/api/types.ts`, `lib/api/endpoints.ts`, `lib/api/errors.ts`, `lib/routes.ts`, `lib/planModules.tsx`, `lib/occasions/occasionFeatures.ts`, `lib/demo/mockHandlers.ts`, `messages/en.json`, `messages/el.json`, `components/manage/invitations/QrCodeCard.tsx` (+ test), `components/manage/invitations/QrPreviewModal.tsx`, `components/gallery/GalleryQrScreen.tsx`, `hooks/useGalleryQrScreen.ts`, `components/giftMode/GiftCardPrintScreen.tsx`, `hooks/useGiftCardPrint.ts`, the `manage/qr`, `tools/gallery/qr` and `manage/gift/card` `page.tsx` files (+ the `manage/qr` test), `components/admin/AdminNavigationContext.tsx`, `components/admin/AdminShellNav.tsx`, `components/admin/AdminConsole.tsx`. Possibly `lib/security/securityHeaders.mjs` (+ test) (Task 19, Step 6).

**Conventions used below**

- Paths starting `…/` are under `app/(main)/(app)/(event)/events/[eventId]/`. Quote them in the shell: they contain brackets and parentheses.
- Run single test files with `npx vitest run <path>`.
- Every visible string is a translation key. Greek host copy uses the informal "εσύ" (as `GiftMode` does) and διοργανωτής for host; admin copy uses the formal plural (as `AdminPage.themePresets` does).
- Links use `AppLink` from `@/components/ui/AppLink` (lint forbids `next/link`).
- Commit after each task; push only in Task 20.

---

### Task 0: Branch and dependencies

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Bring the branch up to date with staging**

This branch (`claude/qr-code-templates-962814`) already starts from `origin/staging` and holds only the spec and the plans.

```bash
git fetch origin
git status --short
git rebase origin/staging
```

Expected: a clean tree, then "is up to date" or a clean rebase. If `git status` shows changes you did not make, stop and ask.

- [ ] **Step 2: Install from the lockfile**

```bash
npm ci
```

Do not junction `node_modules` to the main checkout (the usual worktree shortcut): this task changes the lockfile.

- [ ] **Step 3: Add the libraries**

```bash
npm install uqr pdf-lib
npm install -D @resvg/resvg-js jsqr
```

Expected: both succeed; `package.json` lists `uqr` and `pdf-lib` under `dependencies`, `@resvg/resvg-js` and `jsqr` under `devDependencies`.

- [ ] **Step 4: Confirm the `uqr` API before relying on it**

```bash
node -e "const p=require('./node_modules/uqr/package.json');console.log(p.version, p.types || p.typings || p.exports)"
node -e "import('uqr').then(({encode})=>{const r=encode('hi',{ecc:'H',border:0});console.log(r.size, r.data.length, r.data[0].length, r.data[0].slice(0,7).join(','))})"
```

Expected: a size of 21, a 21 × 21 grid, and the top row starting with seven `true` (a finder pattern's top edge). Task 2 assumes `encode(text, { ecc, border })` returns `{ size, data }` with `data[row][col]`. If the names differ, adapt `qrModules` in Task 2 to the real API before writing it.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(qr-cards): add uqr, pdf-lib and the scan test tools"
```

---

### Task 1: Types, endpoints, error codes, module key, route

**Files:**
- Modify: `lib/api/types.ts`, `lib/api/endpoints.ts`, `lib/api/errors.ts`, `lib/routes.ts`, `lib/planModules.tsx`, `lib/occasions/occasionFeatures.ts`, `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Add `qr_cards` to the module keys**

In `lib/api/types.ts`, `EVENT_MODULE_KEYS` (line ~22) ends with `'vendors',`. Add one entry after it:

```ts
    'quiz_polls',
    'vendors',
    'qr_cards',
] as const;
```

- [ ] **Step 2: Add the host types**

In `lib/api/types.ts`, right after `export interface EventThemeFontDto { … }` (line ~973):

```ts
// QR card templates (qr-card-templates-fe-integration.md): A6 card designs a host prints a QR on.
export interface QrCardTemplateDto {
    id: string;
    name: LocalizedText;
    artworkUrl: string; // FE-origin path, /api/qr-card-artwork/<id>/<version>
    textColor: string; // #RRGGBB
    headingFont: EventThemeFontDto | null; // null = the card's own font
    codeColor: string; // #RRGGBB, at least 4.5:1 against white
    centerLogo: boolean;
}

// GET /api/events/{eventId}/qr-card-templates. available: the event has QR cards (drafts included).
// templates: live, with artwork, for the event's type, sorted; empty when available is false.
export interface QrCardTemplateListDto {
    available: boolean;
    templates: QrCardTemplateDto[];
}
```

- [ ] **Step 3: Add the admin types**

In `lib/api/types.ts`, right after `export interface AdminThemePresetPatchDto { … }` (line ~4339):

```ts
// /api/admin/qr-card-templates — the whole catalog, archived and without artwork included.
export interface AdminQrCardTemplateDto {
    id: string;
    name: LocalizedText;
    eventTypes: EventTypeConvention[];
    sortOrder: number;
    archived: boolean;
    artworkUrl: string | null; // null until uploaded; such a template isn't offered to hosts
    textColor: string;
    headingFont: AdminThemeFontSummaryDto | null;
    codeColor: string;
    centerLogo: boolean;
}

// POST /api/admin/qr-card-templates
export interface AdminQrCardTemplateRequestDto {
    name: LocalizedText;
    eventTypes: EventTypeConvention[];
    sortOrder: number;
    textColor: string;
    headingFontId?: string | null;
    codeColor: string;
    centerLogo: boolean;
}

// PATCH /api/admin/qr-card-templates/{id}. Omitted fields stay as they are.
export interface AdminQrCardTemplatePatchDto {
    name?: LocalizedText;
    eventTypes?: EventTypeConvention[];
    sortOrder?: number;
    archived?: boolean;
    textColor?: string;
    headingFontId?: string;
    clearHeadingFont?: boolean;
    codeColor?: string;
    centerLogo?: boolean;
}
```

- [ ] **Step 4: Add the endpoints**

In `lib/api/endpoints.ts`, under `events` right after `themePresets: (eventId: string) => …` (line ~119):

```ts
        qrCardTemplates: (eventId: string) => `/api/events/${eventId}/qr-card-templates`,
```

Under `admin`, right after the `themePresets: { … }` block (line ~455):

```ts
        qrCardTemplates: {
            list: '/api/admin/qr-card-templates',
            byId: (id: string) => `/api/admin/qr-card-templates/${id}`,
            artwork: (id: string) => `/api/admin/qr-card-templates/${id}/artwork`,
        },
```

- [ ] **Step 5: Add the error codes**

In `lib/api/errors.ts`, right after `PRINT_ITEM_INVALID: 3108,`:

```ts
    QR_CARD_CODE_COLOR_LOW_CONTRAST: 3110,
    QR_CARD_ARTWORK_SIZE_INVALID: 3111,
```

- [ ] **Step 6: Add the card route**

In `lib/routes.ts`, right after `invitationsQr: …` (line ~62):

```ts
        // The printable card for one share link or the gallery QR (QR card templates, 2026-10-28).
        qrCard: (eventId: string, qrLinkId: string) => `${eventBasePath(eventId)}/manage/qr/${qrLinkId}/card`,
```

- [ ] **Step 7: Keep `qr_cards` off the occasion pages**

In `lib/occasions/occasionFeatures.ts`, replace the comment and set above `OCCASION_HIDDEN_MODULES`:

```ts
// Modules the features overview leaves out: internal ones, plan details, vendors (hired help, not a guest feature),
// qr_cards (a host print tool), and `theme`, which has its own row.
export const OCCASION_HIDDEN_MODULES: ReadonlySet<string> = new Set(['member_roles', 'co_hosts', 'theme', 'vendors', 'qr_cards']);
```

Landing and occasion copy stays untouched (CLAUDE.md): hiding the key means no occasion page lists it.

- [ ] **Step 8: Give the module an icon and fallback name**

In `lib/planModules.tsx`, add `QrCode` to the `lucide-react` import (between `Palette` and `Tags`), then add to `moduleIcons` after `quiz_polls: MessageCircleQuestion,`:

```ts
    qr_cards: QrCode,
```

and to `moduleFallbacks` after the `quiz_polls` entry:

```ts
    qr_cards: {
        name: 'QR cards',
        description: 'Designed cards for printing your QR codes.',
    },
```

- [ ] **Step 9: Add the module and alt-text copy**

`messages/en.json`, in `"Modules"` after `"quiz_polls": { … },`:

```json
        "qr_cards": {
            "name": "QR cards",
            "description": "Designed cards for printing your QR codes."
        },
```

`messages/el.json`, same place:

```json
        "qr_cards": {
            "name": "Κάρτες QR",
            "description": "Σχεδιασμένες κάρτες για την εκτύπωση των κωδικών QR σας."
        },
```

`messages/en.json`, in `"ImageAlt"` after `"themeIllustration": "{name} theme",`:

```json
        "qrCardTemplate": "{name} card design",
```

`messages/el.json`, same place:

```json
        "qrCardTemplate": "Σχέδιο κάρτας {name}",
```

- [ ] **Step 10: Type-check and run the copy tests**

```bash
npm run type:check
npx vitest run messages lib/occasions lib/planModules
```

Expected: type-check passes; the tests pass (or report "No test files found" for a path without tests). If type-check flags an exhaustive `Record` over the module keys, add a `qr_cards` entry to it with the same shape as its `vendors` entry.

- [ ] **Step 11: Commit**

```bash
git add lib/api/types.ts lib/api/endpoints.ts lib/api/errors.ts lib/routes.ts lib/planModules.tsx lib/occasions/occasionFeatures.ts messages/en.json messages/el.json
git commit -m "feat(qr-cards): add the QR card types, endpoints, module key and route"
```

---

### Task 2: QR code path (`lib/qrCardCode.ts`)

**Files:**
- Create: `lib/qrCardCode.ts`
- Test: `lib/qrCardCode.test.ts`

Every code is drawn with plain square modules; the finder patterns are ordinary square modules too.

- [ ] **Step 1: Write the failing test**

```ts
import { encode } from 'uqr';
import { describe, expect, it } from 'vitest';

import { logoSpan, qrCodePath, qrModules } from '@/lib/qrCardCode';

const URL = 'https://storywall.gr/q/AbCdEf123456';
const RUN = /M(\d+) (\d+)h(\d+)v1h-(\d+)z/g;

// The cells a path draws, as "row,col", read back from its row runs.
function drawnCells(d: string): Set<string> {
    const cells = new Set<string>();
    for (const [, x, y, width] of d.matchAll(RUN)) {
        for (let col = Number(x); col < Number(x) + Number(width); col++) cells.add(`${y},${col}`);
    }
    return cells;
}

// The dark cells uqr encodes, as "row,col", minus any the filter drops.
function encodedCells(ecc: 'Q' | 'H', keep: (row: number, col: number) => boolean = () => true): Set<string> {
    const { data } = encode(URL, { ecc, border: 0 });
    const cells = new Set<string>();
    data.forEach((cols, row) => cols.forEach((dark, col) => dark && keep(row, col) && cells.add(`${row},${col}`)));
    return cells;
}

describe('qrModules', () => {
    it('keeps the finder patterns as dark modules', () => {
        const { size, isDark } = qrModules(URL, false);
        for (const [row, col] of [
            [0, 0],
            [6, 6],
            [2, 2],
            [0, size - 1],
            [size - 1, 0],
        ]) {
            expect(isDark(row, col), `${row},${col}`).toBe(true);
        }
        for (const [row, col] of [
            [1, 1],
            [5, 5],
            [7, 0],
        ]) {
            expect(isDark(row, col), `${row},${col}`).toBe(false);
        }
    });

    it('centres the logo and clears a one-module ring around it', () => {
        const { size, isDark, logo } = qrModules(URL, true);
        expect(logo).not.toBeNull();
        const { start, span } = logo!;
        expect(span % 2).toBe(1);
        expect(start + (span - 1) / 2).toBe((size - 1) / 2);
        for (let row = start - 1; row <= start + span; row++) {
            for (let col = start - 1; col <= start + span; col++) expect(isDark(row, col), `${row},${col}`).toBe(false);
        }
    });

    it('has no logo square without the logo', () => {
        expect(qrModules(URL, false).logo).toBeNull();
    });
});

describe('logoSpan', () => {
    it.each([
        [21, 3],
        [25, 5],
        [29, 5],
        [57, 11],
    ])('gives a %i-module code a %i-module logo', (size, span) => {
        expect(logoSpan(size)).toBe(span);
    });
});

describe('qrCodePath', () => {
    it('is only whole-module row runs', () => {
        const { d } = qrCodePath(URL, { centerLogo: true });
        expect(d.length).toBeGreaterThan(0);
        expect(d.replace(RUN, '')).toBe('');
    });

    it('starts with the top-left finder pattern’s top edge as one run', () => {
        expect(qrCodePath(URL, { centerLogo: false }).d.startsWith('M0 0h7v1h-7z')).toBe(true);
    });

    it('draws exactly the encoded modules, x as the column and y as the row', () => {
        const { size, d } = qrCodePath(URL, { centerLogo: false });
        expect(size).toBe(encode(URL, { ecc: 'Q', border: 0 }).size);
        expect(drawnCells(d)).toEqual(encodedCells('Q'));
    });

    it('is not transposed', () => {
        const { data } = encode(URL, { ecc: 'Q', border: 0 });
        const cells = drawnCells(qrCodePath(URL, { centerLogo: false }).d);
        let checked = 0;
        data.forEach((cols, row) =>
            cols.forEach((dark, col) => {
                if (!dark || data[col][row]) return;
                // Dark at (row, col) but light at (col, row): only the right orientation draws it.
                expect(cells.has(`${row},${col}`), `${row},${col}`).toBe(true);
                expect(cells.has(`${col},${row}`), `${col},${row}`).toBe(false);
                checked++;
            }),
        );
        expect(checked).toBeGreaterThan(0);
    });

    it('draws the encoded modules around the cleared logo square', () => {
        const { d, logo } = qrCodePath(URL, { centerLogo: true });
        const { start, span } = logo!;
        const isCleared = (row: number, col: number) => row >= start - 1 && row <= start + span && col >= start - 1 && col <= start + span;
        expect(drawnCells(d)).toEqual(encodedCells('H', (row, col) => !isCleared(row, col)));
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/qrCardCode.test.ts`
Expected: FAIL, "Failed to resolve import "@/lib/qrCardCode"".

- [ ] **Step 3: Write `lib/qrCardCode.ts`**

```ts
import { encode } from 'uqr';

// The code in module units (one module = 1), without the quiet zone. `d` draws every dark module as a
// plain square, finder patterns included. `logo` is the square the centre logo covers, in modules.
export type QrCodePath = {
    size: number;
    d: string;
    logo: { start: number; span: number } | null;
};

// The logo's side in modules: odd, so it sits exactly on the centre module, and about a fifth of the code.
export function logoSpan(size: number): number {
    const span = Math.floor(size * 0.2);
    return span % 2 === 1 ? span : span - 1;
}

// Error correction H when the logo covers modules (it rebuilds up to 30%), else Q. The logo's square
// and a one-module ring around it are cleared, so no module touches the logo.
export function qrModules(text: string, centerLogo: boolean) {
    const { size, data } = encode(text, { ecc: centerLogo ? 'H' : 'Q', border: 0 });
    const span = centerLogo ? logoSpan(size) : 0;
    const centre = (size - 1) / 2;
    const clearRadius = (span + 1) / 2;
    const isCleared = (row: number, col: number) => centerLogo && Math.abs(row - centre) <= clearRadius && Math.abs(col - centre) <= clearRadius;
    return {
        size,
        isDark: (row: number, col: number) => data[row][col] && !isCleared(row, col),
        logo: centerLogo ? { start: centre - (span - 1) / 2, span } : null,
    };
}

// One path of runs of dark modules along each row: neighbours inside a run share no anti-aliased seam.
export function qrCodePath(text: string, { centerLogo }: { centerLogo: boolean }): QrCodePath {
    const { size, isDark, logo } = qrModules(text, centerLogo);
    const parts: string[] = [];
    for (let row = 0; row < size; row++) {
        let start = -1;
        for (let col = 0; col <= size; col++) {
            const dark = col < size && isDark(row, col);
            if (dark && start < 0) start = col;
            if (!dark && start >= 0) {
                parts.push(`M${start} ${row}h${col - start}v1h${start - col}z`);
                start = -1;
            }
        }
    }
    return { size, d: parts.join(''), logo };
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `npx vitest run lib/qrCardCode.test.ts`
Expected: PASS, 12 tests. If the three tests that compare against `encode` fail, the grid is transposed: check `data[row][col]` against Task 0, Step 4.

- [ ] **Step 5: Commit**

```bash
git add lib/qrCardCode.ts lib/qrCardCode.test.ts
git commit -m "feat(qr-cards): draw QR codes as one path of square modules"
```

---

### Task 3: Card layout and text (`lib/qrCard.ts`)

**Files:**
- Create: `lib/qrCard.ts`
- Test: `lib/qrCard.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import type { QrCardTemplateDto } from '@/lib/api/types';
import {
    estimateTextWidth,
    fitText,
    giftQrCardLines,
    layoutLines,
    layoutTitle,
    PLAIN_QR_CARD_STYLE,
    QR_CARD_LAYOUT,
    QR_CARD_LINE_BOXES,
    QR_CARD_LINE_KEYS,
    QR_CARD_TITLE_BOX,
    qrCardFileName,
    qrCardStyleOf,
} from '@/lib/qrCard';

describe('fitText', () => {
    it('keeps a short title at the largest size, on one line', () => {
        expect(fitText('Anna & Nikos', QR_CARD_TITLE_BOX)).toEqual({ lines: ['Anna & Nikos'], fontSize: 9 });
    });

    it('shrinks a long title until it fits on two lines', () => {
        expect(fitText('Μαρία Παπαδοπούλου & Νικόλαος Αλεξανδρόπουλος', QR_CARD_TITLE_BOX)).toEqual({
            lines: ['Μαρία Παπαδοπούλου &', 'Νικόλαος Αλεξανδρόπουλος'],
            fontSize: 6,
        });
    });

    it('breaks a word too long for one line', () => {
        const fitted = fitText('x'.repeat(60), QR_CARD_LINE_BOXES.body);
        expect(fitted.lines.length).toBeLessThanOrEqual(2);
        expect(fitted.lines.join('')).toBe('x'.repeat(60));
    });

    it('ends on an ellipsis when even the smallest size runs over', () => {
        const fitted = fitText('word '.repeat(80), QR_CARD_LINE_BOXES.body);
        expect(fitted.fontSize).toBe(3.5);
        expect(fitted.lines).toHaveLength(2);
        expect(fitted.lines[1].endsWith('…')).toBe(true);
    });

    it.each(['Anna & Nikos', 'ΒΑΠΤΙΣΗ ΤΗΣ ΕΛΕΝΗΣ ΚΑΙ ΤΟΥ ΓΙΩΡΓΟΥ', 'W'.repeat(40)])('never estimates a line wider than the box: %s', (title) => {
        const fitted = fitText(title, QR_CARD_TITLE_BOX);
        for (const line of fitted.lines) expect(estimateTextWidth(line, fitted.fontSize)).toBeLessThanOrEqual(QR_CARD_TITLE_BOX.width);
    });

    it('draws nothing for blank text', () => {
        expect(fitText('   ', QR_CARD_TITLE_BOX).lines).toEqual([]);
    });
});

describe('layoutTitle', () => {
    it('centres the title in its band', () => {
        expect(layoutTitle('Anna & Nikos')).toEqual({ lines: ['Anna & Nikos'], fontSize: 9, baselines: [25.34] });
    });
});

describe('layoutLines', () => {
    it('keeps the full gift card stack inside the band', () => {
        const placed = layoutLines([
            { text: 'Scan to claim your gift and enjoy it with everyone you love', tone: 'body' },
            { text: 'PIN: 4821 9934', tone: 'code' },
            { text: 'Or sign in with a.very.long.address@example-mail.com', tone: 'small' },
            { text: 'With love from the whole Papadopoulos family', tone: 'strong' },
        ]);
        const { top, bottom } = QR_CARD_LAYOUT.lines;
        expect(placed.map((line) => line.tone)).toEqual(['body', 'code', 'small', 'strong']);
        for (const line of placed) {
            expect(line.baselines[0] - 0.86 * line.fontSize).toBeGreaterThanOrEqual(top - 0.01);
            expect(line.baselines[line.baselines.length - 1] + 0.34 * line.fontSize).toBeLessThanOrEqual(bottom + 0.01);
        }
    });

    it('leaves out empty lines', () => {
        expect(layoutLines([{ text: '  ', tone: 'body' }, { text: 'Eleni', tone: 'strong' }]).map((line) => line.tone)).toEqual(['strong']);
    });
});

describe('default lines', () => {
    it('picks the line by what the QR opens', () => {
        expect(QR_CARD_LINE_KEYS).toEqual({ EVENT_JOIN: 'join', INVITATION: 'invitation', MEDIA_UPLOAD: 'gallery' });
    });

    it('stacks the gift card lines, leaving out a missing PIN or email', () => {
        expect(giftQrCardLines({ line: 'Scan', pin: 'PIN: 1234', email: null, giver: 'Eleni' })).toEqual([
            { text: 'Scan', tone: 'body' },
            { text: 'PIN: 1234', tone: 'code' },
            { text: 'Eleni', tone: 'strong' },
        ]);
    });
});

describe('qrCardFileName', () => {
    it.each([
        ['Maria & Nikos', 'png', 'Maria-&-Nikos.png'],
        ['Τραπέζι 4: κήπος?', 'png', 'Τραπέζι-4-κήπος.png'],
        ['   ', 'pdf', 'storywall-qr.pdf'],
    ] as const)('names %s', (title, extension, expected) => {
        expect(qrCardFileName(title, extension)).toBe(expected);
    });
});

describe('qrCardStyleOf', () => {
    it("takes a template's look", () => {
        const template: QrCardTemplateDto = {
            id: 't1',
            name: { en: 'Linen', el: 'Λινό' },
            artworkUrl: '/api/qr-card-artwork/t1/1',
            textColor: '#5A3E2B',
            headingFont: null,
            codeColor: '#1F3A5A',
            centerLogo: false,
        };
        expect(qrCardStyleOf(template)).toEqual({
            id: 't1',
            artworkUrl: '/api/qr-card-artwork/t1/1',
            textColor: '#5A3E2B',
            headingFont: null,
            codeColor: '#1F3A5A',
            centerLogo: false,
        });
    });

    it('keeps Plain as today’s look', () => {
        expect(PLAIN_QR_CARD_STYLE).toMatchObject({ artworkUrl: null, codeColor: '#241F1A', centerLogo: true });
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/qrCard.test.ts`
Expected: FAIL, "Failed to resolve import "@/lib/qrCard"".

- [ ] **Step 3: Write `lib/qrCard.ts`**

```ts
import type { EventThemeFontDto, QrCardTemplateDto, QrTargetType } from '@/lib/api/types';

// A6 portrait in millimetres: the card SVG's user units.
export const QR_CARD_WIDTH = 105;
export const QR_CARD_HEIGHT = 148;
// 300 dpi at A6, for the PNG.
export const QR_CARD_EXPORT_WIDTH = 1240;
export const QR_CARD_EXPORT_HEIGHT = 1748;
// A6 in PDF points (1/72 in).
export const QR_CARD_PDF_WIDTH = 297.64;
export const QR_CARD_PDF_HEIGHT = 419.53;

export const QR_CARD_TITLE_MAX = 40;
export const QR_CARD_LINE_MAX = 60;

// Mirrors the --ink token: today's printed card's text and code colour.
export const QR_CARD_INK = '#241F1A';
// Today's print popup font. Every device has it, so the preview and the exported file match.
export const QR_CARD_FONT = 'Arial, Helvetica, sans-serif';
export const QR_CARD_MONO_FONT = '"Courier New", Courier, monospace';
export const QR_CARD_LOGO_SRC = '/assets/Logo.svg';
// The quiet zone, in modules, on the white panel around the code.
export const QR_QUIET_ZONE = 4;

export const PLAIN_QR_CARD_ID = 'plain';

// How a card looks: a backend template, or the built-in Plain.
export type QrCardStyle = {
    id: string;
    artworkUrl: string | null;
    textColor: string;
    headingFont: EventThemeFontDto | null;
    codeColor: string;
    centerLogo: boolean;
};

// Built in, never from the backend: today's printed look at A6.
export const PLAIN_QR_CARD_STYLE: QrCardStyle = {
    id: PLAIN_QR_CARD_ID,
    artworkUrl: null,
    textColor: QR_CARD_INK,
    headingFont: null,
    codeColor: QR_CARD_INK,
    centerLogo: true,
};

export function qrCardStyleOf(template: QrCardTemplateDto): QrCardStyle {
    return {
        id: template.id,
        artworkUrl: template.artworkUrl,
        textColor: template.textColor,
        headingFont: template.headingFont,
        codeColor: template.codeColor,
        centerLogo: template.centerLogo,
    };
}

// The default line under the code (a QrCardPage.lines key), by what the QR opens.
export const QR_CARD_LINE_KEYS = {
    EVENT_JOIN: 'join',
    INVITATION: 'invitation',
    MEDIA_UPLOAD: 'gallery',
} as const satisfies Record<QrTargetType, string>;

export type QrCardLineTone = 'body' | 'strong' | 'code' | 'small';
export type QrCardLine = { text: string; tone: QrCardLineTone };

// The gift card's stack under the code. pin and email come already worded; null leaves the line out.
export function giftQrCardLines({ line, pin, email, giver }: { line: string; pin: string | null; email: string | null; giver: string }): QrCardLine[] {
    const lines: QrCardLine[] = [{ text: line, tone: 'body' }];
    if (pin) lines.push({ text: pin, tone: 'code' });
    if (email) lines.push({ text: email, tone: 'small' });
    lines.push({ text: giver, tone: 'strong' });
    return lines;
}

// Fixed spots on the card in millimetres, inside an 8 mm safe margin.
export const QR_CARD_LAYOUT = {
    textX: QR_CARD_WIDTH / 2,
    title: { top: 10, bottom: 36 },
    panel: { x: 20.5, y: 40, size: 64, radius: 4 },
    lines: { top: 107, bottom: 140, gap: 2 },
} as const;

export type TextBox = { width: number; maxLines: number; maxSize: number; minSize: number; mono?: boolean };

const TEXT_WIDTH = QR_CARD_WIDTH - 16;
export const QR_CARD_TITLE_BOX: TextBox = { width: TEXT_WIDTH, maxLines: 2, maxSize: 9, minSize: 5 };
export const QR_CARD_LINE_BOXES: Record<QrCardLineTone, TextBox> = {
    body: { width: TEXT_WIDTH, maxLines: 2, maxSize: 5, minSize: 3.5 },
    strong: { width: TEXT_WIDTH, maxLines: 2, maxSize: 5, minSize: 3.5 },
    code: { width: TEXT_WIDTH, maxLines: 1, maxSize: 5.5, minSize: 4, mono: true },
    small: { width: TEXT_WIDTH, maxLines: 2, maxSize: 3.2, minSize: 2.6 },
};

const LINE_HEIGHT = 1.2;
// The baseline's drop from the top of its line box, as a share of the font size: centres capitals and descenders.
const BASELINE = 0.86;
const SIZE_STEP = 0.25;
// A mono glyph plus the 0.2 em letter spacing the code tone draws with.
const MONO_WIDTH = 0.8;
// A stack of lines too tall for its band shrinks every tone together, down to this share.
const MIN_LINES_SCALE = 0.6;
const LINES_SCALE_STEP = 0.05;

function round(value: number): number {
    return Math.round(value * 1000) / 1000;
}

// Rough advance widths as a share of the font size, on the wide side so a line never spills.
function charWidth(char: string): number {
    if (char === ' ') return 0.32;
    return char !== char.toLocaleLowerCase() ? 0.74 : 0.6;
}

export function estimateTextWidth(text: string, size: number, mono = false): number {
    const chars = [...text];
    const units = mono ? chars.length * MONO_WIDTH : chars.reduce((sum, char) => sum + charWidth(char), 0);
    return units * size;
}

function fits(text: string, size: number, box: TextBox): boolean {
    return estimateTextWidth(text, size, box.mono) <= box.width;
}

// A word wider than the box, split into pieces that each fit.
function breakWord(word: string, size: number, box: TextBox): string[] {
    if (fits(word, size, box)) return [word];
    const pieces: string[] = [];
    let piece = '';
    for (const char of word) {
        if (piece && !fits(piece + char, size, box)) {
            pieces.push(piece);
            piece = char;
        } else {
            piece += char;
        }
    }
    if (piece) pieces.push(piece);
    return pieces;
}

function wrap(text: string, size: number, box: TextBox): string[] {
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(' ')) {
        for (const piece of breakWord(word, size, box)) {
            const candidate = line ? `${line} ${piece}` : piece;
            if (fits(candidate, size, box)) {
                line = candidate;
            } else {
                if (line) lines.push(line);
                line = piece;
            }
        }
    }
    if (line) lines.push(line);
    return lines;
}

function clamp(lines: string[], size: number, box: TextBox): string[] {
    if (lines.length <= box.maxLines) return lines;
    const kept = lines.slice(0, box.maxLines);
    let last = kept[kept.length - 1];
    while (last && !fits(`${last}…`, size, box)) last = [...last].slice(0, -1).join('').trimEnd();
    kept[kept.length - 1] = `${last}…`;
    return kept;
}

export type FittedText = { lines: string[]; fontSize: number };

// The largest size, in SIZE_STEP steps, at which the text wraps into the box's lines. At the smallest
// size, whatever still runs over ends on an ellipsis.
export function fitText(text: string, box: TextBox): FittedText {
    const clean = text.trim().replace(/\s+/g, ' ');
    if (!clean) return { lines: [], fontSize: box.maxSize };
    for (let size = box.maxSize; size > box.minSize; size = round(size - SIZE_STEP)) {
        const lines = wrap(clean, size, box);
        if (lines.length <= box.maxLines) return { lines, fontSize: size };
    }
    return { lines: clamp(wrap(clean, box.minSize, box), box.minSize, box), fontSize: box.minSize };
}

export type PlacedText = FittedText & { baselines: number[] };
export type PlacedLine = PlacedText & { tone: QrCardLineTone };

function blockHeight(fitted: FittedText): number {
    return fitted.lines.length * fitted.fontSize * LINE_HEIGHT;
}

function place<T extends FittedText>(fitted: T, top: number): T & { baselines: number[] } {
    return { ...fitted, baselines: fitted.lines.map((_, index) => round(top + (index * LINE_HEIGHT + BASELINE) * fitted.fontSize)) };
}

// The title, centred in its band.
export function layoutTitle(title: string): PlacedText {
    const { top, bottom } = QR_CARD_LAYOUT.title;
    const fitted = fitText(title, QR_CARD_TITLE_BOX);
    return place(fitted, top + (bottom - top - blockHeight(fitted)) / 2);
}

function fitLines(lines: QrCardLine[], scale: number): Array<FittedText & { tone: QrCardLineTone }> {
    return lines.map((line) => {
        const box = QR_CARD_LINE_BOXES[line.tone];
        const scaled = { ...box, maxSize: round(box.maxSize * scale), minSize: round(box.minSize * scale) };
        return { ...fitText(line.text, scaled), tone: line.tone };
    });
}

function stackHeight(items: FittedText[], gap: number): number {
    return items.reduce((sum, item) => sum + blockHeight(item), 0) + Math.max(0, items.length - 1) * gap;
}

// Each line fitted to its tone, the stack centred in the band below the code.
export function layoutLines(lines: QrCardLine[]): PlacedLine[] {
    const { top, bottom, gap } = QR_CARD_LAYOUT.lines;
    const shown = lines.filter((line) => line.text.trim());
    let scale = 1;
    let fitted = fitLines(shown, scale);
    while (stackHeight(fitted, gap) > bottom - top && scale > MIN_LINES_SCALE) {
        scale = round(scale - LINES_SCALE_STEP);
        fitted = fitLines(shown, scale);
    }
    let cursor = top + Math.max(0, bottom - top - stackHeight(fitted, gap)) / 2;
    return fitted.map((item) => {
        const placed = place(item, cursor);
        cursor += blockHeight(item) + gap;
        return placed;
    });
}

// "Maria & Nikos" → "Maria-&-Nikos.png". Characters file systems refuse are dropped.
export function qrCardFileName(title: string, extension: 'png' | 'pdf'): string {
    const base = title
        .replace(/[\\/:*?"<>|\p{Cc}]/gu, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 60);
    return `${base || 'storywall-qr'}.${extension}`;
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `npx vitest run lib/qrCard.test.ts`
Expected: PASS (18 tests). If only the Greek two-line case fails on `fontSize`, print the actual result and check `charWidth` against the numbers in this plan's self-review before changing the expectation.

- [ ] **Step 5: Commit**

```bash
git add lib/qrCard.ts lib/qrCard.test.ts
git commit -m "feat(qr-cards): lay out the A6 card and fit its text"
```

---

### Task 4: The card SVG and the scan test

**Files:**
- Create: `components/qrCard/QrCardSvg.tsx`
- Test: `components/qrCard/QrCardSvg.scan.test.tsx`

- [ ] **Step 1: Write the failing scan test**

```tsx
// @vitest-environment node
import { Resvg } from '@resvg/resvg-js';
import jsQR from 'jsqr';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { QrCardSvg } from '@/components/qrCard/QrCardSvg';
import { PLAIN_QR_CARD_STYLE, type QrCardStyle } from '@/lib/qrCard';

// Rasterizes the card as a phone camera would see a print, and reads the code back.
const SHORT_URL = 'https://storywall.gr/q/7Hk2pQx9Lm';
const LONG_URL = `https://storywall.gr/i/${'a1B2c3D4e5'.repeat(18)}`;

function scan(url: string, style: Partial<QrCardStyle>): string | null {
    const markup = renderToStaticMarkup(
        <QrCardSvg
            style={{ ...PLAIN_QR_CARD_STYLE, ...style }}
            url={url}
            title="Maria & Nikos"
            lines={[{ text: 'Scan to join', tone: 'body' }]}
            label="QR card"
        />,
    );
    // No fonts: text doesn't matter here, and loading system fonts per render is slow.
    const image = new Resvg(markup, { fitTo: { mode: 'width', value: 840 }, background: '#FFFFFF', font: { loadSystemFonts: false } }).render();
    return jsQR(new Uint8ClampedArray(image.pixels), image.width, image.height)?.data ?? null;
}

const CASES = [true, false].flatMap((centerLogo) => [
    { link: 'short', url: SHORT_URL, centerLogo },
    { link: 'long', url: LONG_URL, centerLogo },
]);

describe('QrCardSvg scans', () => {
    it.each(CASES)('a $link link, logo $centerLogo', ({ url, centerLogo }) => {
        expect(scan(url, { centerLogo })).toBe(url);
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/qrCard/QrCardSvg.scan.test.tsx`
Expected: FAIL, "Failed to resolve import "@/components/qrCard/QrCardSvg"".

- [ ] **Step 3: Write `components/qrCard/QrCardSvg.tsx`**

```tsx
import { type Ref, useId, useMemo } from 'react';

import { themeFontFamily } from '@/lib/eventTheme';
import {
    layoutLines,
    layoutTitle,
    type PlacedText,
    QR_CARD_FONT,
    QR_CARD_HEIGHT,
    QR_CARD_LAYOUT,
    QR_CARD_LOGO_SRC,
    QR_CARD_MONO_FONT,
    QR_CARD_WIDTH,
    QR_QUIET_ZONE,
    type QrCardLine,
    type QrCardLineTone,
    type QrCardStyle,
} from '@/lib/qrCard';
import { qrCodePath } from '@/lib/qrCardCode';

type TextLook = { fontFamily: string; fontWeight: number; opacity?: number; letterSpacing?: string };

const LINE_LOOKS: Record<QrCardLineTone, TextLook> = {
    body: { fontFamily: QR_CARD_FONT, fontWeight: 400 },
    strong: { fontFamily: QR_CARD_FONT, fontWeight: 700 },
    code: { fontFamily: QR_CARD_MONO_FONT, fontWeight: 700, letterSpacing: '0.2em' },
    small: { fontFamily: QR_CARD_FONT, fontWeight: 400, opacity: 0.75 },
};

function CardText({ text, fill, look }: { text: PlacedText; fill: string; look: TextLook }) {
    if (text.lines.length === 0) return null;
    return (
        <text x={QR_CARD_LAYOUT.textX} textAnchor="middle" fill={fill} fontSize={text.fontSize} {...look}>
            {text.lines.map((line, index) => (
                <tspan key={index} x={QR_CARD_LAYOUT.textX} y={text.baselines[index]}>
                    {line}
                </tspan>
            ))}
        </text>
    );
}

// One A6 card in millimetres: artwork (or white) full-bleed, the title, the code on a white panel and
// the lines below. Print and the PNG/PDF export reuse this exact node, so it draws with attributes only
// (no classes inside). The whole card is one image to assistive tech, named by its <title>.
export function QrCardSvg({
    style,
    url,
    title,
    lines,
    label,
    className,
    ref,
}: {
    style: QrCardStyle;
    url: string;
    title: string;
    lines: QrCardLine[];
    label: string;
    className?: string;
    ref?: Ref<SVGSVGElement>;
}) {
    const titleId = useId();
    const { centerLogo } = style;
    const code = useMemo(() => qrCodePath(url, { centerLogo }), [url, centerLogo]);
    const { panel } = QR_CARD_LAYOUT;
    const cell = panel.size / (code.size + 2 * QR_QUIET_ZONE);
    const codeX = panel.x + QR_QUIET_ZONE * cell;
    const codeY = panel.y + QR_QUIET_ZONE * cell;
    const titleLook: TextLook = style.headingFont
        ? { fontFamily: themeFontFamily(style.headingFont), fontWeight: 400 }
        : { fontFamily: QR_CARD_FONT, fontWeight: 700 };

    return (
        <svg
            ref={ref}
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${QR_CARD_WIDTH} ${QR_CARD_HEIGHT}`}
            role="img"
            aria-labelledby={titleId}
            className={className}
        >
            <title id={titleId}>{label}</title>
            {/* Artwork */}
            {style.artworkUrl ? (
                <image href={style.artworkUrl} width={QR_CARD_WIDTH} height={QR_CARD_HEIGHT} preserveAspectRatio="xMidYMid slice" />
            ) : (
                <rect width={QR_CARD_WIDTH} height={QR_CARD_HEIGHT} fill="#FFFFFF" />
            )}
            {/* Title */}
            <CardText text={layoutTitle(title)} fill={style.textColor} look={titleLook} />
            {/* Code */}
            <rect x={panel.x} y={panel.y} width={panel.size} height={panel.size} rx={panel.radius} fill="#FFFFFF" />
            <path d={code.d} transform={`translate(${codeX} ${codeY}) scale(${cell})`} fill={style.codeColor} />
            {code.logo && (
                <image
                    href={QR_CARD_LOGO_SRC}
                    x={codeX + code.logo.start * cell}
                    y={codeY + code.logo.start * cell}
                    width={code.logo.span * cell}
                    height={code.logo.span * cell}
                />
            )}
            {/* Lines */}
            {layoutLines(lines).map((line, index) => (
                <CardText key={index} text={line} fill={style.textColor} look={LINE_LOOKS[line.tone]} />
            ))}
        </svg>
    );
}
```

The variable is `cell`, not `module`: Next's lint forbids assigning a variable named `module`.

- [ ] **Step 4: Run the scan test to see it pass**

Run: `npx vitest run components/qrCard/QrCardSvg.scan.test.tsx`
Expected: PASS, 4 cases.

If every case fails, the grid is likely transposed: check `data[row][col]` against Task 0, Step 4.

- [ ] **Step 5: Commit**

```bash
git add components/qrCard/QrCardSvg.tsx components/qrCard/QrCardSvg.scan.test.tsx
git commit -m "feat(qr-cards): draw the A6 card as one SVG and prove it scans"
```

---
### Task 5: Template list hook and prefetch helper

**Files:**
- Create: `hooks/useQrCardTemplates.ts`, `lib/api/prefetchQrCardTemplates.ts`
- Test: `hooks/useQrCardTemplates.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
vi.mock('@/lib/api/client', () => ({ api: { get: (...args: unknown[]) => get(...args) } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));

import { qrCardTemplateKeys, useQrCardHref } from '@/hooks/useQrCardTemplates';
import { routes } from '@/lib/routes';

function wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    get.mockReset();
});

describe('qrCardTemplateKeys', () => {
    it('keys the list under the event', () => {
        expect(qrCardTemplateKeys.list('e1')).toEqual(['events', 'e1', 'qr-card-templates']);
    });
});

describe('useQrCardHref', () => {
    it('links to the card page once the event has QR cards', async () => {
        get.mockResolvedValue({ available: true, templates: [] });
        const { result } = renderHook(() => useQrCardHref('e1', 'qr-1'), { wrapper });
        expect(result.current).toBeNull();
        await waitFor(() => expect(result.current).toBe(routes.events.qrCard('e1', 'qr-1')));
        expect(get).toHaveBeenCalledWith('/api/events/e1/qr-card-templates');
    });

    it('keeps the plain print when the event has no QR cards', async () => {
        get.mockResolvedValue({ available: false, templates: [] });
        const { result } = renderHook(() => useQrCardHref('e1', 'qr-1'), { wrapper });
        await waitFor(() => expect(get).toHaveBeenCalled());
        expect(result.current).toBeNull();
    });

    it('keeps the plain print when the list fails', async () => {
        get.mockRejectedValue(new Error('down'));
        const { result } = renderHook(() => useQrCardHref('e1', 'qr-1'), { wrapper });
        await waitFor(() => expect(get).toHaveBeenCalled());
        expect(result.current).toBeNull();
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run hooks/useQrCardTemplates.test.tsx`
Expected: FAIL, "Failed to resolve import "@/hooks/useQrCardTemplates"".

- [ ] **Step 3: Write `hooks/useQrCardTemplates.ts`**

No `'use client'`: the server pages import `qrCardTemplateKeys` (same as `hooks/useQrLinks.ts`).

```ts
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { QrCardTemplateListDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';

export const qrCardTemplateKeys = {
    list: (eventId: string) => ['events', eventId, 'qr-card-templates'] as const,
};

export function useQrCardTemplates(eventId: string | null) {
    const { isAuthenticated } = useAuth();

    return useQuery({
        queryKey: qrCardTemplateKeys.list(eventId ?? ''),
        queryFn: () => api.get<QrCardTemplateListDto>(endpoints.events.qrCardTemplates(eventId!)),
        enabled: Boolean(eventId) && isAuthenticated,
    });
}

// The card page for one QR, or null (the plain popup print stays) while the list loads, when it
// fails, or when the event has no QR cards.
export function useQrCardHref(eventId: string | null, qrLinkId: string): string | null {
    const { data } = useQrCardTemplates(eventId);
    return eventId && data?.available ? routes.events.qrCard(eventId, qrLinkId) : null;
}
```

- [ ] **Step 4: Write `lib/api/prefetchQrCardTemplates.ts`**

```ts
import type { QueryClient } from '@tanstack/react-query';

import { qrCardTemplateKeys } from '@/hooks/useQrCardTemplates';
import { endpoints } from '@/lib/api/endpoints';
import { serverGet } from '@/lib/api/serverFetch';
import type { QrCardTemplateListDto } from '@/lib/api/types';

// Seeds the event's card designs for a server page. Its own try, so a failure here never drops the
// page's other prefetches.
export async function prefetchQrCardTemplates(queryClient: QueryClient, eventId: string, accessToken: string) {
    try {
        const list = await serverGet<QrCardTemplateListDto>(endpoints.events.qrCardTemplates(eventId), accessToken);
        queryClient.setQueryData(qrCardTemplateKeys.list(eventId), list);
    } catch {
        // Best-effort — useQrCardTemplates fetches normally on the client if this fails.
    }
}
```

- [ ] **Step 5: Run the test to see it pass**

Run: `npx vitest run hooks/useQrCardTemplates.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add hooks/useQrCardTemplates.ts hooks/useQrCardTemplates.test.tsx lib/api/prefetchQrCardTemplates.ts
git commit -m "feat(qr-cards): fetch the event's card designs"
```

---

### Task 6: Artwork proxy route

The backend serves artwork at `GET {API}/api/qr-card-templates/{id}/artwork/{version}`. `artworkUrl` points at this same-origin route, so the card SVG, the canvas export and CSP (`img-src 'self'`) never touch another origin. It follows the same contract as `app/api/theme-fonts/[fontKey]/[file]/route.ts`.

**Files:**
- Create: `app/api/qr-card-artwork/[templateId]/[version]/route.ts`
- Test: `app/api/qr-card-artwork/[templateId]/[version]/route.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET, HEAD } from './route';

const ID = '0d6f3c2a-8b1e-4f7a-9c3d-2e5b8a1f4c6d';

function request(templateId: string, version: string, headers: Record<string, string> = {}, method = 'GET') {
    return new NextRequest(`https://storywall.test/api/qr-card-artwork/${templateId}/${version}`, { headers, method });
}

function call(templateId: string, version: string, headers: Record<string, string> = {}) {
    return GET(request(templateId, version, headers), { params: Promise.resolve({ templateId, version }) });
}

function image(type = 'image/webp') {
    return new Response(new Uint8Array([82, 73, 70, 70]), { status: 200, headers: { 'Content-Type': type } });
}

describe('GET /api/qr-card-artwork/[templateId]/[version]', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
    });

    it('proxies the backend artwork with immutable caching and forwards the client address', async () => {
        vi.stubEnv('CLIENT_IP_FORWARDING_SECRET', 's3cret');
        const fetchMock = vi.fn().mockResolvedValue(image());
        vi.stubGlobal('fetch', fetchMock);

        const response = await call(ID, '3', { 'x-forwarded-for': '203.0.113.9' });

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('image/webp');
        expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, s-maxage=31536000, immutable');
        expect(response.headers.get('x-content-type-options')).toBe('nosniff');
        expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([82, 73, 70, 70]));
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toMatch(new RegExp(`/api/qr-card-templates/${ID}/artwork/3$`));
        expect(init.method).toBe('GET');
        expect(init.redirect).toBe('error');
        expect(init.headers['X-Storywall-Client-Ip']).toBe('203.0.113.9');
        expect(init.headers['X-Storywall-Client-Ip-Secret']).toBe('s3cret');
    });

    it('keeps a PNG a PNG', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(image('image/png')));
        expect((await call(ID, '1')).headers.get('content-type')).toBe('image/png');
    });

    it('404s a malformed id or version without calling the backend', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        for (const [templateId, version] of [
            ['not-a-uuid', '1'],
            ['../etc', '1'],
            [ID.toUpperCase(), '1'],
            [ID, '0'],
            [ID, '03'],
            [ID, '1.png'],
        ]) {
            const response = await call(templateId, version);
            expect(response.status, `${templateId}/${version}`).toBe(404);
            expect(response.headers.get('cache-control')).toBe('no-store');
        }
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('passes a backend 404 through, uncached', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

        const response = await call(ID, '2');

        expect(response.status).toBe(404);
        expect(response.headers.get('cache-control')).toBe('no-store');
    });

    it.each([204, 206, 502, 503])('turns a backend %i into an uncached 502', async (status) => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status })));

        const response = await call(ID, '2');

        expect(response.status).toBe(502);
        expect(response.headers.get('cache-control')).toBe('no-store');
    });

    it('refuses anything but a PNG or WebP image', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(image('text/html')));

        const response = await call(ID, '2');

        expect(response.status).toBe(502);
        expect(response.headers.get('cache-control')).toBe('no-store');
    });

    it('answers an uncached 502 when the backend body fails mid-read', async () => {
        const broken = new ReadableStream({
            start(controller) {
                controller.error(new Error('reset'));
            },
        });
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(broken, { status: 200, headers: { 'Content-Type': 'image/png' } })));

        const response = await call(ID, '2');

        expect(response.status).toBe(502);
        expect(response.headers.get('cache-control')).toBe('no-store');
    });

    it('answers an uncached 502 when the backend is unreachable', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

        const response = await call(ID, '2');

        expect(response.status).toBe(502);
        expect(response.headers.get('cache-control')).toBe('no-store');
    });

    it('answers HEAD with the headers and no body', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200, headers: { 'Content-Type': 'image/png' } }));
        vi.stubGlobal('fetch', fetchMock);

        const response = await HEAD(request(ID, '2', {}, 'HEAD'), { params: Promise.resolve({ templateId: ID, version: '2' }) });

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('image/png');
        expect(response.body).toBeNull();
        expect(fetchMock.mock.calls[0][1].method).toBe('HEAD');
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run app/api/qr-card-artwork`
Expected: FAIL, "Failed to resolve import "./route"".

- [ ] **Step 3: Write the route**

```ts
import { NextRequest, NextResponse } from 'next/server';

import { clientIpFrom, clientIpHeaders } from '@/lib/auth/springAuth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const TEMPLATE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const VERSION = /^[1-9]\d{0,8}$/; // the first upload is version 1; the backend rejects leading zeros
const IMAGE_TYPES = new Set(['image/png', 'image/webp']);
const FETCH_TIMEOUT_MS = 10_000;

type Context = { params: Promise<{ templateId: string; version: string }> };

function uncached(status: 404 | 502) {
    return new NextResponse(null, { status, headers: { 'Cache-Control': 'no-store' } });
}

// QR card artwork, served from our own origin like theme fonts: the card SVG, its canvas export and
// CSP (img-src 'self') never touch another origin. The URL carries the artwork version, so a 200 is
// cached for a year, at the CDN too; everything else is no-store. Only PNG and WebP pass, whatever
// the upstream says. The client address goes along and redirect: 'error' keeps its secret home, as
// in the theme font route.
async function serve(request: NextRequest, { params }: Context) {
    const { templateId, version } = await params;
    if (!TEMPLATE_ID.test(templateId) || !VERSION.test(version)) return uncached(404);

    let body: ArrayBuffer | null;
    let type: string;
    try {
        const upstream = await fetch(`${API_BASE_URL}/api/qr-card-templates/${templateId}/artwork/${version}`, {
            method: request.method,
            headers: clientIpHeaders(clientIpFrom(request.headers)),
            cache: 'no-store',
            redirect: 'error',
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (upstream.status !== 200) return uncached(upstream.status === 404 ? 404 : 502);
        type = upstream.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '';
        if (!IMAGE_TYPES.has(type)) return uncached(502);
        body = request.method === 'HEAD' ? null : await upstream.arrayBuffer();
    } catch {
        return uncached(502);
    }

    return new NextResponse(body, {
        status: 200,
        headers: {
            'Content-Type': type,
            'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
            'X-Content-Type-Options': 'nosniff',
        },
    });
}

export const GET = serve;
export const HEAD = serve;
```

- [ ] **Step 4: Run the test to see it pass**

Run: `npx vitest run app/api/qr-card-artwork`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/qr-card-artwork
git commit -m "feat(qr-cards): serve card artwork from the app's origin"
```

---

### Task 7: Export (PNG, PDF) and its hook

**Files:**
- Create: `lib/qrCardExport.ts`, `hooks/useQrCardExport.ts`
- Test: `lib/qrCardExport.test.ts`, `hooks/useQrCardExport.test.tsx`

- [ ] **Step 1: Write the failing export test**

jsdom has no canvas, so the browser check (Task 19) covers `qrCardPng`. This file tests everything around it.

```ts
import { PDFDocument } from 'pdf-lib';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EventThemeFontDto } from '@/lib/api/types';
import { qrCardPdfBytes, standaloneQrCardSvg, toDataUri } from '@/lib/qrCardExport';

// A 1 × 1 transparent PNG.
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const SVG_NS = 'http://www.w3.org/2000/svg';
const FONT: EventThemeFontDto = { key: 'alegreya', fallback: 'serif', url: '/api/theme-fonts/alegreya/1.woff2' };

function bytes(base64: string): ArrayBuffer {
    return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)).buffer;
}

function respond(type: string, body: Uint8Array) {
    return new Response(body, { status: 200, headers: { 'Content-Type': type } });
}

function cardSvg(): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    svg.setAttribute('viewBox', '0 0 105 148');
    svg.setAttribute('class', 'block w-full');
    for (const href of ['/api/qr-card-artwork/t1/1', 'data:image/png;base64,AA==']) {
        const image = document.createElementNS(SVG_NS, 'image');
        image.setAttribute('href', href);
        svg.appendChild(image);
    }
    return svg;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('toDataUri', () => {
    it('inlines a file with its own type', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond('image/png; charset=binary', new Uint8Array([1, 2, 3]))));
        await expect(toDataUri('/a.png')).resolves.toBe('data:image/png;base64,AQID');
    });

    it('fails on a missing file', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
        await expect(toDataUri('/gone.png')).rejects.toThrow();
    });
});

describe('standaloneQrCardSvg', () => {
    it('sizes the card for export and inlines its images', async () => {
        const fetchMock = vi.fn().mockResolvedValue(respond('image/webp', new Uint8Array([9])));
        vi.stubGlobal('fetch', fetchMock);

        const markup = await standaloneQrCardSvg(cardSvg(), null);

        expect(markup).toContain('width="1240"');
        expect(markup).toContain('height="1748"');
        expect(markup).not.toContain('class=');
        expect(markup).toContain('href="data:image/webp;base64,CQ=="');
        expect(markup).toContain('href="data:image/png;base64,AA=="');
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('embeds the title font', async () => {
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockImplementation(async (url: string) =>
                    url.endsWith('.woff2') ? respond('font/woff2', new Uint8Array([7])) : respond('image/webp', new Uint8Array([9])),
                ),
        );

        const markup = await standaloneQrCardSvg(cardSvg(), FONT);

        expect(markup).toContain('@font-face');
        expect(markup).toContain('font-family:"theme-alegreya"');
        expect(markup).toContain('url("data:font/woff2;base64,Bw==")');
        expect(markup).not.toContain('/api/theme-fonts/');
    });

    it("leaves the page's own card untouched", async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond('image/webp', new Uint8Array([9]))));
        const svg = cardSvg();

        await standaloneQrCardSvg(svg, null);

        expect(svg.getAttribute('class')).toBe('block w-full');
        expect(svg.querySelector('image')?.getAttribute('href')).toBe('/api/qr-card-artwork/t1/1');
    });
});

describe('qrCardPdfBytes', () => {
    it('puts the PNG on one A6 page', async () => {
        const pdf = await PDFDocument.load(await qrCardPdfBytes(bytes(PNG_BASE64)));

        expect(pdf.getPageCount()).toBe(1);
        const { width, height } = pdf.getPage(0).getSize();
        expect(width).toBeCloseTo(297.64, 1);
        expect(height).toBeCloseTo(419.53, 1);
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/qrCardExport.test.ts`
Expected: FAIL, "Failed to resolve import "@/lib/qrCardExport"".

- [ ] **Step 3: Write `lib/qrCardExport.ts`**

```ts
import type { EventThemeFontDto } from '@/lib/api/types';
import { themeFontFaceCss } from '@/lib/eventTheme';
import { QR_CARD_EXPORT_HEIGHT, QR_CARD_EXPORT_WIDTH, QR_CARD_PDF_HEIGHT, QR_CARD_PDF_WIDTH } from '@/lib/qrCard';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CHUNK = 0x8000;

// A same-origin file as a data: URI. An SVG drawn through an <img> loads nothing on its own, so
// every image and font the card uses goes inline.
export async function toDataUri(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Couldn't load ${url} (${response.status})`);
    const type = response.headers.get('content-type')?.split(';')[0].trim() || 'application/octet-stream';
    const data = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (let index = 0; index < data.length; index += CHUNK) {
        binary += String.fromCharCode(...data.subarray(index, index + CHUNK));
    }
    return `data:${type};base64,${btoa(binary)}`;
}

// A copy of the card as a self-contained SVG file at export size: images and the title font inline,
// no page classes. The card on the page stays as it is.
export async function standaloneQrCardSvg(svg: SVGSVGElement, font: EventThemeFontDto | null): Promise<string> {
    const copy = svg.cloneNode(true) as SVGSVGElement;
    copy.setAttribute('width', String(QR_CARD_EXPORT_WIDTH));
    copy.setAttribute('height', String(QR_CARD_EXPORT_HEIGHT));
    copy.removeAttribute('class');
    await Promise.all(
        [...copy.querySelectorAll('image')].map(async (image) => {
            const href = image.getAttribute('href');
            if (href && !href.startsWith('data:')) image.setAttribute('href', await toDataUri(href));
        }),
    );
    const css = themeFontFaceCss(font);
    if (css && font) {
        const style = document.createElementNS(SVG_NS, 'style');
        style.textContent = css.replace(font.url, await toDataUri(font.url));
        copy.insertBefore(style, copy.firstChild);
    }
    return new XMLSerializer().serializeToString(copy);
}

// The standalone SVG drawn on a 300 dpi A6 canvas.
export async function qrCardPng(markup: string): Promise<Blob> {
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
    try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = QR_CARD_EXPORT_WIDTH;
        canvas.height = QR_CARD_EXPORT_HEIGHT;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('No 2D canvas');
        context.drawImage(image, 0, 0, QR_CARD_EXPORT_WIDTH, QR_CARD_EXPORT_HEIGHT);
        return await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))), 'image/png'),
        );
    } finally {
        URL.revokeObjectURL(url);
    }
}

// One A6 page with the PNG edge to edge. pdf-lib loads only when a host saves a PDF.
export async function qrCardPdfBytes(png: ArrayBuffer): Promise<Uint8Array> {
    const { PDFDocument } = await import('pdf-lib');
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([QR_CARD_PDF_WIDTH, QR_CARD_PDF_HEIGHT]);
    const image = await pdf.embedPng(png);
    page.drawImage(image, { x: 0, y: 0, width: QR_CARD_PDF_WIDTH, height: QR_CARD_PDF_HEIGHT });
    return pdf.save();
}

export function saveBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    // Some browsers start the download only after click() returns.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```

- [ ] **Step 4: Run the export test to see it pass**

Run: `npx vitest run lib/qrCardExport.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Write the failing hook test**

```tsx
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const exportMocks = vi.hoisted(() => ({
    standaloneQrCardSvg: vi.fn(),
    qrCardPng: vi.fn(),
    qrCardPdfBytes: vi.fn(),
    saveBlob: vi.fn(),
}));
vi.mock('@/lib/qrCardExport', () => exportMocks);

import { useQrCardExport } from '@/hooks/useQrCardExport';
import type { EventThemeFontDto } from '@/lib/api/types';

const FONT: EventThemeFontDto = { key: 'alegreya', fallback: 'serif', url: '/api/theme-fonts/alegreya/1.woff2' };
// jsdom's Blob may lack arrayBuffer(); the hook only needs that one method.
const PNG = { arrayBuffer: async () => new ArrayBuffer(4) } as unknown as Blob;

function renderExport() {
    const hook = renderHook(() => useQrCardExport({ font: FONT, title: 'Maria & Nikos' }));
    hook.result.current.svgRef.current = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
    return hook;
}

beforeEach(() => {
    exportMocks.standaloneQrCardSvg.mockReset().mockResolvedValue('<svg/>');
    exportMocks.qrCardPng.mockReset().mockResolvedValue(PNG);
    exportMocks.qrCardPdfBytes.mockReset().mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
    exportMocks.saveBlob.mockReset();
});

describe('useQrCardExport', () => {
    it('saves the card as a PNG named after the title', async () => {
        const { result } = renderExport();

        act(() => result.current.savePng());

        expect(result.current.busy).toBe('png');
        await waitFor(() => expect(result.current.busy).toBeNull());
        expect(exportMocks.standaloneQrCardSvg).toHaveBeenCalledWith(result.current.svgRef.current, FONT);
        expect(exportMocks.qrCardPng).toHaveBeenCalledWith('<svg/>');
        expect(exportMocks.saveBlob).toHaveBeenCalledWith(PNG, 'Maria-&-Nikos.png');
        expect(result.current.failed).toBe(false);
    });

    it('saves the card as a PDF', async () => {
        const { result } = renderExport();

        act(() => result.current.savePdf());

        await waitFor(() => expect(exportMocks.saveBlob).toHaveBeenCalled());
        const [file, name] = exportMocks.saveBlob.mock.calls[0];
        expect(name).toBe('Maria-&-Nikos.pdf');
        expect((file as Blob).type).toBe('application/pdf');
    });

    it('says so when a save fails, and lets the next one run', async () => {
        exportMocks.qrCardPng.mockRejectedValueOnce(new Error('tainted'));
        const { result } = renderExport();

        act(() => result.current.savePng());

        await waitFor(() => expect(result.current.failed).toBe(true));
        expect(result.current.busy).toBeNull();
        act(() => result.current.savePng());
        await waitFor(() => expect(exportMocks.saveBlob).toHaveBeenCalledTimes(1));
        expect(result.current.failed).toBe(false);
    });

    it('runs one save at a time', async () => {
        const { result } = renderExport();

        act(() => {
            result.current.savePng();
            result.current.savePdf();
        });

        await waitFor(() => expect(result.current.busy).toBeNull());
        expect(exportMocks.qrCardPng).toHaveBeenCalledTimes(1);
    });
});
```

- [ ] **Step 6: Run it to see it fail**

Run: `npx vitest run hooks/useQrCardExport.test.tsx`
Expected: FAIL, "Failed to resolve import "@/hooks/useQrCardExport"".

- [ ] **Step 7: Write `hooks/useQrCardExport.ts`**

```ts
'use client';

import { useCallback, useRef, useState } from 'react';

import type { EventThemeFontDto } from '@/lib/api/types';
import { qrCardFileName } from '@/lib/qrCard';
import { qrCardPdfBytes, qrCardPng, saveBlob, standaloneQrCardSvg } from '@/lib/qrCardExport';

export type QrCardExportFormat = 'png' | 'pdf';

// Print, Save PNG and Save PDF for the card SVG behind svgRef. One save runs at a time.
export function useQrCardExport({ font, title }: { font: EventThemeFontDto | null; title: string }) {
    const svgRef = useRef<SVGSVGElement | null>(null);
    // Set synchronously: a fast double click starts two saves before busy re-renders.
    const running = useRef(false);
    const [busy, setBusy] = useState<QrCardExportFormat | null>(null);
    const [failed, setFailed] = useState(false);

    const save = useCallback(
        async (format: QrCardExportFormat) => {
            const svg = svgRef.current;
            if (!svg || running.current) return;
            running.current = true;
            setBusy(format);
            setFailed(false);
            try {
                const png = await qrCardPng(await standaloneQrCardSvg(svg, font));
                const file =
                    format === 'png' ? png : new Blob([new Uint8Array(await qrCardPdfBytes(await png.arrayBuffer()))], { type: 'application/pdf' });
                saveBlob(file, qrCardFileName(title, format));
            } catch {
                setFailed(true);
            } finally {
                running.current = false;
                setBusy(null);
            }
        },
        [font, title],
    );

    const print = useCallback(() => window.print(), []);
    const savePng = useCallback(() => void save('png'), [save]);
    const savePdf = useCallback(() => void save('pdf'), [save]);

    return { svgRef, busy, failed, print, savePng, savePdf };
}

export type QrCardExportState = ReturnType<typeof useQrCardExport>;
```

`new Uint8Array(…)` copies pdf-lib's bytes into an array backed by a plain `ArrayBuffer`. TypeScript's stricter DOM types accept that as a `BlobPart`.

- [ ] **Step 8: Run both tests to see them pass**

Run: `npx vitest run lib/qrCardExport.test.ts hooks/useQrCardExport.test.tsx`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/qrCardExport.ts lib/qrCardExport.test.ts hooks/useQrCardExport.ts hooks/useQrCardExport.test.tsx
git commit -m "feat(qr-cards): save the card as a PNG or a PDF"
```

---

### Task 8: Designer state hook

**Files:**
- Create: `hooks/useQrCardDesigner.ts`
- Test: `hooks/useQrCardDesigner.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { describe, expect, it } from 'vitest';

import { useQrCardDesigner } from '@/hooks/useQrCardDesigner';
import type { QrCardTemplateDto } from '@/lib/api/types';
import { PLAIN_QR_CARD_ID, PLAIN_QR_CARD_STYLE } from '@/lib/qrCard';

const LINEN: QrCardTemplateDto = {
    id: 't1',
    name: { en: 'Linen', el: 'Λινό' },
    artworkUrl: '/api/qr-card-artwork/t1/1',
    textColor: '#5A3E2B',
    headingFont: null,
    codeColor: '#1F3A5A',
    centerLogo: false,
};

type Defaults = { title: string; line: string; giver?: string };

function typed(name: string, value: string) {
    return { currentTarget: { name, value } } as unknown as ChangeEvent<HTMLInputElement>;
}

function renderDesigner(templates: QrCardTemplateDto[] = [LINEN], defaults: Defaults = { title: 'Maria & Nikos', line: 'Scan to join' }) {
    return renderHook((props: { templates: QrCardTemplateDto[]; defaults: Defaults }) => useQrCardDesigner(props), {
        initialProps: { templates, defaults },
    });
}

describe('useQrCardDesigner', () => {
    it('starts on Plain with the defaults', () => {
        const { result } = renderDesigner();
        expect(result.current.selectedId).toBe(PLAIN_QR_CARD_ID);
        expect(result.current.style).toEqual(PLAIN_QR_CARD_STYLE);
        expect(result.current.text).toEqual({ title: 'Maria & Nikos', line: 'Scan to join', giver: '' });
        expect(result.current.showGiver).toBe(false);
    });

    it("takes a template's look when picked, and Plain's back", () => {
        const { result } = renderDesigner();
        act(() => result.current.selectTemplate('t1'));
        expect(result.current.selectedId).toBe('t1');
        expect(result.current.style).toMatchObject({ artworkUrl: '/api/qr-card-artwork/t1/1', codeColor: '#1F3A5A', centerLogo: false });
        act(() => result.current.selectTemplate(PLAIN_QR_CARD_ID));
        expect(result.current.style).toEqual(PLAIN_QR_CARD_STYLE);
    });

    it('falls back to Plain when the picked template leaves the list', () => {
        const { result, rerender } = renderDesigner();
        act(() => result.current.selectTemplate('t1'));
        rerender({ templates: [], defaults: { title: 'Maria & Nikos', line: 'Scan to join' } });
        expect(result.current.selectedId).toBe(PLAIN_QR_CARD_ID);
        expect(result.current.style).toEqual(PLAIN_QR_CARD_STYLE);
    });

    it('keeps what the host typed, and lets untouched fields follow their defaults', () => {
        const { result, rerender } = renderDesigner();
        act(() => result.current.handleTextChange(typed('line', 'Table 4')));
        rerender({ templates: [LINEN], defaults: { title: 'Anna & Nikos', line: 'Scan to open your invitation' } });
        expect(result.current.text).toEqual({ title: 'Anna & Nikos', line: 'Table 4', giver: '' });
    });

    it('keeps an emptied field empty', () => {
        const { result } = renderDesigner();
        act(() => result.current.handleTextChange(typed('title', '')));
        expect(result.current.text.title).toBe('');
    });

    it('offers the giver line on the gift card', () => {
        const { result } = renderDesigner([LINEN], { title: 'For Eleni', line: 'Scan to claim', giver: 'The Papadopoulos family' });
        expect(result.current.showGiver).toBe(true);
        expect(result.current.text.giver).toBe('The Papadopoulos family');
        act(() => result.current.handleTextChange(typed('giver', 'Maria')));
        expect(result.current.text.giver).toBe('Maria');
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run hooks/useQrCardDesigner.test.tsx`
Expected: FAIL, "Failed to resolve import "@/hooks/useQrCardDesigner"".

- [ ] **Step 3: Write `hooks/useQrCardDesigner.ts`**

```ts
'use client';

import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import type { QrCardTemplateDto } from '@/lib/api/types';
import { PLAIN_QR_CARD_ID, PLAIN_QR_CARD_STYLE, qrCardStyleOf } from '@/lib/qrCard';

export type QrCardText = { title: string; line: string; giver: string };
type QrCardDefaults = { title: string; line: string; giver?: string };

// The picked design and the card's text. Nothing is saved: every visit starts on Plain with the
// defaults. A field the host hasn't touched follows its default, so it fills in when the data lands.
export function useQrCardDesigner({ templates, defaults }: { templates: QrCardTemplateDto[]; defaults: QrCardDefaults }) {
    const [pickedId, setPickedId] = useState(PLAIN_QR_CARD_ID);
    const [edits, setEdits] = useState<Partial<QrCardText>>({});

    // A template that left the list (archived meanwhile, say) falls back to Plain.
    const picked = templates.find((template) => template.id === pickedId) ?? null;
    const style = useMemo(() => (picked ? qrCardStyleOf(picked) : PLAIN_QR_CARD_STYLE), [picked]);

    const text: QrCardText = {
        title: edits.title ?? defaults.title,
        line: edits.line ?? defaults.line,
        giver: edits.giver ?? defaults.giver ?? '',
    };

    const selectTemplate = useCallback((id: string) => setPickedId(id), []);
    // Inputs are named after the field they edit: title, line, giver.
    const handleTextChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.currentTarget;
        setEdits((current) => ({ ...current, [name]: value }));
    }, []);

    return {
        templates,
        selectedId: picked?.id ?? PLAIN_QR_CARD_ID,
        style,
        text,
        showGiver: defaults.giver !== undefined,
        selectTemplate,
        handleTextChange,
    };
}

export type QrCardDesignerState = ReturnType<typeof useQrCardDesigner>;
```

- [ ] **Step 4: Run the test to see it pass**

Run: `npx vitest run hooks/useQrCardDesigner.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add hooks/useQrCardDesigner.ts hooks/useQrCardDesigner.test.tsx
git commit -m "feat(qr-cards): keep the picked design and the card text"
```

---

### Task 9: Designer components and copy

Use the `design:design-system` skill before this task (CLAUDE.md: UI work). This is host UI, so it is mobile-first: one column with the card on top, then the designs, the text fields and the actions. Every image has real, localized alt text.

**Files:**
- Create: `components/qrCard/QrCardPrintStyle.tsx`, `components/qrCard/QrCardTemplateStrip.tsx`, `components/qrCard/QrCardTextFields.tsx`, `components/qrCard/QrCardActions.tsx`, `components/qrCard/QrCardDesigner.tsx`, `components/qrCard/QrCardSkeletons.tsx`
- Test: `components/qrCard/QrCardTemplateStrip.test.tsx`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Add the `QrCardPage` copy**

`messages/en.json`, a new top-level namespace right after the `"GalleryQrPage": { … },` block:

```json
    "QrCardPage": {
        "title": "Print card",
        "back": "Back",
        "missing": "This QR code is no longer available.",
        "cardLabel": "QR card: {title}",
        "templates": "Design",
        "plain": "Plain",
        "templatesFailed": "Couldn't load the designs.",
        "retry": "Try again",
        "fields": {
            "title": "Title",
            "line": "Text",
            "giver": "From"
        },
        "actions": {
            "print": "Print",
            "png": "Save PNG",
            "pdf": "Save PDF",
            "failed": "Couldn't save the card. Try again."
        },
        "lines": {
            "join": "Scan to join",
            "invitation": "Scan to open your invitation",
            "gallery": "Scan to add your photos"
        }
    },
```

`messages/el.json`, same place:

```json
    "QrCardPage": {
        "title": "Εκτύπωση κάρτας",
        "back": "Πίσω",
        "missing": "Αυτός ο κωδικός QR δεν είναι πια διαθέσιμος.",
        "cardLabel": "Κάρτα QR: {title}",
        "templates": "Σχέδιο",
        "plain": "Απλό",
        "templatesFailed": "Δεν φορτώθηκαν τα σχέδια.",
        "retry": "Δοκίμασε ξανά",
        "fields": {
            "title": "Τίτλος",
            "line": "Κείμενο",
            "giver": "Από"
        },
        "actions": {
            "print": "Εκτύπωση",
            "png": "Αποθήκευση PNG",
            "pdf": "Αποθήκευση PDF",
            "failed": "Η κάρτα δεν αποθηκεύτηκε. Δοκίμασε ξανά."
        },
        "lines": {
            "join": "Σκάναρε για να συμμετάσχεις",
            "invitation": "Σκάναρε για να ανοίξεις την πρόσκλησή σου",
            "gallery": "Σκάναρε για να ανεβάσεις τις φωτογραφίες σου"
        }
    },
```

- [ ] **Step 2: Write the failing strip test**

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QrCardTemplateStrip } from '@/components/qrCard/QrCardTemplateStrip';
import type { QrCardTemplateDto } from '@/lib/api/types';
import { PLAIN_QR_CARD_ID } from '@/lib/qrCard';
import messages from '@/messages/en.json';

// next/image needs a loader in jsdom; the strip's own markup is what's under test.
vi.mock('@/components/common/ProtectedImage', () => ({
    ProtectedImage: ({ alt, src }: { alt: string; src: string }) => <span role="img" aria-label={alt} data-src={src} />,
}));

const LINEN: QrCardTemplateDto = {
    id: 't1',
    name: { en: 'Linen', el: 'Λινό' },
    artworkUrl: '/api/qr-card-artwork/t1/1',
    textColor: '#5A3E2B',
    headingFont: null,
    codeColor: '#1F3A5A',
    centerLogo: false,
};

function renderStrip(props: Partial<Parameters<typeof QrCardTemplateStrip>[0]> = {}) {
    const onSelectAction = vi.fn();
    const onRetryAction = vi.fn();
    render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <QrCardTemplateStrip
                templates={[LINEN]}
                selectedId={PLAIN_QR_CARD_ID}
                failed={false}
                onSelectAction={onSelectAction}
                onRetryAction={onRetryAction}
                {...props}
            />
        </NextIntlClientProvider>,
    );
    return { onSelectAction, onRetryAction };
}

afterEach(cleanup);

describe('QrCardTemplateStrip', () => {
    it('offers Plain first, selected by default', () => {
        renderStrip();
        const [plain, linen] = screen.getAllByRole('button');
        expect(plain).toHaveAccessibleName('Plain');
        expect(plain).toHaveAttribute('aria-pressed', 'true');
        expect(linen).toHaveAccessibleName('Linen card design');
        expect(linen).toHaveAttribute('aria-pressed', 'false');
    });

    it('picks a design', () => {
        const { onSelectAction } = renderStrip();
        fireEvent.click(screen.getByRole('button', { name: 'Linen card design' }));
        expect(onSelectAction).toHaveBeenCalledWith('t1');
    });

    it('shows the artwork with alt text', () => {
        renderStrip();
        expect(screen.getByRole('img', { name: 'Linen card design' })).toHaveAttribute('data-src', '/api/qr-card-artwork/t1/1');
    });

    it('offers a retry when the designs failed to load', () => {
        const { onRetryAction } = renderStrip({ templates: [], failed: true });
        expect(screen.getByText("Couldn't load the designs.")).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(onRetryAction).toHaveBeenCalled();
    });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run components/qrCard/QrCardTemplateStrip.test.tsx`
Expected: FAIL, "Failed to resolve import "@/components/qrCard/QrCardTemplateStrip"".

- [ ] **Step 4: Write `components/qrCard/QrCardTemplateStrip.tsx`**

```tsx
'use client';

import { QrCode } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MouseEvent, useId } from 'react';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { QrCardTemplateDto } from '@/lib/api/types';
import { PLAIN_QR_CARD_ID } from '@/lib/qrCard';
import { cn } from '@/lib/utils';

function optionClass(selected: boolean) {
    return cn(
        'flex w-20 shrink-0 flex-col items-center gap-1.5 rounded-xl p-1.5 text-xs font-semibold transition-colors',
        selected ? 'bg-surface-muted text-ink ring-2 ring-primary' : 'text-ink-muted hover:bg-surface-muted/60 hover:text-ink',
    );
}

// Plain first, then the event's designs. A design's name reaches assistive tech through its
// artwork's alt text; the visible caption repeats it for sighted users only.
export function QrCardTemplateStrip({
    templates,
    selectedId,
    failed,
    onSelectAction,
    onRetryAction,
}: {
    templates: QrCardTemplateDto[];
    selectedId: string;
    failed: boolean;
    onSelectAction: (templateId: string) => void;
    onRetryAction: () => void;
}) {
    const t = useTranslations('QrCardPage');
    const tAlt = useTranslations('ImageAlt');
    const localizedText = useLocalizedText();
    const headingId = useId();

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        onSelectAction(event.currentTarget.dataset.templateId ?? PLAIN_QR_CARD_ID);
    }

    return (
        <section aria-labelledby={headingId}>
            <h2 id={headingId} className="text-sm font-semibold text-ink">
                {t('templates')}
            </h2>
            <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pt-1 pb-2">
                {/* Plain */}
                <button
                    type="button"
                    data-template-id={PLAIN_QR_CARD_ID}
                    aria-pressed={selectedId === PLAIN_QR_CARD_ID}
                    onClick={handleClick}
                    className={optionClass(selectedId === PLAIN_QR_CARD_ID)}
                >
                    <span className="flex aspect-105/148 w-full items-center justify-center rounded-lg bg-white shadow-sm">
                        <QrCode className="h-6 w-6 text-ink" aria-hidden="true" />
                    </span>
                    {t('plain')}
                </button>
                {/* Designs */}
                {templates.map((template) => {
                    const name = localizedText(template.name);
                    return (
                        <button
                            key={template.id}
                            type="button"
                            data-template-id={template.id}
                            aria-pressed={selectedId === template.id}
                            onClick={handleClick}
                            className={optionClass(selectedId === template.id)}
                        >
                            <span className="relative aspect-105/148 w-full overflow-hidden rounded-lg shadow-sm">
                                <ProtectedImage
                                    src={template.artworkUrl}
                                    alt={tAlt('qrCardTemplate', { name })}
                                    fill
                                    sizes="80px"
                                    className="object-cover"
                                />
                            </span>
                            <span aria-hidden="true" className="w-full truncate text-center">
                                {name}
                            </span>
                        </button>
                    );
                })}
            </div>
            {/* Failed */}
            {failed && (
                <p className="mt-1 text-sm text-ink-muted">
                    {t('templatesFailed')}{' '}
                    <button type="button" onClick={onRetryAction} className="font-semibold text-primary underline-offset-2 hover:underline">
                        {t('retry')}
                    </button>
                </p>
            )}
        </section>
    );
}
```

- [ ] **Step 5: Run the strip test to see it pass**

Run: `npx vitest run components/qrCard/QrCardTemplateStrip.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Write `components/qrCard/QrCardTextFields.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { fieldControlClass } from '@/components/manage/invitations/shared';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import type { QrCardText } from '@/hooks/useQrCardDesigner';
import { QR_CARD_LINE_MAX, QR_CARD_TITLE_MAX } from '@/lib/qrCard';

// The card's own words. Inputs are named after the QrCardText field they edit.
export function QrCardTextFields({
    text,
    showGiver,
    onChangeAction,
}: {
    text: QrCardText;
    showGiver: boolean;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    const t = useTranslations('QrCardPage.fields');

    return (
        <div className="flex flex-col gap-4">
            <FormFieldLabel label={t('title')}>
                <input
                    name="title"
                    value={text.title}
                    onChange={onChangeAction}
                    maxLength={QR_CARD_TITLE_MAX}
                    autoComplete="off"
                    className={fieldControlClass}
                />
            </FormFieldLabel>
            <FormFieldLabel label={t('line')}>
                <input
                    name="line"
                    value={text.line}
                    onChange={onChangeAction}
                    maxLength={QR_CARD_LINE_MAX}
                    autoComplete="off"
                    className={fieldControlClass}
                />
            </FormFieldLabel>
            {showGiver && (
                <FormFieldLabel label={t('giver')}>
                    <input
                        name="giver"
                        value={text.giver}
                        onChange={onChangeAction}
                        maxLength={QR_CARD_LINE_MAX}
                        autoComplete="off"
                        className={fieldControlClass}
                    />
                </FormFieldLabel>
            )}
        </div>
    );
}
```

- [ ] **Step 7: Write `components/qrCard/QrCardActions.tsx`**

```tsx
'use client';

import { Download, Loader2, Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { QrCardExportFormat, QrCardExportState } from '@/hooks/useQrCardExport';

const FILE_BUTTON_CLASS =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-surface-muted px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted/70 disabled:opacity-60';

function FileButton({ format, exporter, label }: { format: QrCardExportFormat; exporter: QrCardExportState; label: string }) {
    const Icon = exporter.busy === format ? Loader2 : Download;
    return (
        <button
            type="button"
            onClick={format === 'png' ? exporter.savePng : exporter.savePdf}
            disabled={exporter.busy !== null}
            className={FILE_BUTTON_CLASS}
        >
            <Icon className={exporter.busy === format ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden="true" />
            {label}
        </button>
    );
}

export function QrCardActions({ exporter }: { exporter: QrCardExportState }) {
    const t = useTranslations('QrCardPage.actions');

    return (
        <div className="flex flex-col gap-2">
            {/* Print */}
            <button
                type="button"
                onClick={exporter.print}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-ink/90"
            >
                <Printer className="h-4 w-4" aria-hidden="true" />
                {t('print')}
            </button>
            {/* Files */}
            <div className="grid grid-cols-2 gap-2">
                <FileButton format="png" exporter={exporter} label={t('png')} />
                <FileButton format="pdf" exporter={exporter} label={t('pdf')} />
            </div>
            {exporter.failed && (
                <p role="alert" className="text-sm text-status-danger">
                    {t('failed')}
                </p>
            )}
        </div>
    );
}
```

- [ ] **Step 8: Write `components/qrCard/QrCardPrintStyle.tsx`**

```tsx
// While the card is on screen, a print is one A6 page holding just the card, edge to edge. The
// global print rules (app/globals.css) already hide everything outside [data-print-root] and make
// its ancestors plain blocks; these also zero the page margins and those ancestors' padding, which
// would otherwise push the card onto a second page.
const PRINT_CSS =
    '@page{size:105mm 148mm;margin:0}' +
    '@media print{' +
    'html,body{margin:0!important;padding:0!important}' +
    'body :has([data-qr-card-print]){margin:0!important;padding:0!important;border:0!important;gap:0!important;min-height:0!important;max-width:none!important}' +
    '[data-qr-card-print]{width:105mm!important;height:148mm!important;max-width:none!important;margin:0!important;border-radius:0!important;box-shadow:none!important}' +
    '[data-qr-card-print] svg{display:block;width:105mm;height:148mm}' +
    '}';

export function QrCardPrintStyle() {
    return <style>{PRINT_CSS}</style>;
}
```

- [ ] **Step 9: Write `components/qrCard/QrCardDesigner.tsx`**

```tsx
'use client';

import type { ReactNode } from 'react';

import { ThemeFontFace } from '@/components/event/ThemeFontFace';
import { QrCardActions } from '@/components/qrCard/QrCardActions';
import { QrCardPrintStyle } from '@/components/qrCard/QrCardPrintStyle';
import { QrCardSvg } from '@/components/qrCard/QrCardSvg';
import { QrCardTemplateStrip } from '@/components/qrCard/QrCardTemplateStrip';
import { QrCardTextFields } from '@/components/qrCard/QrCardTextFields';
import type { QrCardDesignerState } from '@/hooks/useQrCardDesigner';
import type { QrCardExportState } from '@/hooks/useQrCardExport';
import type { QrCardLine } from '@/lib/qrCard';

// The card preview (also what prints), the design picker, the text fields, any extra options the
// caller passes (the gift card's PIN) and the actions.
export function QrCardDesigner({
    designer,
    exporter,
    url,
    lines,
    label,
    templatesFailed,
    onRetryTemplatesAction,
    children,
}: {
    designer: QrCardDesignerState;
    exporter: QrCardExportState;
    url: string;
    lines: QrCardLine[];
    label: string;
    templatesFailed: boolean;
    onRetryTemplatesAction: () => void;
    children?: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-6">
            {/* Card */}
            <div data-print-root data-qr-card-print className="mx-auto w-full max-w-xs overflow-hidden rounded-lg shadow-sm">
                <QrCardSvg
                    ref={exporter.svgRef}
                    style={designer.style}
                    url={url}
                    title={designer.text.title}
                    lines={lines}
                    label={label}
                    className="block h-auto w-full"
                />
            </div>
            <QrCardPrintStyle />
            <ThemeFontFace font={designer.style.headingFont} />

            {/* Designs */}
            <QrCardTemplateStrip
                templates={designer.templates}
                selectedId={designer.selectedId}
                failed={templatesFailed}
                onSelectAction={designer.selectTemplate}
                onRetryAction={onRetryTemplatesAction}
            />

            {/* Text */}
            <QrCardTextFields text={designer.text} showGiver={designer.showGiver} onChangeAction={designer.handleTextChange} />

            {/* Options */}
            {children}

            {/* Actions */}
            <QrCardActions exporter={exporter} />
        </div>
    );
}
```

- [ ] **Step 10: Write `components/qrCard/QrCardSkeletons.tsx`**

```tsx
import { ModulePageShellSkeleton } from '@/components/tools/ModulePageShellSkeleton';
import { Skeleton, SkeletonStatus } from '@/components/ui/skeleton';

export function QrCardDesignerSkeleton() {
    return (
        <SkeletonStatus className="flex flex-col gap-6">
            {/* Card */}
            <Skeleton className="mx-auto aspect-105/148 w-full max-w-xs rounded-lg" />
            {/* Designs */}
            <div className="flex gap-2 overflow-hidden">
                {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="aspect-105/148 w-20 shrink-0 rounded-xl" />
                ))}
            </div>
            {/* Text */}
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
            {/* Actions */}
            <Skeleton className="h-11 w-full rounded-full" />
        </SkeletonStatus>
    );
}

export function QrCardPageSkeleton() {
    return (
        <ModulePageShellSkeleton maxWidth="xl">
            <QrCardDesignerSkeleton />
        </ModulePageShellSkeleton>
    );
}
```

- [ ] **Step 11: Type-check, lint and run the copy tests**

```bash
npm run type:check
npx eslint components/qrCard
npx vitest run components/qrCard messages
```

Expected: no errors; the tests pass.

- [ ] **Step 12: Commit**

```bash
git add components/qrCard messages/en.json messages/el.json
git commit -m "feat(qr-cards): add the card designer components"
```

---

### Task 10: The card page

**Files:**
- Create: `hooks/useQrCardScreen.ts`, `components/qrCard/QrCardScreen.tsx`, `…/manage/qr/[qrLinkId]/card/page.tsx`, `…/manage/qr/[qrLinkId]/card/PageClient.tsx`, `…/manage/qr/[qrLinkId]/card/loading.tsx`
- Test: `hooks/useQrCardScreen.test.tsx`, `…/manage/qr/[qrLinkId]/card/page.test.tsx`

- [ ] **Step 1: Write the failing hook test**

```tsx
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    replace: vi.fn(),
    refetch: vi.fn(),
    links: { data: undefined as unknown, isLoading: false },
    templates: { data: undefined as unknown, isLoading: false, isError: false },
}));

vi.mock('next/navigation', () => ({ useParams: () => ({ qrLinkId: 'qr-1' }), useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
}));
vi.mock('@/components/routing/EventRouteGate', () => ({
    useEventRouteContext: () => ({ eventId: 'e1', activeEvent: { title: 'Maria & Nikos' }, isHost: true }),
}));
vi.mock('@/hooks/useQrLinks', () => ({ useEventQrLinks: () => mocks.links }));
vi.mock('@/hooks/useQrCardTemplates', () => ({ useQrCardTemplates: () => ({ ...mocks.templates, refetch: mocks.refetch }) }));

import { useQrCardScreen } from '@/hooks/useQrCardScreen';
import { routes } from '@/lib/routes';

function link(overrides: Record<string, unknown> = {}) {
    return { id: 'qr-1', publicUrl: 'https://storywall.gr/q/tok', targetType: 'EVENT_JOIN', status: 'ACTIVE', ...overrides };
}

beforeEach(() => {
    mocks.replace.mockReset();
    mocks.refetch.mockReset();
    mocks.links = { data: [link()], isLoading: false };
    mocks.templates = { data: { available: true, templates: [] }, isLoading: false, isError: false };
});

describe('useQrCardScreen', () => {
    it('loads until both the links and the designs are in', () => {
        mocks.links = { data: undefined, isLoading: true };
        expect(renderHook(() => useQrCardScreen()).result.current.status).toBe('loading');
        mocks.links = { data: [link()], isLoading: false };
        mocks.templates = { data: undefined, isLoading: true, isError: false };
        expect(renderHook(() => useQrCardScreen()).result.current.status).toBe('loading');
    });

    it('says the code is gone when the link is missing or revoked', () => {
        mocks.links = { data: [link({ id: 'qr-2' })], isLoading: false };
        expect(renderHook(() => useQrCardScreen()).result.current.status).toBe('missing');
        mocks.links = { data: [link({ status: 'REVOKED' })], isLoading: false };
        expect(renderHook(() => useQrCardScreen()).result.current.status).toBe('missing');
    });

    it('fills a share link card from the event', () => {
        const { result } = renderHook(() => useQrCardScreen());
        expect(result.current.status).toBe('ready');
        expect(result.current.qrUrl).toBe('https://storywall.gr/q/tok');
        expect(result.current.designer.text).toEqual({ title: 'Maria & Nikos', line: 'lines.join', giver: '' });
        expect(result.current.lines).toEqual([{ text: 'lines.join', tone: 'body' }]);
        expect(result.current.label).toBe('cardLabel {"title":"Maria & Nikos"}');
        expect(result.current.backHref).toBe(routes.events.invitationsQr('e1'));
    });

    it('fills the gallery card and goes back to the gallery QR', () => {
        mocks.links = { data: [link({ targetType: 'MEDIA_UPLOAD' })], isLoading: false };
        const { result } = renderHook(() => useQrCardScreen());
        expect(result.current.designer.text.line).toBe('lines.gallery');
        expect(result.current.backHref).toBe(routes.events.tools.galleryQr('e1'));
    });

    it('treats an event without QR cards as a page that does not exist', () => {
        mocks.templates = { data: { available: false, templates: [] }, isLoading: false, isError: false };
        const { result } = renderHook(() => useQrCardScreen());
        expect(result.current.unavailable).toBe(true);
        expect(mocks.replace).toHaveBeenCalledWith(routes.eventNotFound);
    });

    it('keeps Plain and offers a retry when the designs fail', () => {
        mocks.templates = { data: undefined, isLoading: false, isError: true };
        const { result } = renderHook(() => useQrCardScreen());
        expect(result.current.status).toBe('ready');
        expect(result.current.templatesFailed).toBe(true);
        act(() => result.current.retryTemplates());
        expect(mocks.refetch).toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run hooks/useQrCardScreen.test.tsx`
Expected: FAIL, "Failed to resolve import "@/hooks/useQrCardScreen"".

- [ ] **Step 3: Write `hooks/useQrCardScreen.ts`**

```ts
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect } from 'react';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { useQrCardDesigner } from '@/hooks/useQrCardDesigner';
import { useQrCardExport } from '@/hooks/useQrCardExport';
import { useQrCardTemplates } from '@/hooks/useQrCardTemplates';
import { useEventQrLinks } from '@/hooks/useQrLinks';
import type { QrCardTemplateDto } from '@/lib/api/types';
import { QR_CARD_LINE_KEYS, type QrCardLine } from '@/lib/qrCard';
import { routes } from '@/lib/routes';

const NO_TEMPLATES: QrCardTemplateDto[] = [];

export type QrCardScreenStatus = 'loading' | 'missing' | 'ready';

// The card page for one share link or the gallery QR. An event without QR cards treats the page as
// missing, as GalleryQrScreen does for a feature that's off. A failed design list keeps Plain.
export function useQrCardScreen() {
    const t = useTranslations('QrCardPage');
    const router = useRouter();
    const { qrLinkId } = useParams<{ qrLinkId: string }>();
    const { activeEvent, eventId } = useEventRouteContext();
    const links = useEventQrLinks(eventId);
    const templates = useQrCardTemplates(eventId);

    const unavailable = templates.data?.available === false;
    useEffect(() => {
        if (unavailable) router.replace(routes.eventNotFound);
    }, [router, unavailable]);

    const qrLink = links.data?.find((link) => link.id === qrLinkId) ?? null;
    const status: QrCardScreenStatus =
        links.isLoading || templates.isLoading ? 'loading' : !qrLink || qrLink.status === 'REVOKED' ? 'missing' : 'ready';

    const designer = useQrCardDesigner({
        templates: templates.data?.templates ?? NO_TEMPLATES,
        defaults: { title: activeEvent.title, line: qrLink ? t(`lines.${QR_CARD_LINE_KEYS[qrLink.targetType]}`) : '' },
    });
    const exporter = useQrCardExport({ font: designer.style.headingFont, title: designer.text.title });
    const lines: QrCardLine[] = [{ text: designer.text.line, tone: 'body' }];

    const { refetch } = templates;
    const retryTemplates = useCallback(() => void refetch(), [refetch]);

    return {
        status,
        unavailable,
        qrUrl: qrLink?.publicUrl ?? '',
        backHref: qrLink?.targetType === 'MEDIA_UPLOAD' ? routes.events.tools.galleryQr(eventId) : routes.events.invitationsQr(eventId),
        designer,
        exporter,
        lines,
        label: t('cardLabel', { title: designer.text.title }),
        templatesFailed: templates.isError,
        retryTemplates,
    };
}
```

- [ ] **Step 4: Run the hook test to see it pass**

Run: `npx vitest run hooks/useQrCardScreen.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Write `components/qrCard/QrCardScreen.tsx`**

```tsx
'use client';

import { QrCode } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { QrCardDesigner } from '@/components/qrCard/QrCardDesigner';
import { QrCardDesignerSkeleton } from '@/components/qrCard/QrCardSkeletons';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { useQrCardScreen } from '@/hooks/useQrCardScreen';

export function QrCardScreen() {
    const t = useTranslations('QrCardPage');
    const screen = useQrCardScreen();

    if (screen.unavailable) return null;

    return (
        <ModulePageShell maxWidth="xl" title={t('title')} icon={QrCode} backLabel={t('back')} backHref={screen.backHref}>
            {screen.status === 'loading' ? (
                <QrCardDesignerSkeleton />
            ) : screen.status === 'missing' ? (
                // Missing
                <p className="text-center text-sm text-ink-muted">{t('missing')}</p>
            ) : (
                <QrCardDesigner
                    designer={screen.designer}
                    exporter={screen.exporter}
                    url={screen.qrUrl}
                    lines={screen.lines}
                    label={screen.label}
                    templatesFailed={screen.templatesFailed}
                    onRetryTemplatesAction={screen.retryTemplates}
                />
            )}
        </ModulePageShell>
    );
}
```

- [ ] **Step 6: Write the route's client, loading state and failing page test**

`…/manage/qr/[qrLinkId]/card/PageClient.tsx`:

```tsx
'use client';

import { QrCardScreen } from '@/components/qrCard/QrCardScreen';
import { QrCardPageSkeleton } from '@/components/qrCard/QrCardSkeletons';
import { EventRouteGate } from '@/components/routing/EventRouteGate';

export default function QrCardPage() {
    return (
        <EventRouteGate requireHost allowVendorCapability="QR_READ" fallback={<QrCardPageSkeleton />}>
            <QrCardScreen />
        </EventRouteGate>
    );
}
```

`…/manage/qr/[qrLinkId]/card/loading.tsx`:

```tsx
import { QrCardPageSkeleton } from '@/components/qrCard/QrCardSkeletons';

// Shown the moment a link here is clicked, while the server renders the page.
export default function Loading() {
    return <QrCardPageSkeleton />;
}
```

`…/manage/qr/[qrLinkId]/card/page.test.tsx`:

```tsx
import type { DehydratedState } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serverGet = vi.fn();
const serverGetOrNull = vi.fn();
vi.mock('@/lib/api/serverFetch', () => ({
    serverGet: (...args: unknown[]) => serverGet(...args),
    serverGetOrNull: (...args: unknown[]) => serverGetOrNull(...args),
}));
const ctx = vi.hoisted(() => ({ context: null as null | { accessToken: string; isHost: boolean } }));
vi.mock('@/lib/auth/serverEventContext', () => ({ resolveServerEventContext: async () => ctx.context }));
vi.mock('./PageClient', () => ({ default: () => null }));

import Page from './page';

const LINKS = ['events', 'e1', 'qr-links'];
const TEMPLATES = ['events', 'e1', 'qr-card-templates'];

function visit() {
    return Page({ params: Promise.resolve({ eventId: 'e1', qrLinkId: 'qr-1' }) });
}

function seededKeys(element: ReactElement) {
    const { state } = element.props as { state: DehydratedState };
    return state.queries.map((query) => query.queryKey);
}

beforeEach(() => {
    serverGet.mockReset().mockImplementation(async (path: string) => (path.endsWith('/qr-card-templates') ? { available: true, templates: [] } : []));
    serverGetOrNull.mockReset().mockResolvedValue(null);
    ctx.context = { accessToken: 'tok', isHost: true };
});

describe('QR card page prefetch', () => {
    it('seeds the links and the designs for a host, and never asks about vendors', async () => {
        const keys = seededKeys(await visit());
        expect(keys).toEqual(expect.arrayContaining([LINKS, TEMPLATES]));
        expect(keys).toHaveLength(2);
        expect(serverGetOrNull).not.toHaveBeenCalled();
    });

    it('seeds the role, the links and the designs for a planner with the tool open', async () => {
        ctx.context = { accessToken: 'tok', isHost: false };
        serverGetOrNull.mockResolvedValue({ vendorType: 'PLANNER', capabilities: ['QR_READ'], accessOpen: true });
        const keys = seededKeys(await visit());
        expect(keys).toEqual(expect.arrayContaining([['events', 'e1', 'vendors', 'me'], LINKS, TEMPLATES]));
        expect(keys).toHaveLength(3);
    });

    it('fetches neither for a member without the tool', async () => {
        ctx.context = { accessToken: 'tok', isHost: false };
        await visit();
        expect(serverGet).not.toHaveBeenCalled();
    });

    it('keeps the links when the designs fail', async () => {
        serverGet.mockImplementation(async (path: string) => {
            if (path.endsWith('/qr-card-templates')) throw new Error('down');
            return [];
        });
        expect(seededKeys(await visit())).toEqual([LINKS]);
    });

    it('fetches nothing on an in-app navigation', async () => {
        ctx.context = null;
        expect(seededKeys(await visit())).toEqual([]);
        expect(serverGet).not.toHaveBeenCalled();
        expect(serverGetOrNull).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 7: Run the page test to see it fail**

Run: `npx vitest run "app/(main)/(app)/(event)/events/[eventId]/manage/qr/[qrLinkId]"`
Expected: FAIL, "Failed to resolve import "./page"".

- [ ] **Step 8: Write `…/manage/qr/[qrLinkId]/card/page.tsx`**

```tsx
import { dehydrate, HydrationBoundary, type QueryClient } from '@tanstack/react-query';

import { qrLinkKeys } from '@/hooks/useQrLinks';
import { vendorKeys } from '@/hooks/useVendors';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeList } from '@/lib/api/pagination';
import { prefetchQrCardTemplates } from '@/lib/api/prefetchQrCardTemplates';
import { serverGet, serverGetOrNull } from '@/lib/api/serverFetch';
import type { QrLinkResponseDto, VendorMeDto } from '@/lib/api/types';
import { resolveServerEventContext } from '@/lib/auth/serverEventContext';
import { makeQueryClient } from '@/lib/queryClient';
import { hasVendorCapability } from '@/lib/vendors';

import QrCardPage from './PageClient';

type PageProps = { params: Promise<{ eventId: string; qrLinkId: string }> };

async function prefetchLinks(queryClient: QueryClient, eventId: string, accessToken: string) {
    try {
        const qrLinks = await serverGet<QrLinkResponseDto[]>(endpoints.events.qrLinks(eventId), accessToken);
        queryClient.setQueryData(qrLinkKeys.list(eventId), normalizeList(qrLinks).items);
    } catch {
        // Best-effort — useEventQrLinks fetches normally on the client if this fails.
    }
}

// Seeds the vendor role (EventRouteGate reads it) and answers whether the planner has the QR tool.
async function prefetchPlannerAccess(queryClient: QueryClient, eventId: string, accessToken: string): Promise<boolean> {
    try {
        const me = await serverGetOrNull<VendorMeDto>(endpoints.events.vendorMe(eventId), accessToken);
        queryClient.setQueryData(vendorKeys.me(eventId), me);
        return hasVendorCapability(me, 'QR_READ');
    } catch {
        return false;
    }
}

// Prefetches the event's QR links and card designs, for the host or a planner with the QR tool, so
// QrCardScreen draws the card without its loading state.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext(eventId);

    if (context) {
        const allowed = context.isHost || (await prefetchPlannerAccess(queryClient, eventId, context.accessToken));
        if (allowed) {
            await Promise.all([
                prefetchLinks(queryClient, eventId, context.accessToken),
                prefetchQrCardTemplates(queryClient, eventId, context.accessToken),
            ]);
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <QrCardPage />
        </HydrationBoundary>
    );
}
```

- [ ] **Step 9: Run the page test to see it pass**

Run: `npx vitest run "app/(main)/(app)/(event)/events/[eventId]/manage/qr/[qrLinkId]"`
Expected: PASS (5 tests).

- [ ] **Step 10: Commit**

```bash
git add hooks/useQrCardScreen.ts hooks/useQrCardScreen.test.tsx components/qrCard/QrCardScreen.tsx "app/(main)/(app)/(event)/events/[eventId]/manage/qr/[qrLinkId]"
git commit -m "feat(qr-cards): add the card page for share links and the gallery QR"
```

---

### Task 11: Link Print to the card page

When the event has QR cards, Print on a share link (the preview modal) and on the gallery QR opens the card page. Otherwise it keeps today's popup.

**Files:**
- Modify: `components/manage/invitations/QrCodeCard.tsx`, `components/manage/invitations/QrCodeCard.test.tsx`, `components/manage/invitations/QrPreviewModal.tsx`, `hooks/useGalleryQrScreen.ts`, `components/gallery/GalleryQrScreen.tsx`, `…/manage/qr/page.tsx`, `…/manage/qr/page.test.tsx`, `…/tools/gallery/qr/page.tsx`
- Test: `…/tools/gallery/qr/page.test.tsx` (new)

- [ ] **Step 1: Add the failing card test**

In `components/manage/invitations/QrCodeCard.test.tsx`, add `import type { ReactNode } from 'react';` to the imports and this mock under them (AppLink wraps `next/link`, which needs the app router in jsdom):

```tsx
vi.mock('@/components/ui/AppLink', () => ({
    AppLink: ({ href, className, children }: { href: string; className?: string; children: ReactNode }) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
}));
```

Then append:

```tsx
describe('QrCodeCard print with designs', () => {
    it('opens the card page instead of the popup', () => {
        const open = vi.spyOn(window, 'open');
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <QrCodeCard qrLink={qrLink({})} cardHref="/events/event-1/manage/qr/qr-1/card" />
            </NextIntlClientProvider>,
        );

        const print = screen.getByRole('link', { name: messages.ManagePage.qr.print });
        expect(print).toHaveAttribute('href', '/events/event-1/manage/qr/qr-1/card');
        expect(screen.queryByRole('button', { name: messages.ManagePage.qr.print })).toBeNull();
        expect(open).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/manage/invitations/QrCodeCard.test.tsx`
Expected: FAIL. The new test finds no link: `cardHref` is not a prop yet. The two existing tests still pass.

- [ ] **Step 3: Give `QrCodeCard` a `cardHref`**

In `components/manage/invitations/QrCodeCard.tsx`:

1. Add `import { AppLink } from '@/components/ui/AppLink';` after the `lucide-react`/`next-intl`/`qrcode.react`/`react` imports (in the `@/` group, alphabetically first).
2. Above the component, add the shared action class:

```tsx
const ACTION_CLASS =
    'flex min-w-28 flex-1 items-center justify-center gap-2 rounded-full bg-surface-muted px-3 py-2.5 text-xs font-semibold text-ink-muted transition-colors hover:text-ink';
```

3. Change the signature and its comment:

```tsx
// The QR artwork + copy/download/print/share actions, shared between the
// manage-page preview modal and the dedicated gallery QR page. With cardHref
// (the event has QR cards), Print opens the card page instead of the popup.
export function QrCodeCard({ qrLink, size = 240, cardHref = null }: { qrLink: QrLinkResponseDto; size?: number; cardHref?: string | null }) {
```

4. Replace the three copy/download/print `className="flex min-w-28 … hover:text-ink"` strings with `className={ACTION_CLASS}`, and replace the Print button with:

```tsx
                {cardHref ? (
                    <AppLink href={cardHref} className={ACTION_CLASS}>
                        <Printer className="h-3.5 w-3.5" />
                        {t('qr.print')}
                    </AppLink>
                ) : (
                    <button type="button" onClick={handlePrint} className={ACTION_CLASS}>
                        <Printer className="h-3.5 w-3.5" />
                        {t('qr.print')}
                    </button>
                )}
```

- [ ] **Step 4: Pass the link from the preview modal**

In `components/manage/invitations/QrPreviewModal.tsx`, add `import { useQrCardHref } from '@/hooks/useQrCardTemplates';` and:

```tsx
    const cardHref = useQrCardHref(qrLink.eventId, qrLink.id);
```

after `const tGlobal = useTranslations();`, then render `<QrCodeCard qrLink={qrLink} cardHref={cardHref} />`.

- [ ] **Step 5: Pass the link on the gallery QR page**

`hooks/useGalleryQrScreen.ts`:

```ts
'use client';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { useQrCardHref } from '@/hooks/useQrCardTemplates';
import { useEventQrLinks } from '@/hooks/useQrLinks';
import { findGalleryQrLink, isGalleryQrFeatureEnabled } from '@/lib/qrLinks';

export function useGalleryQrScreen() {
    const { activeEvent, eventId } = useEventRouteContext();
    const { data: qrLinks, isLoading } = useEventQrLinks(eventId);

    // Gated the same way as the nav entries that link here (see
    // useToolsMenuItems/useRightContextPanel) — this page shouldn't be
    // reachable at all when the gallery QR feature is off for this event.
    const featureEnabled = isGalleryQrFeatureEnabled(activeEvent?.modules);

    const qrLink = findGalleryQrLink(qrLinks ?? []);
    const cardHref = useQrCardHref(eventId, qrLink?.id ?? '');

    return {
        eventId,
        featureEnabled,
        isLoading,
        qrLink,
        cardHref: qrLink ? cardHref : null,
    } as const;
}
```

In `components/gallery/GalleryQrScreen.tsx`, read `cardHref` from the hook and render `<QrCodeCard qrLink={qrLink} size={280} cardHref={cardHref} />`.

- [ ] **Step 6: Run the card test to see it pass**

Run: `npx vitest run components/manage/invitations/QrCodeCard.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 7: Update the share links prefetch test**

In `…/manage/qr/page.test.tsx`, change `beforeEach`'s `serverGet` to answer the design list:

```tsx
    serverGet.mockReset().mockImplementation(async (path: string) => (path.endsWith('/qr-card-templates') ? { available: true, templates: [] } : []));
```

Add `['events', 'e1', 'qr-card-templates'],` to the host test's `arrayContaining` list. Replace the planner test's expectations with:

```tsx
        const keys = seededKeys(element);
        expect(keys).toEqual(
            expect.arrayContaining([
                ['events', 'e1', 'vendors', 'me'],
                ['events', 'e1', 'qr-links'],
                ['events', 'e1', 'qr-card-templates'],
            ]),
        );
        expect(keys).toHaveLength(3);
        expect(serverGet).toHaveBeenCalledTimes(2);
        expect(serverGet).toHaveBeenCalledWith('/api/events/e1/qr-links', 'tok');
        expect(serverGet).toHaveBeenCalledWith('/api/events/e1/qr-card-templates', 'tok');
```

and its name to `'seeds the role, the links and the designs for a planner with the tool open'`.

- [ ] **Step 8: Run it to see it fail**

Run: `npx vitest run "app/(main)/(app)/(event)/events/[eventId]/manage/qr/page.test.tsx"`
Expected: FAIL. The design list key is missing for the host and the planner.

- [ ] **Step 9: Prefetch the designs on the share links page**

In `…/manage/qr/page.tsx`, add `import { prefetchQrCardTemplates } from '@/lib/api/prefetchQrCardTemplates';`. Replace `prefetchPlannerData` so the links and the designs load in parallel, each in its own try:

```ts
async function prefetchPlannerLinks(queryClient: QueryClient, eventId: string, accessToken: string) {
    try {
        const qrLinks = await serverGet<QrLinkResponseDto[]>(endpoints.events.qrLinks(eventId), accessToken);
        queryClient.setQueryData(qrLinkKeys.list(eventId), normalizeList(qrLinks).items);
    } catch {
        // Best-effort — useEventQrLinks fetches normally on the client if this fails.
    }
}

// A planner with the QR_READ tool open gets the links and the card designs: no stats, no usage.
async function prefetchPlannerData(queryClient: QueryClient, eventId: string, accessToken: string) {
    try {
        const me = await serverGetOrNull<VendorMeDto>(endpoints.events.vendorMe(eventId), accessToken);
        queryClient.setQueryData(vendorKeys.me(eventId), me);
        if (!hasVendorCapability(me, 'QR_READ')) return;
    } catch {
        // Best-effort — the hooks fetch normally on the client if this fails.
        return;
    }
    await Promise.all([
        prefetchPlannerLinks(queryClient, eventId, accessToken),
        prefetchQrCardTemplates(queryClient, eventId, accessToken),
    ]);
}
```

In `Page`, replace the host branch with:

```ts
        if (context.isHost) {
            await Promise.all([
                prefetchHostData(queryClient, eventId, context.accessToken),
                prefetchQrCardTemplates(queryClient, eventId, context.accessToken),
            ]);
        } else {
            await prefetchPlannerData(queryClient, eventId, context.accessToken);
        }
```

Update the page comment's last sentence to: `A planner gets the vendor role and the links. Both get the card designs, so Print knows where to go.`

- [ ] **Step 10: Run it to see it pass**

Run: `npx vitest run "app/(main)/(app)/(event)/events/[eventId]/manage/qr/page.test.tsx"`
Expected: PASS (4 tests).

- [ ] **Step 11: Write the failing gallery QR prefetch test**

`…/tools/gallery/qr/page.test.tsx`:

```tsx
import type { DehydratedState } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serverGet = vi.fn();
vi.mock('@/lib/api/serverFetch', () => ({ serverGet: (...args: unknown[]) => serverGet(...args) }));
const ctx = vi.hoisted(() => ({ context: null as null | { accessToken: string; isHost: boolean } }));
vi.mock('@/lib/auth/serverEventContext', () => ({ resolveServerEventContext: async () => ctx.context }));
vi.mock('./PageClient', () => ({ default: () => null }));

import Page from './page';

function visit() {
    return Page({ params: Promise.resolve({ eventId: 'e1' }) });
}

function seededKeys(element: ReactElement) {
    const { state } = element.props as { state: DehydratedState };
    return state.queries.map((query) => query.queryKey);
}

beforeEach(() => {
    serverGet.mockReset().mockImplementation(async (path: string) => (path.endsWith('/qr-card-templates') ? { available: true, templates: [] } : []));
    ctx.context = { accessToken: 'tok', isHost: true };
});

describe('Gallery QR prefetch', () => {
    it('seeds the links and the card designs for a host', async () => {
        const keys = seededKeys(await visit());
        expect(keys).toEqual(expect.arrayContaining([['events', 'e1', 'qr-links'], ['events', 'e1', 'qr-card-templates']]));
        expect(keys).toHaveLength(2);
    });

    it('fetches nothing for a guest or on an in-app navigation', async () => {
        ctx.context = { accessToken: 'tok', isHost: false };
        expect(seededKeys(await visit())).toEqual([]);
        ctx.context = null;
        expect(seededKeys(await visit())).toEqual([]);
        expect(serverGet).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 12: Run it to see it fail**

Run: `npx vitest run "app/(main)/(app)/(event)/events/[eventId]/tools/gallery/qr"`
Expected: FAIL. The host seeds only the links (one key).

- [ ] **Step 13: Prefetch the designs on the gallery QR page**

In `…/tools/gallery/qr/page.tsx`, add `import { type QueryClient } from '@tanstack/react-query';` (merge it into the existing `@tanstack/react-query` import) and `import { prefetchQrCardTemplates } from '@/lib/api/prefetchQrCardTemplates';`. Move the links fetch into a helper and run both in parallel:

```tsx
async function prefetchLinks(queryClient: QueryClient, eventId: string, accessToken: string) {
    try {
        const qrLinks = await serverGet<QrLinkResponseDto[]>(endpoints.events.qrLinks(eventId), accessToken);
        queryClient.setQueryData(qrLinkKeys.list(eventId), normalizeList(qrLinks).items);
    } catch {
        // Best-effort — useEventQrLinks fetches normally on the client if this fails.
    }
}

// Prefetches the event's QR links and card designs (host-only) so GalleryQrScreen finds its gallery
// upload code, and where Print goes, already cached instead of showing its loading state.
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const queryClient = makeQueryClient();
    const context = await resolveServerEventContext(eventId);

    if (context?.isHost) {
        await Promise.all([
            prefetchLinks(queryClient, eventId, context.accessToken),
            prefetchQrCardTemplates(queryClient, eventId, context.accessToken),
        ]);
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <GalleryQrPage />
        </HydrationBoundary>
    );
}
```

- [ ] **Step 14: Run the tests to see them pass**

Run: `npx vitest run "app/(main)/(app)/(event)/events/[eventId]/tools/gallery/qr" components/manage/invitations`
Expected: PASS.

- [ ] **Step 15: Commit**

```bash
git add components/manage/invitations hooks/useGalleryQrScreen.ts components/gallery/GalleryQrScreen.tsx "app/(main)/(app)/(event)/events/[eventId]/manage/qr/page.tsx" "app/(main)/(app)/(event)/events/[eventId]/manage/qr/page.test.tsx" "app/(main)/(app)/(event)/events/[eventId]/tools/gallery/qr"
git commit -m "feat(qr-cards): open the card page from Print when designs are on"
```

---

### Task 12: Gift card designs

The gift card page shows the designer when the event has QR cards, and today's card otherwise. The recipient line (the title), the scan line and the giver line are editable. The PIN and email lines stay as they are.

**Files:**
- Create: `components/giftMode/GiftCardPlain.tsx`, `components/giftMode/GiftCardPinOption.tsx`
- Modify: `hooks/useGiftCardPrint.ts`, `components/giftMode/GiftCardPrintScreen.tsx`, `…/manage/gift/card/page.tsx`
- Test: `hooks/useGiftCardPrint.test.tsx`, `…/manage/gift/card/page.test.tsx` (both new)

- [ ] **Step 1: Write the failing hook test**

```tsx
import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    gift: { data: undefined as unknown, isLoading: false },
    issued: { data: undefined as unknown },
    templates: { data: undefined as unknown, isLoading: false, isError: false, refetch: vi.fn() },
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
}));
vi.mock('@/hooks/useGift', () => ({ useEventGift: () => mocks.gift, useIssuedGiftCard: () => mocks.issued }));
vi.mock('@/hooks/useQrCardTemplates', () => ({ useQrCardTemplates: () => mocks.templates }));
vi.mock('@/lib/gift', () => ({ canPrintGiftCard: () => true, giftClaimUrl: (origin: string, token: string) => `${origin}/gift/${token}` }));

import { useGiftCardPrint } from '@/hooks/useGiftCardPrint';

const CARD = { token: 'tok', status: 'ISSUED', recipientLabel: 'For Eleni', recipientEmail: 'eleni@example.com', giverDisplayName: 'The Papadopoulos family' };

function unticked() {
    return { target: { checked: false } } as unknown as ChangeEvent<HTMLInputElement>;
}

beforeEach(() => {
    mocks.gift = { data: CARD, isLoading: false };
    mocks.issued = { data: { token: 'tok', pin: '4821' } };
    mocks.templates = { data: { available: true, templates: [] }, isLoading: false, isError: false, refetch: vi.fn() };
});

describe('useGiftCardPrint', () => {
    it('waits for the designs too', () => {
        mocks.templates = { ...mocks.templates, data: undefined, isLoading: true };
        expect(renderHook(() => useGiftCardPrint('e1')).result.current.isLoading).toBe(true);
    });

    it('offers the designer only when the event has QR cards', () => {
        expect(renderHook(() => useGiftCardPrint('e1')).result.current.designsAvailable).toBe(true);
        mocks.templates = { ...mocks.templates, data: { available: false, templates: [] } };
        expect(renderHook(() => useGiftCardPrint('e1')).result.current.designsAvailable).toBe(false);
    });

    it('starts the designer from the card', () => {
        const { result } = renderHook(() => useGiftCardPrint('e1'));
        expect(result.current.designer.text).toEqual({ title: 'For Eleni', line: 'scan', giver: 'The Papadopoulos family' });
        expect(result.current.cardLabel).toBe('cardLabel {"title":"For Eleni"}');
        expect(result.current.claimUrl).toMatch(/\/gift\/tok$/);
    });

    it('stacks the scan line, PIN, email and giver under the code', () => {
        const { result } = renderHook(() => useGiftCardPrint('e1'));
        expect(result.current.cardLines).toEqual([
            { text: 'scan', tone: 'body' },
            { text: 'pin {"pin":"4821"}', tone: 'code' },
            { text: 'email {"email":"eleni@example.com"}', tone: 'small' },
            { text: 'The Papadopoulos family', tone: 'strong' },
        ]);
    });

    it('drops the PIN when the giver keeps it for the envelope', () => {
        const { result } = renderHook(() => useGiftCardPrint('e1'));
        act(() => result.current.handleIncludePinChange(unticked()));
        expect(result.current.cardLines.map((line) => line.tone)).toEqual(['body', 'small', 'strong']);
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run hooks/useGiftCardPrint.test.tsx`
Expected: FAIL. `designsAvailable`, `designer`, `cardLines` and `cardLabel` are undefined.

- [ ] **Step 3: Rewrite `hooks/useGiftCardPrint.ts`**

```ts
'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useState, useSyncExternalStore } from 'react';

import { useEventGift, useIssuedGiftCard } from '@/hooks/useGift';
import { useQrCardDesigner } from '@/hooks/useQrCardDesigner';
import { useQrCardExport } from '@/hooks/useQrCardExport';
import { useQrCardTemplates } from '@/hooks/useQrCardTemplates';
import type { QrCardTemplateDto } from '@/lib/api/types';
import { canPrintGiftCard, giftClaimUrl } from '@/lib/gift';
import { giftQrCardLines } from '@/lib/qrCard';

const NO_TEMPLATES: QrCardTemplateDto[] = [];

function subscribeToNothing() {
    return () => {};
}

/**
 * The printable claim card: the live card's QR, and its PIN when the card was
 * issued in this visit (the PIN is never returned again). The giver decides
 * whether the PIN goes on the card or in the envelope. With QR cards on the
 * event, the card can wear a design; the recipient, scan and giver lines are
 * editable, the PIN and email are not.
 */
export function useGiftCardPrint(eventId: string) {
    const t = useTranslations('GiftMode.card');
    const tCard = useTranslations('QrCardPage');
    const gift = useEventGift(eventId);
    const issued = useIssuedGiftCard(eventId);
    const templates = useQrCardTemplates(eventId);
    // Read on the client only: the server has no origin to put in the QR.
    const origin = useSyncExternalStore(
        subscribeToNothing,
        () => window.location.origin,
        () => null,
    );
    const [includePin, setIncludePin] = useState(true);

    const card = gift.data && canPrintGiftCard(gift.data) ? gift.data : null;
    // A PIN from before a reissue belongs to a dead card.
    const pin = card && issued.data?.token === card.token ? issued.data.pin : null;
    const showPin = Boolean(pin) && includePin;

    const designer = useQrCardDesigner({
        templates: templates.data?.templates ?? NO_TEMPLATES,
        defaults: { title: card?.recipientLabel ?? '', line: t('scan'), giver: card?.giverDisplayName ?? '' },
    });
    const exporter = useQrCardExport({ font: designer.style.headingFont, title: designer.text.title });

    const handleIncludePinChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setIncludePin(event.target.checked), []);
    const print = useCallback(() => window.print(), []);
    const { refetch } = templates;
    const retryTemplates = useCallback(() => void refetch(), [refetch]);

    return {
        isLoading: gift.isLoading || templates.isLoading,
        card,
        claimUrl: card?.token && origin ? giftClaimUrl(origin, card.token) : null,
        pin,
        includePin: showPin,
        handleIncludePinChange,
        print,
        designsAvailable: templates.data?.available === true,
        templatesFailed: templates.isError,
        retryTemplates,
        designer,
        exporter,
        cardLines: giftQrCardLines({
            line: designer.text.line,
            pin: showPin ? t('pin', { pin: pin ?? '' }) : null,
            email: card?.recipientEmail ? t('email', { email: card.recipientEmail }) : null,
            giver: designer.text.giver,
        }),
        cardLabel: tCard('cardLabel', { title: designer.text.title }),
    };
}
```

- [ ] **Step 4: Run the hook test to see it pass**

Run: `npx vitest run hooks/useGiftCardPrint.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Split the screen**

`components/giftMode/GiftCardPinOption.tsx` (the PIN checkbox, moved unchanged):

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

export function GiftCardPinOption({
    pin,
    includePin,
    onChangeAction,
}: {
    pin: string | null;
    includePin: boolean;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    const t = useTranslations('GiftMode.card');

    if (!pin) return <p className="text-sm text-ink-muted">{t('pinUnavailable')}</p>;

    return (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
            <input type="checkbox" checked={includePin} onChange={onChangeAction} className="h-4 w-4 accent-primary" />
            {t('includePin')}
        </label>
    );
}
```

`components/giftMode/GiftCardPlain.tsx` (today's card and options, moved unchanged):

```tsx
'use client';

import { Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';
import type { ChangeEvent } from 'react';

import { GiftCardPinOption } from '@/components/giftMode/GiftCardPinOption';
import type { GiftHandoverResponseDto } from '@/lib/api/types';

const QR_SIZE = 220;

// The gift card for events without QR cards.
export function GiftCardPlain({
    card,
    claimUrl,
    pin,
    includePin,
    onIncludePinChangeAction,
    onPrintAction,
}: {
    card: GiftHandoverResponseDto;
    claimUrl: string | null;
    pin: string | null;
    includePin: boolean;
    onIncludePinChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onPrintAction: () => void;
}) {
    const t = useTranslations('GiftMode.card');

    return (
        <div className="flex flex-col gap-6">
            {/* Card */}
            <div
                data-print-root
                className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl bg-white px-6 py-8 text-center text-[#241f1a] shadow-sm"
            >
                <p className="text-2xl font-bold text-balance">{card.recipientLabel}</p>
                {claimUrl && (
                    <QRCodeSVG value={claimUrl} size={QR_SIZE} level="H" marginSize={2} fgColor="#241f1a" bgColor="#ffffff" title={t('scan')} />
                )}
                <p className="text-sm">{t('scan')}</p>
                {includePin && <p className="font-mono text-lg font-bold tracking-[0.2em]">{t('pin', { pin: pin ?? '' })}</p>}
                {card.recipientEmail && <p className="text-xs break-all text-[#6f665d]">{t('email', { email: card.recipientEmail })}</p>}
                <p className="text-base font-semibold text-balance">{card.giverDisplayName}</p>
            </div>

            {/* Options */}
            <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
                <GiftCardPinOption pin={pin} includePin={includePin} onChangeAction={onIncludePinChangeAction} />
                <button
                    type="button"
                    onClick={onPrintAction}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-ink/90"
                >
                    <Printer className="h-4 w-4" aria-hidden="true" />
                    {t('print')}
                </button>
            </div>
        </div>
    );
}
```

`components/giftMode/GiftCardPrintScreen.tsx`:

```tsx
'use client';

import { Gift } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { GiftCardPinOption } from '@/components/giftMode/GiftCardPinOption';
import { GiftCardPlain } from '@/components/giftMode/GiftCardPlain';
import { QrLinksListSkeleton } from '@/components/manage/ManageSkeletons';
import { QrCardDesigner } from '@/components/qrCard/QrCardDesigner';
import { QrCardDesignerSkeleton } from '@/components/qrCard/QrCardSkeletons';
import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { useGiftCardPrint } from '@/hooks/useGiftCardPrint';
import { routes } from '@/lib/routes';

export function GiftCardPrintScreen() {
    const t = useTranslations('GiftMode.card');
    const { eventId } = useEventRouteContext();
    const print = useGiftCardPrint(eventId);

    return (
        <ModulePageShell maxWidth="xl" title={t('title')} icon={Gift} backLabel={t('back')} backHref={routes.events.manage(eventId, { tab: 'gift' })}>
            {print.isLoading ? (
                <QrLinksListSkeleton />
            ) : !print.card ? (
                // No live card
                <p className="text-center text-sm text-ink-muted">{t('noCard')}</p>
            ) : !print.designsAvailable ? (
                <GiftCardPlain
                    card={print.card}
                    claimUrl={print.claimUrl}
                    pin={print.pin}
                    includePin={print.includePin}
                    onIncludePinChangeAction={print.handleIncludePinChange}
                    onPrintAction={print.print}
                />
            ) : !print.claimUrl ? (
                // The claim link needs the browser's origin: a beat after hydration.
                <QrCardDesignerSkeleton />
            ) : (
                <QrCardDesigner
                    designer={print.designer}
                    exporter={print.exporter}
                    url={print.claimUrl}
                    lines={print.cardLines}
                    label={print.cardLabel}
                    templatesFailed={print.templatesFailed}
                    onRetryTemplatesAction={print.retryTemplates}
                >
                    {/* PIN */}
                    <GiftCardPinOption pin={print.pin} includePin={print.includePin} onChangeAction={print.handleIncludePinChange} />
                </QrCardDesigner>
            )}
        </ModulePageShell>
    );
}
```

- [ ] **Step 6: Write the failing gift page test**

`…/manage/gift/card/page.test.tsx`:

```tsx
import type { DehydratedState } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serverGet = vi.fn();
const serverGetOrNull = vi.fn();
vi.mock('@/lib/api/serverFetch', () => ({
    serverGet: (...args: unknown[]) => serverGet(...args),
    serverGetOrNull: (...args: unknown[]) => serverGetOrNull(...args),
}));
const ctx = vi.hoisted(() => ({ context: null as null | { accessToken: string; isHost: boolean } }));
vi.mock('@/lib/auth/serverEventContext', () => ({ resolveServerEventContext: async () => ctx.context }));
vi.mock('./PageClient', () => ({ default: () => null }));

import Page from './page';

function visit() {
    return Page({ params: Promise.resolve({ eventId: 'e1' }) });
}

function seededKeys(element: ReactElement) {
    const { state } = element.props as { state: DehydratedState };
    return state.queries.map((query) => query.queryKey);
}

beforeEach(() => {
    serverGet.mockReset().mockResolvedValue({ available: true, templates: [] });
    serverGetOrNull.mockReset().mockResolvedValue({ token: 'tok', status: 'ISSUED' });
    ctx.context = { accessToken: 'tok', isHost: true };
});

describe('Gift card prefetch', () => {
    it('seeds the card designs for a host, next to the gift', async () => {
        const keys = seededKeys(await visit());
        expect(serverGet).toHaveBeenCalledWith('/api/events/e1/qr-card-templates', 'tok');
        expect(keys).toEqual(expect.arrayContaining([['events', 'e1', 'qr-card-templates']]));
    });

    it('fetches nothing for a guest or on an in-app navigation', async () => {
        ctx.context = { accessToken: 'tok', isHost: false };
        await visit();
        ctx.context = null;
        await visit();
        expect(serverGet).not.toHaveBeenCalled();
        expect(serverGetOrNull).not.toHaveBeenCalled();
    });
});
```

The test checks only the design list key. `giftKeys` comes from a `'use client'` module, and whether that seed works under the real server build is checked in Task 19, not here.

- [ ] **Step 7: Run it to see it fail**

Run: `npx vitest run "app/(main)/(app)/(event)/events/[eventId]/manage/gift/card"`
Expected: FAIL. `serverGet` is never called.

- [ ] **Step 8: Prefetch the designs on the gift card page**

In `…/manage/gift/card/page.tsx`, add `import { prefetchQrCardTemplates } from '@/lib/api/prefetchQrCardTemplates';` and replace the host branch with:

```tsx
    if (context?.isHost) {
        await Promise.all([
            (async () => {
                try {
                    const gift = await serverGetOrNull<GiftHandoverResponseDto>(endpoints.events.gift(eventId), context.accessToken);
                    queryClient.setQueryData(giftKeys.event(eventId), gift);
                } catch {
                    // Best-effort — useEventGift fetches normally on the client if this fails.
                }
            })(),
            prefetchQrCardTemplates(queryClient, eventId, context.accessToken),
        ]);
    }
```

Update the comment above `Page` to: `Prefetches the gift and the card designs (any host) so the card draws without a loading state. The PIN is never fetched: only a card issued in this visit has it, in memory.`

- [ ] **Step 9: Run the gift tests to see them pass**

Run: `npx vitest run "app/(main)/(app)/(event)/events/[eventId]/manage/gift/card" hooks/useGiftCardPrint.test.tsx`
Expected: PASS.

- [ ] **Step 10: Type-check and commit**

```bash
npm run type:check
git add hooks/useGiftCardPrint.ts hooks/useGiftCardPrint.test.tsx components/giftMode "app/(main)/(app)/(event)/events/[eventId]/manage/gift/card"
git commit -m "feat(qr-cards): offer card designs for the gift card"
```

---

### Task 13: The demo has no QR cards

The demo event runs on MSW handlers. Without a handler, `useQrCardTemplates` would hit the network. The demo answers "not available", so it keeps today's Print popup and gift card.

**Files:**
- Modify: `lib/demo/mockHandlers.ts`

- [ ] **Step 1: Add the handler**

In `lib/demo/mockHandlers.ts`, right after:

```ts
    http.get(`${API_BASE_URL}/api/events/:eventId/qr-links/stats`, () => HttpResponse.json(qrLinkStats())),
```

add:

```ts
    http.get(`${API_BASE_URL}/api/events/:eventId/qr-card-templates`, () => HttpResponse.json({ available: false, templates: [] })),
```

- [ ] **Step 2: Run the demo tests**

Run: `npx vitest run lib/demo`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/demo/mockHandlers.ts
git commit -m "feat(qr-cards): keep the demo on the plain QR print"
```

---

### Task 14: Admin draft, validation and payloads (`lib/adminQrCards.ts`)

**Files:**
- Create: `lib/adminQrCards.ts`
- Test: `lib/adminQrCards.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import {
    buildQrCardTemplateCreatePayload,
    buildQrCardTemplatePatchPayload,
    codeContrastRatio,
    draftFromQrCardTemplate,
    filterQrCardTemplates,
    isQrCardDetailError,
    type QrCardTemplateDraft,
    qrCardTemplateStatus,
    sortQrCardTemplates,
    validateQrCardTemplateDraft,
} from '@/lib/adminQrCards';
import { ApiError } from '@/lib/api/client';
import type { AdminQrCardTemplateDto, AdminThemeFontSummaryDto } from '@/lib/api/types';

const ALEGREYA: AdminThemeFontSummaryDto = {
    id: 'f1',
    key: 'alegreya',
    familyName: 'Alegreya',
    fallback: 'serif',
    archived: false,
    url: '/api/theme-fonts/alegreya/1.woff2',
};

const LINEN: AdminQrCardTemplateDto = {
    id: 't1',
    name: { en: 'Linen', el: 'Λινό' },
    eventTypes: ['WEDDING'],
    sortOrder: 0,
    archived: false,
    artworkUrl: '/api/qr-card-artwork/t1/1',
    textColor: '#5A3E2B',
    headingFont: null,
    codeColor: '#1F3A5A',
    centerLogo: false,
};

const SAGE: AdminQrCardTemplateDto = { ...LINEN, id: 't2', name: { en: 'Sage', el: 'Φασκόμηλο' }, sortOrder: 1, artworkUrl: null };

function valid(overrides: Partial<QrCardTemplateDraft> = {}): QrCardTemplateDraft {
    return { ...draftFromQrCardTemplate(null), nameEn: 'Linen', nameEl: 'Λινό', eventTypes: ['WEDDING'], ...overrides };
}

describe('draftFromQrCardTemplate', () => {
    it('starts a new design as Plain: ink, logo on', () => {
        expect(draftFromQrCardTemplate(null)).toEqual({
            nameEn: '',
            nameEl: '',
            eventTypes: [],
            archived: false,
            textColor: '#241F1A',
            headingFontId: '',
            codeColor: '#241F1A',
            centerLogo: true,
        });
    });

    it('copies a saved design', () => {
        expect(draftFromQrCardTemplate({ ...LINEN, headingFont: ALEGREYA })).toMatchObject({
            nameEn: 'Linen',
            codeColor: '#1F3A5A',
            centerLogo: false,
            headingFontId: 'f1',
        });
    });
});

describe('validateQrCardTemplateDraft', () => {
    it('asks for both names and an event type', () => {
        expect(validateQrCardTemplateDraft(draftFromQrCardTemplate(null))).toEqual({ nameEn: true, nameEl: true, eventTypes: true });
    });

    it('caps names at 60 characters', () => {
        expect(validateQrCardTemplateDraft(valid({ nameEn: 'x'.repeat(61) }))).toEqual({ nameEn: true });
        expect(validateQrCardTemplateDraft(valid({ nameEn: 'x'.repeat(60) }))).toEqual({});
    });

    it('needs #RRGGBB colours', () => {
        expect(validateQrCardTemplateDraft(valid({ textColor: 'red', codeColor: '#12' }))).toEqual({ textColor: true, codeColor: true });
    });

    it('needs 4.5:1 for the code against white', () => {
        expect(codeContrastRatio('#767676')).toBeGreaterThanOrEqual(4.5);
        expect(validateQrCardTemplateDraft(valid({ codeColor: '#767676' }))).toEqual({});
        expect(validateQrCardTemplateDraft(valid({ codeColor: '#777777' }))).toEqual({ codeContrast: true });
    });

    it('lets a saved code colour stand while other fields change', () => {
        expect(validateQrCardTemplateDraft(valid({ codeColor: '#777777' }), '#777777')).toEqual({});
    });
});

describe('buildQrCardTemplateCreatePayload', () => {
    it('sends trimmed names, upper-case colours and no font as null', () => {
        const draft = valid({ nameEn: ' Linen ', textColor: '#5a3e2b', codeColor: '#1f3a5a' });
        expect(buildQrCardTemplateCreatePayload(draft, 4)).toEqual({
            name: { en: 'Linen', el: 'Λινό' },
            eventTypes: ['WEDDING'],
            sortOrder: 4,
            textColor: '#5A3E2B',
            headingFontId: null,
            codeColor: '#1F3A5A',
            centerLogo: true,
        });
    });
});

describe('buildQrCardTemplatePatchPayload', () => {
    it('sends nothing when nothing changed, whatever the colour case', () => {
        expect(buildQrCardTemplatePatchPayload(LINEN, { ...draftFromQrCardTemplate(LINEN), codeColor: '#1f3a5a' })).toEqual({});
    });

    it('sends only what changed', () => {
        const draft: QrCardTemplateDraft = { ...draftFromQrCardTemplate(LINEN), nameEl: 'Λινάρι', centerLogo: true, archived: true };
        expect(buildQrCardTemplatePatchPayload(LINEN, draft)).toEqual({
            name: { en: 'Linen', el: 'Λινάρι' },
            centerLogo: true,
            archived: true,
        });
    });

    it('clears the font with a flag and sets a new one by id', () => {
        const withFont = { ...LINEN, headingFont: ALEGREYA };
        expect(buildQrCardTemplatePatchPayload(withFont, { ...draftFromQrCardTemplate(withFont), headingFontId: '' })).toEqual({ clearHeadingFont: true });
        expect(buildQrCardTemplatePatchPayload(LINEN, { ...draftFromQrCardTemplate(LINEN), headingFontId: 'f2' })).toEqual({ headingFontId: 'f2' });
    });
});

describe('qrCardTemplateStatus', () => {
    it('is archived, then without artwork, then live', () => {
        expect(qrCardTemplateStatus({ ...LINEN, archived: true, artworkUrl: null })).toBe('ARCHIVED');
        expect(qrCardTemplateStatus(SAGE)).toBe('NO_ARTWORK');
        expect(qrCardTemplateStatus(LINEN)).toBe('LIVE');
    });
});

describe('sortQrCardTemplates and filterQrCardTemplates', () => {
    it('sorts by order', () => {
        expect(sortQrCardTemplates([SAGE, LINEN]).map((template) => template.id)).toEqual(['t1', 't2']);
    });

    it('finds by name in the admin language, and by status', () => {
        expect(filterQrCardTemplates([LINEN, SAGE], 'φασκ', 'ALL', 'el').map((template) => template.id)).toEqual(['t2']);
        expect(filterQrCardTemplates([LINEN, SAGE], '', 'NO_ARTWORK', 'en').map((template) => template.id)).toEqual(['t2']);
    });
});

describe('isQrCardDetailError', () => {
    it("shows the server's detail for contrast, artwork and name rejections", () => {
        expect(isQrCardDetailError(new ApiError(400, { errorCode: 3110, detail: 'Too light.' }))).toBe(true);
        expect(isQrCardDetailError(new ApiError(400, { errorCode: 3111, detail: 'Not A6.' }))).toBe(true);
        expect(isQrCardDetailError(new ApiError(400, { errorCode: 3091, detail: 'Greek name missing.' }))).toBe(true);
        expect(isQrCardDetailError(new ApiError(400, { errorCode: 3001, detail: 'Bad.', errors: {} }))).toBe(true);
    });

    it('leaves field errors and other failures to the generic message', () => {
        expect(isQrCardDetailError(new ApiError(400, { errorCode: 3001, errors: { codeColor: 'must match' } }))).toBe(false);
        expect(isQrCardDetailError(new ApiError(409, { errorCode: 5145 }))).toBe(false);
        expect(isQrCardDetailError(new Error('offline'))).toBe(false);
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/adminQrCards.test.ts`
Expected: FAIL, "Failed to resolve import "@/lib/adminQrCards"".

- [ ] **Step 3: Write `lib/adminQrCards.ts`**

```ts
import type { Locale } from '@/i18n/config';
import { ApiError } from '@/lib/api/client';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { AdminQrCardTemplateDto, AdminQrCardTemplatePatchDto, AdminQrCardTemplateRequestDto, EventTypeConvention } from '@/lib/api/types';
import { contrastRatio } from '@/lib/contrast';
import { isHexColor } from '@/lib/eventTheme';
import { resolveLocalizedText } from '@/lib/localizedText';
import { QR_CARD_INK } from '@/lib/qrCard';

// Mirrors the backend's validation (QR card templates spec, "Admin") for inline feedback only; the
// server stays the authority.
export const QR_CARD_NAME_MAX = 60;
// The code sits on a white panel; the backend rejects a code colour under this against it (3110).
export const MIN_CODE_CONTRAST = 4.5;
const CODE_PANEL_COLOR = '#FFFFFF';

export const QR_CARD_STATUS_FILTERS = ['ALL', 'LIVE', 'NO_ARTWORK', 'ARCHIVED'] as const;
export type QrCardStatusFilter = (typeof QR_CARD_STATUS_FILTERS)[number];
export type QrCardTemplateStatus = Exclude<QrCardStatusFilter, 'ALL'>;

export type QrCardTemplateDraft = {
    nameEn: string;
    nameEl: string;
    eventTypes: EventTypeConvention[];
    archived: boolean;
    textColor: string;
    // '' means none: the card's own font.
    headingFontId: string;
    codeColor: string;
    centerLogo: boolean;
};

// textColor / codeColor: not #RRGGBB. codeContrast: valid, but too light to scan on white.
export type QrCardTemplateDraftErrors = Partial<Record<'nameEn' | 'nameEl' | 'textColor' | 'codeColor' | 'codeContrast' | 'eventTypes', true>>;

// The ratio of a #RRGGBB code colour against the white panel.
export function codeContrastRatio(hex: string): number {
    return contrastRatio(hex, CODE_PANEL_COLOR);
}

// A new design starts as Plain looks: ink text and code, the logo on.
export function draftFromQrCardTemplate(template: AdminQrCardTemplateDto | null): QrCardTemplateDraft {
    return {
        nameEn: template?.name.en ?? '',
        nameEl: template?.name.el ?? '',
        eventTypes: template?.eventTypes ?? [],
        archived: template?.archived ?? false,
        textColor: template?.textColor ?? QR_CARD_INK,
        headingFontId: template?.headingFont?.id ?? '',
        codeColor: template?.codeColor ?? QR_CARD_INK,
        centerLogo: template?.centerLogo ?? true,
    };
}

function isValidName(value: string): boolean {
    const trimmed = value.trim();
    return trimmed.length > 0 && trimmed.length <= QR_CARD_NAME_MAX;
}

function sameColor(left: string, right: string | null | undefined): boolean {
    return left.toUpperCase() === (right ?? '').toUpperCase();
}

// savedCodeColor: the colour the design already has. The server re-checks contrast only when a PATCH
// sends codeColor, and the patch sends it only when changed, so an untouched colour never blocks a save.
export function validateQrCardTemplateDraft(draft: QrCardTemplateDraft, savedCodeColor?: string | null): QrCardTemplateDraftErrors {
    const errors: QrCardTemplateDraftErrors = {};
    if (!isValidName(draft.nameEn)) errors.nameEn = true;
    if (!isValidName(draft.nameEl)) errors.nameEl = true;
    if (!isHexColor(draft.textColor)) errors.textColor = true;
    if (!isHexColor(draft.codeColor)) errors.codeColor = true;
    else if (!sameColor(draft.codeColor, savedCodeColor) && codeContrastRatio(draft.codeColor) < MIN_CODE_CONTRAST) errors.codeContrast = true;
    if (draft.eventTypes.length === 0) errors.eventTypes = true;
    return errors;
}

export function buildQrCardTemplateCreatePayload(draft: QrCardTemplateDraft, sortOrder: number): AdminQrCardTemplateRequestDto {
    return {
        name: { en: draft.nameEn.trim(), el: draft.nameEl.trim() },
        eventTypes: draft.eventTypes,
        sortOrder,
        textColor: draft.textColor.toUpperCase(),
        headingFontId: draft.headingFontId || null,
        codeColor: draft.codeColor.toUpperCase(),
        centerLogo: draft.centerLogo,
    };
}

function sameMembers(left: string[], right: string[]): boolean {
    return left.length === right.length && left.every((item) => right.includes(item));
}

// Only what changed, so the server never revalidates untouched fields.
export function buildQrCardTemplatePatchPayload(template: AdminQrCardTemplateDto, draft: QrCardTemplateDraft): AdminQrCardTemplatePatchDto {
    const patch: AdminQrCardTemplatePatchDto = {};
    const name = { en: draft.nameEn.trim(), el: draft.nameEl.trim() };
    if (name.en !== template.name.en || name.el !== template.name.el) patch.name = name;
    if (!sameMembers(draft.eventTypes, template.eventTypes)) patch.eventTypes = draft.eventTypes;
    if (draft.archived !== template.archived) patch.archived = draft.archived;
    if (!sameColor(draft.textColor, template.textColor)) patch.textColor = draft.textColor.toUpperCase();
    // Emptied means back to the card's own font, which only a clear flag does.
    if (!draft.headingFontId) {
        if (template.headingFont) patch.clearHeadingFont = true;
    } else if (draft.headingFontId !== template.headingFont?.id) {
        patch.headingFontId = draft.headingFontId;
    }
    if (!sameColor(draft.codeColor, template.codeColor)) patch.codeColor = draft.codeColor.toUpperCase();
    if (draft.centerLogo !== template.centerLogo) patch.centerLogo = draft.centerLogo;
    return patch;
}

// A live design without artwork isn't offered to hosts yet.
export function qrCardTemplateStatus(template: AdminQrCardTemplateDto): QrCardTemplateStatus {
    if (template.archived) return 'ARCHIVED';
    if (!template.artworkUrl) return 'NO_ARTWORK';
    return 'LIVE';
}

export function sortQrCardTemplates(templates: AdminQrCardTemplateDto[]): AdminQrCardTemplateDto[] {
    return [...templates].sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id));
}

export function filterQrCardTemplates(
    templates: AdminQrCardTemplateDto[],
    search: string,
    status: QrCardStatusFilter,
    locale: Locale,
): AdminQrCardTemplateDto[] {
    const needle = search.trim().toLocaleLowerCase(locale);
    return templates.filter((template) => {
        if (status !== 'ALL' && qrCardTemplateStatus(template) !== status) return false;
        if (!needle) return true;
        return resolveLocalizedText(template.name, locale).toLocaleLowerCase(locale).includes(needle);
    });
}

// The rejections whose localized detail names the exact problem (the ratio, the artwork's size, the
// language at fault), so the drawer shows the detail.
const DETAIL_CODES: ReadonlySet<number> = new Set([
    ERROR_CODES.QR_CARD_CODE_COLOR_LOW_CONTRAST,
    ERROR_CODES.QR_CARD_ARTWORK_SIZE_INVALID,
    ERROR_CODES.LOCALIZED_TEXT_INVALID,
]);

// One of those, or a 3001 with no field errors, where "check the highlighted fields" would point at nothing.
export function isQrCardDetailError(error: unknown): boolean {
    if (!(error instanceof ApiError)) return false;
    const code = getErrorCode(error);
    if (typeof code === 'number' && DETAIL_CODES.has(code)) return true;
    if (code !== ERROR_CODES.VALIDATION_FAILED) return false;
    return Object.keys(error.problem?.errors ?? {}).length === 0;
}
```

- [ ] **Step 4: Run the test to see it pass**

Run: `npx vitest run lib/adminQrCards.test.ts`
Expected: PASS (16 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/adminQrCards.ts lib/adminQrCards.test.ts
git commit -m "feat(qr-cards): add the admin draft, checks and payloads"
```

---

### Task 15: Admin hooks

**Files:**
- Create: `hooks/useAdminQrCardTemplates.ts`, `hooks/useQrCardTemplatesCatalog.ts`, `hooks/useQrCardTemplateDrawer.ts`
- Test: `hooks/useAdminQrCardTemplates.test.tsx`, `hooks/useQrCardTemplateDrawer.test.tsx`

- [ ] **Step 1: Write the failing queries test**

`hooks/useAdminQrCardTemplates.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), postForm: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api }));

import { useCreateQrCardTemplate, useUploadQrCardArtwork } from '@/hooks/useAdminQrCardTemplates';

function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset().mockResolvedValue({}));
});

describe('admin QR card template writes', () => {
    it('creates at the catalog endpoint', async () => {
        const { result } = renderHook(() => useCreateQrCardTemplate(), { wrapper });
        const input = {
            name: { en: 'Linen', el: 'Λινό' },
            eventTypes: ['WEDDING' as const],
            sortOrder: 0,
            textColor: '#241F1A',
            codeColor: '#241F1A',
            centerLogo: true,
        };
        await act(() => result.current.mutateAsync(input));
        expect(api.post).toHaveBeenCalledWith('/api/admin/qr-card-templates', input);
    });

    it('uploads the artwork as the file part', async () => {
        const { result } = renderHook(() => useUploadQrCardArtwork(), { wrapper });
        const file = new File(['x'], 'linen.png', { type: 'image/png' });
        await act(() => result.current.mutateAsync({ id: 't1', file }));
        const [path, body] = api.postForm.mock.calls[0] as [string, FormData];
        expect(path).toBe('/api/admin/qr-card-templates/t1/artwork');
        expect((body.get('file') as File).name).toBe('linen.png');
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run hooks/useAdminQrCardTemplates.test.tsx`
Expected: FAIL, "Failed to resolve import "@/hooks/useAdminQrCardTemplates"".

- [ ] **Step 3: Write `hooks/useAdminQrCardTemplates.ts`**

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useSortOrderMove } from '@/hooks/useSortOrderMove';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminQrCardTemplateDto, AdminQrCardTemplatePatchDto, AdminQrCardTemplateRequestDto } from '@/lib/api/types';

// Admin QR card template catalog (/api/admin/qr-card-templates). Every write refetches the list.

const templateIdOf = (template: AdminQrCardTemplateDto) => template.id;

export const adminQrCardTemplateKeys = {
    all: ['admin', 'qr-card-templates'] as const,
};

export function useAdminQrCardTemplates() {
    return useQuery({
        queryKey: adminQrCardTemplateKeys.all,
        queryFn: () => api.get<AdminQrCardTemplateDto[]>(endpoints.admin.qrCardTemplates.list),
    });
}

function useRefreshQrCardTemplates() {
    const queryClient = useQueryClient();
    return useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: adminQrCardTemplateKeys.all });
    }, [queryClient]);
}

export function useCreateQrCardTemplate() {
    const refresh = useRefreshQrCardTemplates();
    return useMutation({
        mutationFn: (input: AdminQrCardTemplateRequestDto) => api.post<AdminQrCardTemplateDto>(endpoints.admin.qrCardTemplates.list, input),
        onSuccess: refresh,
    });
}

export function usePatchQrCardTemplate() {
    const refresh = useRefreshQrCardTemplates();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: AdminQrCardTemplatePatchDto }) =>
            api.patch<AdminQrCardTemplateDto>(endpoints.admin.qrCardTemplates.byId(id), input),
        onSuccess: refresh,
    });
}

// POST …/{id}/artwork — replaces any previous artwork.
export function useUploadQrCardArtwork() {
    const refresh = useRefreshQrCardTemplates();
    return useMutation({
        mutationFn: ({ id, file }: { id: string; file: File }) => {
            const formData = new FormData();
            formData.append('file', file);
            return api.postForm<AdminQrCardTemplateDto>(endpoints.admin.qrCardTemplates.artwork(id), formData);
        },
        onSuccess: refresh,
    });
}

export function useMoveQrCardTemplate(templates: AdminQrCardTemplateDto[]) {
    return useSortOrderMove({
        items: templates,
        idOf: templateIdOf,
        patch: ({ id, sortOrder }) => api.patch<AdminQrCardTemplateDto>(endpoints.admin.qrCardTemplates.byId(id), { sortOrder }),
        refresh: useRefreshQrCardTemplates(),
    });
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run hooks/useAdminQrCardTemplates.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Write `hooks/useQrCardTemplatesCatalog.ts`**

```ts
'use client';

import { useLocale } from 'next-intl';
import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { useAdminPlatformEventTypes } from '@/hooks/useAdmin';
import { useAdminQrCardTemplates, useMoveQrCardTemplate } from '@/hooks/useAdminQrCardTemplates';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import type { Locale } from '@/i18n/config';
import { filterQrCardTemplates, type QrCardStatusFilter, sortQrCardTemplates } from '@/lib/adminQrCards';
import type { AdminQrCardTemplateDto } from '@/lib/api/types';
import { bySortOrder, nextSortOrder } from '@/lib/sortOrder';

export type QrCardTemplateDrawerState = { open: false } | { open: true; template: AdminQrCardTemplateDto | null };

export function useQrCardTemplatesCatalog() {
    const locale = useLocale() as Locale;
    const localizedText = useLocalizedText();
    const templatesQuery = useAdminQrCardTemplates();
    const eventTypesQuery = useAdminPlatformEventTypes();

    const templates = useMemo(() => sortQrCardTemplates(templatesQuery.data ?? []), [templatesQuery.data]);
    const eventTypes = useMemo(
        () =>
            [...(eventTypesQuery.data ?? [])]
                .sort(bySortOrder)
                .map((eventType) => ({ eventTypeKey: eventType.eventTypeKey, label: localizedText(eventType.name, eventType.eventTypeKey) })),
        [eventTypesQuery.data, localizedText],
    );
    const eventTypeLabels = useMemo(
        () => Object.fromEntries(eventTypes.map((eventType) => [eventType.eventTypeKey, eventType.label])) as Record<string, string>,
        [eventTypes],
    );

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<QrCardStatusFilter>('ALL');
    const visibleTemplates = useMemo(() => filterQrCardTemplates(templates, search, status, locale), [locale, templates, search, status]);

    const move = useMoveQrCardTemplate(templates);
    // Arrows move a design within the full list, so they only work while nothing is hidden.
    const canReorder = !search.trim() && status === 'ALL' && !move.isPending;
    const [drawer, setDrawer] = useState<QrCardTemplateDrawerState>({ open: false });

    const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setSearch(event.currentTarget.value), []);
    const openCreate = useCallback(() => setDrawer({ open: true, template: null }), []);
    const openEdit = useCallback(
        (templateId: string) => {
            const template = templates.find((item) => item.id === templateId);
            if (template) setDrawer({ open: true, template });
        },
        [templates],
    );
    const closeDrawer = useCallback(() => setDrawer({ open: false }), []);

    return {
        templates,
        visibleTemplates: move.arrange(visibleTemplates),
        eventTypes,
        eventTypeLabels,
        search,
        status,
        setStatus,
        canReorder,
        moveError: move.error,
        drawer,
        createSortOrder: nextSortOrder(templates),
        isLoading: templatesQuery.isLoading || eventTypesQuery.isLoading,
        error: templatesQuery.error ?? eventTypesQuery.error ?? null,
        handleSearchChange,
        openCreate,
        openEdit,
        closeDrawer,
        moveTemplate: move.move,
        reorderTemplate: move.reorder,
    };
}
```

- [ ] **Step 6: Write the failing drawer hook test**

`hooks/useQrCardTemplateDrawer.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React, { type ChangeEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useQrCardTemplateDrawer } from '@/hooks/useQrCardTemplateDrawer';
import { ApiError } from '@/lib/api/client';
import type { AdminQrCardTemplateDto, AdminThemeFontDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({
    create: vi.fn(),
    patch: vi.fn(),
    upload: vi.fn(),
    fonts: { data: [] as AdminThemeFontDto[] | undefined, isPending: false, isError: false },
}));

vi.mock('@/hooks/useAdminQrCardTemplates', () => ({
    adminQrCardTemplateKeys: { all: ['admin', 'qr-card-templates'] },
    useCreateQrCardTemplate: () => ({ mutateAsync: mocks.create, isPending: false }),
    usePatchQrCardTemplate: () => ({ mutateAsync: mocks.patch, isPending: false }),
    useUploadQrCardArtwork: () => ({ mutateAsync: mocks.upload, isPending: false }),
}));
vi.mock('@/hooks/useAdminThemeFonts', () => ({ adminThemeFontKeys: { all: ['admin', 'theme-fonts'] }, useAdminThemeFonts: () => mocks.fonts }));
vi.mock('next-intl', () => ({ useLocale: () => 'en' }));

const LINEN: AdminQrCardTemplateDto = {
    id: 't1',
    name: { en: 'Linen', el: 'Λινό' },
    eventTypes: ['WEDDING'],
    sortOrder: 0,
    archived: false,
    artworkUrl: '/api/qr-card-artwork/t1/1',
    textColor: '#5A3E2B',
    headingFont: null,
    codeColor: '#1F3A5A',
    centerLogo: false,
};

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function field(name: string, value: string) {
    return { currentTarget: { name, value } } as unknown as ChangeEvent<HTMLInputElement>;
}

function fileChange(file: File) {
    return { currentTarget: { files: [file], value: 'C:\\fakepath\\x' } } as unknown as ChangeEvent<HTMLInputElement>;
}

function submitEvent() {
    return { preventDefault: vi.fn() } as unknown as React.SubmitEvent<HTMLFormElement>;
}

function renderDrawer(template: AdminQrCardTemplateDto | null = null, onDoneAction = vi.fn()) {
    return renderHook(() => useQrCardTemplateDrawer({ template, sortOrder: 2, onDoneAction }), { wrapper });
}

beforeEach(() => {
    queryClient = new QueryClient();
    mocks.fonts = { data: [], isPending: false, isError: false };
    mocks.create.mockReset();
    mocks.patch.mockReset();
    mocks.upload.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:artwork');
    URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('useQrCardTemplateDrawer', () => {
    it('does not save an invalid draft and shows what is missing', async () => {
        const { result } = renderDrawer();
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(mocks.create).not.toHaveBeenCalled();
        expect(result.current.errors).toEqual({ nameEn: true, nameEl: true, eventTypes: true });
    });

    it('creates the design, then uploads the artwork', async () => {
        const onDoneAction = vi.fn();
        const file = new File(['x'], 'linen.png', { type: 'image/png' });
        mocks.create.mockResolvedValue({ ...LINEN, artworkUrl: null });
        mocks.upload.mockResolvedValue(LINEN);
        const { result } = renderDrawer(null, onDoneAction);

        act(() => result.current.handleFieldChange(field('nameEn', 'Linen')));
        act(() => result.current.handleFieldChange(field('nameEl', 'Λινό')));
        act(() => result.current.handleEventTypeChange(field('eventType', 'WEDDING')));
        act(() => result.current.handleFileChange(fileChange(file)));
        expect(result.current.previewStyle.artworkUrl).toBe('blob:artwork');
        await act(() => result.current.handleSubmit(submitEvent()));

        expect(mocks.create).toHaveBeenCalledWith({
            name: { en: 'Linen', el: 'Λινό' },
            eventTypes: ['WEDDING'],
            sortOrder: 2,
            textColor: '#241F1A',
            headingFontId: null,
            codeColor: '#241F1A',
            centerLogo: true,
        });
        expect(mocks.upload).toHaveBeenCalledWith({ id: 't1', file });
        expect(onDoneAction).toHaveBeenCalled();
    });

    it('sends only what changed', async () => {
        mocks.patch.mockResolvedValue(LINEN);
        const { result } = renderDrawer(LINEN);
        act(() => result.current.handleFieldChange(field('textColor', '#2b2b2b')));
        act(() => result.current.handleCenterLogoChange(true));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(mocks.patch).toHaveBeenCalledWith({ id: 't1', input: { textColor: '#2B2B2B', centerLogo: true } });
    });

    it('closes without a request when nothing changed', async () => {
        const onDoneAction = vi.fn();
        const { result } = renderDrawer(LINEN, onDoneAction);
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(mocks.patch).not.toHaveBeenCalled();
        expect(onDoneAction).toHaveBeenCalled();
    });

    it('holds back a code colour too light to scan', async () => {
        const { result } = renderDrawer(LINEN);
        act(() => result.current.handleFieldChange(field('codeColor', '#777777')));
        expect(result.current.codeContrastRatio).toBeLessThan(4.5);
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(mocks.patch).not.toHaveBeenCalled();
        expect(result.current.errors).toEqual({ codeContrast: true });
    });

    it('draws the preview from the draft, in ink while a colour is half typed', () => {
        const { result } = renderDrawer(LINEN);
        act(() => result.current.handleFieldChange(field('textColor', '#5A3')));
        expect(result.current.previewStyle).toMatchObject({
            artworkUrl: LINEN.artworkUrl,
            textColor: '#241F1A',
            codeColor: '#1F3A5A',
            centerLogo: false,
        });
    });

    it('refetches the list when the design is gone, and the fonts when its font is', async () => {
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
        const { result } = renderDrawer(LINEN);
        act(() => result.current.handleFieldChange(field('nameEn', 'Linen 2')));

        mocks.patch.mockRejectedValueOnce(new ApiError(404, {}));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(result.current.failure).toEqual({ kind: 'notFound' });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'qr-card-templates'] });

        mocks.patch.mockRejectedValueOnce(new ApiError(409, { errorCode: 5145 }));
        await act(() => result.current.handleSubmit(submitEvent()));
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'theme-fonts'] });
    });
});
```

- [ ] **Step 7: Run it to see it fail**

Run: `npx vitest run hooks/useQrCardTemplateDrawer.test.tsx`
Expected: FAIL, "Failed to resolve import "@/hooks/useQrCardTemplateDrawer"".

- [ ] **Step 8: Write `hooks/useQrCardTemplateDrawer.ts`**

```ts
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { adminQrCardTemplateKeys, useCreateQrCardTemplate, usePatchQrCardTemplate, useUploadQrCardArtwork } from '@/hooks/useAdminQrCardTemplates';
import { adminThemeFontKeys, useAdminThemeFonts } from '@/hooks/useAdminThemeFonts';
import {
    buildQrCardTemplateCreatePayload,
    buildQrCardTemplatePatchPayload,
    codeContrastRatio,
    draftFromQrCardTemplate,
    type QrCardTemplateDraft,
    validateQrCardTemplateDraft,
} from '@/lib/adminQrCards';
import { illustrationFileError, themeFontOptions, toggleEventType } from '@/lib/adminThemePresets';
import { ERROR_CODES, getErrorCode, isNotFoundError } from '@/lib/api/errors';
import type { AdminQrCardTemplateDto, EventThemeFontDto, EventTypeConvention } from '@/lib/api/types';
import { isHexColor } from '@/lib/eventTheme';
import { QR_CARD_INK, type QrCardStyle } from '@/lib/qrCard';

export type QrCardTemplateDrawerError = { kind: 'notFound' } | { kind: 'other'; error: unknown };
export type QrCardTemplateAvailability = 'AVAILABLE' | 'ARCHIVED';
export type QrCardFontsStatus = 'loading' | 'error' | 'ready';

// 404 means another admin's change removed the design from under this drawer.
function classifyError(error: unknown): QrCardTemplateDrawerError {
    if (isNotFoundError(error)) return { kind: 'notFound' };
    return { kind: 'other', error };
}

// A colour input only takes a lower-case #rrggbb; a half-typed colour shows ink.
function colorInputValue(value: string): string {
    return (isHexColor(value) ? value : QR_CARD_INK).toLowerCase();
}

export function useQrCardTemplateDrawer({
    template,
    sortOrder,
    onDoneAction,
}: {
    template: AdminQrCardTemplateDto | null;
    sortOrder: number;
    onDoneAction: () => void;
}) {
    const locale = useLocale();
    const queryClient = useQueryClient();
    const create = useCreateQrCardTemplate();
    const patch = usePatchQrCardTemplate();
    const upload = useUploadQrCardArtwork();
    const fonts = useAdminThemeFonts();

    // After a create the drawer edits the new design, so retrying a failed upload doesn't create it twice.
    const [saved, setSaved] = useState<AdminQrCardTemplateDto | null>(template);
    const isCreate = saved === null;
    const [draft, setDraft] = useState<QrCardTemplateDraft>(() => draftFromQrCardTemplate(template));
    const [submitted, setSubmitted] = useState(false);
    const [failure, setFailure] = useState<QrCardTemplateDrawerError | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<'type' | 'size' | null>(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
    // Set synchronously: a fast double click submits twice before isSaving re-renders.
    const submitting = useRef(false);
    // Cleared on unmount: a save still in flight then stops before the upload and never calls
    // onDoneAction, which would otherwise act on whatever drawer is open by then.
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    // Revokes the previous preview whenever it's replaced, and the last one on unmount.
    useEffect(() => {
        return () => {
            if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
        };
    }, [filePreviewUrl]);

    const errors = useMemo(() => validateQrCardTemplateDraft(draft, saved?.codeColor), [draft, saved]);

    const fontOptions = useMemo(() => themeFontOptions(fonts.data, saved?.headingFont ?? null), [fonts.data, saved]);
    // What the preview draws the title in: the list's copy of the selected font, else the design's own.
    const previewFont = useMemo<EventThemeFontDto | null>(() => {
        if (!draft.headingFontId) return null;
        const font =
            fonts.data?.find((item) => item.id === draft.headingFontId) ??
            (saved?.headingFont?.id === draft.headingFontId ? saved.headingFont : null);
        return font?.url ? { key: font.key, fallback: font.fallback, url: font.url } : null;
    }, [draft.headingFontId, fonts.data, saved]);

    const previewStyle = useMemo<QrCardStyle>(
        () => ({
            id: saved?.id ?? 'new',
            artworkUrl: filePreviewUrl ?? saved?.artworkUrl ?? null,
            textColor: isHexColor(draft.textColor) ? draft.textColor : QR_CARD_INK,
            headingFont: previewFont,
            codeColor: isHexColor(draft.codeColor) ? draft.codeColor : QR_CARD_INK,
            centerLogo: draft.centerLogo,
        }),
        [draft, filePreviewUrl, previewFont, saved],
    );

    const handleFieldChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = event.currentTarget;
        setDraft((current) => ({ ...current, [name]: value }));
    }, []);

    const handleEventTypeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const eventType = event.currentTarget.value as EventTypeConvention;
        setDraft((current) => ({ ...current, eventTypes: toggleEventType(current.eventTypes, eventType) }));
    }, []);

    const handleCenterLogoChange = useCallback((centerLogo: boolean) => setDraft((current) => ({ ...current, centerLogo })), []);

    const handleAvailabilityChange = useCallback((availability: QrCardTemplateAvailability) => {
        setDraft((current) => ({ ...current, archived: availability === 'ARCHIVED' }));
    }, []);

    // Type and size only; the server checks the A6 shape and width (3111).
    const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const next = event.currentTarget.files?.[0] ?? null;
        // Lets the same file be picked again after a refusal.
        event.currentTarget.value = '';
        if (!next) return;
        const problem = illustrationFileError(next);
        setFileError(problem);
        if (problem) return;
        setFile(next);
        setFilePreviewUrl(URL.createObjectURL(next));
    }, []);

    const handleSubmit = useCallback(
        async (event: React.SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            setSubmitted(true);
            setFailure(null);
            if (Object.keys(errors).length > 0 || submitting.current) return;
            submitting.current = true;

            let current = saved;
            try {
                if (current === null) {
                    current = await create.mutateAsync(buildQrCardTemplateCreatePayload(draft, sortOrder));
                    if (!mounted.current) return;
                    setSaved(current);
                } else {
                    const input = buildQrCardTemplatePatchPayload(current, draft);
                    if (Object.keys(input).length > 0) {
                        current = await patch.mutateAsync({ id: current.id, input });
                        setSaved(current);
                    }
                }
                if (!mounted.current) return;
                if (file) {
                    setSaved(await upload.mutateAsync({ id: current.id, file }));
                    setFile(null);
                }
                if (!mounted.current) return;
                onDoneAction();
            } catch (error) {
                if (!mounted.current) return;
                const classified = classifyError(error);
                if (classified.kind === 'notFound') void queryClient.invalidateQueries({ queryKey: adminQrCardTemplateKeys.all });
                // The picked font can no longer be assigned: refetch the list so the select stops offering it.
                if (getErrorCode(error) === ERROR_CODES.THEME_FONT_NOT_ASSIGNABLE) {
                    void queryClient.invalidateQueries({ queryKey: adminThemeFontKeys.all });
                }
                setFailure(classified);
            } finally {
                submitting.current = false;
            }
        },
        [create, draft, errors, file, onDoneAction, patch, queryClient, saved, sortOrder, upload],
    );

    return {
        isCreate,
        draft,
        errors: submitted ? errors : {},
        failure,
        fileError,
        hasPendingFile: file !== null,
        textColorInputValue: colorInputValue(draft.textColor),
        codeColorInputValue: colorInputValue(draft.codeColor),
        // The code colour against the white panel; null while it isn't a valid colour.
        codeContrastRatio: isHexColor(draft.codeColor) ? codeContrastRatio(draft.codeColor) : null,
        availability: (draft.archived ? 'ARCHIVED' : 'AVAILABLE') as QrCardTemplateAvailability,
        previewStyle,
        previewTitle: (locale === 'el' ? draft.nameEl : draft.nameEn).trim(),
        fontOptions,
        // Fonts a design can newly take: live, with a file.
        hasUsableFonts: fonts.data?.some((font) => !font.archived && font.url) ?? false,
        // A failed refetch over cached data still has a list to offer.
        fontsStatus: (fonts.isPending ? 'loading' : fonts.isError && !fonts.data ? 'error' : 'ready') as QrCardFontsStatus,
        isSaving: create.isPending || patch.isPending || upload.isPending,
        handleFieldChange,
        handleEventTypeChange,
        handleCenterLogoChange,
        handleAvailabilityChange,
        handleFileChange,
        handleSubmit,
    };
}
```

- [ ] **Step 9: Run the hook tests to see them pass**

Run: `npx vitest run hooks/useQrCardTemplateDrawer.test.tsx hooks/useAdminQrCardTemplates.test.tsx`
Expected: PASS (9 tests).

- [ ] **Step 10: Commit**

```bash
git add hooks/useAdminQrCardTemplates.ts hooks/useAdminQrCardTemplates.test.tsx hooks/useQrCardTemplatesCatalog.ts hooks/useQrCardTemplateDrawer.ts hooks/useQrCardTemplateDrawer.test.tsx
git commit -m "feat(qr-cards): add the admin catalog hooks"
```

---

### Task 16: Admin panel, table and drawer

Use the `design:design-system` skill first. The panel copies the theme preset panel (it predates the admin console redesign in CLAUDE.md, and the catalog tabs share its shell): a real table, status pills, and a right-side drawer for one design at a time. Copy is the formal plural, like `AdminPage.themePresets`.

**Files:**
- Create: `components/admin/qrCards/QrCardTemplatesPanel.tsx`, `components/admin/qrCards/QrCardTemplatesTable.tsx`, `components/admin/qrCards/QrCardTemplateRow.tsx`, `components/admin/qrCards/QrCardTemplateDrawer.tsx`, `components/admin/qrCards/QrCardTemplatePreview.tsx`
- Test: `components/admin/qrCards/QrCardTemplateDrawer.test.tsx`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Add the admin copy**

`messages/en.json`, inside `"AdminPage"`, right before `"themeFonts": {`:

```json
        "qrCards": {
            "title": "QR cards",
            "subtitle": "Card designs hosts can print their QR codes on.",
            "create": "New design",
            "search": "Search by name",
            "loading": "Loading designs…",
            "empty": "No designs yet.",
            "noMatches": "No designs match.",
            "edit": "Edit {name}",
            "filters": {
                "ALL": "All",
                "LIVE": "Offered",
                "NO_ARTWORK": "Needs artwork",
                "ARCHIVED": "Archived"
            },
            "status": {
                "LIVE": "Offered",
                "NO_ARTWORK": "Needs artwork",
                "ARCHIVED": "Archived"
            },
            "columns": {
                "design": "Design",
                "eventTypes": "Event types",
                "code": "Code colour",
                "status": "Status",
                "order": "Order"
            },
            "drawer": {
                "createTitle": "New design",
                "close": "Close",
                "cancel": "Cancel",
                "save": "Save",
                "nameEn": "English name",
                "nameEl": "Greek name",
                "nameInvalid": "Enter 1 to 60 characters.",
                "textColor": "Text colour",
                "textColorHex": "Text colour hex code",
                "textColorInvalid": "Use a colour like #5A3E2B.",
                "headingFont": "Title font",
                "headingFontDefault": "Card font (default)",
                "headingFontOption": "{familyName} ({key})",
                "headingFontArchived": "{familyName} ({key}), archived",
                "headingFontNoFile": "{familyName} ({key}), no file yet",
                "headingFontLoading": "Loading fonts…",
                "headingFontLoadFailed": "Couldn't load the fonts. The current choice is kept. Close and reopen this panel to try again.",
                "headingFontEmpty": "No fonts are ready yet. A font needs an uploaded file and must not be archived.",
                "headingFontEmptyLink": "Go to Theme fonts",
                "codeColor": "Code colour",
                "codeColorHex": "Code colour hex code",
                "codeColorInvalid": "Use a colour like #1F3A5A.",
                "codeContrastOk": "Contrast {ratio}:1 on white",
                "codeContrastLow": "Contrast {ratio}:1. Needs at least {min}:1 on white to scan, so pick a darker colour.",
                "codeContrastInvalid": "This colour is too light to scan on white. Pick a darker one.",
                "centerLogo": "Logo in the middle of the code",
                "eventTypes": "Event types",
                "eventTypesInvalid": "Pick at least one event type.",
                "artwork": "Artwork",
                "artworkHint": "PNG or WebP, A6 portrait (105 × 148), at least 1240 px wide, up to 5 MB.",
                "artworkChoose": "Choose file",
                "artworkPending": "Uploads when you save.",
                "artworkType": "Use a PNG or WebP image.",
                "artworkSize": "Use an image up to 5 MB.",
                "availability": "Availability",
                "offered": "Offered",
                "archived": "Archived",
                "offeredHint": "Hosts of the selected event types can pick it.",
                "archivedHint": "Hosts can no longer pick it.",
                "network": "Couldn't reach the server. Check your connection and try again.",
                "notFound": "This design no longer exists."
            },
            "preview": {
                "label": "Preview",
                "sampleTitle": "Event title",
                "sampleLine": "Scan to join",
                "cardLabel": "QR card: {title}"
            }
        },
```

`messages/el.json`, same place:

```json
        "qrCards": {
            "title": "Κάρτες QR",
            "subtitle": "Σχέδια καρτών για την εκτύπωση των κωδικών QR των διοργανωτών.",
            "create": "Νέο σχέδιο",
            "search": "Αναζήτηση με όνομα",
            "loading": "Φόρτωση σχεδίων…",
            "empty": "Δεν υπάρχουν σχέδια ακόμη.",
            "noMatches": "Κανένα σχέδιο δεν ταιριάζει.",
            "edit": "Επεξεργασία {name}",
            "filters": {
                "ALL": "Όλα",
                "LIVE": "Διαθέσιμα",
                "NO_ARTWORK": "Χωρίς εικόνα",
                "ARCHIVED": "Αρχειοθετημένα"
            },
            "status": {
                "LIVE": "Διαθέσιμο",
                "NO_ARTWORK": "Χωρίς εικόνα",
                "ARCHIVED": "Αρχειοθετημένο"
            },
            "columns": {
                "design": "Σχέδιο",
                "eventTypes": "Τύποι εκδήλωσης",
                "code": "Χρώμα κωδικού",
                "status": "Κατάσταση",
                "order": "Σειρά"
            },
            "drawer": {
                "createTitle": "Νέο σχέδιο",
                "close": "Κλείσιμο",
                "cancel": "Ακύρωση",
                "save": "Αποθήκευση",
                "nameEn": "Όνομα στα αγγλικά",
                "nameEl": "Όνομα στα ελληνικά",
                "nameInvalid": "Γράψτε 1 έως 60 χαρακτήρες.",
                "textColor": "Χρώμα κειμένου",
                "textColorHex": "Κωδικός hex χρώματος κειμένου",
                "textColorInvalid": "Χρησιμοποιήστε χρώμα όπως #5A3E2B.",
                "headingFont": "Γραμματοσειρά τίτλου",
                "headingFontDefault": "Γραμματοσειρά κάρτας (προεπιλογή)",
                "headingFontOption": "{familyName} ({key})",
                "headingFontArchived": "{familyName} ({key}), αρχειοθετημένη",
                "headingFontNoFile": "{familyName} ({key}), χωρίς αρχείο ακόμη",
                "headingFontLoading": "Φόρτωση γραμματοσειρών…",
                "headingFontLoadFailed": "Δεν ήταν δυνατή η φόρτωση των γραμματοσειρών. Η τρέχουσα επιλογή διατηρείται. Κλείστε και ανοίξτε ξανά αυτό το πλαίσιο για να δοκιμάσετε πάλι.",
                "headingFontEmpty": "Δεν υπάρχει ακόμη έτοιμη γραμματοσειρά. Μια γραμματοσειρά χρειάζεται ανεβασμένο αρχείο και δεν πρέπει να είναι αρχειοθετημένη.",
                "headingFontEmptyLink": "Μετάβαση στις Γραμματοσειρές",
                "codeColor": "Χρώμα κωδικού",
                "codeColorHex": "Κωδικός hex χρώματος κωδικού",
                "codeColorInvalid": "Χρησιμοποιήστε χρώμα όπως #1F3A5A.",
                "codeContrastOk": "Αντίθεση {ratio}:1 στο λευκό",
                "codeContrastLow": "Αντίθεση {ratio}:1. Χρειάζεται τουλάχιστον {min}:1 στο λευκό για να σκανάρεται, οπότε επιλέξτε πιο σκούρο χρώμα.",
                "codeContrastInvalid": "Αυτό το χρώμα είναι πολύ ανοιχτό για να σκανάρεται στο λευκό. Επιλέξτε πιο σκούρο.",
                "centerLogo": "Λογότυπο στη μέση του κωδικού",
                "eventTypes": "Τύποι εκδήλωσης",
                "eventTypesInvalid": "Επιλέξτε τουλάχιστον έναν τύπο εκδήλωσης.",
                "artwork": "Εικόνα",
                "artworkHint": "PNG ή WebP, κάθετο A6 (105 × 148), πλάτος τουλάχιστον 1240 px, έως 5 MB.",
                "artworkChoose": "Επιλογή αρχείου",
                "artworkPending": "Ανεβαίνει με την αποθήκευση.",
                "artworkType": "Χρησιμοποιήστε εικόνα PNG ή WebP.",
                "artworkSize": "Χρησιμοποιήστε εικόνα έως 5 MB.",
                "availability": "Διαθεσιμότητα",
                "offered": "Διαθέσιμο",
                "archived": "Αρχειοθετημένο",
                "offeredHint": "Οι διοργανωτές των επιλεγμένων τύπων μπορούν να το διαλέξουν.",
                "archivedHint": "Οι διοργανωτές δεν μπορούν πια να το διαλέξουν.",
                "network": "Δεν ήταν δυνατή η σύνδεση με τον διακομιστή. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.",
                "notFound": "Αυτό το σχέδιο δεν υπάρχει πια."
            },
            "preview": {
                "label": "Προεπισκόπηση",
                "sampleTitle": "Τίτλος εκδήλωσης",
                "sampleLine": "Σκάναρε για να συμμετάσχεις",
                "cardLabel": "Κάρτα QR: {title}"
            }
        },
```

- [ ] **Step 2: Write `components/admin/qrCards/QrCardTemplatePreview.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { ThemeFontFace } from '@/components/event/ThemeFontFace';
import { QrCardSvg } from '@/components/qrCard/QrCardSvg';
import type { QrCardStyle } from '@/lib/qrCard';

// Never resolves to an event: the code only has to scan the way a real one would.
const SAMPLE_URL = 'https://storywall.gr/q/preview';

// The card as a host would print it, drawn by the same QrCardSvg with a sample link and line.
export function QrCardTemplatePreview({ style, title }: { style: QrCardStyle; title: string }) {
    const t = useTranslations('AdminPage.qrCards.preview');

    return (
        <figure>
            {/* Caption */}
            <figcaption className="mb-2 text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('label')}</figcaption>
            {/* Card */}
            <div className="mx-auto w-full max-w-60 overflow-hidden rounded-lg border border-border">
                <QrCardSvg
                    style={style}
                    url={SAMPLE_URL}
                    title={title}
                    lines={[{ text: t('sampleLine'), tone: 'body' }]}
                    label={t('cardLabel', { title })}
                    className="block h-auto w-full"
                />
            </div>
            <ThemeFontFace font={style.headingFont} />
        </figure>
    );
}
```

- [ ] **Step 3: Write the failing drawer test**

`components/admin/qrCards/QrCardTemplateDrawer.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QrCardTemplateDrawer } from '@/components/admin/qrCards/QrCardTemplateDrawer';
import { ApiError } from '@/lib/api/client';
import type { AdminQrCardTemplateDto } from '@/lib/api/types';
import { PLAIN_QR_CARD_STYLE } from '@/lib/qrCard';

const drawerState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

// Renders "key" alone, or "key {json}" when the message takes values, so tests can see what was passed.
vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
    useLocale: () => 'en',
}));
vi.mock('@/components/admin/AdminDrawer', () => ({
    AdminDrawer: ({ title, children, footer }: { title: ReactNode; children: ReactNode; footer: ReactNode }) => (
        <div data-testid="drawer">
            <h2>{title}</h2>
            {children}
            {footer}
        </div>
    ),
}));
vi.mock('@/components/admin/qrCards/QrCardTemplatePreview', () => ({
    QrCardTemplatePreview: ({ title }: { title: string }) => <div data-testid="preview" data-title={title} />,
}));
vi.mock('@/hooks/useQrCardTemplateDrawer', () => ({ useQrCardTemplateDrawer: () => drawerState.current }));

const LINEN: AdminQrCardTemplateDto = {
    id: 't1',
    name: { en: 'Linen', el: 'Λινό' },
    eventTypes: ['WEDDING'],
    sortOrder: 0,
    archived: false,
    artworkUrl: '/api/qr-card-artwork/t1/1',
    textColor: '#5A3E2B',
    headingFont: null,
    codeColor: '#1F3A5A',
    centerLogo: false,
};

const EVENT_TYPES = [
    { eventTypeKey: 'WEDDING' as const, label: 'Wedding' },
    { eventTypeKey: 'BAPTISM' as const, label: 'Baptism' },
];

function state(overrides: Record<string, unknown> = {}) {
    drawerState.current = {
        isCreate: false,
        draft: {
            nameEn: 'Linen',
            nameEl: 'Λινό',
            eventTypes: ['WEDDING'],
            archived: false,
            textColor: '#5A3E2B',
            headingFontId: '',
            codeColor: '#1F3A5A',
            centerLogo: false,
        },
        errors: {},
        failure: null,
        fileError: null,
        hasPendingFile: false,
        textColorInputValue: '#5a3e2b',
        codeColorInputValue: '#1f3a5a',
        codeContrastRatio: 11.2,
        availability: 'AVAILABLE',
        previewStyle: PLAIN_QR_CARD_STYLE,
        previewTitle: 'Linen',
        fontOptions: [],
        hasUsableFonts: true,
        fontsStatus: 'ready',
        isSaving: false,
        handleFieldChange: vi.fn(),
        handleEventTypeChange: vi.fn(),
        handleCenterLogoChange: vi.fn(),
        handleAvailabilityChange: vi.fn(),
        handleFileChange: vi.fn(),
        handleSubmit: vi.fn((event: Event) => event.preventDefault()),
        ...overrides,
    };
    return drawerState.current;
}

function renderDrawer(template: AdminQrCardTemplateDto | null = LINEN) {
    render(<QrCardTemplateDrawer template={template} sortOrder={0} eventTypes={EVENT_TYPES} onCloseAction={vi.fn()} />);
}

afterEach(cleanup);

describe('QrCardTemplateDrawer', () => {
    it("shows the saved design's fields", () => {
        state();
        renderDrawer();
        expect(screen.getByRole('heading', { name: 'Linen' })).toBeInTheDocument();
        expect(screen.getByDisplayValue('Λινό')).toBeInTheDocument();
        expect(screen.getByLabelText('codeColorHex')).toHaveValue('#1F3A5A');
        expect(screen.getByRole('checkbox', { name: 'Wedding' })).toBeChecked();
        expect(screen.getByText('codeContrastOk {"ratio":"11.20"}')).toBeInTheDocument();
    });

    it('warns while the code colour is too light', () => {
        state({ codeContrastRatio: 3.2 });
        renderDrawer();
        expect(screen.getByText('codeContrastLow {"ratio":"3.20","min":"4.5"}')).toBeInTheDocument();
    });

    it('turns the logo on', () => {
        const form = state();
        renderDrawer();
        fireEvent.click(screen.getByRole('switch', { name: 'centerLogo' }));
        expect(form.handleCenterLogoChange).toHaveBeenCalledWith(true);
    });

    it("shows the server's detail for rejected artwork", () => {
        state({ failure: { kind: 'other', error: new ApiError(400, { errorCode: 3111, detail: 'The artwork must be A6 portrait.' }) } });
        renderDrawer();
        expect(screen.getByRole('alert')).toHaveTextContent('The artwork must be A6 portrait.');
    });

    it('asks for availability only on a saved design', () => {
        state({ isCreate: true });
        renderDrawer(null);
        expect(screen.getByRole('heading', { name: 'createTitle' })).toBeInTheDocument();
        expect(screen.queryByText('availability')).toBeNull();
    });
});
```

- [ ] **Step 4: Run it to see it fail**

Run: `npx vitest run components/admin/qrCards/QrCardTemplateDrawer.test.tsx`
Expected: FAIL, "Failed to resolve import "@/components/admin/qrCards/QrCardTemplateDrawer"".

- [ ] **Step 5: Write `components/admin/qrCards/QrCardTemplateDrawer.tsx`**

```tsx
'use client';

import { ImagePlus, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminSwitch } from '@/components/admin/AdminSwitch';
import { QrCardTemplatePreview } from '@/components/admin/qrCards/QrCardTemplatePreview';
import { ReactionTypeAvailabilityControl } from '@/components/admin/ReactionTypeAvailabilityControl';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { useQrCardTemplateDrawer } from '@/hooks/useQrCardTemplateDrawer';
import { isQrCardDetailError, MIN_CODE_CONTRAST, QR_CARD_NAME_MAX } from '@/lib/adminQrCards';
import { formatContrastRatio, THEME_ILLUSTRATION_ACCEPT, type ThemeFontOption } from '@/lib/adminThemePresets';
import { ApiError } from '@/lib/api/client';
import type { AdminQrCardTemplateDto, EventTypeConvention } from '@/lib/api/types';

const FORM_ID = 'qr-card-template-form';
const FONT_OPTION_LABEL_KEYS = { live: 'headingFontOption', archived: 'headingFontArchived', noFile: 'headingFontNoFile' } as const;
const SWATCH_CLASS = 'h-10 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-white p-1';
const GROUP_LABEL_CLASS = 'text-[11px] font-bold tracking-wide text-ink-muted uppercase';

export function QrCardTemplateDrawer({
    template,
    sortOrder,
    eventTypes,
    onCloseAction,
}: {
    template: AdminQrCardTemplateDto | null;
    sortOrder: number;
    eventTypes: Array<{ eventTypeKey: EventTypeConvention; label: string }>;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage.qrCards.drawer');
    const tPreview = useTranslations('AdminPage.qrCards.preview');
    const tApi = useTranslations('ApiErrors');
    const localizedText = useLocalizedText();
    const locale = useLocale();
    const apiErrorMessage = useApiErrorMessage();
    const form = useQrCardTemplateDrawer({ template, sortOrder, onDoneAction: onCloseAction });
    const formatMinimum = (value: number) => new Intl.NumberFormat(locale).format(value);
    // Floored like the server's ratio, so a colour just under the minimum never reads as passing. Once a
    // save is blocked, the alert below replaces the live hint.
    const codeHint = form.errors.codeColor
        ? t('codeColorInvalid')
        : form.codeContrastRatio === null || form.errors.codeContrast
          ? undefined
          : form.codeContrastRatio < MIN_CODE_CONTRAST
            ? t('codeContrastLow', { ratio: formatContrastRatio(form.codeContrastRatio, locale), min: formatMinimum(MIN_CODE_CONTRAST) })
            : t('codeContrastOk', { ratio: formatContrastRatio(form.codeContrastRatio, locale) });
    const fontHint = form.fontsStatus === 'loading' ? t('headingFontLoading') : form.fontsStatus === 'error' ? t('headingFontLoadFailed') : undefined;
    const fontLabel = (option: ThemeFontOption) => t(FONT_OPTION_LABEL_KEYS[option.status], { familyName: option.familyName, key: option.key });
    // A non-ApiError is fetch failing before any response. Contrast, artwork size and name rejections
    // highlight no field: their localized detail says what's wrong instead.
    const describeServerError = (error: unknown) => {
        if (!(error instanceof ApiError)) return t('network');
        if (isQrCardDetailError(error)) return error.problem?.detail?.trim() || tApi('generic');
        return apiErrorMessage(error);
    };
    const serverError = form.failure?.kind === 'other' ? describeServerError(form.failure.error) : null;
    const fileHint = form.fileError === 'type' ? t('artworkType') : form.fileError === 'size' ? t('artworkSize') : undefined;

    const footer = (
        <div className="flex w-full items-center justify-end gap-2">
            {/* Save */}
            <button
                type="button"
                onClick={onCloseAction}
                disabled={form.isSaving}
                className="h-9 rounded-md px-3 text-sm font-semibold text-ink-muted hover:text-ink disabled:opacity-50"
            >
                {t('cancel')}
            </button>
            <button
                type="submit"
                form={FORM_ID}
                disabled={form.isSaving || form.failure?.kind === 'notFound'}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white disabled:opacity-50"
            >
                {form.isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('save')}
            </button>
        </div>
    );

    return (
        // closeDisabled blocks ×, Esc and the overlay while saving; the hook's mounted guard covers Back.
        <AdminDrawer
            open
            size="wide"
            onClose={onCloseAction}
            closeDisabled={form.isSaving}
            title={template ? localizedText(template.name) : t('createTitle')}
            closeLabel={t('close')}
            footer={footer}
        >
            <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,15rem)]">
                <form id={FORM_ID} onSubmit={form.handleSubmit} className="space-y-4" noValidate>
                    {/* Error */}
                    {form.failure?.kind === 'notFound' && (
                        <p role="alert" className="text-sm text-status-danger">
                            {t('notFound')}
                        </p>
                    )}
                    {serverError !== null && (
                        <p role="alert" className="text-sm text-status-danger">
                            {serverError}
                        </p>
                    )}

                    {/* Names */}
                    <AdminField label={t('nameEn')} required hint={form.errors.nameEn ? t('nameInvalid') : undefined}>
                        <input
                            name="nameEn"
                            value={form.draft.nameEn}
                            onChange={form.handleFieldChange}
                            maxLength={QR_CARD_NAME_MAX}
                            aria-invalid={Boolean(form.errors.nameEn)}
                            className={adminInputClass()}
                        />
                    </AdminField>
                    <AdminField label={t('nameEl')} required hint={form.errors.nameEl ? t('nameInvalid') : undefined}>
                        <input
                            name="nameEl"
                            value={form.draft.nameEl}
                            onChange={form.handleFieldChange}
                            maxLength={QR_CARD_NAME_MAX}
                            aria-invalid={Boolean(form.errors.nameEl)}
                            className={adminInputClass()}
                        />
                    </AdminField>

                    {/* Text */}
                    <AdminField label={t('textColor')} required hint={form.errors.textColor ? t('textColorInvalid') : undefined}>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                name="textColor"
                                value={form.textColorInputValue}
                                onChange={form.handleFieldChange}
                                aria-label={t('textColor')}
                                className={SWATCH_CLASS}
                            />
                            <input
                                name="textColor"
                                value={form.draft.textColor}
                                onChange={form.handleFieldChange}
                                maxLength={7}
                                aria-label={t('textColorHex')}
                                aria-invalid={Boolean(form.errors.textColor)}
                                className={adminInputClass('font-mono uppercase')}
                            />
                        </div>
                    </AdminField>
                    <div className="space-y-1">
                        <AdminField label={t('headingFont')} hint={fontHint}>
                            <select name="headingFontId" value={form.draft.headingFontId} onChange={form.handleFieldChange} className={adminInputClass()}>
                                <option value="">{t('headingFontDefault')}</option>
                                {form.fontOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {fontLabel(option)}
                                    </option>
                                ))}
                            </select>
                        </AdminField>
                        {form.fontsStatus === 'ready' && !form.hasUsableFonts && (
                            <p className="text-[11px] leading-4 text-ink-faint">
                                {t('headingFontEmpty')}{' '}
                                <a href="#theme-fonts" className="font-semibold text-primary underline-offset-2 hover:underline">
                                    {t('headingFontEmptyLink')}
                                </a>
                            </p>
                        )}
                    </div>

                    {/* Code */}
                    <AdminField label={t('codeColor')} required hint={codeHint}>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                name="codeColor"
                                value={form.codeColorInputValue}
                                onChange={form.handleFieldChange}
                                aria-label={t('codeColor')}
                                className={SWATCH_CLASS}
                            />
                            <input
                                name="codeColor"
                                value={form.draft.codeColor}
                                onChange={form.handleFieldChange}
                                maxLength={7}
                                aria-label={t('codeColorHex')}
                                aria-invalid={Boolean(form.errors.codeColor || form.errors.codeContrast)}
                                className={adminInputClass('font-mono uppercase')}
                            />
                        </div>
                        {form.errors.codeContrast && (
                            <span role="alert" className="text-[11px] leading-4 font-semibold text-status-danger">
                                {t('codeContrastInvalid')}
                            </span>
                        )}
                    </AdminField>
                    <AdminSwitch label={t('centerLogo')} checked={form.draft.centerLogo} onCheckedChangeAction={form.handleCenterLogoChange} />

                    {/* Event types */}
                    <fieldset>
                        <legend className={GROUP_LABEL_CLASS}>{t('eventTypes')}</legend>
                        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                            {eventTypes.map((eventType) => (
                                <label
                                    key={eventType.eventTypeKey}
                                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink hover:bg-canvas"
                                >
                                    <input
                                        type="checkbox"
                                        value={eventType.eventTypeKey}
                                        checked={form.draft.eventTypes.includes(eventType.eventTypeKey)}
                                        onChange={form.handleEventTypeChange}
                                        className="h-4 w-4 accent-primary"
                                    />
                                    {eventType.label}
                                </label>
                            ))}
                        </div>
                        {form.errors.eventTypes && <p className="mt-1 text-[11px] text-status-danger">{t('eventTypesInvalid')}</p>}
                    </fieldset>

                    {/* Artwork */}
                    <AdminField label={t('artwork')} hint={fileHint ?? (form.hasPendingFile ? t('artworkPending') : t('artworkHint'))}>
                        <label className="inline-flex min-h-10 w-fit cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-ink hover:bg-canvas">
                            <ImagePlus className="h-4 w-4" aria-hidden="true" />
                            {t('artworkChoose')}
                            <input type="file" accept={THEME_ILLUSTRATION_ACCEPT} onChange={form.handleFileChange} className="sr-only" />
                        </label>
                    </AdminField>

                    {/* Availability */}
                    {!form.isCreate && (
                        <ReactionTypeAvailabilityControl
                            title={t('availability')}
                            value={form.availability}
                            onChangeAction={form.handleAvailabilityChange}
                            labels={{ AVAILABLE: t('offered'), ARCHIVED: t('archived') }}
                            hints={{ AVAILABLE: t('offeredHint'), ARCHIVED: t('archivedHint') }}
                        />
                    )}
                </form>

                {/* Preview */}
                <QrCardTemplatePreview style={form.previewStyle} title={form.previewTitle || tPreview('sampleTitle')} />
            </div>
        </AdminDrawer>
    );
}
```

If `AdminSwitch`'s bottom border looks out of place on its own here, wrap it in `<div className="-mx-3">` so its padding lines up with the fields; check it in Task 19.

- [ ] **Step 6: Run the drawer test to see it pass**

Run: `npx vitest run components/admin/qrCards/QrCardTemplateDrawer.test.tsx`
Expected: PASS (5 tests). If `getByLabelText('codeColorHex')` finds two elements, `AdminField` also labels its child with the field label: query `screen.getByRole('textbox', { name: 'codeColorHex' })` instead.

- [ ] **Step 7: Write `components/admin/qrCards/QrCardTemplateRow.tsx`**

```tsx
'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminOrderArrows } from '@/components/admin/AdminOrderArrows';
import { AdminSortableRow } from '@/components/admin/AdminSortableRow';
import { ProtectedImage } from '@/components/common/ProtectedImage';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { qrCardTemplateStatus } from '@/lib/adminQrCards';
import type { AdminQrCardTemplateDto } from '@/lib/api/types';
import { isHexColor } from '@/lib/eventTheme';
import type { MoveDirection } from '@/lib/sortOrder';
import { cn } from '@/lib/utils';

const STATUS_PILL = {
    LIVE: 'bg-status-good-wash text-status-good',
    NO_ARTWORK: 'bg-status-warn-wash text-status-warn',
    ARCHIVED: 'bg-status-neutral-wash text-status-neutral',
} as const;

export function QrCardTemplateRow({
    template,
    eventTypeLabels,
    isFirst,
    isLast,
    canReorder,
    onMoveAction,
    onEditAction,
}: {
    template: AdminQrCardTemplateDto;
    eventTypeLabels: Record<string, string>;
    isFirst: boolean;
    isLast: boolean;
    canReorder: boolean;
    onMoveAction: (templateId: string, direction: MoveDirection) => void;
    onEditAction: (templateId: string) => void;
}) {
    const t = useTranslations('AdminPage.qrCards');
    const tAlt = useTranslations('ImageAlt');
    const localizedText = useLocalizedText();
    const name = localizedText(template.name);
    const status = qrCardTemplateStatus(template);

    function handleEdit() {
        onEditAction(template.id);
    }

    return (
        <AdminSortableRow id={template.id} name={name} className="border-b border-border/70 last:border-b-0">
            {/* Design */}
            <td className="px-3 py-2.5">
                <div className="flex items-center gap-3">
                    <span className="relative h-12 w-8.5 shrink-0 overflow-hidden rounded-sm border border-border bg-white">
                        {template.artworkUrl && (
                            <ProtectedImage
                                src={template.artworkUrl}
                                alt={tAlt('qrCardTemplate', { name })}
                                fill
                                className="object-cover"
                                sizes="34px"
                            />
                        )}
                    </span>
                    <p className="min-w-0 truncate text-sm font-semibold text-ink">{name}</p>
                </div>
            </td>
            {/* Event types */}
            <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1">
                    {template.eventTypes.map((eventType) => (
                        <span key={eventType} className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-bold text-ink-muted">
                            {eventTypeLabels[eventType] ?? eventType}
                        </span>
                    ))}
                </div>
            </td>
            {/* Code */}
            <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                    <span
                        className="h-4 w-4 shrink-0 rounded-sm border border-border"
                        style={isHexColor(template.codeColor) ? { backgroundColor: template.codeColor } : undefined}
                        aria-hidden="true"
                    />
                    <span className="font-mono text-[11px] text-ink-muted">{template.codeColor}</span>
                </div>
            </td>
            {/* Status */}
            <td className="px-3 py-2.5">
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap', STATUS_PILL[status])}>
                    {t(`status.${status}`)}
                </span>
            </td>
            {/* Order */}
            <td className="px-3 py-2.5">
                <AdminOrderArrows id={template.id} name={name} isFirst={isFirst} isLast={isLast} disabled={!canReorder} onMoveAction={onMoveAction} />
            </td>
            {/* Edit */}
            <td className="px-3 py-2.5 text-right">
                <button
                    type="button"
                    onClick={handleEdit}
                    aria-label={t('edit', { name })}
                    className="rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-ink"
                >
                    <Pencil className="h-4 w-4" />
                </button>
            </td>
        </AdminSortableRow>
    );
}
```

- [ ] **Step 8: Write `components/admin/qrCards/QrCardTemplatesTable.tsx`**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { AdminSortableList } from '@/components/admin/AdminSortableList';
import { QrCardTemplateRow } from '@/components/admin/qrCards/QrCardTemplateRow';
import type { AdminQrCardTemplateDto } from '@/lib/api/types';
import type { MoveDirection } from '@/lib/sortOrder';

const templateIdOf = (template: AdminQrCardTemplateDto) => template.id;

export function QrCardTemplatesTable({
    templates,
    hasAnyTemplates,
    eventTypeLabels,
    canReorder,
    onMoveAction,
    onReorderAction,
    onEditAction,
}: {
    templates: AdminQrCardTemplateDto[];
    hasAnyTemplates: boolean;
    eventTypeLabels: Record<string, string>;
    canReorder: boolean;
    onMoveAction: (templateId: string, direction: MoveDirection) => void;
    onReorderAction: (activeId: string, overId: string) => void;
    onEditAction: (templateId: string) => void;
}) {
    const t = useTranslations('AdminPage.qrCards');

    if (templates.length === 0) {
        return <p className="px-3 py-8 text-center text-sm text-ink-muted">{hasAnyTemplates ? t('noMatches') : t('empty')}</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-left">
                <thead>
                    <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-3 py-2">{t('columns.design')}</th>
                        <th className="px-3 py-2">{t('columns.eventTypes')}</th>
                        <th className="px-3 py-2">{t('columns.code')}</th>
                        <th className="px-3 py-2">{t('columns.status')}</th>
                        <th className="px-3 py-2">{t('columns.order')}</th>
                        <th className="px-3 py-2" />
                    </tr>
                </thead>
                <tbody>
                    <AdminSortableList ids={templates.map(templateIdOf)} disabled={!canReorder} onReorderAction={onReorderAction}>
                        {templates.map((template, index) => (
                            <QrCardTemplateRow
                                key={template.id}
                                template={template}
                                eventTypeLabels={eventTypeLabels}
                                isFirst={index === 0}
                                isLast={index === templates.length - 1}
                                canReorder={canReorder}
                                onMoveAction={onMoveAction}
                                onEditAction={onEditAction}
                            />
                        ))}
                    </AdminSortableList>
                </tbody>
            </table>
        </div>
    );
}
```

- [ ] **Step 9: Write `components/admin/qrCards/QrCardTemplatesPanel.tsx`**

```tsx
'use client';

import { Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { adminInputClass } from '@/components/admin/AdminField';
import { QrCardTemplateDrawer } from '@/components/admin/qrCards/QrCardTemplateDrawer';
import { QrCardTemplatesTable } from '@/components/admin/qrCards/QrCardTemplatesTable';
import { LoadingState } from '@/components/ui/LoadingState';
import { useQrCardTemplatesCatalog } from '@/hooks/useQrCardTemplatesCatalog';
import { QR_CARD_STATUS_FILTERS, type QrCardStatusFilter } from '@/lib/adminQrCards';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import { cn } from '@/lib/utils';

export function QrCardTemplatesPanel() {
    const t = useTranslations('AdminPage.qrCards');
    const tAdmin = useTranslations('AdminPage');
    const catalog = useQrCardTemplatesCatalog();

    function handleStatusClick(event: MouseEvent<HTMLButtonElement>) {
        catalog.setStatus(event.currentTarget.dataset.status as QrCardStatusFilter);
    }

    return (
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-16 text-[15px] sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
            {/* Header */}
            <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-bold tracking-[0.14em] text-primary-dark uppercase">{tAdmin('eyebrow')}</p>
                    <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('title')}</h1>
                    <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-muted">{t('subtitle')}</p>
                </div>
                <button
                    type="button"
                    onClick={catalog.openCreate}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
                >
                    <Plus className="h-4 w-4" />
                    {t('create')}
                </button>
            </header>

            {/* Designs */}
            <section className="rounded-xl border border-border bg-card">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
                    <div className="relative min-w-0 flex-1 sm:max-w-64">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                        <input
                            value={catalog.search}
                            onChange={catalog.handleSearchChange}
                            placeholder={t('search')}
                            aria-label={t('search')}
                            className={adminInputClass('w-full pl-8')}
                        />
                    </div>
                    <div className="flex flex-wrap gap-1 rounded-lg bg-canvas p-1">
                        {QR_CARD_STATUS_FILTERS.map((status) => (
                            <button
                                key={status}
                                type="button"
                                data-status={status}
                                onClick={handleStatusClick}
                                aria-pressed={catalog.status === status}
                                className={cn(
                                    'rounded-md px-2.5 py-1.5 text-[12.5px] font-bold transition-colors',
                                    catalog.status === status ? 'bg-card text-ink shadow-sm' : 'text-ink-faint hover:text-ink-muted',
                                )}
                            >
                                {t(`filters.${status}`)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                {catalog.isLoading && <LoadingState label={t('loading')} className="justify-start p-4" />}
                {catalog.error && <p className="p-4 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(catalog.error)}`)}</p>}
                {catalog.moveError && (
                    <p className="px-3 pt-3 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(catalog.moveError)}`)}</p>
                )}
                {!catalog.isLoading && !catalog.error && (
                    <QrCardTemplatesTable
                        templates={catalog.visibleTemplates}
                        hasAnyTemplates={catalog.templates.length > 0}
                        eventTypeLabels={catalog.eventTypeLabels}
                        canReorder={catalog.canReorder}
                        onMoveAction={catalog.moveTemplate}
                        onReorderAction={catalog.reorderTemplate}
                        onEditAction={catalog.openEdit}
                    />
                )}
            </section>

            {/* Drawer */}
            {catalog.drawer.open && (
                <QrCardTemplateDrawer
                    key={catalog.drawer.template?.id ?? 'new'}
                    template={catalog.drawer.template}
                    sortOrder={catalog.createSortOrder}
                    eventTypes={catalog.eventTypes}
                    onCloseAction={catalog.closeDrawer}
                />
            )}
        </div>
    );
}
```

- [ ] **Step 10: Type-check, lint and run the admin tests**

```bash
npm run type:check
npx eslint components/admin/qrCards hooks/useQrCardTemplatesCatalog.ts hooks/useQrCardTemplateDrawer.ts hooks/useAdminQrCardTemplates.ts lib/adminQrCards.ts
npx vitest run components/admin/qrCards messages
```

Expected: no errors; the tests pass.

- [ ] **Step 11: Commit**

```bash
git add components/admin/qrCards messages/en.json messages/el.json
git commit -m "feat(qr-cards): add the admin panel for card designs"
```

---

### Task 17: Admin navigation

**Files:**
- Modify: `components/admin/AdminNavigationContext.tsx`, `components/admin/AdminShellNav.tsx`, `components/admin/AdminConsole.tsx`, `messages/en.json`, `messages/el.json`
- Test: `components/admin/AdminNavigationContext.qrCards.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { AdminNavigationProvider, useAdminNavigation } from '@/components/admin/AdminNavigationContext';
import messages from '@/messages/en.json';

function CurrentTab() {
    const { tab, tabs, activeHash } = useAdminNavigation();
    const keys = tabs.map((item) => item.key);
    return (
        <p>
            {tab}:{tabs.find((item) => item.key === tab)?.label}:{activeHash}:
            {keys.indexOf('themeFonts') + 1 === keys.indexOf('qrCards') ? 'afterThemeFonts' : 'elsewhere'}
        </p>
    );
}

afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
});

describe('QR cards tab', () => {
    it('opens from #qr-cards and sits right after Theme fonts', () => {
        window.history.replaceState(null, '', '/admin#qr-cards');
        render(
            <NextIntlClientProvider locale="en" messages={messages}>
                <AdminNavigationProvider>
                    <CurrentTab />
                </AdminNavigationProvider>
            </NextIntlClientProvider>,
        );

        expect(screen.getByText('qrCards:QR cards:#qr-cards:afterThemeFonts')).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/admin/AdminNavigationContext.qrCards.test.tsx`
Expected: FAIL. `#qr-cards` falls back to the default tab.

- [ ] **Step 3: Wire the tab**

`components/admin/AdminNavigationContext.tsx`:

1. Add `QrCode,` to the `lucide-react` import, between `PartyPopper,` and `Receipt,`.
2. In the `AdminTab` union, after `| 'themeFonts'` add `| 'qrCards'`.
3. In `HASH_TO_TAB`, after `'#theme-fonts': 'themeFonts',` add `'#qr-cards': 'qrCards',`.
4. In `TAB_TO_HASH`, after `themeFonts: '#theme-fonts',` add `qrCards: '#qr-cards',`.
5. In the tab list, after `{ key: 'themeFonts', label: t('themeFonts'), icon: Type },` add `{ key: 'qrCards', label: t('qrCards'), icon: QrCode },`.

`components/admin/AdminShellNav.tsx`, in `TAB_GROUP` after `themeFonts: 'catalog',`:

```ts
    qrCards: 'catalog',
```

`components/admin/AdminConsole.tsx`: add `import { QrCardTemplatesPanel } from '@/components/admin/qrCards/QrCardTemplatesPanel';` between the `PlatformMetricsPanel` and `ReactionTypesCatalogPanel` imports, and after `if (tab === 'themeFonts') return <ThemeFontsPanel />;`:

```tsx
    if (tab === 'qrCards') return <QrCardTemplatesPanel />;
```

`messages/en.json`, in `AdminPage.tabs` after `"themeFonts": "Theme fonts",`:

```json
            "qrCards": "QR cards",
```

`messages/el.json`, same place after `"themeFonts": "Γραμματοσειρές",`:

```json
            "qrCards": "Κάρτες QR",
```

- [ ] **Step 4: Run the nav tests and type-check**

```bash
npx vitest run components/admin/AdminNavigationContext
npm run type:check
```

Expected: PASS. If type-check flags another `Record<AdminTab, …>`, add `qrCards` with the same value as its `themeFonts` entry.

- [ ] **Step 5: Commit**

```bash
git add components/admin/AdminNavigationContext.tsx components/admin/AdminNavigationContext.qrCards.test.tsx components/admin/AdminShellNav.tsx components/admin/AdminConsole.tsx messages/en.json messages/el.json
git commit -m "feat(qr-cards): add QR cards to the admin console"
```

---

### Task 18: Full checks and SEO

**Files:** none new. Fix whatever these turn up in the files that caused it.

- [ ] **Step 1: Run every check**

```bash
npm run type:check
npm run lint
npm test
npm run format:check
```

Expected: all four pass. Fix every lint error before going on (CLAUDE.md). If `format:check` lists files from this branch, run `npx prettier --write <those files>` and re-run it. Do not format files this branch didn't touch.

- [ ] **Step 2: Look for leftovers**

```bash
git grep -n "alt=\"\"" -- components/qrCard components/admin/qrCards components/giftMode
git grep -n "next/link" -- components/qrCard components/admin/qrCards components/giftMode components/manage/invitations
git grep -n "TODO\|FIXME" -- components/qrCard components/admin/qrCards hooks/useQrCard* hooks/useAdminQrCardTemplates.ts lib/qrCard* lib/adminQrCards.ts
```

Expected: no output.

- [ ] **Step 3: Check the SEO guidelines**

Read [docs/seo-guidelines.md](../../seo-guidelines.md) and check the two new paths against it:

- `/events/{eventId}/manage/qr/{qrLinkId}/card` sits under `/events/`, which `PRIVATE_PATHS` in `app/robots.ts` already blocks.
- `/api/qr-card-artwork/{templateId}/{version}` sits under `/api/`, also in `PRIVATE_PATHS`.
- Neither is in the sitemap. No landing, occasion or marketing copy changed (`git diff origin/staging --stat -- messages` shows only `QrCardPage`, `Modules.qr_cards`, `ImageAlt.qrCardTemplate` and `AdminPage` keys).

Expected: no blockers. If one shows up, list it as a **BLOCKER** in the PR description (Task 20) and ask the user before going on.

- [ ] **Step 4: Commit any fixes**

```bash
git status --short
git add <the files you fixed>
git commit -m "chore(qr-cards): fix lint and formatting"
```

Skip the commit if there was nothing to fix.

---

### Task 19: Check it in the browser

Tests can't show print sizing, the exported files, the fonts in them or a real scan. This task does. Read the memory notes on the dev server, the local backend and signed-in checks before starting.

**Files:** possibly `lib/security/securityHeaders.mjs` and `lib/security/securityHeaders.test.ts` (Step 6), possibly `components/qrCard/QrCardTemplateStrip.tsx` and `components/admin/qrCards/QrCardTemplateRow.tsx` (Step 4).

- [ ] **Step 1: Run the backend and the app**

1. Run the backend branch from the backend plan locally on `:8080`. It must include the `qr_cards` module, the endpoints and migration. Load its `.env` yourself: `bootRun` doesn't.
2. Check `:3000` is free. If something is already listening there, ask the user before stopping it: it may be another session's server.
3. Start this worktree's app on `:3000` (the local backend only allows that origin):

```bash
npx next dev --webpack -p 3000
```

Run it in the background. Then open the browser pane with `preview_start` and `url: "http://localhost:3000/"` only. Never use a launch configuration name: that breaks the shared `.next` cache.

4. Ask the user for the local test login (the pane starts signed out) and sign in with it.

- [ ] **Step 2: Make test artwork**

From the repo root, write a valid card (1240 × 1748) and one with the wrong shape (1000 × 1000) into the scratchpad:

```bash
node -e "const {Resvg}=require('@resvg/resvg-js');const fs=require('fs');const card=(w,h)=>'<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"'+w+'\" height=\"'+h+'\"><rect width=\"'+w+'\" height=\"'+h+'\" fill=\"#F3E9DC\"/><rect x=\"60\" y=\"60\" width=\"'+(w-120)+'\" height=\"'+(h-120)+'\" fill=\"none\" stroke=\"#5A3E2B\" stroke-width=\"10\"/></svg>';const png=(svg)=>new Resvg(svg,{font:{loadSystemFonts:false}}).render().asPng();fs.writeFileSync(process.argv[1],png(card(1240,1748)));fs.writeFileSync(process.argv[2],png(card(1000,1000)))" "<scratchpad>/linen.png" "<scratchpad>/square.png"
```

Replace `<scratchpad>` with the session's scratchpad directory.

- [ ] **Step 3: Check the admin panel (desktop first)**

At desktop width, signed in as the platform admin:

1. Turn on `qr_cards` for the local test event: add the module to that event's plan in the admin Plans tab, or follow the backend guide if it names another way.
2. Open **QR cards** (`/admin#qr-cards`). It sits after Theme fonts in the Catalog group.
3. Create a design: both names, the test event's type, text `#5A3E2B`, code `#777777`. The contrast hint warns and Save is refused with the inline alert. Change the code colour to `#1F3A5A` and turn the logo off. The preview follows each change.
4. Upload `square.png` and save. The drawer shows the server's 3111 detail. Upload `linen.png` and save. The row shows the thumbnail and "Offered".
5. Make a second design and reorder with the arrows. Archive one; its pill reads "Archived" and the "Archived" filter finds it.
6. Check a phone width for obvious overlap only (the console is desktop-first).

- [ ] **Step 4: Check the card page (phone first)**

At phone width (`resize_window` preset `mobile`), as the event's host:

1. Share links page: open a link's preview and press Print. It goes to the card page. Back returns to the share links page.
2. The card shows Plain first and selected, the event title and "Scan to join". Pick the design. Its artwork and colours show, and the code has no logo; the title fits on two lines at most.
3. If a strip or row thumbnail doesn't load and the console names the image optimizer, add `unoptimized` to that `ProtectedImage` and re-check.
4. Edit the title and the line; the card follows. Clear the title: the card draws without one, and Save PNG still works.
5. Gallery QR page (`tools/gallery/qr`): Print goes to the card page with "Scan to add your photos". Back returns to the gallery QR page.
6. Desktop width: the page stays one centred column with nothing stretched.

- [ ] **Step 5: Check the saved files**

On the card page with the design picked, capture the saved files instead of downloading them. Run this in the page with `javascript_tool`:

```js
window.__saved = [];
const createObjectURL = URL.createObjectURL.bind(URL);
URL.createObjectURL = (blob) => {
    window.__saved.push(blob);
    return createObjectURL(blob);
};
HTMLAnchorElement.prototype.click = function () {
    window.__savedName = this.download;
};
```

Press **Save PNG**, then run:

```js
const blob = window.__saved.at(-1);
const bitmap = await createImageBitmap(blob);
({ type: blob.type, width: bitmap.width, height: bitmap.height, name: window.__savedName });
```

Expected: `image/png`, 1240 × 1748, and a file name from the title ending in `.png`. Show it on the page and take a screenshot:

```js
const img = new Image();
img.alt = 'Saved card';
img.src = URL.createObjectURL(window.__saved.at(-1));
img.style.cssText = 'position:fixed;inset:0;height:100vh;z-index:9999;background:#fff';
document.body.append(img);
```

The screenshot must match the on-screen card: artwork, colours, the code and the title in the template's font (pick a design with a heading font for this). Reload the page to remove the overlay.

Press **Save PDF** (after re-running the capture snippet), then:

```js
const pdf = window.__saved.at(-1);
const text = await pdf.text();
({ type: pdf.type, header: text.slice(0, 5), mediaBox: text.match(/MediaBox\s*\[([^\]]+)\]/)?.[1].trim(), name: window.__savedName });
```

Expected: `application/pdf`, `%PDF-`, a media box of about `0 0 297.6 419.5`, and a `.pdf` name.

- [ ] **Step 6: Check the console for CSP**

Read the console (`read_console_messages`, pattern `Content Security Policy`). If a `font-src` violation appeared while saving, the inlined font was blocked. Then:

1. In `lib/security/securityHeaders.mjs`, change the `font-src` line to:

```js
        'font-src': ["'self'", 'data:', isPreview && 'https://vercel.live', isPreview && 'https://assets.vercel.com'],
```

2. In `lib/security/securityHeaders.test.ts`, change the expectation to:

```ts
        expect(csp.get('font-src')).toEqual(["'self'", 'data:']);
```

3. Run `npx vitest run lib/security`, restart the dev server, and repeat Step 5's PNG check.
4. Commit: `git add lib/security && git commit -m "fix(qr-cards): let the saved card inline its font"`.

No violation: change nothing.

- [ ] **Step 7: Check print**

The pane can't show the print dialog. Ask the user to open the card page in their own Chrome, press **Print** and confirm the preview shows one page, A6 (105 × 148 mm), with the card edge to edge and nothing else on it. If they see two pages or white margins, compare the page's padding with the print rules in `QrCardPrintStyle` before changing anything.

- [ ] **Step 8: Check the gift card**

1. Issue a gift card for the test event (Manage → Gift) and open its print page.
2. The designer shows with the PIN checkbox under the text fields. The card stacks the scan line, the PIN, the email (when set) and the giver. Unticking the PIN removes its line from the card.
3. Edit the recipient (the title) and the giver.
4. Reload the page. In `read_network_requests`, look for client requests to `/gift` and `/qr-card-templates`. The server seeds both, so neither should appear. If `/qr-card-templates` doesn't but `/gift` does, the gift seed is being dropped (its `giftKeys` comes from `hooks/useGift.ts`, a `'use client'` file). Don't fix it here: note it for the PR description.
5. An event without `qr_cards` shows today's plain gift card, unchanged.

- [ ] **Step 9: Check the demo**

Open the demo and a share link's Print: it still opens today's popup, and the demo gift card is unchanged. No request to `/qr-card-templates` fails in the console.

- [ ] **Step 10: Check Safari**

Run the PNG and PDF checks from Step 5 in Playwright WebKit (the memory notes have the harness: scratchpad, `next dev --webpack -p 3101`, a CORS shim to `:8080`). If saving fails with a `SecurityError` (a tainted canvas), stop and ask the user. The fallback (drawing the card straight onto the canvas) isn't in this plan.

- [ ] **Step 11: Scan for real**

Ask the user to scan, with a phone camera, the saved PNG on screen or printed: Plain, and the design with the logo off and the `#1F3A5A` code. Both must open the share link.

- [ ] **Step 12: Reset the viewport**

`resize_window` with preset `desktop`, so the pane goes back to its own size.

---

### Task 20: Pull request

**Files:** none.

- [ ] **Step 1: Bring the branch up to date and re-run the checks**

```bash
git fetch origin
git rebase origin/staging
npm run type:check
npm run lint
npm test
```

Expected: a clean rebase and passing checks. If the rebase conflicts, resolve it, then re-run the checks.

- [ ] **Step 2: Push**

```bash
git push -u origin claude/qr-code-templates-962814
```

- [ ] **Step 3: Open the pull request into `staging`**

```bash
gh pr create --base staging --title "feat(qr-cards): printable QR card designs" --body-file <scratchpad>/pr-body.md
```

Write `<scratchpad>/pr-body.md` first. It covers:

- **What:** hosts with the `qr_cards` module print share link, gallery and gift QR codes as designed A6 cards (Print, PNG, PDF); admins manage the designs under Admin → QR cards.
- **Depends on:** the backend PR (link it). Merge that first.
- **How it works:** one SVG for the screen, print and both files; the design list answers `{ available, templates }`; Plain stays the default.
- **Checks:** the commands from Task 18 and what Task 19 covered, including the user's phone scan and print preview.
- **SEO:** "No blockers", or each blocker from Task 18 Step 3.
- **Follow-ups:** the gift prefetch note from Task 19 Step 8, if it applied.
- End the body with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

- [ ] **Step 4: Bind the PR in the app**

Call `get_status`; if it doesn't show the new PR, bind it with `bind_pr`. Then read its CI and offer Auto-fix. Don't enable auto-merge unless the user asks.
