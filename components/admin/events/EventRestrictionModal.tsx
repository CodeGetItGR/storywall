'use client';

import { useTranslations } from 'next-intl';

import { EventCloseKindControl } from '@/components/admin/events/EventCloseKindControl';
import { EventStatementFields } from '@/components/admin/events/EventStatementFields';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { type RestrictionMode, useEventRestrictionForm } from '@/hooks/useEventRestrictionForm';
import { adminErrorMessageKey } from '@/lib/adminUtils';

// Suspending hides the event and can be lifted; closing ends it for good. Both email every host the statement.
export function EventRestrictionModal({
    open,
    eventId,
    mode,
    onCloseAction,
}: {
    open: boolean;
    eventId: string;
    mode: RestrictionMode;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage');
    const form = useEventRestrictionForm(eventId, mode, onCloseAction);

    return (
        <ConfirmActionModal
            open={open}
            size="md"
            onCloseAction={onCloseAction}
            title={t(`events.${mode}.title`)}
            body={
                <div className="space-y-5">
                    {/* What happens */}
                    <p>{t(`events.${mode}.body`)}</p>

                    {/* Kind of close */}
                    {mode === 'close' && <EventCloseKindControl value={form.kind} onChangeAction={form.setCloseKind} />}

                    {/* Statement */}
                    <EventStatementFields
                        kind={form.kind}
                        draft={form.draft}
                        explanationLength={form.explanationLength}
                        onGroundChangeAction={form.handleGroundChange}
                        onRuleChangeAction={form.handleRuleChange}
                        onOperationalReasonChangeAction={form.handleOperationalReasonChange}
                        onExplanationChangeAction={form.handleExplanationChange}
                        onNoteChangeAction={form.handleNoteChange}
                    />

                    {/* Error */}
                    {Boolean(form.error) && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(form.error)}`)}</p>}
                </div>
            }
            cancelLabel={t('cancel')}
            confirmLabel={t(`events.${mode}.confirm`)}
            confirmDisabled={!form.canConfirm}
            isConfirming={form.isConfirming}
            onConfirmAction={form.confirm}
        />
    );
}
