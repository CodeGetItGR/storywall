'use client';

import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ModulePageHeader } from '@/components/tools/ModulePageHeader';
import { useActiveModuleCopy } from '@/hooks/useModuleCopy';

export function RsvpHeader({ backHref }: { backHref: string }) {
    const t = useTranslations('RSVPPage');
    const rsvpCopy = useActiveModuleCopy('rsvp');

    return <ModulePageHeader title={rsvpCopy.name} icon={Users} iconClassName="text-emerald-500" backLabel={t('goBack')} backHref={backHref} />;
}
