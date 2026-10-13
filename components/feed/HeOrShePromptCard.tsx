'use client';

import { useTranslations } from 'next-intl';
import { PiBalloonFill } from 'react-icons/pi';

import { HeOrSheCloseCountdown } from '@/components/feed/HeOrSheCloseCountdown';
import { HeOrShePromptChoice } from '@/components/feed/HeOrShePromptChoice';
import { LightRay } from '@/components/feed/LightRay';
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
        <article className="mt-3 p-2">
            <div className="@container relative isolate overflow-hidden rounded-2xl bg-linear-to-br from-sky-100 via-white to-pink-100 px-5 pt-7 pb-6 shadow-[0_10px_30px_rgba(36,31,26,0.08)] ring-1 ring-white/80">
                {/* Decoration */}
                <LightRay />
                <PiBalloonFill className="he-or-she-balloon pointer-events-none absolute top-4 left-4 -z-10 h-12 w-12 text-sky-300/45" aria-hidden="true" />
                <PiBalloonFill
                    className="he-or-she-balloon pointer-events-none absolute right-5 bottom-16 -z-10 h-14 w-14 text-pink-300/45 [animation-delay:-3s]"
                    aria-hidden="true"
                />

                {/* Header */}
                <div className="flex flex-col items-center gap-4 text-center">
                    <h2 className="event-heading alegreya-light text-4xl leading-tight text-balance text-ink">{title}</h2>
                    {prompt.closesTime !== null && <HeOrSheCloseCountdown time={prompt.closesTime} />}
                </div>

                {/* Guess */}
                <div role="group" aria-label={t('yourGuess')} className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <HeOrShePromptChoice value="HE" label={t('he')} disabled={prompt.isSending} onChooseAction={prompt.guess} />
                    <span className="alegreya text-sm text-ink-muted italic">{t('or')}</span>
                    <HeOrShePromptChoice value="SHE" label={t('she')} disabled={prompt.isSending} onChooseAction={prompt.guess} />
                </div>

                {/* Error */}
                {prompt.error && (
                    <p role="alert" className="mt-3 text-center text-xs text-rose-600">
                        {toErrorMessage(prompt.error)}
                    </p>
                )}
            </div>
        </article>
    );
}
