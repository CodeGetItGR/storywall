# Member Roles C: Reporting, Moderation, Blocked Words — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any member report custom role text from the post/comment/story "…" menu, make the admin moderation center handle `MEMBER` cases (label, wording, `expectedContentText`, 5115), and add an admin "Blocked words" screen.

**Architecture:** Pure rules in `lib/` (`canReportCustomRole`, `toDecisionRequest`, `blockedTermError`), data in hooks (`useCustomRoleReport`, `useBlockedTerms`…), components stay render shells. Menus get one optional extra item; the report modal gets a `variant`. Spec: `docs/superpowers/specs/2026-10-04-member-roles-c-moderation-blocklist-design.md`. Backend guide: `C:\Users\User\IdeaProjects\event_social_media\docs\fe-guides\member-roles-fe-integration.md` §6, §10.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query, next-intl (en/el), Tailwind, Vitest + Testing Library, base-ui.

**Repo rules (CLAUDE.md):** localize every visible string (en + el); JSX section comment above each visual section; no inline arrow functions as JSX props in new code; logic in hooks/`lib/`; `React.SubmitEvent` for submit handlers; fix lint before handing back. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Precondition:** the working tree must contain no unrelated changes before Task 1 (the user has uncommitted work in `messages/*.json`, `components/story/StoryModal.tsx` and others). Run `git status --short`; if anything outside this plan's files is modified, stop and ask the user. Stage only the files each task lists — never `git add -A`.

---

## File map

| File | Change |
|---|---|
| `lib/api/types.ts` | `BlockedTermDto`, `BlockedTermRequestDto`; `expectedContentText` on `ModerationDecisionRequestDto` |
| `lib/api/endpoints.ts` | `admin.blockedTerms` |
| `lib/api/errors.ts`, `lib/api/errorMessageKeys.ts` | 5115 `MEMBER_ROLE_TEXT_CHANGED` |
| `lib/memberRoles.ts` (+ test) | `canReportCustomRole` |
| `hooks/useCustomRoleReport.ts` | the flag for one author |
| `components/reports/ReportTargetModal.tsx` | `variant?: 'role'` |
| `components/feed/post/PostActionsMenu.tsx` (+ new test) | optional "Report role" item |
| `components/feed/PostCard.tsx`, `components/feed/post/CommentActionsMenu.tsx` | wire the item and a role report modal |
| `hooks/useStoryModal.ts`, `components/story/StoryHeader.tsx`, `components/story/StoryModal.tsx` | same for stories |
| `lib/adminModeration.ts` (+ test) | `toDecisionRequest(draft, expectedContentText)` |
| `hooks/useAdminModeration.ts` | 5115 re-reads the case |
| `components/admin/moderation/ModerationContentPreview.tsx`, `ModerationDecisionForm.tsx` (+ test), `ModerationCaseDrawer.tsx` | member-case label, wording, expected text |
| `lib/blockedTerms.ts` (+ test) | client validation and error mapping |
| `hooks/useBlockedTerms.ts` | list / add / delete |
| `hooks/useBlockedTermsSection.ts` | section UI state |
| `components/admin/memberRoles/BlockedTermsSection.tsx` (+ test), `AddBlockedTermModal.tsx` | the screen |
| `components/admin/plans/PlansSettingsMemberRoles.tsx` | mount the section |
| `messages/en.json`, `messages/el.json` | copy |

---

### Task 1: Contract

**Files:** Modify `lib/api/types.ts`, `lib/api/endpoints.ts`, `lib/api/errors.ts`, `lib/api/errorMessageKeys.ts`, `messages/en.json`, `messages/el.json`.

- [ ] **Step 1: Types.** In `lib/api/types.ts`, inside `interface ModerationDecisionRequestDto` after `note?: string | null; // max 2000` add:

```ts
    // MEMBER cases with removeContent: the content.text the admin saw (member-roles guide §6.2).
    // A mismatch with the stored text is 409 5115. Ignored for other targets.
    expectedContentText?: string | null;
```

After `interface MemberRoleCatalogPatchDto { … }` add:

```ts
// /api/admin/blocked-terms (member-roles-fe-integration.md §10). Extra terms on
// top of the built-in English and Greek lists; every term applies to every language.
export interface BlockedTermDto {
    id: string;
    term: string;
    createdAt: string;
}

export interface BlockedTermRequestDto {
    term: string; // max 60
}
```

- [ ] **Step 2: Endpoint.** In `lib/api/endpoints.ts`, inside `admin`, right after the `memberRoles: { … },` block add:

```ts
        blockedTerms: {
            collection: '/api/admin/blocked-terms',
            byId: (id: string) => `/api/admin/blocked-terms/${id}`,
        },
```

- [ ] **Step 3: Error code.** In `lib/api/errors.ts` after `MEMBER_ROLE_CAP_REACHED: 5114,` add `MEMBER_ROLE_TEXT_CHANGED: 5115,`. In `lib/api/errorMessageKeys.ts` add `| 'memberRoleTextChanged'` to the `ApiErrorMessageKey` union after `| 'memberRoleHostOnly'`, and `[ERROR_CODES.MEMBER_ROLE_TEXT_CHANGED]: 'memberRoleTextChanged',` to the map after the `MEMBER_ROLE_CAP_REACHED` line.

