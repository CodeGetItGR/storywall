'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { FeedBackgroundSetting } from '@/components/feed/edit/FeedBackgroundSetting';
import { FeedEditSheetFrame } from '@/components/feed/edit/FeedEditSheetFrame';
import { InvitationFontFaces } from '@/components/manage/InvitationFontFaces';
import { ThemePresetRadioGroup, type ThemeRadioOption } from '@/components/manage/ThemePresetRadioGroup';

type FeedThemeSheetProps = {
    open: boolean;
    isDesktop: boolean;
    options: ThemeRadioOption[];
    fontFaces: string;
    hasInvitationThemes: boolean;
    disabled: boolean;
    previewTitle: string | undefined;
    background: string | undefined;
    onSelect: (choice: string | null) => void;
    onBackground: (color: string | undefined) => void;
    onClose: () => void;
};

// Edit mode's Theme sheet: every theme the feed can wear (maybe none), then its one background colour.
// Picks are held until Save; while Save runs or a theme loads, the cards and the colour wait.
export function FeedThemeSheet({
    open,
    isDesktop,
    options,
    fontFaces,
    hasInvitationThemes,
    disabled,
    previewTitle,
    background,
    onSelect,
    onBackground,
    onClose,
}: FeedThemeSheetProps) {
    const t = useTranslations('ManagePage.sections');
    const titleId = useId();

    return (
        <FeedEditSheetFrame open={open} title={t('theme')} titleId={titleId} isDesktop={isDesktop} onClose={onClose}>
            <div className="flex flex-col gap-5">
                {/* Theme fonts */}
                {hasInvitationThemes && <InvitationFontFaces css={fontFaces} />}

                {/* Themes: none for an event with neither wall themes nor Save my date themes */}
                {options.length > 0 && (
                    <ThemePresetRadioGroup
                        options={options}
                        labelledBy={titleId}
                        disabled={disabled}
                        size="large"
                        previewTitle={previewTitle}
                        onSelectAction={onSelect}
                    />
                )}

                {/* Background */}
                <FeedBackgroundSetting value={background} disabled={disabled} onChange={onBackground} />
            </div>
        </FeedEditSheetFrame>
    );
}
