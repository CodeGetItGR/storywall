import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { cloneElement, type ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { emptyActivityFixture, festivalActivityFixture, weddingActivityFixture } from '@/components/admin/events/activity/__fixtures__/eventActivity';
import { EventActivityContent } from '@/components/admin/events/activity/EventActivityContent';
import { EventActivityTooltip } from '@/components/admin/events/activity/EventActivityTooltip';
import { chartedKinds } from '@/lib/adminEventActivity';
import type { AdminEventActivityDto } from '@/lib/api/types';
import messages from '@/messages/en.json';

// jsdom has no layout, so ResponsiveContainer would measure 0 × 0 and draw nothing. Give every chart a
// fixed size instead, so the bars and their totals render.
vi.mock('recharts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('recharts')>();
    return {
        ...actual,
        ResponsiveContainer: ({ children }: { children: ReactElement<{ width?: number; height?: number }> }) =>
            cloneElement(children, { width: 800, height: 240 }),
    };
});

const copy = messages.AdminPage.events.activity;

function renderWithIntl(node: ReactElement) {
    return render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
            {node}
        </NextIntlClientProvider>,
    );
}

const renderContent = (activity: AdminEventActivityDto) => renderWithIntl(<EventActivityContent activity={activity} />);
const tiles = () => within(screen.getByTestId('activity-tiles'));
const hourlyChart = () => screen.getByRole('img', { name: copy.hourly.title });
const totalsIn = (chart: HTMLElement) =>
    [...chart.querySelectorAll('text')].filter((node) => node.getAttribute('font-size') === '11' && node.hasAttribute('font-weight'));
const heatmapRowLabels = () =>
    screen
        .getAllByRole('img')
        .map((node) => node.getAttribute('aria-label') ?? '')
        .filter((label) => label.includes(' at '));

const tooltipRow = { posts: 44, stories: 18, gallery: 61, wishes: 0, total: 123, label: '23:00' };
const tooltipTitle = (value: object) => (value as typeof tooltipRow).label;

afterEach(cleanup);

describe('EventActivityContent', () => {
    it('shows each count once, with module tiles only when present', () => {
        renderContent(weddingActivityFixture);
        expect(tiles().getByText(copy.tiles.posts)).toBeInTheDocument();
        expect(tiles().getByText('268')).toBeInTheDocument();
        expect(tiles().getByText(copy.tiles.wishes)).toBeInTheDocument();
        expect(tiles().getByText('101')).toBeInTheDocument();
        expect(tiles().getByText(copy.tiles.playlist)).toBeInTheDocument();
        expect(tiles().getByText(copy.tiles.rsvp)).toBeInTheDocument();
        expect(tiles().queryByText(copy.tiles.quiz)).not.toBeInTheDocument();
        expect(tiles().queryByText(copy.tiles.pro)).not.toBeInTheDocument();
        expect(tiles().getByText(copy.tiles.removed)).toBeInTheDocument();
        expect(tiles().getByText('11')).toBeInTheDocument();
    });

    it('shows professional uploads and quiz answers, and hides wishes when the wishbook is off', () => {
        renderContent(festivalActivityFixture);
        expect(tiles().getByText(copy.tiles.pro)).toBeInTheDocument();
        expect(tiles().getByText(copy.tiles.quiz)).toBeInTheDocument();
        expect(tiles().queryByText(copy.tiles.wishes)).not.toBeInTheDocument();
    });

    it('drops the wishes series from the legend and the heatmap when the wishbook is off', () => {
        renderContent(festivalActivityFixture);
        expect(screen.queryByText(copy.series.wishes)).not.toBeInTheDocument();
        const labels = heatmapRowLabels();
        expect(labels.some((label) => label.startsWith(`${copy.series.posts} at `))).toBe(true);
        expect(labels.some((label) => label.startsWith(`${copy.series.wishes} at `))).toBe(false);
    });

    it('keeps the wishes series when the wishbook is on', () => {
        renderContent(weddingActivityFixture);
        expect(heatmapRowLabels().filter((label) => label.startsWith(`${copy.series.wishes} at `))).toHaveLength(24);
    });

    it('opens on the start day and steps through active days', () => {
        renderContent(weddingActivityFixture);
        expect(screen.getByText('Sat, Jun 13')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: copy.hourly.previous })).toBeEnabled();
        fireEvent.click(screen.getByRole('button', { name: copy.hourly.next }));
        expect(screen.getByText('Sun, Jun 14')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: copy.hourly.next }));
        expect(screen.getByText('Mon, Jun 15')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: copy.hourly.next })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: copy.hourly.previous }));
        fireEvent.click(screen.getByRole('button', { name: copy.hourly.previous }));
        fireEvent.click(screen.getByRole('button', { name: copy.hourly.previous }));
        expect(screen.getByText('Fri, Jun 12')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: copy.hourly.previous })).toBeDisabled();
    });

    it('draws one total per column above the hourly bars, with the peak in bold', () => {
        renderContent(weddingActivityFixture);
        const totals = totalsIn(hourlyChart());
        // 13 June runs from 16:00 to 23:00: eight columns.
        expect(totals.map((node) => node.textContent)).toEqual(['7', '12', '25', '41', '68', '92', '123', '214']);
        const bold = totals.filter((node) => node.getAttribute('font-weight') === '700');
        expect(bold.map((node) => node.textContent)).toEqual(['214']);
    });

    it('lists the busiest hour first among the peaks, in 24-hour time', () => {
        renderContent(weddingActivityFixture);
        const peaks = screen.getByRole('heading', { name: copy.peaks.title }).parentElement!;
        const rows = peaks.querySelectorAll('li');
        expect(rows).toHaveLength(3);
        expect(rows[0].textContent).toContain('Sat 23:00');
        expect(rows[0].textContent).toContain('214');
        expect(rows[1].textContent).toContain('Sun 00:00');
        expect(rows[1].textContent).toContain('188');
    });

    it('shows the empty state without charts', () => {
        renderContent(emptyActivityFixture);
        expect(screen.getByText(copy.empty)).toBeInTheDocument();
        expect(screen.queryByText(copy.hourly.title)).not.toBeInTheDocument();
        expect(screen.queryByText(copy.peaks.title)).not.toBeInTheDocument();
        expect(screen.queryByText(copy.daily.title)).not.toBeInTheDocument();
    });
});

describe('EventActivityTooltip', () => {
    it('leaves out the wishes row when the wishbook is off', () => {
        renderWithIntl(
            <EventActivityTooltip
                active
                payload={[{ payload: tooltipRow }]}
                title={tooltipTitle}
                kinds={chartedKinds(festivalActivityFixture.totals)}
            />,
        );
        expect(screen.getByText('23:00 · 123')).toBeInTheDocument();
        expect(screen.getByText(copy.series.gallery)).toBeInTheDocument();
        expect(screen.queryByText(copy.series.wishes)).not.toBeInTheDocument();
    });

    it('shows the wishes row when the wishbook is on', () => {
        renderWithIntl(
            <EventActivityTooltip
                active
                payload={[{ payload: tooltipRow }]}
                title={tooltipTitle}
                kinds={chartedKinds(weddingActivityFixture.totals)}
            />,
        );
        expect(screen.getByText(copy.series.wishes)).toBeInTheDocument();
    });
});
