'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { HeOrSheCardShell } from '@/components/feed/HeOrSheCardShell';
import { HeOrSheGuessRow } from '@/components/feed/HeOrSheGuessRow';
import { TallyBar } from '@/components/heOrShe/TallyBar';
import { HE_OR_SHE_MODULE } from '@/hooks/useHeOrShe';
import { useHeOrSheFeedPrompt } from '@/hooks/useHeOrSheFeedPrompt';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import type { EventDetailResponseDto, HeOrSheValue } from '@/lib/api/types';
import { isModuleAvailable } from '@/lib/eventLifecycle';
import { useIsHost } from '@/providers/EventProvider';

type FeedHeOrSheSectionProps = { event: EventDetailResponseDto; placeholder?: ReactNode };

// Boy or Girl as a feed section: today's card before a guess; then the guess and the countdown; then the result.
// Hosts see the countdown and the tally.
export function FeedHeOrSheSection({ event, placeholder = null }: FeedHeOrSheSectionProps) {
    const t = useTranslations('HeOrShePage');
    const title = useModuleCopy(event.eventType)(HE_OR_SHE_MODULE).name;
    const prompt = useHeOrSheFeedPrompt(event.id, isModuleAvailable(event.modules, HE_OR_SHE_MODULE), useIsHost());
    const { view } = prompt;
    if (!view) return placeholder;

    return (
        <HeOrSheCardShell title={title} closesTime={view.kind === 'closed' ? null : prompt.closesTime}>
            {/* Guess */}
            {view.kind === 'guess' && <HeOrSheGuessRow isSending={prompt.isSending} error={prompt.error} onGuessAction={prompt.guess} />}

            {/* The member's guess */}
            {(view.kind === 'guessed' || view.kind === 'closed') && view.guess && <MyGuess guess={view.guess} />}

            {/* Closed */}
            {view.kind === 'closed' && <p className="mt-6 text-center text-sm font-semibold text-ink">{t('closed')}</p>}

            {/* Tally */}
            {(view.kind === 'tally' || view.kind === 'closed') && (
                <div className="mt-6">
                    <TallyBar tally={view.tally} />
                </div>
            )}
        </HeOrSheCardShell>
    );
}

// "Your guess", then Boy or Girl.
function MyGuess({ guess }: { guess: HeOrSheValue }) {
    const t = useTranslations('HeOrShePage');

    return (
        <p className="mt-6 flex flex-col items-center gap-1 text-center">
            <span className="text-xs text-ink-muted">{t('yourGuess')}</span>
            <span className="alegreya text-2xl leading-tight text-ink">{t(guess === 'HE' ? 'he' : 'she')}</span>
        </p>
    );
}
