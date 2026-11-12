'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useId } from 'react';

import { SettingsRow } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { colorInputValue } from '@/lib/invitation/colorInput';

type ThemeColorRowProps = {
    label: string;
    value: string;
    onChange: (color: string) => void;
    // Shown while the colour is the theme's own choice; clears it.
    onReset?: () => void;
};

// One theme colour, with Reset where the colour can follow another.
export function ThemeColorRow({ label, value, onChange, onReset }: ThemeColorRowProps) {
    const t = useTranslations('InvitationEditor.themeStyle');
    const id = useId();
    const change = useCallback((event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value), [onChange]);

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
                <input
                    id={id}
                    type="color"
                    value={colorInputValue(value)}
                    onChange={change}
                    className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-white/20 bg-transparent p-0.5"
                />
            </div>
        </SettingsRow>
    );
}
