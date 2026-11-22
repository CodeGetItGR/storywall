'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

import { fetchInvitationTheme } from '@/hooks/useInvitationThemeCards';
import type { EventDetailResponseDto, EventThemeDto } from '@/lib/api/types';
import { type HeldWall, replaceFeedDocument, setFeedBackground } from '@/lib/feedEditTheme';
import { type FeedLayoutView, wallThemeDesign } from '@/lib/feedLayout';
import { planFeedThemeSwitch, planFeedWallSwitch } from '@/lib/feedThemes';
import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import type { MediaResolver } from '@/lib/invitation/render';
import type { ThemeDesign } from '@/lib/invitation/theme';
import { invitationThemeKeys } from '@/lib/invitation/themeCatalogue';
import { readThemePreview } from '@/lib/invitation/themePreview';
import { themeImageIds } from '@/lib/invitation/themeSwitch';

type ThemeLook = { theme: ThemeDesign; media: MediaResolver };

// The theme edit mode shows, held until Save. A Save my date theme lives in the editor store (its slug and the
// planned document); its design and images are kept here per theme, like the old editor's. A wall preset is held
// beside the store and previewed in place of event.theme. Any pick clears the background colour.
export function useFeedEditThemes(
    event: Pick<EventDetailResponseDto, 'eventType' | 'theme'>,
    store: InvitationEditorStore,
    opened: FeedLayoutView,
    themeSlug: string,
) {
    const queryClient = useQueryClient();
    const [looks, setLooks] = useState<Record<string, ThemeLook>>(() =>
        opened.themeSlug ? { [opened.themeSlug]: { theme: opened.theme, media: opened.media } } : {},
    );
    const [heldWall, setHeldWall] = useState<HeldWall | undefined>(undefined);
    const [switching, setSwitching] = useState(false);
    // Set synchronously: two taps in one tick both see switching false.
    const busy = useRef(false);

    const loadTheme = useCallback(
        (slug: string) => queryClient.fetchQuery({ queryKey: invitationThemeKeys.publicTheme(slug), queryFn: () => fetchInvitationTheme(slug) }),
        [queryClient],
    );
    // The images of the theme being left, so none stay behind; a theme that no longer loads leaves none to strip.
    const leavingImageIds = useCallback(async () => {
        const current = store.getState().themeSlug;
        if (!current) return new Set<string>();
        return loadTheme(current).then(
            (theme) => themeImageIds(theme.assetUrls),
            () => new Set<string>(),
        );
    }, [loadTheme, store]);

    const run = useCallback(async (step: () => Promise<void>) => {
        if (busy.current) return;
        busy.current = true;
        setSwitching(true);
        try {
            await step();
        } catch {
            // A theme that doesn't load leaves the current one on screen.
        } finally {
            busy.current = false;
            setSwitching(false);
        }
    }, []);

    const pickInvitation = useCallback(
        (slug: string) =>
            run(async () => {
                if (slug === store.getState().themeSlug) return;
                const [target, oldIds] = await Promise.all([loadTheme(slug), leavingImageIds()]);
                const preview = readThemePreview(target);
                const document = planFeedThemeSwitch(store.getState().document, { ...preview, imageIds: themeImageIds(target.assetUrls) }, oldIds);
                // The host's own photos keep resolving through the saved layout's images.
                const media: MediaResolver = (mediaId) => preview.media(mediaId) ?? opened.media(mediaId);
                setLooks((current) => ({ ...current, [slug]: { theme: preview.theme, media } }));
                setHeldWall(undefined);
                store.getState().switchTheme(slug, replaceFeedDocument(document));
            }),
        [leavingImageIds, loadTheme, opened, run, store],
    );

    // applied: the pick is the preset already on the event, so nothing is held for it.
    const pickWall = useCallback(
        (presetId: string | null, wallTheme: EventThemeDto | null, applied: boolean) =>
            run(async () => {
                // On the wall, the preset already on screen again changes nothing, so the background colour stays.
                const onScreen = heldWall ? heldWall.presetId === presetId : applied;
                if (!store.getState().themeSlug && onScreen) return;
                if (store.getState().themeSlug) {
                    const oldIds = await leavingImageIds();
                    const look = wallThemeDesign(applied ? event.theme : wallTheme);
                    store
                        .getState()
                        .switchTheme('', replaceFeedDocument(planFeedWallSwitch(store.getState().document, look, event.eventType, oldIds)));
                } else {
                    store.getState().edit(setFeedBackground(undefined));
                }
                setHeldWall(applied ? undefined : { presetId, theme: wallTheme });
            }),
        [event.eventType, event.theme, heldWall, leavingImageIds, run, store],
    );

    const wallTheme = heldWall ? heldWall.theme : event.theme;
    const wallLook = useMemo(() => wallThemeDesign(wallTheme), [wallTheme]);
    const look = themeSlug ? (looks[themeSlug] ?? { theme: opened.theme, media: opened.media }) : { theme: wallLook, media: opened.media };

    return { theme: look.theme, media: look.media, heldWall, wallTheme, switching, pickInvitation, pickWall };
}
