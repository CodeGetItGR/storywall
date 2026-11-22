# Customizable feed, plan 5: edit gating, Overview banner, section cards, theme and background in edit mode

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Only events with Save my date get the feed's edit mode; the Overview invites hosts in (or to unlock it); edit mode gains section cards, a held theme pick and one feed background colour, all stored only on Save.

**Architecture:** The backend accepts `overrides.backgroundColor` in the shared invitation document and treats it as a Save my date feature. On the frontend, `useFeedEditMode` gates on the `save_my_date` module, `?edit=blocks` opens edit mode the way `?compose=announcement` opens the composer, and the edit session grows a held theme (Save my date slug in the editor store, wall preset beside it) that Save writes with the layout PUT and then the event theme PUT. The background colour is drawn by the invitation renderer (every section) and by `EventThemeScope` (the page and posts), through a small published-override channel the feed page fills.

**Tech Stack:** Next.js App Router, React 19, TanStack Query v5, zustand + immer editor store, next-intl, vitest + Testing Library, Storybook (`@storybook/nextjs-vite`); Spring Boot, networknt JSON Schema, JUnit 5 + MockMvc.

**Ticket:** KAN-245. Every commit message starts `KAN-245: ` and ends with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## Approved behaviour

1. **Edit gating.** The Edit pill and edit mode exist only when `isModuleAvailable(event.modules, 'save_my_date')`. Hosts and co-hosts edit when it is available, on every event type: a type without Save my date themes still gets Edit, adding sections, hiding, reordering and the background colour. The lock branches that only existed for events without Save my date inside edit mode go: `useFeedBlockActions` (Billing redirect, `locked`, `canBuy`) and `FeedAddSectionRow` (lock row, lock icon, "Needs Save my date" caption).
2. **Overview banner**, in the live Overview between the journey and INVIART, never on a draft.
   - **Locked** (no Save my date): only when the add-on is offered on the plan, the event is ACTIVE, the viewer is the main host (not the demo, not incident mode), purchases aren't paused by a withdrawal under review and the feed editor flag is on. The event type doesn't matter. Lock icon, title, **Unlock** button to `routes.events.settingsAddons(eventId, { add: addon.code })`.
   - **Included** (Save my date available): hosts and co-hosts on a writable event, flag on, any event type. Same title, no lock, **Start editing** button to the feed with `?edit=blocks`.
   - **Illustration:** a small, tilted, inert live render of the event's own cover in a Save my date theme (the layout's own Save my date theme; otherwise the first Save my date theme the catalogue lists for the event type), with alt text. When the event type has no Save my date theme (or that theme doesn't load), the picture draws the cover in the event's current wall look instead; there is no placeholder once the data is in. It loads lazily; its data is prefetched on the server for the Overview.
3. **`?edit=blocks`** on `routes.events.feed`: once the role and the layout are known, the param is replaced away first, then edit mode starts (focus on Cancel, as with the pill). When editing isn't allowed the param is only dropped.
4. **Add section cards** (feed only): each addable block type as a card with a small live render (the current theme's sample section of that type, else `createSection(type, eventType)` drawn in the current theme, which is always the case on the wall theme and for event types without Save my date themes; effects and transitions stripped, no text animation; uploaded fonts) and its name. One column on phones, two from `lg`. No descriptions. The standalone Save my date editor's `AddSectionSheet` stays as it is.
5. **Theme in edit mode.** A **Theme** pill beside Cancel and Save always shows and opens the theme sheet: the wall presets (only when the theme module lets the event pick one, the Theme page's rule), then the event type's Save my date themes (none for a type without them), then the Background row; with neither kind of theme the sheet holds just the Background row. It opens in the edit sheet on phones and the side panel on desktop. A pick is held until Save: a Save my date pick switches the editor store (`planFeedThemeSwitch`), a wall pick switches back (`planFeedWallSwitch`) and/or holds the preset. The session keeps each picked theme's design and images. A theme change counts as unsaved. **Save** writes the layout PUT (with the held slug) first, then `PUT events/{id}/theme` for a held wall preset; if that second write fails, `FeedEditor.saveFailed` shows, edit mode stays and the pick stays held (Save again writes only the theme). On a conflict the existing dialog shows; Reload drops the held pick. While a wall preset is held, the feed (cover art, page colour, wall blocks) previews that preset, not `event.theme`.
6. **One feed background colour.** A **Background** row under the theme grid, in the same sheet. Stored as `overrides.backgroundColor` (`#RRGGBB`) in the invitation document. It covers the whole feed page, posts included: every invitation section draws it, and the page's `--event-bg` takes it. Text stays readable: a colour that ink text can't be read on (contrast under 4.5, the wall presets' own rule) is drawn lightened until it can (`readableOnInk`), and while the picked colour is that dark a warning shows under the row; a theme text colour that can't be read on it falls back to ink. Picking any other theme clears it. **Default** (shown only while a colour is set) clears `overrides.backgroundColor` by hand. A theme that fails to load keeps the current one on screen, silently; tapping it again retries. Held until Save.

## Approved wording

Only these strings are new. They live under `FeedEditor.banner` and `FeedEditor.background` in `messages/en.json` and `messages/el.json`.

| Key | English | Greek |
| --- | --- | --- |
| `FeedEditor.banner.title` | Want more customization? | Θέλετε περισσότερες επιλογές προσαρμογής; |
| `FeedEditor.banner.unlock` | Unlock | Ξεκλείδωμα |
| `FeedEditor.banner.startEditing` | Start editing | Ξεκινήστε την επεξεργασία |
| `FeedEditor.banner.previewAlt` | Preview of your invitation | Προεπισκόπηση της πρόσκλησής σας |
| `FeedEditor.background.tooDark` | Too dark for the text. A lighter shade will be shown. | Πολύ σκούρο για το κείμενο. Θα εμφανιστεί μια πιο ανοιχτή απόχρωση. |

Reused, unchanged: `ManagePage.sections.theme` ("Theme" / "Θέμα") for the pill and the sheet title, `InvitationEditor.sectionSettings.background` ("Background" / "Φόντο") for the colour row, `InvitationEditor.lineHeightDefault` ("Default" / "Προεπιλογή") for its reset, `InvitationEditor.sections.add`, `InvitationEditor.sections.nothingToAdd`, `InvitationEditor.close`, `InvitationEditor.sectionNames.*`, `FeedEditor.saveFailed`.

**Removed keys: none.** `ManagePage.settings.theme.locked` loses its two uses in `FeedAddSectionRow` but is still used by `useThemeGrid` (the Manage page's Theme section, which still shows locked Save my date cards to events without the module) and by `ThemePresetRadioGroup.stories.tsx`.

## File map

| File | Change | Responsibility |
| --- | --- | --- |
| guestwall-be `src/main/resources/invitation/invitation-document.schema.json` | Modify | `overrides.backgroundColor` in the format |
| guestwall-be `src/test/java/event_social_media/service/invitation/InvitationFormatValidatorTest.java` | Modify | the format accepts only `#RRGGBB` |
| guestwall-be `src/main/java/event_social_media/service/event/FeedLayoutRules.java` | Modify | a background colour needs Save my date |
| guestwall-be `src/test/java/event_social_media/service/event/FeedLayoutRulesTest.java` | Modify | rule test |
| guestwall-be `src/test/java/event_social_media/controller/event/EventFeedLayoutControllerTest.java` | Modify | 5012 without the module, saved with it, 400 for a bad colour |
| `lib/invitation/document.ts` | Modify | `overrides.backgroundColor` in the zod format |
| `lib/invitation/document.test.ts` | Modify | format test |
| `lib/contrast.ts` | Modify | `INK_COLOR`, `MIN_INK_CONTRAST` (moved), `tooDarkForInk`, `readableOnInk` |
| `lib/contrast.test.ts` | Modify | tests |
| `lib/adminThemePresets.ts` | Modify | re-export the moved constants |
| `lib/invitation/render.ts` | Modify | `RenderContext.backgroundColor`; sections draw it; text colour fallback |
| `lib/invitation/render.test.ts` | Modify | tests |
| `hooks/useFeedEditMode.ts` | Modify | Save my date gate, `settled` |
| `hooks/useFeedEditMode.test.tsx` | Modify | tests |
| `hooks/useFeedBlockActions.ts` | Modify | lock removed |
| `hooks/useFeedBlockActions.test.tsx` | Modify | lock tests removed |
| `components/feed/edit/FeedAddSectionRow.tsx` (+ `.stories.tsx`) | Modify | plain Add section row |
| `app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageContext.tsx` | Modify | `isRoleLoading` |
| `app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageBoundary.tsx` | Modify | passes `isRoleLoading` |
| `app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageContent.tsx` | Modify | gate args, edit trigger, page theme |
| `app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageContent.test.tsx` | Modify | Save my date in the edit tests |
| `lib/routes.ts` | Modify | `edit?: 'blocks'` on `feed` |
| `lib/feedEditLink.ts` (+ `.test.ts`) | Create | `?edit=blocks` helpers |
| `hooks/useFeedEditTrigger.ts` (+ `.test.tsx`) | Create | one-shot param trigger |
| `components/feed/edit/FeedEditSheetFrame.tsx` | Create | the edit sheet (phones) / side panel (desktop) frame |
| `components/feed/edit/FeedBlockSheet.tsx` | Modify | uses the frame |
| `components/saveMyDate/editor/settings/SectionSettingsSheet.tsx` | Modify | optional `titleId` |
| `lib/feedEditTheme.ts` (+ `.test.ts`) | Create | held wall preset, document replace and background recipes |
| `hooks/useFeedEditThemes.ts` | Create | the session's held theme and per-theme looks |
| `hooks/useFeedEditSession.ts` (+ `.test.tsx`) | Modify | held theme, background, two-step Save |
| `hooks/useFeedTop.ts` | Modify | draws the session's theme; `pageBackground` |
| `lib/feedPageTheme.ts` (+ `.test.ts`) | Create | the page theme override channel |
| `hooks/useFeedPageTheme.ts` | Create | publish / read the override |
| `components/event/EventThemeScope.tsx` (+ `.test.tsx`) | Modify | reads the override |
| `lib/feedSectionPreview.ts` (+ `.test.ts`) | Create | one card's preview section |
| `hooks/useFeedSectionPreviews.ts` | Create | the cards' sections, render context, fonts |
| `components/feed/edit/FeedSectionCard.tsx` | Create | one card |
| `components/feed/edit/FeedAddSectionSheet.tsx` (+ `.test.tsx`, `.stories.tsx`) | Create | the card picker |
| `hooks/useFeedEditThemeGrid.ts` (+ `.test.tsx`) | Create | theme cards with the held selection |
| `hooks/useFeedEditPanels.ts` | Create | theme sheet vs block sheet |
| `components/feed/edit/FeedBackgroundSetting.tsx` (+ `.stories.tsx`) | Create | the Background row |
| `components/feed/edit/FeedThemeSheet.tsx` (+ `.test.tsx`) | Create | grid + Background in the frame |
| `components/feed/edit/FeedEditPills.tsx` (+ `.stories.tsx`) | Modify | Theme pill |
| `components/feed/edit/FeedEditTop.tsx` | Modify | all edit mode wiring |
| `lib/feedEditBanner.ts` (+ `.test.ts`) | Create | banner rule and preview look |
| `hooks/useFeedEditBanner.ts` (+ `.test.tsx`) | Create | banner state and link |
| `hooks/useFeedEditBannerPreview.ts` | Create | the cover render's data |
| `components/manage/overview/FeedEditBanner.tsx` (+ `.test.tsx`, `.stories.tsx`) | Create | presentational banner |
| `components/manage/overview/FeedEditBannerPreview.tsx` | Create | the lazy cover render |
| `components/manage/overview/FeedEditBannerSection.tsx` | Create | container |
| `app/(main)/(app)/(event)/events/[eventId]/manage/OverviewTab.tsx` (+ both tests) | Modify | mounts the banner |
| `app/(main)/(app)/(event)/events/[eventId]/manage/(root)/page.tsx` | Modify | banner prefetch |
| `messages/en.json`, `messages/el.json` | Modify | `FeedEditor.banner.*` |

---

### Task 0: Workspaces

**Files:** none.

- [ ] **Step 1: Check the frontend branch**

Run (Git Bash): `cd /c/Users/User/WebstormProjects/storywall/.claude/worktrees/kan-245-feed-edit-mode && git branch --show-current && git status --short`
Expected: `claude/kan-245-edit-gating`; only ` M AGENTS.md` (a dev server writes it; never stage it, always stage by name).

- [ ] **Step 2: Check node_modules**

Run: `ls /c/Users/User/WebstormProjects/storywall/.claude/worktrees/kan-245-feed-edit-mode/node_modules/.bin/vitest`
Expected: the file exists. If not, in PowerShell from the worktree: `New-Item -ItemType Junction -Path node_modules -Target C:\Users\User\WebstormProjects\storywall\node_modules` (only when `package-lock.json` matches the main checkout's: `git diff --no-index --stat ../../../package-lock.json package-lock.json` prints nothing).

- [ ] **Step 3: Backend worktree (the main backend checkout belongs to another session: never switch it)**

Run:
```bash
cd /c/Users/User/IdeaProjects/event_social_media
git fetch origin staging
git worktree add .claude/worktrees/kan-245-feed-background -b claude/kan-245-feed-background origin/staging
cd .claude/worktrees/kan-245-feed-background && git log --oneline -1
```
Expected: a new worktree on `claude/kan-245-feed-background` at the tip of `origin/staging`.

---

### Task 1: Backend, the background colour in the invitation format

**Files:**
- Modify: `src/main/resources/invitation/invitation-document.schema.json` (the `__schema2` object, the document's `overrides`)
- Test: `src/test/java/event_social_media/service/invitation/InvitationFormatValidatorTest.java`

All paths are in `C:\Users\User\IdeaProjects\event_social_media\.claude\worktrees\kan-245-feed-background`.

- [ ] **Step 1: Write the failing test** (add after `aDraftOfTheSample_passes`)

```java
    /** The feed's one background colour (customizable feed, KAN-245): a #RRGGBB colour, nothing else. */
    @Test
    @SuppressWarnings("unchecked")
    void aBackgroundColour_passes_onlyAsASixDigitHexColour() {
        Map<String, Object> overrides = new HashMap<>((Map<String, Object>) document.get("overrides"));
        document.put("overrides", overrides);

        overrides.put("backgroundColor", "#AABBCC");
        assertDoesNotThrow(() -> validator.validateDraftDocument(document, "theme-1", assetIds));

        for (String bad : List.of("red", "transparent", "#abc", "#AABBCCDD")) {
            overrides.put("backgroundColor", bad);
            assertThrows(InvitationFormatException.class,
                    () -> validator.validateDraftDocument(document, "theme-1", assetIds), bad);
        }
    }
```

- [ ] **Step 2: Run it to see it fail**

Run: `./gradlew test --tests "event_social_media.service.invitation.InvitationFormatValidatorTest"`
Expected: FAIL in `aBackgroundColour_passes_onlyAsASixDigitHexColour` (`#AABBCC` is refused: `additionalProperties` is false).

- [ ] **Step 3: Add the property to the schema**

In `__schema2.properties`, after the `textColor` entry, so the block reads exactly as storywall's export produces it (checked in Task 3):

```json
    "__schema2": {
      "type": "object",
      "properties": {
        "typographyPresetId": {
          "$ref": "#/$defs/__schema1"
        },
        "textColor": {
          "$ref": "#/$defs/__schema3"
        },
        "backgroundColor": {
          "type": "string",
          "pattern": "^#[0-9a-fA-F]{6}$"
        }
      },
      "additionalProperties": false
    },
```

- [ ] **Step 4: Run the test to see it pass**

Run: `./gradlew test --tests "event_social_media.service.invitation.InvitationFormatValidatorTest"`
Expected: PASS, every test in the class.

- [ ] **Step 5: Commit**

```bash
git add src/main/resources/invitation/invitation-document.schema.json src/test/java/event_social_media/service/invitation/InvitationFormatValidatorTest.java
git commit -m "KAN-245: accept the feed's background colour in the invitation format

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Backend, a background colour needs Save my date

**Files:**
- Modify: `src/main/java/event_social_media/service/event/FeedLayoutRules.java` (`needsSaveMyDate`, line 45)
- Test: `src/test/java/event_social_media/service/event/FeedLayoutRulesTest.java`
- Test: `src/test/java/event_social_media/controller/event/EventFeedLayoutControllerTest.java`

- [ ] **Step 1: Write the failing rule test** (in `FeedLayoutRulesTest`, after `aSaveMyDateBlock_orTheme_needsTheModule`)

```java
    @Test
    void aBackgroundColour_needsTheModule() {
        Map<String, Object> doc = Map.of("themeId", "wall", "overrides", Map.of("backgroundColor", "#AABBCC"),
                "sections", List.of(section("feedCover")));
        assertThat(FeedLayoutRules.needsSaveMyDate(doc, false)).isTrue();
        assertThat(FeedLayoutRules.needsSaveMyDate(document("feedCover"), false)).isFalse();
    }
```

- [ ] **Step 2: Write the failing controller tests** (in `EventFeedLayoutControllerTest`, after `aSaveMyDateBlock_withTheModule_isSaved`)

```java
    private static Map<String, Object> backgroundDocument(String color) {
        return Map.of("schemaVersion", 1, "themeId", "wall", "overrides", Map.of("backgroundColor", color),
                "sections", List.of(section("feedCover")));
    }

    @Test
    void aBackgroundColour_withoutTheModule_isRefusedWith5012() throws Exception {
        save(host, 0, backgroundDocument("#AABBCC")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value(5012));
    }

    @Test
    void aBackgroundColour_withTheModule_isSaved_andOneThatIsNotAColourIsRefused() throws Exception {
        grantSaveMyDate();
        save(host, 0, backgroundDocument("#AABBCC")).andExpect(status().isOk());
        save(host, 1, backgroundDocument("transparent")).andExpect(status().isBadRequest());
    }
```

- [ ] **Step 3: Run them to see them fail**

Run: `./gradlew test --tests "event_social_media.service.event.FeedLayoutRulesTest" --tests "event_social_media.controller.event.EventFeedLayoutControllerTest"`
Expected: `aBackgroundColour_needsTheModule` FAILS (false), `aBackgroundColour_withoutTheModule_isRefusedWith5012` FAILS (200). The third passes already. The controller test needs the local test database the other controller tests use (Docker running).

- [ ] **Step 4: Implement**

Replace `needsSaveMyDate` in `FeedLayoutRules.java` and add the helper below it:

```java
    /**
     * Whether saving this layout needs save_my_date: a Save my date theme, any Save my date block, or the
     * feed's own background colour (overrides.backgroundColor, KAN-245).
     */
    public static boolean needsSaveMyDate(Map<String, Object> document, boolean hasSaveMyDateTheme) {
        return hasSaveMyDateTheme || hasBackgroundColor(document)
                || sections(document).stream().anyMatch(s -> PAID_TYPES.contains(String.valueOf(s.get("type"))));
    }

    static boolean hasBackgroundColor(Map<String, Object> document) {
        Object overrides = document == null ? null : document.get("overrides");
        return overrides instanceof Map<?, ?> map && map.get("backgroundColor") != null;
    }
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `./gradlew test --tests "event_social_media.service.event.FeedLayoutRulesTest" --tests "event_social_media.controller.event.EventFeedLayoutControllerTest" --tests "event_social_media.service.invitation.InvitationFormatValidatorTest"`
Expected: PASS.

- [ ] **Step 6: Full backend suite**

Run: `./gradlew test`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 7: Commit, push, open the PR into staging**

```bash
git add src/main/java/event_social_media/service/event/FeedLayoutRules.java src/test/java/event_social_media/service/event/FeedLayoutRulesTest.java src/test/java/event_social_media/controller/event/EventFeedLayoutControllerTest.java
git commit -m "KAN-245: a feed background colour needs Save my date

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin claude/kan-245-feed-background
gh pr create --base staging --title "KAN-245: feed background colour" --body "$(cat <<'EOF'
Adds `overrides.backgroundColor` (#RRGGBB) to the invitation document format, for the customizable feed's one background colour. A layout with it needs the save_my_date module (5012 without it), like a Save my date block or theme.

- invitation-document.schema.json: the new property, matching storywall's `lib/invitation/document.ts` export.
- FeedLayoutRules.needsSaveMyDate: true when the colour is set.
- Tests: format, rule, controller (5012, saved, 400 for "transparent").

No migration.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
Expected: the PR URL. The frontend's Save of a background colour needs this on the backend it talks to.

---

### Task 3: Frontend, the background colour in the document format

**Files:**
- Modify: `lib/invitation/document.ts:17-19`
- Test: `lib/invitation/document.test.ts`

All frontend paths are in `C:\Users\User\WebstormProjects\storywall\.claude\worktrees\kan-245-feed-edit-mode`.

- [ ] **Step 1: Write the failing test** (append to `lib/invitation/document.test.ts`; add `invitationDocumentSchema` and `SAMPLE_DOCUMENT` to the imports if the file doesn't import them yet: `import { invitationDocumentSchema } from '@/lib/invitation/document';`, `import { SAMPLE_DOCUMENT } from '@/lib/invitation/samples';`)

```ts
describe('the feed background colour', () => {
    const withBackground = (backgroundColor: string) => ({ ...SAMPLE_DOCUMENT, overrides: { ...SAMPLE_DOCUMENT.overrides, backgroundColor } });

    it('takes a #RRGGBB colour', () => {
        expect(invitationDocumentSchema.safeParse(withBackground('#AABBCC')).success).toBe(true);
    });

    it('refuses anything else', () => {
        for (const bad of ['red', 'transparent', '#abc', '#AABBCCDD']) {
            expect(invitationDocumentSchema.safeParse(withBackground(bad)).success).toBe(false);
        }
    });
});
```

Check the schema's export name first: `grep -n "export const .*Schema = z" lib/invitation/document.ts`. If the document schema is exported under another name, use that name in the test.

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/invitation/document.test.ts`
Expected: FAIL, "takes a #RRGGBB colour" (strict overrides refuse the key).

- [ ] **Step 3: Implement** (`lib/invitation/document.ts`, the `overrides` object)

```ts
    overrides: z
        .object({
            typographyPresetId: idSchema.optional(),
            textColor: colorSchema.optional(),
            // The customizable feed's one background colour (KAN-245): every section and the page behind the posts.
            backgroundColor: z
                .string()
                .regex(/^#[0-9a-fA-F]{6}$/)
                .optional(),
        })
        .strict(),
```

Keep the existing line breaks/format of the file; run `npx prettier --write lib/invitation/document.ts` after.

- [ ] **Step 4: Run the test to see it pass**

Run: `npx vitest run lib/invitation/document.test.ts`
Expected: PASS.

- [ ] **Step 5: Check the JSON Schema still matches the backend's**

(`npx jiti` can't resolve the `@/` paths here; `npx tsx` can.)

```bash
OUT=/c/Users/User/AppData/Local/Temp/claude/kan-245-schema && rm -rf $OUT && mkdir -p $OUT
npx tsx scripts/save-my-date/export-json-schema.ts $OUT
diff $OUT/invitation-document.schema.json /c/Users/User/IdeaProjects/event_social_media/.claude/worktrees/kan-245-feed-background/src/main/resources/invitation/invitation-document.schema.json && echo SAME
```
Expected: `SAME`. If the export writes elsewhere, the script prints the paths; diff those. A difference means Task 1's hand edit is off: copy the exported file over the backend one, rerun Task 1's tests, amend nothing, commit it there as `KAN-245: match the exported invitation format`.

- [ ] **Step 6: Commit**

```bash
git add lib/invitation/document.ts lib/invitation/document.test.ts
git commit -m "KAN-245: the feed background colour in the invitation format

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: A colour ink text reads on

**Files:**
- Modify: `lib/contrast.ts`, `lib/adminThemePresets.ts:29-31`
- Test: `lib/contrast.test.ts`

- [ ] **Step 1: Write the failing tests** (append to `lib/contrast.test.ts`; import `contrastRatio, INK_COLOR, MIN_INK_CONTRAST, readableOnInk, tooDarkForInk` from `@/lib/contrast`)

```ts
describe('tooDarkForInk', () => {
    it('is true only when ink text cannot be read on the colour', () => {
        expect(tooDarkForInk('#F5E6D3')).toBe(false);
        expect(tooDarkForInk('#FFFFFF')).toBe(false);
        expect(tooDarkForInk('#000000')).toBe(true);
        expect(tooDarkForInk('#1B2A4A')).toBe(true);
    });
});

describe('readableOnInk', () => {
    it('keeps a colour ink already reads on', () => {
        expect(readableOnInk('#F5E6D3')).toBe('#F5E6D3');
    });

    it('lightens a dark colour until ink reads on it', () => {
        for (const dark of ['#000000', '#1B2A4A', '#7A1F3D']) {
            const readable = readableOnInk(dark);
            expect(readable).not.toBe(dark);
            expect(contrastRatio(readable, INK_COLOR)).toBeGreaterThanOrEqual(MIN_INK_CONTRAST);
        }
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/contrast.test.ts`
Expected: FAIL, `tooDarkForInk` and `readableOnInk` are not exported.

- [ ] **Step 3: Implement**

Append to `lib/contrast.ts`:

```ts
// The app's ink text colour, and the contrast a background needs against it (the wall presets' rule;
// the backend checks the same).
export const INK_COLOR = '#241F1A';
export const MIN_INK_CONTRAST = 4.5;

function mixWithWhite(hex: string, amount: number): string {
    const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
    return `#${channels.map((channel) => Math.round(channel + (255 - channel) * amount).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

// Ink text can't be read on this colour: the Background row warns, and the colour is drawn lightened.
export function tooDarkForInk(hex: string): boolean {
    return contrastRatio(hex, INK_COLOR) < MIN_INK_CONTRAST;
}

// The colour itself when ink text reads on it; otherwise the colour mixed toward white until it does.
export function readableOnInk(hex: string): string {
    if (!tooDarkForInk(hex)) return hex;
    for (let step = 1; step <= 20; step += 1) {
        const mixed = mixWithWhite(hex, step / 20);
        if (!tooDarkForInk(mixed)) return mixed;
    }
    return '#FFFFFF';
}
```

In `lib/adminThemePresets.ts`, replace the two constant declarations (`export const INK_COLOR = '#241F1A';` and `export const MIN_INK_CONTRAST = 4.5;`, keep their comment) and the `contrastRatio` import with:

```ts
import { contrastRatio, INK_COLOR, MIN_INK_CONTRAST } from '@/lib/contrast';

export { INK_COLOR, MIN_INK_CONTRAST };
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run lib/contrast.test.ts lib/adminThemePresets`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/contrast.ts lib/contrast.test.ts lib/adminThemePresets.ts
git commit -m "KAN-245: lighten a colour until ink text reads on it

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The renderer draws the feed background colour

**Files:**
- Modify: `lib/invitation/render.ts` (RenderContext 23-50, buildRenderContext 55-78, sectionBackground 147, sectionBackgroundPhotos 188, solidBackgroundColor 215)
- Test: `lib/invitation/render.test.ts`

- [ ] **Step 1: Write the failing tests** (append to `lib/invitation/render.test.ts`; import `buildRenderContext, sectionBackground, sectionBackgroundPhotos` from `@/lib/invitation/render`, `defaultFeedLayout, wallThemeDesign` from `@/lib/feedLayout`, `INK_COLOR` from `@/lib/contrast`, `SAMPLE_SECTIONS` from `@/lib/invitation/samples`, `InvitationSection` type from `@/lib/invitation/sections`)

```ts
describe('the feed background colour', () => {
    const base = defaultFeedLayout();
    const photo = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), style: { ...SAMPLE_SECTIONS.dressCode.style, background: { kind: 'image', image: { mediaId: 'm-1' } } } } as InvitationSection;
    const document = (backgroundColor?: string) => ({ ...base, overrides: backgroundColor ? { backgroundColor } : {}, sections: [...base.sections, photo] });
    const media = () => 'https://media.example/photo.webp';

    it('is every section background, photos included', () => {
        const ctx = buildRenderContext(document('#F5E6D3'), wallThemeDesign(null), media);
        expect(sectionBackground(base.sections[0], 0, ctx).style.background).toBe('#F5E6D3');
        expect(sectionBackground(photo, 4, ctx).style.background).toBe('#F5E6D3');
        expect(sectionBackgroundPhotos(photo, 4, ctx)).toBeUndefined();
    });

    it('is drawn lightened when ink text cannot be read on it', () => {
        const ctx = buildRenderContext(document('#000000'), wallThemeDesign(null), media);
        expect(ctx.backgroundColor).not.toBe('#000000');
    });

    it('falls back to ink for a theme text colour that cannot be read on it', () => {
        const light = { ...wallThemeDesign(null), colors: { ...wallThemeDesign(null).colors, text: '#FFFFFF' } };
        expect(buildRenderContext(document('#F5E6D3'), light, media).textColor).toBe(INK_COLOR);
        expect(buildRenderContext(document(), light, media).textColor).toBe('#FFFFFF');
    });

    it('changes nothing without one', () => {
        const ctx = buildRenderContext(document(), wallThemeDesign(null), media);
        expect(ctx.backgroundColor).toBeUndefined();
        expect(sectionBackgroundPhotos(photo, 4, ctx)).toEqual({ desktop: 'https://media.example/photo.webp', mobile: 'https://media.example/photo.webp' });
    });
});
```

The image background's exact shape is in `lib/invitation/sectionStyle.ts` (`background` union, `kind: 'image'`); if its field is not `image: { mediaId }`, copy the shape an image background in `lib/invitation/samples.ts` uses.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run lib/invitation/render.test.ts`
Expected: FAIL in the new block.

- [ ] **Step 3: Implement**

Add the import at the top of `render.ts`: `import { contrastRatio, INK_COLOR, MIN_INK_CONTRAST, readableOnInk } from '@/lib/contrast';`

In `RenderContext`, after `textColor: string;`:

```ts
    // The customizable feed's one background colour (overrides.backgroundColor), made readable for ink
    // text. Every section shows it instead of its own background.
    backgroundColor?: string;
```

Replace `buildRenderContext` with:

```ts
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

// A theme text colour that can't be read on the feed's background colour gives way to ink.
function textColorOn(background: string | undefined, color: string): string {
    if (!background || !HEX_COLOR.test(color)) return color;
    return contrastRatio(color, background) < MIN_INK_CONTRAST ? INK_COLOR : color;
}

export function buildRenderContext(
    document: InvitationDocument,
    theme: ThemeDesign,
    media: MediaResolver,
    hostPreset?: TypographyPreset,
    sendRsvp?: RsvpSender,
): RenderContext {
    const forcePreset = Boolean(document.overrides.typographyPresetId && hostPreset);
    const dateSection = document.sections.find((section) => section.type === 'date');
    const backgroundColor = document.overrides.backgroundColor ? readableOnInk(document.overrides.backgroundColor) : undefined;
    return {
        theme,
        media,
        titleFont: forcePreset && hostPreset ? hostPreset.titleFont : theme.fonts.title,
        bodyFont: forcePreset && hostPreset ? hostPreset.bodyFont : theme.fonts.body,
        buttonFont: forcePreset && hostPreset ? hostPreset.buttonFont : theme.fonts.button,
        textColor: document.overrides.textColor ?? textColorOn(backgroundColor, theme.colors.text ?? DEFAULT_TEXT_COLOR),
        backgroundColor,
        presetMode: forcePreset || Boolean(theme.typographyPresetId),
        forcePreset,
        eventIso: dateSection?.type === 'date' ? dateSection.data.iso : undefined,
        transitionAdjacent: transitionAdjacentIds(document.sections),
        labels: INVITATION_LABELS[invitationLanguage(document)],
        sendRsvp,
    };
}
```

First line of `sectionBackground`, before `const { background } = section.style;`:

```ts
    if (ctx.backgroundColor) return { style: { background: ctx.backgroundColor }, hasThemeImage: false };
```

First line of `sectionBackgroundPhotos`:

```ts
    if (ctx.backgroundColor) return undefined;
```

First line of `solidBackgroundColor`:

```ts
    if (ctx.backgroundColor) return ctx.backgroundColor;
```

- [ ] **Step 4: Run the invitation tests**

Run: `npx vitest run lib/invitation components/saveMyDate/invitation`
Expected: PASS (nothing else sets the override, so every other test is unchanged).

- [ ] **Step 5: Commit**

```bash
git add lib/invitation/render.ts lib/invitation/render.test.ts
git commit -m "KAN-245: draw the feed background colour behind every section

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Edit mode needs Save my date

**Files:**
- Modify: `hooks/useFeedEditMode.ts`, `hooks/useFeedEditMode.test.tsx`
- Modify: `hooks/useFeedBlockActions.ts`, `hooks/useFeedBlockActions.test.tsx`
- Modify: `components/feed/edit/FeedAddSectionRow.tsx`, `components/feed/edit/FeedAddSectionRow.stories.tsx`
- Modify: `components/feed/edit/FeedEditTop.tsx` (the `useFeedBlockActions` call and the `FeedAddSectionRow` element)
- Modify: `app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageContext.tsx`, `FeedPageBoundary.tsx`, `FeedPageContent.tsx`, `FeedPageContent.test.tsx`

- [ ] **Step 1: Update the edit mode tests first**

In `hooks/useFeedEditMode.test.tsx` replace the `active` constant and add two tests at the end of the `describe`:

```ts
const SAVE_MY_DATE = [{ moduleKey: 'save_my_date', isAvailable: true, isEnabled: true }];
const active = { id: 'e-1', theme: null, status: 'ACTIVE', modules: SAVE_MY_DATE } as unknown as EventDetailResponseDto;
```

```ts
    it('is off without Save my date', () => {
        const without = { ...active, modules: [] } as unknown as EventDetailResponseDto;
        expect(renderHook(() => useFeedEditMode(without, true), { wrapper: wrap() }).result.current.canEdit).toBe(false);
    });

    it('is settled once the role and the layout are known', () => {
        expect(renderHook(() => useFeedEditMode(active, true, true), { wrapper: wrap() }).result.current.settled).toBe(false);
        expect(renderHook(() => useFeedEditMode(active, true), { wrapper: wrap({ loaded: false }) }).result.current.settled).toBe(false);
        expect(renderHook(() => useFeedEditMode(active, true), { wrapper: wrap() }).result.current.settled).toBe(true);
        expect(renderHook(() => useFeedEditMode(active, false), { wrapper: wrap({ flag: false, loaded: false }) }).result.current.settled).toBe(true);
    });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run hooks/useFeedEditMode.test.tsx`
Expected: FAIL in the two new tests.

- [ ] **Step 3: Implement `useFeedEditMode`**

```ts
'use client';

import { useCallback, useState } from 'react';

import { useFeedLayout } from '@/hooks/useFeedLayout';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { isEventWritable, isModuleAvailable } from '@/lib/eventLifecycle';
import { useFeedEditorEnabled } from '@/providers/FeedEditorFlagProvider';

// Whether the cover shows the Edit pill, and whether edit mode is on. Hosts and co-hosts only, on a
// writable event with Save my date, once the saved layout is in. `settled`: the role and the layout
// are known, so a request to edit (?edit=blocks) can be answered.
export function useFeedEditMode(
    event: Pick<EventDetailResponseDto, 'id' | 'theme' | 'status' | 'modules'>,
    isHost: boolean,
    isRoleLoading = false,
) {
    const enabled = useFeedEditorEnabled();
    const layout = useFeedLayout(event, { enabled });
    const canEdit = enabled && isHost && isEventWritable(event.status) && isModuleAvailable(event.modules, 'save_my_date') && layout.isLoaded;
    const settled = !isRoleLoading && !layout.isLoading;
    const [editing, setEditing] = useState(false);
    // Once editing isn't allowed any more, edit mode ends for good: it can't come back on its own later.
    if (editing && !canEdit) setEditing(false);
    const start = useCallback(() => setEditing(true), []);
    const finish = useCallback(() => setEditing(false), []);

    return { canEdit, settled, editing: canEdit && editing, start, finish };
}
```

- [ ] **Step 4: Run the edit mode tests**

Run: `npx vitest run hooks/useFeedEditMode.test.tsx`
Expected: PASS.

- [ ] **Step 5: The feed page passes the role's loading state**

`FeedPageContext.tsx`, in `FeedPageContextValue` after `isHost: boolean;`:

```ts
    // The viewer's role is still loading: isHost may still turn true.
    isRoleLoading: boolean;
```

`FeedPageBoundary.tsx`: import `useEventContextLoading` next to `useActiveMember, useIsHost` from `@/providers/EventProvider`; after `const isHost = useIsHost();` add `const isRoleLoading = useEventContextLoading();`; in the provider's `value` add `isRoleLoading,` after `isHost,`.

`FeedPageContent.tsx`: take `isRoleLoading` from `useFeedPage()` (add it to the destructuring) and change the edit mode line to:

```ts
    const editMode = useFeedEditMode(event, isHost, isRoleLoading);
```

- [ ] **Step 6: The feed page's edit tests give the event Save my date**

In `FeedPageContent.test.tsx` add under `const dressCode = ...`:

```ts
const SMD = [{ moduleKey: 'save_my_date', isAvailable: true, isEnabled: true }];
```

Then give every edit render Save my date:

```bash
sed -i "s/isHost: true })/isHost: true, modules: SMD })/g" "app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageContent.test.tsx"
grep -c "isHost: true, modules: SMD })" "app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageContent.test.tsx"
```
Expected: the count equals the number of `isHost: true` renders (`grep -c "isHost: true" ...` prints the same number).

Add, inside `describe('FeedPageContent edit mode'`, after `'shows Edit to a host only'`:

```ts
    it('shows no Edit without Save my date', async () => {
        renderFeed(null, { flag: true, layout: savedLayout(), isHost: true, modules: [] });
        // The layout is seeded, so the pill would show at once.
        await screen.findByTestId('banner', {}, LAZY_LOOK);
        expect(screen.queryByRole('button', { name: 'edit' })).toBeNull();
    });
```

- [ ] **Step 7: Remove the lock from the block actions**

Replace `hooks/useFeedBlockActions.ts` with:

```ts
'use client';

import { useCallback, useMemo, useState } from 'react';

import { useDeleteSectionConfirm } from '@/hooks/useDeleteSectionConfirm';
import type { EventDetailResponseDto } from '@/lib/api/types';
import {
    addableFeedSectionTypes,
    appendFeedSection,
    canDeleteFeedBlock,
    moveFeedBlock,
    reorderFeedBlocks,
    setFeedBlockVisible,
} from '@/lib/feedEditing';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import { createSection, type NewSectionType } from '@/lib/invitation/newSection';
import type { MoveDirection, SectionEdit } from '@/lib/invitation/sectionActions';

// What the tools on the feed's blocks do, and the Add section row. Edit mode only opens with Save my date.
export function useFeedBlockActions(store: InvitationEditorStore, document: InvitationDocument, event: Pick<EventDetailResponseDto, 'eventType'>) {
    const edit = useCallback<SectionEdit>((recipe) => store.getState().edit(recipe), [store]);
    const remove = useDeleteSectionConfirm(edit, document);
    const addable = useMemo(() => addableFeedSectionTypes(document, event.eventType), [document, event.eventType]);
    // With nothing left to add (the section limit), the Add section row isn't drawn.
    const showAdd = addable.length > 0;
    const [adding, setAdding] = useState(false);

    const find = useCallback((id: string) => document.sections.find((section) => section.id === id) ?? null, [document]);
    const toggleVisible = useCallback(
        (id: string) => {
            const section = find(id);
            if (section) edit(setFeedBlockVisible(id, !section.visible));
        },
        [edit, find],
    );
    const move = useCallback((id: string, direction: MoveDirection) => edit(moveFeedBlock(id, direction)), [edit]);
    const reorder = useCallback((activeId: string, overId: string) => edit(reorderFeedBlocks(activeId, overId)), [edit]);
    const { ask } = remove;
    const askDelete = useCallback(
        (id: string) => {
            const section = find(id);
            if (section && canDeleteFeedBlock(section)) ask(id);
        },
        [ask, find],
    );
    const openAdd = useCallback(() => {
        if (addable.length > 0) setAdding(true);
    }, [addable.length]);
    const closeAdd = useCallback(() => setAdding(false), []);
    const add = useCallback(
        (type: NewSectionType) => {
            edit(appendFeedSection(createSection(type, event.eventType)));
            setAdding(false);
        },
        [edit, event.eventType],
    );

    return { toggleVisible, move, reorder, askDelete, remove, addable, showAdd, adding, openAdd, closeAdd, add };
}

export type FeedBlockActions = ReturnType<typeof useFeedBlockActions>;
```

In `hooks/useFeedBlockActions.test.tsx`: delete the `upgrade` hoisted constant, the `vi.mock('@/hooks/usePlanUpgradeHref', ...)` line, the `beforeEach` that resets `upgrade.href`, and the two tests `'sends a host without Save my date to Billing'` and `'does nothing for a co-host who cannot buy'`. Replace `eventWith` and `setup` with:

```ts
const event = { id: 'e-1', eventType: 'WEDDING' } as unknown as EventDetailResponseDto;

function setup(extra: InvitationSection[] = [dressCode]) {
    const base = defaultFeedLayout();
    const store = createInvitationEditorStore({ ...base, sections: [...base.sections, ...extra] });
    const hook = renderHook(() => {
        const document = useStore(store, (state) => state.document);
        return useFeedBlockActions(store, document, event);
    });
    return { store, ...hook };
}
```

and in `'leaves out the Add section row at the section limit'` change `setup(true, full)` to `setup(full)`. Remove `beforeEach` and `vi` from the vitest import if nothing else uses them.

- [ ] **Step 8: A plain Add section row**

Replace `components/feed/edit/FeedAddSectionRow.tsx` with:

```tsx
'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

type FeedAddSectionRowProps = { onAdd: () => void };

// The end of the middle: add a Save my date block.
export function FeedAddSectionRow({ onAdd }: FeedAddSectionRowProps) {
    const t = useTranslations('InvitationEditor.sections');

    return (
        <div className="px-4 py-3">
            {/* Add section */}
            <button
                type="button"
                onClick={onAdd}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t('add')}
            </button>
        </div>
    );
}
```

Replace `FeedAddSectionRow.stories.tsx`'s meta args and stories with:

```tsx
const meta = {
    title: 'Feed/Edit/FeedAddSectionRow',
    component: FeedAddSectionRow,
    args: { onAdd: fn() },
} satisfies Meta<typeof FeedAddSectionRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};
```

In `FeedEditTop.tsx` change the actions line to `const actions = useFeedBlockActions(session.store, session.document, event);` and the row to `<FeedAddSectionRow onAdd={actions.openAdd} />`.

- [ ] **Step 9: Run the touched tests**

Run: `npx vitest run hooks/useFeedEditMode.test.tsx hooks/useFeedBlockActions.test.tsx "app/(main)/(app)/(event)/events/[eventId]/feed" components/feed`
Expected: PASS.

- [ ] **Step 10: Types and lint for the touched files**

Run: `npx tsc --noEmit -p . && npx eslint hooks/useFeedEditMode.ts hooks/useFeedBlockActions.ts components/feed/edit "app/(main)/(app)/(event)/events/[eventId]/feed"`
Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add hooks/useFeedEditMode.ts hooks/useFeedEditMode.test.tsx hooks/useFeedBlockActions.ts hooks/useFeedBlockActions.test.tsx components/feed/edit/FeedAddSectionRow.tsx components/feed/edit/FeedAddSectionRow.stories.tsx components/feed/edit/FeedEditTop.tsx "app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageContext.tsx" "app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageBoundary.tsx" "app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageContent.tsx" "app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageContent.test.tsx"
git commit -m "KAN-245: edit the feed only with Save my date

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: `?edit=blocks` opens edit mode

**Files:**
- Modify: `lib/routes.ts:109-111`
- Create: `lib/feedEditLink.ts`, `lib/feedEditLink.test.ts`
- Create: `hooks/useFeedEditTrigger.ts`, `hooks/useFeedEditTrigger.test.tsx`
- Modify: `app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageContent.tsx`

- [ ] **Step 1: Write the failing link tests** (`lib/feedEditLink.test.ts`)

```ts
import { describe, expect, it } from 'vitest';

import { feedEditHref, isFeedEditRequest, withoutEditParam } from '@/lib/feedEditLink';

describe('feedEditLink', () => {
    it('links to the feed in edit mode', () => {
        expect(feedEditHref('e-1')).toBe('/events/e-1/feed?edit=blocks');
    });

    it('reads the request', () => {
        expect(isFeedEditRequest(new URLSearchParams('edit=blocks'))).toBe(true);
        expect(isFeedEditRequest(new URLSearchParams('edit=other'))).toBe(false);
        expect(isFeedEditRequest(new URLSearchParams(''))).toBe(false);
    });

    it('drops only the edit param', () => {
        expect(withoutEditParam('/events/e-1/feed', 'edit=blocks')).toBe('/events/e-1/feed');
        expect(withoutEditParam('/events/e-1/feed', 'post=p-1&edit=blocks')).toBe('/events/e-1/feed?post=p-1');
    });
});
```

If `routes.events.feed('e-1')` builds another base path (check `eventBasePath` in `lib/routes.ts`), use what `routes.events.feed('e-1', { edit: 'blocks' })` returns in the first expectation.

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/feedEditLink.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

`lib/routes.ts`, the `feed` route:

```ts
        // compose: opens the composer in that mode (lib/announcementComposer.ts). edit: opens edit mode (lib/feedEditLink.ts).
        feed: (
            eventId: string,
            params: { post?: string | null; sheet?: 'role' | null; compose?: 'announcement' | null; edit?: 'blocks' | null } = {},
        ) => withQuery(`${eventBasePath(eventId)}/feed`, params),
```

`lib/feedEditLink.ts`:

```ts
import { routes } from '@/lib/routes';

// ?edit=blocks on the feed opens edit mode (the Overview's Start editing). A one-shot trigger:
// replaced away on the client, then edit mode starts; anyone who can't edit just loses the param.
export const EDIT_PARAM = 'edit';
export const EDIT_BLOCKS_VALUE = 'blocks' as const;

export function feedEditHref(eventId: string): string {
    return routes.events.feed(eventId, { edit: EDIT_BLOCKS_VALUE });
}

export function isFeedEditRequest(search: Pick<URLSearchParams, 'get'>): boolean {
    return search.get(EDIT_PARAM) === EDIT_BLOCKS_VALUE;
}

export function withoutEditParam(pathname: string, search: string): string {
    const params = new URLSearchParams(search);
    params.delete(EDIT_PARAM);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run lib/feedEditLink.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing trigger tests** (`hooks/useFeedEditTrigger.test.tsx`)

```tsx
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeedEditTrigger } from '@/hooks/useFeedEditTrigger';

const mocks = vi.hoisted(() => ({ search: 'edit=blocks', replace: vi.fn(), start: vi.fn() }));

vi.mock('next/navigation', () => ({
    usePathname: () => '/events/e1/feed',
    useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock('@/lib/overlayHistory', () => ({
    replacePageUrl: (url: string) => {
        mocks.replace(url);
        mocks.search = new URL(url, 'http://local').search.slice(1);
    },
}));

beforeEach(() => {
    mocks.search = 'edit=blocks';
    mocks.replace.mockReset();
    mocks.start.mockReset();
});

describe('useFeedEditTrigger', () => {
    it('drops the param, then starts editing', () => {
        const { rerender } = renderHook(() => useFeedEditTrigger({ settled: true, canEdit: true, start: mocks.start }));
        expect(mocks.replace).toHaveBeenCalledWith('/events/e1/feed');
        expect(mocks.start).not.toHaveBeenCalled();
        rerender();
        expect(mocks.start).toHaveBeenCalledOnce();
    });

    it('waits until the role and the layout are known', () => {
        const { rerender } = renderHook(({ settled }) => useFeedEditTrigger({ settled, canEdit: true, start: mocks.start }), {
            initialProps: { settled: false },
        });
        expect(mocks.replace).not.toHaveBeenCalled();
        rerender({ settled: true });
        expect(mocks.replace).toHaveBeenCalledOnce();
    });

    it('only drops the param for someone who cannot edit', () => {
        const { rerender } = renderHook(() => useFeedEditTrigger({ settled: true, canEdit: false, start: mocks.start }));
        rerender();
        expect(mocks.replace).toHaveBeenCalledWith('/events/e1/feed');
        expect(mocks.start).not.toHaveBeenCalled();
    });

    it('does nothing without the param', () => {
        mocks.search = 'post=p-1';
        renderHook(() => useFeedEditTrigger({ settled: true, canEdit: true, start: mocks.start }));
        expect(mocks.replace).not.toHaveBeenCalled();
        expect(mocks.start).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 6: Run it to see it fail**

Run: `npx vitest run hooks/useFeedEditTrigger.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 7: Implement** (`hooks/useFeedEditTrigger.ts`)

```ts
'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { isFeedEditRequest, withoutEditParam } from '@/lib/feedEditLink';
import { replacePageUrl } from '@/lib/overlayHistory';

type FeedEditTrigger = { settled: boolean; canEdit: boolean; start: () => void };

// Starts edit mode for ?edit=blocks. The param is replaced away first and edit mode starts only once it's
// gone, so Back never lands on a URL that reopens it, and no server render happens. It waits for the role and
// the layout, so a guest's link is just dropped.
export function useFeedEditTrigger({ settled, canEdit, start }: FeedEditTrigger) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const requested = isFeedEditRequest(searchParams);
    const [pending, setPending] = useState(false);

    useEffect(() => {
        if (!requested || !settled) return;
        replacePageUrl(withoutEditParam(pathname, searchParams.toString()));
        // eslint-disable-next-line react-hooks/set-state-in-effect -- The trigger param is consumed once; edit mode starts after it leaves the URL.
        if (canEdit) setPending(true);
    }, [canEdit, pathname, requested, searchParams, settled]);

    useEffect(() => {
        if (!pending || requested) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Starts only once the trigger param is gone.
        setPending(false);
        start();
    }, [pending, requested, start]);
}
```

- [ ] **Step 8: Run it to see it pass**

Run: `npx vitest run hooks/useFeedEditTrigger.test.tsx`
Expected: PASS.

- [ ] **Step 9: Mount it on the feed**

In `FeedPageContent.tsx`, import `useFeedEditTrigger` from `@/hooks/useFeedEditTrigger` and add right after the `useFeedEditFocus(...)` line:

```ts
    useFeedEditTrigger({ settled: editMode.settled, canEdit: editMode.canEdit, start: startEditing });
```

- [ ] **Step 10: Run the feed tests**

Run: `npx vitest run "app/(main)/(app)/(event)/events/[eventId]/feed" lib/feedEditLink.test.ts hooks/useFeedEditTrigger.test.tsx`
Expected: PASS (the feed test's search params are empty, so the trigger stays quiet).

- [ ] **Step 11: Commit**

```bash
git add lib/routes.ts lib/feedEditLink.ts lib/feedEditLink.test.ts hooks/useFeedEditTrigger.ts hooks/useFeedEditTrigger.test.tsx "app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageContent.tsx"
git commit -m "KAN-245: open edit mode from ?edit=blocks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: One frame for the edit sheets

**Files:**
- Create: `components/feed/edit/FeedEditSheetFrame.tsx`
- Modify: `components/feed/edit/FeedBlockSheet.tsx`
- Modify: `components/saveMyDate/editor/settings/SectionSettingsSheet.tsx`

A refactor: the block sheet's phone sheet / desktop panel choice moves into a frame the theme sheet (Task 15) reuses. No behaviour change; the existing tests are the check.

- [ ] **Step 1: `SectionSettingsSheet` takes an optional title id**

Add `titleId?: string;` to `SectionSettingsSheetProps`, take it in the parameter list (`{ open, title, titleId, onClose, children }`) and set it on the title: `<Dialog.Title id={titleId} className="truncate text-[14px] font-bold text-white">{title}</Dialog.Title>`.

- [ ] **Step 2: Create the frame** (`components/feed/edit/FeedEditSheetFrame.tsx`)

```tsx
'use client';

import '@/components/saveMyDate/editor/editor.css';

import { Dialog } from '@base-ui/react/dialog';
import { type ReactNode, useCallback } from 'react';

import { SectionSettingsDone } from '@/components/saveMyDate/editor/settings/SectionSettingsPanel';
import { SectionSettingsSheet } from '@/components/saveMyDate/editor/settings/SectionSettingsSheet';
import { letDragKeysThrough } from '@/lib/sortableKeys';

type FeedEditSheetFrameProps = { open: boolean; title: string; titleId?: string; isDesktop: boolean; onClose: () => void; children: ReactNode };

// Edit mode's settings surface: a panel at the right on desktop, a sheet over the lower screen on
// phones; the feed above stays live either way.
export function FeedEditSheetFrame({ open, title, titleId, isDesktop, onClose, children }: FeedEditSheetFrameProps) {
    if (!isDesktop) {
        return (
            <SectionSettingsSheet open={open} title={title} titleId={titleId} onClose={onClose}>
                {children}
            </SectionSettingsSheet>
        );
    }

    return (
        <FeedEditPanel open={open} title={title} titleId={titleId} onClose={onClose}>
            {children}
        </FeedEditPanel>
    );
}

type FeedEditPanelProps = { open: boolean; title: string; titleId?: string; onClose: () => void; children: ReactNode };

// The desktop panel, fixed at the right of the screen. It is portalled to the body: the page shell
// carries a transform, which would pin a fixed child to the shell and let it scroll away.
function FeedEditPanel({ open, title, titleId, onClose, children }: FeedEditPanelProps) {
    const onOpenChange = useCallback((next: boolean) => !next && onClose(), [onClose]);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange} modal={false} disablePointerDismissal>
            <Dialog.Portal>
                <Dialog.Popup
                    onKeyDown={letDragKeysThrough}
                    className="smd-editor fixed top-24 right-4 z-40 flex max-h-[calc(100svh-7rem)] w-72 flex-col gap-3 overflow-y-auto rounded-[15px] border border-(--smd-editor-panel-line) bg-(--smd-editor-panel) p-3 text-[12.5px] text-(--smd-editor-text) shadow-[0_12px_30px_rgba(0,0,0,0.25)] transition-[translate,opacity] duration-200 outline-none data-ending-style:translate-x-4 data-ending-style:opacity-0 data-starting-style:translate-x-4 data-starting-style:opacity-0"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3">
                        <Dialog.Title id={titleId} className="truncate text-[14px] font-bold text-white">
                            {title}
                        </Dialog.Title>
                        <Dialog.Close render={<SectionSettingsDone />} />
                    </div>

                    {/* Settings */}
                    {children}
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
```

- [ ] **Step 3: `FeedBlockSheet` uses it**

In `FeedBlockSheet.tsx`: delete the `FeedBlockPanel` component and its props type; drop the imports only it used (`Dialog`, `SectionSettingsDone`, `SectionSettingsSheet`, `letDragKeysThrough`, `ReactNode`, and the `editor.css` import, which the frame now loads); import `FeedEditSheetFrame` from `@/components/feed/edit/FeedEditSheetFrame`; replace the two returns at the end of `FeedBlockSheet` with:

```tsx
    return (
        <FeedEditSheetFrame open={open} title={title} isDesktop={isDesktop} onClose={onClose}>
            {body}
        </FeedEditSheetFrame>
    );
```

Keep `useCallback` (the part row uses it) and `ChevronRight`.

- [ ] **Step 4: Run the edit tests**

Run: `npx vitest run components/feed components/saveMyDate/editor "app/(main)/(app)/(event)/events/[eventId]/feed"`
Expected: PASS, unchanged.

- [ ] **Step 5: Commit**

```bash
git add components/feed/edit/FeedEditSheetFrame.tsx components/feed/edit/FeedBlockSheet.tsx components/saveMyDate/editor/settings/SectionSettingsSheet.tsx
git commit -m "KAN-245: share the edit sheet frame

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Theme helpers for edit mode

**Files:**
- Create: `lib/feedEditTheme.ts`, `lib/feedEditTheme.test.ts`

- [ ] **Step 1: Write the failing tests** (`lib/feedEditTheme.test.ts`)

```ts
import { produce } from 'immer';
import { describe, expect, it } from 'vitest';

import type { ThemePresetDto } from '@/lib/api/types';
import { presetAsEventTheme, replaceFeedDocument, setFeedBackground } from '@/lib/feedEditTheme';
import { defaultFeedLayout } from '@/lib/feedLayout';

const preset: ThemePresetDto = {
    id: 'p-1',
    key: 'dino-mint',
    name: { el: 'Δεινόσαυροι', en: 'Dinosaurs' },
    backgroundColor: '#BFE6E2',
    illustrationUrl: 'https://media.example/dino.webp',
    titleColor: '#7A1F3D',
    headingFont: null,
};

describe('feedEditTheme', () => {
    it('reads a preset as the event theme it would apply', () => {
        expect(presetAsEventTheme(preset)).toEqual({
            presetKey: 'dino-mint',
            backgroundColor: '#BFE6E2',
            illustrationUrl: 'https://media.example/dino.webp',
            titleColor: '#7A1F3D',
            headingFont: null,
        });
    });

    it('sets and clears the background colour', () => {
        const set = produce(defaultFeedLayout(), setFeedBackground('#F5E6D3'));
        expect(set.overrides.backgroundColor).toBe('#F5E6D3');
        expect('backgroundColor' in produce(set, setFeedBackground(undefined)).overrides).toBe(false);
    });

    it('replaces the theme id, overrides and sections', () => {
        const next = { ...defaultFeedLayout(), themeId: 'rose', overrides: {}, sections: defaultFeedLayout().sections.slice(0, 1) };
        const current = { ...defaultFeedLayout(), overrides: { backgroundColor: '#F5E6D3' } };
        const replaced = produce(current, replaceFeedDocument(next));
        expect(replaced.themeId).toBe('rose');
        expect(replaced.overrides).toEqual({});
        expect(replaced.sections).toHaveLength(1);
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/feedEditTheme.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement** (`lib/feedEditTheme.ts`)

```ts
import type { Draft } from 'immer';

import type { EventThemeDto, ThemePresetDto } from '@/lib/api/types';
import type { InvitationDocument } from '@/lib/invitation/document';

// A wall preset picked in edit mode, written to the event on Save. presetId null: "No theme".
export type HeldWall = { presetId: string | null; theme: EventThemeDto | null };

// The event theme a preset would apply, for drawing it before it is saved.
export function presetAsEventTheme(preset: ThemePresetDto): EventThemeDto {
    return {
        presetKey: preset.key,
        backgroundColor: preset.backgroundColor,
        illustrationUrl: preset.illustrationUrl,
        titleColor: preset.titleColor,
        headingFont: preset.headingFont,
    };
}

// The editor store's recipe for a planned theme switch: the planned document takes over.
export function replaceFeedDocument(next: InvitationDocument) {
    return (draft: Draft<InvitationDocument>) => {
        draft.themeId = next.themeId;
        draft.overrides = next.overrides;
        draft.sections = next.sections;
    };
}

// The feed's one background colour; undefined goes back to the theme's backgrounds.
export function setFeedBackground(color: string | undefined) {
    return (draft: Draft<InvitationDocument>) => {
        if (color === undefined) delete draft.overrides.backgroundColor;
        else draft.overrides.backgroundColor = color;
    };
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run lib/feedEditTheme.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/feedEditTheme.ts lib/feedEditTheme.test.ts
git commit -m "KAN-245: theme helpers for the feed's edit mode

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: The edit session holds the theme and the background

**Files:**
- Create: `hooks/useFeedEditThemes.ts`
- Modify: `hooks/useFeedEditSession.ts`, `hooks/useFeedEditSession.test.tsx`

- [ ] **Step 1: Write the failing session tests** (append inside `describe('useFeedEditSession'` in `hooks/useFeedEditSession.test.tsx`; add the imports `import { invitationThemeKeys } from '@/lib/invitation/themeCatalogue';`, `import type { InvitationThemePublicDto } from '@/lib/invitation/themePreview';`, `import { SAMPLE_DOCUMENT, SAMPLE_THEME } from '@/lib/invitation/samples';`, `import type { EventThemeDto } from '@/lib/api/types';`)

Change the `event` constant so the session can switch themes:

```ts
const event = { id: 'e-1', eventType: 'WEDDING', theme: null } as unknown as EventDetailResponseDto;
```

Seed a Save my date theme in `beforeEach` (after the layout seed):

```ts
    client.setQueryData(invitationThemeKeys.publicTheme('rose'), {
        slug: 'rose',
        name: 'Rose',
        eventType: 'WEDDING',
        design: SAMPLE_THEME,
        document: SAMPLE_DOCUMENT,
        assetUrls: {},
    } as unknown as InvitationThemePublicDto);
```

Tests:

```ts
    const dino: EventThemeDto = { presetKey: 'dino-mint', backgroundColor: '#BFE6E2', illustrationUrl: 'https://media.example/dino.webp', titleColor: null, headingFont: null };

    it('holds a Save my date theme until Save, then saves the layout on it', async () => {
        mocks.put.mockResolvedValue({ revision: 4, updatedAt: '2026-11-22T11:00:00Z' });
        const onDone = vi.fn();
        const { result } = renderHook(() => useFeedEditSession(event, onDone), { wrapper });
        await act(() => result.current.pickInvitation('rose'));
        expect(result.current.themeSlug).toBe('rose');
        expect(result.current.dirty).toBe(true);
        expect(mocks.put).not.toHaveBeenCalled();
        await act(() => result.current.save());
        expect(mocks.put).toHaveBeenCalledOnce();
        const [path, body] = mocks.put.mock.calls[0];
        expect(path).toBe(endpoints.events.feedLayout('e-1'));
        expect(body.themeSlug).toBe('rose');
        expect(body.revision).toBe(3);
        expect(body.document.themeId).toBe(SAMPLE_DOCUMENT.themeId);
        expect(onDone).toHaveBeenCalledOnce();
    });

    it('holds a wall preset and writes only the event theme when the layout is unchanged', async () => {
        mocks.put.mockResolvedValue({ theme: dino });
        const onDone = vi.fn();
        const { result } = renderHook(() => useFeedEditSession(event, onDone), { wrapper });
        await act(() => result.current.pickWall('p-1', dino, false));
        expect(result.current.dirty).toBe(true);
        expect(result.current.wallTheme).toEqual(dino);
        await act(() => result.current.save());
        expect(mocks.put).toHaveBeenCalledOnce();
        expect(mocks.put).toHaveBeenCalledWith(endpoints.events.theme('e-1'), { presetId: 'p-1' });
        expect(onDone).toHaveBeenCalledOnce();
    });

    it('keeps edit mode and the held preset when the theme write fails, and retries only it', async () => {
        const onDone = vi.fn();
        const { result } = renderHook(() => useFeedEditSession(event, onDone), { wrapper });
        act(() => result.current.setBackground('#F5E6D3'));
        await act(() => result.current.pickWall('p-1', dino, false));
        mocks.put.mockResolvedValueOnce({ revision: 4, updatedAt: '2026-11-22T11:00:00Z' }).mockRejectedValueOnce(new Error('offline'));
        await act(() => result.current.save());
        expect(result.current.failed).toBe(true);
        expect(onDone).not.toHaveBeenCalled();
        expect(result.current.heldWall).toEqual({ presetId: 'p-1', theme: dino });
        mocks.put.mockResolvedValueOnce({ theme: dino });
        await act(() => result.current.save());
        expect(mocks.put).toHaveBeenCalledTimes(3);
        expect(mocks.put.mock.calls[2]).toEqual([endpoints.events.theme('e-1'), { presetId: 'p-1' }]);
        expect(onDone).toHaveBeenCalledOnce();
    });

    it('drops a held preset picked back to the applied one', async () => {
        const { result } = renderHook(() => useFeedEditSession(event, vi.fn()), { wrapper });
        await act(() => result.current.pickWall('p-1', dino, false));
        await act(() => result.current.pickWall(null, null, true));
        expect(result.current.heldWall).toBeUndefined();
        expect(result.current.dirty).toBe(false);
    });

    it('sets the background colour, and a theme pick clears it', async () => {
        const { result } = renderHook(() => useFeedEditSession(event, vi.fn()), { wrapper });
        act(() => result.current.setBackground('#F5E6D3'));
        expect(result.current.background).toBe('#F5E6D3');
        expect(result.current.dirty).toBe(true);
        await act(() => result.current.pickInvitation('rose'));
        expect(result.current.background).toBeUndefined();
    });
```

`event` changed shape: check the rest of the file still passes it where it did.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run hooks/useFeedEditSession.test.tsx`
Expected: FAIL, `pickInvitation` / `pickWall` / `setBackground` are not functions.

- [ ] **Step 3: Create `hooks/useFeedEditThemes.ts`**

```ts
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

import { fetchInvitationTheme } from '@/hooks/useInvitationThemeCards';
import type { EventDetailResponseDto, EventThemeDto } from '@/lib/api/types';
import { type HeldWall, replaceFeedDocument, setFeedBackground } from '@/lib/feedEditTheme';
import { type FeedLayoutView, wallThemeDesign } from '@/lib/feedLayout';
import { planFeedThemeSwitch, planFeedWallSwitch } from '@/lib/feedThemes';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import type { MediaResolver } from '@/lib/invitation/render';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { invitationThemeKeys } from '@/lib/invitation/themeCatalogue';
import { readThemePreview } from '@/lib/invitation/themePreview';
import { themeImageIds } from '@/lib/invitation/themeSwitch';

type ThemeLook = { theme: ThemeDesign; media: MediaResolver };

// The theme edit mode shows, held until Save. A Save my date theme lives in the editor store (its slug and the
// planned document); its design and images are kept here per theme, like the old editor's. A wall preset is held
// beside the store and previewed in place of event.theme. Any pick clears the background colour.
export function useFeedEditThemes(
    event: Pick<EventDetailResponseDto, 'eventType' | 'theme'>,
    store: InvitationEditorStore,
    opened: FeedLayoutView,
    themeSlug: string,
) {
    const queryClient = useQueryClient();
    const [looks, setLooks] = useState<Record<string, ThemeLook>>(() =>
        opened.themeSlug ? { [opened.themeSlug]: { theme: opened.theme, media: opened.media } } : {},
    );
    const [heldWall, setHeldWall] = useState<HeldWall | undefined>(undefined);
    const [switching, setSwitching] = useState(false);
    // Set synchronously: two taps in one tick both see switching false.
    const busy = useRef(false);

    const loadTheme = useCallback(
        (slug: string) => queryClient.fetchQuery({ queryKey: invitationThemeKeys.publicTheme(slug), queryFn: () => fetchInvitationTheme(slug) }),
        [queryClient],
    );
    // The images of the theme being left, so none stay behind; a theme that no longer loads leaves none to strip.
    const leavingImageIds = useCallback(async () => {
        const current = store.getState().themeSlug;
        if (!current) return new Set<string>();
        return loadTheme(current).then(
            (theme) => themeImageIds(theme.assetUrls),
            () => new Set<string>(),
        );
    }, [loadTheme, store]);

    const run = useCallback(async (step: () => Promise<void>) => {
        if (busy.current) return;
        busy.current = true;
        setSwitching(true);
        try {
            await step();
        } catch {
            // A theme that doesn't load leaves the current one on screen.
        } finally {
            busy.current = false;
            setSwitching(false);
        }
    }, []);

    const pickInvitation = useCallback(
        (slug: string) =>
            run(async () => {
                if (slug === store.getState().themeSlug) return;
                const [target, oldIds] = await Promise.all([loadTheme(slug), leavingImageIds()]);
                const preview = readThemePreview(target);
                const document = planFeedThemeSwitch(store.getState().document, { ...preview, imageIds: themeImageIds(target.assetUrls) }, oldIds);
                // The host's own photos keep resolving through the saved layout's images.
                const media: MediaResolver = (mediaId) => preview.media(mediaId) ?? opened.media(mediaId);
                setLooks((current) => ({ ...current, [slug]: { theme: preview.theme, media } }));
                setHeldWall(undefined);
                store.getState().switchTheme(slug, replaceFeedDocument(document));
            }),
        [leavingImageIds, loadTheme, opened, run, store],
    );

    // applied: the pick is the preset already on the event, so nothing is held for it.
    const pickWall = useCallback(
        (presetId: string | null, wallTheme: EventThemeDto | null, applied: boolean) =>
            run(async () => {
                if (store.getState().themeSlug) {
                    const oldIds = await leavingImageIds();
                    const look = wallThemeDesign(applied ? event.theme : wallTheme);
                    store.getState().switchTheme('', replaceFeedDocument(planFeedWallSwitch(store.getState().document, look, event.eventType, oldIds)));
                } else {
                    store.getState().edit(setFeedBackground(undefined));
                }
                setHeldWall(applied ? undefined : { presetId, theme: wallTheme });
            }),
        [event.eventType, event.theme, leavingImageIds, run, store],
    );

    const wallTheme = heldWall ? heldWall.theme : event.theme;
    const wallLook = useMemo(() => wallThemeDesign(wallTheme), [wallTheme]);
    const look = themeSlug ? (looks[themeSlug] ?? { theme: opened.theme, media: opened.media }) : { theme: wallLook, media: opened.media };

    return { theme: look.theme, media: look.media, heldWall, wallTheme, switching, pickInvitation, pickWall };
}
```

- [ ] **Step 4: Rework `useFeedEditSession`**

Replace the file with:

```ts
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useFeedEditThemes } from '@/hooks/useFeedEditThemes';
import { useFeedLayout } from '@/hooks/useFeedLayout';
import { useFeedLayoutSave } from '@/hooks/useFeedLayoutSave';
import { useSetEventTheme } from '@/hooks/useEventTheme';
import { useInAppLeaveGuard } from '@/hooks/useInAppLeaveGuard';
import { useInvitationEditorStore } from '@/hooks/useInvitationEditorStore';
import { useOverlayHistory } from '@/hooks/useOverlayHistory';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { setFeedBackground } from '@/lib/feedEditTheme';
import { feedLayoutKeys } from '@/lib/feedLayout';
import { isStaleRevision, sameDocument } from '@/lib/invitation/drafts';

// One visit to edit mode: a copy of the saved layout to change, and a theme pick, stored only on Save.
// Leaving with changes (Cancel, phone Back, an in-app link, closing the tab) asks first.
export function useFeedEditSession(event: Pick<EventDetailResponseDto, 'id' | 'eventType' | 'theme'>, onDone: () => void) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const layout = useFeedLayout(event, { enabled: true });
    // What edit mode opened on. A refetch meanwhile changes neither what Save starts from nor what Cancel goes back to.
    const [opened] = useState(layout);
    // The layout the server holds as far as this visit knows: what it opened on, then each layout save that went through.
    const [base, setBase] = useState(() => ({ revision: opened.revision, document: opened.document, themeSlug: opened.themeSlug ?? '' }));
    const { store, document, themeSlug } = useInvitationEditorStore(opened.document, opened.themeSlug ?? '');
    const themes = useFeedEditThemes(event, store, opened, themeSlug);
    const layoutDirty = !sameDocument(base.document, document) || themeSlug !== base.themeSlug;
    const dirty = layoutDirty || themes.heldWall !== undefined;
    const { mutateAsync: saveLayout, isPending: savingLayout } = useFeedLayoutSave(event.id);
    const { mutateAsync: saveWallTheme, isPending: savingWall } = useSetEventTheme(event.id);

    // A second tap lands before isPending re-renders. Also tells Back and links that a save is on its way.
    const inFlight = useRef(false);

    // What a yes in the leave dialog does; null while the dialog is closed.
    const [onLeave, setOnLeave] = useState<(() => void) | null>(null);
    const [failed, setFailed] = useState(false);
    const [conflict, setConflict] = useState(false);
    const [reloading, setReloading] = useState(false);

    const leaveOr = useCallback(
        (then: () => void) => {
            if (dirty) setOnLeave(() => then);
            else then();
        },
        [dirty],
    );
    const cancel = useCallback(() => leaveOr(onDone), [leaveOr, onDone]);
    // While a save is on its way a link is held, without asking: it can neither drop the edits nor be lost behind a dialog.
    const leaveTo = useCallback(
        (href: string) => {
            if (inFlight.current) return;
            leaveOr(() => {
                onDone();
                router.push(href);
            });
        },
        [leaveOr, onDone, router],
    );
    const leave = useCallback(() => {
        const then = onLeave;
        setOnLeave(null);
        then?.();
    }, [onLeave]);
    const stay = useCallback(() => setOnLeave(null), []);

    // Phone Back works like Cancel. While a dialog is open, Back belongs to the dialog. While saving, Back does
    // nothing: the layer it just closed is put straight back, so a failed save still has its edits on screen.
    const [reopenBack, setReopenBack] = useState(false);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- the layer stays closed for one commit, so it registers again and pushes a fresh history entry.
        if (reopenBack) setReopenBack(false);
    }, [reopenBack]);
    const back = useCallback(() => {
        if (inFlight.current) setReopenBack(true);
        else cancel();
    }, [cancel]);
    useOverlayHistory(onLeave === null && !conflict && !reopenBack, back);
    useInAppLeaveGuard(dirty && onLeave === null && !conflict, leaveTo);
    useUnsavedChangesWarning(dirty);

    const setBackground = useCallback((color: string | undefined) => store.getState().edit(setFeedBackground(color), 'backgroundColor'), [store]);

    // The layout first (with the held Save my date slug), then a held wall preset. A layout that went through is
    // not sent again: after a failed theme write, Save again writes only the theme.
    const { heldWall } = themes;
    const save = useCallback(async () => {
        if (inFlight.current) return;
        if (!dirty) {
            onDone();
            return;
        }
        inFlight.current = true;
        setFailed(false);
        try {
            const state = store.getState();
            if (layoutDirty) {
                const saved = await saveLayout({ revision: base.revision, themeSlug: state.themeSlug || null, document: state.document });
                setBase({ revision: saved.revision, document: state.document, themeSlug: state.themeSlug });
            }
            if (heldWall) await saveWallTheme(heldWall.presetId);
            onDone();
        } catch (error) {
            if (isStaleRevision(error)) setConflict(true);
            else setFailed(true);
        } finally {
            inFlight.current = false;
        }
    }, [base.revision, dirty, heldWall, layoutDirty, onDone, saveLayout, saveWallTheme, store]);

    // Someone saved the layout elsewhere: fetch theirs and leave edit mode on it. The held theme goes with it.
    const reload = useCallback(async () => {
        setReloading(true);
        try {
            await queryClient.invalidateQueries({ queryKey: feedLayoutKeys.detail(event.id) });
        } finally {
            setReloading(false);
            setConflict(false);
            onDone();
        }
    }, [event.id, onDone, queryClient]);

    return {
        store,
        document,
        themeSlug,
        theme: themes.theme,
        media: themes.media,
        heldWall,
        wallTheme: themes.wallTheme,
        switching: themes.switching,
        pickInvitation: themes.pickInvitation,
        pickWall: themes.pickWall,
        background: document.overrides.backgroundColor,
        setBackground,
        dirty,
        saving: savingLayout || savingWall,
        failed,
        conflict,
        reloading,
        leaving: onLeave !== null,
        save,
        cancel,
        leaveTo,
        leave,
        stay,
        reload,
    };
}

export type FeedEditSession = ReturnType<typeof useFeedEditSession>;
```

- [ ] **Step 5: Run the session tests**

Run: `npx vitest run hooks/useFeedEditSession.test.tsx`
Expected: PASS, the old tests too.

- [ ] **Step 6: Run the feed tests**

Run: `npx vitest run "app/(main)/(app)/(event)/events/[eventId]/feed" components/feed`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add hooks/useFeedEditThemes.ts hooks/useFeedEditSession.ts hooks/useFeedEditSession.test.tsx
git commit -m "KAN-245: hold the theme and background in edit mode until Save

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: The feed top draws the session's theme

**Files:**
- Modify: `hooks/useFeedTop.ts`
- Modify: `components/feed/edit/FeedEditTop.tsx` (the `useFeedTop` call)

- [ ] **Step 1: Implement**

In `hooks/useFeedTop.ts` add the imports `import type { MediaResolver } from '@/lib/invitation/render';` (merge into the existing render import: `import { buildRenderContext, type MediaResolver, type RenderContext } from '@/lib/invitation/render';`) and `import type { ThemeDesign } from '@/lib/invitation/theme';`. Add to `FeedTopView` after `drawsMiddle: boolean;`:

```ts
    // The feed's own background colour (overrides.backgroundColor), as picked; null without one.
    pageBackground: string | null;
```

Add the editing type above the hook and replace the hook's first part:

```ts
// What edit mode draws: the document being edited and the theme it shows (a held pick included).
export type FeedTopEditing = { document: InvitationDocument; theme: ThemeDesign; media: MediaResolver };

// Everything the top of the feed draws, from the saved layout or the default one. While editing,
// it draws the edit session: every block, hidden ones too, never folded, in the held theme.
export function useFeedTop(event: EventDetailResponseDto, editing?: FeedTopEditing): FeedTopView {
    const enabled = useFeedEditorEnabled();
    const locale = useLocale();
    const layout = useFeedLayout(event, { enabled });
    const editingDocument = editing?.document;
    const document = editingDocument ?? layout.document;
    const theme = editing?.theme ?? layout.theme;
    const media = editing?.media ?? layout.media;
    const look = usesInvitationLook(document);
    // The font files list is public (the published invitation reads it too).
    const fonts = useInvitationFonts(enabled && look);
    const fold = useInvitationFold();
    const ended = isEventEnded(event);

    const ctx = useMemo(
        () => ({ ...buildRenderContext(document, theme, media), labels: INVITATION_LABELS[locale === 'en' ? 'en' : 'el'] }),
        [document, theme, media, locale],
    );

    const frame = useMemo(() => {
        if (editingDocument) return feedEditFrame(editingDocument);
        const split = feedFrame(document, { ended });
        const draws = (section: InvitationSection) =>
            section.type === 'feedDescription' ? Boolean(event.description) : !isEmptyForGuests(section, ctx);
        return { ...split, middle: split.middle.filter(draws) };
    }, [editingDocument, document, ended, event.description, ctx]);

    const folds = !editingDocument && foldsMiddle(frame.middle.length);
```

and in the returned object change `fontFaces` and add `pageBackground`:

```ts
        fontFaces: look ? uploadedFontFaceCss(fonts.data ?? [], [document, theme]) : '',
        ...
        pageBackground: document.overrides.backgroundColor ?? null,
```

In `FeedEditTop.tsx` change the view line to:

```ts
    const view = useFeedTop(event, { document: session.document, theme: session.theme, media: session.media });
```

- [ ] **Step 2: Run the feed tests**

Run: `npx vitest run "app/(main)/(app)/(event)/events/[eventId]/feed" components/feed hooks/useFeedEditSession.test.tsx`
Expected: PASS.

- [ ] **Step 3: Types**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add hooks/useFeedTop.ts components/feed/edit/FeedEditTop.tsx
git commit -m "KAN-245: draw edit mode in the held theme

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: The page follows the feed's theme

**Files:**
- Create: `lib/feedPageTheme.ts`, `lib/feedPageTheme.test.ts`
- Create: `hooks/useFeedPageTheme.ts`
- Modify: `components/event/EventThemeScope.tsx`, `components/event/EventThemeScope.test.tsx`
- Modify: `app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageContent.tsx`
- Modify: `components/feed/edit/FeedEditTop.tsx`

`EventThemeScope` sits in the `(event)` layout, above the feed page, and reads the event's wall theme. The feed publishes what the page should draw instead (its saved background colour; in edit mode the held preset and colour), and the scope reads it for that event only.

- [ ] **Step 1: Write the failing channel tests** (`lib/feedPageTheme.test.ts`)

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { EventThemeDto } from '@/lib/api/types';
import { feedPageTheme, feedPageThemeFor, feedPageThemeSnapshot, publishFeedPageTheme, subscribeFeedPageTheme } from '@/lib/feedPageTheme';

const dino: EventThemeDto = { presetKey: 'dino-mint', backgroundColor: '#BFE6E2', illustrationUrl: 'https://media.example/dino.webp', titleColor: null, headingFont: null };

afterEach(() => {
    publishFeedPageTheme('feed', null);
    publishFeedPageTheme('edit', null);
});

describe('feedPageTheme', () => {
    it('is the wall theme without a background colour', () => {
        expect(feedPageTheme(dino, null)).toEqual({ theme: dino });
        expect(feedPageTheme(null, undefined)).toEqual({ theme: null });
    });

    it('puts the readable background colour on the wall theme, or on no theme', () => {
        expect(feedPageTheme(dino, '#F5E6D3').theme).toEqual({ ...dino, backgroundColor: '#F5E6D3' });
        expect(feedPageTheme(null, '#F5E6D3').theme?.backgroundColor).toBe('#F5E6D3');
        expect(feedPageTheme(null, '#000000').theme?.backgroundColor).not.toBe('#000000');
    });
});

describe('the published override', () => {
    it('is for its own event, and edit mode wins', () => {
        publishFeedPageTheme('feed', { eventId: 'e-1', value: { theme: dino } });
        expect(feedPageThemeFor(feedPageThemeSnapshot(), 'e-1')).toEqual({ theme: dino });
        expect(feedPageThemeFor(feedPageThemeSnapshot(), 'e-2')).toBeNull();
        publishFeedPageTheme('edit', { eventId: 'e-1', value: { theme: null } });
        expect(feedPageThemeFor(feedPageThemeSnapshot(), 'e-1')).toEqual({ theme: null });
    });

    it('tells listeners only about real changes', () => {
        const listener = vi.fn();
        const stop = subscribeFeedPageTheme(listener);
        publishFeedPageTheme('feed', { eventId: 'e-1', value: { theme: dino } });
        publishFeedPageTheme('feed', { eventId: 'e-1', value: { theme: { ...dino } } });
        expect(listener).toHaveBeenCalledOnce();
        stop();
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/feedPageTheme.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the channel** (`lib/feedPageTheme.ts`)

```ts
import type { EventThemeDto } from '@/lib/api/types';
import { readableOnInk } from '@/lib/contrast';

// What the event pages draw while the feed overrides the event's wall theme: the feed's background colour
// (overrides.backgroundColor), and in edit mode a held wall preset. theme null: no theme, today's look.
export type FeedPageTheme = { theme: EventThemeDto | null };

// The theme a background colour sits on when the event has none: the colour alone.
const NO_THEME: EventThemeDto = { presetKey: '', backgroundColor: '#FFFFFF', illustrationUrl: '', titleColor: null, headingFont: null };

export function feedPageTheme(wall: EventThemeDto | null, background: string | null | undefined): FeedPageTheme {
    if (!background) return { theme: wall };
    return { theme: { ...(wall ?? NO_THEME), backgroundColor: readableOnInk(background) } };
}

// The feed page publishes its override ('feed'); edit mode publishes the one it previews ('edit'), which wins.
export type FeedPageThemeSlot = 'feed' | 'edit';
type Published = { eventId: string; value: FeedPageTheme };
type Snapshot = Readonly<Partial<Record<FeedPageThemeSlot, Published>>>;

const EMPTY: Snapshot = {};
let snapshot: Snapshot = EMPTY;
const listeners = new Set<() => void>();

export function publishFeedPageTheme(slot: FeedPageThemeSlot, published: Published | null): void {
    if (JSON.stringify(snapshot[slot] ?? null) === JSON.stringify(published)) return;
    snapshot = { ...snapshot, [slot]: published ?? undefined };
    listeners.forEach((listener) => listener());
}

export function subscribeFeedPageTheme(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function feedPageThemeSnapshot(): Snapshot {
    return snapshot;
}

// Nothing is published while the server renders.
export function serverFeedPageThemeSnapshot(): Snapshot {
    return EMPTY;
}

// The override for this event, edit mode's first; null when neither is about it.
export function feedPageThemeFor(current: Snapshot, eventId: string | null): FeedPageTheme | null {
    if (!eventId) return null;
    if (current.edit?.eventId === eventId) return current.edit.value;
    if (current.feed?.eventId === eventId) return current.feed.value;
    return null;
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run lib/feedPageTheme.test.ts`
Expected: PASS.

- [ ] **Step 5: Create the hooks** (`hooks/useFeedPageTheme.ts`)

```ts
'use client';

import { useLayoutEffect, useMemo, useSyncExternalStore } from 'react';

import type { EventDetailResponseDto, EventThemeDto } from '@/lib/api/types';
import {
    type FeedPageTheme,
    feedPageTheme,
    feedPageThemeFor,
    type FeedPageThemeSlot,
    feedPageThemeSnapshot,
    publishFeedPageTheme,
    serverFeedPageThemeSnapshot,
    subscribeFeedPageTheme,
} from '@/lib/feedPageTheme';

// Publishes what the page should draw for this event while the caller is on screen. Layout effects, so the
// page's colour changes before the browser paints.
function usePublishFeedPageTheme(slot: FeedPageThemeSlot, eventId: string, value: FeedPageTheme | null) {
    useLayoutEffect(() => {
        publishFeedPageTheme(slot, value ? { eventId, value } : null);
    }, [slot, eventId, value]);
    useLayoutEffect(() => () => publishFeedPageTheme(slot, null), [slot, eventId]);
}

// The page's override for this event, or null: the event's own theme.
export function useFeedPageThemeOverride(eventId: string | null): FeedPageTheme | null {
    const current = useSyncExternalStore(subscribeFeedPageTheme, feedPageThemeSnapshot, serverFeedPageThemeSnapshot);
    return feedPageThemeFor(current, eventId);
}

// The feed: its saved background colour reaches the page. Returns the event the cover draws, which shows edit
// mode's held preset while one is held.
export function useFeedPageTheme(event: EventDetailResponseDto, pageBackground: string | null): EventDetailResponseDto {
    const value = useMemo(() => (pageBackground ? feedPageTheme(event.theme, pageBackground) : null), [event.theme, pageBackground]);
    usePublishFeedPageTheme('feed', event.id, value);
    const override = useFeedPageThemeOverride(event.id);
    return useMemo(() => (override ? { ...event, theme: override.theme } : event), [event, override]);
}

// Edit mode: the held wall preset and background colour reach the page and the cover.
export function useEditPageTheme(eventId: string, wallTheme: EventThemeDto | null, background: string | undefined) {
    const value = useMemo(() => feedPageTheme(wallTheme, background), [wallTheme, background]);
    usePublishFeedPageTheme('edit', eventId, value);
}
```

- [ ] **Step 6: Write the failing scope test** (append inside the `describe` of `components/event/EventThemeScope.test.tsx`; import `publishFeedPageTheme` from `@/lib/feedPageTheme` and add `afterEach(() => { publishFeedPageTheme('feed', null); publishFeedPageTheme('edit', null); });` next to the existing `afterEach`)

```ts
    it("draws the feed's override for this event", () => {
        state.event = themedEvent;
        publishFeedPageTheme('feed', { eventId: 'e-1', value: { theme: { ...themedEvent.theme!, backgroundColor: '#F5E6D3' } } });
        expect(renderScope().style.getPropertyValue('--event-bg')).toBe('#F5E6D3');
    });

    it("ignores another event's override", () => {
        state.event = themedEvent;
        publishFeedPageTheme('feed', { eventId: 'e-2', value: { theme: null } });
        expect(renderScope().style.getPropertyValue('--event-bg')).toBe('#BFE6E2');
    });
```

- [ ] **Step 7: Run it to see it fail**

Run: `npx vitest run components/event/EventThemeScope.test.tsx`
Expected: FAIL in "draws the feed's override for this event".

- [ ] **Step 8: The scope reads the override**

In `EventThemeScope.tsx`, import `useFeedPageThemeOverride` from `@/hooks/useFeedPageTheme`, and replace the `theme` line with:

```ts
    const themed = Boolean(routeEventId) && activeEvent?.id === routeEventId && isThemedEventPage(pathname);
    // The feed may draw another theme than the event's: its own background colour, or edit mode's held preset.
    const override = useFeedPageThemeOverride(themed ? routeEventId : null);
    const theme = themed && activeEvent ? (override ? override.theme : activeEvent.theme) : null;
```

Update the comment above the component: add the sentence `The feed can replace that theme for its own event (lib/feedPageTheme.ts).`

- [ ] **Step 9: Run it to see it pass**

Run: `npx vitest run components/event/EventThemeScope.test.tsx`
Expected: PASS.

- [ ] **Step 10: The feed and edit mode publish**

`FeedPageContent.tsx`: import `useFeedPageTheme` from `@/hooks/useFeedPageTheme`; after `const top = useFeedTop(event);` add:

```ts
    const coverEvent = useFeedPageTheme(event, top.pageBackground);
```

and pass it to the cover: `<FeedCoverBlock event={coverEvent} isHost={isHost} ... />`.

`FeedEditTop.tsx`: import `useEditPageTheme` from `@/hooks/useFeedPageTheme`; after the `useFeedTop` line add:

```ts
    useEditPageTheme(event.id, session.wallTheme, session.background);
```

- [ ] **Step 11: Run the feed tests**

Run: `npx vitest run "app/(main)/(app)/(event)/events/[eventId]/feed" components/feed components/event lib/feedPageTheme.test.ts`
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add lib/feedPageTheme.ts lib/feedPageTheme.test.ts hooks/useFeedPageTheme.ts components/event/EventThemeScope.tsx components/event/EventThemeScope.test.tsx "app/(main)/(app)/(event)/events/[eventId]/feed/FeedPageContent.tsx" components/feed/edit/FeedEditTop.tsx
git commit -m "KAN-245: the feed's background colour and held theme reach the whole page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: The edit theme grid

**Files:**
- Create: `hooks/useFeedEditThemeGrid.ts`, `hooks/useFeedEditThemeGrid.test.tsx`
- Create: `hooks/useFeedEditPanels.ts`

- [ ] **Step 1: Write the failing grid tests** (`hooks/useFeedEditThemeGrid.test.tsx`)

```tsx
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeedEditThemeGrid } from '@/hooks/useFeedEditThemeGrid';
import type { EventDetailResponseDto, ThemePresetDto } from '@/lib/api/types';
import { invitationThemeChoice } from '@/lib/feedThemes';

const preset: ThemePresetDto = { id: 'p-1', key: 'dino-mint', name: { el: 'Δ', en: 'D' }, backgroundColor: '#BFE6E2', illustrationUrl: 'u', titleColor: null, headingFont: null };

const mocks = vi.hoisted(() => ({ applied: null as string | null, available: true }));

vi.mock('@/hooks/useThemePicker', () => ({
    useThemePicker: () => ({
        available: mocks.available,
        presets: [preset],
        isLoading: false,
        isApplied: (presetId: string | null) => presetId === mocks.applied,
    }),
}));
vi.mock('@/hooks/useWallThemeOptions', () => ({
    useWallThemeOptions: (_picker: unknown, { checkable }: { checkable: boolean }) => [
        { id: 'none', presetId: null, label: 'none', backgroundColor: null, illustrationUrl: null, titleColor: null, headingFont: null, selected: checkable && mocks.applied === null },
        { id: 'p-1', presetId: 'p-1', label: 'D', backgroundColor: '#BFE6E2', illustrationUrl: 'u', titleColor: null, headingFont: null, selected: checkable && mocks.applied === 'p-1' },
    ],
}));
vi.mock('@/hooks/useInvitationThemeCards', () => ({
    useInvitationThemeCards: () => ({
        cards: [{ slug: 'rose', name: 'Rose', cardColor: '#EED', illustrationUrl: null, titleFontFamily: null, titleColor: null }],
        fontFaces: '',
        isLoading: false,
    }),
}));

const event = { id: 'e-1', eventType: 'WEDDING', title: 'Wedding' } as unknown as EventDetailResponseDto;

function session(overrides: Partial<Parameters<typeof useFeedEditThemeGrid>[1]> = {}) {
    return { themeSlug: '', heldWall: undefined, switching: false, saving: false, pickInvitation: vi.fn(), pickWall: vi.fn(), ...overrides };
}

beforeEach(() => {
    mocks.applied = null;
    mocks.available = true;
});

describe('useFeedEditThemeGrid', () => {
    it('lists the wall themes, then the Save my date themes', () => {
        const { result } = renderHook(() => useFeedEditThemeGrid(event, session()));
        expect(result.current.options.map((option) => option.id)).toEqual(['none', 'p-1', invitationThemeChoice('rose')]);
    });

    it('marks the held pick', () => {
        const held = renderHook(() => useFeedEditThemeGrid(event, session({ heldWall: { presetId: 'p-1', theme: null } }))).result.current;
        expect(held.options.find((option) => option.selected)?.id).toBe('p-1');
        const rose = renderHook(() => useFeedEditThemeGrid(event, session({ themeSlug: 'rose' }))).result.current;
        expect(rose.options.filter((option) => option.selected).map((option) => option.id)).toEqual([invitationThemeChoice('rose')]);
    });

    it('sends a Save my date pick and a wall pick to the session', () => {
        const pickInvitation = vi.fn();
        const pickWall = vi.fn();
        const { result } = renderHook(() => useFeedEditThemeGrid(event, session({ pickInvitation, pickWall })));
        act(() => result.current.select(invitationThemeChoice('rose')));
        expect(pickInvitation).toHaveBeenCalledWith('rose');
        act(() => result.current.select('p-1'));
        expect(pickWall).toHaveBeenCalledWith('p-1', expect.objectContaining({ presetKey: 'dino-mint' }), false);
        act(() => result.current.select(null));
        expect(pickWall).toHaveBeenLastCalledWith(null, null, true);
    });

    it('leaves the wall themes out when the event cannot pick one', () => {
        mocks.available = false;
        const { result } = renderHook(() => useFeedEditThemeGrid(event, session()));
        expect(result.current.options.map((option) => option.id)).toEqual([invitationThemeChoice('rose')]);
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run hooks/useFeedEditThemeGrid.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the grid** (`hooks/useFeedEditThemeGrid.ts`)

```ts
'use client';

import { useCallback } from 'react';

import type { ThemeRadioOption } from '@/components/manage/ThemePresetRadioGroup';
import type { FeedEditSession } from '@/hooks/useFeedEditSession';
import { useInvitationThemeCards } from '@/hooks/useInvitationThemeCards';
import { useThemePicker } from '@/hooks/useThemePicker';
import { useWallThemeOptions } from '@/hooks/useWallThemeOptions';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { presetAsEventTheme } from '@/lib/feedEditTheme';
import { invitationThemeChoice, readThemeChoice } from '@/lib/feedThemes';
import { isCatalogueEventType } from '@/lib/invitation/themeCatalogue';

type ThemeGridSession = Pick<FeedEditSession, 'themeSlug' | 'heldWall' | 'switching' | 'saving' | 'pickInvitation' | 'pickWall'>;

// Edit mode's theme cards: the wall themes, then the event type's Save my date themes, with the held pick
// marked. A pick goes to the session and is saved with the rest.
export function useFeedEditThemeGrid(event: EventDetailResponseDto, session: ThemeGridSession) {
    const picker = useThemePicker(event, true);
    const onWall = session.themeSlug === '';
    const wallCards = useWallThemeOptions(picker, { checkable: onWall });
    const themeCards = useInvitationThemeCards(event.eventType, { enabled: isCatalogueEventType(event.eventType) });
    const held = onWall ? session.heldWall : undefined;

    const wallOptions: ThemeRadioOption[] = picker.available
        ? wallCards.map((option) => (held ? { ...option, selected: option.presetId === held.presetId } : option))
        : [];
    const invitationOptions: ThemeRadioOption[] = themeCards.cards.map((card) => ({
        id: invitationThemeChoice(card.slug),
        presetId: invitationThemeChoice(card.slug),
        label: card.name,
        backgroundColor: card.cardColor,
        illustrationUrl: card.illustrationUrl,
        titleColor: card.titleColor,
        headingFont: null,
        titleFontFamily: card.titleFontFamily,
        selected: session.themeSlug === card.slug,
    }));

    const { presets, isApplied } = picker;
    const { pickInvitation, pickWall } = session;
    const select = useCallback(
        (choice: string | null) => {
            const slug = readThemeChoice(choice);
            if (slug !== null) {
                void pickInvitation(slug);
                return;
            }
            const preset = choice === null ? null : presets.find((item) => item.id === choice);
            // An applied theme that is no longer offered can't be picked again.
            if (preset === undefined) return;
            void pickWall(choice, preset ? presetAsEventTheme(preset) : null, isApplied(choice));
        },
        [isApplied, pickInvitation, pickWall, presets],
    );

    // Empty for an event with neither kind of theme: the sheet then holds just the Background row.
    const options = [...wallOptions, ...invitationOptions];
    return {
        options,
        fontFaces: themeCards.fontFaces,
        hasInvitationThemes: invitationOptions.length > 0,
        disabled: session.switching || session.saving || picker.isLoading,
        select,
    };
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run hooks/useFeedEditThemeGrid.test.tsx`
Expected: PASS.

- [ ] **Step 5: The panels hook** (`hooks/useFeedEditPanels.ts`)

```ts
'use client';

import { useCallback, useState } from 'react';

// Edit mode shows one settings surface at a time: the theme sheet, or one block's settings.
export function useFeedEditPanels(openSettingsFor: (id: string) => void, closeSettings: () => void) {
    const [themeOpen, setThemeOpen] = useState(false);
    const openTheme = useCallback(() => {
        closeSettings();
        setThemeOpen(true);
    }, [closeSettings]);
    const closeTheme = useCallback(() => setThemeOpen(false), []);
    const openSettings = useCallback(
        (id: string) => {
            setThemeOpen(false);
            openSettingsFor(id);
        },
        [openSettingsFor],
    );

    return { themeOpen, openTheme, closeTheme, openSettings };
}
```

- [ ] **Step 6: Commit**

```bash
git add hooks/useFeedEditThemeGrid.ts hooks/useFeedEditThemeGrid.test.tsx hooks/useFeedEditPanels.ts
git commit -m "KAN-245: theme cards for edit mode

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Add section cards

**Files:**
- Create: `lib/feedSectionPreview.ts`, `lib/feedSectionPreview.test.ts`
- Create: `hooks/useFeedSectionPreviews.ts`
- Create: `components/feed/edit/FeedSectionCard.tsx`
- Create: `components/feed/edit/FeedAddSectionSheet.tsx`, `FeedAddSectionSheet.test.tsx`, `FeedAddSectionSheet.stories.tsx`
- Modify: `components/feed/edit/FeedEditTop.tsx` (the Add section sheet)

- [ ] **Step 1: Write the failing preview tests** (`lib/feedSectionPreview.test.ts`)

```ts
import { describe, expect, it } from 'vitest';

import { feedSectionPreview } from '@/lib/feedSectionPreview';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';

describe('feedSectionPreview', () => {
    it("uses the theme's own sample of that type", () => {
        const sample = { ...(SAMPLE_SECTIONS.faq as InvitationSection), id: 'theme-faq' };
        const preview = feedSectionPreview('faq', new Map([[sample.id, sample]]), 'WEDDING');
        expect(preview.type).toBe('faq');
        expect(preview.data).toEqual(sample.data);
        expect(preview.id).toBe('preview-faq');
        expect(preview.visible).toBe(true);
    });

    it('falls back to a new section', () => {
        expect(feedSectionPreview('dressCode', null, 'WEDDING').type).toBe('dressCode');
    });

    it('strips the effect and the transition', () => {
        const sample = {
            ...(SAMPLE_SECTIONS.faq as InvitationSection),
            style: { ...SAMPLE_SECTIONS.faq.style, effect: { type: 'snow' }, transition: { assetId: 'a-1', edge: 'bottom' } },
        } as unknown as InvitationSection;
        const preview = feedSectionPreview('faq', new Map([[sample.id, sample]]), 'WEDDING');
        expect(preview.style.effect).toBeUndefined();
        expect(preview.style.transition).toBeUndefined();
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/feedSectionPreview.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement** (`lib/feedSectionPreview.ts`)

```ts
import type { SampleSections } from '@/lib/invitation/eventLinks';
import { createSection, type NewSectionType } from '@/lib/invitation/newSection';
import type { InvitationSection } from '@/lib/invitation/sections';

// One Add section card's picture: the theme's own sample of that type (its look and sample content), else a
// new section. Still: no background effect, no transition art.
export function feedSectionPreview(type: NewSectionType, samples: SampleSections | null, eventType: string): InvitationSection {
    const sample = samples ? [...samples.values()].find((section) => section.type === type) : undefined;
    const section = sample ?? createSection(type, eventType);
    return { ...section, id: `preview-${type}`, visible: true, style: { ...section.style, effect: undefined, transition: undefined } } as InvitationSection;
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run lib/feedSectionPreview.test.ts`
Expected: PASS.

- [ ] **Step 5: The previews hook** (`hooks/useFeedSectionPreviews.ts`)

```ts
'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';

import { useInvitationFonts } from '@/hooks/useAdminInvitationThemes';
import { useThemeSampleSections } from '@/hooks/useThemeSampleSections';
import { feedSectionPreview } from '@/lib/feedSectionPreview';
import type { InvitationDocument } from '@/lib/invitation/document';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import type { NewSectionType } from '@/lib/invitation/newSection';
import { buildRenderContext, type MediaResolver, type RenderContext } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { uploadedFontFaceCss } from '@/lib/invitation/uploadedFonts';

export type FeedSectionPreview = { type: NewSectionType; section: InvitationSection };
export type FeedSectionPreviews = { items: FeedSectionPreview[]; ctx: RenderContext; lang: string; fontFaces: string };

type FeedSectionPreviewsInput = {
    types: NewSectionType[];
    // The session's theme: its slug ('' on the wall theme) for the samples, its design for the look.
    themeSlug: string;
    document: InvitationDocument;
    theme: ThemeDesign;
    media: MediaResolver;
    eventType: string;
    // Only while the picker is open.
    enabled: boolean;
};

// The Add section cards' pictures, drawn in the theme edit mode shows, with no text animation.
export function useFeedSectionPreviews({ types, themeSlug, document, theme, media, eventType, enabled }: FeedSectionPreviewsInput): FeedSectionPreviews {
    const locale = useLocale();
    const samples = useThemeSampleSections(enabled && themeSlug ? themeSlug : null);
    const fonts = useInvitationFonts(enabled);

    const items = useMemo(
        () => types.map((type) => ({ type, section: feedSectionPreview(type, samples?.sections ?? null, eventType) })),
        [types, samples, eventType],
    );
    const ctx = useMemo(() => {
        const sampleMedia: MediaResolver = (mediaId) => samples?.imageUrls[mediaId] ?? media(mediaId);
        return {
            ...buildRenderContext(document, { ...theme, textAnimation: 'none' }, sampleMedia),
            labels: INVITATION_LABELS[locale === 'en' ? 'en' : 'el'],
        };
    }, [document, theme, media, samples, locale]);

    return { items, ctx, lang: locale, fontFaces: enabled ? uploadedFontFaceCss(fonts.data ?? [], [document, theme]) : '' };
}
```

- [ ] **Step 6: Write the failing sheet tests** (`components/feed/edit/FeedAddSectionSheet.test.tsx`)

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedAddSectionSheet } from '@/components/feed/edit/FeedAddSectionSheet';
import { defaultFeedLayout, wallThemeDesign } from '@/lib/feedLayout';
import { feedSectionPreview } from '@/lib/feedSectionPreview';
import { buildRenderContext } from '@/lib/invitation/render';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
// next/font only works when Next compiles the file.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

afterEach(cleanup);

const ctx = buildRenderContext(defaultFeedLayout(), wallThemeDesign(null), () => undefined);
const previews = (types: ('dressCode' | 'faq')[]) => ({
    items: types.map((type) => ({ type, section: feedSectionPreview(type, null, 'WEDDING') })),
    ctx,
    lang: 'en',
    fontFaces: '',
});

describe('FeedAddSectionSheet', () => {
    it('shows each block as a card named after it, and adds the one tapped', () => {
        const onAdd = vi.fn();
        render(<FeedAddSectionSheet open previews={previews(['dressCode', 'faq'])} onAdd={onAdd} onClose={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: 'sectionNames.faq' }));
        expect(onAdd).toHaveBeenCalledWith('faq');
        expect(screen.getByRole('button', { name: 'sectionNames.dressCode' })).toBeTruthy();
    });

    it('says when there is nothing left to add', () => {
        render(<FeedAddSectionSheet open previews={previews([])} onAdd={vi.fn()} onClose={vi.fn()} />);
        expect(screen.getByText('sections.nothingToAdd')).toBeTruthy();
    });
});
```

- [ ] **Step 7: Run it to see it fail**

Run: `npx vitest run components/feed/edit/FeedAddSectionSheet.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 8: The card** (`components/feed/edit/FeedSectionCard.tsx`)

```tsx
'use client';

import { useCallback } from 'react';

import { FeedLook } from '@/components/feed/layout/FeedLook';
import { InvitationSection } from '@/components/saveMyDate/invitation/InvitationSection';
import type { FeedSectionPreview } from '@/hooks/useFeedSectionPreviews';
import type { NewSectionType } from '@/lib/invitation/newSection';
import type { RenderContext } from '@/lib/invitation/render';

type FeedSectionCardProps = { preview: FeedSectionPreview; name: string; ctx: RenderContext; lang: string; onAdd: (type: NewSectionType) => void };

// One block in the Add section picker: a small live picture of it, then its name.
export function FeedSectionCard({ preview, name, ctx, lang, onAdd }: FeedSectionCardProps) {
    const add = useCallback(() => onAdd(preview.type), [onAdd, preview.type]);

    return (
        <button
            type="button"
            onClick={add}
            className="flex w-full flex-col overflow-hidden rounded-xl bg-surface-muted text-left transition-colors hover:bg-border focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
            {/* Preview: drawn at twice the card's width, then halved */}
            <div aria-hidden="true" inert className="pointer-events-none h-36 overflow-hidden">
                <div className="w-[200%] origin-top-left scale-50">
                    <FeedLook ctx={ctx} lang={lang} fontFaces="">
                        <InvitationSection section={preview.section} index={1} ctx={ctx} />
                    </FeedLook>
                </div>
            </div>

            {/* Name */}
            <span className="px-4 py-3 text-sm font-medium text-ink">{name}</span>
        </button>
    );
}
```

- [ ] **Step 9: The sheet** (`components/feed/edit/FeedAddSectionSheet.tsx`)

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { FeedSectionCard } from '@/components/feed/edit/FeedSectionCard';
import { Modal } from '@/components/ui/modal';
import type { FeedSectionPreviews } from '@/hooks/useFeedSectionPreviews';
import type { NewSectionType } from '@/lib/invitation/newSection';

type FeedAddSectionSheetProps = { open: boolean; previews: FeedSectionPreviews; onAdd: (type: NewSectionType) => void; onClose: () => void };

// The feed's Add section picker: the blocks the host may add, as cards. One column on phones, two on desktop.
export function FeedAddSectionSheet({ open, previews, onAdd, onClose }: FeedAddSectionSheetProps) {
    const t = useTranslations('InvitationEditor');

    return (
        <Modal open={open} onClose={onClose} variant="sheet" ariaLabel={t('sections.add')} closeLabel={t('close')}>
            <Modal.Body className="flex flex-col gap-4 px-5 pt-5 pb-8 text-sm text-ink">
                {/* Title */}
                <h2 className="pr-10 text-base font-semibold">{t('sections.add')}</h2>

                {/* Uploaded fonts: built only from validated names and urls, so safe to inline */}
                {previews.fontFaces && <style>{previews.fontFaces}</style>}

                {/* Sections */}
                {previews.items.length > 0 ? (
                    <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        {previews.items.map((preview) => (
                            <li key={preview.type}>
                                <FeedSectionCard preview={preview} name={t(`sectionNames.${preview.type}`)} ctx={previews.ctx} lang={previews.lang} onAdd={onAdd} />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-ink-muted">{t('sections.nothingToAdd')}</p>
                )}
            </Modal.Body>
        </Modal>
    );
}
```

- [ ] **Step 10: Run the sheet tests**

Run: `npx vitest run components/feed/edit/FeedAddSectionSheet.test.tsx`
Expected: PASS.

- [ ] **Step 11: The story** (`components/feed/edit/FeedAddSectionSheet.stories.tsx`)

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { FeedAddSectionSheet } from '@/components/feed/edit/FeedAddSectionSheet';
import { defaultFeedLayout, wallThemeDesign } from '@/lib/feedLayout';
import { feedSectionPreview } from '@/lib/feedSectionPreview';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import { buildRenderContext } from '@/lib/invitation/render';

const ctx = { ...buildRenderContext(defaultFeedLayout(), { ...wallThemeDesign(null), textAnimation: 'none' }, () => undefined), labels: INVITATION_LABELS.en };
const types = ['coupleNames', 'dressCode', 'faq'] as const;

const meta = {
    title: 'Feed/Edit/FeedAddSectionSheet',
    component: FeedAddSectionSheet,
    args: {
        open: true,
        previews: { items: types.map((type) => ({ type, section: feedSectionPreview(type, null, 'WEDDING') })), ctx, lang: 'en', fontFaces: '' },
        onAdd: fn(),
        onClose: fn(),
    },
} satisfies Meta<typeof FeedAddSectionSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cards: Story = {};
export const NothingToAdd: Story = { args: { previews: { items: [], ctx, lang: 'en', fontFaces: '' } } };
```

- [ ] **Step 12: Edit mode uses the cards**

In `FeedEditTop.tsx`: replace the `AddSectionSheet` import with `import { FeedAddSectionSheet } from '@/components/feed/edit/FeedAddSectionSheet';`, import `useFeedSectionPreviews` from `@/hooks/useFeedSectionPreviews`, add after the `useFeedBlockActions` line:

```ts
    const sectionPreviews = useFeedSectionPreviews({
        types: actions.addable,
        themeSlug: session.themeSlug,
        document: session.document,
        theme: session.theme,
        media: session.media,
        eventType: event.eventType,
        enabled: actions.adding,
    });
```

and replace the `<AddSectionSheet ... />` element with:

```tsx
            <FeedAddSectionSheet open={actions.adding} previews={sectionPreviews} onAdd={actions.add} onClose={actions.closeAdd} />
```

- [ ] **Step 13: Run the edit tests and the editor's own Add section tests**

Run: `npx vitest run components/feed lib/feedSectionPreview.test.ts components/saveMyDate/editor "app/(main)/(app)/(event)/events/[eventId]/feed"`
Expected: PASS (`AddSectionSheet` and its tests untouched).

- [ ] **Step 14: Commit**

```bash
git add lib/feedSectionPreview.ts lib/feedSectionPreview.test.ts hooks/useFeedSectionPreviews.ts components/feed/edit/FeedSectionCard.tsx components/feed/edit/FeedAddSectionSheet.tsx components/feed/edit/FeedAddSectionSheet.test.tsx components/feed/edit/FeedAddSectionSheet.stories.tsx components/feed/edit/FeedEditTop.tsx
git commit -m "KAN-245: pick a section to add from cards with a live picture

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Theme pill, theme sheet and the Background row

**Files:**
- Create: `components/feed/edit/FeedBackgroundSetting.tsx`, `FeedBackgroundSetting.stories.tsx`
- Create: `components/feed/edit/FeedThemeSheet.tsx`, `FeedThemeSheet.test.tsx`
- Modify: `components/feed/edit/FeedEditPills.tsx`, `FeedEditPills.stories.tsx`
- Modify: `messages/en.json`, `messages/el.json` (`FeedEditor.background.tooDark`)
- Modify: `components/feed/edit/FeedEditTop.tsx` (final version below)

- [ ] **Step 1: Write the failing sheet tests** (`components/feed/edit/FeedThemeSheet.test.tsx`)

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedThemeSheet } from '@/components/feed/edit/FeedThemeSheet';
import type { ThemeRadioOption } from '@/components/manage/ThemePresetRadioGroup';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

afterEach(cleanup);

const options: ThemeRadioOption[] = [
    { id: 'none', presetId: null, label: 'No theme', backgroundColor: null, illustrationUrl: null, titleColor: null, headingFont: null, selected: true },
    { id: 'invitation:rose', presetId: 'invitation:rose', label: 'Rose', backgroundColor: '#EEDDCC', illustrationUrl: null, titleColor: null, headingFont: null, selected: false },
];

function renderSheet(background?: string, themes: ThemeRadioOption[] = options) {
    const props = { onSelect: vi.fn(), onBackground: vi.fn() };
    render(
        <FeedThemeSheet
            open
            isDesktop={false}
            options={themes}
            fontFaces=""
            hasInvitationThemes={false}
            disabled={false}
            previewTitle="Wedding"
            background={background}
            onSelect={props.onSelect}
            onBackground={props.onBackground}
            onClose={vi.fn()}
        />,
    );
    return props;
}

describe('FeedThemeSheet', () => {
    it('lists the themes under the Theme title and sends a pick', () => {
        const { onSelect } = renderSheet();
        expect(screen.getByRole('dialog', { name: 'theme' })).toBeTruthy();
        fireEvent.click(screen.getByRole('radio', { name: /Rose/ }));
        expect(onSelect).toHaveBeenCalledWith('invitation:rose');
    });

    it('sets the background colour, and Default clears it', () => {
        const { onBackground } = renderSheet('#F5E6D3');
        fireEvent.change(screen.getByLabelText('sectionSettings.background'), { target: { value: '#aabbcc' } });
        expect(onBackground).toHaveBeenCalledWith('#aabbcc');
        fireEvent.click(screen.getByRole('button', { name: 'lineHeightDefault' }));
        expect(onBackground).toHaveBeenLastCalledWith(undefined);
    });

    it('offers no Default without a colour', () => {
        renderSheet();
        expect(screen.queryByRole('button', { name: 'lineHeightDefault' })).toBeNull();
    });

    it('warns while the colour is too dark for the text', () => {
        renderSheet('#000000');
        expect(screen.getByText('tooDark')).toBeTruthy();
        cleanup();
        renderSheet('#F5E6D3');
        expect(screen.queryByText('tooDark')).toBeNull();
    });

    it('holds just the Background row for an event with no themes to pick', () => {
        renderSheet(undefined, []);
        expect(screen.queryByRole('radiogroup')).toBeNull();
        expect(screen.getByLabelText('sectionSettings.background')).toBeTruthy();
    });
});
```

If `ThemePresetRadioGroup`'s cards name their radios differently (check `components/manage/ThemePresetOption.tsx` for the accessible name), match `/Rose/` against what it renders.

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run components/feed/edit/FeedThemeSheet.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: The Background row** (`components/feed/edit/FeedBackgroundSetting.tsx`)

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useId } from 'react';

import { SettingsRow } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { tooDarkForInk } from '@/lib/contrast';
import { colorInputValue } from '@/lib/invitation/colorInput';

type FeedBackgroundSettingProps = { value: string | undefined; onChange: (color: string | undefined) => void };

// The feed's one background colour. Default (only while one is set) clears overrides.backgroundColor and goes
// back to the theme's backgrounds. A colour too dark for ink text is drawn lighter (readableOnInk); the row says so.
export function FeedBackgroundSetting({ value, onChange }: FeedBackgroundSettingProps) {
    const t = useTranslations('InvitationEditor');
    const tBackground = useTranslations('FeedEditor.background');
    const id = useId();
    const change = useCallback((event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value), [onChange]);
    const reset = useCallback(() => onChange(undefined), [onChange]);
    const tooDark = value !== undefined && tooDarkForInk(value);

    return (
        <div className="flex flex-col gap-1.5">
        <SettingsRow label={t('sectionSettings.background')} htmlFor={id}>
            <div className="flex shrink-0 items-center gap-1.5">
                {value !== undefined && (
                    <button
                        type="button"
                        onClick={reset}
                        className="h-9 rounded-lg px-2 text-[12px] text-(--smd-editor-muted) hover:bg-white/10 hover:text-(--smd-editor-text) focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                        {t('lineHeightDefault')}
                    </button>
                )}
                <input
                    id={id}
                    type="color"
                    value={colorInputValue(value, '#FFFFFF')}
                    onChange={change}
                    className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-white/20 bg-transparent p-0.5"
                />
            </div>
        </SettingsRow>

        {/* Too dark */}
        {tooDark && (
            <p role="status" className="text-[12px] text-(--smd-editor-muted)">
                {tBackground('tooDark')}
            </p>
        )}
        </div>
    );
}
```

Run `npx prettier --write components/feed/edit/FeedBackgroundSetting.tsx` after writing it (it re-indents the row inside the wrapper).

Add the approved warning to the messages. In `messages/en.json` the `FeedEditor` object becomes:

```json
    "FeedEditor": {
        "background": {
            "tooDark": "Too dark for the text. A lighter shade will be shown."
        },
        "edit": "Edit",
        "saveFailed": "Couldn't save your changes. Please try again."
    },
```

In `messages/el.json`:

```json
    "FeedEditor": {
        "background": {
            "tooDark": "Πολύ σκούρο για το κείμενο. Θα εμφανιστεί μια πιο ανοιχτή απόχρωση."
        },
        "edit": "Επεξεργασία",
        "saveFailed": "Δεν ήταν δυνατή η αποθήκευση των αλλαγών. Δοκιμάστε ξανά."
    },
```

If the repo has a test that checks en and el carry the same keys (`grep -rln "el.json" lib --include=*.test.ts`), add it to the Step 5 run.
```

`FeedBackgroundSetting.stories.tsx`:

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { withEditorChrome } from '@/.storybook/editor';
import { FeedBackgroundSetting } from '@/components/feed/edit/FeedBackgroundSetting';

const meta = {
    title: 'Feed/Edit/FeedBackgroundSetting',
    component: FeedBackgroundSetting,
    decorators: [withEditorChrome],
    args: { value: undefined, onChange: fn() },
} satisfies Meta<typeof FeedBackgroundSetting>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThemeBackgrounds: Story = {};
export const Picked: Story = { args: { value: '#F5E6D3' } };
export const TooDark: Story = { args: { value: '#1B2A4A' } };
```

- [ ] **Step 4: The theme sheet** (`components/feed/edit/FeedThemeSheet.tsx`)

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { FeedBackgroundSetting } from '@/components/feed/edit/FeedBackgroundSetting';
import { FeedEditSheetFrame } from '@/components/feed/edit/FeedEditSheetFrame';
import { InvitationFontFaces } from '@/components/manage/InvitationFontFaces';
import { type ThemeRadioOption, ThemePresetRadioGroup } from '@/components/manage/ThemePresetRadioGroup';

type FeedThemeSheetProps = {
    open: boolean;
    isDesktop: boolean;
    options: ThemeRadioOption[];
    fontFaces: string;
    hasInvitationThemes: boolean;
    disabled: boolean;
    previewTitle: string;
    background: string | undefined;
    onSelect: (choice: string | null) => void;
    onBackground: (color: string | undefined) => void;
    onClose: () => void;
};

// Edit mode's Theme sheet: every theme the feed can wear (maybe none), then its one background colour.
// Picks are held until Save.
export function FeedThemeSheet({
    open,
    isDesktop,
    options,
    fontFaces,
    hasInvitationThemes,
    disabled,
    previewTitle,
    background,
    onSelect,
    onBackground,
    onClose,
}: FeedThemeSheetProps) {
    const t = useTranslations('ManagePage.sections');
    const titleId = useId();

    return (
        <FeedEditSheetFrame open={open} title={t('theme')} titleId={titleId} isDesktop={isDesktop} onClose={onClose}>
            <div className="flex flex-col gap-5">
                {/* Theme fonts */}
                {hasInvitationThemes && <InvitationFontFaces css={fontFaces} />}

                {/* Themes: none for an event with neither wall themes nor Save my date themes */}
                {options.length > 0 && (
                    <ThemePresetRadioGroup
                        options={options}
                        labelledBy={titleId}
                        disabled={disabled}
                        size="large"
                        previewTitle={previewTitle}
                        onSelectAction={onSelect}
                    />
                )}

                {/* Background */}
                <FeedBackgroundSetting value={background} onChange={onBackground} />
            </div>
        </FeedEditSheetFrame>
    );
}
```

- [ ] **Step 5: Run the sheet tests**

Run: `npx vitest run components/feed/edit/FeedThemeSheet.test.tsx lib/contrast.test.ts`
Expected: PASS.

- [ ] **Step 6: The Theme pill**

In `FeedEditPills.tsx`: add `onTheme?: () => void` to the props type and parameter list, add `const tManage = useTranslations('ManagePage.sections');`, and put the pill first inside the actions row:

```tsx
                {/* Theme: always in edit mode (the sheet holds at least the Background row); optional for the stories */}
                {onTheme && (
                    <button
                        type="button"
                        onClick={onTheme}
                        disabled={saving}
                        className="h-9 rounded-full bg-background/92 px-3.5 text-sm font-semibold text-ink shadow-[0_8px_22px_rgba(36,31,26,0.18)] disabled:opacity-60"
                    >
                        {tManage('theme')}
                    </button>
                )}
```

In `FeedEditPills.stories.tsx` add:

```tsx
export const WithTheme: Story = { args: { onTheme: fn() } };
```

- [ ] **Step 7: Wire edit mode** (replace `components/feed/edit/FeedEditTop.tsx` with the final version)

```tsx
'use client';

import { closestCenter, DndContext } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTranslations } from 'next-intl';
import type { ReactNode, Ref } from 'react';

import { FeedAddSectionRow } from '@/components/feed/edit/FeedAddSectionRow';
import { FeedAddSectionSheet } from '@/components/feed/edit/FeedAddSectionSheet';
import { FeedBlockPlaceholder } from '@/components/feed/edit/FeedBlockPlaceholder';
import { FeedBlockSheet } from '@/components/feed/edit/FeedBlockSheet';
import { FeedEditBlock } from '@/components/feed/edit/FeedEditBlock';
import { FeedEditInvitationSection } from '@/components/feed/edit/FeedEditInvitationSection';
import { FeedEditPills } from '@/components/feed/edit/FeedEditPills';
import { FeedThemeSheet } from '@/components/feed/edit/FeedThemeSheet';
import { FeedLook, FeedNative } from '@/components/feed/layout/FeedLook';
import { feedLookParts } from '@/components/feed/layout/FeedLookTop';
import { FeedTopFrame, type FeedTopParts, type FeedTopProps, PLAIN_PARTS } from '@/components/feed/layout/FeedTopFrame';
import { SettingsPartEditor } from '@/components/manage/settings/SettingsPartEditor';
import { EditorConflictDialog } from '@/components/saveMyDate/editor/EditorConflictDialog';
import { EditorLeaveDialog } from '@/components/saveMyDate/editor/EditorLeaveDialog';
import { DeleteSectionDialog } from '@/components/saveMyDate/editor/sections/DeleteSectionDialog';
import { InlineTextEditing } from '@/components/saveMyDate/editor/text/InlineTextEditing';
import { useInvitationFonts } from '@/hooks/useAdminInvitationThemes';
import { useFeedBlockActions } from '@/hooks/useFeedBlockActions';
import type { FeedBlockToolActions } from '@/hooks/useFeedBlockHandlers';
import { useFeedBlockSheet } from '@/hooks/useFeedBlockSheet';
import { useFeedEditPanels } from '@/hooks/useFeedEditPanels';
import { useFeedEditSession } from '@/hooks/useFeedEditSession';
import { useFeedEditThemeGrid } from '@/hooks/useFeedEditThemeGrid';
import { useEditPageTheme } from '@/hooks/useFeedPageTheme';
import { useFeedSectionPreviews } from '@/hooks/useFeedSectionPreviews';
import { useFeedTop } from '@/hooks/useFeedTop';
import { useSectionDrag } from '@/hooks/useSectionDrag';
import { useSettingsPreview } from '@/hooks/useSettingsPreview';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { themePreviewTitle } from '@/lib/eventTheme';
import { feedBlockControls } from '@/lib/feedEditing';
import type { NewSectionType } from '@/lib/invitation/newSection';
import type { FeedSectionType, InvitationSection, SectionType } from '@/lib/invitation/sections';

const MODIFIERS = [restrictToVerticalAxis];

// cancelRef: the Cancel pill, which takes focus as edit mode opens.
type FeedEditTopProps = Omit<FeedTopProps, 'view'> & { event: EventDetailResponseDto; onDone: () => void; cancelRef?: Ref<HTMLButtonElement> };

// SectionType also holds the footer, which a feed never has.
type FeedNameKey = `sectionNames.${NewSectionType | FeedSectionType}`;
const nameKey = (type: SectionType) => `sectionNames.${type}` as FeedNameKey;

// The top of the feed in edit mode: the same frame as the feed, every block with its tools, Save my date
// text typed in place, the Add section row closing the middle, and the Theme sheet. All held until Save.
export function FeedEditTop({ event, onDone, cancelRef, cover, details, stories, description, rsvp }: FeedEditTopProps) {
    const t = useTranslations('InvitationEditor');
    const session = useFeedEditSession(event, onDone);
    const view = useFeedTop(event, { document: session.document, theme: session.theme, media: session.media });
    useEditPageTheme(event.id, session.wallTheme, session.background);
    const fonts = useInvitationFonts(true);
    const actions = useFeedBlockActions(session.store, session.document, event);
    const sectionPreviews = useFeedSectionPreviews({
        types: actions.addable,
        themeSlug: session.themeSlug,
        document: session.document,
        theme: session.theme,
        media: session.media,
        eventType: event.eventType,
        enabled: actions.adding,
    });
    const preview = useSettingsPreview(event, true, true);
    const sheet = useFeedBlockSheet(session.store, session.document, session.theme, session.media, fonts.data, preview.parts);
    const panels = useFeedEditPanels(sheet.openFor, sheet.close);
    const themeGrid = useFeedEditThemeGrid(event, session);
    const middleIds = view.frame.middle.map((section) => section.id);
    const drag = useSectionDrag(middleIds.length, actions.reorder);

    const tools: FeedBlockToolActions = {
        onToggleVisible: actions.toggleVisible,
        onMove: actions.move,
        onDelete: actions.askDelete,
        onOpenSettings: panels.openSettings,
    };
    const pills = (
        <FeedEditPills
            saving={session.saving}
            failed={session.failed}
            onTheme={panels.openTheme}
            onCancel={session.cancel}
            onSave={session.save}
            cancelRef={cancelRef}
        />
    );

    const wrap = (section: InvitationSection, node: ReactNode) => (
        <FeedEditBlock
            key={section.id}
            section={section}
            name={t(nameKey(section.type))}
            controls={feedBlockControls(session.document.sections, section)}
            hasSettings={sheet.hasSettings(section)}
            actions={tools}
            active={sheet.section?.id === section.id}
            corner={section.type === 'feedCover' ? pills : undefined}
        >
            {node}
        </FeedEditBlock>
    );
    const base = view.look ? feedLookParts(view) : PLAIN_PARTS;
    const parts: FeedTopParts = {
        // The feed's own blocks are set on the event, not typed here: their content takes no taps.
        block: (section, content) => wrap(section, base.block(section, <div inert>{content}</div>)),
        native: base.native,
        // Save my date blocks read the text editor's drawing from inside InlineTextEditing, so their text is typed in place.
        invitation: (section) =>
            wrap(
                section,
                view.look ? (
                    <FeedEditInvitationSection section={section} index={view.sections.indexOf(section)} ctx={view.ctx} />
                ) : (
                    base.invitation(section)
                ),
            ),
    };

    const frame = (
        <FeedTopFrame
            view={view}
            parts={parts}
            cover={cover}
            details={details}
            stories={stories}
            description={description || <FeedBlockPlaceholder name={t('sectionNames.feedDescription')} />}
            rsvp={rsvp ?? <FeedBlockPlaceholder name={t('sectionNames.feedRsvp')} />}
            afterMiddle={
                actions.showAdd && (
                    <FeedNative className="font-sans">
                        <FeedAddSectionRow onAdd={actions.openAdd} />
                    </FeedNative>
                )
            }
        />
    );

    return (
        <InlineTextEditing store={session.store} document={session.document} theme={session.theme} uploadedFonts={fonts.data}>
            {/* Blocks */}
            <DndContext
                sensors={drag.sensors}
                collisionDetection={closestCenter}
                modifiers={MODIFIERS}
                accessibility={drag.accessibility}
                onDragEnd={drag.onDragEnd}
            >
                <SortableContext items={middleIds} strategy={verticalListSortingStrategy}>
                    {/* Its own stacking context: the tools stay under the feed's sticky header. */}
                    <div className="isolate">
                        {view.look ? (
                            <FeedLook ctx={view.ctx} lang={view.lang} fontFaces={view.fontFaces}>
                                {frame}
                            </FeedLook>
                        ) : (
                            frame
                        )}
                    </div>
                </SortableContext>
            </DndContext>

            {/* Block settings */}
            <FeedBlockSheet
                title={sheet.section ? t(nameKey(sheet.section.type)) : ''}
                open={sheet.section !== null}
                scope={sheet.scope}
                groups={sheet.groups}
                parts={sheet.parts}
                partLabels={preview.labels}
                isDesktop={preview.isDesktop}
                onOpenPart={preview.openEditor}
                onClose={sheet.close}
            />
            <SettingsPartEditor
                event={event}
                part={preview.openPart}
                label={preview.openPart ? preview.labels[preview.openPart] : ''}
                isDesktop={false}
                canUploadCover={preview.canUploadCover}
                onCloseAction={preview.closeEditor}
            />

            {/* Theme */}
            <FeedThemeSheet
                open={panels.themeOpen}
                isDesktop={preview.isDesktop}
                options={themeGrid.options}
                fontFaces={themeGrid.fontFaces}
                hasInvitationThemes={themeGrid.hasInvitationThemes}
                disabled={themeGrid.disabled}
                previewTitle={themePreviewTitle(event.title)}
                background={session.background}
                onSelect={themeGrid.select}
                onBackground={session.setBackground}
                onClose={panels.closeTheme}
            />

            {/* Add section */}
            <FeedAddSectionSheet open={actions.adding} previews={sectionPreviews} onAdd={actions.add} onClose={actions.closeAdd} />

            {/* Delete */}
            <DeleteSectionDialog
                open={actions.remove.isOpen}
                sectionName={actions.remove.sectionType ? t(nameKey(actions.remove.sectionType)) : ''}
                onDelete={actions.remove.confirm}
                onCancel={actions.remove.cancel}
                finalFocus={actions.remove.finalFocus}
            />

            {/* Leave with changes */}
            <EditorLeaveDialog open={session.leaving} onLeave={session.leave} onStay={session.stay} />

            {/* Saved elsewhere */}
            <EditorConflictDialog open={session.conflict} isReloading={session.reloading} onReload={session.reload} />
        </InlineTextEditing>
    );
}
```

`themePreviewTitle` is already exported from `lib/eventTheme.ts` (FeedThemePicker uses it).

- [ ] **Step 8: Run the edit tests**

Run: `npx vitest run components/feed "app/(main)/(app)/(event)/events/[eventId]/feed" hooks`
Expected: PASS. (The Theme pill now always shows in edit mode; the feed page tests find buttons by name, so an extra "theme" button changes none of them. The catalogue fetch the grid starts there fails quietly.)

- [ ] **Step 9: Types and lint**

Run: `npx tsc --noEmit -p . && npx eslint components/feed hooks lib`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add messages/en.json messages/el.json components/feed/edit/FeedBackgroundSetting.tsx components/feed/edit/FeedBackgroundSetting.stories.tsx components/feed/edit/FeedThemeSheet.tsx components/feed/edit/FeedThemeSheet.test.tsx components/feed/edit/FeedEditPills.tsx components/feed/edit/FeedEditPills.stories.tsx components/feed/edit/FeedEditTop.tsx
git commit -m "KAN-245: pick the theme and background colour in edit mode

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: The Overview banner's rule

**Files:**
- Create: `lib/feedEditBanner.ts`, `lib/feedEditBanner.test.ts`
- Create: `hooks/useFeedEditBanner.ts`, `hooks/useFeedEditBanner.test.tsx`

- [ ] **Step 1: Write the failing rule tests** (`lib/feedEditBanner.test.ts`)

```ts
import { describe, expect, it } from 'vitest';

import { type FeedEditBannerInput, feedEditBannerState } from '@/lib/feedEditBanner';

const locked: FeedEditBannerInput = { flag: true, saveMyDate: false, writable: true, offered: true, checkout: true, canBuy: true, paused: false };

describe('feedEditBannerState', () => {
    it('invites a main host to unlock Save my date', () => {
        expect(feedEditBannerState(locked)).toBe('locked');
    });

    it('needs every condition for the lock', () => {
        for (const change of [{ offered: false }, { checkout: false }, { canBuy: false }, { paused: true }]) {
            expect(feedEditBannerState({ ...locked, ...change })).toBeNull();
        }
    });

    it('invites a host with Save my date to start editing, on a writable event', () => {
        expect(feedEditBannerState({ ...locked, saveMyDate: true, canBuy: false, offered: false })).toBe('included');
        expect(feedEditBannerState({ ...locked, saveMyDate: true, writable: false })).toBeNull();
    });

    it('shows nothing with the flag off', () => {
        expect(feedEditBannerState({ ...locked, flag: false })).toBeNull();
        expect(feedEditBannerState({ ...locked, flag: false, saveMyDate: true })).toBeNull();
    });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run lib/feedEditBanner.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the rule** (`lib/feedEditBanner.ts`; Task 17 adds the preview look to this file)

```ts
// The Overview's invitation to customize the feed (KAN-245). 'locked': the event has no Save my date and the
// main host can buy it now; 'included': it has Save my date, so hosts can start editing. Any event type: one
// without Save my date themes still gets edit mode.
export type FeedEditBannerState = 'locked' | 'included' | null;

export type FeedEditBannerInput = {
    // The feed editor is released here (FEED_EDITOR_LAUNCHED).
    flag: boolean;
    // The save_my_date module is available on the event.
    saveMyDate: boolean;
    // The event can be changed (isEventWritable).
    writable: boolean;
    // The event's plan sells the Save my date add-on.
    offered: boolean;
    // A live event: add-ons are bought on their own (featureAddonMode 'checkout').
    checkout: boolean;
    // The viewer may buy: the main host, not the demo, not incident mode.
    canBuy: boolean;
    // A withdrawal under review pauses purchases.
    paused: boolean;
};

export function feedEditBannerState(input: FeedEditBannerInput): FeedEditBannerState {
    if (!input.flag) return null;
    if (input.saveMyDate) return input.writable ? 'included' : null;
    return input.offered && input.checkout && input.canBuy && !input.paused ? 'locked' : null;
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run lib/feedEditBanner.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing hook tests** (`hooks/useFeedEditBanner.test.tsx`)

```tsx
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeedEditBanner } from '@/hooks/useFeedEditBanner';
import type { EventDetailResponseDto, PaidServiceResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';

const mocks = vi.hoisted(() => ({ flag: true, block: null as string | null, paused: false, addon: { code: 'SMD' } as { code: string } | null }));

vi.mock('@/providers/FeedEditorFlagProvider', () => ({ useFeedEditorEnabled: () => mocks.flag }));
vi.mock('@/hooks/usePurchaseBlock', () => ({ usePurchaseBlock: () => mocks.block }));
vi.mock('@/hooks/useBillingWithdrawals', () => ({ useStoragePurchasePaused: () => mocks.paused }));
vi.mock('@/lib/featureAddons', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/featureAddons')>();
    return { ...actual, saveMyDateAddon: () => mocks.addon };
});

function event(saveMyDate: boolean, eventType = 'WEDDING') {
    return {
        id: 'e-1',
        eventType,
        modules: saveMyDate ? [{ moduleKey: 'save_my_date', isAvailable: true, isEnabled: true }] : [],
    } as unknown as EventDetailResponseDto;
}

function render(saveMyDate: boolean, eventType?: string) {
    return renderHook(() =>
        useFeedEditBanner({
            event: event(saveMyDate, eventType),
            eventStatus: 'ACTIVE',
            paidServices: [] as PaidServiceResponseDto[],
            modules: [] as PlatformModuleResponseDto[],
            currentPlan: undefined,
        }),
    ).result.current;
}

beforeEach(() => {
    mocks.flag = true;
    mocks.block = null;
    mocks.paused = false;
    mocks.addon = { code: 'SMD' };
});

describe('useFeedEditBanner', () => {
    it('links the lock to the add-on', () => {
        expect(render(false)).toEqual({ state: 'locked', href: '/events/e-1/settings/addons?add=SMD' });
    });

    it('links Start editing to edit mode', () => {
        expect(render(true)).toEqual({ state: 'included', href: '/events/e-1/feed?edit=blocks' });
    });

    it('shows both banners on an event type without Save my date themes', () => {
        expect(render(false, 'BIRTHDAY').state).toBe('locked');
        expect(render(true, 'BIRTHDAY').state).toBe('included');
    });

    it('shows no lock to someone who cannot buy, or while purchases are paused', () => {
        mocks.block = 'primaryHostOnly';
        expect(render(false).state).toBeNull();
        mocks.block = null;
        mocks.paused = true;
        expect(render(false).state).toBeNull();
    });
});
```

The two hrefs assume `eventBasePath(id)` is `/events/{id}`; if it isn't, use `routes.events.settingsAddons('e-1', { add: 'SMD' })` and `feedEditHref('e-1')` in the expectations.

- [ ] **Step 6: Run it to see it fail**

Run: `npx vitest run hooks/useFeedEditBanner.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 7: Implement the hook** (`hooks/useFeedEditBanner.ts`)

```ts
'use client';

import { useStoragePurchasePaused } from '@/hooks/useBillingWithdrawals';
import { usePurchaseBlock } from '@/hooks/usePurchaseBlock';
import type { EventDetailResponseDto, EventStatus, PaidServiceResponseDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';
import { isEventWritable, isModuleAvailable } from '@/lib/eventLifecycle';
import { featureAddonMode, saveMyDateAddon } from '@/lib/featureAddons';
import { feedEditBannerState } from '@/lib/feedEditBanner';
import { feedEditHref } from '@/lib/feedEditLink';
import { INCIDENT_MODE } from '@/lib/incident';
import { routes } from '@/lib/routes';
import { useFeedEditorEnabled } from '@/providers/FeedEditorFlagProvider';

type FeedEditBannerInput = {
    event: Pick<EventDetailResponseDto, 'id' | 'modules'>;
    eventStatus: EventStatus;
    paidServices: PaidServiceResponseDto[];
    modules: PlatformModuleResponseDto[];
    currentPlan: PlanTierResponseDto | null | undefined;
};

// Which Overview banner shows, and where its button goes. usePurchaseBlock is null only for the main host
// outside the demo, the same viewers usePlanUpgradeHref answers for. The event type plays no part.
export function useFeedEditBanner({ event, eventStatus, paidServices, modules, currentPlan }: FeedEditBannerInput) {
    const flag = useFeedEditorEnabled();
    const purchaseBlock = usePurchaseBlock();
    const saveMyDate = isModuleAvailable(event.modules, 'save_my_date');
    const addon = saveMyDateAddon(paidServices, modules, currentPlan);
    const checkout = featureAddonMode(eventStatus) === 'checkout';
    const canBuy = purchaseBlock === null && !INCIDENT_MODE;
    const asksToBuy = flag && !saveMyDate && addon !== null && checkout && canBuy;
    const paused = useStoragePurchasePaused(event.id, asksToBuy);

    const state = feedEditBannerState({ flag, saveMyDate, writable: isEventWritable(eventStatus), offered: addon !== null, checkout, canBuy, paused });
    const href =
        state === 'locked' && addon ? routes.events.settingsAddons(event.id, { add: addon.code }) : state === 'included' ? feedEditHref(event.id) : null;
    return { state, href };
}
```

- [ ] **Step 8: Run it to see it pass**

Run: `npx vitest run hooks/useFeedEditBanner.test.tsx lib/feedEditBanner.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/feedEditBanner.ts lib/feedEditBanner.test.ts hooks/useFeedEditBanner.ts hooks/useFeedEditBanner.test.tsx
git commit -m "KAN-245: when the Overview invites hosts to customize the feed

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: The Overview banner

**Files:**
- Modify: `lib/feedEditBanner.ts`, `lib/feedEditBanner.test.ts` (preview look)
- Create: `hooks/useFeedEditBannerPreview.ts`
- Create: `components/manage/overview/FeedEditBanner.tsx`, `FeedEditBanner.test.tsx`, `FeedEditBanner.stories.tsx`
- Create: `components/manage/overview/FeedEditBannerPreview.tsx`, `FeedEditBannerSection.tsx`
- Modify: `app/(main)/(app)/(event)/events/[eventId]/manage/OverviewTab.tsx`, `OverviewTab.test.tsx`, `OverviewTab.themePicker.test.tsx`
- Modify: `messages/en.json`, `messages/el.json`

- [ ] **Step 1: The approved strings**

Task 15 added `background`; add `banner` beside it. In `messages/en.json`, the `FeedEditor` object becomes:

```json
    "FeedEditor": {
        "background": {
            "tooDark": "Too dark for the text. A lighter shade will be shown."
        },
        "banner": {
            "previewAlt": "Preview of your invitation",
            "startEditing": "Start editing",
            "title": "Want more customization?",
            "unlock": "Unlock"
        },
        "edit": "Edit",
        "saveFailed": "Couldn't save your changes. Please try again."
    },
```

In `messages/el.json`:

```json
    "FeedEditor": {
        "background": {
            "tooDark": "Πολύ σκούρο για το κείμενο. Θα εμφανιστεί μια πιο ανοιχτή απόχρωση."
        },
        "banner": {
            "previewAlt": "Προεπισκόπηση της πρόσκλησής σας",
            "startEditing": "Ξεκινήστε την επεξεργασία",
            "title": "Θέλετε περισσότερες επιλογές προσαρμογής;",
            "unlock": "Ξεκλείδωμα"
        },
        "edit": "Επεξεργασία",
        "saveFailed": "Δεν ήταν δυνατή η αποθήκευση των αλλαγών. Δοκιμάστε ξανά."
    },
```

- [ ] **Step 2: Write the failing preview look test** (append to `lib/feedEditBanner.test.ts`; import `feedEditBannerLook` from `@/lib/feedEditBanner`, `readFeedLayout` from `@/lib/feedLayout`, `SAMPLE_DOCUMENT, SAMPLE_THEME` from `@/lib/invitation/samples`, type `InvitationThemePublicDto` from `@/lib/invitation/themePreview`)

```ts
describe('feedEditBannerLook', () => {
    const rose = { slug: 'rose', name: 'Rose', eventType: 'WEDDING', design: SAMPLE_THEME, document: SAMPLE_DOCUMENT, assetUrls: {} } as unknown as InvitationThemePublicDto;

    it("draws the layout's own Save my date theme", () => {
        const layout = { ...readFeedLayout(null, null), themeSlug: 'own', theme: SAMPLE_THEME };
        expect(feedEditBannerLook(layout, rose)).toMatchObject({ kind: 'invitation', theme: SAMPLE_THEME });
    });

    it('puts a wall layout on the fallback theme', () => {
        const look = feedEditBannerLook(readFeedLayout(null, null), rose);
        expect(look.kind).toBe('invitation');
        if (look.kind !== 'invitation') return;
        expect(look.document.themeId).toBe(SAMPLE_DOCUMENT.themeId);
        expect(look.cover.type).toBe('feedCover');
    });

    it("draws the event's wall look when the event type has no Save my date theme", () => {
        expect(feedEditBannerLook(readFeedLayout(null, null), undefined)).toEqual({ kind: 'wall' });
    });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run lib/feedEditBanner.test.ts`
Expected: FAIL, `feedEditBannerLook` is not exported.

(`readFeedLayout`'s real arguments are in `lib/feedLayout.ts`; pass whatever gives the default layout on the wall theme, as the session tests' `saved` fixture does.)

- [ ] **Step 4: Implement the look** (append to `lib/feedEditBanner.ts`, with the imports at the top)

```ts
import { defaultFeedLayout, type FeedLayoutView } from '@/lib/feedLayout';
import { planFeedThemeSwitch } from '@/lib/feedThemes';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { MediaResolver } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { type InvitationThemePublicDto, readThemePreview } from '@/lib/invitation/themePreview';
import { themeImageIds } from '@/lib/invitation/themeSwitch';
```

```ts
export type FeedEditBannerLook =
    | { kind: 'invitation'; document: InvitationDocument; theme: ThemeDesign; media: MediaResolver; cover: InvitationSection }
    | { kind: 'wall' };

const WALL_LOOK: FeedEditBannerLook = { kind: 'wall' };

// What the banner's picture draws: the event's cover in the layout's own Save my date theme, or, on the wall
// theme, in the stand-in theme (`fallback`, the catalogue's first for the event type). Without one (an event
// type with no Save my date themes, or one that doesn't load or read), the cover in the event's wall look.
export function feedEditBannerLook(layout: FeedLayoutView, fallback: InvitationThemePublicDto | undefined): FeedEditBannerLook {
    const withCover = (document: InvitationDocument, theme: ThemeDesign, media: MediaResolver): FeedEditBannerLook => {
        const cover = document.sections.find((section) => section.type === 'feedCover');
        return cover ? { kind: 'invitation', document, theme, media, cover } : WALL_LOOK;
    };
    if (layout.themeSlug) return withCover(layout.document, layout.theme, layout.media);
    if (!fallback) return WALL_LOOK;
    try {
        const preview = readThemePreview(fallback);
        const document = planFeedThemeSwitch(defaultFeedLayout(), { ...preview, imageIds: themeImageIds(fallback.assetUrls) }, new Set());
        return withCover(document, preview.theme, preview.media);
    } catch {
        return WALL_LOOK;
    }
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `npx vitest run lib/feedEditBanner.test.ts`
Expected: PASS.

- [ ] **Step 6: The preview hook** (`hooks/useFeedEditBannerPreview.ts`)

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { useMemo } from 'react';

import { useInvitationFonts } from '@/hooks/useAdminInvitationThemes';
import { useFeedLayout } from '@/hooks/useFeedLayout';
import { useInvitationThemeCatalogue } from '@/hooks/useInvitationThemeCatalogue';
import { fetchInvitationTheme } from '@/hooks/useInvitationThemeCards';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { eventThemeStyle } from '@/lib/eventTheme';
import { feedEditBannerLook } from '@/lib/feedEditBanner';
import { feedPageTheme } from '@/lib/feedPageTheme';
import { INVITATION_LABELS } from '@/lib/invitation/labels';
import { buildRenderContext } from '@/lib/invitation/render';
import { invitationThemeKeys, isCatalogueEventType } from '@/lib/invitation/themeCatalogue';
import { uploadedFontFaceCss } from '@/lib/invitation/uploadedFonts';

// The banner picture's data; null only while it is still loading. The Overview's server render prefetches the
// layout, the catalogue and the stand-in theme (manage/(root)/page.tsx), so on a full load it draws at once.
export function useFeedEditBannerPreview(event: EventDetailResponseDto) {
    const locale = useLocale();
    const layout = useFeedLayout(event, { enabled: true });
    const catalogueType = isCatalogueEventType(event.eventType);
    const catalogue = useInvitationThemeCatalogue({ enabled: catalogueType });
    const onWall = !layout.isLoading && layout.themeSlug === null;
    // The catalogue's first theme for the event type stands in for a feed on the wall theme.
    const fallbackSlug = catalogueType ? (catalogue.themes?.find((theme) => theme.eventType === event.eventType)?.slug ?? null) : null;
    const fallback = useQuery({
        queryKey: invitationThemeKeys.publicTheme(fallbackSlug ?? ''),
        queryFn: () => fetchInvitationTheme(fallbackSlug!),
        enabled: onWall && fallbackSlug !== null,
        staleTime: 5 * 60_000,
    });
    // A disabled query stays pending, so each wait names the fetch that really runs. A failed fetch draws the wall look.
    const waiting = layout.isLoading || (onWall && ((catalogueType && catalogue.isPending) || (fallbackSlug !== null && fallback.isPending)));
    const { document, theme, media, revision, themeSlug } = layout;
    const look = useMemo(
        () => (waiting ? null : feedEditBannerLook({ document, theme, media, revision, themeSlug }, fallback.data)),
        [waiting, document, theme, media, revision, themeSlug, fallback.data],
    );
    const fonts = useInvitationFonts(look?.kind === 'invitation');

    return useMemo(() => {
        if (!look) return null;
        if (look.kind === 'wall') {
            // The event's own wall theme, with the feed's background colour when it has one.
            const wall = feedPageTheme(event.theme, document.overrides.backgroundColor).theme;
            const style = eventThemeStyle(wall?.backgroundColor, { titleColor: wall?.titleColor, headingFont: wall?.headingFont });
            return { kind: 'wall' as const, event: { ...event, theme: wall }, style, headingFont: style ? (wall?.headingFont ?? null) : null };
        }
        const ctx = { ...buildRenderContext(look.document, { ...look.theme, textAnimation: 'none' }, look.media), labels: INVITATION_LABELS[locale === 'en' ? 'en' : 'el'] };
        return {
            kind: 'invitation' as const,
            ctx,
            cover: look.cover,
            index: look.document.sections.indexOf(look.cover),
            lang: locale,
            fontFaces: uploadedFontFaceCss(fonts.data ?? [], [look.document, look.theme]),
        };
    }, [look, event, document, fonts.data, locale]);
}
```

If `useInvitationThemeCatalogue` takes no options object today, give it an optional `{ enabled = true }` (it already passes `enabled` to its `useQuery`). If `FeedLayoutView` carries more fields than these five, spread `layout` minus `isLoading`/`isLoaded` instead.

- [ ] **Step 7: Write the failing banner tests** (`components/manage/overview/FeedEditBanner.test.tsx`)

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedEditBanner } from '@/components/manage/overview/FeedEditBanner';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

afterEach(cleanup);

describe('FeedEditBanner', () => {
    it('asks to unlock, with a lock', () => {
        const { container } = render(<FeedEditBanner state="locked" href="/events/e-1/settings/addons?add=SMD" illustration={<span />} />);
        expect(screen.getByRole('heading', { name: 'title' })).toBeTruthy();
        expect(screen.getByRole('link', { name: 'unlock' }).getAttribute('href')).toBe('/events/e-1/settings/addons?add=SMD');
        expect(container.querySelector('[data-banner-lock]')).not.toBeNull();
    });

    it('asks to start editing, without a lock', () => {
        const { container } = render(<FeedEditBanner state="included" href="/events/e-1/feed?edit=blocks" illustration={<span />} />);
        expect(screen.getByRole('link', { name: 'startEditing' }).getAttribute('href')).toBe('/events/e-1/feed?edit=blocks');
        expect(container.querySelector('[data-banner-lock]')).toBeNull();
    });

    it('names its picture', () => {
        render(<FeedEditBanner state="included" href="/x" illustration={<span />} />);
        expect(screen.getByRole('img', { name: 'previewAlt' })).toBeTruthy();
    });
});
```

`AppLink` may need a router mock; if the test fails on it, add `vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }), usePathname: () => '/' }));`.

- [ ] **Step 8: Run it to see it fail**

Run: `npx vitest run components/manage/overview/FeedEditBanner.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 9: The banner** (`components/manage/overview/FeedEditBanner.tsx`)

```tsx
'use client';

import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { AppLink } from '@/components/ui/AppLink';
import type { FeedEditBannerState } from '@/lib/feedEditBanner';

type FeedEditBannerProps = { state: Exclude<FeedEditBannerState, null>; href: string; illustration: ReactNode };

// The Overview's invitation to customize the feed: unlock Save my date, or start editing.
export function FeedEditBanner({ state, href, illustration }: FeedEditBannerProps) {
    const t = useTranslations('FeedEditor.banner');

    return (
        <section className="flex items-center gap-4 rounded-2xl bg-surface-muted p-4 sm:p-5">
            {/* Illustration: the event's cover in a Save my date theme, or in its wall look */}
            <div role="img" aria-label={t('previewAlt')} className="w-24 shrink-0 sm:w-28">
                <div className="-rotate-3 overflow-hidden rounded-xl shadow-[0_8px_22px_rgba(36,31,26,0.18)]">{illustration}</div>
            </div>

            {/* Message */}
            <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
                <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                    {state === 'locked' && <Lock data-banner-lock className="h-4 w-4 shrink-0" aria-hidden="true" />}
                    {t('title')}
                </h2>
                <AppLink
                    href={href}
                    className="inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold text-white bg-gradient-brand transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                    {state === 'locked' ? t('unlock') : t('startEditing')}
                </AppLink>
            </div>
        </section>
    );
}
```

Check `AppLink`'s props (`components/ui/AppLink.tsx`): it takes `href` and `className` like `next/link`.

- [ ] **Step 10: Run it to see it pass**

Run: `npx vitest run components/manage/overview/FeedEditBanner.test.tsx`
Expected: PASS.

- [ ] **Step 11: The lazy picture** (`components/manage/overview/FeedEditBannerPreview.tsx`)

```tsx
'use client';

import { ThemeFontFace } from '@/components/event/ThemeFontFace';
import { FeedBlockShell } from '@/components/feed/layout/FeedBlockShell';
import { FeedCoverBlock } from '@/components/feed/layout/FeedCoverBlock';
import { FeedLook, FeedNative } from '@/components/feed/layout/FeedLook';
import { useFeedEditBannerPreview } from '@/hooks/useFeedEditBannerPreview';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { themeFontScopeProps } from '@/lib/eventTheme';

// Only while the picture's data loads.
export function FeedEditBannerPlaceholder() {
    return <div className="aspect-[4/5] w-full bg-surface" />;
}

// The event's own cover, in a Save my date theme or, without one, in its wall look; drawn at four times the
// picture's width, then shrunk. Inert: nothing in it takes taps or focus.
export function FeedEditBannerPreview({ event }: { event: EventDetailResponseDto }) {
    const preview = useFeedEditBannerPreview(event);
    if (!preview) return <FeedEditBannerPlaceholder />;

    return (
        <div aria-hidden="true" inert className="pointer-events-none aspect-[4/5] w-full overflow-hidden">
            <div className="w-[400%] origin-top-left scale-25">
                {preview.kind === 'wall' ? (
                    // Wall look: the theme scope's colours and heading font, as on the feed itself
                    <div className="bg-event" style={preview.style} {...themeFontScopeProps(preview.headingFont)}>
                        <ThemeFontFace font={preview.headingFont} />
                        <FeedCoverBlock event={preview.event} isHost={false} wishlist={false} />
                    </div>
                ) : (
                    // Save my date look
                    <FeedLook ctx={preview.ctx} lang={preview.lang} fontFaces={preview.fontFaces}>
                        <FeedBlockShell section={preview.cover} index={preview.index} ctx={preview.ctx}>
                            <FeedNative>
                                <FeedCoverBlock event={event} isHost={false} wishlist={false} />
                            </FeedNative>
                        </FeedBlockShell>
                    </FeedLook>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 12: The container** (`components/manage/overview/FeedEditBannerSection.tsx`)

```tsx
'use client';

import dynamic from 'next/dynamic';

import { FeedEditBanner } from '@/components/manage/overview/FeedEditBanner';
import { FeedEditBannerPlaceholder } from '@/components/manage/overview/FeedEditBannerPreview';
import { useFeedEditBanner } from '@/hooks/useFeedEditBanner';
import type { EventDetailResponseDto, EventStatus, PaidServiceResponseDto, PlanTierResponseDto, PlatformModuleResponseDto } from '@/lib/api/types';

// Loaded only with a banner: the invitation look's styles and the cover's render stay off every other Overview.
const LazyFeedEditBannerPreview = dynamic(
    () => import('@/components/manage/overview/FeedEditBannerPreview').then((module) => module.FeedEditBannerPreview),
    { ssr: false, loading: FeedEditBannerPlaceholder },
);

type FeedEditBannerSectionProps = {
    event: EventDetailResponseDto;
    eventStatus: EventStatus;
    paidServices: PaidServiceResponseDto[];
    modules: PlatformModuleResponseDto[];
    currentPlan: PlanTierResponseDto | null | undefined;
};

export function FeedEditBannerSection({ event, eventStatus, paidServices, modules, currentPlan }: FeedEditBannerSectionProps) {
    const banner = useFeedEditBanner({ event, eventStatus, paidServices, modules, currentPlan });
    if (!banner.state || !banner.href) return null;

    return <FeedEditBanner state={banner.state} href={banner.href} illustration={<LazyFeedEditBannerPreview event={event} />} />;
}
```

Importing `FeedEditBannerPlaceholder` statically pulls only that tiny component; the preview itself stays in the lazy chunk because `next/dynamic` owns its import. If the bundler still folds them together, move the placeholder into its own file `FeedEditBannerPlaceholder.tsx`.

- [ ] **Step 13: Mount it on the Overview**

In `OverviewTab.tsx` import `FeedEditBannerSection` from `@/components/manage/overview/FeedEditBannerSection` and change the live branch to:

```tsx
    return (
        <div className="flex flex-col gap-8">
            {/* Journey */}
            <OverviewJourney event={event} eventUsage={eventUsage} planName={currentPlan?.name ?? null} counts={counts} />

            {/* Customize the feed */}
            <FeedEditBannerSection event={event} eventStatus={eventStatus} paidServices={paidServices} modules={modules} currentPlan={currentPlan} />

            {/* INVIART */}
            <InviartOverviewSection eventType={eventType} />
        </div>
    );
```

In both `OverviewTab.test.tsx` and `OverviewTab.themePicker.test.tsx`, next to the other component mocks, add:

```ts
vi.mock('@/components/manage/overview/FeedEditBannerSection', () => ({ FeedEditBannerSection: () => null }));
```

- [ ] **Step 14: The banner stories** (`components/manage/overview/FeedEditBanner.stories.tsx`)

```tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { FeedEditBanner } from '@/components/manage/overview/FeedEditBanner';
import { FeedEditBannerPlaceholder } from '@/components/manage/overview/FeedEditBannerPreview';

const meta = {
    title: 'Manage/FeedEditBanner',
    component: FeedEditBanner,
    args: { state: 'included', href: '/events/e-1/feed?edit=blocks', illustration: <FeedEditBannerPlaceholder /> },
} satisfies Meta<typeof FeedEditBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Included: Story = {};
export const Locked: Story = { args: { state: 'locked', href: '/events/e-1/settings/addons?add=SMD' } };
```

- [ ] **Step 15: Run the Overview tests**

Run: `npx vitest run "app/(main)/(app)/(event)/events/[eventId]/manage" components/manage/overview lib/feedEditBanner.test.ts hooks/useFeedEditBanner.test.tsx`
Expected: PASS.

- [ ] **Step 16: Commit**

```bash
git add lib/feedEditBanner.ts lib/feedEditBanner.test.ts hooks/useFeedEditBannerPreview.ts components/manage/overview/FeedEditBanner.tsx components/manage/overview/FeedEditBanner.test.tsx components/manage/overview/FeedEditBanner.stories.tsx components/manage/overview/FeedEditBannerPreview.tsx components/manage/overview/FeedEditBannerSection.tsx "app/(main)/(app)/(event)/events/[eventId]/manage/OverviewTab.tsx" "app/(main)/(app)/(event)/events/[eventId]/manage/OverviewTab.test.tsx" "app/(main)/(app)/(event)/events/[eventId]/manage/OverviewTab.themePicker.test.tsx" messages/en.json messages/el.json
git commit -m "KAN-245: invite hosts to customize the feed from the Overview

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Prefetch the banner's picture on the server

**Files:**
- Modify: `app/(main)/(app)/(event)/events/[eventId]/manage/(root)/page.tsx`

- [ ] **Step 1: Add the prefetch** (below `prefetchThemeGrid`; add `serverPublicGetOrNull` to the `@/lib/api/serverFetch` import, `isEventWritable` to the `@/lib/eventLifecycle` import, and `import { invitationThemeEndpoint, type InvitationThemePublicDto } from '@/lib/invitation/themePreview';`)

```ts
// The Overview's feed banner picture (useFeedEditBannerPreview): the feed layout, the catalogue (theme catalogue
// event types only, as the hook) and, for a feed on the wall theme, the theme standing in for it (the catalogue's
// first for the event type). Each seeds on its own.
async function prefetchFeedEditBanner(event: EventDetailResponseDto, eventId: string, accessToken: string) {
    const [layout, catalogue] = await Promise.all([
        serverGetOrNull<FeedLayoutDto>(endpoints.events.feedLayout(eventId), accessToken).catch(() => undefined),
        isCatalogueEventType(event.eventType) ? fetchThemeCatalogue().catch(() => null) : Promise.resolve(null),
    ]);
    const fallbackSlug = layout?.themeSlug ? null : (catalogue?.find((theme) => theme.eventType === event.eventType)?.slug ?? null);
    // Not cached: the image URLs may expire (lib/invitation/serverThemePreview.ts).
    const fallback = fallbackSlug ? await serverPublicGetOrNull<InvitationThemePublicDto>(invitationThemeEndpoint(fallbackSlug)).catch(() => null) : null;
    return (queryClient: ReturnType<typeof makeQueryClient>) => {
        if (layout !== undefined) queryClient.setQueryData(feedLayoutKeys.detail(eventId), layout);
        if (catalogue) queryClient.setQueryData(invitationThemeKeys.catalogue(), catalogue);
        if (fallbackSlug && fallback) queryClient.setQueryData(invitationThemeKeys.publicTheme(fallbackSlug), fallback);
    };
}
```

- [ ] **Step 2: Call it where the Overview opens**

In `Page`, after `const themeGrid = ...`:

```ts
            // Mirrors useFeedEditBanner's cheap gates (the flag, and Save my date on a writable event or a live
            // event's main host; any event type); the rest it checks itself.
            const smd = isModuleAvailable(event.modules, 'save_my_date');
            const bannerViewer = smd ? isEventWritable(event.status) : event.status === 'ACTIVE' && isPrimaryHost(event.hosts, membership?.id);
            const opensFeedBanner = opensOverview && feedEditor && bannerViewer;
            const feedBanner = opensFeedBanner ? prefetchFeedEditBanner(event, eventId, accessToken) : null;
```

and after `if (themeGrid) (await themeGrid)(queryClient);`:

```ts
            if (feedBanner) (await feedBanner)(queryClient);
```

Add a line to the page's header comment: `A live event's Overview with the feed editor also prefetches its feed banner's picture (prefetchFeedEditBanner).`

- [ ] **Step 3: Types and lint**

Run: `npx tsc --noEmit -p . && npx eslint "app/(main)/(app)/(event)/events/[eventId]/manage/(root)/page.tsx"`
Expected: no errors.

- [ ] **Step 4: Run the manage tests**

Run: `npx vitest run "app/(main)/(app)/(event)/events/[eventId]/manage"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(main)/(app)/(event)/events/[eventId]/manage/(root)/page.tsx"
git commit -m "KAN-245: prefetch the Overview feed banner's picture

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: Verification

**Files:** none (fixes go in their own commit).

- [ ] **Step 1: Types**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 2: Lint**

Run: `npx eslint .`
Expected: no errors. Fix any, commit as `KAN-245: lint`.

- [ ] **Step 3: All tests**

Run: `npx vitest run`
Expected: all pass. The save-my-date timeouts noted in earlier releases can flake under load: rerun those files alone before calling them failures.

- [ ] **Step 4: Stale references**

Run: `grep -rn "canBuy\|locked=" components/feed hooks/useFeedBlockActions.ts; grep -rn "AddSectionSheet" components/feed`
Expected: nothing (the feed no longer uses either).

- [ ] **Step 5: Browser check** (signed in; open the app only with `preview_start {url: "http://localhost:3000/"}` on a dev server the user already runs, never by name; ask the user for the local test login; the local backend must run Task 1-2's branch so the background colour saves; the flag `FEED_EDITOR_LAUNCHED` must be on locally). Check each at 375 px and 1280 px wide and record pass/fail:

- [ ] A wedding event **without** Save my date: no Edit pill on the feed; `/events/{id}/feed?edit=blocks` drops the param and stays on the feed.
- [ ] Same event, Overview as the main host: the locked banner (lock, title, Unlock) between the journey and INVIART; Unlock opens Settings > Add-ons with Save my date ticked. As a co-host: no banner. On a draft: no banner.
- [ ] A wedding event **with** Save my date: Edit pill shows for host and co-host; Overview shows Start editing; it lands in edit mode with Cancel focused and no `?edit=` in the URL; Back leaves edit mode (asks only with changes).
- [ ] The banner picture: tilted, the event's cover in a Save my date theme, nothing in it takes taps; a screen reader reads "Preview of your invitation".
- [ ] An event type without Save my date themes (a birthday): without Save my date, the main host sees the locked banner, its picture the cover in the event's wall look. With Save my date: Start editing, the Edit pill, adding sections (cards drawn in the current theme), hide/reorder, and the Theme sheet showing wall presets (only with the theme module) and the Background row, or just the Background row.
- [ ] Add section: cards with a small live picture and the block's name; one column at 375, two at 1280; tapping a card adds that block.
- [ ] Theme pill: opens the sheet (phones) / right panel (desktop) titled Theme; block settings and the Theme sheet never show at once.
- [ ] Pick a Save my date theme: the top of the feed redraws in it at once; nothing is saved (reload the page in another tab: unchanged); Save stores it; Cancel instead asks first and drops it.
- [ ] Pick a wall preset: the cover art, page colour and wall blocks preview it; Save writes it (the Manage Theme section shows it after).
- [ ] Background: pick a light colour; the whole feed (blocks, posts area, behind the tab bar) turns that colour; pick a dark one: it shows lightened, every text stays readable, and "Too dark for the text. A lighter shade will be shown." shows under the row until a lighter colour is picked; Default goes back; picking a theme clears it; Save keeps it after a reload, for a guest too.
- [ ] Theme write failure: with DevTools offline after the layout save (or the theme endpoint blocked), Save shows "Couldn't save your changes. Please try again.", edit mode stays, the pick stays selected; Save again finishes.
- [ ] Conflict: save the layout from another tab, then Save: the conflict dialog; Reload drops the held theme.
- [ ] The standalone Save my date editor's Add section list is unchanged.
- [ ] A Save my date theme that fails to load (block its request in DevTools): nothing changes, no message; tapping it again retries.
- [ ] Greek: every new string shows as approved.

- [ ] **Step 6: Visual check stories**

Run: `npm run build-storybook`
Expected: builds. The new stories (FeedAddSectionSheet, FeedBackgroundSetting with TooDark, FeedEditPills WithTheme, FeedEditBanner) and the removed ones (FeedAddSectionRow Locked, LockedForCoHost) show in the PR's visual check for the owner.

- [ ] **Step 7: SEO**

No route is added and no page metadata changes; `?edit=blocks` is a one-shot client param on a signed-in page. Note "No SEO blockers" in the PR.

- [ ] **Step 8: Push and open the PR into staging** (after the backend PR from Task 2 is open)

```bash
git push -u origin claude/kan-245-edit-gating
gh pr create --base staging --title "KAN-245: edit gating, Overview banner, section cards, theme and background in edit mode" --body-file "$PR_BODY"
```
Write `$PR_BODY` (a file in the scratchpad) before running this, with these sections: **Summary** (the six approved behaviours, one line each, copied from "Approved behaviour" above), **New strings** (the "Approved wording" table above, unchanged), **Deploy** (the backend PR from Task 2 first, then this; no migration, no env var), **Browser check** (each Step 5 line with pass/fail at 375 and 1280), **SEO** ("No SEO blockers"), and a last line `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Name only KAN-245 in it.
