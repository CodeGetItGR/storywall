import { ArrowLeft, Compass } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ToolEmptyState } from '@/components/tools/ToolEmptyState';
import { AppLink } from '@/components/ui/AppLink';

export function VendorMeNotVendor({ backHref }: { backHref: string }) {
    const t = useTranslations('Vendors.me.notVendor');

    return (
        <ToolEmptyState
            title={t('title')}
            body={t('body')}
            icon={Compass}
            className="flex min-h-[calc(100dvh-12rem)] flex-col justify-center"
            action={
                <AppLink
                    href={backHref}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    {t('action')}
                </AppLink>
            }
        />
    );
}
