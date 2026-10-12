'use client';

import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function AccountEmailSent() {
    const t = useTranslations('AdminPage.accounts.emails');

    return (
        <section className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            {/* Sent */}
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-status-good-wash text-status-good">
                <CheckCircle2 className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-lg font-bold text-ink">{t('sentTitle')}</h3>
        </section>
    );
}
