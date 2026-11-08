import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { act, cleanup, render, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import { usePhotoTextWarning } from '@/hooks/usePhotoTextTint';
import type { InvitationDocument } from '@/lib/invitation/document';
import { MOBILE_BACKGROUND_MAX_WIDTH, type PhotoTone } from '@/lib/invitation/photoContrast';
import { readPhotoTone, requestPhotoTone, resetPhotoTones } from '@/lib/invitation/photoToneStore';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import el from '@/messages/el.json';

// The rule that turns text white, as shipped. jsdom can't read the whole
// stylesheet (container queries), but it applies this one.
const invitationCss = readFileSync(join(process.cwd(), 'components/saveMyDate/invitation/invitation.css'), 'utf8');
const TINT_TEXT_RULE = invitationCss.match(/^.*:has\(> \.smd-photo-tint-text-light\).*$/m)![0];

// next/font only works when Next compiles the file.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

const media = (mediaId: string) => `/images/${mediaId}.png`;
const PHOTO = '/images/m-host.png';

const TONES: Record<string, PhotoTone> = {
    light: { mean: 0.629, dark: 0.481, light: 0.905 },
    dark: { mean: 0.023, dark: 0.006, light: 0.062 },
    busy: { mean: 0.245, dark: 0.04, light: 0.765 },
};

// jsdom lays nothing out: the invitation is as wide as this says.
let invitationWidth = 1280;

beforeEach(() => {
    invitationWidth = 1280;
    vi.stubGlobal('ResizeObserver', class {
        constructor(private readonly callback: ResizeObserverCallback) {}
        observe() {
            this.callback([{ contentRect: { width: invitationWidth } } as ResizeObserverEntry], this as unknown as ResizeObserver);
        }
        unobserve() {}
        disconnect() {}
    });
    // Tests measure photos themselves; a download means a photo nobody asked for.
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
});

afterEach(() => {
    cleanup();
    resetPhotoTones();
    vi.unstubAllGlobals();
});

function onPhoto(textContrast: InvitationSection['style']['textContrast'] = 'auto', section: InvitationSection = SAMPLE_SECTIONS.blank): InvitationSection {
    return { ...section, id: 'on-photo', style: { ...section.style, textContrast, background: { kind: 'image', image: { source: 'media', mediaId: 'm-host' } } } };
}

// The theme's own background, with a desktop and a mobile photo.
function onThemePhoto(): InvitationSection {
    const blank = SAMPLE_SECTIONS.blank;
    return { ...blank, id: 'on-photo', style: { ...blank.style, textContrast: 'auto', background: { kind: 'theme', slot: 'top' } } };
}

function invitation(section: InvitationSection) {
    const document: InvitationDocument = { ...SAMPLE_DOCUMENT, sections: [section] };
    return (
        <NextIntlClientProvider locale="el" messages={el} timeZone="Europe/Athens">
            <InvitationRenderer document={document} theme={SAMPLE_THEME} media={media} />
        </NextIntlClientProvider>
    );
}

// Measures the photo with a known tone before the section asks for it.
async function measured(tone: PhotoTone, photo = PHOTO) {
    requestPhotoTone(photo, async () => tone);
    await vi.waitFor(() => expect(readPhotoTone(photo)).toBe(tone));
}

const tintOf = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-section-id="on-photo"] > [class*="smd-photo-tint-text-"]');
const pendingOf = (container: HTMLElement) => container.querySelector('[data-section-id="on-photo"] > [data-photo-tone="pending"]');

