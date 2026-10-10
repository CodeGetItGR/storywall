# He or She? Quiz (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The `tools/he-or-she` page for GENDER_REVEAL events. Everyone (hosts included) guesses Boy or Girl, answers optional extra questions, and see the tally after guessing (and everyone sees the result after the reveal). Hosts set the secret answer and reveal time, press Reveal, manage the extra questions, and read every answer by name.

**Architecture:** A server-prefetched route (`page.tsx` seeds `heOrSheKeys.view(eventId)`) over a thin `PageClient.tsx` that picks the guest or the host screen. Data and mutations live in `hooks/useHeOrShe.ts`. Per-type input parsing and formatting live in `lib/heOrShe.ts`. The UI is small files under `components/heOrShe/`. The mock `tools/quiz` page is not touched.

**Tech Stack:** Next.js 16, React 19, TanStack Query 5, next-intl, vitest + Testing Library.

**Backend contract:** `guestwall-be/docs/fe-guides/he-or-she-quiz-fe-integration.md` (BE plan Task 11). Spec: `guestwall-be/docs/superpowers/specs/2026-10-10-he-or-she-quiz-design.md`. **Ship after the BE is on `staging`.** The spec's decisions and copy were confirmed on 2026-10-10.

---

## Ground rules

- Branch from the latest `origin/staging`, and open the PR into `staging`.
- `npx vitest run <path>` per task. Before the final commit run `npx tsc --noEmit` and `npm run lint`, and fix every lint error.
- Every visible string goes in `messages/en.json` and `messages/el.json`. Keep the copy short and plain (CLAUDE.md, "Top Priority").
- Components are render shells. Put state, derived values and handlers in hooks (CLAUDE.md, "Structure").
- Add a JSX comment above each visual section (`{/* Guess */}`, `{/* Tally */}`, `{/* Extra questions */}`, `{/* Reveal */}`, `{/* Results */}`).
- Mobile-first (event host and guest UI). Check the result with a screenshot at a phone width, and at desktop width for overlap.
- Load the `design-system` UI skill before the UI tasks, and `ux-copy` for the copy task, as CLAUDE.md asks.

## File map

- Modify: `lib/api/types.ts`, `lib/api/endpoints.ts`, `lib/api/errors.ts`, `lib/routes.ts`, `lib/eventTheme.ts`, `lib/eventTheme.test.ts`, `hooks/useToolsMenuItems.ts`, `hooks/useToolsMenuItems.test.tsx`, `components/feed/QuickAccessBar.tsx`, `messages/en.json`, `messages/el.json`
- Create: `lib/heOrShe.ts`, `lib/heOrShe.test.ts`
- Create: `hooks/useHeOrShe.ts`, `hooks/useHeOrShe.test.tsx`, `hooks/useHeOrSheGuessForm.ts`, `hooks/useHeOrSheQuestionEditor.ts`, `hooks/useHeOrSheHostSettings.ts`
- Create: `app/(main)/(app)/(event)/events/[eventId]/tools/he-or-she/{page.tsx,PageClient.tsx,loading.tsx}`
- Create: `components/heOrShe/` with `GuessButtons.tsx`, `ExtraQuestionField.tsx`, `GuessForm.tsx`, `TallyBar.tsx`, `GuestThanks.tsx`, `RevealedResult.tsx`, `HostSettingsSection.tsx`, `RevealConfirmModal.tsx`, `QuestionRows.tsx`, `QuestionEditorModal.tsx`, `HostResults.tsx`, `HeOrSheSkeleton.tsx`, plus tests next to the stateful ones

---

### Task 1: Contract

- [ ] **Step 1:** In `lib/api/types.ts`, add the DTOs exactly as `docs/frontend-api-types.ts` in the BE has them: `QuizAnswerType`, `HeOrSheViewDto`, `HeOrSheAnswersRequestDto`, `HeOrSheSettingsRequestDto`, `QuizQuestionDto`, `QuizQuestionRequestDto`, `QuizQuestionPatchDto`, `HeOrSheResultsDto`.
- [ ] **Step 2:** `lib/api/endpoints.ts` under `events`:

