import { cleanup, render, screen } from '@testing-library/react';
import { createTranslator, type Messages } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { WeddingDemoPhones } from '@/components/occasions/wedding/WeddingDemoPhones';
import type { Locale } from '@/i18n/config';
import type { WeddingDemoFeedCopy, WeddingDemoProfileCopy, WeddingMockCopy } from '@/lib/occasions/weddingCopy';
import el from '@/messages/el.json';

const t = createTranslator({ locale: 'el', messages: el as Messages, namespace: 'OccasionPages.WEDDING' });

function renderPhones(locale: Locale = 'el') {
    return render(
        <WeddingDemoPhones
            feed={t.raw('demo.feed') as WeddingDemoFeedCopy}
            locale={locale}
            mock={t.raw('mock') as WeddingMockCopy}
            profile={t.raw('demo.profile') as WeddingDemoProfileCopy}
        />,
    );
}

afterEach(cleanup);

describe('WeddingDemoPhones', () => {
    it('draws the profile menu and the feed', () => {
        renderPhones();
        expect(screen.getByText('Nicole M.')).toBeInTheDocument();
        for (const item of ['Εκδηλώσεις', 'Πλάνα', 'Λειτουργίες', 'Αποσύνδεση', 'Προφίλ']) expect(screen.getByText(item)).toBeInTheDocument();
        expect(screen.getByText('Nicole & Samuel')).toBeInTheDocument();
        expect(screen.getByText('Emily R.')).toBeInTheDocument();
    });

    it("underlines the page's language", () => {
        renderPhones('el');
        expect(screen.getByText('EL')).toHaveClass('underline');
        expect(screen.getByText('EN')).not.toHaveClass('underline');
        cleanup();
        renderPhones('en');
        expect(screen.getByText('EN')).toHaveClass('underline');
    });
});
