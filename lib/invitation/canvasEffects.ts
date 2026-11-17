import type { SectionEffect } from '@/lib/invitation/backgroundEffects';

// The canvas effects: same maths as the old engine (wedartCreateNativeCanvasController
// in save-my-date public/legacy/effects-engine.js). Random numbers are drawn in the
// same order, so a seeded run draws exactly what the old page draws; the test checks
// that against a recording of the old engine. Don't tidy the order of anything here.

export const CANVAS_EFFECTS = ['canvasRealistic', 'canvasFireworks', 'canvasStars', 'canvasSnow'] as const;

export type CanvasEffectType = (typeof CANVAS_EFFECTS)[number];

const CANVAS_EFFECT_SET: ReadonlySet<string> = new Set(CANVAS_EFFECTS);

export function isCanvasEffect(type: string): type is CanvasEffectType {
    return CANVAS_EFFECT_SET.has(type);
}

export type CanvasEffectController = { start: () => void; stop: () => void };

const COLORS = ['#ffd166', '#ff6b6b', '#6ed6ff', '#9b7cff', '#6ee7a8', '#ffffff', '#ff8ec7'];

type Confetti = {
    kind: 'confetti';
    x: number;
    y: number;
    vx: number;
    vy: number;
    gravity: number;
    drag: number;
    life: number;
    age: number;
    size: number;
    rot: number;
    vr: number;
    color: string;
};
type Spark = {
    kind: 'spark';
    x: number;
    y: number;
    vx: number;
    vy: number;
    gravity: number;
    drag: number;
    life: number;
    age: number;
    size: number;
    color: string;
};
type Star = { kind: 'star'; x: number; y: number; vx: number; vy: number; life: number; age: number; size: number; phase: number; color: string };
type Snow = { kind: 'snow'; x: number; y: number; vx: number; vy: number; life: number; age: number; size: number; phase: number };
type Particle = Confetti | Spark | Star | Snow;

const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

