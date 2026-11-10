import { type RefObject, useEffect } from 'react';

import type { SectionEffect } from '@/lib/invitation/backgroundEffects';
import { createCanvasEffect, isCanvasEffect } from '@/lib/invitation/canvasEffects';

// Runs a canvas effect while `running` is true. Stopping clears the canvas and
// its particles, so coming back to the section starts afresh.
export function useCanvasEffect(ref: RefObject<HTMLCanvasElement | null>, { type, speed, intensity }: SectionEffect, running: boolean) {
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas || !running || !isCanvasEffect(type)) return;
        const controller = createCanvasEffect(canvas, type, { speed, intensity });
        controller?.start();
        return () => controller?.stop();
    }, [ref, type, speed, intensity, running]);
}
