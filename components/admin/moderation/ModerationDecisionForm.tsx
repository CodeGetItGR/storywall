'use client';

import { useTranslations } from 'next-intl';
import { type ChangeEvent, useEffect, useId, useRef, useState } from 'react';

import {
    actionLabelKey,
    type DecisionDraft,
    type DecisionRequest,
    decisionSummary,
    emptyDecision,
    hasAction,
    isStatementComplete,
    statementRecipients,
    toDecisionRequest,
} from '@/lib/adminModeration';
import type { AllowedActionsDto, GuidelinesRule, ModerationOutcome, StatementGround } from '@/lib/api/types';
import {
    GUIDELINES_RULES,
    isExplanationValid,
    STATEMENT_EXPLANATION_MAX,
    STATEMENT_EXPLANATION_MIN,
    STATEMENT_GROUNDS,
    trimLikeBackend,
} from '@/lib/guidelinesRules';

type ActionKey = 'removeContent' | 'removeMember' | 'banFromEvent' | 'suspendAccount' | 'suspendEvent';
const ACTIONS: readonly ActionKey[] = ['removeContent', 'removeMember', 'banFromEvent', 'suspendAccount', 'suspendEvent'];

export const DECISION_NOTE_MAX_LENGTH = 2000;

const FIELD = 'w-full rounded-md border border-border bg-canvas p-2 text-sm';

