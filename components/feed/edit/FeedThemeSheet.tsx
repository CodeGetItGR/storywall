'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { FeedEditSheetFrame } from '@/components/feed/edit/FeedEditSheetFrame';
import { FeedSolidColors } from '@/components/feed/edit/FeedSolidColors';
import { InvitationFontFaces } from '@/components/manage/InvitationFontFaces';
import { ThemePresetRadioGroup, type ThemeRadioOption } from '@/components/manage/ThemePresetRadioGroup';

type FeedThemeSheetProps = {
    open: boolean;
    isDesktop: boolean;
    options: ThemeRadioOption[];
    fontFaces: string;
    hasInvitationThemes: boolean;
    disabled: boolean;
    solidDisabled: boolean;
    previewTitle: string | undefined;
    solidColor: string | undefined;
    onSelect: (choice: string | null) => void;
    onSolidColor: (color: string) => void;
    onClose: () => void;
};

// Edit mode's Theme sheet (mockup 2026-11-24): one solid colour, then every theme the feed can wear ("No theme" at
// least). Picks are held until Save; while Save runs or a theme loads, the cards and the colours wait.
export function FeedThemeSheet({
    open,
    isDesktop,
    options,
    fontFaces,
    hasInvitationThemes,
    disabled,
    solidDisabled,
    previewTitle,
    solidColor,
    onSelect,
    onSolidColor,
    onClose,
}: FeedThemeSheetProps) {
    const t = useTranslations('ManagePage.sections');
    const tFeed = useTranslations('FeedEditor');
    const designId = useId();

    return (
        <FeedEditSheetFrame open={open} title={t('theme')} isDesktop={isDesktop} onClose={onClose}>
            <div className="flex flex-col gap-5">
                {/* Theme fonts */}
                {hasInvitationThemes && <InvitationFontFaces css={fontFaces} />}

                {/* Solid colour */}
                <FeedSolidColors value={solidColor} disabled={solidDisabled} onChange={onSolidColor} />

                {/* Design */}
                <section className="flex flex-col">
                    <h3 id={designId} className="text-[13px] leading-tight font-medium">
                        {tFeed('design')}
                    </h3>
                    <ThemePresetRadioGroup
                        options={options}
                        labelledBy={designId}
                        disabled={disabled}
                        size="large"
                        onDark
                        previewTitle={previewTitle}
                        onSelectAction={onSelect}
                    />
                </section>
            </div>
        </FeedEditSheetFrame>
    );
}
