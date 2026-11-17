'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useId } from 'react';

import { SettingsGroup, SettingsToggle } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { type BackgroundChoice, useBackgroundSettings } from '@/hooks/useBackgroundSettings';
import type { SettingsScope } from '@/hooks/useSectionSettingsPanel';
import type { ThemeBackgroundChoice, ThemeBackgroundSlot } from '@/lib/invitation/sectionBackgrounds';

// The section's theme background, and for admins which ones the host may pick.
export function BackgroundSettings({ scope }: { scope: SettingsScope }) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const background = useBackgroundSettings(scope);
    const labelId = useId();

    return (
        <SettingsGroup title={t('background')}>
            {/* Backgrounds */}
            <div role="radiogroup" aria-labelledby={labelId} className="grid grid-cols-3 gap-2">
                <span id={labelId} className="sr-only">
                    {t('background')}
                </span>
                {background.choices.map((choice) => (
                    <BackgroundCard key={choice.value} choice={choice} isSelected={background.selected === choice.value} onPick={background.pick} />
                ))}
            </div>

            {/* What the host may pick */}
            {background.host && <HostBackgrounds host={background.host} />}
        </SettingsGroup>
    );
}

type HostBackgroundsProps = { host: NonNullable<ReturnType<typeof useBackgroundSettings>['host']> };

function HostBackgrounds({ host }: HostBackgroundsProps) {
    const t = useTranslations('InvitationEditor.sectionSettings');

    return (
        <>
            <SettingsToggle label={t('hostCanChange')} checked={host.enabled} onChange={host.setHostEnabled} />
            {host.enabled && (
                <fieldset className="flex flex-col gap-1">
                    <legend className="mb-1 text-[13px]">{t('hostBackgrounds')}</legend>
                    {host.slots.map(({ slot, label }) => (
                        <SlotCheckbox key={slot} slot={slot} label={label} checked={host.allowed.includes(slot)} onChange={host.setHostAllowed} />
                    ))}
                </fieldset>
            )}
        </>
    );
}

type BackgroundCardProps = { choice: BackgroundChoice; isSelected: boolean; onPick: (choice: ThemeBackgroundChoice) => void };

function BackgroundCard({ choice, isSelected, onPick }: BackgroundCardProps) {
    const pick = useCallback(() => onPick(choice.value), [choice.value, onPick]);

    return (
        <button
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={choice.src ? undefined : choice.label}
            onClick={pick}
            className="grid aspect-[3/4] place-items-center overflow-hidden rounded-[10px] border-2 border-transparent bg-(--smd-editor-control) text-[12px] font-semibold text-(--smd-editor-muted) focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none aria-checked:border-white aria-checked:text-white"
        >
            {choice.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={choice.src} alt={choice.label} className="h-full w-full object-cover" />
            ) : (
                <span aria-hidden="true">{choice.label}</span>
            )}
        </button>
    );
}


type SlotCheckboxProps = {
    slot: ThemeBackgroundSlot;
    label: string;
    checked: boolean;
    onChange: (slot: ThemeBackgroundSlot, allowed: boolean) => void;
};

function SlotCheckbox({ slot, label, checked, onChange }: SlotCheckboxProps) {
    const change = useCallback((event: ChangeEvent<HTMLInputElement>) => onChange(slot, event.target.checked), [onChange, slot]);

    return (
        <label className="flex min-h-9 cursor-pointer items-center gap-2.5 text-[13px]">
            <input type="checkbox" checked={checked} onChange={change} className="h-4 w-4 shrink-0 accent-(--smd-editor-accent)" />
            {label}
        </label>
    );
}
