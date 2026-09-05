import confetti from 'canvas-confetti';

export const FIREWORKS_DURATION_MS = 3500;

const BURST_INTERVAL_MS = 300;

const FIREWORK_COLORS = ['#ff7a59', '#ff6fa0', '#ffb259', '#c777b1', '#fec463'];

export function runFireworks(canvas: HTMLCanvasElement): () => void {
    const fire = confetti.create(canvas, { resize: true, useWorker: true });
    const endAt = Date.now() + FIREWORKS_DURATION_MS;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    function burst() {
        if (Date.now() >= endAt) return;

        fire({
            particleCount: 40,
            startVelocity: 55,
            spread: 360,
            gravity: 0.9,
            ticks: 90,
            origin: { x: Math.random(), y: Math.random() * 0.4 + 0.2 },
            colors: FIREWORK_COLORS,
        });

        timeoutId = setTimeout(burst, BURST_INTERVAL_MS);
    }

    burst();

    return () => {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
        fire.reset();
    };
}
