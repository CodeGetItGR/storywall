import { cleanup, render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { SectionTransition } from '@/components/saveMyDate/invitation/effects/SectionTransition';
import type { SectionTransitionArt } from '@/lib/invitation/render';
import en from '@/messages/en.json';

const transition = (art: Partial<SectionTransitionArt>) =>
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <SectionTransition art={{ name: 'Wave', edge: 'top', desktop: '/wave.png', ...art }} />
        </NextIntlClientProvider>,
    ).container;

afterEach(cleanup);

describe('SectionTransition', () => {
    it('shows the art on the edge it was saved on', () => {
        const top = transition({ edge: 'top' }).querySelector('img');
        expect(top).toHaveClass('wedart-section-transition', 'wedart-transition-desktop', 'is-top');
        expect(top).toHaveAttribute('src', '/wave.png');
        cleanup();
        expect(transition({ edge: 'bottom' }).querySelector('img')).toHaveClass('is-bottom');
    });

    it('adds the phone art when the theme has it', () => {
        const container = transition({ mobile: '/wave-phone.png' });
        expect(container.querySelector('.wedart-transition-picture')).toHaveClass('has-mobile');
        expect(container.querySelector('.wedart-transition-mobile')).toHaveAttribute('src', '/wave-phone.png');
    });

    it('has one image without phone art', () => {
        const container = transition({});
        expect(container.querySelector('.wedart-transition-picture')).not.toHaveClass('has-mobile');
        expect(container.querySelectorAll('img')).toHaveLength(1);
    });

    it('names the image after the art, or falls back to the shared label', () => {
        expect(transition({}).querySelector('img')).toHaveAttribute('alt', 'Wave');
        cleanup();
        expect(transition({ name: '' }).querySelector('img')).toHaveAttribute('alt', en.InvitationRenderer.imageAlt);
    });
});
