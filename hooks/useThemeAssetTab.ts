'use client';

import { useState } from 'react';

export const THEME_ASSET_TABS = ['backgrounds', 'illustrations', 'elements', 'frames', 'transitions', 'share'] as const;
export type ThemeAssetTab = (typeof THEME_ASSET_TABS)[number];

// The open tab of the theme's asset library.
export function useThemeAssetTab(initial: ThemeAssetTab = 'backgrounds') {
    const [tab, setTab] = useState<ThemeAssetTab>(initial);
    return { tab, setTab };
}
