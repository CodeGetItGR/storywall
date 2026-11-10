'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { clearCreateEventWizardDraft, isCreateEventWizardDraftEmpty, readCreateEventWizardDraft } from '@/lib/createEventWizardDraft';
import { closeWizard, pushWizardEntry } from '@/lib/createEventWizardHistory';
import { CREATE_EVENT_STEP_PARAM, isCreateEventHref, isWizardOpen, wizardUrlForLink } from '@/lib/createEventWizardUrl';
import { useCreateWizardEnabled } from '@/providers/CreateWizardFlagProvider';

function createLinkFrom(target: EventTarget | null): HTMLAnchorElement | null {
    const anchor = target instanceof Element ? target.closest('a[href]') : null;
    if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank' || anchor.hasAttribute('download')) return null;
    return isCreateEventHref(anchor.getAttribute('href') ?? '', window.location.origin) ? anchor : null;
}

/**
 * Opens the create wizard over the current page. Any link to /events/new on the page opens it in
 * place (a plain left click; a new tab or window still follows the link), so no button needs to
 * know about the pop-up. Hovering, focusing or touching such a link starts loading the pop-up's code.
 *
 * Runs in the capture phase on the document, before React's own handlers: preventDefault there
 * also stops next/link's navigation, and click tracking further down still sees the click.
 */
export function useCreateEventDialogHost({ preload }: { preload?: () => void } = {}) {
    const enabled = useCreateWizardEnabled();
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const active = enabled && user?.role !== 'ADMIN';
    const isOpen = active && isWizardOpen(searchParams);
    const opener = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!active) return;
        const onClick = (event: MouseEvent) => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            const anchor = createLinkFrom(event.target);
            if (!anchor) return;
            event.preventDefault();
            opener.current = anchor;
            pushWizardEntry(wizardUrlForLink(anchor.getAttribute('href')!, new URL(window.location.href)));
        };
        const onIntent = (event: Event) => {
            if (createLinkFrom(event.target)) preload?.();
        };
        document.addEventListener('click', onClick, true);
        document.addEventListener('pointerover', onIntent, { passive: true });
        document.addEventListener('focusin', onIntent);
        document.addEventListener('touchstart', onIntent, { passive: true });
        return () => {
            document.removeEventListener('click', onClick, true);
            document.removeEventListener('pointerover', onIntent);
            document.removeEventListener('focusin', onIntent);
            document.removeEventListener('touchstart', onIntent);
        };
    }, [active, preload]);

    // Focus goes back to the button that opened it.
    useEffect(() => {
        if (isOpen || !opener.current) return;
        if (opener.current.isConnected) opener.current.focus();
        opener.current = null;
    }, [isOpen]);

    const close = useCallback(() => {
        // Closed on the type step with nothing typed: the run is forgotten. Anything else is kept,
        // and opening the wizard again resumes it.
        const saved = readCreateEventWizardDraft();
        const onTypeStep = (searchParams.get(CREATE_EVENT_STEP_PARAM) ?? 'type') === 'type';
        if (onTypeStep && (!saved || isCreateEventWizardDraftEmpty(saved))) clearCreateEventWizardDraft();
        closeWizard();
    }, [searchParams]);

    return { isOpen, close };
}
