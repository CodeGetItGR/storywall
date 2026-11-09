import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stubIntersectionObserver } from '@/components/saveMyDate/invitation/effects/__fixtures__/fakeIntersectionObserver';
import { InvitationMotionRoot } from '@/components/saveMyDate/invitation/effects/InvitationMotionRoot';

vi.mock('framer-motion', () => ({ useReducedMotion: () => false }));
vi.mock('framer-motion/dom/mini', () => ({ animate: () => ({ cancel: () => undefined, then: () => undefined }) }));

beforeEach(() => {
    stubIntersectionObserver();
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe('InvitationMotionRoot', () => {
    it('keeps what the renderer gives its root', () => {
        const { container } = render(
            <InvitationMotionRoot textAnimation="none" lang="el" className="smd-invitation" style={{ color: 'red' }}>
                <p>Text</p>
            </InvitationMotionRoot>,
        );
        const root = container.firstElementChild;
        expect(root).toHaveAttribute('lang', 'el');
        expect(root).toHaveAttribute('class', 'smd-invitation');
        expect(root).toHaveStyle({ color: 'rgb(255, 0, 0)' });
        expect(root).toHaveTextContent('Text');
    });

    it('names the animation and stops waiting once the page runs', () => {
        const { container } = render(
            <InvitationMotionRoot textAnimation="soft-rise" lang="el" className="smd-invitation" style={{}}>
                <p>Text</p>
            </InvitationMotionRoot>,
        );
        const root = container.firstElementChild;
        expect(root).toHaveClass('smd-invitation', 'wedart-text-anim-soft-rise');
        expect(root).not.toHaveClass('wedart-text-anim-waiting');
    });
});
