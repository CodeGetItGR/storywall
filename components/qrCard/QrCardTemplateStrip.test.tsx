import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QrCardTemplateStrip } from '@/components/qrCard/QrCardTemplateStrip';
import type { QrCardTemplateDto } from '@/lib/api/types';
import { PLAIN_QR_CARD_ID } from '@/lib/qrCard';
import messages from '@/messages/en.json';

// next/image needs a loader in jsdom; the strip's own markup is what's under test.
vi.mock('@/components/common/ProtectedImage', () => ({
    ProtectedImage: ({ alt, src }: { alt: string; src: string }) => <span role="img" aria-label={alt} data-src={src} />,
}));

const LINEN: QrCardTemplateDto = {
    id: 't1',
    name: { en: 'Linen', el: 'Λινό' },
    artworkUrl: '/api/qr-card-artwork/t1/1',
    textColor: '#5A3E2B',
    headingFont: null,
    codeColor: '#1F3A5A',
    centerLogo: false,
    layout: null,
    sizes: ['A6'],
};

function renderStrip(props: Partial<Parameters<typeof QrCardTemplateStrip>[0]> = {}) {
    const onSelectAction = vi.fn();
    const onRetryAction = vi.fn();
    render(
        <NextIntlClientProvider locale="en" messages={messages}>
            <QrCardTemplateStrip
                templates={[LINEN]}
                selectedId={PLAIN_QR_CARD_ID}
                failed={false}
                onSelectAction={onSelectAction}
                onRetryAction={onRetryAction}
                {...props}
            />
        </NextIntlClientProvider>,
    );
    return { onSelectAction, onRetryAction };
}

afterEach(cleanup);

describe('QrCardTemplateStrip', () => {
    it('offers Plain first, selected by default', () => {
        renderStrip();
        const [plain, linen] = screen.getAllByRole('radio');
        expect(plain).toHaveAccessibleName('Plain');
        expect(plain).toHaveAttribute('aria-checked', 'true');
        expect(linen).toHaveAccessibleName('Linen card design');
        expect(linen).toHaveAttribute('aria-checked', 'false');
    });

    it('is a radio group named by its heading, with one tab stop', () => {
        renderStrip({ selectedId: 't1' });
        expect(screen.getByRole('radiogroup', { name: 'Design' })).toBeInTheDocument();
        const [plain, linen] = screen.getAllByRole('radio');
        expect(plain).toHaveAttribute('tabindex', '-1');
        expect(linen).toHaveAttribute('tabindex', '0');
    });

    it('moves the selection with the arrow keys', () => {
        const { onSelectAction } = renderStrip();
        fireEvent.keyDown(screen.getByRole('radio', { name: 'Plain' }), { key: 'ArrowRight' });
        expect(onSelectAction).toHaveBeenCalledWith('t1');
    });

    it('picks a design', () => {
        const { onSelectAction } = renderStrip();
        fireEvent.click(screen.getByRole('radio', { name: 'Linen card design' }));
        expect(onSelectAction).toHaveBeenCalledWith('t1');
    });

    it('shows the artwork with alt text', () => {
        renderStrip();
        expect(screen.getByRole('img', { name: 'Linen card design' })).toHaveAttribute('data-src', '/api/qr-card-artwork/t1/1');
    });

    it('offers a retry when the designs failed to load', () => {
        const { onRetryAction } = renderStrip({ templates: [], failed: true });
        expect(screen.getByRole('status')).toHaveTextContent("Couldn't load the designs.");
        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
        expect(onRetryAction).toHaveBeenCalled();
    });
});
