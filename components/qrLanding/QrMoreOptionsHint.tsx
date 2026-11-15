import { ArrowDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

// A full-width fade along the bottom of the screen while more choices wait below it (KAN-213).
export function QrMoreOptionsHint({ onReveal }: { onReveal: () => void }) {
    const t = useTranslations('QrCodePage');

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20">
            <div className="mx-auto flex h-24 max-w-xl items-end justify-center bg-linear-to-t from-background via-background/90 to-transparent pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <button
                    type="button"
                    onClick={onReveal}
                    className="pointer-events-auto inline-flex min-h-11 items-center gap-1.5 px-4 text-sm font-semibold text-ink"
                >
                    {t('choices.moreOptions')}
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}
