'use client';

import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { type CloseKind, NOTE_MAX_LENGTH, OPERATIONAL_CLOSE_REASONS, type RestrictionDraft } from '@/lib/adminEvents';
import { GUIDELINES_RULES, isExplanationValid, STATEMENT_EXPLANATION_MAX, STATEMENT_GROUNDS } from '@/lib/guidelinesRules';

// The statement emailed to every host: a ground and a rule for a breach, or an operational
// reason for a close that isn't one, then the explanation in the admin's words. The note stays internal.
export function EventStatementFields({
    kind,
    draft,
    explanationLength,
    onGroundChangeAction,
    onRuleChangeAction,
    onOperationalReasonChangeAction,
    onExplanationChangeAction,
    onNoteChangeAction,
}: {
    kind: CloseKind;
    draft: RestrictionDraft;
    explanationLength: number;
    onGroundChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
    onRuleChangeAction: (event: ChangeEvent<HTMLSelectElement>) => void;
    onOperationalReasonChangeAction: (event: ChangeEvent<HTMLSelectElement>) => void;
    onExplanationChangeAction: (event: ChangeEvent<HTMLTextAreaElement>) => void;
    onNoteChangeAction: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}) {
    const t = useTranslations('AdminPage.events.statement');
    const tEvents = useTranslations('AdminPage.events');
    const tStatement = useTranslations('ModerationStatement');
    const explanationInvalid = explanationLength > 0 && !isExplanationValid(draft.explanation);

    return (
        <div className="space-y-4">
            {/* Ground and rule */}
            {kind === 'POLICY' && (
                <>
                    <fieldset>
                        <legend className="mb-1.5 text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('ground')}</legend>
                        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                            {STATEMENT_GROUNDS.map((ground) => (
                                <label key={ground} className="flex items-center gap-2 text-sm text-ink">
                                    <input type="radio" name="event-ground" value={ground} checked={draft.ground === ground} onChange={onGroundChangeAction} />
                                    {tStatement(`grounds.${ground}`)}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <AdminField label={t('rule')} required>
                        <select value={draft.rule ?? ''} onChange={onRuleChangeAction} className={adminInputClass()}>
                            <option value="" disabled>
                                {t('rulePlaceholder')}
                            </option>
                            {GUIDELINES_RULES.map((rule) => (
                                <option key={rule} value={rule}>
                                    {tStatement(`rules.${rule}`)}
                                </option>
                            ))}
                        </select>
                    </AdminField>
                </>
            )}

            {/* Operational reason */}
            {kind === 'OPERATIONAL' && (
                <AdminField label={t('operationalReason')} required>
                    <select value={draft.operationalReason ?? ''} onChange={onOperationalReasonChangeAction} className={adminInputClass()}>
                        <option value="" disabled>
                            {t('operationalReasonPlaceholder')}
                        </option>
                        {OPERATIONAL_CLOSE_REASONS.map((reason) => (
                            <option key={reason} value={reason}>
                                {tEvents(`operationalReason.${reason}`)}
                            </option>
                        ))}
                    </select>
                </AdminField>
            )}

            {/* Explanation */}
            <AdminField
                label={t('explanation')}
                required
                hint={
                    kind === 'POLICY' && draft.ground === 'ILLEGAL_CONTENT'
                        ? `${t('explanationCount', { count: explanationLength })} · ${t('illegalHint')}`
                        : t('explanationCount', { count: explanationLength })
                }
            >
                <textarea
                    value={draft.explanation}
                    onChange={onExplanationChangeAction}
                    maxLength={STATEMENT_EXPLANATION_MAX}
                    rows={4}
                    aria-invalid={explanationInvalid}
                    className={adminInputClass(explanationInvalid ? 'resize-y border-status-danger' : 'resize-y')}
                />
            </AdminField>

            {/* Internal note */}
            <AdminField label={t('note')} optional hint={t('noteHint')}>
                <textarea value={draft.note} onChange={onNoteChangeAction} maxLength={NOTE_MAX_LENGTH} rows={2} className={adminInputClass('resize-y')} />
            </AdminField>
        </div>
    );
}
