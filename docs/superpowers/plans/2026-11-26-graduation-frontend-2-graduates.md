# Graduation frontend, part 2 — the Graduates feed block

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Save my date section type `graduates` that a Graduation host adds from the feed's Add section list: a title and up to ten graduates, each with a round photo, name, degree and university.

**Architecture:** A new section type in the zod registry (`lib/invitation/sections.ts`) with the same per-type entries the sponsors block has: defaults, sample, photo slot, editable list, list ids, settings group, renderer case. It draws with a new `GraduatesSection` that reuses `FamilyPhoto`, `SectionText` and the people grid's CSS, and edits through a `GraduatesSettings` panel on the shared `SettingsList`.

**Tech Stack:** Next.js, React, TypeScript, zod, immer, next-intl, Vitest + Testing Library, Storybook.

**Spec:** `docs/superpowers/specs/2026-11-26-graduation-event-type-design.md` §5, §9. Jira: KAN-302. Builds on part 1 (`claude/kan-301-graduation-frontend`): it needs `GRADUATION` in `EventTypeConvention`.

**Owner's choices (2026-11-26):** no columns setting (two per row on every screen, as the sponsors); removing a graduate uses the shared **Delete / Διαγραφή** button; a new block starts titled **Οι απόφοιτοί μας** for every host, like every other block's Greek starting text. So the approved "Remove graduate" and "Our graduates" are not used.

**Backend:** guestwall-be `claude/kan-300-graduation-backend` Task 6 adds the same shape to `invitation-document.schema.json` (`{ title, graduates: [{ id, name, degree, university, photo? }] ≤ 10 }`) and `graduates` to `FeedLayoutRules.PAID_TYPES`. A saved layout with the block is refused until that backend is deployed.

**Left out on purpose:** `lib/saveMyDatePreview.ts` (spec §5.1 lists it) is the wedding preview page and its Storybook stories; a Graduates block there would show on a wedding. The block's own stories cover it instead.

---

## File map

| File | Change | Responsibility |
|---|---|---|
| `lib/invitation/sections.ts` | Modify | `graduates` schema |
| `lib/invitation/newSection.ts` | Modify | a new block's content |
| `lib/invitation/samples.ts` | Modify | the sample block |
| `lib/invitation/photoSlots.ts` | Modify | one photo per graduate |
| `lib/invitation/listEdits.ts`, `lib/invitation/listIds.ts` | Modify | the graduates list, editable and with unique ids |
| `lib/invitation/listContent.ts` | Modify | `graduateHasContent` |
| `lib/invitation/sectionSettings.ts` | Modify | the block uses the `people` group |
| `lib/invitation/sectionRules.ts` | Modify | GRADUATION's section lists |
| `lib/feedAddList.ts` | Modify | GRADUATION's Add section list |
| `lib/feedLayout.ts` | Modify | `graduates` is a paid block |
| `lib/invitation/graduatesSection.test.ts` | Create | the type's rules |
| `lib/invitation/document.test.ts` | Modify | the type count |
| `components/saveMyDate/invitation/sections/family/GraduatesSection.tsx` | Create | the block as guests and the editor see it |
| `components/saveMyDate/invitation/sections/family/GraduatesSection.test.tsx` | Create | what guests see |
| `components/saveMyDate/invitation/sections/family/GraduatesSection.stories.tsx` | Create | visual stories |
| `components/saveMyDate/invitation/InvitationSection.tsx` | Modify | renders the type |
| `components/saveMyDate/invitation/invitation.css` | Modify | degree and university lines |
| `hooks/useGraduatesSettings.ts` | Create | the list's rows and field savers |
| `components/saveMyDate/editor/settings/GraduatesSettings.tsx` | Create | the edit panel |
| `components/saveMyDate/editor/settings/SectionSettingsGroups.tsx` | Modify | routes the `people` group |
| `components/saveMyDate/editor/settings/ListSettings.test.tsx` | Modify | the panel |
| `messages/en.json`, `messages/el.json` | Modify | approved copy |

---

### Task 0: Branch

- [ ] **Step 1: Branch from part 1**

```bash
git checkout claude/kan-301-graduation-frontend
git checkout -b claude/kan-302-graduates-block
```

