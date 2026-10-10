'use client';

import { Baby } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { GuessButtons } from '@/components/heOrShe/GuessButtons';
import { useApiErrorMessage } from '@/hooks/useApiErrorMessage';
import { HE_OR_SHE_MODULE } from '@/hooks/useHeOrShe';
import { useHeOrSheFeedPrompt } from '@/hooks/useHeOrSheFeedPrompt';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import type { EventTypeConvention } from '@/lib/api/types';

/** A post-like card in the feed asking a member who hasn't guessed yet: Boy or Girl? */
export function HeOrShePromptCard({ eventId, eventType, enabled }: { eventId: string; eventType: EventTypeConvention | null; enabled: boolean }) {
    const t = useTranslations('HeOrShePage');
    const toErrorMessage = useApiErrorMessage();
    const title = useModuleCopy(eventType)(HE_OR_SHE_MODULE).name;
    const prompt = useHeOrSheFeedPrompt(eventId, enabled);

    if (!prompt.visible) return null;

    return (
        <article className="border-b border-event-card-line bg-event-card px-4 pt-5 pb-6">
            {/* Header */}
            <div className="mb-5 flex flex-col items-center gap-1 text-center">
                <Baby className="h-6 w-6 text-sky-500" aria-hidden="true" />
                <h2 className="event-heading text-2xl font-bold text-balance text-event-title">{title}</h2>
                {prompt.revealOn && <p className="text-sm text-ink-muted">{t('revealOn', { date: prompt.revealOn })}</p>}
            </div>

            {/* Guess */}
            <GuessButtons value={null} onChangeAction={prompt.guess} disabled={prompt.isSending} size="sm" label={t('yourGuess')} />

            {/* Error */}
            {prompt.error && (
                <p role="alert" className="mt-3 text-center text-xs text-rose-600">
                    {toErrorMessage(prompt.error)}
                </p>
            )}
        </article>
    );
}
