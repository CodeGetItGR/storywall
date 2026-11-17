import { ArrowDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

// A dark pill at the bottom of the screen while more choices wait below it (KAN-213).
export function QrMoreOptionsHint({ onReveal }: { onReveal: () => void }) {
    const t = useTranslations('QrCodePage');

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
                type="button"
                onClick={onReveal}
                className="pointer-events-auto inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-background shadow-lg transition-opacity hover:opacity-90"
            >
                {t('choices.moreOptions')}
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </button>
        </div>
    );
}
