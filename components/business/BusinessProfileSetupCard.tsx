'use client';

import { Store } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { VENDOR_SECTION_SURFACE } from '@/components/vendors/me/VendorMeSection';
import { cn } from '@/lib/utils';

// For an account with no vendor profile yet: one card that opens the details sheet to create it.
export function BusinessProfileSetupCard({ onSetUpAction }: { onSetUpAction: () => void }) {
    const t = useTranslations('BusinessPage.setup');

    return (
        <section aria-labelledby="business-setup-title" className={cn(VENDOR_SECTION_SURFACE, 'flex flex-wrap items-center gap-4 p-5 lg:col-span-2')}>
            {/* Icon */}
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Store className="size-5" aria-hidden="true" />
            </span>

            {/* Message */}
            <div className="min-w-0 flex-1 basis-52">
                <h2 id="business-setup-title" className="text-base font-semibold text-ink">
                    {t('title')}
                </h2>
                <p className="mt-0.5 text-sm text-ink-muted">{t('body')}</p>
            </div>

            {/* Action */}
            <Button type="button" onClick={onSetUpAction} className="shrink-0 rounded-full">
                {t('action')}
            </Button>
        </section>
    );
}
