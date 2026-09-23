'use client';

import { useTranslations } from 'next-intl';

import { LoadingState } from '@/components/ui/LoadingState';
import type { CodeRestrictionOption } from '@/hooks/useCodeRestrictionOptions';
import { useCodeRestrictionPicker } from '@/hooks/useCodeRestrictionPicker';
import type { CodeRestrictionsDto } from '@/lib/api/types';

export function CodeRestrictionFields({ restrictions }: { restrictions: CodeRestrictionsDto | null }) {
    const t = useTranslations('AdminPage.collaborations.codes.restrictions');
    const picker = useCodeRestrictionPicker(restrictions);

    return (
        <div className="space-y-5 border-t border-border pt-4">
            {/* Kept values the lists don't show, so saving never drops them */}
            {picker.unknown.eventTypeKeys.map((key) => (
                <input key={key} type="hidden" name="eventTypeKeys" value={key} />
            ))}
            {picker.unknown.planTierCodes.map((code) => (
                <input key={code} type="hidden" name="planTierCodes" value={code} />
            ))}

            {picker.isLoading && <LoadingState label={t('loading')} className="justify-start" />}

            {/* Event types */}
            {picker.eventTypes.length > 0 && (
                <fieldset>
                    <legend className="text-sm font-bold text-ink">{t('eventTypes')}</legend>
                    <p className="mb-2 text-xs leading-5 text-ink-faint">{t('eventTypesHint')}</p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                        {picker.eventTypes.map((option) => (
                            <RestrictionCheckbox
                                key={option.value}
                                name="eventTypeKeys"
                                option={option}
                                checked={picker.selectedEventTypes.includes(option.value)}
                                onChange={picker.handleEventTypeChange}
                            />
                        ))}
                    </div>
                </fieldset>
            )}

            {/* Plans */}
            {picker.eventTypes.length > 0 && (
                <fieldset>
                    <legend className="text-sm font-bold text-ink">{t('plans')}</legend>
                    {picker.visiblePlanGroups.length === 0 ? (
                        <p className="text-xs leading-5 text-ink-faint">{t('plansPickTypeFirst')}</p>
                    ) : (
                        <>
                            <p className="mb-2 text-xs leading-5 text-ink-faint">{t('plansHint')}</p>
                            <div className="space-y-3">
                                {picker.visiblePlanGroups.map((group) => (
                                    <div key={group.key}>
                                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-muted">{group.label}</p>
                                        <div className="grid gap-1.5 sm:grid-cols-2">
                                            {group.plans.map((option) => (
                                                <RestrictionCheckbox
                                                    key={option.value}
                                                    name="planTierCodes"
                                                    option={option}
                                                    defaultChecked={picker.selectedPlans.includes(option.value)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </fieldset>
            )}
        </div>
    );
}

function RestrictionCheckbox({
    name,
    option,
    checked,
    defaultChecked,
    onChange,
}: {
    name: string;
    option: CodeRestrictionOption;
    checked?: boolean;
    defaultChecked?: boolean;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <label className="flex min-h-10 items-center gap-3 rounded-md border border-border px-3 py-2 text-sm font-semibold text-ink-muted">
            <input
                type="checkbox"
                name={name}
                value={option.value}
                checked={checked}
                defaultChecked={defaultChecked}
                onChange={onChange}
                className="h-4 w-4 accent-primary"
            />
            <span className="min-w-0 truncate text-ink">{option.label}</span>
        </label>
    );
}
