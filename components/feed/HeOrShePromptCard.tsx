'use client';

import { HeOrSheCardShell } from '@/components/feed/HeOrSheCardShell';
import { HeOrSheGuessRow } from '@/components/feed/HeOrSheGuessRow';
import { HE_OR_SHE_MODULE } from '@/hooks/useHeOrShe';
import { useHeOrSheFeedPrompt } from '@/hooks/useHeOrSheFeedPrompt';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import type { EventTypeConvention } from '@/lib/api/types';

/** A post-like card in the feed asking a member who hasn't guessed yet: Boy or Girl? */
export function HeOrShePromptCard({ eventId, eventType, enabled }: { eventId: string; eventType: EventTypeConvention | null; enabled: boolean }) {
    const title = useModuleCopy(eventType)(HE_OR_SHE_MODULE).name;
    const prompt = useHeOrSheFeedPrompt(eventId, enabled);

    if (!prompt.visible) return null;

    return (
        <HeOrSheCardShell title={title} closesTime={prompt.closesTime}>
            <HeOrSheGuessRow isSending={prompt.isSending} error={prompt.error} onGuessAction={prompt.guess} />
        </HeOrSheCardShell>
    );
}