```ts
        heOrShe: (eventId: string) => `/api/events/${eventId}/he-or-she`,
        heOrSheAnswers: (eventId: string) => `/api/events/${eventId}/he-or-she/answers`,
        heOrSheSettings: (eventId: string) => `/api/events/${eventId}/he-or-she/settings`,
        heOrSheReveal: (eventId: string) => `/api/events/${eventId}/he-or-she/reveal`,
        heOrSheQuestions: (eventId: string) => `/api/events/${eventId}/he-or-she/questions`,
        heOrSheQuestion: (eventId: string, questionId: string) => `/api/events/${eventId}/he-or-she/questions/${questionId}`,
        heOrSheResults: (eventId: string) => `/api/events/${eventId}/he-or-she/results`,
```

- [ ] **Step 3:** `lib/api/errors.ts`: add the seven codes (3099–3101, 5170–5173) with the names the BE uses.
- [ ] **Step 4:** `lib/routes.ts`: `heOrShe: (eventId: string) => \`${eventBasePath(eventId)}/tools/he-or-she\``. In `lib/eventTheme.ts`, add `he-or-she` to the themed-routes alternation, and add a case to `lib/eventTheme.test.ts` (`'/events/e1/tools/he-or-she'` is themed).
- [ ] **Step 5:** `npx vitest run lib/eventTheme.test.ts`, then commit.

### Task 2: `lib/heOrShe.ts` (pure, TDD)

- [ ] **Step 1: Failing tests** `lib/heOrShe.test.ts`:
  - `toAnswerValue(type, input)` gives the canonical string the BE accepts, or `null` for empty. NUMBER trims and accepts `,` as a decimal separator for `el` (`'3,5'` → `'3.5'`). DATE comes from `<input type="date">` and passes through. TIME comes from `<input type="time">` and is cut to `HH:mm`.
  - `answerError(type, value, question)` returns a message key (`'tooLong'`, `'invalidNumber'`, …) or `null`, using the same limits as the BE (120 for FILL_GAP, 1000 for FREE_TEXT, 12 digits / 3 decimals). This is for UX only, since the BE validates again.
  - `formatAnswer(type, value, question, locale)` gives the host-facing text: option label, localised date (`lib/datetime`), `HH:mm`, a number with `Intl.NumberFormat`, He/She and Yes/No through translation keys.
  - `splitFillGap(prompt)` returns `[before, after]` around the first `_{3,}` run.
  - `tallyPercent({he, she})` gives `{he: 57, she: 43}`, with rounding that adds up to 100, and `{0, 0}` for no votes.
- [ ] **Step 2:** Implement and run the tests, then commit.

### Task 3: Hooks

- [ ] **Step 1: Failing tests** `hooks/useHeOrShe.test.tsx` (copy the setup from `hooks/useWishbookBook.test.tsx`):
  - `useHeOrShe` is disabled when the module isn't readable, and uses `heOrSheKeys.view(eventId)`.
  - `useSendHeOrSheAnswers` writes the returned view straight into the cache (`setQueryData`), with no refetch.
  - `useRevealHeOrShe` and `useUpdateHeOrSheSettings` also write the returned view. Question create, update and delete invalidate the view and results.
  - **When `revealAt` passes while the page is open, the view refetches:** `useHeOrShe` sets a timer to `revealAt` and invalidates. Test it with fake timers.
- [ ] **Step 2: Implement** `hooks/useHeOrShe.ts`:

```ts
export const heOrSheKeys = {
    view: (eventId: string) => ['events', eventId, 'he-or-she'] as const,
    results: (eventId: string) => ['events', eventId, 'he-or-she', 'results'] as const,
};
```

