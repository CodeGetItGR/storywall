'use client';

import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ModulePageHeader } from '@/components/tools/ModulePageHeader';

export function RsvpHeader({ onGoBack }: { onGoBack: () => void }) {
    const t = useTranslations('RSVPPage');

    return <ModulePageHeader title={t('title')} icon={Users} iconClassName="text-emerald-500" backLabel={t('goBack')} onBack={onGoBack} />;
}
