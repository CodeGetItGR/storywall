'use client';

import { PartyPopper } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { GuessButtons } from '@/components/heOrShe/GuessButtons';
import { ConfirmActionModal } from '@/components/ui/ConfirmActionModal';
import type { HeOrSheValue } from '@/lib/api/types';

/** Confirms the reveal, which can't be undone. Asks for the answer when none is stored. */
export function RevealConfirmModal({
    open,
    answer,
    askAnswer,
    isRevealing,
    errorMessage,
    onAnswerAction,
    onCloseAction,
    onConfirmAction,
}: {
    open: boolean;
    answer: HeOrSheValue | null;
    askAnswer: boolean;
    isRevealing: boolean;
    errorMessage: string | null;
    onAnswerAction: (value: HeOrSheValue) => void;
    onCloseAction: () => void;
    onConfirmAction: () => void;
}) {
    const t = useTranslations('HeOrShePage.host');
    return (
        <ConfirmActionModal
            open={open}
            tone="default"
            icon={<PartyPopper className="h-5 w-5" aria-hidden="true" />}
            title={t('revealConfirmTitle')}
            body={
                <div className="space-y-4">
                    <p>{t('revealConfirmBody')}</p>
                    {/* Answer, when none is stored */}
                    {askAnswer && <GuessButtons size="sm" label={t('revealPickAnswer')} value={answer} onChangeAction={onAnswerAction} />}
                    {errorMessage && (
                        <p role="alert" className="text-xs text-rose-600">
                            {errorMessage}
                        </p>
                    )}
                </div>
            }
            confirmLabel={t('revealConfirmAction')}
            cancelLabel={t('cancel')}
            confirmDisabled={answer === null}
            isConfirming={isRevealing}
            onCloseAction={onCloseAction}
            onConfirmAction={onConfirmAction}
        />
    );
}
