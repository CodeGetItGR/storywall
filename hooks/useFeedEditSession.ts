'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useFeedLayout } from '@/hooks/useFeedLayout';
import { useFeedLayoutSave } from '@/hooks/useFeedLayoutSave';
import { useInAppLeaveGuard } from '@/hooks/useInAppLeaveGuard';
import { useInvitationEditorStore } from '@/hooks/useInvitationEditorStore';
import { useOverlayHistory } from '@/hooks/useOverlayHistory';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { feedLayoutKeys } from '@/lib/feedLayout';
import { isStaleRevision, sameDocument } from '@/lib/invitation/drafts';

// One visit to edit mode: a copy of the saved layout to change, stored only on Save. Leaving with
// changes (Cancel, phone Back, an in-app link, closing the tab) asks first.
export function useFeedEditSession(event: Pick<EventDetailResponseDto, 'id' | 'theme'>, onDone: () => void) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const layout = useFeedLayout(event, { enabled: true });
    // What edit mode opened on. A refetch meanwhile changes neither the revision Save names nor what Cancel goes back to.
    const [opened] = useState(layout);
    const { store, document } = useInvitationEditorStore(opened.document, opened.themeSlug ?? '');
    const dirty = !sameDocument(opened.document, document);
    const { mutateAsync, isPending: saving } = useFeedLayoutSave(event.id);

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

    const save = useCallback(async () => {
        if (inFlight.current) return;
        if (!dirty) {
            onDone();
            return;
        }
        inFlight.current = true;
        setFailed(false);
        try {
            await mutateAsync({ revision: opened.revision, themeSlug: opened.themeSlug, document: store.getState().document });
            onDone();
        } catch (error) {
            if (isStaleRevision(error)) setConflict(true);
            else setFailed(true);
        } finally {
            inFlight.current = false;
        }
    }, [dirty, mutateAsync, onDone, opened, store]);

    // Someone saved the layout elsewhere: fetch theirs and leave edit mode on it.
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
        theme: opened.theme,
        media: opened.media,
        dirty,
        saving,
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