- [ ] **Step 4: Copy.** In both message files, inside `ApiErrors`, after `"memberRoleCapReached"`:
  - en: `"memberRoleTextChanged": "The role changed since you opened this case. Check it and decide again."`
  - el: `"memberRoleTextChanged": "Ο ρόλος άλλαξε από τότε που ανοίξατε την υπόθεση. Ελέγξτε τον και αποφασίστε ξανά."`

- [ ] **Step 5: Verify.** `npx tsc --noEmit -p .` → no output.

- [ ] **Step 6: Commit.**

```bash
git add lib/api/types.ts lib/api/endpoints.ts lib/api/errors.ts lib/api/errorMessageKeys.ts messages/en.json messages/el.json
git commit -m "feat(member-roles): blocked terms and 5115 contract"
```

---

### Task 2: `canReportCustomRole`

**Files:** Modify `lib/memberRoles.ts`, `lib/memberRoles.test.ts`.

- [ ] **Step 1: Failing test.** Add `canReportCustomRole` to the import list in `lib/memberRoles.test.ts` and append:

```ts
describe('canReportCustomRole', () => {
    const author = { memberId: 'm2', displayName: 'Eleni', nickname: null, role: 'ATTENDEE', avatarUrl: null, roleKey: null, customRole: 'Θεία' } as AuthorDto;
    const base = { author, viewerMemberId: 'm1', isDemoVisitor: false, reportTargetTypes: ['POST', 'MEMBER'] };

    it('allows a member to report someone else’s custom role', () => {
        expect(canReportCustomRole(base)).toBe(true);
    });

    it('refuses catalog roles, no role, self, demo visitors, non-members and a config without MEMBER', () => {
        expect(canReportCustomRole({ ...base, author: { ...author, customRole: null, roleKey: 'BEST_MAN' } })).toBe(false);
        expect(canReportCustomRole({ ...base, author: null })).toBe(false);
        expect(canReportCustomRole({ ...base, viewerMemberId: 'm2' })).toBe(false);
        expect(canReportCustomRole({ ...base, isDemoVisitor: true })).toBe(false);
        expect(canReportCustomRole({ ...base, viewerMemberId: null })).toBe(false);
        expect(canReportCustomRole({ ...base, reportTargetTypes: ['POST'] })).toBe(false);
        expect(canReportCustomRole({ ...base, reportTargetTypes: undefined })).toBe(false);
    });
});
```

(`AuthorDto` is already imported as a type there; if not, add `import type { AuthorDto } from '@/lib/api/types';`.)

- [ ] **Step 2: Run** `npx vitest run lib/memberRoles.test.ts` → FAIL (`canReportCustomRole` is not exported).

- [ ] **Step 3: Implement.** In `lib/memberRoles.ts`, after `canManageMemberRoles`:

```ts
// Any member may report someone else's custom role text (guide §6.1).
// Catalog roles are admin-written, so they can't be reported.
export function canReportCustomRole({
    author,
    viewerMemberId,
    isDemoVisitor,
    reportTargetTypes,
}: {
    author: AuthorDto | null | undefined;
    viewerMemberId: string | null;
    isDemoVisitor: boolean;
    reportTargetTypes: readonly string[] | null | undefined;
}): boolean {
    if (!author?.customRole || !viewerMemberId || isDemoVisitor) return false;
    if (author.memberId === viewerMemberId) return false;
    return Boolean(reportTargetTypes?.includes('MEMBER'));
}
```

- [ ] **Step 4: Run** the same test → PASS.

- [ ] **Step 5: Commit.**

```bash
git add lib/memberRoles.ts lib/memberRoles.test.ts
git commit -m "feat(member-roles): who may report a custom role"
```

---

### Task 3: Report role from posts and comments

**Files:** Create `hooks/useCustomRoleReport.ts`, `components/feed/post/PostActionsMenu.test.tsx`. Modify `components/reports/ReportTargetModal.tsx`, `components/feed/post/PostActionsMenu.tsx`, `components/feed/PostCard.tsx`, `components/feed/post/CommentActionsMenu.tsx`, `messages/en.json`, `messages/el.json`.

- [ ] **Step 1: Copy.** In `MemberRoles` (both files) add after `"setByHosts"`: en `"reportRole": "Report role"`, el `"reportRole": "Αναφορά ρόλου"`. In `Report`, after `"body"`: en `"roleBody": "Report {name}'s role to the platform team."`, el `"roleBody": "Αναφορά του ρόλου του/της {name} στην ομάδα της πλατφόρμας."`.

- [ ] **Step 2: Hook.** Create `hooks/useCustomRoleReport.ts`:

