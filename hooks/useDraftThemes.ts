'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import type { EditableDraft } from '@/lib/invitation/drafts';
import type { MediaResolver } from '@/lib/invitation/render';
import type { ThemeDesign } from '@/lib/invitation/theme';

// A theme the open draft can show: the one it was loaded with, or one the host switched to.
export type DraftTheme = {
    slug: string;
    name: string;
    theme: ThemeDesign;
    // The theme's own images.
    media: MediaResolver;
    // What the backend sent, for the draft's cached copy once a save switches to it. Left out for
    // the theme the draft was loaded with.
    design?: unknown;
    assetUrls?: Record<string, string>;
};

type Themes = Record<string, DraftTheme>;

// The themes of an open draft, keyed by slug: the editor draws the one its store names, so an undo
// or redo across a theme switch also switches the look back. Not by the document's themeId, which a
// copied theme shares with its source.
export function useDraftThemes(draft: EditableDraft, themeSlug: string) {
    // The theme the editor opened with. Taken once: a save that switches theme updates the cached
    // draft, and the editor must not read that back as the theme it started from.
    const [initial] = useState<{ slug: string; themes: Themes }>(() => ({
        slug: draft.themeSlug,
        themes: { [draft.themeSlug]: { slug: draft.themeSlug, name: draft.themeName, theme: draft.theme, media: draft.media } },
    }));
    const [themes, setThemes] = useState<Themes>(initial.themes);
    // The same themes for saves, which read them outside render.
    const latest = useRef<Themes>(initial.themes);

    const active = themes[themeSlug] ?? themes[initial.slug];
    // The theme's images first, then the draft's own uploads and the images it was loaded with.
    const draftMedia = draft.media;
    const media = useMemo<MediaResolver>(() => (mediaId) => active.media(mediaId) ?? draftMedia(mediaId), [active, draftMedia]);

    const add = useCallback((theme: DraftTheme) => {
        latest.current = { ...latest.current, [theme.slug]: theme };
        setThemes(latest.current);
    }, []);
    const themeFor = useCallback((slug: string): DraftTheme | undefined => latest.current[slug], []);

    return { active, media, add, themeFor };
}
