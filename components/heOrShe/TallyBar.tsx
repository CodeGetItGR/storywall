'use client';

import { useTranslations } from 'next-intl';

import { tallyPercent } from '@/lib/heOrShe';

/** The Boy / Girl split. The page's one home for the counts. */
export function TallyBar({ tally }: { tally: { he: number; she: number } }) {
    const t = useTranslations('HeOrShePage');
    const percent = tallyPercent(tally);
    const total = tally.he + tally.she;
    return (
        <div className="space-y-2">
            {/* Labels */}
            <div className="flex justify-between text-sm font-semibold">
                <span className="text-sky-700">
                    {t('he')} {percent.he}%
                </span>
                <span className="text-pink-700">
                    {percent.she}% {t('she')}
                </span>
            </div>

            {/* Bar */}
            <div className="flex h-4 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                {total > 0 && (
                    <>
                        <div className="bg-sky-400 transition-all" style={{ width: `${percent.he}%` }} />
                        <div className="bg-pink-400 transition-all" style={{ width: `${percent.she}%` }} />
                    </>
                )}
            </div>

            {/* Count */}
            <p className="text-center text-xs text-ink-muted">{t('guesses', { count: total })}</p>
        </div>
    );
}
