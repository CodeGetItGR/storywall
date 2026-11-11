'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AppLink } from '@/components/ui/AppLink';
import { routes } from '@/lib/routes';

// The home screen's main action while the create wizard is on. Opens the pop-up (the layout's host
// catches the link).
export function HomeCreateEventButton() {
    const t = useTranslations('CreateEventPage');

    return (
        <AppLink
            href={routes.events.new()}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(120deg,#ff6fa0,#ff7a59_55%,#ffb259)] text-[17px] font-bold text-ink shadow-[0_10px_28px_rgba(255,122,89,0.28)]"
        >
            <Plus className="size-5" aria-hidden="true" />
            {t('title')}
        </AppLink>
    );
}
