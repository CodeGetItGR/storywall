'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { THEME_ASSET_TABS, type ThemeAssetTab } from '@/hooks/useThemeAssetTab';
import { cn } from '@/lib/utils';

type AssetTabsProps = { tab: ThemeAssetTab; onTab: (tab: ThemeAssetTab) => void };

// The kinds of image in the theme, one at a time.
export function AssetTabs({ tab, onTab }: AssetTabsProps) {
    const t = useTranslations('InvitationEditor');
    const label = (value: ThemeAssetTab) => (value === 'backgrounds' ? t('themeStyle.backgrounds') : t(`assets.tabs.${value}`));

    return (
        <div className="flex flex-wrap gap-1.5">
            {THEME_ASSET_TABS.map((value) => (
                <AssetTabButton key={value} value={value} label={label(value)} isActive={value === tab} onTab={onTab} />
            ))}
        </div>
    );
}

type AssetTabButtonProps = { value: ThemeAssetTab; label: string; isActive: boolean; onTab: (tab: ThemeAssetTab) => void };

function AssetTabButton({ value, label, isActive, onTab }: AssetTabButtonProps) {
    const click = useCallback(() => onTab(value), [onTab, value]);
    return (
        <button
            type="button"
            aria-pressed={isActive}
            onClick={click}
            className={cn(
                'h-8 rounded-full px-3 text-[12.5px] font-semibold focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                // The phone sheet sits outside the editor's dark chrome, so each colour has a light fallback.
                isActive
                    ? 'bg-[var(--smd-editor-text,#2b2b2e)] text-[var(--smd-editor-panel,#ffffff)]'
                    : 'bg-[var(--smd-editor-control,rgb(0_0_0/0.06))] text-[var(--smd-editor-text,#2b2b2e)] hover:opacity-80',
            )}
        >
            {label}
        </button>
    );
}