```ts
'use client';

import { useAppConfig } from '@/hooks/useAppConfig';
import type { AuthorDto } from '@/lib/api/types';
import { canReportCustomRole } from '@/lib/memberRoles';
import { useActiveMember, useContentAccessMode } from '@/providers/EventProvider';

// Whether the viewer may report this author's custom role text.
export function useCustomRoleReport(author: AuthorDto | null | undefined): boolean {
    const activeMember = useActiveMember();
    const isDemoVisitor = useContentAccessMode() === 'demoVisitor';
    const { data: appConfig } = useAppConfig();

    return canReportCustomRole({ author, viewerMemberId: activeMember?.id ?? null, isDemoVisitor, reportTargetTypes: appConfig?.reportTargetTypes });
}
```

- [ ] **Step 3: Modal variant.** In `components/reports/ReportTargetModal.tsx` add to `ReportTargetModalProps`:

```ts
    /** 'role': a MEMBER report about the member's custom role text. */
    variant?: 'role';
```

add `variant` to the destructured props, and replace the body expression with:

```tsx
{variant === 'role'
    ? t('roleBody', { name: targetName ?? '' })
    : targetType === 'MEMBER'
      ? t('body', { name: targetName ?? '' })
      : t(`bodyByType.${targetType}`)}
```

- [ ] **Step 4: Failing menu test.** Create `components/feed/post/PostActionsMenu.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PostActionsMenu } from '@/components/feed/post/PostActionsMenu';

afterEach(cleanup);

describe('PostActionsMenu', () => {
    it('offers Report role when given', async () => {
        const onReportRole = vi.fn();
        render(<PostActionsMenu disabled={false} isDeleting={false} moreLabel="More" reportRoleLabel="Report role" onReportRoleAction={onReportRole} />);

        fireEvent.click(screen.getByRole('button', { name: 'More' }));
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Report role' }));

        expect(onReportRole).toHaveBeenCalled();
    });

    it('leaves it out otherwise', async () => {
        render(<PostActionsMenu disabled={false} isDeleting={false} moreLabel="More" reportLabel="Report post" onReportAction={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: 'More' }));

        expect(await screen.findByRole('menuitem', { name: 'Report post' })).toBeInTheDocument();
        expect(screen.queryByRole('menuitem', { name: 'Report role' })).not.toBeInTheDocument();
    });
});
```

Run `npx vitest run components/feed/post/PostActionsMenu.test.tsx` → FAIL (type error / no item). If base-ui needs a pointer event to open, use `fireEvent.pointerDown` then `fireEvent.click` on the trigger; keep whichever opens it.

- [ ] **Step 5: Menu item.** In `components/feed/post/PostActionsMenu.tsx` add props `onReportRoleAction?: () => void; reportRoleLabel?: string;` (type, destructuring), and right after the existing report `Menu.Item` block add:

```tsx
                        {onReportRoleAction && reportRoleLabel && (
                            <Menu.Item
                                onClick={onReportRoleAction}
                                disabled={disabled}
                                className={cn(
                                    'motion-menu-item flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-ink outline-none',
                                    'hover:bg-surface-muted',
                                    disabled && 'cursor-not-allowed opacity-60',
                                )}
                            >
                                <Flag className="h-4 w-4" aria-hidden="true" />
                                {reportRoleLabel}
                            </Menu.Item>
                        )}
```

Run the test → PASS.

- [ ] **Step 6: PostCard.** In `components/feed/PostCard.tsx`:
  - imports: `import { useCustomRoleReport } from '@/hooks/useCustomRoleReport';`
  - `const tRoles = useTranslations('MemberRoles');` next to the other `useTranslations`.
  - state: `const [roleReportOpen, setRoleReportOpen] = useState(false);`
  - after `canReportPost`: `const canReportRole = useCustomRoleReport(post.author);`
  - handlers next to `handleOpenReport`:

```ts
    function handleOpenRoleReport() {
        if (canReportRole) setRoleReportOpen(true);
    }

    function handleCloseRoleReport() {
        setRoleReportOpen(false);
    }
```

  - menu condition: `(canEditPost || canDeletePost || canReportPost || canReportRole)`; add props `reportRoleLabel={canReportRole ? tRoles('reportRole') : undefined}` and `onReportRoleAction={canReportRole ? handleOpenRoleReport : undefined}` to `PostActionsMenu`.
  - after the `{/* Report post */}` block:

```tsx
            {/* Report role */}
            {roleReportOpen && post.author && (
                <ReportTargetModal
                    open
                    eventId={post.eventId}
                    targetType="MEMBER"
                    targetId={post.author.memberId}
                    targetName={authorName}
                    variant="role"
                    onCloseAction={handleCloseRoleReport}
                />
            )}
```

- [ ] **Step 7: CommentActionsMenu.** In `components/feed/post/CommentActionsMenu.tsx`, the same pattern:
  - `const tRoles = useTranslations('MemberRoles');`, `const [roleReportOpen, setRoleReportOpen] = useState(false);`, `const canReportRole = useCustomRoleReport(comment.author);` (call it before the early `return null`).
  - early return becomes `if (!activeEvent || (!canDelete && !canReport && !canReportRole)) return null;`
  - handlers `handleOpenRoleReport` / `handleCloseRoleReport` (set state true/false).
  - both `PostActionsMenu` usages get `onReportRoleAction={canReportRole ? handleOpenRoleReport : undefined}` and `reportRoleLabel={canReportRole ? tRoles('reportRole') : undefined}`.
  - after `{/* Report comment */}`:

