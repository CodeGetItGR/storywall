'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { fetchFeedLayout } from '@/hooks/useFeedLayout';
import { useFeedLayoutSave } from '@/hooks/useFeedLayoutSave';
import { fetchInvitationTheme } from '@/hooks/useInvitationThemeCards';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { feedLayoutKeys, type FeedLayoutView, readFeedLayout, wallThemeDesign } from '@/lib/feedLayout';
import { planFeedThemeSwitch, planFeedWallSwitch } from '@/lib/feedThemes';
import { isStaleRevision } from '@/lib/invitation/drafts';
import { invitationThemeKeys } from '@/lib/invitation/themeCatalogue';
import { readThemePreview } from '@/lib/invitation/themePreview';
import { themeImageIds } from '@/lib/invitation/themeSwitch';

type LayoutState = Pick<FeedLayoutView, 'document' | 'revision' | 'themeSlug'>;

// Moves the feed layout onto a Save my date theme (a slug) or back to the wall theme (null), and saves
// it. A save another tab made first is read and the switch made again on top of it, once. Any other
// refusal is shown, the previous layout stays and is read again. Resolves to whether it saved.
export function useFeedThemeSwitch(event: Pick<EventDetailResponseDto, 'id' | 'eventType' | 'theme'>, current: LayoutState) {
    const queryClient = useQueryClient();
    const save = useFeedLayoutSave(event.id);
    // Set synchronously: two clicks in one tick both see isSaving false.
    const inFlight = useRef(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [error, setError] = useState<unknown>(null);

    const loadTheme = useCallback(
        (slug: string) => queryClient.fetchQuery({ queryKey: invitationThemeKeys.publicTheme(slug), queryFn: () => fetchInvitationTheme(slug) }),
        [queryClient],
    );

    const plan = useCallback(
        async (layout: LayoutState, slug: string | null) => {
            // The old theme's images must not stay behind; a theme that no longer loads leaves none to strip.
            const oldIds = layout.themeSlug
                ? await loadTheme(layout.themeSlug).then(
                      (theme) => themeImageIds(theme.assetUrls),
                      () => new Set<string>(),
                  )
                : new Set<string>();
            if (slug === null) return planFeedWallSwitch(layout.document, wallThemeDesign(event.theme), event.eventType, oldIds);
            const target = await loadTheme(slug);
            return planFeedThemeSwitch(layout.document, { ...readThemePreview(target), imageIds: themeImageIds(target.assetUrls) }, oldIds);
        },
        [event.eventType, event.theme, loadTheme],
    );

    const freshLayout = useCallback(async (): Promise<LayoutState> => {
        const dto = await queryClient.fetchQuery({ queryKey: feedLayoutKeys.detail(event.id), queryFn: () => fetchFeedLayout(event.id), staleTime: 0 });
        return readFeedLayout(dto, event.theme);
    }, [event.id, event.theme, queryClient]);

    const switchTo = useCallback(
        async (slug: string | null): Promise<boolean> => {
            if (inFlight.current) return false;
            if (slug === current.themeSlug) return true;
            inFlight.current = true;
            setIsSaving(true);
            setIsSaved(false);
            setError(null);
            try {
                let layout: LayoutState = current;
                for (let attempt = 0; ; attempt++) {
                    const document = await plan(layout, slug);
                    try {
                        await save.mutateAsync({ revision: layout.revision, themeSlug: slug, document });
                        break;
                    } catch (saveError) {
                        if (attempt > 0 || !isStaleRevision(saveError)) throw saveError;
                        layout = await freshLayout();
                    }
                }
                setIsSaved(true);
                return true;
            } catch (switchError) {
                setError(switchError);
                void queryClient.invalidateQueries({ queryKey: feedLayoutKeys.detail(event.id) });
                return false;
            } finally {
                inFlight.current = false;
                setIsSaving(false);
            }
        },
        [current, event.id, freshLayout, plan, queryClient, save],
    );

    return { switchTo, isSaving, isSaved, error };
}
