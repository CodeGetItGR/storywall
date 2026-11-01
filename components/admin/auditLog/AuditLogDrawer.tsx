'use client';

import { useLocale, useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { AuditActionPill } from '@/components/admin/auditLog/AuditActionPill';
import { useAuditSummaryText } from '@/hooks/useAuditSummaryText';
import { auditAdminLabel, auditDetailEntries, auditReason } from '@/lib/adminAuditLog';
import { formatEventsHash } from '@/lib/adminEvents';
import type { AdminAuditLogResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

const DATE_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'medium' };
const HEADING = 'text-xs font-bold tracking-wide text-ink-faint uppercase';

// One admin action: what changed in words, the reason, who and when, and every detail the server kept.
export function AuditLogDrawer({ entry, onCloseAction }: { entry: AdminAuditLogResponseDto; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage.auditLog');
    const locale = useLocale();
    const summary = useAuditSummaryText()(entry);
    const reason = auditReason(entry.details);
    const details = auditDetailEntries(entry.details);

    return (
        <AdminDrawer open onClose={onCloseAction} closeLabel={t('close')} title={<AuditActionPill action={entry.action} />} size="wide">
            <div className="space-y-7">
                {/* Change */}
                {summary || reason ? (
                    <section className="space-y-2">
                        {summary ? <p className="text-sm leading-6 font-semibold text-ink">{summary}</p> : null}
                        {reason ? <p className="text-sm leading-6 text-ink-muted">{t('reason', { reason })}</p> : null}
                    </section>
                ) : null}

                {/* Who and when */}
                <section className="space-y-3">
                    <h3 className={HEADING}>{t('drawer.record')}</h3>
                    <dl className="grid grid-cols-1 gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-xs text-ink-faint">{t('columns.when')}</dt>
                            <dd className="mt-1 font-mono text-xs text-ink-muted">{formatDate(locale, entry.createdAt, DATE_FORMAT)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-ink-faint">{t('columns.admin')}</dt>
                            <dd className="mt-1 text-xs font-semibold break-all text-ink">
                                {auditAdminLabel(entry)}
                                {entry.adminEmail && entry.adminName ? <span className="block font-normal text-ink-muted">{entry.adminEmail}</span> : null}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-ink-faint">{t('drawer.target')}</dt>
                            <dd className="mt-1 font-mono text-xs text-ink-muted">{entry.targetType}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-ink-faint">{t('drawer.ip')}</dt>
                            <dd className="mt-1 font-mono text-xs text-ink-muted">{entry.ipAddress ?? '—'}</dd>
                        </div>
                    </dl>
                    {entry.targetId ? <AdminIdentifier label={t('drawer.targetId')} value={entry.targetId} /> : null}
                    {entry.eventId ? (
                        <div className="flex flex-wrap items-center gap-3">
                            <AdminIdentifier label={t('columns.event')} value={entry.eventId} />
                            <a href={formatEventsHash(entry.eventId)} onClick={onCloseAction} className="text-xs font-semibold text-ink underline-offset-2 hover:underline">
                                {t('drawer.openEvent')}
                            </a>
                        </div>
                    ) : null}
                </section>

                {/* Details */}
                {details.length > 0 ? (
                    <section className="space-y-3">
                        <h3 className={HEADING}>{t('drawer.details')}</h3>
                        <dl className="divide-y divide-border rounded-lg border border-border">
                            {details.map((detail) => (
                                <div key={detail.key} className="grid gap-1 px-3 py-2.5 sm:grid-cols-[10rem_1fr] sm:gap-4">
                                    <dt className="font-mono text-xs text-ink-faint">{detail.key}</dt>
                                    <dd className="font-mono text-xs break-all text-ink">{detail.value}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                ) : null}
            </div>
        </AdminDrawer>
    );
}
