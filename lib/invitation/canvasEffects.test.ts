import { createHash } from 'node:crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SectionEffect } from '@/lib/invitation/backgroundEffects';
import { CANVAS_EFFECTS, type CanvasEffectType, createCanvasEffect, isCanvasEffect } from '@/lib/invitation/canvasEffects';

import legacy from './legacyEffects.fixture.json';

// The fixture is the old effects-engine.js itself, run with a seeded Math.random:
// every canvas call it made over 400 frames, some of them late.

type Call = (string | number)[];

const round = (value: unknown) => (typeof value === 'number' ? Math.round(value * 1e6) / 1e6 : value);

function fakeCanvas(log: Call[]) {
    const ctx = new Proxy(
        {},
        {
            get:
                (_, name) =>
                (...args: unknown[]) =>
                    log.push([String(name), ...args.map(round)] as Call),
            set: (_, name, value) => {
                log.push([`set:${String(name)}`, round(value)] as Call);
                return true;
            },
        },
    );
    return {
        width: 0,
        height: 0,
        getContext: () => ctx,
        getBoundingClientRect: () => ({ width: 375, height: 600 }),
    } as unknown as HTMLCanvasElement;
}

function seeded(start: number) {
    let seed = start;
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function stubFrames() {
    let queue: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => queue.push(callback));
    vi.stubGlobal('cancelAnimationFrame', () => {
        queue = [];
    });
    return {
        run(ts: number) {
            const callbacks = queue;
            queue = [];
            callbacks.forEach((callback) => callback(ts));
        },
        waiting: () => queue.length,
    };
}

function record(type: CanvasEffectType, speed: SectionEffect['speed'], intensity: SectionEffect['intensity']): Call[] {
    const log: Call[] = [];
    const frames = stubFrames();
    vi.spyOn(Math, 'random').mockImplementation(seeded(1));
    vi.stubGlobal('devicePixelRatio', 2);
    const controller = createCanvasEffect(fakeCanvas(log), type, { speed, intensity });
    controller?.start();
    let ts = 1000;
    for (let frame = 1; frame <= 400; frame += 1) {
        ts += frame % 7 === 0 ? 60 : 16.667;
        frames.run(ts);
    }
    controller?.stop();
    log.push(['stopped', frames.waiting()]);
    return log;
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('createCanvasEffect', () => {
    const cases = CANVAS_EFFECTS.flatMap((type) =>
        (['slow', 'normal'] as const).flatMap((speed) => (['subtle', 'strong'] as const).map((intensity) => [type, speed, intensity] as const)),
    );

    it.each(cases)('draws exactly what the old engine draws: %s, %s, %s', (type, speed, intensity) => {
        const expected = legacy.canvas[`${type}/${speed}/${intensity}` as keyof typeof legacy.canvas];
        const log = record(type, speed, intensity);
        expect(log.slice(0, expected.head.length)).toEqual(expected.head);
        expect(log).toHaveLength(expected.calls);
        expect(createHash('sha256').update(JSON.stringify(log)).digest('hex')).toBe(expected.sha256);
    });

    it('asks for no more frames once stopped, and clears the canvas', () => {
        const log: Call[] = [];
        const frames = stubFrames();
        const controller = createCanvasEffect(fakeCanvas(log), 'canvasSnow', { speed: 'slow', intensity: 'subtle' });
        controller?.start();
        frames.run(1000);
        expect(frames.waiting()).toBe(1);
        controller?.stop();
        expect(frames.waiting()).toBe(0);
        expect(log.at(-1)?.[0]).toBe('clearRect');
    });

    it('starts afresh after being stopped', () => {
        const frames = stubFrames();
        const log: Call[] = [];
        const controller = createCanvasEffect(fakeCanvas(log), 'canvasRealistic', { speed: 'slow', intensity: 'subtle' });
        controller?.start();
        frames.run(1000);
        const firstBurst = log.filter(([name]) => name === 'fillRect').length;
        controller?.stop();
        log.length = 0;
        controller?.start();
        frames.run(5000);
        expect(log.filter(([name]) => name === 'fillRect')).toHaveLength(firstBurst);
    });

    it('starting twice runs one loop', () => {
        const frames = stubFrames();
        const controller = createCanvasEffect(fakeCanvas([]), 'canvasStars', { speed: 'slow', intensity: 'subtle' });
        controller?.start();
        controller?.start();
        expect(frames.waiting()).toBe(1);
    });

    it('gives nothing when the browser has no 2D context', () => {
        const canvas = { getContext: () => null } as unknown as HTMLCanvasElement;
        expect(createCanvasEffect(canvas, 'canvasSnow', { speed: 'slow', intensity: 'subtle' })).toBeNull();
    });
});

describe('isCanvasEffect', () => {
    it('knows the canvas effects', () => {
        expect(CANVAS_EFFECTS.every(isCanvasEffect)).toBe(true);
        expect(isCanvasEffect('slowZoom')).toBe(false);
    });
});
