import { act, renderHook } from '@testing-library/react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DOUBLE_TAP_MS, DRAG_START_SLOP, nextGestureKey, useDragHandle } from '@/hooks/useDragHandle';

// Animation frames run when the test says so.
let frames: FrameRequestCallback[] = [];
function runFrames() {
    const queued = frames;
    frames = [];
    act(() => queued.forEach((callback) => callback(0)));
}

const target = { setPointerCapture: vi.fn(), hasPointerCapture: () => true, releasePointerCapture: vi.fn() };

function pointer(clientX: number, clientY: number, extra: { pointerId?: number; pointerType?: string; button?: number } = {}) {
    return {
        pointerId: 1,
        pointerType: 'touch',
        button: 0,
        clientX,
        clientY,
        preventDefault: vi.fn(),
        currentTarget: target,
        ...extra,
    } as unknown as PointerEvent<HTMLElement>;
}

function key(name: string, shiftKey = false) {
    return { key: name, shiftKey, preventDefault: vi.fn() } as unknown as KeyboardEvent<HTMLElement>;
}

function setup(start: () => { from: number } | null = () => ({ from: 10 })) {
    const move = vi.fn();
    const step = vi.fn();
    const reset = vi.fn();
    const hook = renderHook(() => useDragHandle({ start, move, step, reset }));
    const handlers = () => hook.result.current.handlers;
    // A press and release in place: a tap.
    const tap = (x = 0, y = 0) =>
        act(() => {
            handlers().onPointerDown(pointer(x, y));
            handlers().onPointerUp(pointer(x, y));
        });
    return { hook, handlers, move, step, reset, tap };
}

describe('useDragHandle', () => {
    let now = 1_000;

    beforeEach(() => {
        frames = [];
        vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
        vi.stubGlobal('cancelAnimationFrame', () => {
            frames = [];
        });
        vi.spyOn(Date, 'now').mockImplementation(() => now);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('drags from where the press started, once a frame', () => {
        const { hook, handlers, move } = setup();
        act(() => handlers().onPointerDown(pointer(100, 100)));
        expect(hook.result.current.isDragging).toBe(true);
        expect(target.setPointerCapture).toHaveBeenCalledWith(1);

        act(() => {
            handlers().onPointerMove(pointer(110, 120));
            handlers().onPointerMove(pointer(115, 140));
        });
        expect(move).not.toHaveBeenCalled();
        runFrames();
        expect(move).toHaveBeenCalledTimes(1);
        expect(move).toHaveBeenCalledWith({ x: 15, y: 40 }, { from: 10 });

        act(() => handlers().onPointerUp(pointer(115, 140)));
        expect(hook.result.current.isDragging).toBe(false);
    });

    it('ignores a press that moves less than the start slop', () => {
        const { handlers, move } = setup();
        act(() => {
            handlers().onPointerDown(pointer(0, 0));
            handlers().onPointerMove(pointer(0, DRAG_START_SLOP - 1));
        });
        runFrames();
        expect(move).not.toHaveBeenCalled();
    });

    it('sends the last move on release, but not when the browser takes the touch', () => {
        const { handlers, move } = setup();
        act(() => {
            handlers().onPointerDown(pointer(0, 0));
            handlers().onPointerMove(pointer(0, 30));
            handlers().onPointerUp(pointer(0, 30));
        });
        expect(move).toHaveBeenCalledWith({ x: 0, y: 30 }, { from: 10 });

        move.mockClear();
        act(() => {
            handlers().onPointerDown(pointer(0, 0));
            handlers().onPointerMove(pointer(0, 30));
            handlers().onPointerCancel(pointer(0, 30));
        });
        runFrames();
        expect(move).not.toHaveBeenCalled();
    });

    it('ignores other pointers and buttons, and a press with nothing to drag', () => {
        const { handlers, move } = setup();
        act(() => handlers().onPointerDown(pointer(0, 0, { pointerType: 'mouse', button: 2 })));
        act(() => handlers().onPointerMove(pointer(0, 50)));
        runFrames();
        expect(move).not.toHaveBeenCalled();

        act(() => {
            handlers().onPointerDown(pointer(0, 0));
            handlers().onPointerMove(pointer(0, 50, { pointerId: 2 }));
        });
        runFrames();
        expect(move).not.toHaveBeenCalled();

        const empty = setup(() => null);
        act(() => {
            empty.handlers().onPointerDown(pointer(0, 0));
            empty.handlers().onPointerMove(pointer(0, 50));
        });
        runFrames();
        expect(empty.hook.result.current.isDragging).toBe(false);
        expect(empty.move).not.toHaveBeenCalled();
    });

    it('resets on a double tap, not on two slow or distant taps', () => {
        const { tap, reset } = setup();
        tap();
        now += DOUBLE_TAP_MS + 1;
        tap();
        expect(reset).not.toHaveBeenCalled();

        now += 100;
        tap(60, 0);
        expect(reset).not.toHaveBeenCalled();

        now += 100;
        tap(62, 2);
        expect(reset).toHaveBeenCalledTimes(1);

        // A third tap starts over.
        now += 100;
        tap(62, 2);
        expect(reset).toHaveBeenCalledTimes(1);
    });

    it('does not count a drag as a tap', () => {
        const { handlers, tap, reset } = setup();
        act(() => {
            handlers().onPointerDown(pointer(0, 0));
            handlers().onPointerMove(pointer(0, 30));
            handlers().onPointerUp(pointer(0, 30));
        });
        now += 100;
        tap(0, 30);
        expect(reset).not.toHaveBeenCalled();
    });

    it('steps with the arrow keys and resets with Home', () => {
        const { handlers, step, reset } = setup();
        handlers().onKeyDown(key('ArrowUp'));
        handlers().onKeyDown(key('ArrowLeft', true));
        handlers().onKeyDown(key('Home'));
        handlers().onKeyDown(key('a'));
        expect(step.mock.calls).toEqual([[1], [-10]]);
        expect(reset).toHaveBeenCalledTimes(1);
    });

    it('gives every drag its own merge key', () => {
        expect(nextGestureKey('spacer')).not.toBe(nextGestureKey('spacer'));
        expect(nextGestureKey('spacer')).toMatch(/^spacer:drag-\d+$/);
    });
});
