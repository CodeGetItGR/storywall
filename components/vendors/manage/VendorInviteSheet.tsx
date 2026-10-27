'use client';

import { Copy, QrCode, RotateCcw, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';
import { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { Modal } from '@/components/ui/modal';
import { VendorInviteQr } from '@/components/vendors/manage/VendorInviteQr';
import { useVendorInviteLink } from '@/hooks/useVendorInviteLink';
import type { PartnerRole, VendorLinkDto } from '@/lib/api/types';

const SELECT_CLASS =
    'min-h-11 w-full rounded-2xl border border-border/70 bg-background px-4 text-sm text-ink transition outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10';

export function VendorInviteSheet({
    open,
    links,
    link,
    qrOpen,
    error,
    onCloseAction,
    onPickTypeAction,
    onToggleQrAction,
    onResetAction,
}: {
    open: boolean;
    links: VendorLinkDto[];
    link: VendorLinkDto | null;
    qrOpen: boolean;
    error: string | null;
    onCloseAction: () => void;
    onPickTypeAction: (type: PartnerRole) => void;
    onToggleQrAction: () => void;
    onResetAction: () => void;
}) {
    const t = useTranslations('Vendors');
    const handleTypeChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => onPickTypeAction(event.target.value as PartnerRole), [onPickTypeAction]);

    return (
        <Modal open={open && link !== null} onClose={onCloseAction} variant="sheet" size="sm" closeLabel={t('manage.close')}>
            {link && (
                <Modal.Body className="px-5 pt-5 pb-6">
                    {/* Header */}
                    <h2 className="pr-8 text-lg font-bold text-ink">{t('manage.inviteTitle')}</h2>

                    {/* Type */}
                    <div className="mt-5">
                        <FormFieldLabel label={t('manage.inviteType')}>
                            <select className={SELECT_CLASS} value={link.vendorType} onChange={handleTypeChange}>
                                {links.map((option) => (
                                    <option key={option.vendorType} value={option.vendorType}>
                                        {t(`types.${option.vendorType}`)}
                                    </option>
                                ))}
                            </select>
                        </FormFieldLabel>
                    </div>

                    {/* Link */}
                    <VendorInviteActions key={link.inviteToken} link={link} qrOpen={qrOpen} onToggleQrAction={onToggleQrAction} />

                    {/* Error */}
                    {error && (
                        <p role="alert" className="mt-3 text-sm text-rose-600">
                            {error}
                        </p>
                    )}

                    {/* Reset */}
                    <div className="mt-6 flex justify-center">
                        <Button type="button" variant="ghost" onClick={onResetAction} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                            <RotateCcw aria-hidden="true" />
                            {t('manage.reset')}
                        </Button>
                    </div>
                </Modal.Body>
            )}
        </Modal>
    );
}

function VendorInviteActions({ link, qrOpen, onToggleQrAction }: { link: VendorLinkDto; qrOpen: boolean; onToggleQrAction: () => void }) {
    const t = useTranslations('Vendors');
    const typeLabel = t(`types.${link.vendorType}`);
    const invite = useVendorInviteLink(link, typeLabel);

    return (
        <div className="mt-4 flex flex-col gap-2">
            {/* Copy */}
            <Button type="button" size="lg" onClick={invite.copy}>
                <Copy aria-hidden="true" />
                {invite.copied ? t('manage.copied') : t('manage.copy')}
            </Button>

            {/* Share and QR */}
            <div className="flex gap-2">
                {invite.canShare && (
                    <Button type="button" variant="outline" size="lg" onClick={invite.share} className="flex-1">
                        <Share2 aria-hidden="true" />
                        {t('manage.share')}
                    </Button>
                )}
                <Button type="button" variant="outline" size="lg" onClick={onToggleQrAction} aria-expanded={qrOpen} className="flex-1">
                    <QrCode aria-hidden="true" />
                    {t('manage.qr')}
                </Button>
            </div>

            {/* QR */}
            {qrOpen && <VendorInviteQr url={invite.qrUrl} title={t('manage.qrTitle', { type: typeLabel })} />}
        </div>
    );
}
