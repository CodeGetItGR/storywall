'use client';

import { useCallback, useMemo, useState } from 'react';

import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useEventMedia } from '@/hooks/useMedia';
import { useModuleReadable } from '@/hooks/useModuleReadable';
import { useCreateSneakPeek, useDeleteSneakPeek, useUpdateSneakPeek } from '@/hooks/useSneakPeek';
import type { SneakPeekSubmit } from '@/hooks/useSneakPeekSheet';
import type { SneakPeekPatchDto, SneakPeekRequestDto, VendorMeDto } from '@/lib/api/types';
import { routes } from '@/lib/routes';
import { sneakPeekCandidates, sneakPeekState } from '@/lib/sneakPeek';
import { useActiveEvent, useActiveMember } from '@/providers/EventProvider';

// The vendor page's Sneak peek section: its state, the sheet and the delete confirmation.
// `hasProAlbum` is the page's own gate (type, vendors and gallery modules); the sneak peek also needs posts.
export function useSneakPeekSection(eventId: string, me: VendorMeDto | null, hasProAlbum: boolean) {
    const toErrorMessage = useApiErrorMessage();
    const activeEvent = useActiveEvent();
    const activeMember = useActiveMember();
    const postsReadable = useModuleReadable(eventId, 'posts');
    const applies = Boolean(me?.sneakPeek) && hasProAlbum && postsReadable;
    // The same query as the Pro album section: one cache, prefetched with the page.
    const pro = useEventMedia(applies ? eventId : null, 'PRO');
    const create = useCreateSneakPeek(eventId);
    const update = useUpdateSneakPeek(eventId);
    const remove = useDeleteSneakPeek(eventId);
    const [sheet, setSheet] = useState<'new' | 'edit' | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const candidates = useMemo(
        () => sneakPeekCandidates(pro.data?.pages.flatMap((page) => page.content) ?? [], activeMember?.id),
        [activeMember?.id, pro.data?.pages],
    );
    const state = applies ? sneakPeekState(me, activeEvent?.schedule.startAt, candidates.length > 0 || Boolean(pro.hasNextPage)) : 'hidden';
    const summary = me?.sneakPeek ?? null;
    const thumbnails = useMemo(
        () =>
            (summary?.mediaIds ?? [])
                .map((id) => candidates.find((item) => item.id === id))
                .filter((item) => item !== undefined)
                .slice(0, 4),
        [candidates, summary?.mediaIds],
    );

    const openNew = useCallback(() => {
        setError(null);
        setSheet('new');
    }, []);
    const openEdit = useCallback(() => {
        setError(null);
        setSheet('edit');
    }, []);
    const closeSheet = useCallback(() => setSheet(null), []);

    const submit = useCallback(
        async (body: SneakPeekSubmit) => {
            setError(null);
            try {
                if (sheet === 'new') await create.mutateAsync(body as SneakPeekRequestDto);
                else await update.mutateAsync(body as SneakPeekPatchDto);
                setSheet(null);
            } catch (submitError) {
                setError(toErrorMessage(submitError));
            }
        },
        [create, sheet, toErrorMessage, update],
    );

    const requestDelete = useCallback(() => {
        setDeleteError(null);
        setConfirmDelete(true);
    }, []);
    const cancelDelete = useCallback(() => setConfirmDelete(false), []);
    // On a failure the dialog stays open with the reason, e.g. access ended while the page was open.
    const confirmRemove = useCallback(async () => {
        setDeleteError(null);
        try {
            await remove.mutateAsync();
            setConfirmDelete(false);
        } catch (removeError) {
            setDeleteError(toErrorMessage(removeError));
        }
    }, [remove, toErrorMessage]);

    const { fetchNextPage } = pro;
    const loadMore = useCallback(() => {
        void fetchNextPage();
    }, [fetchNextPage]);

    return {
        visible: state !== 'hidden',
        state,
        thumbnails,
        feedHref: summary?.postId ? routes.events.feed(eventId, { post: summary.postId }) : null,
        candidates,
        hasMore: Boolean(pro.hasNextPage),
        loadMore,
        sheet,
        initialPicked: sheet === 'edit' ? (summary?.mediaIds ?? []) : [],
        initialCaption: sheet === 'edit' ? (summary?.content ?? null) : null,
        openNew,
        openEdit,
        closeSheet,
        submit,
        isSaving: create.isPending || update.isPending,
        error,
        confirmDelete,
        requestDelete,
        cancelDelete,
        confirmRemove,
        deleteError,
        isDeleting: remove.isPending,
    };
}
