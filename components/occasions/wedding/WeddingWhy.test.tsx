import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WeddingWhy } from '@/components/occasions/wedding/WeddingWhy';
import { LandingMotionProvider } from '@/providers/LandingMotionProvider';

vi.mock('next-intl/server', () => import('@/components/occasions/wedding/__fixtures__/intlServerMock'));
// The parts read their alt text with useTranslations.
vi.mock('next-intl', async (importOriginal) =>
    (await import('@/components/occasions/wedding/__fixtures__/intlClientMock')).withGreekMessages(await importOriginal()),
);

// The marquee reads the landing's motion toggle.
async function renderWhy(qrHref: string | null = '/el/qr-code-gamou') {
    return render(<LandingMotionProvider>{await WeddingWhy({ locale: 'el', qrHref })}</LandingMotionProvider>);
}

afterEach(cleanup);

describe('WeddingWhy', () => {
    it('heads the section and lists what goes wrong without StoryWall', async () => {
        await renderWhy();
        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Οι φωτογραφίες του γάμου σου δεν πρέπει να χαθούν σε 100 κινητά.');
        expect(screen.getByText('Φωτογραφίες σε 100 διαφορετικά κινητά')).toBeInTheDocument();
    });

    it('links the scan step to the QR page only while that page is live', async () => {
        await renderWhy('/el/qr-code-gamou');
        expect(screen.getByRole('link', { name: 'Σκανάρουν' })).toHaveAttribute('href', '/el/qr-code-gamou');
        cleanup();
        await renderWhy(null);
        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.getByRole('heading', { level: 3, name: 'Σκανάρουν' })).toBeInTheDocument();
    });

    it('names each marquee photo once, by its moment and who took it', async () => {
        await renderWhy();
        const photos = screen.getAllByRole('img', { name: /φωτογραφία από/ });
        expect(photos).toHaveLength(14);
        expect(photos[0]).toHaveAccessibleName('Προετοιμασία νυφικού — φωτογραφία από Ιωάννα, φίλη νύφης');
    });

    it('shows the example numbers and the four points', async () => {
        await renderWhy();
        expect(screen.getByText('248')).toBeInTheDocument();
        expect(screen.getByText('Ευχολόγιο που κατεβάζεις σε PDF')).toBeInTheDocument();
    });
});
