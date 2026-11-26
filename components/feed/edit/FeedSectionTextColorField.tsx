'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { ColorCircles } from '@/components/ui/color/ColorCircles';

type FeedSectionTextColorFieldProps = {
    value: string;
    themeColors: readonly string[];
    onChange: (color: string) => void;
};

// One colour for all the text of a Save my date section.
export function FeedSectionTextColorField({ value, themeColors, onChange }: FeedSectionTextColorFieldProps) {
    const t = useTranslations('InvitationEditor');
    const labelId = useId();

    return (
        <div className="flex flex-col gap-1.5">
            <span id={labelId} className="text-[13px] leading-tight">
                {t('textColor')}
            </span>
            <ColorCircles value={value} themeColors={themeColors} labelledBy={labelId} onChange={onChange} />
        </div>
    );
}
