'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { ColorCircles } from '@/components/ui/color/ColorCircles';
import { SOLID_COLORS, WHITE } from '@/lib/colorCircles';

const WHITE_FIRST = [WHITE];

type FeedSolidColorsProps = { value: string | undefined; disabled: boolean; onChange: (color: string) => void };

// The whole feed in one colour, white ("No theme") first. The page is drawn exactly in it; its text follows (lib/pageTone.ts).
export function FeedSolidColors({ value, disabled, onChange }: FeedSolidColorsProps) {
    const t = useTranslations('FeedEditor');
    const titleId = useId();

    return (
        <section className="flex flex-col gap-2">
            {/* Title */}
            <h3 id={titleId} className="text-[13px] leading-tight font-medium">
                {t('solidColor')}
            </h3>
            {/* Circles: white, the four, a mixed colour and "+" on one row; smaller in the desktop panel (owner 2026-11-25)
                and on narrow phones */}
            <ColorCircles
                value={value}
                themeColors={WHITE_FIRST}
                mixerStart={SOLID_COLORS[0]}
                labelledBy={titleId}
                disabled={disabled}
                className="gap-1.5 max-[374px]:[&>button]:size-9 lg:[&>button]:size-7"
                onChange={onChange}
            />
        </section>
    );
}
