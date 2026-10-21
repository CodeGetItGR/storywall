'use client';

import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { VendorLogo } from '@/components/vendors/VendorLogo';
import type { VendorRowDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

export function VendorSheet({
    vendor,
    error,
    isPatching,
    onCloseAction,
    onToggleHiddenAction,
    onRemoveAction,
}: {
    vendor: VendorRowDto | null;
    error: string | null;
    isPatching: boolean;
    onCloseAction: () => void;
    onToggleHiddenAction: () => void;
    onRemoveAction: () => void;
}) {
    const t = useTranslations('Vendors');
    const locale = useLocale();
    const name = vendor?.businessName ?? t('manage.noProfile');

    return (
        <Modal open={vendor !== null} onClose={onCloseAction} variant="sheet" size="sm" closeLabel={t('manage.close')}>
            {vendor && (
                <Modal.Body className="px-5 pt-5 pb-6">
                    {/* Vendor */}
                    <div className="flex items-center gap-3 pr-8">
                        <VendorLogo logoUrl={vendor.logoUrl} name={name} className="size-12" />
                        <div className="min-w-0">
                            <h2 className="truncate text-base font-bold text-ink">{name}</h2>
                            <p className="text-sm text-ink-muted">{t(`types.${vendor.vendorType}`)}</p>
                            <p className="text-xs text-ink-muted">
                                {t('manage.sheetJoined', { date: formatDate(locale, vendor.joinedAt, { dateStyle: 'medium' }) })}
                            </p>
                        </div>
                    </div>

                    {/* Listing */}
                    <div className="mt-5 flex flex-col gap-2">
                        {vendor.optedOut && <p className="text-sm text-ink-muted">{t('manage.optedOut')}</p>}
                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            onClick={onToggleHiddenAction}
                            disabled={isPatching || Boolean(vendor.optedOut)}
                        >
                            {vendor.hiddenByHost ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                            {vendor.hiddenByHost ? t('manage.show') : t('manage.hide')}
                        </Button>
                    </div>

                    {/* Error */}
                    {error && (
                        <p role="alert" className="mt-3 text-sm text-rose-600">
                            {error}
                        </p>
                    )}

                    {/* Danger */}
                    <div className="mt-6">
                        <Button type="button" variant="destructive" size="lg" onClick={onRemoveAction} className="w-full">
                            <Trash2 aria-hidden="true" />
                            {t('manage.remove')}
                        </Button>
                    </div>
                </Modal.Body>
            )}
        </Modal>
    );
}
