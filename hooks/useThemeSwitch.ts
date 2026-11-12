'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import type { DraftTheme } from '@/hooks/useDraftThemes';
import { useInvitationThemeCatalogue } from '@/hooks/useInvitationThemeCatalogue';
import { api } from '@/lib/api/client';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import { type InvitationThemeCardDto, invitationThemeKeys } from '@/lib/invitation/themeCatalogue';
import { invitationThemeEndpoint, type InvitationThemePublicDto, readThemePreview } from '@/lib/invitation/themePreview';
import { planThemeSwitch, themeImageIds, type ThemeSwitchPlan } from '@/lib/invitation/themeSwitch';

export type ThemeSwitchStep =
    | { kind: 'closed' }
    | { kind: 'picking' }
    // The chosen theme is loading; the picker stays open under it.
    | { kind: 'loading'; slug: string }
    | { kind: 'failed'; slug: string }
    | { kind: 'confirming'; slug: string; theme: DraftTheme; plan: ThemeSwitchPlan };

export type ThemeSwitchList = { kind: 'loading' } | { kind: 'error' } | { kind: 'themes'; themes: InvitationThemeCardDto[] };

type ThemeSwitchOptions = {
    store: InvitationEditorStore;
    eventType: string;
    // The theme the editor shows now.
    current: DraftTheme;
    // Makes a theme drawable once the host switches to it.
    addTheme: (theme: DraftTheme) => void;
};

// Changing the design of an open draft: the list of the event type's themes, the switch the host
// confirms, and the switch itself, one undo step.
export function useThemeSwitch({ store, eventType, current, addTheme }: ThemeSwitchOptions) {
    const queryClient = useQueryClient();
    const [step, setStep] = useState<ThemeSwitchStep>({ kind: 'closed' });
    const catalogue = useInvitationThemeCatalogue({ enabled: step.kind !== 'closed' });

    const list = useMemo<ThemeSwitchList>(() => {
        if (catalogue.themes) return { kind: 'themes', themes: catalogue.themes.filter((theme) => theme.eventType === eventType) };
        return catalogue.isError ? { kind: 'error' } : { kind: 'loading' };
    }, [catalogue.isError, catalogue.themes, eventType]);

    const fetchTheme = useCallback(
        (slug: string) =>
            queryClient.fetchQuery({
                queryKey: invitationThemeKeys.publicTheme(slug),
                queryFn: () => api.get<InvitationThemePublicDto>(invitationThemeEndpoint(slug)),
            }),
        [queryClient],
    );

    const open = useCallback(() => setStep({ kind: 'picking' }), []);
    const close = useCallback(() => setStep({ kind: 'closed' }), []);
    const back = useCallback(() => setStep({ kind: 'picking' }), []);

    const choose = useCallback(
        async (slug: string) => {
            if (slug === current.slug) return;
            setStep({ kind: 'loading', slug });
            try {
                const [target, from] = await Promise.all([fetchTheme(slug), fetchTheme(current.slug).catch(() => null)]);
                const preview = readThemePreview(target);
                // Without the current theme's list of images, sample photos can't be told from the host's.
                const oldImages = themeImageIds(from?.assetUrls);
                const plan = planThemeSwitch(store.getState().document, { ...preview, imageIds: themeImageIds(target.assetUrls) }, oldImages);
                const theme: DraftTheme = {
                    slug: target.slug,
                    name: target.name,
                    theme: preview.theme,
                    media: preview.media,
                    design: target.design,
                    assetUrls: target.assetUrls,
                };
                setStep((now) => (now.kind === 'loading' && now.slug === slug ? { kind: 'confirming', slug, theme, plan } : now));
            } catch {
                setStep((now) => (now.kind === 'loading' && now.slug === slug ? { kind: 'failed', slug } : now));
            }
        },
        [current.slug, fetchTheme, store],
    );

    const confirm = useCallback(() => {
        if (step.kind !== 'confirming') return;
        const { plan } = step;
        addTheme(step.theme);
        store.getState().switchTheme(step.slug, (draft) => {
            draft.themeId = plan.document.themeId;
            draft.overrides = plan.document.overrides;
            draft.sections = plan.document.sections;
        });
        setStep({ kind: 'closed' });
    }, [addTheme, step, store]);

    return {
        step,
        list,
        retryList: catalogue.retry,
        // The current theme in the list is the one the document shows now.
        currentSlug: current.slug,
        currentName: current.name,
        open,
        close,
        back,
        choose,
        confirm,
    };
}
