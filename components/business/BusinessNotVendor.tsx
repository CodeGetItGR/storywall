'use client';

import { ArrowLeft, Store } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ToolEmptyState } from '@/components/tools/ToolEmptyState';
import { AppLink } from '@/components/ui/AppLink';
import { routes } from '@/lib/routes';

// For an account that is neither a vendor nor a partner (the overview's 403): a short note and the way back.
export function BusinessNotVendor() {
    const t = useTranslations('BusinessPage.notVendor');

    return (
        <ToolEmptyState
            title={t('title')}
            body={t('body')}
            icon={Store}
            action={
                <AppLink
                    href={routes.profile}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    {t('profile')}
                </AppLink>
            }
        />
    );
}