// Null when the browser gives no 2D context.
export function createCanvasEffect(
    canvas: HTMLCanvasElement,
    type: CanvasEffectType,
    { speed: speedSetting, intensity }: Pick<SectionEffect, 'speed' | 'intensity'>,
): CanvasEffectController | null {
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return null;

    let active = false;
    let raf = 0;
    let last = 0;
    let nextSpawn = 0;
    let particles: Particle[] = [];
    let cssW = 0;
    let cssH = 0;
    let dpr = 1;
    const isNormal = speedSetting === 'normal';
    const isStrong = intensity === 'strong';
    const density = isStrong ? 1.45 : 1;
    const speed = isNormal ? 1.18 : 0.82;

    function resize() {
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(1, Math.round(rect.width));
        const h = Math.max(1, Math.round(rect.height));
        const nextDpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
        if (w === cssW && h === cssH && nextDpr === dpr) return;
        cssW = w;
        cssH = h;
        dpr = nextDpr;
        canvas.width = Math.max(1, Math.round(w * dpr));
        canvas.height = Math.max(1, Math.round(h * dpr));
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawnRealistic() {
        const count = Math.round((isStrong ? 110 : 72) * density);
        for (let i = 0; i < count; i += 1) {
            const angle = randomInRange(-2.28, -0.86);
            const power = randomInRange(4.4, 9.6) * speed;
            particles.push({
                kind: 'confetti',
                x: cssW * 0.5 + randomInRange(-18, 18),
                y: cssH * 0.78,
                vx: Math.cos(angle) * power,
                vy: Math.sin(angle) * power,
                gravity: 0.16 * speed,
                drag: 0.992,
                life: randomInRange(105, 185),
                age: 0,
                size: randomInRange(5, 10) * (isStrong ? 1.12 : 0.94),
                rot: randomInRange(0, Math.PI * 2),
                vr: randomInRange(-0.22, 0.22),
                color: COLORS[i % COLORS.length],
            });
        }
    }

    function spawnFirework() {
        const x = randomInRange(cssW * 0.18, cssW * 0.82);
        const y = randomInRange(cssH * 0.18, cssH * 0.58);
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const count = Math.round((isStrong ? 72 : 46) * density);
        for (let i = 0; i < count; i += 1) {
            const angle = (Math.PI * 2 * i) / count + randomInRange(-0.08, 0.08);
            const power = randomInRange(1.8, 5.2) * speed;
            particles.push({
                kind: 'spark',
                x,
                y,
                vx: Math.cos(angle) * power,
                vy: Math.sin(angle) * power,
                gravity: 0.035 * speed,
                drag: 0.976,
                life: randomInRange(48, 90),
                age: 0,
                size: randomInRange(1.2, 2.7) * (isStrong ? 1.18 : 1),
                color,
            });
        }
    }

    function spawnStar(seed = false) {
        const count = seed ? Math.round((isStrong ? 34 : 22) * density) : 1;
        for (let i = 0; i < count; i += 1) {
            particles.push({
                kind: 'star',
                x: Math.random() * cssW,
                y: seed ? Math.random() * cssH : -12,
                vx: randomInRange(-0.12, 0.12) * speed,
                vy: randomInRange(0.08, 0.28) * speed,
                life: randomInRange(260, 520),
                age: Math.random() * 80,
                size: randomInRange(1.8, 4.4) * (isStrong ? 1.22 : 1),
                phase: Math.random() * Math.PI * 2,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
            });
        }
    }

    function spawnSnow(seed = false) {
        const count = seed ? Math.round((isStrong ? 64 : 42) * density) : 1;
        for (let i = 0; i < count; i += 1) {
            particles.push({
                kind: 'snow',
                x: Math.random() * cssW,
                y: seed ? Math.random() * cssH : -8,
                vx: randomInRange(-0.22, 0.22) * speed,
                vy: randomInRange(0.35, 0.9) * speed,
                life: 99999,
                age: 0,
                size: randomInRange(1.2, 3.8) * (isStrong ? 1.2 : 1),
                phase: Math.random() * Math.PI * 2,
            });
        }
    }

    function drawStar(p: Star, alpha: number) {
        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.phase + p.age * 0.018);
        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = p.color;
        ctx!.beginPath();
        for (let i = 0; i < 8; i += 1) {
            const a = (i * Math.PI) / 4 - Math.PI / 2;
            const r = i % 2 === 0 ? p.size : p.size * 0.34;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;
            if (i) ctx!.lineTo(x, y);
            else ctx!.moveTo(x, y);
        }
        ctx!.closePath();
        ctx!.fill();
        ctx!.restore();
    }

    // Moves one particle and draws it. False once it is gone.
    function updateAndDrawParticle(p: Particle, dt: number): boolean {
        p.age += dt;
        switch (p.kind) {
            case 'confetti': {
                p.vx *= Math.pow(p.drag, dt);
                p.vy = p.vy * Math.pow(p.drag, dt) + p.gravity * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.rot += p.vr * dt;
                const alpha = Math.max(0, 1 - p.age / p.life);
                if (alpha <= 0 || p.y > cssH + 40) return false;
                ctx!.save();
                ctx!.translate(p.x, p.y);
                ctx!.rotate(p.rot);
                ctx!.globalAlpha = alpha;
                ctx!.fillStyle = p.color;
                ctx!.fillRect(-p.size / 2, -p.size * 0.22, p.size, p.size * 0.44);
                ctx!.restore();
                return true;
            }
            case 'spark': {
                p.vx *= Math.pow(p.drag, dt);
                p.vy = p.vy * Math.pow(p.drag, dt) + p.gravity * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                const alpha = Math.max(0, 1 - p.age / p.life);
                if (alpha <= 0) return false;
                ctx!.globalAlpha = alpha;
                ctx!.fillStyle = p.color;
                ctx!.beginPath();
                ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx!.fill();
                return true;
            }
            case 'star': {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                const alpha = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(p.phase + p.age * 0.055));
                drawStar(p, alpha);
                return p.y < cssH + 18 && p.age < p.life;
            }
            case 'snow':
                p.phase += 0.018 * dt;
                p.x += (p.vx + Math.sin(p.phase) * 0.15) * dt;
                p.y += p.vy * dt;
                if (p.y > cssH + 8) {
                    p.y = -8;
                    p.x = Math.random() * cssW;
                }
                if (p.x < -8) p.x = cssW + 8;
                if (p.x > cssW + 8) p.x = -8;
                ctx!.globalAlpha = isStrong ? 0.9 : 0.68;
                ctx!.fillStyle = '#fff';
                ctx!.beginPath();
                ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx!.fill();
                return true;
        }
    }

    function updateAndDraw(dt: number) {
        particles = particles.filter((p) => updateAndDrawParticle(p, dt));
        ctx!.globalAlpha = 1;
    }

    function spawnDue(ts: number) {
        if (ts < nextSpawn) return;
        switch (type) {
            case 'canvasRealistic':
                spawnRealistic();
                nextSpawn = ts + (isNormal ? 3500 : 5200);
                break;
            case 'canvasFireworks':
                spawnFirework();
                nextSpawn = ts + (isNormal ? 720 : 1180);
                break;
            case 'canvasStars':
                spawnStar(false);
                if (isStrong) spawnStar(false);
                nextSpawn = ts + (isNormal ? 320 : 520);
                break;
            case 'canvasSnow':
                spawnSnow(false);
                if (isStrong) spawnSnow(false);
                nextSpawn = ts + (isNormal ? 65 : 110);
                break;
        }
    }

    function tick(ts: number) {
        if (!active) return;
        resize();
        const dt = Math.min(2.2, Math.max(0.25, (ts - (last || ts)) / 16.667));
        last = ts;
        ctx!.clearRect(0, 0, cssW, cssH);
        spawnDue(ts);
        updateAndDraw(dt);
        raf = requestAnimationFrame(tick);
    }

    return {
        start() {
            if (active) return;
            active = true;
            last = 0;
            resize();
            particles = [];
            nextSpawn = 0;
            if (type === 'canvasStars') spawnStar(true);
            if (type === 'canvasSnow') spawnSnow(true);
            raf = requestAnimationFrame(tick);
        },
        stop() {
            active = false;
            if (raf) {
                cancelAnimationFrame(raf);
                raf = 0;
            }
            particles = [];
            resize();
            ctx.clearRect(0, 0, cssW, cssH);
        },
    };
}
