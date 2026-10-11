'use client';

import { useTranslations } from 'next-intl';

import { GuessForm } from '@/components/heOrShe/GuessForm';
import { TallyBar } from '@/components/heOrShe/TallyBar';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { useHeOrSheGuessForm } from '@/hooks/useHeOrSheGuessForm';
import type { HeOrSheViewDto } from '@/lib/api/types';

/** What everyone sees, hosts included: the form, or the tally and thanks. */
export function GuessSection({ eventId, view, closesOn }: { eventId: string; view: HeOrSheViewDto; closesOn: string | null }) {
    const t = useTranslations('HeOrShePage');
    const toErrorMessage = useApiErrorMessage();
    const form = useHeOrSheGuessForm(eventId, view);

    return (
        <section className="space-y-6">
            {/* Closing time */}
            {view.status === 'OPEN' && closesOn && <p className="text-center text-sm text-ink-muted">{t('closesOn', { date: closesOn })}</p>}

            {/* Closed */}
            {view.status === 'CLOSED' && <p className="text-center text-base font-semibold text-ink">{t('closed')}</p>}

            {/* Form */}
            {form.editing ? (
                <GuessForm
                    questions={view.questions}
                    guess={form.guess}
                    answers={form.answers}
                    errors={form.errors}
                    canSend={form.canSend}
                    isSending={form.isSending}
                    errorMessage={form.error ? toErrorMessage(form.error) : null}
                    onGuessAction={form.setGuess}
                    onAnswerAction={form.setAnswer}
                    onSubmitAction={form.submit}
                />
            ) : (
                view.status === 'OPEN' && !form.answered && <p className="text-center text-sm text-ink-muted">{t('notOpen')}</p>
            )}

            {/* Tally: the server sends it only to hosts, to members who voted, and once voting closes */}
            {view.tally && <TallyBar tally={view.tally} />}

            {/* Thanks */}
            {!form.editing && form.answered && (
                <div className="space-y-3 text-center">
                    <p className="text-sm font-semibold text-ink">{t('thanks')}</p>
                    {view.canGuess && (
                        <button
                            type="button"
                            onClick={form.startEditing}
                            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
                        >
                            {t('changeAnswers')}
                        </button>
                    )}
                </div>
            )}
        </section>
    );
}
