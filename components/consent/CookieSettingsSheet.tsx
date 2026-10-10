'use client';

import { useTranslations } from 'next-intl';

import { CookieSwitchRow } from '@/components/consent/CookieSwitchRow';
import { Modal } from '@/components/ui/modal';
import { useCookieSettingsDraft } from '@/hooks/useCookieSettingsDraft';

export function CookieSettingsSheet() {
    const t = useTranslations('CookieConsent');
    const { open, ads, setAds, saveDraft, close } = useCookieSettingsDraft();

    return (
        <Modal ariaLabel={t('settingsTitle')} closeLabel={t('close')} onClose={close} open={open} size="sm" variant="sheet">
            <Modal.Body className="p-5 sm:p-6">
                {/* Header */}
                <h2 className="pr-10 text-lg font-bold text-ink">{t('settingsTitle')}</h2>

                {/* Categories */}
                <div className="mt-4 divide-y divide-border/70">
                    <CookieSwitchRow checked description={t('essentialBody')} disabled label={t('essentialLabel')} />
                    <CookieSwitchRow checked={ads} description={t('adsBody')} label={t('adsLabel')} onCheckedChange={setAds} />
                </div>

                {/* Footer */}
                <button
                    className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-white focus-ring transition-opacity hover:opacity-85"
                    onClick={saveDraft}
                    type="button"
                >
                    {t('save')}
                </button>
            </Modal.Body>
        </Modal>
    );
}
