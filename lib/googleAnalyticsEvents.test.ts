import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('@vercel/analytics', () => ({ track }));

type GtagMock = ReturnType<typeof vi.fn<(...args: unknown[]) => void>>;

// GA_MEASUREMENT_ID is read when the module loads, so each test imports a fresh copy with the id set.
async function loadWithMeasurementId() {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST');
    vi.resetModules();
    const googleTag = await import('@/lib/googleTag');
    const googleAnalytics = await import('@/lib/googleAnalytics');
    const landingTracking = await import('@/lib/landingTracking');
    return { ...googleTag, ...googleAnalytics, ...landingTracking };
}

function events(gtag: GtagMock) {
    return gtag.mock.calls.filter(([command]) => command === 'event');
}

describe('Google Analytics custom events', () => {
    let gtag: GtagMock;

    beforeEach(() => {
        track.mockClear();
        gtag = vi.fn<(...args: unknown[]) => void>();
        window.gtag = gtag;
    });

    afterEach(() => {
        delete window.gtag;
        delete (window as unknown as Record<string, unknown>)['ga-disable-G-TEST'];
        vi.unstubAllEnvs();
    });

    it('mirrors a landing event under a snake_case name once Analytics runs', async () => {
        const { configureGoogleTag, trackLandingClick, trackLandingSection } = await loadWithMeasurementId();
        configureGoogleTag('G-TEST');

        trackLandingClick({ event: 'plan', plan: 'wedding/STORY', months: 6 });
        trackLandingSection('pricing');

        expect(track).toHaveBeenCalledWith('Landing Plan', { plan: 'wedding/STORY', months: 6 });
        expect(events(gtag)).toEqual([
            ['event', 'landing_plan', { plan: 'wedding/STORY', months: 6, send_to: 'G-TEST' }],
            ['event', 'landing_section', { section: 'pricing', send_to: 'G-TEST' }],
        ]);
    });

    it('sends nothing to Google before Analytics is set up', async () => {
        const { trackLandingFaq } = await loadWithMeasurementId();

        trackLandingFaq(2);

        expect(track).toHaveBeenCalledWith('Landing FAQ', { question: 2 });
        expect(events(gtag)).toHaveLength(0);
    });

    it('sends nothing once Analytics is switched off', async () => {
        const { configureGoogleTag, setAnalyticsDisabled, trackLandingLanguage } = await loadWithMeasurementId();
        configureGoogleTag('G-TEST');
        setAnalyticsDisabled('G-TEST', true);

        trackLandingLanguage('el');

        expect(track).toHaveBeenCalledWith('Landing Language', { locale: 'el' });
        expect(events(gtag)).toHaveLength(0);
    });
});
