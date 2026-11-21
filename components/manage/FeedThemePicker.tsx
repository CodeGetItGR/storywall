'use client';

import dynamic from 'next/dynamic';

import { ThemePickerView } from '@/components/manage/ThemePickerView';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import { useThemeGrid } from '@/hooks/useThemeGrid';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { themePreviewTitle } from '@/lib/eventTheme';

// Loaded only with Save my date cards, so a page without them loads none of their fonts.
const InvitationFontFaces = dynamic(() => import('@/components/manage/InvitationFontFaces').then((module) => module.InvitationFontFaces));

type FeedThemePickerProps = { event: EventDetailResponseDto; canWrite: boolean; onOpenBilling: () => void };

// The Theme section with the feed editor on: wall themes and Save my date themes in one grid.
export function FeedThemePicker({ event, canWrite, onOpenBilling }: FeedThemePickerProps) {
    const themeName = useModuleCopy(event.eventType)('theme').name;
    const grid = useThemeGrid(event, canWrite, onOpenBilling);

    if (!grid.available) return null;

    return (
        <>
            {/* Theme fonts */}
            {grid.hasInvitationThemes && <InvitationFontFaces css={grid.fontFaces} />}

            {/* Themes */}
            <ThemePickerView
                heading={themeName}
                showHeading={false}
                isLoading={grid.isLoading}
                loadError={grid.loadError}
                options={grid.options}
                disabled={grid.disabled}
                savingPresetId={grid.savingPresetId}
                previewTitle={themePreviewTitle(event.title)}
                isSaving={grid.isSaving}
                isSaved={grid.isSaved}
                saveError={grid.saveError}
                onSelectAction={grid.select}
            />
        </>
    );
}
