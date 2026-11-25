'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useSetEventTheme } from '@/hooks/useEventTheme';
import { useFeedEditThemes } from '@/hooks/useFeedEditThemes';
import { useFeedLayout } from '@/hooks/useFeedLayout';
import { useFeedLayoutSave } from '@/hooks/useFeedLayoutSave';
import { useInAppLeaveGuard } from '@/hooks/useInAppLeaveGuard';
import { useInvitationEditorStore } from '@/hooks/useInvitationEditorStore';
import { useOverlayHistory } from '@/hooks/useOverlayHistory';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import type { EventDetailResponseDto } from '@/lib/api/types';
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
    // A second tap lands before isPending re-renders. Also tells Back, links and theme picks that a save is on its way.
    const inFlight = useRef(false);
    const themes = useFeedEditThemes(event, store, opened, themeSlug, inFlight);
    const layoutDirty = !sameDocument(base.document, document) || themeSlug !== base.themeSlug;
    const dirty = layoutDirty || themes.heldWall !== undefined;
    const { mutateAsync: saveLayout, isPending: savingLayout } = useFeedLayoutSave(event.id);
    const { mutateAsync: saveWallTheme, isPending: savingWall } = useSetEventTheme(event.id);

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

    // The layout first (with the held Save my date slug), then a held wall preset. A layout that went through is
    // not sent again: after a failed theme write, Save again writes only the theme.
    // Save is ignored while a picked theme is still loading, so the pick is not lost (the grid is also disabled then).
    const { heldWall, isSwitching } = themes;
    const save = useCallback(async () => {
        if (inFlight.current || isSwitching()) return;
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
    }, [base.revision, dirty, heldWall, isSwitching, layoutDirty, onDone, saveLayout, saveWallTheme, store]);

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
        pageTone: themes.pageTone,
        heldWall,
        wallTheme: themes.wallTheme,
        switching: themes.switching,
        pickingSolid: themes.pickingSolid,
        pickInvitation: themes.pickInvitation,
        pickWall: themes.pickWall,
        pickSolid: themes.pickSolid,
        background: document.overrides.backgroundColor,
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
