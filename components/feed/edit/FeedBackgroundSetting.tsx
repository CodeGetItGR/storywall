'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useId } from 'react';

import { SettingsRow } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { tooDarkForInk } from '@/lib/contrast';
import { colorInputValue } from '@/lib/invitation/colorInput';

type FeedBackgroundSettingProps = { value: string | undefined; onChange: (color: string | undefined) => void };

// The feed's one background colour. Default (only while one is set) clears overrides.backgroundColor and goes
// back to the theme's backgrounds. A colour too dark for ink text is drawn lighter (readableOnInk); the row says so.
export function FeedBackgroundSetting({ value, onChange }: FeedBackgroundSettingProps) {
    const t = useTranslations('InvitationEditor');
    const tBackground = useTranslations('FeedEditor.background');
    const id = useId();
    const change = useCallback((event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value), [onChange]);
    const reset = useCallback(() => onChange(undefined), [onChange]);
    const tooDark = value !== undefined && tooDarkForInk(value);

    return (
        <div className="flex flex-col gap-1.5">
            {/* Colour */}
            <SettingsRow label={t('sectionSettings.background')} htmlFor={id}>
                <div className="flex shrink-0 items-center gap-1.5">
                    {value !== undefined && (
                        <button
                            type="button"
                            onClick={reset}
                            className="h-9 rounded-lg px-2 text-[12px] text-(--smd-editor-muted) hover:bg-white/10 hover:text-(--smd-editor-text) focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                        >
                            {t('lineHeightDefault')}
                        </button>
                    )}
                    <input
                        id={id}
                        type="color"
                        value={colorInputValue(value, '#FFFFFF')}
                        onChange={change}
                        className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-white/20 bg-transparent p-0.5"
                    />
                </div>
            </SettingsRow>

            {/* Too dark */}
            {tooDark && (
                <p role="status" className="text-[12px] text-(--smd-editor-muted)">
                    {tBackground('tooDark')}
                </p>
            )}
        </div>
    );
}
