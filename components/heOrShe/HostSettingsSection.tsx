'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { GuessButtons } from '@/components/heOrShe/GuessButtons';
import { RevealConfirmModal } from '@/components/heOrShe/RevealConfirmModal';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useHeOrSheHostSettings } from '@/hooks/useHeOrSheHostSettings';
import type { HeOrSheViewDto } from '@/lib/api/types';

/** The secret answer, the reveal time, and Reveal now. Read-only after the reveal. */
export function HostSettingsSection({ eventId, view }: { eventId: string; view: HeOrSheViewDto }) {
    const t = useTranslations('HeOrShePage.host');
    const toErrorMessage = useApiErrorMessage();
    const settings = useHeOrSheHostSettings(eventId, view);

    // After the reveal there is nothing left to set; the result shows in the guess section.
    if (settings.locked) return null;

    return (
        <section className="space-y-4 rounded-2xl bg-surface-muted/60 p-4">
            <h2 className="text-base font-semibold text-ink">{t('settingsTitle')}</h2>

            <form onSubmit={settings.save} className="space-y-4">
                {/* Answer */}
                <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold text-ink">{t('secretAnswer')}</span>
                        <span className="text-xs text-ink-faint">{t('secretAnswerHint')}</span>
                    </div>
                    <GuessButtons size="sm" label={t('secretAnswer')} value={settings.answer} onChangeAction={settings.setAnswer} />
                </div>

                {/* Reveal time */}
                <div className="space-y-2">
                    <span className="text-sm font-semibold text-ink">{t('revealAt')}</span>
                    <DateTimeField value={settings.revealAt} onChange={settings.setRevealAt} aria-invalid={settings.needsAnswer} />
                    <p className={settings.needsAnswer ? 'text-xs text-rose-600' : 'text-xs text-ink-faint'}>
                        {settings.needsAnswer ? t('needsAnswer') : t('revealAtHint')}
                    </p>
                </div>

                {settings.saveError && (
                    <p role="alert" className="text-xs text-rose-600">
                        {toErrorMessage(settings.saveError)}
                    </p>
                )}

                {/* Actions */}
                <div className="flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        onClick={settings.reveal.openReveal}
                        className="h-10 rounded-full border border-border bg-background px-4 text-sm font-semibold text-ink"
                    >
                        {t('revealNow')}
                    </button>
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

            <RevealConfirmModal
                open={settings.reveal.open}
                answer={settings.reveal.answer}
                askAnswer={view.answer === null}
                isRevealing={settings.reveal.isRevealing}
                errorMessage={settings.reveal.error ? toErrorMessage(settings.reveal.error) : null}
                onAnswerAction={settings.reveal.setAnswer}
                onCloseAction={settings.reveal.close}
                onConfirmAction={settings.reveal.confirm}
            />
        </section>
    );
}
