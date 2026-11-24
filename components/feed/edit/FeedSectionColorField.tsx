'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { SECONDARY_BUTTON_CLASS } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { ColorCircles } from '@/components/ui/color/ColorCircles';
import { tooDarkForInkText } from '@/lib/contrast';
import { colorInputValue } from '@/lib/invitation/colorInput';
import { cn } from '@/lib/utils';

type FeedSectionColorFieldProps = {
    value: string | undefined;
    themeColors: readonly string[];
    label: string;
    onChange: (color: string | undefined) => void;
};

// A section's background colour: Default while one is set (back to the feed's background), then the circles. A colour
// ink can't be read on is drawn lighter; the field says so.
export function FeedSectionColorField({ value, themeColors, label, onChange }: FeedSectionColorFieldProps) {
    const t = useTranslations('InvitationEditor');
    const tBackground = useTranslations('FeedEditor.background');
    const reset = useCallback(() => onChange(undefined), [onChange]);
    const tooDark = value !== undefined && tooDarkForInkText(colorInputValue(value));

    return (
        <div className="flex flex-col items-start gap-2">
            {/* Default */}
            {value !== undefined && (
                <button type="button" onClick={reset} className={SECONDARY_BUTTON_CLASS}>
                    {t('lineHeightDefault')}
                </button>
            )}

            {/* Colours */}
            <ColorCircles value={value} themeColors={themeColors} label={label} onChange={onChange} />

            {/* Too dark: always mounted, so screen readers hear the text when it appears */}
            <p role="status" className={cn('text-[12px] text-(--smd-editor-muted)', !tooDark && 'sr-only')}>
                {tooDark ? tBackground('tooDark') : null}
            </p>
        </div>
    );
}
