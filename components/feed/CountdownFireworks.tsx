import { useRef } from 'react';

import { useFireworks } from '@/hooks/useFireworks';

export function CountdownFireworks({ onCompleteAction }: { onCompleteAction: () => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useFireworks(canvasRef, onCompleteAction);

    return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-300 h-screen w-screen" />;
}
