'use client';

import { CreditCard, Gift, Pencil, Printer } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { GiftDetailsCard } from '@/components/giftMode/GiftDetailsCard';
import { GiftDetailsModal } from '@/components/giftMode/GiftDetailsModal';
import { GiftIllustration } from '@/components/giftMode/GiftIllustration';
import { GiftPinModal } from '@/components/giftMode/GiftPinModal';
import { GiftSteps } from '@/components/giftMode/GiftSteps';
import { AppLink } from '@/components/ui/AppLink';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useGiftManagement } from '@/hooks/useGiftManagement';
import type { GiftHandoverResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { canPrintGiftCard, giftStatusCopy, giftStepsDone } from '@/lib/gift';
import { routes } from '@/lib/routes';

const actionClass =
    'inline-flex min-h-10 items-center gap-2 rounded-full bg-surface-muted px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-muted/70 disabled:cursor-not-allowed disabled:opacity-60';

// "Given as a gift": the gift's state for every host, and its actions for the primary host.
export function GiftSection({
    eventId,
    gift,
    canManage,
    eventActive,
}: {
    eventId: string;
    gift: GiftHandoverResponseDto | null;
    canManage: boolean;
    eventActive: boolean;
}) {
    const t = useTranslations('GiftMode.manage');
    const locale = useLocale();
    const management = useGiftManagement(eventId, gift, { canManage, eventActive });
    const status = gift ? giftStatusCopy(gift) : null;

    return (
        <div className="space-y-6">
            {/* How it works */}
            <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)] sm:gap-8">
                <GiftIllustration className="mx-auto h-auto w-full max-w-[220px]" />
                <GiftSteps stepsDone={giftStepsDone(gift)} />
            </div>

            {/* Not set up */}
            {!gift && management.canEdit && (
                <button type="button" onClick={management.openDetails} className={actionClass}>
                    <Gift className="h-4 w-4" aria-hidden="true" />
                    {t('setUp')}
                </button>
            )}

            {gift && status && (
                <>
                    {/* Status */}
                    <p className="text-sm font-semibold text-ink">
                        {t(`status.${status.key}`, {
                            name: gift.claimedByDisplayName ?? t('someone'),
                            date: status.date ? formatDate(locale, status.date, { dateStyle: 'medium' }) : '',
                        })}
                    </p>

                    {/* Card */}
                    <div className="max-w-md">
                        <GiftDetailsCard eventId={eventId} gift={gift} />
                    </div>

                    {/* Actions */}
                    {(management.canEdit || management.canIssue || canPrintGiftCard(gift)) && (
                        <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                                {management.canIssue && (
                                    <button type="button" onClick={management.requestIssue} disabled={management.isIssuing} className={actionClass}>
                                        <CreditCard className="h-4 w-4" aria-hidden="true" />
                                        {gift.token ? t('reissue') : t('issue')}
                                    </button>
                                )}
                                {canPrintGiftCard(gift) && (
                                    <AppLink href={routes.events.giftCard(eventId)} className={actionClass}>
                                        <Printer className="h-4 w-4" aria-hidden="true" />
                                        {t('print')}
                                    </AppLink>
                                )}
                                {management.canEdit && (
                                    <button type="button" onClick={management.openDetails} className={actionClass}>
                                        <Pencil className="h-4 w-4" aria-hidden="true" />
                                        {t('edit')}
                                    </button>
                                )}
                            </div>
                            {management.issueError && !management.reissueOpen && <p className="text-sm text-rose-600">{management.issueError}</p>}
                        </div>
                    )}
                </>
            )}

            {/* Details form */}
            <GiftDetailsModal management={management} isNew={!gift} />

            {/* Reissue confirmation */}
            <ConfirmActionModal
                open={management.reissueOpen}
                onCloseAction={management.closeReissue}
                onConfirmAction={management.confirmReissue}
                title={t('reissueTitle')}
                body={
                    <>
                        {t('reissueBody')}
                        {management.issueError && <span className="mt-1 block text-destructive">{management.issueError}</span>}
                    </>
                }
                confirmLabel={t('reissueConfirm')}
                cancelLabel={t('cancel')}
                isConfirming={management.isIssuing}
            />

            {/* New PIN */}
            <GiftPinModal eventId={eventId} pin={management.issuedPin} open={management.pinOpen} onCloseAction={management.closePin} />
        </div>
    );
}