If part 1 is already merged into `staging`, branch from the latest `origin/staging` instead.

---

### Task 1: The section type (KAN-302)

**Files:**
- Create: `lib/invitation/graduatesSection.test.ts`
- Modify: `lib/invitation/sections.ts`, `lib/invitation/newSection.ts`, `lib/invitation/samples.ts`, `lib/invitation/photoSlots.ts`, `lib/invitation/listEdits.ts`, `lib/invitation/listIds.ts`, `lib/invitation/listContent.ts`, `lib/invitation/document.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/invitation/graduatesSection.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { graduateHasContent } from '@/lib/invitation/listContent';
import { EDITABLE_LISTS } from '@/lib/invitation/listEdits';
import { uniqueListItemIds } from '@/lib/invitation/listIds';
import { createSection } from '@/lib/invitation/newSection';
import { isPhotoField } from '@/lib/invitation/photoSlots';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import { MULTI_INSTANCE_SECTION_TYPES, SECTION_DATA_SCHEMAS } from '@/lib/invitation/sections';

const graduate = (id: string) => ({ id, name: 'Μαρία', degree: 'Πτυχίο Νομικής', university: 'ΑΠΘ' });

// Spec 2026-11-26-graduation-event-type-design.md §5.
describe('the graduates section', () => {
    const schema = SECTION_DATA_SCHEMAS.graduates;

    it('holds a title and up to ten graduates with a name, degree, university and optional photo', () => {
        expect(schema.safeParse({ title: 'Οι απόφοιτοί μας', graduates: [] }).success).toBe(true);
        expect(schema.safeParse({ title: 't', graduates: Array.from({ length: 10 }, (_, i) => graduate(`g${i}`)) }).success).toBe(true);
        expect(schema.safeParse({ title: 't', graduates: Array.from({ length: 11 }, (_, i) => graduate(`g${i}`)) }).success).toBe(false);
        expect(schema.safeParse({ title: 't', graduates: [{ id: 'g1', name: 'Μαρία', degree: 'Νομική' }] }).success).toBe(false);
        expect(schema.safeParse({ title: 't', graduates: [], desktopColumns: 2 }).success).toBe(false);
        expect(schema.safeParse(SAMPLE_SECTIONS.graduates.data).success).toBe(true);
    });

    it('is one block per event', () => {
        expect(MULTI_INSTANCE_SECTION_TYPES.has('graduates')).toBe(false);
    });

    it('starts titled in Greek with one empty graduate', () => {
        const ids = ['s1', 'g1'];
        const section = createSection('graduates', 'GRADUATION', () => ids.shift()!);
        expect(section).toMatchObject({ id: 's1', type: 'graduates', name: 'Απόφοιτοι' });
        expect(section.data).toEqual({ title: 'Οι απόφοιτοί μας', graduates: [{ id: 'g1', name: '', degree: '', university: '' }] });
    });

    it("keeps each graduate's photo in its own slot", () => {
        expect(isPhotoField('graduates', 'graduates.g1.photo')).toBe(true);
        expect(isPhotoField('graduates', 'graduates.g1.name')).toBe(false);
    });

    it('is an editable list of at most ten, whose repeated ids are made unique', () => {
        expect(EDITABLE_LISTS.graduates).toMatchObject({ type: 'graduates', key: 'graduates', max: 10 });
        expect(EDITABLE_LISTS.graduates.blank('n1')).toEqual({ id: 'n1', name: '', degree: '', university: '' });
        const twice = { ...SAMPLE_SECTIONS.graduates, data: { title: 't', graduates: [graduate('g1'), graduate('g1')] } };
        expect(uniqueListItemIds(twice).data).toMatchObject({ graduates: [{ id: 'g1' }, { id: 'g1-2' }] });
    });

    it('shows guests a graduate with any of its fields or a photo', () => {
        expect(graduateHasContent({ id: 'g', name: '', degree: '', university: '' })).toBe(false);
        expect(graduateHasContent({ id: 'g', name: '', degree: 'Νομική', university: '' })).toBe(true);
        expect(graduateHasContent({ id: 'g', name: '', degree: '', university: '', photo: { source: 'media', mediaId: 'm' } })).toBe(true);
    });
});
```

