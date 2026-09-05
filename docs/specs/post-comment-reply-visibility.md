# Post comments: new replies get lost — investigation and fix spec

**Status:** bug confirmed, fix not implemented.
**Reproduction:** `hooks/useComments.repro.test.tsx` (8 passing tests, all asserting current broken behavior).

---

## 1. Root cause

`hooks/useComments.ts:64` invalidates the wrong thing:

```ts
queryClient.invalidateQueries({ queryKey: postKeys.detail(comment.postId) });
```

React Query's `invalidateQueries` matches by **key prefix**, and the key factories overlap:

| Key | Value |
|---|---|
| `postKeys.detail(id)` | `['posts', id]` |
| `commentKeys.list(id)` | `['posts', id, 'comments']` |
| `postKeys.media(id)` | `['posts', id, 'media']` |
| `reactionKeys.list(id)` | `['posts', id, 'reactions']` |

So the line intended to refresh the post's `commentCount` also invalidates — and, because the query is active, immediately refetches — the very comment list that the two lines above it just hand-appended to.

The sequence inside `useCreateComment.onSuccess` is:

1. `cancelQueries` on the comment list (guards against the sentinel's `fetchNextPage`).
2. `setQueryData` appends the new comment to the last **loaded** page.
3. `invalidateQueries(postKeys.detail)` — prefix-matches the comment list, discards step 2, and refetches the loaded page range.

Step 3 is fire-and-forget, so its timing is nondeterministic. That is the "race condition" instinct: the write in step 2 always lands, and is then always undone, but *when* it is undone (and whether the refetch happens to return the new comment) varies. The comment in the source explaining why the append exists is correct — the append itself is simply overwritten three lines later.

`useComments.ts:64` is the only prefix collision of this kind in the codebase (`grep -rn "postKeys.detail\|postKeys.media" hooks/`), so the blast radius of fixing it is small.

## 2. Why each reported symptom happens

The refetch re-fetches **only the page range already loaded** (pages `0..k`). New comments sort oldest-first, so they live on the **true last** page — which is often outside that range.

| Symptom | Cause |
|---|---|
| "it doesn't show at all / gets lost" | The reply pushed the thread onto a page beyond the loaded window. The refetch returns pages `0..k` without it. Test 2. |
| "appears for a split second and then disappears" | The `setQueryData` append renders; the invalidation's refetch lands a moment later and removes it. Test 3. |
| "the page won't refresh correctly" | `hasNextPage` is recomputed from the refetched `totalPages`, so a "load more" appears — but only a scroll to the sentinel recovers the reply. Meanwhile the header reads "31 comments" over 30 rendered rows, because `post.commentCount` was refetched but the list was not. Test 4. |
| "it gets added a loooot further down" | The append targets `pages[pages.length - 1]` — the last *loaded* page, not the last page. On a 95-comment thread with one page loaded, the new comment renders at flat index 30 of 31, roughly 65 comments away from where it belongs. Test 5. |
| "mostly reproducible in nested comments" | Two reasons. (a) Replies are only reachable behind the "View replies" toggle, and `autoExpandThread` opens a thread whose `replies.length` is now 0 — `CommentThreadItem.tsx:58` hides the toggle in that case, so the thread is flagged expanded but renders nothing and offers no control. (b) `groupCommentsIntoThreads` drops any reply whose ancestor chain does not resolve to a loaded top-level comment — `lib/comments.ts:40` uses `thread?.replies.push(...)`, a silent no-op. Tests 6 and 7. |

Two latent defects the same tests pin down:

- **Duplicate ids survive grouping** (`lib/comments.ts`, test 8) and reach React as duplicate `key` props in `CommentsList`/`CommentThreadItem`. Reachable whenever a manual insert and a server page both carry the same comment, and whenever offset pagination shifts across a delete.
- **`totalPages` is never updated** by the append while `totalElements` is, so the cache's pagination metadata is internally inconsistent between the append and the refetch.

## 3. Target behavior (Facebook / Instagram parity)

1. Posting a comment or reply shows it **immediately**, in its **final position** — a top-level comment at the end of the thread, a reply at the end of its parent's reply list.
2. It **never moves and never disappears**. Not on the invalidation refetch, not on window focus, not on `fetchNextPage`, not on modal reopen while the session lasts.
3. Its thread is **expanded and scrolled into view** so the member sees their own reply land.
4. A comment is rendered **exactly once**, whatever the cache contains.
5. The header count and the rendered rows agree at every moment.
6. A failed post surfaces an error and leaves the composer text intact; nothing optimistic is left behind.

## 4. Requirements

### R1 — Stop the collateral invalidation *(fixes the root cause)*

`useCreateComment.onSuccess` must not invalidate the comment list as a side effect of refreshing the post.

- Use `invalidateQueries({ queryKey: postKeys.detail(postId), exact: true })`, **or** patch `commentCount` directly via the existing `patchPostInCaches(queryClient, eventId, postId, { commentCount })` (`hooks/usePosts.ts:19`) and skip the detail invalidation entirely. The latter is preferred: it keeps the header count in step with the list with no extra request.
- `useDeleteComment` needs the same treatment when it starts touching `commentCount`.
- Add a guard test asserting that `commentKeys.list(id)` is **not** matched by an invalidation of `postKeys.detail(id)`.
- Do not rename the key factories to dodge the overlap. `['posts', id, 'comments']` is the correct shape; `exact` is the correct tool. Add a one-line comment at each key factory noting the nesting so the next author does not reintroduce this.

### R2 — Do not write new comments into paginated cache pages

Hand-editing an offset-paginated `InfiniteData` cannot be made correct: the entry belongs on a page that is not loaded, and any refetch of the loaded range legitimately erases it.

- Remove the `setQueryData` append and the `cancelQueries` that guards it. The infinite query becomes a pure mirror of the server.
- Introduce **session-local pending comments**: comments created by this member in this modal session, held as plain React state (not in the query cache), merged into the rendered list.
- Merge rule: render `serverComments` then any pending comment whose `id` is not already present in `serverComments`. When a later page fetch or refetch brings the real record in, the pending copy drops out by id with no visible change — same id, same content, same position.
- Pending comments are cleared when the modal closes (`postId` changes). They are a display aid, not a cache.

### R3 — Place new comments at their true position

- A new top-level comment renders at the **end of the thread**, after every loaded comment and after the "load more" boundary — i.e. below the sentinel, not at the end of page `k`.
- A new reply renders at the **end of its parent thread's reply list**.
- Never at the end of the last loaded page.

### R4 — Deduplicate by id

- `groupCommentsIntoThreads` must emit each comment id at most once, as a top-level comment or as a reply, never both and never twice.
- This is required independently of R2: offset pagination shifts entries across page boundaries whenever a comment is deleted, so duplicates are reachable from the server alone.

### R5 — Never silently drop a reply

`lib/comments.ts:40`'s `thread?.replies.push(comment)` must go.

- If a reply's ancestor chain resolves to a loaded top-level comment, attach it there (current behavior, kept).
- If it does not, attach it to the nearest **loaded** ancestor.
- If no ancestor is loaded, render it as a top-level entry in `createdAt` order rather than discarding it.
- Add a test asserting that grouping is total: every input id appears exactly once in the output.

### R6 — Thread expansion must survive a lost/late reply

- A thread with `isExpanded === true` must always offer the "Hide replies" control, even when `replies.length === 0` — `CommentThreadItem.tsx:58` currently hides it, producing a thread that is open with nothing in it and no way to act.
- `autoExpandThread` must resolve to the **top-level thread id**, not the raw `parentCommentId`. These coincide today only because `ReplyItem` passes the top-level id up (`CommentThreadItem.tsx:75`); the resolution must be explicit so it survives real nesting.
- Once a thread is expanded, it stays expanded for the session. Nothing may collapse it implicitly.

### R7 — Scroll the new comment into view

After a successful post, scroll the new comment into view within the modal body (`behavior: 'smooth'`, `block: 'nearest'`). Without this, a member posting to a long thread sees nothing move and reads it as a failure — which is part of the reported bug even when the data is correct.

### R8 — Make the infinite-scroll sentinel safe

`hooks/useInfiniteScrollSentinel.ts` re-attaches its observer on every `itemCount` change and calls `onLoadMore` synchronously on intersection.

- Do not call `onLoadMore` while a fetch for that query is already in flight; take an `isFetching` argument and bail.
- This is defence in depth. With R1 and R2 the append/refetch race is gone, but the sentinel can still stack `fetchNextPage` calls on a short thread where it sits permanently in view.

### R9 — Keep the count and the list consistent

- `post.commentCount` drives both the header (`PostCommentsPanel.tsx:69`) and the "N comments" / "no comments yet" heading (`:78`). Both must reflect pending comments.
- Per the project's no-duplicate-facts rule, the count appears in one place. `CommentCount` at `:69` and the `commentCount` heading at `:78` are the same number rendered twice in the same panel — collapse to one while this area is open.

### R10 — Handle the failure path

- On a failed post, no pending comment is left behind, the composer keeps its text and `replyTarget`, and the error renders in the existing `commentError` slot.
- On success the composer clears and `replyTarget` resets — current behavior, preserved.

## 5. Out of scope (flag, do not fix here)

- **Replying to a reply loses its addressee.** `ReplyItem.handleReply` (`ReplyItem.tsx:23`) sends the *top-level* comment id as the parent but the *reply author's* name as the "Replying to X" label, so a second-level reply is attached one level above the person it answers. Flattening to one level is deliberate (`lib/comments.ts:13`); the label/parent mismatch is not. Instagram solves this with an `@name` prefix on the body. Needs a product decision.
- **The compact preview shows the wrong three comments.** `PlaylistDigestCard.tsx:37` takes `comments.slice(0, 3)` of an oldest-first list, so the preview is the three *oldest* comments — and it flattens replies in as if they were top-level. Separate bug, separate fix.

## 6. Structure

Per `CLAUDE.md`, the orchestration belongs in a hook, not in `PostModal.tsx` (which currently owns four `useState`s, the submit handler, the merge, and the reply targeting).

- New `hooks/usePostCommentThread.ts` owns: the infinite query, the create mutation, pending comments, the merged list, `replyTarget`, `autoExpandThread`, composer text, and errors. It exposes plain values and actions.
- `PostModal.tsx` becomes a render shell over that hook.
- `groupCommentsIntoThreads` stays in `lib/comments.ts` and stays pure.

## 7. Acceptance

The reproduction suite is inverted and kept as the regression suite. Each test becomes an assertion of the fixed behavior:

| Test | Now asserts | Must assert |
|---|---|---|
| 1 | `postKeys.detail` prefix-matches the comment list | invalidation with `exact` does not match it |
| 2 | reply beyond the loaded window is gone | reply is present and attached to its parent |
| 3 | reply flashes in and back out | reply is present in every snapshot after posting |
| 4 | reply missing while `hasNextPage` flips | list and `commentCount` agree throughout |
| 5 | reply lands at flat index 30 of 31 | reply is the last entry of its thread |
| 6, 7 | orphan replies are dropped | grouping is total — every id appears exactly once |
| 8 | duplicate ids survive grouping | duplicates collapse to one |

Additional cases to cover:

- Post a reply, then `fetchNextPage` → the reply appears exactly once.
- Post a reply, then refetch on window focus → the reply is still there.
- Post two replies to different threads in quick succession → both land, in the right threads.
- Post a reply that fails → nothing pending remains, the composer text survives.
- Manual check on a thread of 100+ comments, at mobile width, with the modal scrolled to the top when posting.
