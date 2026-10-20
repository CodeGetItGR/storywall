'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type React from 'react';
import { useId } from 'react';

import { fieldClass } from '@/components/heOrShe/fieldClass';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useQuizPollsHostSettings } from '@/hooks/useQuizPollsHostSettings';
import type { QuizPollsViewDto } from '@/lib/api/types';
import { QUIZ_POLLS_SIDE_LABEL_MAX, type SideLabels } from '@/lib/quizPolls';

/** The closing time, the names for the two sides, and "Close now". */
export function HostSettingsSection({ eventId, view, defaultSides }: { eventId: string; view: QuizPollsViewDto; defaultSides: SideLabels }) {
    const t = useTranslations('QuizPollsPage.host');
    const toErrorMessage = useApiErrorMessage();
    const settings = useQuizPollsHostSettings(eventId, view);
    const id = useId();

    function changeHe(event: React.ChangeEvent<HTMLInputElement>) {
        settings.setHeLabel(event.currentTarget.value);
    }
    function changeShe(event: React.ChangeEvent<HTMLInputElement>) {
        settings.setSheLabel(event.currentTarget.value);
    }

    return (
        <section className="space-y-4 rounded-2xl bg-surface-muted/60 p-4">
            <h2 className="text-base font-semibold text-ink">{t('settingsTitle')}</h2>

            <form onSubmit={settings.save} className="space-y-5">
                {/* Closing time */}
                <div className="space-y-2">
                    <span className="text-sm font-semibold text-ink">{t('closesAt')}</span>
                    <DateTimeField value={settings.closesAt} onChange={settings.setClosesAt} />
                    <p className="text-xs text-ink-faint">{t('closesAtHint')}</p>
                </div>

                {/* Names */}
                <fieldset className="space-y-2">
                    <legend className="text-sm font-semibold text-ink">{t('sidesTitle')}</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1">
                            <label htmlFor={`${id}-he`} className="text-xs text-ink-muted">
                                {defaultSides.he}
                            </label>
                            <input
                                id={`${id}-he`}
                                value={settings.heLabel}
                                onChange={changeHe}
                                placeholder={defaultSides.he}
                                maxLength={QUIZ_POLLS_SIDE_LABEL_MAX}
                                className={fieldClass}
                            />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor={`${id}-she`} className="text-xs text-ink-muted">
                                {defaultSides.she}
                            </label>
                            <input
                                id={`${id}-she`}
                                value={settings.sheLabel}
                                onChange={changeShe}
                                placeholder={defaultSides.she}
                                maxLength={QUIZ_POLLS_SIDE_LABEL_MAX}
                                className={fieldClass}
                            />
                        </div>
                    </div>
                </fieldset>

                {settings.saveError && (
                    <p role="alert" className="text-xs text-rose-600">
                        {toErrorMessage(settings.saveError)}
                    </p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between gap-2">
                    {settings.isOpen ? (
                        <button
                            type="button"
                            onClick={settings.askClose}
                            className="h-10 rounded-full px-3 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                        >
                            {t('closeNow')}
                        </button>
                    ) : (
                        <span />
                    )}
                    <button
                        type="submit"
                        disabled={!settings.canSave}
                        className="inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white bg-gradient-brand disabled:opacity-50"
                    >
                        {settings.isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        {t('save')}
                    </button>
                </div>
            </form>

            <ConfirmActionModal
                open={settings.confirmingClose}
                title={t('closeConfirmTitle')}
                body={settings.closeError ? toErrorMessage(settings.closeError) : t('closeConfirmBody')}
                confirmLabel={t('closeConfirmAction')}
                cancelLabel={t('cancel')}
                isConfirming={settings.isClosing}
                onCloseAction={settings.cancelClose}
                onConfirmAction={settings.confirmClose}
            />
        </section>
    );
}
