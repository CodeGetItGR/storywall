import { type RefObject, useEffect } from 'react';

const clamp = (value: number, minimum = 0, maximum = 1) => Math.min(Math.max(value, minimum), maximum);
const smooth = (value: number) => {
    const progress = clamp(value);
    return progress * progress * (3 - 2 * progress);
};
const smoother = (value: number) => {
    const progress = clamp(value);
    return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
};

export function useLandingStackMotion(landingRef: RefObject<HTMLElement | null>) {
    useEffect(() => {
        const root = landingRef.current;
        const stack = root?.querySelector<HTMLElement>('#swxStack');
        const stage = stack?.querySelector<HTMLElement>('.swx-stage');
        const socialLayer = stack?.querySelector<HTMLElement>('.swx-layer-1');
        const hostLayer = stack?.querySelector<HTMLElement>('#swxLayer2');
        if (!root || !stack || !stage || !socialLayer || !hostLayer) return;

        const abortController = new AbortController();
        const { signal } = abortController;
        const socialCards = [...socialLayer.querySelectorAll<HTMLElement>('[data-swx-p1]')];
        const hostCards = [...hostLayer.querySelectorAll<HTMLElement>('[data-swx-p2]')];
        const socialCenter = socialLayer.querySelector<HTMLElement>('.swx-center');
        const hostCenter = hostLayer.querySelector<HTMLElement>('.swx-center');
        const socialTop = socialLayer.querySelector<HTMLElement>('.swx-topbar');
        const socialLine = socialLayer.querySelector<HTMLElement>('.swx-line');
        const hostTop = hostLayer.querySelector<HTMLElement>('.swx-topbar');
        const hostLine = hostLayer.querySelector<HTMLElement>('.swx-line');
        const socialPhone = socialLayer.querySelector<HTMLElement>('.swx-mobile-phone-visual');
        const hostPhone = hostLayer.querySelector<HTMLElement>('.swx-mobile-host-phone-visual');
        const socialAssets = [...socialLayer.querySelectorAll<HTMLElement>('.swx-ref-asset')];
        const hostAssets = [...hostLayer.querySelectorAll<HTMLElement>('.swx-host-ref')];
        let socialStart = 0;
        let hostStart = 0;
        let pointerX = 0;
        let pointerY = 0;
        let animationFrame = 0;

        const autoProgress = (start: number, duration: number, timestamp: number) => (start ? clamp((timestamp - start) / duration) : 0);
        const revealCards = (cards: HTMLElement[], amount: number, exit: number, mobile: boolean, isHost = false) => {
            cards.forEach((card, index) => {
                const delay = index * (mobile ? (isHost ? 0.026 : 0.03) : isHost ? 0.022 : 0.024);
                const raw = clamp((amount - delay) / (mobile ? (isHost ? 0.3 : 0.31) : isHost ? 0.26 : 0.27));
                const movement = smoother(raw);
                const fade = 0.5 - 0.5 * Math.cos(Math.PI * raw);
                const centerX = card.offsetLeft + card.offsetWidth / 2;
                const centerY = card.offsetTop + card.offsetHeight / 2;
                const side = centerX < stage.clientWidth / 2 ? -1 : 1;
                const vertical = centerY < stage.clientHeight / 2 ? -1 : 1;

                if (isHost) {
                    const x = side * (mobile ? 34 : 58) * (1 - movement);
                    const y = vertical * (mobile ? 22 : 34) * (1 - movement);
                    card.style.opacity = fade.toFixed(3);
                    card.style.transform = `translate3d(${x}px,${y}px,0) scale(${0.965 + 0.035 * movement})`;
                    return;
                }

                const exitMovement = smoother(exit);
                const enterX = mobile ? 0 : side * (32 + (index % 3) * 9) * (1 - movement);
                const enterY = (index < 4 ? -1 : 1) * (mobile ? 18 : 27) * (1 - movement);
                const exitX = side * (mobile ? 42 : 86) * exitMovement;
                const exitY = vertical * (mobile ? 18 : 34) * exitMovement;
                const scale = (0.985 + 0.015 * movement) * (1 - 0.055 * exitMovement);
                const rotate = side * exitMovement * (mobile ? 1.4 : 2.4);
                card.style.opacity = (fade * Math.pow(1 - exitMovement, 1.15)).toFixed(3);
                card.style.transform = `translate3d(${enterX + exitX}px,${enterY + exitY}px,0) scale(${scale}) rotate(${rotate}deg)`;
            });
        };

        const setPhoneFade = (phone: HTMLElement | null, assets: HTMLElement[], phase: number, host: boolean) => {
            if (!phone) return;
            const prefix = host ? '--swx-host-' : '--swx-';
            phone.style.setProperty(`${prefix}phone-opacity`, (0.62 * (1 - phase * 0.94)).toFixed(3));
            phone.style.setProperty(`${prefix}phone-brightness`, (1 - phase * 0.68).toFixed(3));
            phone.style.setProperty(`${prefix}phone-saturation`, (1 - phase * 0.3).toFixed(3));
            phone.style.setProperty(`${prefix}phone-blur`, `${(phase * (host ? 1.2 : 1.25)).toFixed(2)}px`);
            phone.style.setProperty(`${prefix}phone-scale`, (1 - phase * (host ? 0.1 : 0.105)).toFixed(3));
            phone.style.setProperty(`${prefix}phone-y`, `${(phase * (host ? 8 : 9)).toFixed(1)}px`);
            assets.forEach((asset) => {
                let growth = 0.12;
                if (asset.matches('.swx-motion-card,.swx-host-motion-dashboard')) growth = 0.18;
                else if (asset.matches('.swx-motion-music,.swx-host-motion-report')) growth = 0.17;
                else if (asset.matches('.swx-motion-comment,.swx-host-motion-menu')) growth = 0.15;
                else if (asset.matches('.swx-host-motion-story,.swx-host-motion-music')) growth = 0.15;
                else if (asset.matches('.swx-host-motion-card')) growth = 0.14;
                const property = host ? '--swx-host-grow' : '--swx-mobile-grow';
                asset.style.setProperty(property, (1 + growth * phase).toFixed(3));
            });
        };

        const update = () => {
            const rect = stack.getBoundingClientRect();
            const progress = clamp(-rect.top / Math.max(stack.offsetHeight - window.innerHeight, 1));
            const mobile = window.innerWidth <= 760;
            const timestamp = performance.now();
            const visible = rect.bottom > 0 && rect.top < window.innerHeight;
            let socialEntrance: number;

            if (mobile) {
                socialEntrance = smooth(clamp((progress - 0.035) / 0.245));
                socialStart = 0;
            } else {
                if (visible && progress < 0.47 && !socialStart) socialStart = timestamp;
                if (!visible && rect.top > window.innerHeight * 0.9) socialStart = 0;
                socialEntrance = autoProgress(socialStart, 2300, timestamp);
            }

            const socialExit = mobile ? clamp((progress - 0.32) / 0.18) : clamp((progress - 0.3) / 0.17);
            revealCards(socialCards, socialEntrance, socialExit, mobile);
            const socialTitleExit = mobile ? smooth(clamp((progress - 0.3) / 0.12)) : smooth(clamp((progress - 0.275) / 0.115));
            if (socialCenter) {
                socialCenter.style.opacity = (1 - socialTitleExit).toFixed(3);
                socialCenter.style.transform = `translate(-50%,-50%) translateY(${-10 * socialTitleExit}px) scale(${1 - 0.035 * socialTitleExit})`;
                socialCenter.style.filter = `blur(${(0.55 * socialTitleExit).toFixed(2)}px)`;
            }
            const socialChromeExit = mobile ? smooth(clamp((progress - 0.35) / 0.12)) : smooth(clamp((progress - 0.33) / 0.12));
            if (socialTop) socialTop.style.opacity = (1 - socialChromeExit).toFixed(3);
            if (socialLine) socialLine.style.opacity = (1 - socialChromeExit).toFixed(3);

            const mouseX = mobile ? 0 : pointerX;
            const mouseY = mobile ? 0 : pointerY;
            socialLayer.style.setProperty('--swx-g1x', `${10 + progress * 58 + mouseX * 10}%`);
            socialLayer.style.setProperty('--swx-g1y', `${12 + progress * 42 + mouseY * 9}%`);
            socialLayer.style.setProperty('--swx-g2x', `${92 - progress * 54 - mouseX * 9}%`);
            socialLayer.style.setProperty('--swx-g2y', `${88 - progress * 46 - mouseY * 8}%`);
            socialLayer.style.setProperty('--swx-g1a', `${0.34 + progress * 0.18}`);
            socialLayer.style.setProperty('--swx-g2a', `${0.24 + progress * 0.14}`);
            socialLayer.style.setProperty('--swx-angle', `${135 + progress * 28 + mouseX * 14 - mouseY * 8}deg`);
            socialLayer.style.setProperty('--swx-photo-x', `${50 + mouseX * 4 + (progress - 0.5) * 2}%`);
            socialLayer.style.setProperty('--swx-photo-y', `${50 + mouseY * 3 + (progress - 0.5) * 2}%`);

            const handoff = mobile ? smoother(clamp((progress - 0.34) / 0.23)) : smoother(clamp((progress - 0.43) / 0.2));
            hostLayer.style.opacity = handoff.toFixed(3);
            hostLayer.style.transform = `translate3d(0,${(7.5 * (1 - handoff)).toFixed(2)}%,0) scale(${(0.987 + 0.013 * handoff).toFixed(4)})`;
            hostLayer.style.pointerEvents = handoff > 0.96 ? 'auto' : 'none';
            socialLayer.style.filter = `brightness(${(1 - 0.22 * handoff).toFixed(3)}) saturate(${(1 - 0.1 * handoff).toFixed(3)})`;
            hostLayer.style.setProperty('--swx-g1x', `${8 + handoff * 62 + mouseX * 10}%`);
            hostLayer.style.setProperty('--swx-g1y', `${12 + handoff * 50 + mouseY * 9}%`);
            hostLayer.style.setProperty('--swx-g2x', `${94 - handoff * 58 - mouseX * 9}%`);
            hostLayer.style.setProperty('--swx-g2y', `${90 - handoff * 52 - mouseY * 8}%`);
            hostLayer.style.setProperty('--swx-g1a', `${0.4 + handoff * 0.22}`);
            hostLayer.style.setProperty('--swx-g2a', `${0.3 + handoff * 0.22}`);
            hostLayer.style.setProperty('--swx-angle', `${150 - handoff * 30 + mouseX * 14 - mouseY * 8}deg`);

            const hostTitleEntrance = mobile ? smooth(clamp((progress - 0.4) / 0.18)) : smooth(clamp((progress - 0.49) / 0.13));
            if (hostCenter) {
                hostCenter.style.opacity = hostTitleEntrance.toFixed(3);
                hostCenter.style.transform = `translate(-50%,-50%) translateY(${18 * (1 - hostTitleEntrance)}px) scale(${0.97 + 0.03 * hostTitleEntrance})`;
                hostCenter.style.filter = `blur(${(0.75 * (1 - hostTitleEntrance)).toFixed(2)}px)`;
            }
            if (hostTop) hostTop.style.opacity = hostTitleEntrance.toFixed(3);
            if (hostLine) hostLine.style.opacity = hostTitleEntrance.toFixed(3);
            if (handoff > 0.55 && !hostStart) hostStart = timestamp;
            if (handoff < 0.18) hostStart = 0;
            const hostEntrance = mobile ? smooth(clamp((progress - 0.43) / 0.31)) : autoProgress(hostStart, 2300, timestamp);
            revealCards(hostCards, hostEntrance, 0, mobile, true);

            if (mobile) {
                socialLayer.style.setProperty('--swx-mobile-dim', socialEntrance.toFixed(3));
                setPhoneFade(socialPhone, socialAssets, socialEntrance, false);
                setPhoneFade(hostPhone, hostAssets, smooth(clamp((progress - 0.6) / 0.23)), true);
            }

            animationFrame = 0;
            if ((!mobile && socialStart && socialEntrance < 1) || (hostStart && hostEntrance < 1)) schedule();
        };
        const schedule = () => {
            if (!animationFrame) animationFrame = requestAnimationFrame(update);
        };

        if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
            stack.addEventListener(
                'pointermove',
                (event) => {
                    const rect = stack.getBoundingClientRect();
                    pointerX = clamp(((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2, -1, 1);
                    pointerY = clamp(((event.clientY - Math.max(rect.top, 0)) / Math.max(window.innerHeight, 1) - 0.5) * 2, -1, 1);
                    schedule();
                },
                { passive: true, signal }
            );
            stack.addEventListener(
                'pointerleave',
                () => {
                    pointerX = 0;
                    pointerY = 0;
                    schedule();
                },
                { signal }
            );
        }

        window.addEventListener('scroll', schedule, { passive: true, signal });
        window.addEventListener('resize', schedule, { passive: true, signal });
        update();

        return () => {
            abortController.abort();
            if (animationFrame) cancelAnimationFrame(animationFrame);
        };
    }, [landingRef]);
}