```tsx
            {/* Report role */}
            {roleReportOpen && comment.author && (
                <ReportTargetModal
                    open
                    eventId={activeEvent.id}
                    targetType="MEMBER"
                    targetId={comment.author.memberId}
                    targetName={comment.author.displayName}
                    variant="role"
                    onCloseAction={handleCloseRoleReport}
                />
            )}
```

- [ ] **Step 8: Verify.** `npx tsc --noEmit -p .`, `npx eslint components/feed components/reports hooks/useCustomRoleReport.ts`, `npx vitest run components/feed components/reports` → clean / PASS. Existing PostCard/comment tests that mock `@/providers/EventProvider` may need `useContentAccessMode: () => 'member'` added to their mock; add it where a test fails for that reason.

- [ ] **Step 9: Commit.**

```bash
git add hooks/useCustomRoleReport.ts components/reports/ReportTargetModal.tsx components/feed/post/PostActionsMenu.tsx components/feed/post/PostActionsMenu.test.tsx components/feed/PostCard.tsx components/feed/post/CommentActionsMenu.tsx messages/en.json messages/el.json
git commit -m "feat(member-roles): report a custom role from posts and comments"
```

(Add any test files you had to touch in Step 8 to the `git add`.)

---

### Task 4: Report role from stories

**Files:** Modify `hooks/useStoryModal.ts`, `components/story/StoryHeader.tsx`, `components/story/StoryModal.tsx`, `messages/en.json`, `messages/el.json`.

- [ ] **Step 1: Copy.** In `StoryPage` (both files) after `"reportStory"`: en `"reportRole": "Report role"`, el `"reportRole": "Αναφορά ρόλου"`.

- [ ] **Step 2: Hook.** In `hooks/useStoryModal.ts`:
  - replace `const [reportOpen, setReportOpen] = useState(false);` with `const [reportTarget, setReportTarget] = useState<'STORY' | 'ROLE' | null>(null);` and add `const reportOpen = reportTarget !== null;` right after it (every existing read of `reportOpen` keeps working: the story stays paused for either report).
  - every `setReportOpen(false)` becomes `setReportTarget(null)`; in `handleReportRequest`, `setReportOpen(true)` becomes `setReportTarget('STORY')`.
  - after `canReportStory`: `const canReportRole = useCustomRoleReport(author);` (import `useCustomRoleReport`; `author` is the variable the hook already returns as `author` — use that same value).
  - add, next to `handleReportRequest`:

```ts
    function handleReportRoleRequest() {
        if (!canReportRole) return;
        setShowMenu(false);
        videoEndedUnderReportRef.current = false;
        setReportTarget('ROLE');
    }
```

  - add `canReportRole: boolean; reportTarget: 'STORY' | 'ROLE' | null; handleReportRoleRequest: () => void;` to the return type and the returned object.

- [ ] **Step 3: Header.** In `components/story/StoryHeader.tsx` add props `canReportRole: boolean; onReportRoleRequest: () => void;`. The menu-button condition becomes `(canManage || canReport || canReportRole)` and the popover condition `((canManage && canDelete) || canReport || canReportRole)`. After the `reportStory` button add:

```tsx
                    {canReportRole && (
                        <button
                            type="button"
                            onClick={onReportRoleRequest}
                            className="motion-menu-item px-4 py-2.5 text-left text-sm whitespace-nowrap text-ink hover:bg-surface-muted disabled:opacity-50"
                        >
                            {t('reportRole')}
                        </button>
                    )}
```

- [ ] **Step 4: Modal.** In `components/story/StoryModal.tsx` read `canReportRole`, `reportTarget`, `handleReportRoleRequest` from `useStoryModal`, pass `canReportRole={canReportRole}` and `onReportRoleRequest={handleReportRoleRequest}` to `StoryHeader`, change the story report modal's `open={reportOpen}` to `open={reportTarget === 'STORY'}`, and after it add:

```tsx
                {/* Report role */}
                {canReportRole && author && (
                    <ReportTargetModal
                        eventId={activeStory.eventId}
                        targetType="MEMBER"
                        targetId={author.memberId}
                        targetName={authorName}
                        variant="role"
                        open={reportTarget === 'ROLE'}
                        layer="overStory"
                        onCloseAction={handleCloseReport}
                    />
                )}
```

- [ ] **Step 5: Verify.** `npx tsc --noEmit -p .`, `npx eslint hooks/useStoryModal.ts components/story`, `npx vitest run components/story hooks` → clean / PASS. `StoryModal.report.test.tsx` mocks `useStoryModal` or providers: add the new fields (`canReportRole: false`, `reportTarget: null`, `handleReportRoleRequest: vi.fn()`) to its mock if it fails.

- [ ] **Step 6: Commit.**

```bash
git add hooks/useStoryModal.ts components/story/StoryHeader.tsx components/story/StoryModal.tsx messages/en.json messages/el.json
git commit -m "feat(member-roles): report a custom role from stories"
```

