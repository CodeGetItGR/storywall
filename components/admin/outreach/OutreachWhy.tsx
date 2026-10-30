'use client';

import { ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { linkLabel, safeHttpUrl } from '@/lib/adminOutreach';
import type { OutreachProspectDto } from '@/lib/api/types';

// Why the research picked them: their reputation, why they fit, and where that came from.
export function OutreachWhy({ prospect }: { prospect: OutreachProspectDto }) {
    const t = useTranslations('AdminPage.outreach.why');
    const sources = prospect.sources.filter((source) => safeHttpUrl(source));
    const isEmpty = !prospect.credibility && !prospect.fit && sources.length === 0;

    return (
        <section className="space-y-3">
            {/* Title */}
            <h3 className="text-sm font-bold text-ink">{t('title')}</h3>

            {isEmpty && <p className="text-sm text-ink-muted">{t('empty')}</p>}

            {/* Reputation */}
            {prospect.credibility && (
                <div>
                    <p className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">{t('credibility')}</p>
                    <p className="mt-0.5 text-sm leading-6 whitespace-pre-wrap text-ink">{prospect.credibility}</p>
                </div>
            )}

            {/* Fit */}
            {prospect.fit && (
                <div>
                    <p className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">{t('fit')}</p>
                    <p className="mt-0.5 text-sm leading-6 whitespace-pre-wrap text-ink">{prospect.fit}</p>
                </div>
            )}

            {/* Sources */}
            {sources.length > 0 && (
                <div>
                    <p className="text-[11px] font-bold tracking-wide text-ink-faint uppercase">{t('sources')}</p>
                    <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        {sources.map((source) => (
                            <li key={source}>
                                <a
                                    href={safeHttpUrl(source) ?? undefined}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm font-semibold text-ink underline-offset-2 hover:underline"
                                >
                                    {linkLabel(source)}
                                    <ExternalLink aria-hidden="true" className="h-3 w-3 text-ink-faint" />
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
