'use client';

import { Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { SECONDARY_BUTTON_CLASS, SettingsGroup } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { ColorSwatch } from '@/components/ui/color/ColorSwatch';
import { useDressCodeSettings } from '@/hooks/useDressCodeSettings';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import { colorInputValue } from '@/lib/invitation/colorInput';
import { themeColors } from '@/lib/invitation/textEditing';

// The dress code's colours: change, remove or add one (old dress code panel).
export function DressCodeSettings({ scope }: { scope: SettingsScope<SectionOf<'dressCode'>> }) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const dressCode = useDressCodeSettings(scope);
    const ownColors = themeColors(scope.theme);

    return (
        <SettingsGroup title={t('colors')}>
            {/* Colours */}
            {dressCode.colors.length > 0 && (
                <ul className="grid grid-cols-4 gap-2">
                    {dressCode.colors.map((color, index) => (
                        <DressCodeColor
                            key={index}
                            index={index}
                            color={color}
                            ownColors={ownColors}
                            onChange={dressCode.change}
                            onRemove={dressCode.remove}
                        />
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

type DressCodeColorProps = {
    index: number;
    color: string;
    ownColors: readonly string[];
    onChange: (index: number, color: string) => void;
    onRemove: (index: number) => void;
};

function DressCodeColor({ index, color, ownColors, onChange, onRemove }: DressCodeColorProps) {
    const t = useTranslations('InvitationEditor.sectionSettings');
    const change = useCallback((next: string) => onChange(index, next), [index, onChange]);
    const remove = useCallback(() => onRemove(index), [index, onRemove]);

    return (
        <li className="relative">
            <ColorSwatch value={colorInputValue(color)} label={color} themeColors={ownColors} onChange={change} className="aspect-square h-auto w-full" />
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