// The admin's decision on a case (guide §2.4, §4; storywall-suspension guide §3). Only
// server-allowed actions are offered, ban is offered only alongside member removal, any action
// needs a statement of reasons (it is emailed to the people affected), and nothing is sent before
// a confirm step that lists exactly what will happen.
export function ModerationDecisionForm({
    allowed,
    contentPresent,
    activeReportCount,
    isSubmitting,
    error,
    onSubmitAction,
    isMemberCase = false,
    expectedContentText = null,
}: {
    allowed: AllowedActionsDto;
    contentPresent: boolean;
    // Reports still OPEN or UNDER_REVIEW: the ones this decision closes.
    activeReportCount: number;
    isSubmitting: boolean;
    error: string | null;
    onSubmitAction: (request: DecisionRequest) => void;
    // A MEMBER case: removing the content removes the custom role, and the text seen is sent along.
    isMemberCase?: boolean;
    expectedContentText?: string | null;
}) {
    const t = useTranslations('AdminPage.moderation');
    const tStatement = useTranslations('ModerationStatement');
    const [draft, setDraft] = useState<DecisionDraft>(emptyDecision);
    const [confirming, setConfirming] = useState(false);
    const [seenError, setSeenError] = useState(error);
    const summaryRef = useRef<HTMLDivElement>(null);
    const reviewRef = useRef<HTMLButtonElement>(null);
    const wasConfirming = useRef(false);
    const groundLabelId = useId();
    const ruleId = useId();
    const explanationId = useId();
    const explanationCountId = useId();
    const illegalHintId = useId();

    // A refusal invalidates what was confirmed (the case is refetched, actions may narrow):
    // leave the confirm step so the admin reviews the decision again.
    if (error !== seenError) {
        setSeenError(error);
        if (error) setConfirming(false);
    }

    // Focus follows the step: into the summary on Review, back to Review on leaving it.
    useEffect(() => {
        if (confirming) summaryRef.current?.focus();
        else if (wasConfirming.current) reviewRef.current?.focus();
        wasConfirming.current = confirming;
    }, [confirming]);

    const acting = draft.outcome === 'ACTION_TAKEN';
    const visibleActions = ACTIONS.filter((key) => allowed[key] && (key !== 'banFromEvent' || draft.removeMember));
    // A refetch after a refusal can withdraw an action that is still ticked: it is never sent.
    const request = draft.outcome
        ? toDecisionRequest({
              ...draft,
              outcome: draft.outcome,
              removeContent: draft.removeContent && allowed.removeContent,
              removeMember: draft.removeMember && allowed.removeMember,
              banFromEvent: draft.banFromEvent && allowed.banFromEvent,
              suspendAccount: draft.suspendAccount && allowed.suspendAccount,
              suspendEvent: draft.suspendEvent && allowed.suspendEvent,
          }, expectedContentText)
        : null;
    const acted = request !== null && hasAction(request);
    // ACTION_TAKEN with no action is 3039 while the item exists; once it is gone it closes the case
    // as resolved. Any action needs a complete statement (3039 otherwise).
    const canReview = request !== null && (!acting || (acted ? isStatementComplete(request) : !contentPresent));
    const explanationLength = trimLikeBackend(draft.explanation).length;
    const explanationInvalid = explanationLength > 0 && !isExplanationValid(draft.explanation);

    function selectOutcome(event: ChangeEvent<HTMLInputElement>) {
        const outcome = event.currentTarget.value as ModerationOutcome;
        setDraft((d) => ({ ...emptyDecision, note: d.note, outcome }));
        setConfirming(false);
    }
    function toggleAction(event: ChangeEvent<HTMLInputElement>) {
        const key = event.currentTarget.name as ActionKey;
        const checked = event.currentTarget.checked;
        setDraft((d) => ({ ...d, [key]: checked, ...(key === 'removeMember' && !checked ? { banFromEvent: false } : {}) }));
        setConfirming(false);
    }
    function selectGround(event: ChangeEvent<HTMLInputElement>) {
        const ground = event.currentTarget.value as StatementGround;
        setDraft((d) => ({ ...d, ground }));
    }
    function changeRule(event: ChangeEvent<HTMLSelectElement>) {
        const value = event.currentTarget.value;
        setDraft((d) => ({ ...d, rule: value === '' ? null : (value as GuidelinesRule) }));
    }
    function changeExplanation(event: ChangeEvent<HTMLTextAreaElement>) {
        const explanation = event.currentTarget.value.slice(0, STATEMENT_EXPLANATION_MAX);
        setDraft((d) => ({ ...d, explanation }));
    }
    function changeNote(event: ChangeEvent<HTMLTextAreaElement>) {
        const note = event.currentTarget.value.slice(0, DECISION_NOTE_MAX_LENGTH);
        setDraft((d) => ({ ...d, note }));
    }
    function review() {
        setConfirming(true);
    }
    function back() {
        setConfirming(false);
    }
    function confirm() {
        if (request && canReview && !isSubmitting) onSubmitAction(request);
    }

    return (
        <section aria-labelledby="moderation-decision-heading" className="space-y-4 border-t border-border pt-5">
            <h3 id="moderation-decision-heading" className="text-xs font-bold tracking-wide text-ink-faint uppercase">
                {t('form.title')}
            </h3>

            <fieldset className="space-y-2" disabled={confirming || isSubmitting}>
                <div role="radiogroup" aria-labelledby="moderation-decision-heading" className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-ink">
                        <input type="radio" name="outcome" value="DISMISSED" checked={draft.outcome === 'DISMISSED'} onChange={selectOutcome} />
                        {t('form.dismiss')}
                    </label>
                    <label className="flex items-center gap-2 text-sm text-ink">
                        <input type="radio" name="outcome" value="ACTION_TAKEN" checked={acting} onChange={selectOutcome} />
                        {t('form.takeAction')}
                    </label>
                </div>

                {acting ? (
                    <div className="space-y-2 pl-6">
                        {visibleActions.map((key) => (
                            <label key={key} className="flex items-center gap-2 text-sm text-ink">
                                <input type="checkbox" name={key} checked={draft[key]} onChange={toggleAction} />
                                {t(`form.${actionLabelKey(key, isMemberCase)}`)}
                            </label>
                        ))}
                        {!contentPresent ? <p className="text-xs text-ink-muted">{t('form.alreadyRemovedHint')}</p> : null}
                    </div>
                ) : null}

                {/* Statement of reasons: emailed to everyone the decision acts against */}
                {acted ? (
                    <div className="space-y-3 rounded-lg border border-border p-3">
                        <div className="space-y-1">
                            <p className="text-sm font-semibold text-ink">{t('statement.title')}</p>
                            <p className="text-xs text-ink-muted">{t('statement.hint')}</p>
                        </div>

                        <div className="space-y-1">
                            <p id={groundLabelId} className="text-sm text-ink">
                                {t('statement.ground')}
                            </p>
                            <div role="radiogroup" aria-labelledby={groundLabelId} className="space-y-1">
                                {STATEMENT_GROUNDS.map((ground) => (
                                    <label key={ground} className="flex items-center gap-2 text-sm text-ink">
                                        <input type="radio" name="ground" value={ground} checked={draft.ground === ground} onChange={selectGround} />
                                        {tStatement(`grounds.${ground}`)}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor={ruleId} className="block text-sm text-ink">
                                {t('statement.rule')}
                            </label>
                            <select id={ruleId} value={draft.rule ?? ''} onChange={changeRule} className={FIELD}>
                                <option value="" disabled>
                                    {t('statement.rulePlaceholder')}
                                </option>
                                {GUIDELINES_RULES.map((rule) => (
                                    <option key={rule} value={rule}>
                                        {tStatement(`rules.${rule}`)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor={explanationId} className="block text-sm text-ink">
                                {t('statement.explanation')}
                            </label>
                            <textarea
                                id={explanationId}
                                value={draft.explanation}
                                onChange={changeExplanation}
                                maxLength={STATEMENT_EXPLANATION_MAX}
                                rows={4}
                                aria-invalid={explanationInvalid}
                                aria-describedby={draft.ground === 'ILLEGAL_CONTENT' ? `${explanationCountId} ${illegalHintId}` : explanationCountId}
                                className={FIELD}
                            />
                            <p id={explanationCountId} className="text-xs text-ink-muted">
                                {t('statement.explanationCount', {
                                    count: explanationLength,
                                    min: STATEMENT_EXPLANATION_MIN,
                                    max: STATEMENT_EXPLANATION_MAX,
                                })}
                            </p>
                            {/* DSA Art. 17(3)(d): a statement on an illegal-content ground must name the legal provision */}
                            {draft.ground === 'ILLEGAL_CONTENT' ? (
                                <p id={illegalHintId} className="text-xs text-ink-muted">
                                    {t('statement.illegalHint')}
                                </p>
                            ) : null}
                        </div>
                    </div>
                ) : null}

                <label className="block space-y-1 text-sm text-ink">
                    <span>{t('form.note')}</span>
                    <textarea value={draft.note} onChange={changeNote} maxLength={DECISION_NOTE_MAX_LENGTH} rows={3} className={FIELD} />
                </label>
            </fieldset>

            {confirming && request ? (
                <div
                    ref={summaryRef}
                    tabIndex={-1}
                    role="group"
                    aria-label={t('summary.title')}
                    className="space-y-3 rounded-lg border border-status-danger-wash p-4 outline-none"
                >
                    <p className="text-sm font-semibold text-ink">{t('summary.title')}</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
                        {decisionSummary(request, contentPresent).map((line) => (
                            <li key={line}>{t(`summary.${actionLabelKey(line, isMemberCase)}`)}</li>
                        ))}
                        {statementRecipients(request).map((recipient) => (
                            <li key={recipient}>{t(recipient === 'author' ? 'summary.emailsAuthor' : 'summary.emailsHosts')}</li>
                        ))}
                        <li>{t('summary.reports', { count: activeReportCount, outcome: request.outcome })}</li>
                    </ul>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={back}
                            disabled={isSubmitting}
                            className="rounded-md px-3 py-1.5 text-sm font-semibold text-ink-muted hover:bg-canvas disabled:opacity-50"
                        >
                            {t('form.back')}
                        </button>
                        <button
                            type="button"
                            onClick={confirm}
                            disabled={isSubmitting || !canReview}
                            className="rounded-md bg-status-danger px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {t('form.confirm')}
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    ref={reviewRef}
                    type="button"
                    onClick={review}
                    disabled={!canReview}
                    className="rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-canvas disabled:opacity-50"
                >
                    {t('form.review')}
                </button>
            )}

            {error ? (
                <p role="alert" className="text-sm text-status-danger">
                    {error}
                </p>
            ) : null}
        </section>
    );
}
