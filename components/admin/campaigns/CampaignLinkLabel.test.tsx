import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { CampaignLinkLabel } from '@/components/admin/campaigns/CampaignLinkLabel';
import type { CampaignLinkLabelParts } from '@/lib/campaignLinks';
import messages from '@/messages/en.json';

function renderLabel(label: CampaignLinkLabelParts, { showPlatform = true, decorative = false } = {}) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <CampaignLinkLabel label={label} showPlatform={showPlatform} decorative={decorative} />
        </NextIntlClientProvider>,
    );
}

describe('CampaignLinkLabel', () => {
    afterEach(cleanup);

    it('names the platform and the type, each showing its word on a tap', () => {
        renderLabel({ platform: 'instagram', type: 'storyAd', text: null, language: 'el', page: null });

        expect(screen.getByRole('button', { name: 'Instagram' })).toBeInTheDocument();
        expect(screen.getByText('EL')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Story ad' }));
        expect(screen.getByText('Story ad')).toBeInTheDocument();
    });

    it("leaves the platform's icon out under its own row, keeping its name for screen readers", () => {
        renderLabel({ platform: 'instagram', type: 'post', text: null, language: null, page: null }, { showPlatform: false });

        expect(screen.queryByRole('button', { name: 'Instagram' })).not.toBeInTheDocument();
        expect(screen.getByText('Instagram')).toHaveClass('sr-only');
    });

    it("shows a partner's name and a page that isn't home", () => {
        renderLabel({ platform: 'partner', type: null, text: 'acme', language: null, page: '/el/gamos' });

        expect(screen.getByRole('button', { name: 'Partner' })).toBeInTheDocument();
        expect(screen.getByText('acme')).toBeInTheDocument();
        expect(screen.getByText('/el/gamos')).toBeInTheDocument();
    });

    it('draws plain icons inside a control, which names the link itself', () => {
        renderLabel({ platform: 'instagram', type: 'storyAd', text: null, language: 'el', page: null }, { decorative: true });

        expect(screen.queryAllByRole('button')).toHaveLength(0);
        expect(screen.getByText('EL')).toBeInTheDocument();
    });
});
