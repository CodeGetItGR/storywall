'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { ColorCircles } from '@/components/ui/color/ColorCircles';

type TextColorSettingProps = {
    value: string;
    themeColors: readonly string[];
    onChange: (color: string) => void;
};

// The invitation's text colour. Mixing a colour is one undo step.
export function TextColorSetting({ value, themeColors, onChange }: TextColorSettingProps) {
    const t = useTranslations('InvitationEditor');
    const labelId = useId();

    return (
        <div className="flex flex-col gap-2">
            <span id={labelId} className="font-medium">
                {t('textColor')}
            </span>
            <ColorCircles value={value} themeColors={themeColors} labelledBy={labelId} onChange={onChange} />
        </div>
    );
}
