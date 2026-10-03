# Member roles C: reporting, moderation and blocked words

Sub-project C of the member roles integration (backend guide
`event_social_media/docs/fe-guides/member-roles-fe-integration.md` §6, §10, §11). A and B are on
staging. C covers the last three checklist items: reporting custom role text, the moderation center
for `MEMBER` cases, and the admin blocklist.

## 1. Report a custom role

Any active member may now report a member who has custom role text (guide §6.1). Hosts keep their
existing "Report member" action in Manage → Members.

**Entry point.** The "…" actions menu on posts, comments, replies and stories gets a "Report role"
item. It shows only when all of these hold:

- the author has custom role text (`AuthorDto.customRole`). Catalog roles can't be reported;
- the viewer is a member and is not the author;
- the viewer is not a demo visitor;
- `/api/config` `reportTargetTypes` includes `MEMBER`.

Hosts see it too. Chips stay plain text (no tap target).

**Action.** Opens the existing `ReportTargetModal` with `targetType: "MEMBER"` and
`targetId: author.memberId`. The modal gets a role-specific body: "Report {name}'s role to the
platform team." Reasons, details, and the existing error handling (own content, gone, rate limit)
are unchanged.

**Code.** `canReportCustomRole({ author, viewerMemberId, isDemoVisitor, reportTargetTypes })` in
`lib/memberRoles.ts`, a small hook `useCustomRoleReport(author)` that returns the flag from the
active member and config, and one extra item plus modal state in each menu
(`PostCard`, `CommentActionsMenu`, the story menu). The modal takes an optional `variant: 'role'` to pick the
role body.

## 2. Moderation center: `MEMBER` cases

For a `MEMBER` case, `content.text` is the member's custom role text and
`allowedActions.removeContent` is true only while it exists (guide §6.2).

- **Preview.** `ModerationContentPreview` shows a small "Custom role" label above the text when the
  case target type is `MEMBER`.
- **Wording.** For `MEMBER` cases the remove action reads "Remove custom role", in the action list
  and in the confirm summary. Other case types keep "Remove the content".
- **Request.** `toDecisionRequest` takes the case's target type and `content.text`. When it is a
  `MEMBER` case and `removeContent` is sent, the request carries `expectedContentText` set to that
  text. It is omitted otherwise.
- **5115 `MEMBER_ROLE_TEXT_CHANGED`.** Added to `ERROR_CODES`, to the case-stale codes in
  `useAdminModeration` (the case is re-read), and to the API error copy: "The role changed since
  you opened this case. Check it and decide again."
- Remove member, ban, account and StoryWall suspension are unchanged.

## 3. Admin: blocked words

`/api/admin/blocked-terms` (guide §10). Extra terms on top of the built-in English and Greek lists,
which can't be viewed here.

- **Place.** Plans → Settings → Member roles, a "Blocked words" section below the roles table.
- **List.** A compact table: term (monospace) and date added. One caption line: blocked in custom
  roles in every language, on top of the built-in lists. Empty state: "No blocked words yet."
- **Add.** An "Add word" button opens a small modal with one field (max 60). The client rejects
  a blank term and one starting with `#`. The server's 400 (no letter or digit) shows its message; a
  409 shows "This word is already blocked."
- **Delete.** Per row, behind a confirmation modal: "Delete {term}?" / "Custom roles with this word
  will be allowed again." Buttons: "Delete word" and "Cancel".
- **Data.** `BlockedTermDto`, `BlockedTermRequestDto`, `endpoints.admin.blockedTerms`, and hooks
  `useBlockedTerms`, `useAddBlockedTerm`, `useDeleteBlockedTerm` (each write invalidates the list).
- **Look.** Admin console tokens (slate surfaces, monospace for the term), no pills.

## Copy

All new strings in en and el. Report: `Report.roleBody`, menu item `reportRole`. Moderation:
`customRoleLabel`, `removeCustomRole` (action and summary). API error `memberRoleTextChanged`. Admin:
`blockedTerms.{title,caption,add,term,added,empty,termInvalid,termTaken,deleteTitle,deleteBody,
deleteConfirm,cancel,save,loading}`.

## Testing

- `canReportCustomRole`: custom text, catalog role, self, demo visitor, config without `MEMBER`.
- Menu items render only when allowed and open the modal with the member target.
- `toDecisionRequest`: `expectedContentText` only for `MEMBER` + `removeContent`.
- 5115 re-reads the case.
- Blocked words: list, add (validation, 409), delete with confirmation.
