'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { ForBusinessApplyForm } from '@/components/forBusiness/ForBusinessApplyForm';
import { Modal } from '@/components/ui/modal';
import type { Locale } from '@/i18n/config';
import { type ApplyFormDefaults, countryOptions, defaultCountryCode } from '@/lib/forBusinessApplication';

export function BecomePartnerSheet({
    open,
    defaults,
    search,
    onCloseAction,
}: {
    open: boolean;
    defaults: ApplyFormDefaults;
    search: string;
    onCloseAction: () => void;
}) {
    const t = useTranslations('Vendors.partner');
    const locale = useLocale() as Locale;
    const countries = useMemo(() => countryOptions(locale), [locale]);

    return (
        <Modal open={open} onClose={onCloseAction} variant="sheet" size="md" ariaLabel={t('sheetTitle')}>
            <Modal.Body className="px-5 pt-5 pb-6">
                {/* Header */}
                <h2 className="pr-8 text-lg font-bold text-ink">{t('sheetTitle')}</h2>

                {/* Form */}
                <ForBusinessApplyForm countries={countries} defaultCountry={defaultCountryCode(locale)} defaults={defaults} search={search} />
            </Modal.Body>
        </Modal>
    );
}
