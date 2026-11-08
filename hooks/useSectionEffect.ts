import { useReducedMotion } from 'framer-motion';
import { useMemo, useRef } from 'react';

import { useBackgroundReveal } from '@/hooks/useBackgroundReveal';
import { useCanvasEffect } from '@/hooks/useCanvasEffect';
import { useEffectOnScreen } from '@/hooks/useEffectOnScreen';
import { effectParticles, type SectionEffect } from '@/lib/invitation/backgroundEffects';

// Everything a section's effect layer does: it only runs while the section is on
// screen, and never for someone who prefers less motion.
export function useSectionEffect(effect: SectionEffect) {
    const layerRef = useRef<HTMLDivElement>(null);
    const backgroundRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const reduceMotion = Boolean(useReducedMotion());

    const inView = useEffectOnScreen(layerRef, !reduceMotion);
    useCanvasEffect(canvasRef, effect, inView);
    useBackgroundReveal(backgroundRef, effect, inView);

    // Particles are only made while the section is on screen, so the server render
    // has none. They come from fixed sums (fxFrac), so each one lands in the same
    // place every time; they are rebuilt whenever the section comes back on screen.
    const { type, speed, intensity } = effect;
    const particles = useMemo(() => (inView ? effectParticles({ type, speed, intensity }) : []), [inView, type, speed, intensity]);

    return { layerRef, backgroundRef, canvasRef, inView, particles };
}
