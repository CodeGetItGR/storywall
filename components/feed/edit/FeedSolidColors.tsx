'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { ColorCircles } from '@/components/ui/color/ColorCircles';
import { isOwnColor } from '@/lib/colorCircles';
import { tooDarkForInk } from '@/lib/contrast';
import { cn } from '@/lib/utils';

type FeedSolidColorsProps = { value: string | undefined; disabled: boolean; onChange: (color: string) => void };

// The whole feed in one colour. A colour too dark for ink or muted ink text is drawn lighter (readableOnInk); the line
// under the circles says so for a mixed colour, not for the app's four (owner 2026-11-24).
export function FeedSolidColors({ value, disabled, onChange }: FeedSolidColorsProps) {
    const t = useTranslations('FeedEditor');
    const titleId = useId();
    const tooDark = value !== undefined && !isOwnColor(value) && tooDarkForInk(value);

    return (
        <section className="flex flex-col gap-2">
            {/* Circles: closer together on desktop, where the panel's scrollbar takes part of the row */}
            <h3 id={titleId} className="text-[13px] leading-tight font-medium">
                {t('solidColor')}
            </h3>
            <ColorCircles value={value} labelledBy={titleId} disabled={disabled} className="lg:gap-x-2" onChange={onChange} />

            {/* Too dark: always mounted, so screen readers hear the text when it appears */}
            <p role="status" className={cn('text-[12px] text-(--smd-editor-muted)', !tooDark && 'sr-only')}>
                {tooDark ? t('background.tooDark') : null}
            </p>
        </section>
    );
}
