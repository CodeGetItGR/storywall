import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLandingClickTracking } from '@/hooks/useLandingClickTracking';
import { landingClickAttributes, landingFaqAttributes, landingNavTarget } from '@/lib/landingTracking';

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@vercel/analytics', () => ({ track }));

const { sendCampaignClick } = vi.hoisted(() => ({ sendCampaignClick: vi.fn() }));
vi.mock('@/lib/campaignVisits', () => ({ sendCampaignClick }));

function attributes(record: Record<string, string>) {
    return Object.entries(record)
        .map(([name, value]) => `${name}='${value}'`)
        .join(' ');
}

// The markup the landing page renders: tagged links, the shared language switcher and an FAQ item.
function mountLanding() {
    document.body.innerHTML = `
        <main id="landing">
            <a href="#create" id="create" ${attributes(landingClickAttributes({ event: 'create', placement: 'hero' }))}><span id="createLabel">Create</span></a>
            <a href="#pricing" id="plans" ${attributes(landingClickAttributes({ event: 'plans', placement: 'hero' }))}>See plans</a>
            <a href="#pricing" id="nav" ${attributes(landingClickAttributes({ event: 'nav', placement: 'header', target: 'pricing' }))}>Plans</a>
            <a href="#plan" id="plan" ${attributes(landingClickAttributes({ event: 'plan', plan: 'wedding/STORY', months: 6 }))}>Choose plan</a>
            <a href="#plain" id="plain">Untracked</a>
            <div role="group">
                <button type="button" data-locale="en" aria-pressed="true" id="current">EN</button>
                <button type="button" data-locale="el" aria-pressed="false" id="other">EL</button>
            </div>
            <details id="faq" ${attributes(landingFaqAttributes(2))}><summary>Question</summary>Answer</details>
        </main>
    `;
    const landing = document.getElementById('landing') as HTMLElement;
    renderHook(() => useLandingClickTracking({ current: landing }));
}

function click(id: string) {
    document.getElementById(id)?.click();
}

beforeEach(() => {
    track.mockClear();
    sendCampaignClick.mockClear();
    mountLanding();
});

afterEach(() => {
    document.body.innerHTML = '';
});

describe('useLandingClickTracking', () => {
    it('sends a tagged link with its placement, even when its label is clicked', () => {
        click('createLabel');

        expect(track).toHaveBeenCalledExactlyOnceWith('Landing Create', { placement: 'hero' });
    });

    it('sends the nav target and the picked plan', () => {
        click('nav');
        click('plan');

        expect(track).toHaveBeenNthCalledWith(1, 'Landing Nav', { placement: 'header', target: 'pricing' });
        expect(track).toHaveBeenNthCalledWith(2, 'Landing Plan', { plan: 'wedding/STORY', months: 6 });
    });

    it('ignores untagged links', () => {
        click('plain');

        expect(track).not.toHaveBeenCalled();
    });

    it('counts a switch to the other language only', () => {
        click('current');
        click('other');

        expect(track).toHaveBeenCalledExactlyOnceWith('Landing Language', { locale: 'el' });
    });

    it('counts opening an FAQ question, not closing it', () => {
        const faq = document.getElementById('faq') as HTMLDetailsElement;

        faq.open = true;
        faq.dispatchEvent(new Event('toggle'));
        faq.open = false;
        faq.dispatchEvent(new Event('toggle'));

        expect(track).toHaveBeenCalledExactlyOnceWith('Landing FAQ', { question: 2 });
    });
});

describe('landingNavTarget', () => {
    it('names a nav anchor like its section event', () => {
        expect(landingNavTarget('#experience')).toBe('features');
        expect(landingNavTarget('#platformStories')).toBe('stories');
        expect(landingNavTarget('#somewhere')).toBe('somewhere');
    });
});

describe('campaign clicks', () => {
    it('reports create and plan clicks, and nothing for other clicks', () => {
        click('create');
        click('plan');
        click('nav');
        click('plain');

        expect(sendCampaignClick.mock.calls).toEqual([['CREATE'], ['PLAN']]);
    });

    it('reports the See plans button', () => {
        click('plans');

        expect(sendCampaignClick).toHaveBeenCalledExactlyOnceWith('PLANS');
    });
});
