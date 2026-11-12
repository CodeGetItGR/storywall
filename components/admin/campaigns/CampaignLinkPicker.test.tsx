import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';

import { linkFixture } from '@/components/admin/campaigns/__fixtures__/campaigns';
import { CampaignLinkPicker } from '@/components/admin/campaigns/CampaignLinkPicker';
import { useCampaignLinkPicker } from '@/hooks/useCampaignLinkPicker';
import type { CampaignLinkDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

function Host({ links }: { links: CampaignLinkDto[] }) {
    const picker = useCampaignLinkPicker('launch', links);
    return (
        <>
            <CampaignLinkPicker picker={picker} />
            <output data-testid="request">{JSON.stringify(picker.request)}</output>
            <button type="button" onClick={picker.validate}>
                Check
            </button>
        </>
    );
}

function renderPicker(links: CampaignLinkDto[] = []) {
    render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            <Host links={links} />
        </NextIntlClientProvider>,
    );
}

function request() {
    return JSON.parse(screen.getByTestId('request').textContent ?? 'null');
}

describe('CampaignLinkPicker', () => {
    afterEach(cleanup);

    it('ticks a placement by its name and sends it in both languages to the home page', () => {
        renderPicker();

        fireEvent.click(screen.getByRole('checkbox', { name: 'Instagram Story' }));

        expect(request()).toMatchObject({ placements: ['INSTAGRAM_STORY'], languages: ['el', 'en'], pageKey: null });
    });

    it("shows a chip's words on a tap, and still ticks it", () => {
        renderPicker();
        const chip = screen.getByRole('checkbox', { name: 'TikTok Post' });

        fireEvent.pointerUp(chip, { pointerType: 'touch' });
        fireEvent.click(chip);

        expect(screen.getByText('TikTok Post')).toHaveAttribute('aria-hidden', 'true');
        expect(request()).toMatchObject({ placements: ['TIKTOK_POST'] });
    });

    it('shows a placement as added once the campaign has it in every chosen language', () => {
        renderPicker([linkFixture({ utmSource: 'instagram', utmMedium: 'social', utmCampaign: 'launch-story-el' })]);

        expect(screen.getByRole('checkbox', { name: 'Instagram Story' })).toBeEnabled();

        fireEvent.click(screen.getByRole('checkbox', { name: 'English' }));

        const added = screen.getByRole('checkbox', { name: 'Instagram Story · Already added' });
        expect(added).toBeChecked();
        expect(added).toBeDisabled();
        expect(request()).toBeNull();
    });

    it('keeps at least one language', () => {
        renderPicker();

        fireEvent.click(screen.getByRole('checkbox', { name: 'Greek' }));

        expect(screen.getByRole('checkbox', { name: 'English' })).toBeDisabled();
    });

    it("asks for a partner's name only once Partner is ticked, and spells Greek in Latin letters", () => {
        renderPicker();
        expect(screen.queryByRole('textbox', { name: 'Partner name' })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('checkbox', { name: 'Partner' }));
        fireEvent.click(screen.getByRole('button', { name: 'Check' }));

        expect(screen.getByText("Add the partner's name.")).toBeInTheDocument();
        expect(request()).toBeNull();

        fireEvent.change(screen.getByRole('textbox', { name: 'Partner name' }), { target: { value: 'Κτήμα Ρόδων' } });

        expect(screen.getByRole('textbox', { name: 'Partner name' })).toHaveValue('ktima-rodon');
        expect(request()).toMatchObject({ placements: ['PARTNER'], partnerName: 'ktima-rodon' });
    });

    it('sends a chosen page with its paths', () => {
        renderPicker();

        fireEvent.click(screen.getByRole('checkbox', { name: 'Facebook Post' }));
        fireEvent.change(screen.getByRole('combobox', { name: 'Page' }), { target: { value: 'weddings' } });

        expect(request()).toMatchObject({ pageKey: 'weddings', pagePaths: { en: '/weddings', el: '/el/gamos' } });
    });
});
