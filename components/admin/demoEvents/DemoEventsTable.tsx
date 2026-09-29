'use client';

import { ChevronRight } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import { DemoEventStatusPill } from '@/components/admin/demoEvents/DemoEventStatusPill';
import type { DemoEventRow } from '@/hooks/useDemoEventsPanel';
import { useLocalizedText } from '@/hooks/useLocalizedText';
import { formatDemoEventsHash } from '@/lib/adminDemoEventsRouting';

export function DemoEventsTable({ rows }: { rows: DemoEventRow[] }) {
    const t = useTranslations('AdminPage.demoEvents');
    const format = useFormatter();
    const localizedText = useLocalizedText();

    return (
        <section className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                    <tr className="border-b border-border text-left text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-4 py-2.5 font-bold">{t('columns.eventType')}</th>
                        <th className="px-3 py-2.5 font-bold">{t('columns.demoEvent')}</th>
                        <th className="px-3 py-2.5 font-bold">{t('columns.status')}</th>
                        <th className="px-3 py-2.5 font-bold">{t('columns.designatedAt')}</th>
                        <th className="px-3 py-2.5" />
                    </tr>
                </thead>
                <tbody>
                    {rows.map(({ eventType, demo }) => (
                        <tr key={eventType.eventTypeKey} className="relative border-b border-border last:border-b-0 hover:bg-canvas/60">
                            <td className="px-4 py-2.5">
                                {/* The link covers the whole row */}
                                <a href={formatDemoEventsHash(eventType.eventTypeKey)} className="after:absolute after:inset-0">
                                    <span className="block font-semibold text-ink">{localizedText(eventType.name)}</span>
                                    <span className="block font-mono text-[11px] text-ink-faint">{eventType.eventTypeKey}</span>
                                </a>
                            </td>
                            <td className="max-w-72 px-3 py-2.5">
                                {demo ? (
                                    <>
                                        <span className="block truncate text-ink">{demo.eventTitle}</span>
                                        <span className="block truncate font-mono text-[11px] text-ink-faint">{demo.eventId}</span>
                                    </>
                                ) : (
                                    <span className="text-ink-faint">—</span>
                                )}
                            </td>
                            <td className="px-3 py-2.5">
                                <DemoEventStatusPill hasDemo={Boolean(demo)} />
                            </td>
                            <td className="px-3 py-2.5 font-mono text-[12px] text-ink-muted">
                                {demo ? format.dateTime(new Date(demo.designatedAt), { dateStyle: 'medium' }) : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-ink-faint">
                                <ChevronRight className="ml-auto h-4 w-4" aria-hidden="true" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}
