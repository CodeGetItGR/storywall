import confetti from 'canvas-confetti';

export const FIREWORKS_DURATION_MS = 6000;

const BURST_INTERVAL_MS = 220;
const FINALE_LEAD_MS = 450;

const FIREWORK_COLORS = ['#ff7a59', '#ff6fa0', '#ffb259', '#c777b1', '#fec463'];

const SHAPE_SETS: confetti.Shape[][] = [['circle'], ['square'], ['star'], ['circle', 'star']];

const SPARKLE_EMOJIS = ['✨', '🎉', '🎆'];

function randomBetween(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

function randomShapeSet(): confetti.Shape[] {
    return SHAPE_SETS[Math.floor(Math.random() * SHAPE_SETS.length)];
}

function fireCenterBurst(fire: confetti.CreateTypes): void {
    fire({
        particleCount: Math.round(randomBetween(120, 200)),
        startVelocity: randomBetween(45, 75),
        spread: 360,
        gravity: 0.7,
        ticks: Math.round(randomBetween(200, 280)),
        scalar: randomBetween(0.9, 1.7),
        shapes: randomShapeSet(),
        origin: { x: randomBetween(0.08, 0.92), y: randomBetween(0.08, 0.8) },
        colors: FIREWORK_COLORS,
    });
}

function fireSideCannon(fire: confetti.CreateTypes, side: 'left' | 'right'): void {
    fire({
        particleCount: Math.round(randomBetween(70, 110)),
        startVelocity: randomBetween(55, 75),
        spread: 70,
        angle: side === 'left' ? 60 : 120,
        gravity: 0.75,
        ticks: 240,
        scalar: randomBetween(1, 1.5),
        origin: { x: side === 'left' ? 0 : 1, y: 0.95 },
        colors: FIREWORK_COLORS,
    });
}

function fireSparkleBurst(fire: confetti.CreateTypes): void {
    fire({
        particleCount: 18,
        startVelocity: randomBetween(35, 55),
        spread: 360,
        gravity: 0.5,
        ticks: 200,
        scalar: randomBetween(1.4, 2),
        shapes: [confetti.shapeFromText(SPARKLE_EMOJIS[Math.floor(Math.random() * SPARKLE_EMOJIS.length)])],
        origin: { x: randomBetween(0.1, 0.9), y: randomBetween(0.1, 0.7) },
    });
}

function fireGrandFinale(fire: confetti.CreateTypes): void {
    fire({
        particleCount: 280,
        startVelocity: 85,
        spread: 360,
        gravity: 0.65,
        ticks: 320,
        scalar: randomBetween(1.1, 1.9),
        shapes: ['circle', 'square', 'star'],
        origin: { x: 0.5, y: 0.4 },
        colors: FIREWORK_COLORS,
    });
}

export function runFireworks(canvas: HTMLCanvasElement): () => void {
    const fire = confetti.create(canvas, { resize: true, useWorker: false });
    const endAt = Date.now() + FIREWORKS_DURATION_MS;
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];
    let burstIndex = 0;

    function scheduleNextBurst(): void {
        const remaining = endAt - Date.now();
        if (remaining <= 0) return;

        timeoutIds.push(setTimeout(burst, BURST_INTERVAL_MS));
    }

    function burst(): void {
        fireCenterBurst(fire);

        if (burstIndex % 2 === 0) {
            fireSideCannon(fire, burstIndex % 4 === 0 ? 'left' : 'right');
        }

        if (burstIndex % 3 === 0) {
            fireSparkleBurst(fire);
        }

        burstIndex += 1;
        scheduleNextBurst();
    }

    burst();
    timeoutIds.push(setTimeout(() => fireGrandFinale(fire), Math.max(FIREWORKS_DURATION_MS - FINALE_LEAD_MS, 0)));

    return () => {
        for (const id of timeoutIds) clearTimeout(id);
        fire.reset();
    };
}
