import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { InquirySentArt } from '@/components/vendors/inquiries/InquirySentArt';
import messages from '@/messages/en.json';

describe('InquirySentArt', () => {
    afterEach(cleanup);

    it('names the envelope for screen readers', () => {
        render(
            <NextIntlClientProvider locale="en" messages={messages} timeZone="Europe/Athens">
                <InquirySentArt />
            </NextIntlClientProvider>,
        );
        expect(screen.getByRole('img', { name: 'Inquiry sent' })).toBeInTheDocument();
    });
});
