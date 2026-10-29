import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function SneakPeekLabel() {
    const t = useTranslations('PostCard');

    // Same treatment as the announcement label: coral on the icon only.
    return (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.8} aria-hidden="true" />
            <span>{t('sneakPeek')}</span>
        </p>
    );
}
