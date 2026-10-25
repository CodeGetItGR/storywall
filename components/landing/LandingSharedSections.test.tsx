import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LandingDemo } from '@/components/landing/LandingDemo';
import { LandingFaq } from '@/components/landing/LandingFaq';
import { LandingFinalCta } from '@/components/landing/LandingFinalCta';

// Every key reads as itself; arrays come back as two keyed lines.
vi.mock('next-intl/server', () => ({
    getTranslations: async () => Object.assign((key: string) => key, { raw: (key: string) => [`${key}.0`, `${key}.1`] }),
}));

afterEach(cleanup);

describe('LandingDemo', () => {
    it('shows an occasion kicker over the heading and its own phones, labelled once', async () => {
        render(
            await LandingDemo({
                copy: <span>own copy</span>,
                eyebrow: 'DEMO',
                heading: ['See a wedding', 'StoryWall.'],
                phones: <div>two phones</div>,
                previewLabel: 'Wedding demo on two phones',
            }),
        );
        expect(screen.getByText('DEMO')).toBeInTheDocument();
        expect(screen.getByText('own copy')).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Wedding demo on two phones' })).toHaveTextContent('two phones');
        expect(document.querySelector('img')).toBeNull();
    });
});

describe('LandingFaq', () => {
    it('groups the answers so one stays open, and takes rich answers', async () => {
        render(
            await LandingFaq({
                centered: true,
                copy: {
                    heading: 'FAQ',
                    intro: 'Intro',
                    items: [
                        [
                            'Q1',
                            <a href="#pricing" key="a">
                                See plans
                            </a>,
                        ],
                        ['Q2', 'A2'],
                    ],
                },
                group: 'wedding-faq',
            }),
        );
        const details = document.querySelectorAll('details');
        expect([...details].map((item) => item.getAttribute('name'))).toEqual(['wedding-faq', 'wedding-faq']);
        expect(screen.getByRole('link', { name: 'See plans' })).toHaveAttribute('href', '#pricing');
        expect(screen.getByRole('heading', { name: 'FAQ' }).parentElement).toHaveClass('text-center');
    });

    it('leaves the landing FAQ ungrouped', async () => {
        render(await LandingFaq({ copy: { heading: 'FAQ', intro: 'Intro', items: [['Q1', 'A1']] } }));
        expect(document.querySelector('details')).not.toHaveAttribute('name');
    });
});

describe('LandingFinalCta', () => {
    it('centers an occasion final CTA with a rich label', async () => {
        render(
            await LandingFinalCta({
                centered: true,
                copy: {
                    copyStart: 'Start',
                    cta: (
                        <>
                            Create your <strong>StoryWall</strong>
                        </>
                    ),
                    heading: ['Your wedding', 'starts here.'],
                    imageAlt: 'Couple',
                },
            }),
        );
        const link = screen.getByRole('link');
        expect(link).toHaveTextContent('Create your StoryWall');
        expect(link).not.toHaveClass('uppercase');
        expect(screen.getByRole('heading').parentElement).toHaveClass('text-center');
    });
});
