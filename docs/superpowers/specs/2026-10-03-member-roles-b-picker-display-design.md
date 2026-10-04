# Member roles B: picker and role display

Sub-project B of the member roles integration (backend guide: `event_social_media/docs/fe-guides/member-roles-fe-integration.md`, §2, §3, §4, §8). Sub-project A (contract, admin catalog, plan config, plan card) is merged. Sub-project C (reporting custom text, moderation, blocklist) is out of scope.

## Goals

- A member can pick, change or clear their own role for an event.
- Hosts and co-hosts can set, clear and unlock any member's role from Manage → Members.
- Roles show as a small chip after the author's name on posts, comments and stories.

## Decisions

| Topic | Decision |
|---|---|
| Member entry points | Own role chip in the feed, "My role" in the tools menu (mobile menu + desktop right panel), one-time prompt on first feed visit with no role |
| Host entry point | Manage → Members: tap a row to open a member role sheet |
| Display | Small chip (emoji + label) after the name on posts, comments and the story viewer header |
| No role | No chip, not even on your own posts |
| Picker layout | Single-select list, full roles disabled with "Full", last row "Other" reveals a text field |
| Prompt trigger | First feed visit when the member has no role, once per member per device |
| Sheet wiring | One sheet in the event layout, opened by `?sheet=role` |
| Back button | Closes the sheet |

## 1. Data and hooks

### Types (`lib/api/types.ts`)

- `AuthorDto` gains `roleKey: string | null` and `customRole: string | null` (both null when the module is off).
- New `MemberRoleOptionsDto { allowCustom, customLocked, roles: MemberRoleOptionDto[] }`.
- New `MemberRoleOptionDto { roleKey, label: { en, el }, emoji, maxHolders, holders, available }`.
- New `MemberRoleRequestDto { roleKey?: string; customRole?: string }` (exactly one is sent).

### Endpoints (`lib/api/endpoints.ts`)

- `events.memberRoles(eventId)` → `GET /api/events/{eventId}/member-roles`
- `eventMembers.role(id)` → `PUT` / `DELETE /api/event-members/{id}/role`
- `eventMembers.roleLock(id)` → `DELETE /api/event-members/{id}/role-lock`

### `hooks/useMemberRoleOptions.ts`

- Exports `memberRoleOptionKeys.list(eventId)` and `useMemberRoleOptions(eventId, enabled)`.
- Enabled only while a role sheet is open and the `member_roles` module is available.

### `hooks/useMemberRoleMutations.ts`

- `useSetMemberRole(eventId)`, `useClearMemberRole(eventId)`, `useUnlockMemberRole(eventId)`.
- `PUT` and `DELETE` return 204 with no body. On success the client updates its own caches (guide §8):
  - the member in the members list cache (`relationshipRole`, `customRelationshipRole`),
  - the active member in the event context (own role),
  - `author.roleKey` / `author.customRole` on that member's posts, comments and stories in cached feed data,
  - invalidate `memberRoleOptionKeys.list(eventId)` so `holders` / `available` are fresh.
- On `3041`, `4016` or `5114`: refetch the options and keep the sheet open.

### Pure helpers (`lib/memberRoles.ts`)

- `authorRoleLabel({ author, eventTypeKey, catalog, locale })`: reuses `memberRoleLabel`.
- `RolePickerDraft` = `{ choice: roleKey | 'OTHER' | null; customText: string }`, with `draftFromMember`, `isDraftChanged` and `buildRoleRequest(draft)` (trims custom text).
- `roleErrorKind(error)` maps an API error to one of: `length`, `blocked`, `stale`, `locked`, `full`, `featured`, `moduleOff`, `notActive`, `rateLimited`, `other`.
- `withAuthorRole(item, memberId, roleKey, customRole)`: returns the item with an updated author when the author matches, used by the cache patchers.

### Gating

The role UI (chips, picker, tools item, prompt, host sheet) is hidden when the `member_roles` module is not available for the event. The member picker is hidden for featured members (`isFeatured`) and when the event is not ACTIVE.

## 2. Member picker

### `components/memberRoles/RolePickerList.tsx`

Shared body for the member sheet and the host sheet.

- Single-select list: emoji + label per role. Options with `available: false` are disabled and show "Full", unless the role is the member's current role.
- Last row "Other", only when `allowCustom`. Selecting it reveals a text input with `maxLength` from `memberCustomRelationshipRoleMaxLength` (40).
- When `customLocked` (member view only): "Other" is disabled with the line "Your custom role was removed. You can still pick one from the list."
- Inline error line above the footer (see §4).

### `components/memberRoles/MyRoleSheet.tsx`

- `Modal variant="sheet"`, title "My role".
- Footer: "Clear role" (quiet, only when the member has a role, no confirmation) and "Save" (primary, disabled until the draft changes).

