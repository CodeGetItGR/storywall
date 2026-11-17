import confetti from 'canvas-confetti';

const COLORS = ['#ff6fa0', '#ff7a59', '#ffb259', '#f3cf8a'];

function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Three bursts from the top after a draft goes live. Returns a cleanup that stops and clears them.
export function fireCelebrationConfetti(): () => void {
    if (prefersReducedMotion()) return () => {};

    const bursts = [
        { origin: { x: 0.5, y: 0.25 }, spread: 90, particleCount: 80 },
        { origin: { x: 0.15, y: 0.3 }, spread: 70, angle: 60, particleCount: 45 },
        { origin: { x: 0.85, y: 0.3 }, spread: 70, angle: 120, particleCount: 45 },
    ];
    const timers = bursts.map((burst, index) =>
        window.setTimeout(() => void confetti({ ...burst, startVelocity: 38, gravity: 0.8, ticks: 220, colors: COLORS }), index * 250),
    );

    return () => {
        timers.forEach((timer) => window.clearTimeout(timer));
        confetti.reset();
    };
}
