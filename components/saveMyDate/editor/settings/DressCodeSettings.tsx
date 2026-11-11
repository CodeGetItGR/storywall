'use client';

import { Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback } from 'react';

import { SECONDARY_BUTTON_CLASS, SettingsGroup } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { useDressCodeSettings } from '@/hooks/useDressCodeSettings';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { colorInputValue } from '@/lib/invitation/colorInput';

// The dress code's colours: change, remove or add one (old dress code panel).
export function DressCodeSettings({ scope }: { scope: SettingsScope<SectionOf<'dressCode'>> }) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const dressCode = useDressCodeSettings(scope);

    return (
        <SettingsGroup title={t('colors')}>
            {/* Colours */}
            {dressCode.colors.length > 0 && (
                <ul className="grid grid-cols-4 gap-2">
                    {dressCode.colors.map((color, index) => (
                        <ColorSwatch key={index} index={index} color={color} onChange={dressCode.change} onRemove={dressCode.remove} />
                    ))}
                </ul>
            )}

            {/* Add */}
            <button type="button" onClick={dressCode.add} disabled={!dressCode.canAdd} className={SECONDARY_BUTTON_CLASS}>
                <Plus aria-hidden="true" />
                {t('addColor')}
            </button>
        </SettingsGroup>
    );
}

type ColorSwatchProps = {
    index: number;
    color: string;
    onChange: (index: number, color: string) => void;
    onRemove: (index: number) => void;
};

function ColorSwatch({ index, color, onChange, onRemove }: ColorSwatchProps) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const change = useCallback((event: ChangeEvent<HTMLInputElement>) => onChange(index, event.target.value), [index, onChange]);
    const remove = useCallback(() => onRemove(index), [index, onRemove]);

    return (
        <li className="relative">
            <input
                type="color"
                aria-label={color}
                value={colorInputValue(color)}
                onChange={change}
                className="aspect-square h-auto w-full cursor-pointer rounded-full border border-white/25 bg-transparent p-0.5"
            />
            <button
                type="button"
                onClick={remove}
                aria-label={t('removeColor', { color })}
                title={t('removeColor', { color })}
                className="absolute -top-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-white text-[#2b2d31] shadow focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none [&_svg]:h-3.5 [&_svg]:w-3.5"
            >
                <X aria-hidden="true" />
            </button>
        </li>
    );
}