In `lib/invitation/document.test.ts`, replace `expect(SECTION_TYPES).toHaveLength(39);` with `expect(SECTION_TYPES).toHaveLength(40);`.

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run lib/invitation/graduatesSection.test.ts lib/invitation/document.test.ts`
Expected: FAIL — `SECTION_DATA_SCHEMAS.graduates` is undefined.

- [ ] **Step 3: The schema**

In `lib/invitation/sections.ts`, after

```ts
const namedPhotoSchema = z
    .object({ id: idSchema, name: text, photo: imageRefSchema.optional() })
    .strict();
```

add

```ts
// One graduate in the Graduates block (KAN-302).
const graduateSchema = z
    .object({ id: idSchema, name: text, degree: text, university: text, photo: imageRefSchema.optional() })
    .strict();
```

and in `SECTION_DATA_SCHEMAS`, after the `weddingSponsors` entry (it ends `.strict(),` after `sponsors: z.array(namedPhotoSchema).max(20) })`), add:

```ts
    graduates: z.object({ title: text, graduates: z.array(graduateSchema).max(10) }).strict(),
```

- [ ] **Step 4: The new block, the sample, the photo slot**

`lib/invitation/newSection.ts`, in `DEFAULTS` after the `weddingSponsors` entry:

```ts
    // Greek for every host, like every block's starting text (owner's choice, 2026-11-26).
    graduates: (newId) => ({
        name: 'Απόφοιτοι',
        data: { title: 'Οι απόφοιτοί μας', graduates: [{ id: newId(), name: '', degree: '', university: '' }] },
    }),
```

`lib/invitation/samples.ts`, in `SAMPLE_SECTIONS` after the `weddingSponsors` line:

```ts
    graduates: section('graduates', {
        title: 'Οι απόφοιτοί μας',
        graduates: [
            { id: 'g1', name: 'Μαρία', degree: 'Πτυχίο Νομικής', university: 'ΑΠΘ', photo: photo('m-g1') },
            { id: 'g2', name: 'Νίκος', degree: 'Πτυχίο Πληροφορικής', university: 'ΑΠΘ' },
        ],
    }),
```

`lib/invitation/photoSlots.ts`, in `PHOTO_FIELDS` after `weddingSponsors: ['sponsors.*.photo'],`:

```ts
    graduates: ['graduates.*.photo'],
```

- [ ] **Step 5: The list**

`lib/invitation/listEdits.ts`, in `EDITABLE_LISTS` after the `sponsors` entry:

```ts
    graduates: {
        type: 'graduates',
        key: 'graduates',
        max: 10,
        blank: (id) => ({ id, name: '', degree: '', university: '' }),
    } satisfies ListOf<'graduates', 'graduates'>,
```

`lib/invitation/listIds.ts`, in `LIST_FIELDS` after `weddingSponsors: 'sponsors',`:

```ts
    graduates: 'graduates',
```

`lib/invitation/listContent.ts`, after the `type Person = ...` line add

```ts
type Graduate = SectionData<'graduates'>['graduates'][number];
```

and after `personHasContent`:

```ts
export const graduateHasContent = (graduate: Graduate) => filled(graduate.name, graduate.degree, graduate.university) || Boolean(graduate.photo);
```

- [ ] **Step 6: Run the tests and the type check**

Run: `npx vitest run lib/invitation`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: errors only where a full per-type table lacks `graduates`. Fix each by adding the entry the way `weddingSponsors` has it, and nothing more. The known ones are covered by Tasks 2–4; if `tsc` names another, add it there and mention it in the PR.

- [ ] **Step 7: Commit**

```bash
git add lib/invitation/sections.ts lib/invitation/newSection.ts lib/invitation/samples.ts lib/invitation/photoSlots.ts lib/invitation/listEdits.ts lib/invitation/listIds.ts lib/invitation/listContent.ts lib/invitation/graduatesSection.test.ts lib/invitation/document.test.ts
git commit -m "KAN-302: the graduates section type

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Offered to Graduation hosts (KAN-302)