---

### Task 5: Moderation center for `MEMBER` cases

**Files:** Modify `lib/adminModeration.ts`, `lib/adminModeration.test.ts`, `hooks/useAdminModeration.ts`, `components/admin/moderation/ModerationContentPreview.tsx`, `ModerationDecisionForm.tsx`, `ModerationDecisionForm.test.tsx`, `ModerationCaseDrawer.tsx`, `messages/en.json`, `messages/el.json`.

- [ ] **Step 1: Failing test.** In `lib/adminModeration.test.ts` add `expectedContentText: null` to the shared `base` request object, then append inside the `toDecisionRequest` describe:

```ts
    it('sends the text the admin saw with a removal on a member case', () => {
        const draft = { ...emptyDecision, ...statement, outcome: 'ACTION_TAKEN' as const, removeContent: true };
        expect(toDecisionRequest(draft, 'Θεία').expectedContentText).toBe('Θεία');
    });

    it('sends no expected text without a removal', () => {
        const draft = { ...emptyDecision, ...statement, outcome: 'ACTION_TAKEN' as const, suspendAccount: true };
        expect(toDecisionRequest(draft, 'Θεία').expectedContentText).toBeNull();
    });
```

Run `npx vitest run lib/adminModeration.test.ts` → FAIL.

- [ ] **Step 2: Implement.** In `lib/adminModeration.ts` change `toDecisionRequest` to:

```ts
// expectedContentText: a MEMBER case's custom role text as displayed (null for every other case).
export function toDecisionRequest(draft: DecisionDraft & { outcome: ModerationOutcome }, expectedContentText: string | null = null): DecisionRequest {
```

and in the built `request` object add `expectedContentText: acting && draft.removeContent ? expectedContentText : null,`. Run the test → PASS. Update the `toHaveBeenCalledWith({ … })` full-object assertion in `components/admin/moderation/ModerationDecisionForm.test.tsx` (around line 385) to include `expectedContentText: null`.

- [ ] **Step 3: Stale code.** In `hooks/useAdminModeration.ts` add `ERROR_CODES.MEMBER_ROLE_TEXT_CHANGED,` to `CASE_STALE_CODES` with the comment `// The custom role text changed since the case was read (member roles §6.2).`

- [ ] **Step 4: Copy.** In `AdminPage.moderation` (both files): `form` gets en `"removeCustomRole": "Remove the custom role"` / el `"removeCustomRole": "Αφαίρεση του δικού του ρόλου"`; `summary` gets en `"removeCustomRole": "Remove the member's custom role and stop them setting a new one"` / el `"removeCustomRole": "Αφαίρεση του δικού του ρόλου και κλείδωμα νέου"`; top level gets en `"customRoleLabel": "Custom role"` / el `"customRoleLabel": "Δικός του ρόλος"`.

- [ ] **Step 5: Preview.** `ModerationContentPreview` takes `isMemberCase?: boolean`. Inside `{/* Text */}`, when `isMemberCase && content.text`, render above the text:

```tsx
<span className="inline-flex rounded-full bg-status-neutral-wash px-2.5 py-0.5 text-[11px] font-bold text-status-neutral">{t('customRoleLabel')}</span>
```

(wrap label + text in a `<div className="space-y-1.5">`).

- [ ] **Step 6: Form.** `ModerationDecisionForm` takes `isMemberCase: boolean` and `expectedContentText: string | null`. Pass `expectedContentText` as the second argument of `toDecisionRequest`. Action labels: replace `t(\`form.${key}\`)` with `t(key === 'removeContent' && isMemberCase ? 'form.removeCustomRole' : \`form.${key}\`)`; summary lines: `t(line === 'removeContent' && isMemberCase ? 'summary.removeCustomRole' : \`summary.${line}\`)`. Add a test to `ModerationDecisionForm.test.tsx` that renders the form with `isMemberCase` and `expectedContentText="Θεία"` and `allowed.removeContent: true`, ticks "Remove the custom role", fills the statement the way the existing removal test does, confirms, and asserts `onSubmit` was called with `expect.objectContaining({ removeContent: true, expectedContentText: 'Θεία' })`. Give every existing render in that file `isMemberCase={false} expectedContentText={null}` (or default the props: `isMemberCase = false`, `expectedContentText = null`).

- [ ] **Step 7: Drawer.** In `ModerationCaseDrawer.tsx`: `const isMemberCase = targetType === 'MEMBER';`, pass `isMemberCase={isMemberCase}` to `ModerationContentPreview`, and `isMemberCase={isMemberCase}` plus `expectedContentText={isMemberCase ? (detail.content?.text ?? null) : null}` to `ModerationDecisionForm`.

- [ ] **Step 8: Verify.** `npx tsc --noEmit -p .`, `npx eslint lib/adminModeration.ts hooks/useAdminModeration.ts components/admin/moderation`, `npx vitest run lib/adminModeration.test.ts components/admin/moderation hooks/useAdminModeration.test.tsx` → clean / PASS.

- [ ] **Step 9: Commit.**

