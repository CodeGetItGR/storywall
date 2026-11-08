'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useCallback, useId } from 'react';

import { colorInputValue } from '@/lib/invitation/colorInput';

type TextColorSettingProps = {
    value: string;
    onChange: (color: string) => void;
};

// The invitation's text colour. Dragging through colours is one undo step.
export function TextColorSetting({ value, onChange }: TextColorSettingProps) {
    const t = useTranslations('InvitationEditor');
    const id = useId();
    const change = useCallback((event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value), [onChange]);

    return (
        <div className="flex items-center justify-between gap-3">
            <label htmlFor={id} className="font-medium">
                {t('textColor')}
            </label>
            <input
                id={id}
                type="color"
                value={colorInputValue(value)}
                onChange={change}
                className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-current/20 bg-transparent p-0.5"
            />
        </div>
    );
}
