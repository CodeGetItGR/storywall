'use client';

import { Gift, Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';

import { QrLinksListSkeleton } from '@/components/manage/ManageSkeletons';
import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { useGiftCardPrint } from '@/hooks/useGiftCardPrint';
import { routes } from '@/lib/routes';

const QR_SIZE = 220;

export function GiftCardPrintScreen() {
    const t = useTranslations('GiftMode.card');
    const { eventId } = useEventRouteContext();
    const print = useGiftCardPrint(eventId);

    return (
        <ModulePageShell maxWidth="xl" title={t('title')} icon={Gift} backLabel={t('back')} backHref={routes.events.manage(eventId, { tab: 'gift' })}>
            {print.isLoading ? (
                <QrLinksListSkeleton />
            ) : !print.card ? (
                // No live card
                <p className="text-center text-sm text-ink-muted">{t('noCard')}</p>
            ) : (
                <div className="flex flex-col gap-6">
                    {/* Card */}
                    <div
                        data-print-root
                        className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl bg-white px-6 py-8 text-center text-[#241f1a] shadow-sm"
                    >
                        <p className="text-2xl font-bold text-balance">{print.card.recipientLabel}</p>
                        {print.claimUrl && (
                            <QRCodeSVG
                                value={print.claimUrl}
                                size={QR_SIZE}
                                level="H"
                                marginSize={2}
                                fgColor="#241f1a"
                                bgColor="#ffffff"
                                title={t('scan')}
                            />
                        )}
                        <p className="text-sm">{t('scan')}</p>
                        {print.includePin && <p className="font-mono text-lg font-bold tracking-[0.2em]">{t('pin', { pin: print.pin ?? '' })}</p>}
                        {print.card.recipientEmail && (
                            <p className="text-xs break-all text-[#6f665d]">{t('email', { email: print.card.recipientEmail })}</p>
                        )}
                        <p className="text-base font-semibold text-balance">{print.card.giverDisplayName}</p>
                    </div>

                    {/* Options */}
                    <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
                        {print.pin ? (
                            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
                                <input
                                    type="checkbox"
                                    checked={print.includePin}
                                    onChange={print.handleIncludePinChange}
                                    className="h-4 w-4 accent-primary"
                                />
                                {t('includePin')}
                            </label>
                        ) : (
                            <p className="text-sm text-ink-muted">{t('pinUnavailable')}</p>
                        )}
                        <button
                            type="button"
                            onClick={print.print}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-ink/90"
                        >
                            <Printer className="h-4 w-4" aria-hidden="true" />
                            {t('print')}
                        </button>
                    </div>
                </div>
            )}
        </ModulePageShell>
    );
}