```bash
git add lib/adminModeration.ts lib/adminModeration.test.ts hooks/useAdminModeration.ts components/admin/moderation/ModerationContentPreview.tsx components/admin/moderation/ModerationDecisionForm.tsx components/admin/moderation/ModerationDecisionForm.test.tsx components/admin/moderation/ModerationCaseDrawer.tsx messages/en.json messages/el.json
git commit -m "feat(member-roles): moderation center handles custom role cases"
```

---

### Task 6: Blocked words

**Files:** Create `lib/blockedTerms.ts`, `lib/blockedTerms.test.ts`, `hooks/useBlockedTerms.ts`, `hooks/useBlockedTermsSection.ts`, `components/admin/memberRoles/BlockedTermsSection.tsx`, `components/admin/memberRoles/AddBlockedTermModal.tsx`, `components/admin/memberRoles/BlockedTermsSection.test.tsx`. Modify `components/admin/plans/PlansSettingsMemberRoles.tsx`, `messages/en.json`, `messages/el.json`.

- [ ] **Step 1: Copy.** Add `AdminPage.blockedTerms` (both files):

| key | en | el |
|---|---|---|
| `title` | Blocked words | Αποκλεισμένες λέξεις |
| `caption` | Blocked in custom roles in every language, on top of the built-in lists. | Αποκλείονται στους δικούς σας ρόλους σε όλες τις γλώσσες, επιπλέον των ενσωματωμένων λιστών. |
| `add` | Add word | Προσθήκη λέξης |
| `term` | Word | Λέξη |
| `added` | Added | Προστέθηκε |
| `empty` | No blocked words yet. | Δεν υπάρχουν αποκλεισμένες λέξεις. |
| `loading` | Loading words… | Φόρτωση λέξεων… |
| `termInvalid` | Enter a word that doesn't start with #. | Γράψτε μια λέξη που δεν ξεκινά με #. |
| `termTaken` | This word is already blocked. | Αυτή η λέξη είναι ήδη αποκλεισμένη. |
| `save` | Add | Προσθήκη |
| `cancel` | Cancel | Ακύρωση |
| `close` | Close | Κλείσιμο |
| `delete` | Delete {term} | Διαγραφή {term} |
| `deleteTitle` | Delete {term}? | Διαγραφή {term}; |
| `deleteBody` | Custom roles with this word will be allowed again. | Οι δικοί σας ρόλοι με αυτή τη λέξη θα επιτρέπονται ξανά. |
| `deleteConfirm` | Delete word | Διαγραφή λέξης |

- [ ] **Step 2: Failing lib test.** Create `lib/blockedTerms.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { BLOCKED_TERM_MAX, blockedTermError, validateBlockedTerm } from '@/lib/blockedTerms';

describe('validateBlockedTerm', () => {
    it('rejects blank and #-prefixed terms', () => {
        expect(validateBlockedTerm('  ')).toBe('invalid');
        expect(validateBlockedTerm('#tag')).toBe('invalid');
        expect(validateBlockedTerm(' word ')).toBeNull();
        expect(BLOCKED_TERM_MAX).toBe(60);
    });
});

describe('blockedTermError', () => {
    it('maps 409 to taken and anything else to other', () => {
        expect(blockedTermError(new ApiError(409, null))).toBe('taken');
        expect(blockedTermError(new ApiError(400, null))).toBe('other');
    });
});
```

Run `npx vitest run lib/blockedTerms.test.ts` → FAIL.

- [ ] **Step 3: Implement** `lib/blockedTerms.ts`:

```ts
import { ApiError } from '@/lib/api/client';

// Admin blocked words (member-roles-fe-integration.md §10).
export const BLOCKED_TERM_MAX = 60;

// The server also refuses a term with no letter or digit; that 400 shows its own message.
export function validateBlockedTerm(term: string): 'invalid' | null {
    const trimmed = term.trim();
    return trimmed === '' || trimmed.startsWith('#') ? 'invalid' : null;
}

export function blockedTermError(error: unknown): 'taken' | 'other' {
    return error instanceof ApiError && error.status === 409 ? 'taken' : 'other';
}
```

Run → PASS.

- [ ] **Step 4: Data hooks.** Create `hooks/useBlockedTerms.ts`:

```ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { BlockedTermDto, BlockedTermRequestDto } from '@/lib/api/types';

export const blockedTermKeys = { list: ['admin', 'blocked-terms'] as const };

export function useBlockedTerms() {
    return useQuery({ queryKey: blockedTermKeys.list, queryFn: () => api.get<BlockedTermDto[]>(endpoints.admin.blockedTerms.collection) });
}

export function useAddBlockedTerm() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: BlockedTermRequestDto) => api.post<BlockedTermDto>(endpoints.admin.blockedTerms.collection, input),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: blockedTermKeys.list }),
    });
}

export function useDeleteBlockedTerm() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.del<void>(endpoints.admin.blockedTerms.byId(id)),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: blockedTermKeys.list }),
    });
}
```

- [ ] **Step 5: Section hook.** Create `hooks/useBlockedTermsSection.ts`:

