import { act } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useTypewriter } from '@/hooks/useTypewriter';

const motion = vi.hoisted(() => ({ reduce: null as boolean | null }));

vi.mock('framer-motion', () => ({ useReducedMotion: () => motion.reduce }));

const WORDS = ['Γάμο', 'Βάπτιση'];

function Probe() {
    return <span>{useTypewriter(WORDS, false).text}</span>;
}

afterEach(() => {
    motion.reduce = null;
    document.body.innerHTML = '';
});

describe('useTypewriter', () => {
    it('hydrates like the server for a visitor who prefers less motion, then shows the first word', async () => {
        const container = document.createElement('div');
        container.innerHTML = renderToString(<Probe />);
        document.body.appendChild(container);
        motion.reduce = true;
        const onRecoverableError = vi.fn();

        await act(async () => {
            hydrateRoot(container, <Probe />, { onRecoverableError });
        });

        expect(onRecoverableError).not.toHaveBeenCalled();
        expect(container).toHaveTextContent('Γάμο');
    });
});