describe('PhotoTextTint in the invitation', () => {
    it('marks the section as being measured in the server markup, with no tint', () => {
        const html = renderToString(invitation(onPhoto()));
        expect(html).toContain('data-photo-tone="pending"');
        expect(html).not.toContain('smd-photo-tint-text');
    });

    it('darkens a busy photo and turns the text white', async () => {
        await measured(TONES.busy);
        const { container } = render(invitation(onPhoto()));
        const tint = tintOf(container)!;
        expect(tint).toHaveClass('smd-photo-tint-text-light');
        expect(tint.style.background).toMatch(/^rgba\(0, 0, 0, 0\.\d+\)$/);
        expect(tint).toHaveAttribute('aria-hidden', 'true');
    });

    it('leaves a light photo under dark text as it is', async () => {
        await measured(TONES.light);
        const { container } = render(invitation(onPhoto()));
        expect(tintOf(container)).toBeNull();
        expect(pendingOf(container)).toBeNull();
    });

    it('turns the text white on a dark photo', async () => {
        await measured(TONES.dark);
        const { container } = render(invitation(onPhoto()));
        expect(tintOf(container)).toHaveClass('smd-photo-tint-text-light');
    });

    it('adds the tint once the photo is measured after the first render', async () => {
        let finish: (tone: PhotoTone) => void = () => {};
        requestPhotoTone(PHOTO, () => new Promise((resolve) => (finish = resolve)));
        const { container } = render(invitation(onPhoto()));
        expect(tintOf(container)).toBeNull();
        expect(pendingOf(container)).not.toBeNull();
        await act(async () => finish(TONES.busy));
        expect(tintOf(container)).not.toBeNull();
        expect(pendingOf(container)).toBeNull();
    });

    it('stays as it is when the photo could not be measured', async () => {
        requestPhotoTone(PHOTO, async () => undefined);
        await vi.waitFor(() => expect(readPhotoTone(PHOTO)).toBeNull());
        const { container } = render(invitation(onPhoto()));
        expect(tintOf(container)).toBeNull();
        expect(pendingOf(container)).toBeNull();
    });

    it("keeps a colour the host gave a field, and lets only the rest turn white", async () => {
        await measured(TONES.busy);
        const names = { ...SAMPLE_SECTIONS.coupleNames, textStyles: { partnerAName: { color: '#c9a24b' } } };
        const { container } = render(invitation(onPhoto('auto', names)));
        expect(tintOf(container)).toHaveClass('smd-photo-tint-text-light');
        const section = container.querySelector('[data-section-id="on-photo"]')!;
        // The old automatic white text overrode every field's own colour.
        expect(section).not.toHaveClass('wedart-text-contrast-light');
        const [gold, plain] = section.querySelectorAll<HTMLElement>('.couple-name');
        const style = document.head.appendChild(document.createElement('style'));
        style.textContent = TINT_TEXT_RULE;
        try {
            expect(getComputedStyle(gold).color).toBe('rgb(201, 162, 75)');
            expect(getComputedStyle(plain).color).toBe('rgb(255, 255, 255)');
        } finally {
            style.remove();
        }
    });

    it('measures only the desktop photo on a wide invitation', async () => {
        const measure = vi.fn(async () => TONES.busy);
        requestPhotoTone(media('m-top'), measure);
        const { container } = render(invitation(onThemePhoto()));
        await vi.waitFor(() => expect(tintOf(container)).not.toBeNull());
        expect(measure).toHaveBeenCalledTimes(1);
        expect(fetch).not.toHaveBeenCalled();
    });

    it('measures only the mobile photo on a phone', async () => {
        invitationWidth = MOBILE_BACKGROUND_MAX_WIDTH;
        await measured(TONES.dark, media('m-top-mobile'));
        const { container } = render(invitation(onThemePhoto()));
        expect(tintOf(container)).toHaveClass('smd-photo-tint-text-light');
        expect(fetch).not.toHaveBeenCalled();
    });

    it("leaves the host's own text contrast alone", async () => {
        await measured(TONES.busy);
        const { container } = render(invitation(onPhoto('base')));
        expect(container.querySelector('.smd-photo-tint')).toBeNull();
    });
});

describe('usePhotoTextWarning', () => {
    it('warns about white text the host picked on a light photo', async () => {
        await measured(TONES.light);
        const { result } = renderHook(() => usePhotoTextWarning(PHOTO, 'light', '#2f2b2d'));
        expect(result.current).toBe(true);
    });

    it('does not warn on automatic contrast', async () => {
        await measured(TONES.busy);
        const { result } = renderHook(() => usePhotoTextWarning(PHOTO, 'auto', '#2f2b2d'));
        expect(result.current).toBe(false);
    });

    it('does not warn before the photo is measured', () => {
        requestPhotoTone(PHOTO, () => new Promise(() => {}));
        const { result } = renderHook(() => usePhotoTextWarning(PHOTO, 'base', '#2f2b2d'));
        expect(result.current).toBe(false);
    });
});
