import { useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function useLandingTypewriter(words: string[], paused = false) {
    const [index, setIndex] = useState(0);
    // Every word starts on its first letter so no frame renders an empty line.
    const [length, setLength] = useState(1);
    const [wasPaused, setWasPaused] = useState(paused);
    const reducedMotion = useReducedMotion();

    // Pausing settles on the whole word, which reads as a finished line instead
    // of a half-typed one; resuming then carries straight on to the next word.
    if (paused !== wasPaused) {
        setWasPaused(paused);
        if (paused) setLength(words[index]?.length ?? 1);
    }

    useEffect(() => {
        if (!words.length || reducedMotion || paused) return;
        const word = words[index] ?? '';
        const complete = length >= word.length;
        const timer = window.setTimeout(
            () => {
                if (complete) {
                    setIndex((value) => (value + 1) % words.length);
                    setLength(1);
                    return;
                }
                setLength((value) => value + 1);
            },
            complete ? 1250 : 92
        );
        return () => window.clearTimeout(timer);
    }, [index, length, paused, reducedMotion, words]);

    return reducedMotion ? (words[index] ?? '') : (words[index] ?? '').slice(0, length);
}
