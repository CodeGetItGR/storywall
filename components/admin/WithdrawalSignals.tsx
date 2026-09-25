'use client';

import { AlertTriangle, Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { formatInlineDates, sortWithdrawalSignals } from '@/lib/adminWithdrawals';
import type { WithdrawalFraudSignalDto } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function WithdrawalSignals({ signals }: { signals: WithdrawalFraudSignalDto[] }) {
    const t = useTranslations('AdminPage');
    const locale = useLocale();
    // With no signal fired (or none evaluated, on a storage pack) the only reason to hold is manual mode.
    const heldManually = !signals.some((signal) => signal.fired);

    return (
        <section className="min-w-0">
            {/* Heading */}
            <h4 className="text-[11px] font-semibold tracking-wide text-ink-faint uppercase">{t('withdrawals.signalsTitle')}</h4>
            {heldManually && <p className="mt-1 text-sm leading-6 text-ink">{t('withdrawals.heldManually')}</p>}

            {/* Signals */}
            {signals.length > 0 && (
                <ul className="mt-2 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                    {sortWithdrawalSignals(signals).map((signal) => (
                        <li key={signal.code} className="flex min-w-0 items-start gap-2 text-sm leading-5">
                            {signal.fired ? (
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warn" aria-hidden />
                            ) : (
                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
                            )}
                            <p className={cn('min-w-0 flex-1 first-letter:uppercase', signal.fired ? 'font-semibold text-ink' : 'text-ink-muted')}>
                                {signal.observed ? formatInlineDates(locale, signal.observed) : '—'}
                            </p>
                            {signal.fired && (
                                <span className="shrink-0 rounded-full bg-status-warn-wash px-2 py-0.5 text-[11px] font-bold text-status-warn">
                                    {t('withdrawals.signalFired')}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