```ts
'use client';

import { type ChangeEvent, useCallback, useMemo, useState } from 'react';

import { useAddBlockedTerm, useBlockedTerms, useDeleteBlockedTerm } from '@/hooks/useBlockedTerms';
import type { BlockedTermDto } from '@/lib/api/types';
import { blockedTermError, validateBlockedTerm } from '@/lib/blockedTerms';

// The blocked words list, its add modal and its delete confirmation.
export function useBlockedTermsSection() {
    const terms = useBlockedTerms();
    const add = useAddBlockedTerm();
    const remove = useDeleteBlockedTerm();
    const [adding, setAdding] = useState(false);
    const [draft, setDraft] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [deleting, setDeleting] = useState<BlockedTermDto | null>(null);

    const sorted = useMemo(() => [...(terms.data ?? [])].sort((left, right) => left.term.localeCompare(right.term)), [terms.data]);
    const invalid = submitted && validateBlockedTerm(draft) !== null;
    const addFailure = add.error ? blockedTermError(add.error) : null;

    const openAdd = useCallback(() => {
        add.reset();
        setDraft('');
        setSubmitted(false);
        setAdding(true);
    }, [add]);
    const closeAdd = useCallback(() => setAdding(false), []);
    const handleDraftChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setDraft(event.currentTarget.value), []);

    function handleAddSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitted(true);
        if (validateBlockedTerm(draft) !== null || add.isPending) return;
        add.mutate({ term: draft.trim() }, { onSuccess: () => setAdding(false) });
    }

    const requestDelete = useCallback(
        (id: string) => {
            remove.reset();
            setDeleting(sorted.find((term) => term.id === id) ?? null);
        },
        [remove, sorted],
    );
    const cancelDelete = useCallback(() => setDeleting(null), []);
    function confirmDelete() {
        if (deleting) remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
    }

    return {
        terms: sorted,
        isLoading: terms.isLoading,
        loadError: terms.error,
        adding,
        draft,
        invalid,
        addFailure,
        addError: add.error,
        isAdding: add.isPending,
        openAdd,
        closeAdd,
        handleDraftChange,
        handleAddSubmit,
        deleting,
        deleteError: remove.error,
        isDeleting: remove.isPending,
        requestDelete,
        cancelDelete,
        confirmDelete,
    };
}

export type BlockedTermsSectionState = ReturnType<typeof useBlockedTermsSection>;
```

- [ ] **Step 6: Add modal.** Create `components/admin/memberRoles/AddBlockedTermModal.tsx`:

```tsx
'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { Modal } from '@/components/ui/modal';
import type { BlockedTermsSectionState } from '@/hooks/useBlockedTermsSection';
import { getErrorMessage } from '@/lib/api/errors';
import { BLOCKED_TERM_MAX } from '@/lib/blockedTerms';

export function AddBlockedTermModal({ section }: { section: BlockedTermsSectionState }) {
    const t = useTranslations('AdminPage.blockedTerms');
    const hint = section.invalid ? t('termInvalid') : section.addFailure === 'taken' ? t('termTaken') : undefined;

    return (
        <Modal open={section.adding} onClose={section.closeAdd} size="sm" closeLabel={t('close')} ariaLabel={t('add')}>
            <Modal.Body className="px-5 pt-6 pb-5">
                <form onSubmit={section.handleAddSubmit} className="space-y-4" noValidate>
                    {/* Header */}
                    <h2 className="text-base font-semibold text-ink">{t('add')}</h2>

                    {/* Word */}
                    <AdminField label={t('term')} required hint={hint}>
                        <input
                            value={section.draft}
                            onChange={section.handleDraftChange}
                            maxLength={BLOCKED_TERM_MAX}
                            autoComplete="off"
                            aria-invalid={Boolean(hint)}
                            className={adminInputClass('font-mono')}
                        />
                    </AdminField>
                    {section.addFailure === 'other' && <p className="text-sm text-status-danger">{getErrorMessage(section.addError)}</p>}

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={section.closeAdd} className="h-9 rounded-md px-3 text-sm font-semibold text-ink-muted hover:text-ink">
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={section.isAdding}
                            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white disabled:opacity-50"
                        >
                            {section.isAdding && <Loader2 className="h-4 w-4 animate-spin" />}
                            {t('save')}
                        </button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    );
}
```

