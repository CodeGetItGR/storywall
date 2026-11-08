import { act, cleanup, render, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import { usePhotoTextWarning } from '@/hooks/usePhotoTextTint';
import type { InvitationDocument } from '@/lib/invitation/document';
import type { PhotoTone } from '@/lib/invitation/photoContrast';
import { readPhotoTone, requestPhotoTones, resetPhotoTones } from '@/lib/invitation/photoToneStore';
import { SAMPLE_DOCUMENT, SAMPLE_SECTIONS, SAMPLE_THEME } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import el from '@/messages/el.json';

// next/font only works when Next compiles the file.
vi.mock('@/components/saveMyDate/invitation/invitationFonts', () => ({ INVITATION_FONT_CLASSES: '' }));

const media = (mediaId: string) => `/images/${mediaId}.png`;
const PHOTO = '/images/m-host.png';

const TONES: Record<string, PhotoTone> = {
    light: { mean: 0.629, dark: 0.481, light: 0.905 },
    dark: { mean: 0.023, dark: 0.006, light: 0.062 },
    busy: { mean: 0.245, dark: 0.04, light: 0.765 },
};

afterEach(() => {
    cleanup();
    resetPhotoTones();
});

function onPhoto(textContrast: InvitationSection['style']['textContrast'] = 'auto'): InvitationSection {
    const blank = SAMPLE_SECTIONS.blank;
    return { ...blank, id: 'on-photo', style: { ...blank.style, textContrast, background: { kind: 'image', image: { source: 'media', mediaId: 'm-host' } } } };
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
async function measured(tone: PhotoTone) {
    requestPhotoTones([PHOTO], async () => tone);
    await vi.waitFor(() => expect(readPhotoTone([PHOTO])).toEqual(tone));
}

const tintOf = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-section-id="on-photo"] > .smd-photo-tint:not([data-photo-tone])');
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
    });

    it('turns the text white on a dark photo', async () => {
        await measured(TONES.dark);
        const { container } = render(invitation(onPhoto()));
        expect(tintOf(container)).toHaveClass('smd-photo-tint-text-light');
    });

    it('adds the tint once the photo is measured after the first render', async () => {
        let finish: (tone: PhotoTone) => void = () => {};
        requestPhotoTones([PHOTO], () => new Promise((resolve) => (finish = resolve)));
        const { container } = render(invitation(onPhoto()));
        expect(tintOf(container)).toBeNull();
        expect(pendingOf(container)).not.toBeNull();
        await act(async () => finish(TONES.busy));
        expect(tintOf(container)).not.toBeNull();
        expect(pendingOf(container)).toBeNull();
    });

    it('stays as it is when the photo could not be measured', async () => {
        requestPhotoTones([PHOTO], async () => undefined);
        await vi.waitFor(() => expect(readPhotoTone([PHOTO])).toBeNull());
        const { container } = render(invitation(onPhoto()));
        expect(tintOf(container)).toBeNull();
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
        const { result } = renderHook(() => usePhotoTextWarning([PHOTO], 'light', '#2f2b2d'));
        expect(result.current).toBe(true);
    });

    it('does not warn on automatic contrast', async () => {
        await measured(TONES.busy);
        const { result } = renderHook(() => usePhotoTextWarning([PHOTO], 'auto', '#2f2b2d'));
        expect(result.current).toBe(false);
    });

    it('does not warn before the photo is measured', () => {
        requestPhotoTones([PHOTO], () => new Promise(() => {}));
        const { result } = renderHook(() => usePhotoTextWarning([PHOTO], 'base', '#2f2b2d'));
        expect(result.current).toBe(false);
    });
});
