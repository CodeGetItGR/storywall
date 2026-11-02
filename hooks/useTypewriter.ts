import { useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { useIsHydrated } from '@/hooks/useIsHydrated';
import { nextTypewriterStep, TYPEWRITER_START, type TypewriterCursor } from '@/lib/landingHero';

// Types, holds and deletes each word in turn. While paused, or when the visitor prefers less motion,
// it shows the first word in full and stands still; resuming holds that word, then carries on. The
// server can't see the motion setting, so it applies once the typewriter has hydrated.
export function useTypewriter(words: readonly string[], paused: boolean) {
    const reduceMotion = useReducedMotion();
    const isHydrated = useIsHydrated();
    const still = paused || (isHydrated && Boolean(reduceMotion));
    const [cursor, setCursor] = useState<TypewriterCursor>(TYPEWRITER_START);
    const [wasStill, setWasStill] = useState(still);

    if (still !== wasStill) {
        setWasStill(still);
        if (still) setCursor({ word: 0, length: words[0]?.length ?? 0, deleting: false });
    }

    const wordLength = words[cursor.word]?.length ?? 0;
    const wordCount = words.length;

    useEffect(() => {
        if (still || wordCount === 0) return;
        const step = nextTypewriterStep(cursor, wordLength, wordCount);
        const timer = setTimeout(() => setCursor(step.cursor), step.delay);
        return () => clearTimeout(timer);
    }, [cursor, still, wordCount, wordLength]);

    const text = still ? (words[0] ?? '') : (words[cursor.word]?.slice(0, cursor.length) ?? '');
    return { text, still };
}
