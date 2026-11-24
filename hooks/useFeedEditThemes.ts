'use client';

import { useQueryClient } from '@tanstack/react-query';
import { type RefObject, useCallback, useMemo, useRef, useState } from 'react';

import { fetchInvitationTheme } from '@/hooks/useInvitationThemeCards';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { type HeldWall, replaceFeedDocument, setFeedBackground, type WallPick } from '@/lib/feedEditTheme';
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
// beside the store and previewed in place of event.theme. A theme pick clears the solid colour; a solid colour goes on
// the plain look ("No theme").
// saveInFlight: set while Save is on its way; a pick then is ignored, so Save writes what was on screen when tapped.
export function useFeedEditThemes(
    event: Pick<EventDetailResponseDto, 'eventType' | 'theme'>,
    store: InvitationEditorStore,
    opened: FeedLayoutView,
    themeSlug: string,
    saveInFlight: RefObject<boolean>,
) {
    const queryClient = useQueryClient();
    const [looks, setLooks] = useState<Record<string, ThemeLook>>(() =>
        opened.themeSlug ? { [opened.themeSlug]: { theme: opened.theme, media: opened.media } } : {},
    );
    const [heldWall, setHeldWall] = useState<HeldWall | undefined>(undefined);
    const [switching, setSwitching] = useState(false);
    // The plain look is loading for a solid colour, which goes on being mixed meanwhile.
    const [pickingSolid, setPickingSolid] = useState(false);
    const solid = useRef<string | undefined>(undefined);
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

    // The theme grid is also disabled while switching; these guards keep the hook safe on its own.
    const run = useCallback(
        async (step: () => Promise<void>) => {
            if (busy.current || saveInFlight.current) return;
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
        },
        [saveInFlight],
    );
    // Read by Save: true from the tap that starts a pick, before switching re-renders.
    const isSwitching = useCallback(() => busy.current, []);

    // Any card takes the feed's background colour off, its own card too.
    const clearSolid = useCallback(() => {
        if (store.getState().document.overrides.backgroundColor !== undefined) store.getState().edit(setFeedBackground(undefined));
    }, [store]);

    const pickInvitation = useCallback(
        (slug: string) =>
            run(async () => {
                if (slug === store.getState().themeSlug) {
                    clearSolid();
                    return;
                }
                const [target, oldIds] = await Promise.all([loadTheme(slug), leavingImageIds()]);
                const preview = readThemePreview(target);
                const document = planFeedThemeSwitch(store.getState().document, { ...preview, imageIds: themeImageIds(target.assetUrls) }, oldIds);
                // The host's own photos keep resolving through the saved layout's images.
                const media: MediaResolver = (mediaId) => preview.media(mediaId) ?? opened.media(mediaId);
                setLooks((current) => ({ ...current, [slug]: { theme: preview.theme, media } }));
                setHeldWall(undefined);
                store.getState().switchTheme(slug, replaceFeedDocument(document));
            }),
        [clearSolid, leavingImageIds, loadTheme, opened, run, store],
    );

    // The plan back to a wall look, from the Save my date theme on screen.
    const planWall = useCallback(
        async ({ theme, applied }: WallPick) => {
            const oldIds = await leavingImageIds();
            return planFeedWallSwitch(store.getState().document, wallThemeDesign(applied ? event.theme : theme), event.eventType, oldIds);
        },
        [event.eventType, event.theme, leavingImageIds, store],
    );
    const holdWall = useCallback(({ presetId, theme, applied }: WallPick) => setHeldWall(applied ? undefined : { presetId, theme }), []);

    const pickWall = useCallback(
        (pick: WallPick) =>
            run(async () => {
                if (store.getState().themeSlug) store.getState().switchTheme('', replaceFeedDocument(await planWall(pick)));
                else clearSolid();
                holdWall(pick);
            }),
        [clearSolid, holdWall, planWall, run, store],
    );

    // plain: "No theme". The colour shows live while it's mixed; while the plain look loads, the last one mixed counts.
    const pickSolid = useCallback(
        (color: string, plain: WallPick) => {
            if (saveInFlight.current) return;
            solid.current = color;
            if (!store.getState().themeSlug) {
                store.getState().edit(setFeedBackground(color), 'backgroundColor');
                holdWall(plain);
                return;
            }
            void run(async () => {
                setPickingSolid(true);
                try {
                    const document = await planWall(plain);
                    const overrides = { ...document.overrides, backgroundColor: solid.current };
                    store.getState().switchTheme('', replaceFeedDocument({ ...document, overrides }));
                    holdWall(plain);
                } finally {
                    setPickingSolid(false);
                }
            });
        },
        [holdWall, planWall, run, saveInFlight, store],
    );

    const wallTheme = heldWall ? heldWall.theme : event.theme;
    const wallLook = useMemo(() => wallThemeDesign(wallTheme), [wallTheme]);
    const look = themeSlug ? (looks[themeSlug] ?? { theme: opened.theme, media: opened.media }) : { theme: wallLook, media: opened.media };

    return { theme: look.theme, media: look.media, heldWall, wallTheme, switching, pickingSolid, isSwitching, pickInvitation, pickWall, pickSolid };
}