plus `useHeOrShe`, `useHeOrSheResults` (enabled for hosts only), `useSendHeOrSheAnswers`, `useUpdateHeOrSheSettings`, `useRevealHeOrShe`, `useCreateHeOrSheQuestion`, `useUpdateHeOrSheQuestion` and `useDeleteHeOrSheQuestion`. Follow `useWishbook.ts`: `useModuleReadable(eventId, 'he_or_she')`, `LIVE_CONTENT_STALE_TIME`.
- [ ] **Step 3: Page-level hooks** (each owns its screen's state, so components stay as render shells):
  - `useHeOrSheGuessForm(view)`: the draft guess and extra answers, seeded from `myGuess`/`myAnswers`; `isEditing` (true until the first send, then "Change my answers" turns it back on); per-field errors from `answerError`; `submit(event: React.SubmitEvent<HTMLFormElement>)`.
  - `useHeOrSheHostSettings(view)`: the draft answer and reveal time, `save()`, `canSchedule` (an answer is set), the reveal-modal open state, and `reveal(answer?)`.
  - `useHeOrSheQuestionEditor()`: the editor modal state (`create(type)` or `edit(question)`), the draft prompt and options, `optionsLocked` (the BE's 5172 is shown as a message, and the option inputs are disabled once the question has answers per `HeOrSheResultsDto`), and save/delete with a confirmation.
- [ ] **Step 4:** Run the tests, then commit.

### Task 4: Messages

- [ ] Add a `HeOrShePage` namespace to `en.json` and `el.json`. The keys: `he` ("Boy" / "Αγόρι"), `she` ("Girl" / "Κορίτσι"), `yes`, `no`, `send`, `changeAnswers`, `thanks`, `revealOn` (`{date}`), `resultIs` (`{result}`), `noVotesYet`, `extraQuestions`, `optional`, the per-type placeholders, the answer-error keys, host: `secretAnswer`, `secretAnswerHint` ("Only hosts see this."), `revealAt`, `save`, `revealNow`, `revealConfirmTitle`, `revealConfirmBody` ("Guests will see the answer. This can't be undone."), `revealConfirmAction`, `cancel`, `addQuestion`, the type labels (8), `editQuestion`, `deleteQuestion`, `deleteQuestionConfirm` ("Its answers will be deleted too."), `optionsLocked` ("Guests have answered. Options can't change."), `results`, `noAnswers`, `answeredBy` (`{count}`), plus the error-code messages for 3099–3101 and 5170–5173.
- [ ] Labels use the confirmed copy from the spec's Copy section: Boy / Girl, Αγόρι / Κορίτσι. The module name itself comes from `useModuleCopy(eventType)('he_or_she')`, as the BE/admin copy, so don't hardcode a title.
- [ ] `ToolsMenu.items.heOrShe.{label,description}` fallbacks.

### Task 5: Guest components

- [ ] **Step 1: Failing tests** in `components/heOrShe/GuessForm.test.tsx`:
  - OPEN and not guessed: two large buttons, then extra questions marked "Optional", and Send is disabled until He or She is picked.
  - After sending: `TallyBar` and `GuestThanks` show, the form is hidden, and "Change my answers" reopens it with the previous answers.
  - REVEALED: `RevealedResult` and the tally show, and there is no form, even for a member who never guessed.
  - `revealAt` set: "Reveal on {date}" shows.
  - No names appear anywhere in the guest screen (assert on the DOM text).
- [ ] **Step 2: Implement** these, each a render shell taking props:
  - `GuessButtons`: Boy / Girl as two thumb-sized toggle buttons, `aria-pressed`.
  - `ExtraQuestionField`: one input per type. Segmented buttons for HE_SHE/YES_NO, radio rows for CHOICE, `DateTimeField` (or native date/time) for DATE/TIME, `inputMode="decimal"` for NUMBER, an inline text field in the sentence for FILL_GAP (`splitFillGap`), and a textarea with a counter for FREE_TEXT.
  - `GuessForm`: composes them with `useHeOrSheGuessForm`.
  - `TallyBar`: one horizontal bar, He % / She %, with the counts underneath. This is the page's only home for the counts, so don't repeat them elsewhere (CLAUDE.md, "Never show the same fact twice").
  - `GuestThanks`, `RevealedResult`.
- [ ] **Step 3:** Run the tests, then commit.

### Task 6: Host components

- [ ] **Step 1: Failing tests:**
  - `HostSettingsSection.test.tsx`: the reveal time is disabled until an answer is picked. Save sends `{answer, revealAt}`. Reveal now opens `RevealConfirmModal`, and confirming sends `POST /reveal`. When no answer is stored, the modal asks for it (He/She) before the confirm button is enabled. After the reveal the section is read-only.
  - `QuestionRows.test.tsx`: compact read-only rows (type badge, prompt). Tapping a row opens `QuestionEditorModal`. "Add question" opens a type picker, then the modal. There are no inline forms.
  - `QuestionEditorModal.test.tsx`: CHOICE needs 2–8 options; FILL_GAP shows a hint when the prompt has no `___`. Delete asks for confirmation (`ConfirmActionModal`). When the question has answers, the option inputs are disabled with `optionsLocked`.
  - `HostResults.test.tsx`: He/She groups with avatars and names, then each extra question with its answers by name (`formatAnswer`), and an empty state per question.
- [ ] **Step 2:** Implement them with the hooks from Task 3.
- [ ] **Step 3:** Run the tests, then commit.

### Task 7: Route

- [ ] **Step 1:** `page.tsx`. Copy the wishbook page's shape:

```tsx
export default async function Page({ params }: PageProps) {
    const { eventId } = await params;
    const accessToken = await prefetchAccessToken();
    const queryClient = makeQueryClient();
    if (accessToken) {
        try {
            if (!(await serverModuleReadable(eventId, 'he_or_she', accessToken))) throw new Error('he_or_she unavailable');
            const view = await serverGet<HeOrSheViewDto>(endpoints.events.heOrShe(eventId), accessToken);
            queryClient.setQueryData(heOrSheKeys.view(eventId), view);
        } catch {
            // Best-effort — the client hooks fetch normally if this fails.
        }
    }
    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <HeOrShePage />
        </HydrationBoundary>
    );
}
```

Results are not prefetched. They are host-only, and the host screen shows its own loading state for them. (The server can't tell host from guest here without `resolveServerEventContext()`. If the reviewer wants results prefetched, switch to that and gate on `isHost`.)
- [ ] **Step 2:** `PageClient.tsx` stays thin: `ModulePageShell` with the title from `useModuleCopy`, `ModuleUnavailableState` when the module isn't readable, `HeOrSheSkeleton` while loading, then the guess section (everyone, hosts included), and for hosts the settings, questions and results sections below it. Each is a small composition of the Task 5 and 6 components. The back link uses `routes.events.feed(eventId)` with the same icon-plus-label pattern as the other tools.
- [ ] **Step 3:** `loading.tsx` renders `HeOrSheSkeleton` inside the shell skeleton.
- [ ] **Step 4:** Commit.

### Task 8: Entry points

- [ ] **Step 1: Failing test** in `hooks/useToolsMenuItems.test.tsx`: `heOrShe` is listed when `he_or_she` is readable, absent when not, absent for `demoVisitor`, and absent on a deleted event.
- [ ] **Step 2:** In `useToolsMenuItems`, add `{ key: 'heOrShe', href: routes.events.tools.heOrShe(activeEvent.id), icon: HelpCircle /* or a lucide icon the design-system skill picks */, moduleKey: 'he_or_she' }`, plus `.filter((tool) => tool.key !== 'heOrShe' || !isDemoVisitor)`.
- [ ] **Step 3:** In `QuickAccessBar`, add `{ moduleKey: 'he_or_she', href: routes.events.tools.heOrShe(eventId), icon: …, visible: true, key: 'heOrShe' }`, hidden for demo visitors, plus its label key.
- [ ] **Step 4:** Run the tests, then commit.

### Task 9: Full check

- [ ] `npx vitest run`, `npx tsc --noEmit` and `npm run lint` all pass.
- [ ] Run the app against a local BE with a GENDER_REVEAL event. Take phone-width and desktop screenshots of: guest before guessing, guest after guessing, guest after the reveal, host settings, the question editor modal, and host results.
- [ ] SEO: the route is under `/events/`, which is in `PRIVATE_PATHS`. Nothing else is needed, and no blocker.
- [ ] Stale references: none expected (the `tools/quiz` mock is untouched).
- [ ] Push the branch. Don't open a PR unless the user asks.
