'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { SettingsRow } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { ColorSwatch } from '@/components/ui/color/ColorSwatch';
import { colorInputValue } from '@/lib/invitation/colorInput';

type ThemeColorRowProps = {
    label: string;
    value: string;
    themeColors: readonly string[];
    onChange: (color: string) => void;
    // Shown while the colour is the theme's own choice; clears it.
    onReset?: () => void;
};

// One theme colour, with Reset where the colour can follow another.
export function ThemeColorRow({ label, value, themeColors, onChange, onReset }: ThemeColorRowProps) {
    const t = useTranslations('InvitationEditor.themeStyle');
    const id = useId();

    return (
        <SettingsRow label={label} htmlFor={id}>
            <div className="flex shrink-0 items-center gap-1">
                {onReset && (
                    <button
                        type="button"
                        onClick={onReset}
                        className="h-9 rounded-lg px-2 text-[12px] text-(--smd-editor-muted) hover:bg-white/10 hover:text-(--smd-editor-text) focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                        {t('reset')}
                    </button>
                )}
                <ColorSwatch id={id} value={colorInputValue(value)} label={label} themeColors={themeColors} onChange={onChange} />
            </div>
        </SettingsRow>
    );
}
