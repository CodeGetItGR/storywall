'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useId } from 'react';

import { SettingsRow } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { tooDarkForInk } from '@/lib/contrast';
import { colorInputValue } from '@/lib/invitation/colorInput';
import { cn } from '@/lib/utils';

type FeedBackgroundSettingProps = { value: string | undefined; disabled: boolean; onChange: (color: string | undefined) => void };

// The feed's one background colour. Default (only while one is set) clears overrides.backgroundColor and goes
// back to the theme's backgrounds. A colour too dark for ink text is drawn lighter (readableOnInk); the row says so.
// Disabled while Save runs or a theme loads: either would drop a colour set meanwhile.
export function FeedBackgroundSetting({ value, disabled, onChange }: FeedBackgroundSettingProps) {
    const t = useTranslations('InvitationEditor');
    const tBackground = useTranslations('FeedEditor.background');
    const id = useId();
    const change = useCallback((event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value), [onChange]);
    const reset = useCallback(() => onChange(undefined), [onChange]);
    const tooDark = value !== undefined && tooDarkForInk(value);

    return (
        <div className="flex flex-col">
            {/* Colour */}
            <SettingsRow label={t('sectionSettings.background')} htmlFor={id}>
                <div className="flex shrink-0 items-center gap-1.5">
                    {value !== undefined && (
                        <button
                            type="button"
                            onClick={reset}
                            disabled={disabled}
                            className="h-9 rounded-lg px-2 text-[12px] text-(--smd-editor-muted) hover:bg-white/10 hover:text-(--smd-editor-text) focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {t('lineHeightDefault')}
                        </button>
                    )}
                    <input
                        id={id}
                        type="color"
                        value={colorInputValue(value, '#FFFFFF')}
                        onChange={change}
                        disabled={disabled}
                        className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-white/20 bg-transparent p-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                </div>
            </SettingsRow>

            {/* Too dark: always mounted, so screen readers hear the text when it appears */}
            <p role="status" className={cn('text-[12px] text-(--smd-editor-muted)', tooDark && 'mt-1.5')}>
                {tooDark ? tBackground('tooDark') : null}
            </p>
        </div>
    );
}