**Files:**
- Modify: `lib/feedAddList.ts`, `lib/feedLayout.ts`, `lib/invitation/sectionRules.ts`
- Test: `lib/invitation/graduatesSection.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `lib/invitation/graduatesSection.test.ts` (and add the imports `import { feedAddList, FEED_ADD_TYPES } from '@/lib/feedAddList';`, `import { defaultFeedLayout, PAID_FEED_SECTION_TYPES } from '@/lib/feedLayout';`, `import { EVENT_TYPE_SECTIONS } from '@/lib/invitation/sectionRules';`):

```ts
describe('the Graduates block on the feed', () => {
    it("is in a graduation's Add section list, in the owner's order, and nobody else's", () => {
        expect(feedAddList(defaultFeedLayout(), 'GRADUATION', [])).toEqual(['invitation', 'graduates', 'gallery', 'program', 'faq', 'accommodation', 'contact']);
        expect(feedAddList(defaultFeedLayout(), 'BIRTHDAY', [])).not.toContain('graduates');
        expect(FEED_ADD_TYPES).toContain('graduates');
    });

    it('is offered once', () => {
        const layout = { ...defaultFeedLayout(), sections: [...defaultFeedLayout().sections, SAMPLE_SECTIONS.graduates] };
        expect(feedAddList(layout, 'GRADUATION', [])).not.toContain('graduates');
    });

    it('needs Save my date', () => {
        expect(PAID_FEED_SECTION_TYPES).toContain('graduates');
    });

    it("joins the birthday's sections for a graduation invitation", () => {
        expect(EVENT_TYPE_SECTIONS.GRADUATION.default).toEqual(EVENT_TYPE_SECTIONS.BIRTHDAY.default);
        expect(EVENT_TYPE_SECTIONS.GRADUATION.optional).toEqual([...EVENT_TYPE_SECTIONS.BIRTHDAY.optional, 'graduates']);
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run lib/invitation/graduatesSection.test.ts`
Expected: FAIL — GRADUATION gets the `OTHER` list; `EVENT_TYPE_SECTIONS.GRADUATION` is undefined.

- [ ] **Step 3: The lists**

`lib/feedAddList.ts`, after the `OTHER` line:

```ts
const GRADUATION: readonly NewSectionType[] = ['invitation', 'graduates', 'gallery', 'program', 'faq', 'accommodation', 'contact'];
```

replace

```ts
const LISTS: Record<string, readonly NewSectionType[]> = { WEDDING, BAPTISM, BABY_SHOWER: SHOWER, GENDER_REVEAL: SHOWER };
```

with

```ts
const LISTS: Record<string, readonly NewSectionType[]> = { WEDDING, BAPTISM, BABY_SHOWER: SHOWER, GENDER_REVEAL: SHOWER, GRADUATION };
```

and

```ts
export const FEED_ADD_TYPES: readonly NewSectionType[] = [...new Set([...WEDDING, ...BAPTISM, ...SHOWER, ...OTHER])];
```

with

```ts
export const FEED_ADD_TYPES: readonly NewSectionType[] = [...new Set([...WEDDING, ...BAPTISM, ...SHOWER, ...OTHER, ...GRADUATION])];
```

`lib/feedLayout.ts`, in `PAID_FEED_SECTION_TYPES` after `'parentsPhoto',` add `'graduates',`.

`lib/invitation/sectionRules.ts`, in `EVENT_TYPE_SECTIONS` after the `BIRTHDAY,` line:

```ts
    // A graduation invitation: the birthday's sections and the Graduates block (KAN-302).
    GRADUATION: { default: BIRTHDAY.default, optional: [...BIRTHDAY.optional, 'graduates'] },
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run lib/invitation lib/feedAddList.test.ts lib/feedLayout.test.ts`
Expected: PASS (`lib/feedLayout.test.ts` checks every Add list type is paid).

- [ ] **Step 5: Commit**

```bash
git add lib/feedAddList.ts lib/feedLayout.ts lib/invitation/sectionRules.ts lib/invitation/graduatesSection.test.ts
git commit -m "KAN-302: graduation hosts can add the Graduates block from the feed

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: How it looks (KAN-302)

**Files:**
- Create: `components/saveMyDate/invitation/sections/family/GraduatesSection.tsx`, `GraduatesSection.test.tsx`, `GraduatesSection.stories.tsx`
- Modify: `components/saveMyDate/invitation/InvitationSection.tsx`, `components/saveMyDate/invitation/invitation.css`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Write the failing test**

Create `components/saveMyDate/invitation/sections/family/GraduatesSection.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import type { InvitationDocument } from '@/lib/invitation/document';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

vi.mock('embla-carousel-react', () => ({
    default: () => [vi.fn(), { scrollPrev: vi.fn(), scrollNext: vi.fn(), on: vi.fn(), off: vi.fn(), selectedScrollSnap: () => 0 }],
}));
// next/font only works in a Next build.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

function renderGraduates(graduates: Extract<InvitationSection, { type: 'graduates' }>['data']['graduates']) {
    const section = { ...SAMPLE_SECTIONS.graduates, data: { title: 'Οι απόφοιτοί μας', graduates } } as InvitationSection;
    const document: InvitationDocument = { ...SAMPLE_DOCUMENT, sections: [section] };
    return render(<InvitationRenderer document={document} theme={SAMPLE_THEME} media={(id) => `/files/${id}.png`} />);
}

afterEach(cleanup);

describe('GraduatesSection', () => {
    it("shows each graduate's photo, name, degree and university", () => {
        renderGraduates([
            { id: 'g1', name: 'Μαρία', degree: 'Πτυχίο Νομικής', university: 'ΑΠΘ', photo: { source: 'media', mediaId: 'm-g1' } },
            { id: 'g2', name: 'Νίκος', degree: 'Πτυχίο Πληροφορικής', university: 'ΕΚΠΑ' },
        ]);
        expect(screen.getByText('Οι απόφοιτοί μας')).toBeTruthy();
        expect(screen.getByText('Μαρία')).toBeTruthy();
        expect(screen.getByText('Πτυχίο Νομικής')).toBeTruthy();
        expect(screen.getByText('ΕΚΠΑ')).toBeTruthy();
        // The photo's alt is the graduate's name, as for godparents and sponsors.
        expect(screen.getByRole('img', { name: 'Μαρία' })).toBeTruthy();
    });

    it('leaves out an empty graduate and an empty line for guests', () => {
        renderGraduates([
            { id: 'g1', name: '', degree: '', university: '' },
            { id: 'g2', name: 'Νίκος', degree: '', university: 'ΑΠΘ' },
        ]);
        expect(document.querySelectorAll('.family-godparent')).toHaveLength(1);
        expect(document.querySelectorAll('.family-graduate-detail')).toHaveLength(1);
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run components/saveMyDate/invitation/sections/family/GraduatesSection.test.tsx`
Expected: FAIL — the renderer draws nothing for `graduates`.

- [ ] **Step 3: The component**

Create `components/saveMyDate/invitation/sections/family/GraduatesSection.tsx`:

```tsx
import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { FamilyPhoto } from '@/components/saveMyDate/invitation/sections/family/FamilyPhoto';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import { graduateHasContent, showsText, visibleItems } from '@/lib/invitation/listContent';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type GraduatesSectionProps = {
    section: Extract<InvitationSection, { type: 'graduates' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

// The graduates (KAN-302): the people grid of the godparents and sponsors, with each graduate's degree
// and university under the name.
export function GraduatesSection({ section, contrast, ctx }: GraduatesSectionProps) {
    return (
        <div className="section-inner">
            <div className="family-block family-godparents">
                {/* Title */}
                <SectionText section={section} path="title" value={section.data.title} tag="h3" className="family-title" contrast={contrast} ctx={ctx} />
                {/* Graduates */}
                <div className="family-godparents-list">
                    {visibleItems(section.data.graduates, graduateHasContent, ctx).map((graduate) => {
                        const path = `graduates.${graduate.id}`;
                        return (
                            <div key={graduate.id} className="family-godparent">
                                <FamilyPhoto photo={graduate.photo} name={graduate.name} sectionId={section.id} path={`${path}.photo`} ctx={ctx} />
                                {showsText(graduate.name, ctx) && (
                                    <SectionText section={section} path={`${path}.name`} value={graduate.name} tag="h2" contrast={contrast} ctx={ctx} />
                                )}
                                {/* Degree and university */}
                                {showsText(graduate.degree, ctx) && (
                                    <SectionText
                                        section={section}
                                        path={`${path}.degree`}
                                        value={graduate.degree}
                                        tag="small"
                                        className="family-graduate-detail"
                                        contrast={contrast}
                                        ctx={ctx}
                                    />
                                )}
                                {showsText(graduate.university, ctx) && (
                                    <SectionText
                                        section={section}
                                        path={`${path}.university`}
                                        value={graduate.university}
                                        tag="small"
                                        className="family-graduate-detail"
                                        contrast={contrast}
                                        ctx={ctx}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
```

- [ ] **Step 4: The renderer and the style**

In `components/saveMyDate/invitation/InvitationSection.tsx`: add `'graduates',` to `BUILT_SECTION_TYPES` after `'weddingSponsorsSimple',`; add the import `import { GraduatesSection } from '@/components/saveMyDate/invitation/sections/family/GraduatesSection';` beside the `PhotoPeopleSection` import; and after

```tsx
        case 'weddingSponsorsSimple':
            return <WeddingSponsorsSimpleSection section={section} contrast={contrast} ctx={ctx} />;
```

add

```tsx
        case 'graduates':
            return <GraduatesSection section={section} contrast={contrast} ctx={ctx} />;
```

In `components/saveMyDate/invitation/invitation.css`, after the line

```css
.smd-invitation .family-godparent { position: relative; }
```

add

```css
/* A graduate's degree and university, one line each under the name (KAN-302). */
.smd-invitation .family-godparent .family-graduate-detail { display: block; margin-top: 2px; }
```

- [ ] **Step 5: The block's name**

`messages/en.json`, in `InvitationEditor.sectionNames`, replace

```json
            "weddingSponsors": "Wedding sponsors",
```

with

```json
            "weddingSponsors": "Wedding sponsors",
            "graduates": "Graduates",
```

`messages/el.json`, the same:

```json
            "weddingSponsors": "Κουμπάροι",
            "graduates": "Απόφοιτοι",
```

Both anchors are unique in their file (`grep -c '"weddingSponsors":' messages/en.json` prints 1).

- [ ] **Step 6: The stories**

Create `components/saveMyDate/invitation/sections/family/GraduatesSection.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LONG_NAME, onDark, SectionStory, storySection } from '@/.storybook/invitation';

const NAMES = ['Μαρία', 'Νίκος', 'Ελένη', 'Γιώργος', 'Άννα', 'Κώστας'];

function storyGraduates(count: number, withPhotos = true) {
    return NAMES.slice(0, count).map((name, index) => ({
        id: `graduate-${index}`,
        name,
        degree: 'Πτυχίο Νομικής',
        university: 'Αριστοτέλειο Πανεπιστήμιο Θεσσαλονίκης',
        ...(withPhotos ? { photo: { source: 'media' as const, mediaId: 'm-g1' } } : {}),
    }));
}

const noStyles = { textStyles: {} };
const graduates = storySection('graduates');

const meta = {
    title: 'SaveMyDate/Family/GraduatesSection',
    component: SectionStory,
    parameters: { layout: 'fullscreen' },
    args: { section: graduates },
} satisfies Meta<typeof SectionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoGraduates: Story = {};

export const OneGraduate: Story = {
    args: { section: storySection('graduates', { graduates: storyGraduates(1) }, noStyles) },
};

export const SixGraduates: Story = {
    args: { section: storySection('graduates', { graduates: storyGraduates(6) }, noStyles) },
};

export const WithoutPhotos: Story = {
    args: { section: storySection('graduates', { graduates: storyGraduates(3, false) }, noStyles) },
};

export const LongNames: Story = {
    args: { section: storySection('graduates', { graduates: storyGraduates(2).map((graduate) => ({ ...graduate, name: LONG_NAME })) }, noStyles) },
};

export const OnDarkBackground: Story = {
    args: { section: onDark(graduates) },
};
```

The visual check captures each story at 375 px and 1280 px (docs/storybook.md), which covers mobile and desktop.

- [ ] **Step 7: Run the tests**

Run: `npx vitest run components/saveMyDate/invitation lib/invitation/sectionNames.test.ts`
Expected: PASS (`sectionNames.test.ts` checks every type has a name in both languages).

Run: `npx storybook build --test -o /tmp/sb-graduates` (or the repo's `npm run build-storybook` script) and open the six stories at both widths: two per row, the odd last one centred, the degree and university smaller under the name.

- [ ] **Step 8: Commit**

```bash
git add components/saveMyDate/invitation/sections/family/GraduatesSection.tsx components/saveMyDate/invitation/sections/family/GraduatesSection.test.tsx components/saveMyDate/invitation/sections/family/GraduatesSection.stories.tsx components/saveMyDate/invitation/InvitationSection.tsx components/saveMyDate/invitation/invitation.css messages/en.json messages/el.json
git commit -m "KAN-302: draw the Graduates block, photo, name, degree and university

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Editing the graduates (KAN-302)

**Files:**
- Create: `hooks/useGraduatesSettings.ts`, `components/saveMyDate/editor/settings/GraduatesSettings.tsx`
- Modify: `lib/invitation/sectionSettings.ts`, `components/saveMyDate/editor/settings/SectionSettingsGroups.tsx`
- Modify: `components/saveMyDate/editor/settings/ListSettings.test.tsx`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: Write the failing test**

In `components/saveMyDate/editor/settings/ListSettings.test.tsx`, add the import

```ts
import { GraduatesSettings } from '@/components/saveMyDate/editor/settings/GraduatesSettings';
```

beside the other settings imports, and append:

```tsx
describe('GraduatesSettings', () => {
    const graduates = () =>
        renderSettings(SAMPLE_SECTIONS.graduates, (scope) => <GraduatesSettings scope={scope as SettingsScope<SectionOf<'graduates'>>} />);

    it('lists the graduates by name and adds one with its name, degree and university', () => {
        graduates();
        expect(screen.getByRole('heading', { name: en.InvitationEditor.sectionNames.graduates })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Μαρία' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: copy.addGraduate }));
        type(copy.name, 'Ελένη');
        type(copy.degree, 'Πτυχίο Ιατρικής');
        type(copy.university, 'ΕΚΠΑ');
        expect(items().graduates).toEqual([
            expect.objectContaining({ id: 'g1' }),
            expect.objectContaining({ id: 'g2' }),
            expect.objectContaining({ name: 'Ελένη', degree: 'Πτυχίο Ιατρικής', university: 'ΕΚΠΑ' }),
        ]);
    });

    it('deletes a graduate with the shared Delete button', () => {
        graduates();
        fireEvent.click(screen.getByRole('button', { name: 'Νίκος' }));
        fireEvent.click(screen.getByRole('button', { name: en.InvitationEditor.delete }));
        expect(items().graduates).toEqual([expect.objectContaining({ id: 'g1' })]);
    });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run components/saveMyDate/editor/settings/ListSettings.test.tsx`
Expected: FAIL — `GraduatesSettings` does not exist.

- [ ] **Step 3: The hook**

Create `hooks/useGraduatesSettings.ts`:

```ts
'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { useListSettings } from '@/hooks/useListSettings';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import type { ListItem } from '@/lib/invitation/listEdits';

// The graduates of a Graduates block: rows by name, and the fields of the one open. Their photos stay on
// the block itself, as the godparents' do.
export function useGraduatesSettings(scope: SettingsScope<SectionOf<'graduates'>>) {
    const t = useTranslations('InvitationEditor');
    const labelOf = useCallback((graduate: ListItem<'graduates'>) => graduate.name.trim() || t('sectionSettings.untitled'), [t]);
    const list = useListSettings(scope, 'graduates', labelOf);

    return {
        list,
        title: t('sectionNames.graduates'),
        addLabel: t('sectionSettings.addGraduate'),
        setName: list.fieldSaver('name'),
        setDegree: list.fieldSaver('degree'),
        setUniversity: list.fieldSaver('university'),
    };
}
```

- [ ] **Step 4: The panel**

Create `components/saveMyDate/editor/settings/GraduatesSettings.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { SettingsList } from '@/components/saveMyDate/editor/settings/SettingsList';
import { SettingsTextField } from '@/components/saveMyDate/editor/settings/SettingsTextField';
import { useGraduatesSettings } from '@/hooks/useGraduatesSettings';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';

// The graduates: rows, and one graduate's name, degree and university at a time.
export function GraduatesSettings({ scope }: { scope: SettingsScope<SectionOf<'graduates'>> }) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const { list, title, addLabel, setName, setDegree, setUniversity } = useGraduatesSettings(scope);

    return (
        <SettingsList title={title} addLabel={addLabel} list={list}>
            {list.item && (
                <>
                    {/* Name */}
                    <SettingsTextField label={t('name')} value={list.item.name} onSave={setName} />
                    {/* Degree */}
                    <SettingsTextField label={t('degree')} value={list.item.degree} onSave={setDegree} />
                    {/* University */}
                    <SettingsTextField label={t('university')} value={list.item.university} onSave={setUniversity} />
                </>
            )}
        </SettingsList>
    );
}
```

- [ ] **Step 5: The sheet shows it**

`lib/invitation/sectionSettings.ts`, in `TYPE_GROUPS` after `weddingSponsors: ['people'],`:

```ts
    graduates: ['people'],
```

`components/saveMyDate/editor/settings/SectionSettingsGroups.tsx`: add the import `import { GraduatesSettings } from '@/components/saveMyDate/editor/settings/GraduatesSettings';` (sorted with the others) and replace

```tsx
        case 'people': {
            const people = peopleScope(scope);
            return people && <PeopleSettings scope={people} />;
        }
```

with

```tsx
        case 'people': {
            const graduates = scopeOf(scope, 'graduates');
            if (graduates) return <GraduatesSettings scope={graduates} />;
            const people = peopleScope(scope);
            return people && <PeopleSettings scope={people} />;
        }
```

- [ ] **Step 6: The copy**

`messages/en.json`, in `InvitationEditor.sectionSettings`, replace

```json
            "addSponsor": "Add sponsor",
```

with

```json
            "addSponsor": "Add sponsor",
            "addGraduate": "Add graduate",
            "degree": "Degree",
            "university": "University",
```

`messages/el.json`:

```json
            "addSponsor": "Προσθήκη κουμπάρου/κουμπάρας",
            "addGraduate": "Προσθήκη αποφοίτου",
            "degree": "Πτυχίο",
            "university": "Πανεπιστήμιο",
```

If `grep -n '"degree"\|"university"' messages/en.json` already finds either key inside `InvitationEditor.sectionSettings`, stop and report: the key would be a duplicate.

- [ ] **Step 7: Run the tests and the checks**

Run: `npx vitest run components/saveMyDate/editor lib/invitation hooks`
Expected: PASS.

Run: `npx tsc --noEmit` and `npx eslint components/saveMyDate hooks lib`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add hooks/useGraduatesSettings.ts components/saveMyDate/editor/settings/GraduatesSettings.tsx lib/invitation/sectionSettings.ts components/saveMyDate/editor/settings/SectionSettingsGroups.tsx components/saveMyDate/editor/settings/ListSettings.test.tsx messages/en.json messages/el.json
git commit -m "KAN-302: hosts add, edit, reorder and delete graduates in the block's sheet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Full check and the screens

- [ ] **Step 1: Every check**

Run: `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`
Expected: all clean.

- [ ] **Step 2: Look at it**

Dev server only through `preview_start {url: "http://localhost:3000/"}`. Signed in as a host of a Graduation event with Save my date (backend branch running locally, type enabled, plan duplicated from BIRTHDAY), on 375 px then 1280 px:

1. Feed → edit → Add section: the list is Invitation, Graduates, Gallery, Schedule, FAQ, Accommodation, Contact; the Graduates card shows its preview.
2. Add it: titled "Οι απόφοιτοί μας" with one empty graduate; type a name, degree and university in the sheet; add a second graduate; reorder them; add a photo to one from the block; save.
3. As a guest (another browser, signed out or member): two per row, each with photo or name, degree and university; an empty graduate doesn't show.
4. Delete a graduate with Delete; the Add list no longer offers Graduates while the block is on the feed.

- [ ] **Step 3: Push and open the PR into staging**

Once part 1 is merged into `staging`, rebase on it (`git fetch origin staging -q && git rebase origin/staging`), then:

```bash
git push -u origin claude/kan-302-graduates-block
gh pr create --base staging --title "KAN-302: Graduates feed block" --body-file <file>
```

The body: what the block is and where it's offered, the owner's three choices above, that it needs guestwall-be `claude/kan-300-graduation-backend` deployed first (saved layouts with the block are refused before that), the ticket key KAN-302 only, and ends with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
