import { ApiError } from '@/lib/api/client';
import { ERROR_CODES, getErrorCode } from '@/lib/api/errors';
import type { MediaResponseDto, SneakPeekPatchDto, VendorMeDto } from '@/lib/api/types';
import { hasVendorCapability } from '@/lib/vendors';

// The backend's limit for a sneak peek (the normal post limit is 10).
export const SNEAK_PEEK_MAX_ITEMS = 20;

export type SneakPeekState = 'hidden' | 'notOpen' | 'noItems' | 'ready' | 'posted' | 'postedClosed' | 'used';

// What the vendor page's Sneak peek section shows. Closed tools are explained by the page's access line,
// so the section adds nothing for them unless there is a post to link to.
export function sneakPeekState(
    me: VendorMeDto | null,
    eventStartAt: string | null | undefined,
    hasOwnItems: boolean,
    now: Date = new Date(),
): SneakPeekState {
    const summary = me?.sneakPeek;
    if (!me || !summary) return 'hidden';
    const open = hasVendorCapability(me, 'SNEAK_PEEK');
    if (summary.postId) return open ? 'posted' : 'postedClosed';
    if (!open) return 'hidden';
    if (summary.used) return 'used';
    if (eventStartAt && now < new Date(eventStartAt)) return 'notOpen';
    return hasOwnItems ? 'ready' : 'noItems';
}

// The vendor page's copy of the sneak peek is out of date: a host removed it, or it changed in another tab.
export function isStaleSneakPeekError(error: unknown): boolean {
    if (error instanceof ApiError && error.status === 404) return true;
    const code = getErrorCode(error);
    return code === ERROR_CODES.SNEAK_PEEK_USED || code === ERROR_CODES.SNEAK_PEEK_NOT_OPEN;
}

// The caller's own ready Pro items: the only ones the backend accepts.
export function sneakPeekCandidates(items: readonly MediaResponseDto[], memberId: string | null | undefined): MediaResponseDto[] {
    if (!memberId) return [];
    return items.filter((item) => item.uploaderMemberId === memberId && item.status === 'READY' && item.collection === 'PRO');
}

// Tap order is display order. A second tap removes; past the limit a tap does nothing.
export function toggleSneakPeekPick(picked: readonly string[], id: string): string[] {
    if (picked.includes(id)) return picked.filter((pick) => pick !== id);
    return picked.length >= SNEAK_PEEK_MAX_ITEMS ? [...picked] : [...picked, id];
}

type SneakPeekDraft = { mediaIds: readonly string[]; content: string | null };

// The PATCH body for an edit: only the changed fields, null when nothing changed. A blank caption clears it.
export function sneakPeekPatch(initial: SneakPeekDraft, next: SneakPeekDraft): SneakPeekPatchDto | null {
    const patch: SneakPeekPatchDto = {};
    const sameItems = initial.mediaIds.length === next.mediaIds.length && initial.mediaIds.every((id, i) => id === next.mediaIds[i]);
    if (!sameItems) patch.mediaIds = [...next.mediaIds];
    const before = (initial.content ?? '').trim();
    const after = (next.content ?? '').trim();
    if (before !== after) patch.content = after;
    return Object.keys(patch).length > 0 ? patch : null;
}
