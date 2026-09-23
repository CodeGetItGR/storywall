import { type RefObject, useEffect, useRef } from 'react';

export function useLandingFeatureCarousel(landingRef: RefObject<HTMLElement | null>, paused = false) {
    const pausedRef = useRef(paused);
    const syncRef = useRef<(() => void) | null>(null);

    // The track keeps its listeners across a pause so nothing is rebound; the
    // running effect just re-reads the preference and starts or stops.
    useEffect(() => {
        pausedRef.current = paused;
        syncRef.current?.();
    }, [paused]);

    useEffect(() => {
        const root = landingRef.current;
        if (!root) return;
        const track = root.querySelector<HTMLElement>('.sw-feature-track');
        const section = root.querySelector<HTMLElement>('.sw-feature-block');
        const left = root.querySelector<HTMLButtonElement>('.sw-feature-mobile-arrow-left');
        const right = root.querySelector<HTMLButtonElement>('.sw-feature-mobile-arrow-right');
        if (!track || !section || !left || !right) return;

        const abortController = new AbortController();
        const { signal } = abortController;
        const mobileQuery = window.matchMedia('(max-width:760px)');
        const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion:reduce)');
        let autoFrame = 0;
        let tweenFrame = 0;
        let lastTimestamp = 0;
        let visible = false;
        let interacting = false;
        let resumeTimeout = 0;
        let cycle = 0;
        let position = 0;

        const originals = () => [...track.querySelectorAll<HTMLElement>('.sw-feature-item:not(.sw-marquee-clone)')];
        const firstClone = () => track.querySelector<HTMLElement>('.sw-feature-item.sw-marquee-clone');
        const recalculate = () => {
            const items = originals();
            const clone = firstClone();
            if (items.length && clone) cycle = clone.offsetLeft - items[0].offsetLeft;
        };
        const normalize = (value: number) => {
            if (!cycle) return value;
            const normalized = value % cycle;
            return normalized < 0 ? normalized + cycle : normalized;
        };
        const stopAuto = () => {
            if (autoFrame) cancelAnimationFrame(autoFrame);
            autoFrame = 0;
            lastTimestamp = 0;
        };
        const stopTween = () => {
            if (tweenFrame) cancelAnimationFrame(tweenFrame);
            tweenFrame = 0;
        };
        const shouldAuto = () =>
            !pausedRef.current && mobileQuery.matches && visible && !interacting && !reduceMotionQuery.matches && !document.hidden && !tweenFrame;

        const autoTick = (timestamp: number) => {
            if (!shouldAuto()) {
                stopAuto();
                return;
            }
            if (!lastTimestamp) {
                lastTimestamp = timestamp;
                position = track.scrollLeft;
            }
            const elapsed = Math.min(32, timestamp - lastTimestamp);
            lastTimestamp = timestamp;
            if (!cycle) recalculate();
            position += 28.6 * (elapsed / 1000);
            if (cycle > 0 && position >= cycle) position -= cycle;
            track.scrollLeft = position;
            autoFrame = requestAnimationFrame(autoTick);
        };
        const startAuto = () => {
            if (!shouldAuto() || autoFrame) return;
            recalculate();
            position = track.scrollLeft;
            autoFrame = requestAnimationFrame(autoTick);
        };
        const pause = () => {
            interacting = true;
            stopAuto();
            stopTween();
            window.clearTimeout(resumeTimeout);
            position = track.scrollLeft;
        };
        const resumeSoon = (delay = 900) => {
            window.clearTimeout(resumeTimeout);
            resumeTimeout = window.setTimeout(() => {
                interacting = false;
                position = track.scrollLeft;
                startAuto();
            }, delay);
        };
        const easeInOutCubic = (value: number) => (value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2);

        const tweenTo = (target: number) => {
            stopAuto();
            stopTween();
            interacting = true;
            window.clearTimeout(resumeTimeout);
            recalculate();
            let start = track.scrollLeft;
            let destination = target;
            if (destination < 0 && cycle > 0) {
                start += cycle;
                track.scrollLeft = start;
                destination += cycle;
            }
            const distance = destination - start;
            if (reduceMotionQuery.matches || Math.abs(distance) < 1) {
                track.scrollLeft = normalize(destination);
                position = track.scrollLeft;
                interacting = false;
                startAuto();
                return;
            }
            const startedAt = performance.now();
            const frame = (timestamp: number) => {
                const progress = Math.min(1, (timestamp - startedAt) / 430);
                track.scrollLeft = start + distance * easeInOutCubic(progress);
                if (progress < 1) {
                    tweenFrame = requestAnimationFrame(frame);
                    return;
                }
                tweenFrame = 0;
                track.scrollLeft = cycle > 0 ? normalize(track.scrollLeft) : track.scrollLeft;
                position = track.scrollLeft;
                resumeSoon(650);
            };
            tweenFrame = requestAnimationFrame(frame);
        };

        const arrowStep = (direction: -1 | 1) => {
            if (!mobileQuery.matches) return;
            pause();
            recalculate();
            const items = originals();
            if (!items.length || !cycle) return;
            const base = items[0].offsetLeft;
            const offsets = items.map((item) => item.offsetLeft - base);
            const current = normalize(track.scrollLeft);
            let target: number | undefined;
            if (direction > 0) target = offsets.find((offset) => offset > current + 6) ?? cycle;
            else {
                const previous = offsets.filter((offset) => offset < current - 6);
                target = previous.length ? previous.at(-1) : -(cycle - offsets.at(-1)!);
            }
            tweenTo(target ?? 0);
        };

        left.addEventListener(
            'click',
            (event) => {
                event.preventDefault();
                arrowStep(-1);
            },
            { signal },
        );
        right.addEventListener(
            'click',
            (event) => {
                event.preventDefault();
                arrowStep(1);
            },
            { signal },
        );
        track.addEventListener('touchstart', pause, { passive: true, signal });
        track.addEventListener('touchend', () => resumeSoon(), { passive: true, signal });
        track.addEventListener('touchcancel', () => resumeSoon(), { passive: true, signal });
        track.addEventListener(
            'wheel',
            () => {
                if (!mobileQuery.matches) return;
                pause();
                resumeSoon();
            },
            { passive: true, signal },
        );

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries.find((candidate) => candidate.target === section);
                if (!entry) return;
                visible = entry.isIntersecting && entry.intersectionRatio >= 0.18;
                if (visible) {
                    interacting = false;
                    startAuto();
                } else {
                    stopAuto();
                    stopTween();
                }
            },
            { root: null, threshold: [0, 0.18, 0.35] },
        );
        observer.observe(section);

        // Only a track that can actually scroll earns a tab stop; on desktop it
        // wraps instead, so focusing it would do nothing.
        const syncTrackFocusability = () => {
            if (track.scrollWidth > track.clientWidth + 1) track.setAttribute('tabindex', '0');
            else track.removeAttribute('tabindex');
        };

        const resetForViewport = () => {
            syncTrackFocusability();
            recalculate();
            position = track.scrollLeft;
            if (!mobileQuery.matches) {
                stopAuto();
                stopTween();
                track.scrollLeft = 0;
                position = 0;
            } else startAuto();
        };
        window.addEventListener('resize', resetForViewport, { passive: true, signal });
        document.addEventListener('visibilitychange', () => (document.hidden ? (stopAuto(), stopTween()) : startAuto()), { signal });
        mobileQuery.addEventListener('change', resetForViewport, { signal });
        reduceMotionQuery.addEventListener('change', () => (reduceMotionQuery.matches ? stopAuto() : startAuto()), { signal });
        syncRef.current = () => {
            if (pausedRef.current) {
                stopAuto();
                stopTween();
                window.clearTimeout(resumeTimeout);
            } else startAuto();
        };
        recalculate();
        syncTrackFocusability();
        startAuto();

        return () => {
            syncRef.current = null;
            abortController.abort();
            observer.disconnect();
            stopAuto();
            stopTween();
            window.clearTimeout(resumeTimeout);
        };
    }, [landingRef]);
}
