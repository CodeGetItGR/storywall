'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

const STEPS = ['pick', 'send', 'update'] as const;

// A first-visit card with the three steps. Dismissed once per browser.
export function OutreachGuide({ onDismissAction }: { onDismissAction: () => void }) {
    const t = useTranslations('AdminPage.outreach.guide');

    return (
        <section aria-labelledby="outreach-guide-title" className="relative rounded-xl border border-border bg-card p-4 sm:p-5">
            {/* Title */}
            <div className="flex items-start justify-between gap-3">
                <h2 id="outreach-guide-title" className="text-base font-bold text-ink">
                    {t('title')}
                </h2>
                <button
                    type="button"
                    onClick={onDismissAction}
                    aria-label={t('dismiss')}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
                >
                    <X aria-hidden="true" className="h-4 w-4" />
                </button>
            </div>

            {/* Steps */}
            <ol className="mt-3 grid gap-3 sm:grid-cols-3">
                {STEPS.map((step, index) => (
                    <li key={step} className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary-dark">
                            {index + 1}
                        </span>
                        <span className="text-sm leading-6 text-ink-muted">
                            <span className="block font-semibold text-ink">{t(`${step}.title`)}</span>
                            {t(`${step}.body`)}
                        </span>
                    </li>
                ))}
            </ol>

            {/* Dismiss */}
            <div className="mt-4 flex justify-end">
                <button type="button" onClick={onDismissAction} className="min-h-9 rounded-md bg-ink px-4 text-sm font-semibold text-white">
                    {t('gotIt')}
                </button>
            </div>
        </section>
    );
}
