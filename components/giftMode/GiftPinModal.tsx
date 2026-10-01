'use client';

import { Printer } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Modal } from '@/components/ui/modal';
import { routes } from '@/lib/routes';

// Shown once, right after a card is issued: the only time the PIN is known.
export function GiftPinModal({
    eventId,
    pin,
    open,
    onCloseAction,
}: {
    eventId: string;
    pin: string | null;
    open: boolean;
    onCloseAction: () => void;
}) {
    const t = useTranslations('GiftMode.manage');

    return (
        <Modal open={open && Boolean(pin)} onClose={onCloseAction} size="sm" closeLabel={t('done')}>
            <Modal.Body className="px-4 pt-12 pb-4 sm:px-5">
                <div className="flex flex-col gap-5">
                    {/* Header */}
                    <div className="pr-8">
                        <h2 className="text-base font-semibold text-ink">{t('pinTitle')}</h2>
                        <p className="mt-1 text-sm text-ink-muted">{t('pinBody')}</p>
                    </div>

                    {/* PIN */}
                    <p
                        className="rounded-2xl bg-surface-muted py-4 text-center font-mono text-3xl font-bold tracking-[0.3em] text-ink"
                        aria-label={t('pinLabel')}
                    >
                        {pin}
                    </p>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onCloseAction}
                            className="rounded-full bg-surface-muted px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
                        >
                            {t('done')}
                        </button>
                        <Link
                            href={routes.events.giftCard(eventId)}
                            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/90"
                        >
                            <Printer className="h-4 w-4" aria-hidden="true" />
                            {t('print')}
                        </Link>
                    </div>
                </div>
            </Modal.Body>
        </Modal>
    );
}
