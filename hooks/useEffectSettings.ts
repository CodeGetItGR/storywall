'use client';

import { type ChangeEvent, useCallback } from 'react';

import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { type BackgroundEffect, sectionEffect, setBackgroundEffect, setSectionTransition } from '@/lib/invitation/sectionBackgrounds';
import { BACKGROUND_EFFECTS } from '@/lib/invitation/sectionStyle';

// Admin: the section's background effect, its speed and intensity.
export function useEffectSettings({ section, edit }: SettingsScope) {
    const effect = sectionEffect(section);
    const set = useCallback((patch: Partial<BackgroundEffect>) => edit(setBackgroundEffect(section.id, patch)), [edit, section.id]);

    const onType = useCallback(
        (event: ChangeEvent<HTMLSelectElement>) => {
            const type = event.target.value as BackgroundEffect['type'];
            if (BACKGROUND_EFFECTS.includes(type)) set({ type });
        },
        [set],
    );
    const setSpeed = useCallback((speed: BackgroundEffect['speed']) => set({ speed }), [set]);
    const setIntensity = useCallback((intensity: BackgroundEffect['intensity']) => set({ intensity }), [set]);

    return { effect, types: BACKGROUND_EFFECTS, onType, setSpeed, setIntensity };
}

type Edge = 'top' | 'bottom';

// Admin: the divider drawn at one edge of the section, from the theme's transitions.
export function useTransitionSettings({ section, edit, theme }: SettingsScope) {
    const transition = section.style.transition;
    const edge: Edge = transition?.edge ?? 'bottom';

    const onAsset = useCallback(
        (event: ChangeEvent<HTMLSelectElement>) => {
            const assetId = event.target.value;
            edit(setSectionTransition(section.id, assetId ? { assetId, edge } : undefined));
        },
        [edge, edit, section.id],
    );
    const setEdge = useCallback(
        (next: Edge) => {
            if (transition) edit(setSectionTransition(section.id, { assetId: transition.assetId, edge: next }));
        },
        [edit, section.id, transition],
    );

    return { assetId: transition?.assetId ?? '', edge, options: theme.transitions, hasTransition: Boolean(transition), onAsset, setEdge };
}
