import { type RefObject, useEffect } from 'react';

// Runs the fireworks on `canvasRef`'s canvas, then calls onComplete. The fireworks code loads
// only now: most visits never see them.
export function useFireworks(canvasRef: RefObject<HTMLCanvasElement | null>, onComplete: () => void) {
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        let cancelled = false;
        let stop: (() => void) | undefined;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        import('@/lib/fireworks').then(
            ({ FIREWORKS_DURATION_MS, runFireworks }) => {
                if (cancelled) return;
                stop = runFireworks(canvas);
                timeoutId = setTimeout(onComplete, FIREWORKS_DURATION_MS);
            },
            // The celebration is skipped, not stuck.
            () => {
                if (!cancelled) onComplete();
            },
        );

        return () => {
            cancelled = true;
            stop?.();
            clearTimeout(timeoutId);
        };
    }, [canvasRef, onComplete]);
}
