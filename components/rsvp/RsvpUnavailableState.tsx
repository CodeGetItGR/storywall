'use client';

import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ModuleUnavailableState } from '@/components/tools/ModuleUnavailableState';
import { usePlanUpgradeHref } from '@/hooks/usePlanUpgradeHref';
import { routes } from '@/lib/routes';

export function RsvpUnavailableState({ eventId, title, body }: { eventId: string; title: string; body: string }) {
    const t = useTranslations('RSVPPage');
    const upgradeHref = usePlanUpgradeHref(eventId);

    return (
        <ModuleUnavailableState
            backHref={routes.events.feed(eventId)}
            backLabel={t('backToTheWall')}
            body={body}
            icon={Users}
            iconClassName="text-emerald-500"
            title={title}
            upgradeHref={upgradeHref}
        />
    );
}
