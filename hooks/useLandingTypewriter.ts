import { useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function useLandingTypewriter(words: string[]) {
    const [index, setIndex] = useState(0);
    const [length, setLength] = useState(0);
    const reducedMotion = useReducedMotion();

    useEffect(() => {
        if (!words.length || reducedMotion) return;
        const word = words[index] ?? '';
        const complete = length === word.length;
        const timer = window.setTimeout(
            () => {
                if (complete) {
                    setIndex((value) => (value + 1) % words.length);
                    setLength(0);
                    return;
                }
                setLength((value) => value + 1);
            },
            complete ? 1250 : 92
        );
        return () => window.clearTimeout(timer);
    }, [index, length, reducedMotion, words]);

    return reducedMotion ? (words[index] ?? '') : (words[index] ?? '').slice(0, length);
}
