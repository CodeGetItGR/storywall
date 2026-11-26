'use client';

import { useTranslations } from 'next-intl';

import { HeOrShePromptChoice } from '@/components/feed/HeOrShePromptChoice';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import type { HeOrSheValue } from '@/lib/api/types';

type HeOrSheGuessRowProps = { isSending: boolean; error: Error | null; onGuessAction: (value: HeOrSheValue) => void };

/** Boy or Girl: the two choices, and the error if saving the guess failed. */
export function HeOrSheGuessRow({ isSending, error, onGuessAction }: HeOrSheGuessRowProps) {
    const t = useTranslations('HeOrShePage');
    const toErrorMessage = useApiErrorMessage();

    return (
        <>
            {/* Guess */}
            <div role="group" aria-label={t('yourGuess')} className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <HeOrShePromptChoice value="HE" label={t('he')} disabled={isSending} onChooseAction={onGuessAction} />
                <span className="alegreya text-sm text-ink-muted italic">{t('or')}</span>
                <HeOrShePromptChoice value="SHE" label={t('she')} disabled={isSending} onChooseAction={onGuessAction} />
            </div>

            {/* Error */}
            {error && (
                <p role="alert" className="mt-3 text-center text-xs text-rose-600">
                    {toErrorMessage(error)}
                </p>
            )}
        </>
    );
}