### `hooks/useMyRoleSheet.ts`

- Reads `?sheet=role` from the URL. Exposes `isOpen`, `open()`, `close()` plus draft state and save/clear.
- `open()` calls `router.push(<current path>?sheet=role)` and records in module state that the sheet was opened in-app.
- `close()`: if opened in-app, `router.back()`; otherwise (tools link, fresh load, shared URL) `router.replace` without the param.
- The browser back button removes the param, which closes the sheet.
- Mounted once in the event layout, only when the gating in §1 passes.

### Entry points

- **Feed chip:** the role chip on your own posts and comments is a button that calls `open()`. Other members' chips are plain text.
- **Tools menu:** "My role" item (`UserRound` icon) in `useToolsMenuItems`, `href` = feed route with `?sheet=role`. Same gating as the sheet. Hosts see it too.
- **One-time prompt:** `hooks/useRolePromptOnce.ts` on the feed. When the member has no role and `localStorage` key `sw.rolePrompt.{memberId}` is unset, it calls `open()` once and sets the key. Storage access is wrapped in try/catch; on failure, no prompt.

## 3. Host side and display

### Member rows (`components/manage/members/MemberRow.tsx`)

- A role chip after the existing "Host" chip, from `useMemberRoleLabel`, same muted chip style.
- When the host can moderate and the module is available, the avatar + name area becomes a button that opens the member role sheet. Report and Remove stay as they are.
- Featured members: no sheet and no role chip.

### `components/manage/members/MemberRoleSheet.tsx`

- `Modal variant="sheet"`, title = member's display name.
- Body: `RolePickerList`. "Other" is never locked for hosts (they bypass 4017). Caps still apply.
- Footer: "Clear role" and "Save". Clearing custom text asks for confirmation in `ConfirmActionModal` (removing it locks the member's custom role); clearing a catalog role does not.
- "Unlock custom role": quiet text button at the bottom, shown when `allowCustom`. Always available because the lock state is not exposed to hosts. Shows a short "Done" line after success.
- State lives in `hooks/useMemberRoleSheet.ts` (selected member, draft, mutations). `MembersPanel` only renders it.

### Chips (`components/memberRoles/RoleChip.tsx`)

- Small pill with the label text, truncated around 16ch. Renders as a button when given an `onClick`.
- Placed after the name in `PostAuthorAvatar`, `CommentThreadItem`, `ReplyItem` and `components/story/StoryHeader.tsx`. Not on the `StoriesRow` avatar ring.
- Label from `hooks/useAuthorRoleLabel.ts` (`author`, active event's `eventTypeKey`, config catalog). Null for unknown keys or when the module is off.

## 4. Errors

Copy lives under `MemberRoles.errors.*` in `en.json` and `el.json`.

| Code | Kind | UI |
|---|---|---|
| 3040 | `length` | "A role must be 1 to 40 characters." |
| 3042 | `blocked` | "That role has a word we don't allow." Input is kept. |
| 3041, 4016 | `stale` | Refetch options. "That role isn't available anymore. Pick another." |
| 4017 | `locked` | Disable "Other", show the locked line. |
| 5114 | `full` | Refetch options. "All {count} places for this role are taken." (`maxHolders` of the chosen option) |
| 5113 | `featured` | Close the sheet. |
| 5012 | `moduleOff` | Close the sheet, refetch event modules. |
| 5014 | `notActive` | "Roles can be set once the event is live." |
| 3010 | `rateLimited` | "Too many changes. Try again later." |
| other | `other` | Generic `useApiErrorMessage` text. |

## 5. Testing

- `lib/memberRoles.test.ts`: `buildRoleRequest`, `draftFromMember`, `isDraftChanged`, `roleErrorKind`, `withAuthorRole`, `authorRoleLabel`.
- `hooks/useMemberRoleMutations.test.tsx`: success patches the members list and feed caches; 5114 refetches options.
- `components/memberRoles/RolePickerList.test.tsx`: full role disabled unless current; "Other" hidden without `allowCustom`; locked line when `customLocked`.
- `hooks/useRolePromptOnce.test.tsx`: opens once and sets the key; skips when the member has a role; skips when storage throws.
- `hooks/useMyRoleSheet.test.tsx`: `close()` uses `back()` after an in-app open, `replace` otherwise.
- `hooks/useToolsMenuItems.test.tsx`: "My role" follows module, featured and ACTIVE gating.
- Visual check of the feed chip, member sheet and host sheet on mobile width, plus a desktop pass.

## Out of scope

- Reporting custom role text, moderation of `MEMBER` content, `expectedContentText` / 5115, the admin blocklist (sub-project C).
- Showing "locked" next to a member for hosts (no API field).
