'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { SECONDARY_BUTTON_CLASS } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { ColorCircles } from '@/components/ui/color/ColorCircles';

type FeedSectionColorFieldProps = {
    value: string | undefined;
    themeColors: readonly string[];
    labelledBy: string;
    onChange: (color: string | undefined) => void;
};

// A section's background colour: Default while one is set (back to the feed's background), then the circles.
export function FeedSectionColorField({ value, themeColors, labelledBy, onChange }: FeedSectionColorFieldProps) {
    const t = useTranslations('InvitationEditor');
    const reset = useCallback(() => onChange(undefined), [onChange]);

    return (
        <div className="flex flex-col items-start gap-2">
            {/* Default */}
            {value !== undefined && (
                <button type="button" onClick={reset} className={SECONDARY_BUTTON_CLASS}>
                    {t('lineHeightDefault')}
                </button>
            )}

            {/* Colours */}
            <ColorCircles value={value} themeColors={themeColors} labelledBy={labelledBy} onChange={onChange} />
        </div>
    );
}
