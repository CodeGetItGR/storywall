'use client';

import { type ChangeEvent, useCallback } from 'react';
import { useStore } from 'zustand';

import type { InvitationEditorStore } from '@/lib/invitation/editorStore';
import type { SectionDecoration } from '@/lib/invitation/sections';
import { setSectionDecoration } from '@/lib/invitation/themeAssets';

const NO_ELEMENTS: never[] = [];

// The theme's elements a family section can show, and the one it shows.
export function useDecorationPicker(store: InvitationEditorStore, sectionId: string, decoration: SectionDecoration | undefined) {
    const elements = useStore(store, (state) => state.theme?.elements ?? NO_ELEMENTS);
    const value = decoration?.image.source === 'theme' ? decoration.image.assetId : '';
    const change = useCallback(
        (event: ChangeEvent<HTMLSelectElement>) => {
            const elementId = event.target.value;
            store.getState().edit((document) => setSectionDecoration(document, sectionId, elementId));
        },
        [sectionId, store],
    );
    return { elements, value, change };
}
