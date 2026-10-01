'use client';

import { useLocale, useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { ErrorSourcePill } from '@/components/admin/betaFeedback/ErrorSourcePill';
import type { ErrorEventResponseDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

const DATE_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'medium' };
// Kept out of the JSX so formatting never wraps the <pre> and adds whitespace to the trace.
const STACK_CLASS = 'max-h-96 overflow-auto rounded-lg bg-canvas p-3 font-mono text-[11px] leading-5 text-ink-muted';

export function ErrorEventDrawer({ event, onCloseAction }: { event: ErrorEventResponseDto; onCloseAction: () => void }) {
    const t = useTranslations('AdminPage.errorEvents');
    const locale = useLocale();
    const request =
        event.lastRequestMethod || event.lastRequestPath ? [event.lastRequestMethod, event.lastRequestPath].filter(Boolean).join(' ') : null;

    const facts: Array<{ label: string; value: string | null; wide?: boolean }> = [
        { label: t('facts.firstSeen'), value: formatDate(locale, event.firstSeenAt, DATE_FORMAT) },
        { label: t('facts.lastSeen'), value: formatDate(locale, event.lastSeenAt, DATE_FORMAT) },
        { label: t('facts.count'), value: String(event.occurrenceCount) },
        { label: t('facts.appVersion'), value: event.lastAppVersion },
        { label: t('facts.request'), value: request, wide: true },
        { label: t('facts.page'), value: event.lastPageUrl, wide: true },
    ];

    return (
        <AdminDrawer
            open
            onClose={onCloseAction}
            closeLabel={t('close')}
            title={<span className="font-mono text-base break-all">{event.errorType}</span>}
            subtitle={<ErrorSourcePill source={event.source} />}
            size="wide"
        >
            <div className="space-y-7">
                {/* Message */}
                {event.message ? (
                    <section className="space-y-2">
                        <h3 className="text-xs font-bold tracking-wide text-ink-faint uppercase">{t('message')}</h3>
                        <p className="text-sm leading-6 break-words whitespace-pre-wrap text-ink">{event.message}</p>
                    </section>
                ) : null}

                {/* Occurrences */}
                <section className="space-y-3">
                    <h3 className="text-xs font-bold tracking-wide text-ink-faint uppercase">{t('details')}</h3>
                    <dl className="grid grid-cols-1 gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
                        {facts.map((fact) => (
                            <div key={fact.label} className={fact.wide ? 'sm:col-span-2' : undefined}>
                                <dt className="text-xs text-ink-faint">{fact.label}</dt>
                                <dd className="mt-1 font-mono text-xs break-all text-ink-muted">{fact.value ?? '—'}</dd>
                            </div>
                        ))}
                    </dl>
                </section>

                {/* Stack trace */}
                {event.stackTrace ? (
                    <section className="space-y-2">
                        <h3 className="text-xs font-bold tracking-wide text-ink-faint uppercase">{t('stackTrace')}</h3>
                        <pre className={STACK_CLASS}>{event.stackTrace}</pre>
                    </section>
                ) : null}

                {/* Identifiers */}
                <section className="grid grid-cols-1 gap-4 border-t border-border pt-5 sm:grid-cols-2">
                    <AdminIdentifier label={t('ref')} value={event.ref} />
                    {event.lastUserId ? <AdminIdentifier label={t('lastUserId')} value={event.lastUserId} /> : null}
                </section>
            </div>
        </AdminDrawer>
    );
}
