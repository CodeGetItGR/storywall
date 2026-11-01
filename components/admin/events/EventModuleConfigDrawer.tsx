'use client';

import { useTranslations } from 'next-intl';

import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminField, adminInputClass } from '@/components/admin/AdminField';
import { EventDrawerFooter } from '@/components/admin/events/EventDrawerFooter';
import { EventGrantReasonField } from '@/components/admin/events/EventGrantReasonField';
import { EventLimitPreview } from '@/components/admin/events/EventLimitPreview';
import { EventModuleConfigValueFields } from '@/components/admin/events/EventModuleConfigValueFields';
import { useModuleConfigForm } from '@/hooks/useModuleConfigForm';
import { useModuleConfigValue } from '@/hooks/useModuleConfigValue';
import type { FlagChoice } from '@/lib/adminEvents';
import { adminErrorMessageKey } from '@/lib/adminUtils';
import type { AdminEventModuleConfig } from '@/lib/api/types';

const FORM_ID = 'event-module-config-form';
const FLAG_CHOICES: readonly FlagChoice[] = ['PLAN', 'ON', 'OFF'];

// One module setting of one event. A cap takes extra on top of the plan's, so a plan upgrade still
// raises it; a flag follows the plan or is set on or off until an admin puts it back; a value (the
// vendors settings) follows the plan or is set exactly, lower than the plan's included. Saving a
// setting of a module the event doesn't have turns the module on for this event only.
export function EventModuleConfigDrawer({
    open,
    eventId,
    config,
    moduleName,
    hasModule,
    onCloseAction,
}: {
    open: boolean;
    eventId: string;
    config: AdminEventModuleConfig;
    moduleName: string;
    hasModule: boolean;
    onCloseAction: () => void;
}) {
    const t = useTranslations('AdminPage');
    const formatValue = useModuleConfigValue();
    const form = useModuleConfigForm(eventId, config, onCloseAction);
    const planText = formatValue(config, config.planValue);
    const planUnlimited = config.kind === 'COUNT' && typeof config.planValue !== 'number';
    const turnsModuleOn = !hasModule && form.change?.kind === 'set';
    const valueError =
        form.valueInvalid && form.field?.type === 'number'
            ? form.field.storage
                ? t('plans.grid.cell.invalidStorage')
                : t('plans.grid.cell.invalidNumberRange', { min: form.field.min ?? 0, max: form.field.max ?? 0 })
            : undefined;

    return (
        <AdminDrawer
            open={open}
            onClose={onCloseAction}
            closeDisabled={form.isSaving}
            closeLabel={t('cancel')}
            title={t(`plans.grid.cell.fields.${config.configKey}`)}
            subtitle={moduleName}
            footer={
                <EventDrawerFooter
                    formId={FORM_ID}
                    saveLabel={t('events.moduleConfig.save')}
                    canSave={form.canSave}
                    isSaving={form.isSaving}
                    onCancelAction={onCloseAction}
                />
            }
        >
            <form id={FORM_ID} onSubmit={form.handleSubmit} noValidate className="space-y-6">
                {/* Extra on top of the plan's cap */}
                {config.kind === 'COUNT' && (
                    <>
                        <AdminField
                            label={t('events.moduleConfig.extra')}
                            hint={form.extraInvalid ? t('events.moduleConfig.extraInvalid') : t('events.moduleConfig.extraHint', { plan: planText })}
                        >
                            <input
                                inputMode="numeric"
                                value={form.extra}
                                onChange={form.handleExtraChange}
                                aria-invalid={form.extraInvalid}
                                className={adminInputClass(form.extraInvalid ? 'border-status-danger font-mono' : 'font-mono')}
                            />
                        </AdminField>
                        <EventLimitPreview
                            current={formatValue(config, config.effectiveValue)}
                            next={form.parsedExtra === null ? null : formatValue(config, form.resultCap)}
                            breakdown={null}
                            warning={null}
                        />
                        {planUnlimited && <p className="text-sm text-ink-muted">{t('events.moduleConfig.planUnlimited')}</p>}
                    </>
                )}

                {/* Follow the plan, or on or off */}
                {config.kind === 'FLAG' && (
                    <fieldset>
                        <legend className="mb-1.5 text-[11px] font-bold tracking-wide text-ink-muted uppercase">{t('events.moduleConfig.value')}</legend>
                        <div className="space-y-1.5">
                            {FLAG_CHOICES.map((choice) => (
                                <label key={choice} className="flex items-center gap-2 text-sm text-ink">
                                    <input type="radio" name="module-config-flag" value={choice} checked={form.choice === choice} onChange={form.handleChoiceChange} />
                                    {choice === 'PLAN' ? t('events.moduleConfig.followPlan', { value: planText }) : t(`plans.grid.cell.${choice === 'ON' ? 'on' : 'off'}`)}
                                </label>
                            ))}
                        </div>
                        <p className="mt-2 text-xs text-ink-muted">{t('events.moduleConfig.flagHint')}</p>
                    </fieldset>
                )}

                {/* Plan's value or this event's */}
                {config.kind === 'VALUE' && form.field && (
                    <>
                        <EventModuleConfigValueFields
                            field={form.field}
                            choice={form.valueChoice}
                            draft={form.valueDraft}
                            planText={planText}
                            error={valueError}
                            onChoiceChangeAction={form.handleValueChoiceChange}
                            onDraftChangeAction={form.handleValueDraftChange}
                            onTypeChangeAction={form.handleTypeChange}
                        />
                        <EventLimitPreview
                            current={formatValue(config, config.effectiveValue)}
                            next={form.nextValue === undefined ? null : formatValue(config, form.nextValue as AdminEventModuleConfig['effectiveValue'])}
                            breakdown={null}
                            warning={null}
                            list={form.field.type === 'types'}
                        />
                    </>
                )}

                {/* Module turned on */}
                {turnsModuleOn && (
                    <p role="status" className="rounded-lg bg-status-warn-wash px-3 py-2.5 text-sm text-status-warn">
                        {t('events.moduleConfig.turnsOn', { module: moduleName })}
                    </p>
                )}

                {/* Reason */}
                <EventGrantReasonField value={form.reason} invalid={form.reasonInvalid} onChangeAction={form.handleReasonChange} />

                {/* Save error */}
                {Boolean(form.error) && <p className="text-sm text-status-danger">{t(`errors.${adminErrorMessageKey(form.error)}`)}</p>}
            </form>
        </AdminDrawer>
    );
}
