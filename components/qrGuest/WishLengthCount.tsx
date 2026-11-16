import { useTranslations } from 'next-intl';

const RADIUS = 14;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// How much of the wish's length is used: a small ring that fills up, with the count beside it.
export function WishLengthCount({ current, max }: { current: number; max: number }) {
    const t = useTranslations('QrCodePage');
    const used = max > 0 ? Math.min(1, current / max) : 0;

    return (
        <p className="mt-1.5 flex items-center justify-end gap-1.5 text-xs text-ink-faint">
            <svg viewBox="0 0 36 36" className="h-3.5 w-3.5 -rotate-90" aria-hidden="true">
                <circle cx="18" cy="18" r={RADIUS} fill="none" strokeWidth="5" className="stroke-border" />
                <circle
                    cx="18"
                    cy="18"
                    r={RADIUS}
                    fill="none"
                    strokeWidth="5"
                    strokeDasharray={`${used * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                    className="stroke-primary transition-[stroke-dasharray]"
                />
            </svg>
            {t('guestCode.wish.charactersLeft', { current, max })}
        </p>
    );
}
