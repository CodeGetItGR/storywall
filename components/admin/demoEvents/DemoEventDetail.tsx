'use client';

import { ExternalLink, Loader2, Plus } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { AdminIdentifier } from '@/components/admin/AdminIdentifier';
import { DemoEventStatusPill } from '@/components/admin/demoEvents/DemoEventStatusPill';
import { EventProvisionDrawer } from '@/components/admin/EventProvisionDrawer';
import { BackButton } from '@/components/ui/BackButton';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { useDemoEventDetail } from '@/hooks/useDemoEventDetail';
import type { DemoEventRow } from '@/hooks/useDemoEventsPanel';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { DEMO_EVENTS_HASH_ROOT } from '@/lib/adminDemoEventsRouting';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import { demoEventTypeSlugFromKey } from '@/lib/demo/demoEventTypes';
import { routes } from '@/lib/routes';

export function DemoEventDetail({ row, onBackAction }: { row: DemoEventRow; onBackAction: (event: MouseEvent<HTMLAnchorElement>) => void }) {
    const t = useTranslations('AdminPage.demoEvents');
    const tAdmin = useTranslations('AdminPage');
    const format = useFormatter();
    const localizedText = useLocalizedText();
    const { eventType, demo } = row;
    const detail = useDemoEventDetail(eventType.eventTypeKey);
    const typeName = localizedText(eventType.name);

    return (
        <div className="max-w-3xl space-y-8">
            {/* Header */}
            <header className="space-y-3">
                <BackButton href={DEMO_EVENTS_HASH_ROOT} label={t('title')} onClick={onBackAction} />
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{typeName}</h1>
                    <DemoEventStatusPill hasDemo={Boolean(demo)} />
                </div>
                <p className="font-mono text-xs text-ink-faint">{eventType.eventTypeKey}</p>
            </header>

            {/* Current demo */}
            {demo && (
                <section className="space-y-3">
                    <h2 className="text-sm font-bold text-ink">{t('currentTitle')}</h2>
                    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                        <p className="text-base font-semibold text-ink">{demo.eventTitle}</p>
                        <AdminIdentifier label={tAdmin('identifiers.eventId')} value={demo.eventId} />
                        <p className="text-sm text-ink-muted">
                            {t('designatedOn', { date: format.dateTime(new Date(demo.designatedAt), { dateStyle: 'medium', timeStyle: 'short' }) })}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <a
                                href={routes.events.feed(demo.eventId)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-semibold text-ink-muted hover:bg-canvas"
                            >
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                {t('editContent')}
                            </a>
                            <a
                                href={`/demo/${demoEventTypeSlugFromKey(eventType.eventTypeKey)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-semibold text-ink-muted hover:bg-canvas"
                            >
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                {t('openDemo')}
                            </a>
                        </div>
                    </div>
                </section>
            )}

            {/* Create demo event */}
            <section className="space-y-3">
                <h2 className="text-sm font-bold text-ink">{t('createTitle')}</h2>
                <p className="text-sm text-ink-muted">{t('createBody')}</p>
                <button
                    type="button"
                    onClick={detail.createDrawer.toggle}
                    disabled={!detail.host}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {t('create')}
                </button>
            </section>

            {/* Use an existing event */}
            <section className="space-y-3">
                <h2 className="text-sm font-bold text-ink">{demo ? t('replaceTitle') : t('setTitle')}</h2>
                <form onSubmit={detail.handleSubmit} className="space-y-3">
                    <AdminField label={tAdmin('identifiers.eventId')} required hint={t('eventIdHint')}>
                        <input name="eventId" required autoComplete="off" spellCheck={false} className={adminInputClass('font-mono')} />
                    </AdminField>
                    {detail.error && <p className="text-sm text-status-danger">{tAdmin(`errors.${adminErrorMessageKey(detail.error)}`)}</p>}
                    <button
                        type="submit"
                        disabled={detail.isSaving}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-ink disabled:opacity-50"
                    >
                        {detail.isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        {demo ? t('replace') : t('set')}
                    </button>
                </form>
            </section>

            {/* Danger */}
            {demo && (
                <section className="space-y-3 border-t border-border pt-6">
                    <h2 className="text-sm font-bold text-ink">{t('removeTitle')}</h2>
                    <p className="text-sm text-ink-muted">{t('removeBody')}</p>
                    <button
                        type="button"
                        onClick={detail.removeConfirm.toggle}
                        className="inline-flex min-h-10 items-center rounded-lg border border-status-danger/40 px-4 text-sm font-semibold text-status-danger hover:bg-status-danger/5"
                    >
                        {t('remove')}
                    </button>
                </section>
            )}

            {detail.createDrawer.open && detail.host && (
                <EventProvisionDrawer host={detail.host} options={detail.provisionOptions} showOpenEvent onCloseAction={detail.createDrawer.toggle} />
            )}

            <ConfirmActionModal
                open={detail.removeConfirm.open}
                title={t('removeConfirmTitle', { eventType: typeName })}
                body={t('removeBody')}
                confirmLabel={t('remove')}
                cancelLabel={tAdmin('cancel')}
                isConfirming={detail.isRemoving}
                onCloseAction={detail.removeConfirm.toggle}
                onConfirmAction={detail.confirmRemove}
            />
        </div>
    );
}
