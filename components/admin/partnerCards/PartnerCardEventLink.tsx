'use client';

import { Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { adminInputClass } from '@/components/admin/AdminField';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { usePartnerCardEventLink } from '@/hooks/usePartnerCards';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { EventPartnerBrandingResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';
import { cn } from '@/lib/utils';

// One event's partner: its details, plus link/replace and remove.
export function PartnerCardEventLink({ eventId, link }: { eventId: string; link: EventPartnerBrandingResponseDto | null }) {
    const t = useTranslations('AdminPage.partnerCards.event');
    const tAdmin = useTranslations('AdminPage');
    const tVariants = useTranslations('AdminPage.feedCardVariants');
    const locale = useLocale();
    const controls = usePartnerCardEventLink(eventId, link?.collaboratorId ?? null);

    return (
        <div className="space-y-4">
            {/* Details */}
            {link ? (
                <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                    <div>
                        <dt className="text-xs font-medium text-ink-muted">{t('fields.partner')}</dt>
                        <dd className="font-semibold text-ink">{link.displayName}</dd>
                    </div>
                    <div>
                        <dt className="text-xs font-medium text-ink-muted">{t('fields.showing')}</dt>
                        <dd>
                            <span
                                className={cn(
                                    'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                                    link.showing ? 'bg-status-good-wash text-status-good' : 'bg-status-neutral-wash text-ink-muted',
                                )}
                            >
                                {link.showing ? t('showing.yes') : t('showing.no')}
                            </span>
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs font-medium text-ink-muted">{t('fields.source')}</dt>
                        <dd className="text-ink">{t(`source.${link.source}`)}</dd>
                    </div>
                    <div>
                        <dt className="text-xs font-medium text-ink-muted">{t('fields.design')}</dt>
                        <dd className="text-ink">{tVariants(link.variant)}</dd>
                    </div>
                    <div>
                        <dt className="text-xs font-medium text-ink-muted">{t('fields.accepted')}</dt>
                        <dd className={link.acceptedAt ? 'text-ink' : 'text-status-warn'}>
                            {link.acceptedAt
                                ? formatDate(locale, link.acceptedAt, { day: 'numeric', month: 'short', year: 'numeric' })
                                : t('notAccepted')}
                        </dd>
                    </div>
                </dl>
            ) : (
                <p className="text-sm text-ink-muted">{t('none')}</p>
            )}

            {/* Link or replace */}
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <label className="min-w-0 flex-1">
                    <span className="sr-only">{t('choosePartner')}</span>
                    <select
                        value={controls.collaboratorId}
                        onChange={controls.handleCollaboratorChange}
                        disabled={controls.optionsLoading || controls.options.length === 0}
                        className={adminInputClass()}
                    >
                        <option value="">{controls.options.length === 0 && !controls.optionsLoading ? t('noPartners') : t('choosePartner')}</option>
                        {controls.options.map((option) => (
                            <option key={option.id} value={option.id}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>
                <button
                    type="button"
                    onClick={controls.handleLink}
                    disabled={!controls.collaboratorId || controls.isLinking}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-ink/90 disabled:opacity-50"
                >
                    {controls.isLinking && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {link ? t('replace') : t('link')}
                </button>
                {link && (
                    <button
                        type="button"
                        onClick={controls.openRemove}
                        className="min-h-10 rounded-md border border-border px-4 text-sm font-semibold text-status-danger transition-colors hover:bg-status-danger/5"
                    >
                        {t('remove')}
                    </button>
                )}
            </div>
            {controls.error && <p className="text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(controls.error)}`)}</p>}

            {/* Remove */}
            <ConfirmActionModal
                open={controls.confirmingRemove}
                title={t('removeTitle')}
                body={t('removeBody')}
                confirmLabel={t('remove')}
                cancelLabel={tAdmin('cancel')}
                onCloseAction={controls.closeRemove}
                onConfirmAction={controls.confirmRemove}
                isConfirming={controls.isRemoving}
                tone="danger"
            />
        </div>
    );
}
