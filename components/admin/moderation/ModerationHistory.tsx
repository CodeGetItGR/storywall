'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { MouseEvent } from 'react';

import type { EventBanDto, ModerationDecisionDto } from '@/lib/api/types';
import { formatDate } from '@/lib/datetime';

type DecisionAction = 'eventSuspended' | 'contentRemoved' | 'memberRemoved' | 'banned' | 'accountSuspended';
const DECISION_ACTIONS: readonly DecisionAction[] = ['eventSuspended', 'contentRemoved', 'memberRemoved', 'banned', 'accountSuspended'];

const HEADING = 'text-xs font-bold tracking-wide text-ink-faint uppercase';
const PILL = 'inline-flex rounded-full bg-status-neutral-wash px-2.5 py-0.5 text-[11px] font-bold text-status-neutral';

// What was already decided on this item, against its author elsewhere, and the bans this item's
// decisions placed (guide §2.2). Each section is hidden when empty.
export function ModerationHistory({
    decisions,
    priorDecisions,
    bans,
    onLiftBanAction,
    liftingBanId,
}: {
    decisions: ModerationDecisionDto[];
    priorDecisions: ModerationDecisionDto[];
    bans: EventBanDto[];
    onLiftBanAction: (banId: string) => void;
    liftingBanId: string | null;
}) {
    const t = useTranslations('AdminPage.moderation');
    const tStatement = useTranslations('ModerationStatement');
    const locale = useLocale();

    function date(value: string) {
        return formatDate(locale, value, { dateStyle: 'medium', timeStyle: 'short' });
    }
    function liftBan(event: MouseEvent<HTMLButtonElement>) {
        const banId = event.currentTarget.dataset.banId;
        if (banId) onLiftBanAction(banId);
    }

    return (
        <>
            {decisions.length > 0 ? (
                <section className="space-y-2">
                    <h3 className={HEADING}>{t('history.decisions')}</h3>
                    <ul className="space-y-3">
                        {decisions.map((d) => {
                            const actions = DECISION_ACTIONS.filter((key) => d[key]);
                            return (
                                <li key={d.id} className="space-y-1 rounded-lg border border-border p-3 text-sm">
                                    <p className="flex flex-wrap items-center gap-2">
                                        <span className={PILL}>{t(`outcome.${d.outcome}`)}</span>
                                        <span className="text-xs text-ink-muted">{date(d.createdAt)}</span>
                                    </p>
                                    {d.outcome === 'ACTION_TAKEN' ? (
                                        <p className="text-ink">
                                            {actions.length > 0
                                                ? actions.map((key) => t(`history.actions.${key}`)).join(' · ')
                                                : t('history.actions.none')}
                                        </p>
                                    ) : null}
                                    {/* The statement of reasons the people affected were emailed */}
                                    {d.ground && d.rule ? (
                                        <p className="text-ink-muted">
                                            {tStatement(`grounds.${d.ground}`)} · {tStatement(`rules.${d.rule}`)}
                                        </p>
                                    ) : null}
                                    {d.explanation ? <p className="break-words whitespace-pre-wrap text-ink">{d.explanation}</p> : null}
                                    {d.note ? <p className="break-words whitespace-pre-wrap text-ink-muted">{d.note}</p> : null}
                                </li>
                            );
                        })}
                    </ul>
                </section>
            ) : null}

            {priorDecisions.length > 0 ? (
                <section className="space-y-2">
                    <h3 className={HEADING}>{t('history.prior')}</h3>
                    <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                        {priorDecisions.map((d) => (
                            <li key={d.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                                <span className="text-xs text-ink-muted">{date(d.createdAt)}</span>
                                <span className="text-ink">{t(`types.${d.targetType}`)}</span>
                                <span className={PILL}>{t(`outcome.${d.outcome}`)}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            {bans.length > 0 ? (
                <section className="space-y-2">
                    <h3 className={HEADING}>{t('history.bans')}</h3>
                    <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                        {bans.map((b) => (
                            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                                <span className="text-ink">{t('history.banned', { date: date(b.createdAt) })}</span>
                                {b.liftedAt ? (
                                    <span className="text-xs text-ink-muted">{t('banLifted', { date: date(b.liftedAt) })}</span>
                                ) : (
                                    <button
                                        type="button"
                                        data-ban-id={b.id}
                                        onClick={liftBan}
                                        disabled={liftingBanId !== null}
                                        className="rounded-md px-3 py-1.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50"
                                    >
                                        {t('liftBan')}
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}
        </>
    );
}
