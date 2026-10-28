'use client';

import { Gift } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { GiftCardPinOption } from '@/components/giftMode/GiftCardPinOption';
import { GiftCardPlain } from '@/components/giftMode/GiftCardPlain';
import { QrLinksListSkeleton } from '@/components/manage/ManageSkeletons';
import { QrCardDesigner } from '@/components/qrCard/QrCardDesigner';
import { QrCardDesignerSkeleton } from '@/components/qrCard/QrCardSkeletons';
import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { useGiftCardPrint } from '@/hooks/useGiftCardPrint';
import { routes } from '@/lib/routes';

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
            ) : !print.designsAvailable ? (
                <GiftCardPlain
                    card={print.card}
                    claimUrl={print.claimUrl}
                    pin={print.pin}
                    includePin={print.includePin}
                    onIncludePinChangeAction={print.handleIncludePinChange}
                    onPrintAction={print.print}
                />
            ) : !print.claimUrl ? (
                // The claim link needs the browser's origin: a beat after hydration.
                <QrCardDesignerSkeleton />
            ) : (
                <QrCardDesigner
                    designer={print.designer}
                    exporter={print.exporter}
                    url={print.claimUrl}
                    lines={print.cardLines}
                    label={print.cardLabel}
                    templatesFailed={print.templatesFailed}
                    onRetryTemplatesAction={print.retryTemplates}
                >
                    {/* PIN */}
                    <GiftCardPinOption pin={print.pin} includePin={print.includePin} onChangeAction={print.handleIncludePinChange} />
                </QrCardDesigner>
            )}
        </ModulePageShell>
    );
}