(Check `AdminField`'s props in `components/admin/AdminField.tsx`; `MemberRoleDrawer` already uses `label`, `required`, `hint`.)

- [ ] **Step 7: Section.** Create `components/admin/memberRoles/BlockedTermsSection.tsx`:

```tsx
'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { AddBlockedTermModal } from '@/components/admin/memberRoles/AddBlockedTermModal';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { LoadingState } from '@/components/ui/LoadingState';
import { useBlockedTermsSection } from '@/hooks/useBlockedTermsSection';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import { formatDate } from '@/lib/datetime';

export function BlockedTermsSection() {
    const t = useTranslations('AdminPage.blockedTerms');
    const tAdmin = useTranslations('AdminPage');
    const locale = useLocale();
    const section = useBlockedTermsSection();

    function handleDeleteClick(event: MouseEvent<HTMLButtonElement>) {
        section.requestDelete(event.currentTarget.dataset.id ?? '');
    }

    return (
        <section className="space-y-3">
            {/* Header */}
            <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-ink">{t('title')}</h3>
                    <p className="text-sm text-ink-muted">{t('caption')}</p>
                </div>
                <button
                    type="button"
                    onClick={section.openAdd}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
                >
                    <Plus className="h-4 w-4" />
                    {t('add')}
                </button>
            </div>

            {/* Words */}
            <div className="rounded-xl border border-border bg-card">
                {section.isLoading && <LoadingState label={t('loading')} className="justify-start p-4" />}
                {section.loadError && <p className="p-4 text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(section.loadError)}`)}</p>}
                {!section.isLoading && !section.loadError && section.terms.length === 0 && (
                    <p className="px-3 py-8 text-center text-sm text-ink-muted">{t('empty')}</p>
                )}
                {section.terms.length > 0 && (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                                <th className="px-3 py-2">{t('term')}</th>
                                <th className="px-3 py-2">{t('added')}</th>
                                <th className="px-3 py-2" />
                            </tr>
                        </thead>
                        <tbody>
                            {section.terms.map((term) => (
                                <tr key={term.id} className="border-b border-border/70 last:border-b-0">
                                    <td className="px-3 py-2.5 font-mono text-sm text-ink">{term.term}</td>
                                    <td className="px-3 py-2.5 text-sm text-ink-muted">{formatDate(locale, term.createdAt, { dateStyle: 'medium' })}</td>
                                    <td className="px-3 py-2.5 text-right">
                                        <button
                                            type="button"
                                            data-id={term.id}
                                            onClick={handleDeleteClick}
                                            aria-label={t('delete', { term: term.term })}
                                            className="rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-status-danger"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add */}
            <AddBlockedTermModal section={section} />

            {/* Delete confirmation */}
            <ConfirmActionModal
                open={section.deleting !== null}
                onCloseAction={section.cancelDelete}
                title={t('deleteTitle', { term: section.deleting?.term ?? '' })}
                body={t('deleteBody')}
                cancelLabel={t('cancel')}
                confirmLabel={t('deleteConfirm')}
                isConfirming={section.isDeleting}
                onConfirmAction={section.confirmDelete}
            />
        </section>
    );
}
```

(Check `adminErrorMessageKey` and `formatDate` usage against `MemberRolesPanel.tsx` and `lib/datetime.ts`; match their signatures.)

- [ ] **Step 8: Mount.** In `components/admin/plans/PlansSettingsMemberRoles.tsx` import `BlockedTermsSection` and render it after `<MemberRolesPanel />`:

```tsx
            <MemberRolesPanel />

            {/* Blocked words */}
            <div className="mt-10">
                <BlockedTermsSection />
            </div>
```

- [ ] **Step 9: Component test.** Create `components/admin/memberRoles/BlockedTermsSection.test.tsx` that mocks `next-intl` (`useTranslations: () => (key, values) => values?.term ? \`${key}:${values.term}\` : key`, `useLocale: () => 'en'`), mocks `@/hooks/useBlockedTermsSection` with a mutable state object (like `components/demo/DemoPersonaDetails.test.tsx` does), mocks `AddBlockedTermModal` to `() => null`, and asserts: the empty state text `empty` with no terms; a row per term with its word; clicking `delete:fuck` calls `requestDelete('t1')`; `openAdd` is called by the `add` button.

Run `npx vitest run lib/blockedTerms.test.ts components/admin/memberRoles` → PASS.

- [ ] **Step 10: Verify.** `npx tsc --noEmit -p .`, `npx eslint lib/blockedTerms.ts hooks/useBlockedTerms.ts hooks/useBlockedTermsSection.ts components/admin/memberRoles components/admin/plans/PlansSettingsMemberRoles.tsx` → clean.

- [ ] **Step 11: Commit.**

```bash
git add lib/blockedTerms.ts lib/blockedTerms.test.ts hooks/useBlockedTerms.ts hooks/useBlockedTermsSection.ts components/admin/memberRoles/BlockedTermsSection.tsx components/admin/memberRoles/AddBlockedTermModal.tsx components/admin/memberRoles/BlockedTermsSection.test.tsx components/admin/plans/PlansSettingsMemberRoles.tsx messages/en.json messages/el.json
git commit -m "feat(member-roles): admin blocked words"
```

---

### Task 7: Final check

- [ ] `npx tsc --noEmit -p .` → no output.
- [ ] `npm run lint` → 0 errors.
- [ ] `npx vitest run` → all pass.
- [ ] Visual check (user signs in; never `preview_start` with a `name`, only `{url: "http://localhost:3000/"}`): a post/comment/story by a member with custom role text shows "Report role" in its "…" menu and opens the role report modal; catalog roles show no item; the admin moderation drawer for a `MEMBER` case shows the "Custom role" label and "Remove the custom role"; Plans → Settings → Member roles shows Blocked words with add and delete. Mobile first for the guest menus, desktop for admin.
