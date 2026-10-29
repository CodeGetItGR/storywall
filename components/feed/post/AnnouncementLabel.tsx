import { Megaphone } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function AnnouncementLabel() {
    const t = useTranslations('PostCard');

    // Coral stays on the icon: as small text it is too faint on the tint and on themed cards.
    return (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <Megaphone className="h-4 w-4 text-primary" strokeWidth={1.8} aria-hidden="true" />
            <span>{t('announcement')}</span>
        </p>
    );
}
