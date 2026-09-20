import { type RefObject, useEffect } from 'react';

export function useLandingStoryInteractions(landingRef: RefObject<HTMLElement | null>) {
    useEffect(() => {
        const root = landingRef.current;
        if (!root) return;

        const abortController = new AbortController();
        const { signal } = abortController;
        const rows = [...root.querySelectorAll<HTMLElement>('.story-row')];
        const observers: Array<IntersectionObserver | MutationObserver> = [];
        const hintTimeouts: number[] = [];
        const seenHints = new Set<number>();
        let animationFrame = 0;

        const accordionsFor = (rowIndex: number) => [
            ...root.querySelectorAll<HTMLElement>(`.sw-wedding-accordion[data-story-accordion="${rowIndex}"]`),
        ];

        const setAccordionIndex = (rowIndex: number, activeIndex: number) => {
            accordionsFor(rowIndex).forEach((accordion) => {
                accordion.querySelectorAll<HTMLElement>('.sw-wedding-panel').forEach((panel, index) => {
                    const active = index === activeIndex;
                    panel.setAttribute('aria-pressed', String(active));
                });
            });
        };

        const triggerHint = (rowIndex: number) => {
            if (seenHints.has(rowIndex)) return;
            const firstPanels = accordionsFor(rowIndex)
                .map((accordion) => accordion.querySelector<HTMLElement>('.sw-wedding-panel:first-child'))
                .filter((panel): panel is HTMLElement => Boolean(panel));
            if (!firstPanels.length) return;
            seenHints.add(rowIndex);
            firstPanels.forEach((panel) => {
                panel.classList.remove('sw-panel-hint');
                void panel.offsetWidth;
                panel.classList.add('sw-panel-hint');
                const timeout = window.setTimeout(() => panel.classList.remove('sw-panel-hint'), 2900);
                hintTimeouts.push(timeout);
            });
        };

        let activeRow = 0;
        const activateRow = (index: number) => {
            if (index !== activeRow && (index === 2 || index === 3)) setAccordionIndex(index, 0);
            activeRow = index;
            rows.forEach((row, rowIndex) => {
                row.dataset.active = String(rowIndex === index);
            });
            triggerHint(index);
        };

        rows.forEach((row, index) => {
            row.addEventListener('mouseenter', () => activateRow(index), { signal });
            row.addEventListener('focus', () => activateRow(index), { signal });
        });

        root.querySelectorAll<HTMLElement>('.sw-wedding-accordion[data-story-accordion]').forEach((accordion) => {
            const rowIndex = Number(accordion.dataset.storyAccordion);
            accordion.querySelectorAll<HTMLElement>('.sw-wedding-panel').forEach((panel, panelIndex) => {
                panel.addEventListener('click', () => setAccordionIndex(rowIndex, panelIndex), { signal });
                if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
                    panel.addEventListener('mouseenter', () => setAccordionIndex(rowIndex, panelIndex), { signal });
                }
            });
        });

        if ('IntersectionObserver' in window) {
            const revealObserver = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (!entry.isIntersecting) return;
                        const row = entry.target as HTMLElement;
                        row.dataset.visible = 'true';
                        triggerHint(Number(row.dataset.row));
                    });
                },
                { root, rootMargin: '0px 0px -8% 0px', threshold: 0.22 }
            );
            rows.forEach((row) => revealObserver.observe(row));
            observers.push(revealObserver);
        }

        const updateRows = () => {
            if (window.innerWidth > 760) {
                let nextIndex = 0;
                rows.forEach((row, index) => {
                    const triggerY = index === 1 ? window.innerHeight * 0.34 : window.innerHeight * 0.58;
                    if (row.getBoundingClientRect().top <= triggerY) nextIndex = index;
                });
                activateRow(nextIndex);
            } else {
                rows.forEach((row) => {
                    const rect = row.getBoundingClientRect();
                    const center = rect.top + rect.height / 2;
                    const delta = Math.max(-1, Math.min(1, (center - window.innerHeight / 2) / window.innerHeight));
                    row.style.setProperty('--mobile-parallax', `${delta * -34}px`);
                });
            }
            animationFrame = 0;
        };

        const scheduleRows = () => {
            if (!animationFrame) animationFrame = requestAnimationFrame(updateRows);
        };
        root.addEventListener('scroll', scheduleRows, { passive: true, signal });
        window.addEventListener('resize', scheduleRows, { passive: true, signal });

        const filmstrip = root.querySelector<HTMLElement>('.sw-filmstrip-more');
        const filmstripCards = [...(filmstrip?.querySelectorAll<HTMLElement>('.sw-filmstrip-card') ?? [])];
        const caption = filmstrip?.querySelector<HTMLElement>('.sw-filmstrip-caption');
        const captionTitle = filmstrip?.querySelector<HTMLElement>('.sw-filmstrip-caption-title');
        const captionText = filmstrip?.querySelector<HTMLElement>('.sw-filmstrip-caption-text');
        let captionTimeout = 0;

        const activateFilmstrip = (index: number) => {
            filmstripCards.forEach((card, cardIndex) => {
                card.setAttribute('aria-pressed', String(cardIndex === index));
            });
            if (caption) caption.dataset.changing = 'true';
            window.clearTimeout(captionTimeout);
            captionTimeout = window.setTimeout(() => {
                const card = filmstripCards[index];
                if (captionTitle) captionTitle.textContent = card?.dataset.captionTitle ?? '';
                if (captionText) captionText.textContent = card?.dataset.captionText ?? '';
                if (caption) caption.dataset.changing = 'false';
            }, 120);
        };

        filmstripCards.forEach((card, index) => {
            card.addEventListener('click', () => activateFilmstrip(index), { signal });
            if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
                card.addEventListener('mouseenter', () => activateFilmstrip(index), { signal });
            }
        });

        activateRow(0);
        updateRows();

        return () => {
            abortController.abort();
            observers.forEach((observer) => observer.disconnect());
            hintTimeouts.forEach(window.clearTimeout);
            window.clearTimeout(captionTimeout);
            if (animationFrame) cancelAnimationFrame(animationFrame);
        };
    }, [landingRef]);
}
