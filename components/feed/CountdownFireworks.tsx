import { useEffect, useRef } from 'react';

import { FIREWORKS_DURATION_MS, runFireworks } from '@/lib/fireworks';

export function CountdownFireworks({ onCompleteAction }: { onCompleteAction: () => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const stop = runFireworks(canvas);
        const timeoutId = setTimeout(onCompleteAction, FIREWORKS_DURATION_MS);

        return () => {
            stop();
            clearTimeout(timeoutId);
        };
    }, [onCompleteAction]);

    return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-50" />;
}
