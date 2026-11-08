import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReportEntry } from '../../types';
import { App } from './App';
import { marksKey, withMarks, writeMarks } from './lib/marks';
import type { ReportManifest } from './lib/model';
import { colorGroup, failedEntry, groupedEntries, sampleEntries, testEntry, testManifest } from './testing/fixture';

async function openReport(manifest: ReportManifest) {
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({ ok: true, json: async () => manifest })),
    );
    render(<App />);
    await screen.findByRole('navigation', { name: 'Stories' });
}

// Saves marks the way the page does, so a report can open partly reviewed.
const seedMarks = (manifest: ReportManifest, entries: ReportEntry[]) => writeMarks(marksKey(manifest), withMarks(new Map(), entries));

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const list = () => within(screen.getByRole('navigation', { name: 'Stories' }));
const progress = () => screen.getByText(/captures reviewed/);

describe('report page', () => {
    beforeEach(() => {
        window.location.hash = '';
        localStorage.clear();
        Element.prototype.scrollIntoView = vi.fn();
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    describe('loading', () => {
        it('shows a message while it loads', () => {
            vi.stubGlobal(
                'fetch',
                vi.fn(() => new Promise(() => undefined)),
            );
            render(<App />);
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });

        it('explains a report that is gone', async () => {
            vi.stubGlobal(
                'fetch',
                vi.fn(async () => ({ ok: false, status: 404 })),
            );
            render(<App />);
            expect(await screen.findByText('Could not load this report. It may have been deleted when the PR closed.')).toBeInTheDocument();
        });

        it('explains a report it cannot read', async () => {
            vi.stubGlobal(
                'fetch',
                vi.fn(async () => ({ ok: true, json: async () => ({}) })),
            );
            render(<App />);
            expect(await screen.findByText('Could not load this report. It may have been deleted when the PR closed.')).toBeInTheDocument();
        });
    });

    describe('hostile data', () => {
        it('renders names and errors as text', async () => {
            const name = '<img src=x onerror=alert(1)>';
            const error = '<script>alert(1)</script>';
            window.location.hash = '#hostile';
            await openReport(testManifest([testEntry('a', { storyId: 'hostile', name, state: 'failed', error, images: {} })]));
            expect(screen.getByRole('heading', { name })).toBeInTheDocument();
            expect(screen.getByText(error)).toBeInTheDocument();
            expect(document.querySelector('img[src="x"]')).toBeNull();
            expect(document.querySelector('main script')).toBeNull();
        });
    });

    describe('overview', () => {
        it('shows the totals and the counts per area', async () => {
            await openReport(testManifest(sampleEntries));
            expect(screen.getByRole('heading', { name: '5 of 1078 captures differ' })).toBeInTheDocument();
            const rows = within(screen.getByRole('table')).getAllByRole('row');
            expect(rows.map((row) => row.textContent)).toEqual(['AreaFailedChangedNewRemovedReviewed', 'Feed03000/3', 'UI00110/2']);
        });

        it('shows failed stories and components with no story', async () => {
            await openReport(testManifest([...sampleEntries, failedEntry], { missingStories: ['components/ui/NoStory.tsx'] }));
            expect(screen.getByRole('heading', { name: 'Failed' })).toBeInTheDocument();
            expect(screen.getByRole('heading', { name: 'Components with no story' })).toBeInTheDocument();
            expect(screen.getByText('components/ui/NoStory.tsx')).toBeInTheDocument();
        });

        it('opens the first story of an area from its row', async () => {
            await openReport(testManifest(sampleEntries));
            fireEvent.click(button('UI'));
            expect(await screen.findByText('UI / Badge')).toBeInTheDocument();
        });

        it('opens a biggest change on the capture it shows', async () => {
            await openReport(testManifest([sampleEntries[1], { ...sampleEntries[2], percent: 9 }]));
            fireEvent.click(button(/PostCard \/ Default/));
            expect(await screen.findByText('Feed / PostCard')).toBeInTheDocument();
            expect(button(/EN Desktop/)).toHaveAttribute('aria-pressed', 'true');
        });

        it('names failed stories like the other lists, and opens them', async () => {
            const broken = testEntry('feed-post-count--broken--en--mobile', {
                storyId: 'feed-post-count--broken',
                title: 'Feed/Post/Count',
                name: 'Broken',
                state: 'failed',
                percent: 0,
                afterHash: null,
                error: 'Boom',
                images: {},
            });
            await openReport(testManifest([...sampleEntries, broken]));
            const failed = within(screen.getByRole('heading', { name: 'Failed' }).closest('section') as HTMLElement);
            fireEvent.click(failed.getByRole('button', { name: /^Count \/ Broken.*1 capture$/ }));
            expect(await screen.findByRole('heading', { name: 'Broken' })).toBeInTheDocument();
        });

        it('lists up to 6 same-change groups, and opens one', async () => {
            const entries = Array.from({ length: 14 }, (_, index) =>
                testEntry(`capture-${index}`, { storyId: `story-${index}`, changeKey: `same-${Math.floor(index / 2)}` }),
            );
            const groups = Array.from({ length: 7 }, (_, index) => ({ key: `same-${index}`, kind: 'exact' as const }));
            await openReport(testManifest(entries, { groups }));
            const rows = within(screen.getByRole('heading', { name: 'Same change' }).closest('section') as HTMLElement).getAllByRole('button');
            expect(rows).toHaveLength(6);
            fireEvent.click(rows[0]);
            expect(await screen.findByRole('button', { name: 'Looks right for all 2' })).toBeInTheDocument();
        });

        it('survives a report with no differences', async () => {
            await openReport(testManifest([]));
            expect(screen.getByRole('heading', { name: '0 of 1078 captures differ' })).toBeInTheDocument();
            expect(screen.getByText('0 to review')).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'Start review' })).not.toBeInTheDocument();
            expect(screen.queryByText('Nothing matches these filters.')).not.toBeInTheDocument();
        });
    });

    describe('reviewing', () => {
        it('moves through the review, and undoes a mark', async () => {
            await openReport(testManifest(sampleEntries));
            expect(progress()).toHaveTextContent('0 of 5 captures reviewed');

            fireEvent.click(button('Start review'));
            expect(await screen.findByText('Feed / Composer')).toBeInTheDocument();
            expect(screen.getByText('1 of 4')).toBeInTheDocument();

            fireEvent.click(button('Looks right'));
            expect(await screen.findByText('Feed / PostCard')).toBeInTheDocument();
            expect(progress()).toHaveTextContent('1 of 5 captures reviewed');

            fireEvent.click(button('← Previous'));
            expect(await screen.findByText('Feed / Composer')).toBeInTheDocument();

            fireEvent.click(button('Undo reviewed'));
            expect(progress()).toHaveTextContent('0 of 5 captures reviewed');
            expect(button('Looks right')).toBeInTheDocument();
        });

        it('keeps focus on the mark button when it turns into Undo', async () => {
            window.location.hash = '#ui-button--primary';
            await openReport(testManifest(sampleEntries));
            button('Looks right').focus();
            fireEvent.click(button('Looks right'));
            expect(button('Undo reviewed')).toHaveFocus();
        });

        it('keeps focus on the review button from Start to Looks right', async () => {
            await openReport(testManifest(sampleEntries));
            button('Start review').focus();
            fireEvent.click(button('Start review'));
            expect(await screen.findByText('Feed / Composer')).toBeInTheDocument();
            expect(button('Looks right')).toHaveFocus();
        });

        it('continues from the first item not yet reviewed', async () => {
            const manifest = testManifest(sampleEntries);
            seedMarks(manifest, [sampleEntries[0]]);
            await openReport(manifest);
            fireEvent.click(button('Continue review'));
            expect(await screen.findByText('Feed / PostCard')).toBeInTheDocument();
        });

        it('links to the PR once everything is reviewed', async () => {
            const manifest = testManifest(sampleEntries);
            seedMarks(manifest, sampleEntries);
            await openReport(manifest);
            expect(screen.getByRole('link', { name: 'Approve in the PR' })).toHaveAttribute(
                'href',
                'https://github.com/CodeGetItGR/storywall/pull/263',
            );
            expect(screen.getByText('0 to review')).toBeInTheDocument();
        });

        it('has no PR links on a local run, and nothing to start once everything is reviewed', async () => {
            const manifest = testManifest(sampleEntries, { pull: undefined });
            seedMarks(manifest, sampleEntries);
            await openReport(manifest);
            expect(screen.queryByRole('link')).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /review$/ })).not.toBeInTheDocument();
        });

        it('offers nothing to start when the filters hide everything left to review', async () => {
            const manifest = testManifest(sampleEntries);
            seedMarks(manifest, [sampleEntries[4]]);
            await openReport(manifest);
            fireEvent.click(button(/^New/));
            expect(screen.queryByRole('button', { name: /review$/ })).not.toBeInTheDocument();
        });

        it('keeps marks through a new commit when hashes match, and clears them when not', async () => {
            const manifest = testManifest(sampleEntries);
            seedMarks(manifest, [sampleEntries[0], { ...sampleEntries[1], afterHash: 'an-older-hash' }]);
            await openReport(manifest);
            expect(progress()).toHaveTextContent('1 of 5 captures reviewed');
        });

        it('takes in marks saved in another tab', async () => {
            const manifest = testManifest(sampleEntries);
            await openReport(manifest);
            seedMarks(manifest, [sampleEntries[0]]);
            fireEvent(window, new StorageEvent('storage', { key: marksKey(manifest) }));
            expect(progress()).toHaveTextContent('1 of 5 captures reviewed');
            fireEvent.click(button('Continue review'));
            fireEvent.click(await screen.findByRole('button', { name: 'Looks right' }));
            expect(progress()).toHaveTextContent('3 of 5 captures reviewed');
        });
    });

    describe('failed stories', () => {
        it('has no Looks right, and blocks the approve link', async () => {
            const manifest = testManifest([...sampleEntries, failedEntry]);
            seedMarks(manifest, sampleEntries);
            window.location.hash = '#ui-card--broken';
            await openReport(manifest);
            expect(screen.getByText('This story failed')).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: 'Looks right' })).not.toBeInTheDocument();
            expect(screen.getByText('Fix the failed stories first')).toBeInTheDocument();
            expect(screen.queryByRole('link', { name: 'Approve in the PR' })).not.toBeInTheDocument();
        });

        it('keeps Looks right on a story with one failed capture', async () => {
            const failedOne = testEntry('feed-postcard--default--el--desktop', {
                locale: 'el',
                width: 'desktop',
                state: 'failed',
                percent: 0,
                afterHash: null,
                error: 'Boom',
                images: {},
            });
            window.location.hash = '#feed-postcard--default';
            await openReport(testManifest([...sampleEntries, failedOne]));
            fireEvent.click(button(/EL Desktop/));
            expect(screen.getByText('This story failed')).toBeInTheDocument();
            fireEvent.click(button('Looks right'));
            expect(progress()).toHaveTextContent('2 of 5 captures reviewed');
        });
    });

    describe('story screen', () => {
        it('shows one tab per capture, and keeps the chosen tab on the next story', async () => {
            window.location.hash = '#feed-postcard--default';
            await openReport(testManifest(sampleEntries));
            expect(button(/EN Mobile/)).toHaveTextContent('EN Mobile3.67%');
            expect(button(/EL Mobile/)).toHaveTextContent('EL Mobileno change');
            expect(button(/EL Mobile/)).toBeDisabled();
            fireEvent.click(button(/EN Desktop/));
            expect(button(/EN Desktop/)).toHaveAttribute('aria-pressed', 'true');
            expect(screen.getByRole('img', { name: /desktop, before$/ })).toBeInTheDocument();

            fireEvent.click(button('Next →'));
            expect(await screen.findByText('UI / Badge')).toBeInTheDocument();
            fireEvent.click(button('← Previous'));
            expect(await screen.findByText('Feed / PostCard')).toBeInTheDocument();
            expect(button(/EN Desktop/)).toHaveAttribute('aria-pressed', 'true');
        });

        it('switches between side by side, slider and diff', async () => {
            window.location.hash = '#feed-postcard--default';
            await openReport(testManifest(sampleEntries));
            fireEvent.click(button('Slider'));
            expect(screen.getByRole('slider')).toBeInTheDocument();
            fireEvent.click(button('Diff'));
            expect(screen.getByRole('img', { name: /diff$/ })).toBeInTheDocument();
        });

        it('disables comparing on a new story', async () => {
            window.location.hash = '#ui-button--primary';
            await openReport(testManifest(sampleEntries));
            expect(button('Slider')).toBeDisabled();
            expect(button('Side by side')).toHaveAttribute('aria-pressed', 'false');
            expect(button('Fit')).toBeEnabled();
        });

        it('fits the slider whatever zoom was chosen', async () => {
            window.location.hash = '#feed-postcard--default';
            await openReport(testManifest(sampleEntries));
            fireEvent.keyDown(document, { code: 'KeyZ', key: 'z' });
            fireEvent.keyDown(document, { code: 'Digit2', key: '2' });
            expect(document.querySelector('.stage')).toHaveClass('zoom-fit');
            expect(button('100%')).toHaveAttribute('aria-pressed', 'false');
            fireEvent.keyDown(document, { code: 'Digit1', key: '1' });
            expect(button('100%')).toHaveAttribute('aria-pressed', 'true');
        });
    });

    describe('same change', () => {
        const grouped = () => testManifest(groupedEntries, { groups: [colorGroup] });

        it('appears only when the report has groups', async () => {
            await openReport(testManifest(sampleEntries));
            expect(screen.queryByRole('button', { name: 'Same change' })).not.toBeInTheDocument();
        });

        it('is absent for a report from before grouping', async () => {
            const entries = sampleEntries.map((entry) => {
                const old: Partial<typeof entry> = { ...entry };
                delete old.changeKey;
                return old as typeof entry;
            });
            await openReport(testManifest(entries, { groups: undefined }));
            expect(screen.queryByRole('button', { name: 'Same change' })).not.toBeInTheDocument();
        });

        it('moves the list to By area for a story listed only in groups', async () => {
            await openReport(grouped());
            fireEvent.click(button('Same change'));
            window.location.hash = '#feed-postcard--default';
            expect(await screen.findByText('Feed / PostCard')).toBeInTheDocument();
            expect(button('By area')).toHaveAttribute('aria-pressed', 'true');
        });

        it('marks every capture in a group, then moves on', async () => {
            await openReport(grouped());
            fireEvent.click(button('Same change'));
            fireEvent.click(list().getByRole('button', { name: /Color change/ }));
            expect(await screen.findByRole('button', { name: 'Looks right for all 3' })).toBeInTheDocument();
            expect(screen.getByText('3 captures, 2 stories')).toBeInTheDocument();
            fireEvent.click(button('Looks right for all 3'));
            expect(progress()).toHaveTextContent('3 of 5 captures reviewed');
            expect(await screen.findByText('UI / Badge')).toBeInTheDocument();
        });

        it('undoes a whole group', async () => {
            const manifest = grouped();
            seedMarks(manifest, groupedEntries.slice(0, 3));
            window.location.hash = '#group-color-1';
            await openReport(manifest);
            expect(progress()).toHaveTextContent('3 of 5 captures reviewed');
            fireEvent.click(button('Undo reviewed'));
            expect(progress()).toHaveTextContent('0 of 5 captures reviewed');
        });

        it('shows a picked thumbnail from the top', async () => {
            window.location.hash = '#group-color-1';
            await openReport(grouped());
            const stage = document.querySelector('.stage') as HTMLElement;
            // jsdom has no layout, so the stage keeps its scroll position here.
            let top = 400;
            Object.defineProperty(stage, 'scrollTop', { configurable: true, get: () => top, set: (value: number) => (top = value) });
            fireEvent.click(button(/PostCard \/ Default.*EN Desktop/));
            expect(top).toBe(0);
        });

        it('shows the capture picked from the thumbnails', async () => {
            window.location.hash = '#group-color-1';
            await openReport(grouped());
            expect(screen.getByText('Showing PostCard / Default, EN Mobile')).toBeInTheDocument();
            fireEvent.click(button(/PostCard \/ Default.*EN Desktop/));
            expect(screen.getByText('Showing PostCard / Default, EN Desktop')).toBeInTheDocument();
        });

        it('shows the first 60 thumbnails, then all of them', async () => {
            const entries = Array.from({ length: 62 }, (_, index) =>
                testEntry(`capture-${index}`, { storyId: `story-${index}`, changeKey: 'same-1' }),
            );
            window.location.hash = '#group-same-1';
            await openReport(testManifest(entries, { groups: [{ key: 'same-1', kind: 'exact' }] }));
            expect(document.querySelectorAll('.thumb')).toHaveLength(60);
            fireEvent.click(button('Show all 62'));
            expect(document.querySelectorAll('.thumb')).toHaveLength(62);
        });

        it('lists the groups, then the stories on their own', async () => {
            const nested = testEntry('feed-post-count--default--en--mobile', { storyId: 'feed-post-count--default', title: 'Feed/Post/Count' });
            await openReport(testManifest([...groupedEntries, nested], { groups: [colorGroup] }));
            fireEvent.click(button('Same change'));
            expect(list().getByRole('heading', { name: 'Same change' })).toBeInTheDocument();
            expect(list().getByRole('button', { name: /Color change/ })).toBeInTheDocument();
            expect(list().getByRole('heading', { name: 'On their own' })).toBeInTheDocument();
            expect(list().getByRole('button', { name: /Badge \/ Old/ })).toBeInTheDocument();
            expect(list().getByRole('button', { name: /Count \/ Default/ })).toBeInTheDocument();
            expect(list().queryByRole('button', { name: /PostCard|Post \/ Count/ })).not.toBeInTheDocument();
        });
    });

    describe('addresses', () => {
        it('opens a story from its address', async () => {
            window.location.hash = '#ui-badge--old';
            await openReport(testManifest(sampleEntries));
            expect(screen.getByText('UI / Badge')).toBeInTheDocument();
        });

        it('opens a group from its address, in the list that holds it', async () => {
            window.location.hash = '#group-color-1';
            await openReport(testManifest(groupedEntries, { groups: [colorGroup] }));
            expect(screen.getByRole('button', { name: 'Same change' })).toHaveAttribute('aria-pressed', 'true');
            expect(screen.getByRole('heading', { name: 'Color change' })).toBeInTheDocument();
        });

        it('opens the Overview for an address that matches nothing', async () => {
            window.location.hash = '#nothing-here';
            await openReport(testManifest(sampleEntries));
            expect(screen.getByRole('heading', { name: '5 of 1078 captures differ' })).toBeInTheDocument();
        });

        it('follows the back button', async () => {
            await openReport(testManifest(sampleEntries));
            window.location.hash = '#ui-badge--old';
            expect(await screen.findByText('UI / Badge')).toBeInTheDocument();
            window.location.hash = '';
            expect(await screen.findByRole('heading', { name: '5 of 1078 captures differ' })).toBeInTheDocument();
        });
    });

    describe('shortcuts', () => {
        it('work by key position on a Greek keyboard', async () => {
            window.location.hash = '#feed-postcard--default';
            await openReport(testManifest(sampleEntries));
            fireEvent.keyDown(document, { code: 'KeyC', key: 'ψ' });
            expect(button(/EN Desktop/)).toHaveAttribute('aria-pressed', 'true');
            fireEvent.keyDown(document, { code: 'KeyR', key: 'ρ' });
            expect(progress()).toHaveTextContent('2 of 5 captures reviewed');
            expect(await screen.findByText('UI / Badge')).toBeInTheDocument();
        });

        it('switch the compare view and zoom', async () => {
            window.location.hash = '#feed-postcard--default';
            await openReport(testManifest(sampleEntries));
            fireEvent.keyDown(document, { code: 'Digit2', key: '2' });
            expect(screen.getByRole('slider')).toBeInTheDocument();
            fireEvent.keyDown(document, { code: 'Digit1', key: '1' });
            fireEvent.keyDown(document, { code: 'KeyZ', key: 'z' });
            expect(button('100%')).toHaveAttribute('aria-pressed', 'true');
        });

        it('act once when held, apart from the arrows', async () => {
            window.location.hash = '#feed-composer--default';
            await openReport(testManifest(sampleEntries));
            fireEvent.keyDown(document, { code: 'KeyR', key: 'r', repeat: true });
            expect(progress()).toHaveTextContent('0 of 5 captures reviewed');
            fireEvent.keyDown(document, { code: 'ArrowRight', key: 'ArrowRight', repeat: true });
            expect(await screen.findByText('Feed / PostCard')).toBeInTheDocument();
        });

        it('stay out of the way while typing', async () => {
            window.location.hash = '#feed-postcard--default';
            await openReport(testManifest(sampleEntries));
            fireEvent.keyDown(screen.getByRole('textbox', { name: 'Find a story' }), { code: 'KeyR', key: 'r' });
            expect(progress()).toHaveTextContent('0 of 5 captures reviewed');
        });

        it('move focus to search', async () => {
            await openReport(testManifest(sampleEntries));
            fireEvent.keyDown(document, { code: 'Slash', key: '/' });
            expect(screen.getByRole('textbox', { name: 'Find a story' })).toHaveFocus();
            expect(document.querySelector('.side')).not.toHaveClass('open');
        });

        it('open and close the help', async () => {
            await openReport(testManifest(sampleEntries));
            fireEvent.keyDown(document, { code: 'Slash', key: '?' });
            expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
            fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('do nothing behind the help but close it', async () => {
            window.location.hash = '#feed-composer--default';
            await openReport(testManifest(sampleEntries));
            fireEvent.keyDown(document, { code: 'Slash', key: '?' });
            fireEvent.keyDown(document, { code: 'KeyR', key: 'r' });
            expect(progress()).toHaveTextContent('0 of 5 captures reviewed');
            fireEvent.keyDown(document, { code: 'Slash', key: '?' });
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('the dialog takes focus, holds the page still, and gives focus back', async () => {
            window.location.hash = '#feed-composer--default';
            await openReport(testManifest(sampleEntries));
            button('Looks right').focus();
            fireEvent.keyDown(document, { code: 'Slash', key: '?' });
            expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toHaveAttribute('aria-modal', 'true');
            expect(button('Close')).toHaveFocus();
            expect(document.querySelector('main')).toHaveAttribute('inert');
            expect(document.querySelector('.side')).toHaveAttribute('inert');
            fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
            expect(button('Looks right')).toHaveFocus();
            expect(document.querySelector('main')).not.toHaveAttribute('inert');
            expect(document.querySelector('.side')).not.toHaveAttribute('inert');
        });

        it('open the help from its button, and close it with Close or the backdrop', async () => {
            await openReport(testManifest(sampleEntries));
            fireEvent.click(button('Keyboard shortcuts'));
            fireEvent.click(button('Close'));
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            fireEvent.click(button('Keyboard shortcuts'));
            fireEvent.click(document.querySelector('.scrim') as Element);
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('open the drawer to reach search in a narrow window', async () => {
            await openReport(testManifest(sampleEntries));
            const search = screen.getByRole('textbox', { name: 'Find a story' });
            const side = document.querySelector('.side') as HTMLElement;
            const focus = HTMLElement.prototype.focus;
            // Under 880px the closed drawer hides the search box, and a hidden element can't take focus.
            vi.spyOn(search, 'focus').mockImplementation(function (this: HTMLElement) {
                if (side.classList.contains('open')) focus.call(this);
            });
            fireEvent.keyDown(document, { code: 'Slash', key: '/' });
            expect(side).toHaveClass('open');
            expect(search).toHaveFocus();
        });

        it('leave zoom alone where it is turned off', async () => {
            window.location.hash = '#feed-postcard--default';
            await openReport(testManifest(sampleEntries));
            fireEvent.keyDown(document, { code: 'Digit2', key: '2' });
            fireEvent.keyDown(document, { code: 'KeyZ', key: 'z' });
            fireEvent.keyDown(document, { code: 'Digit1', key: '1' });
            expect(button('Fit')).toHaveAttribute('aria-pressed', 'true');
        });

        it('switch list mode only when there are groups', async () => {
            await openReport(testManifest(sampleEntries));
            fireEvent.keyDown(document, { code: 'KeyG', key: 'g' });
            expect(list().getByRole('button', { name: /Feed/ })).toBeInTheDocument();
        });
    });

    describe('sidebar', () => {
        it('links to the PR and shows the commit', async () => {
            await openReport(testManifest(sampleEntries));
            expect(screen.getByRole('link', { name: 'PR #263' })).toHaveAttribute('href', 'https://github.com/CodeGetItGR/storywall/pull/263');
            expect(screen.getByText('aaaaaaa')).toBeInTheDocument();
        });

        it('marks the open story, in a group named after its component, and scrolls to it', async () => {
            window.location.hash = '#feed-postcard--default';
            await openReport(testManifest(sampleEntries));
            const row = list().getByRole('button', { name: /Default/ });
            expect(row).toHaveAttribute('aria-current', 'true');
            expect(row).toHaveAccessibleName(/^Changed.*Default/);
            expect(list().getByRole('group', { name: 'PostCard' })).toContainElement(row);
            expect(list().getByRole('button', { name: 'Overview' })).not.toHaveAttribute('aria-current');
            expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts).toContain(row);
        });

        it('opens and closes areas and components', async () => {
            await openReport(testManifest(sampleEntries));
            expect(list().queryByRole('button', { name: /^Composer/ })).not.toBeInTheDocument();
            fireEvent.click(list().getByRole('button', { name: /^Feed/ }));
            expect(list().getByRole('button', { name: /^Feed/ })).toHaveAttribute('aria-expanded', 'true');
            fireEvent.click(list().getByRole('button', { name: /^Composer/ }));
            expect(list().getByRole('button', { name: /Default/ })).toBeInTheDocument();
            fireEvent.click(list().getByRole('button', { name: /^Feed/ }));
            expect(list().queryByRole('button', { name: /^Composer/ })).not.toBeInTheDocument();
        });

        it('ticks a reviewed story', async () => {
            window.location.hash = '#feed-composer--default';
            await openReport(testManifest(sampleEntries));
            expect(list().queryByRole('img', { name: 'Reviewed' })).not.toBeInTheDocument();
            fireEvent.click(button('Looks right'));
            expect(await list().findByRole('img', { name: 'Reviewed' })).toBeInTheDocument();
        });
    });

    describe('filters', () => {
        it('narrow the list and the review order by search', async () => {
            await openReport(testManifest(sampleEntries));
            expect(screen.getByText('4 to review')).toBeInTheDocument();
            fireEvent.change(screen.getByRole('textbox', { name: 'Find a story' }), { target: { value: 'Button' } });
            expect(screen.getByText('1 to review')).toBeInTheDocument();
            expect(list().queryByRole('button', { name: /^Feed/ })).not.toBeInTheDocument();
            fireEvent.click(list().getByRole('button', { name: /Primary/ }));
            expect(await screen.findByText('UI / Button')).toBeInTheDocument();
        });

        it('narrow by state', async () => {
            await openReport(testManifest(sampleEntries));
            fireEvent.click(button(/^New/));
            expect(screen.getByText('1 to review')).toBeInTheDocument();
            expect(list().queryByRole('button', { name: /^Feed/ })).not.toBeInTheDocument();
        });

        it('hide reviewed captures', async () => {
            const manifest = testManifest(sampleEntries);
            seedMarks(manifest, [sampleEntries[0]]);
            await openReport(manifest);
            expect(screen.getByText('3 to review')).toBeInTheDocument();
            fireEvent.click(screen.getByRole('checkbox', { name: 'Hide reviewed' }));
            window.location.hash = '#feed-postcard--default';
            expect(await screen.findByText('1 of 3')).toBeInTheDocument();
        });

        it('keep the rows as they were once the search is cleared', async () => {
            await openReport(testManifest(sampleEntries));
            const search = screen.getByRole('textbox', { name: 'Find a story' });
            fireEvent.change(search, { target: { value: 'Button' } });
            expect(list().getByRole('button', { name: /^UI/ })).toHaveAttribute('aria-disabled', 'true');
            fireEvent.click(list().getByRole('button', { name: /^UI/ }));
            fireEvent.change(search, { target: { value: '' } });
            expect(list().getByRole('button', { name: /^UI/ })).toHaveAttribute('aria-expanded', 'false');
            expect(list().getByRole('button', { name: /^UI/ })).toHaveAttribute('aria-disabled', 'false');
        });

        it('say when nothing matches', async () => {
            await openReport(testManifest(sampleEntries));
            fireEvent.change(screen.getByRole('textbox', { name: 'Find a story' }), { target: { value: 'nothing like this' } });
            expect(list().getByRole('status')).toHaveTextContent('Nothing matches these filters.');
        });
    });

    describe('phone drawer', () => {
        it('puts focus back on Stories after a row is picked, or Esc in its search', async () => {
            await openReport(testManifest(sampleEntries));
            fireEvent.click(button('Stories'));
            fireEvent.click(list().getByRole('button', { name: 'Overview' }));
            expect(button('Stories')).toHaveFocus();
            fireEvent.click(button('Stories'));
            const search = screen.getByRole('textbox', { name: 'Find a story' });
            search.focus();
            fireEvent.keyDown(search, { key: 'Escape', code: 'Escape' });
            expect(button('Stories')).toHaveFocus();
        });

        it('takes focus back from the help over it, and Esc closes both', async () => {
            await openReport(testManifest(sampleEntries));
            fireEvent.click(button('Stories'));
            const row = list().getByRole('button', { name: 'Overview' });
            expect(row).toHaveFocus();
            fireEvent.keyDown(document, { code: 'Slash', key: '?' });
            fireEvent.click(button('Close'));
            expect(row).toHaveFocus();
            fireEvent.keyDown(document, { code: 'Slash', key: '?' });
            fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
            expect(document.querySelector('.side')).not.toHaveClass('open');
            expect(button('Stories')).toHaveFocus();
        });

        it('moves focus into the list and back, and closes on Esc', async () => {
            await openReport(testManifest(sampleEntries));
            const stories = button('Stories');
            expect(stories).toHaveAttribute('aria-expanded', 'false');
            stories.focus();
            fireEvent.click(stories);
            expect(stories).toHaveAttribute('aria-expanded', 'true');
            expect(list().getByRole('button', { name: 'Overview' })).toHaveFocus();
            fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
            expect(document.querySelector('.side')).not.toHaveClass('open');
            expect(stories).toHaveFocus();
        });

        it('opens, and closes on a row or the backdrop', async () => {
            await openReport(testManifest(sampleEntries));
            fireEvent.click(button('Stories'));
            expect(document.querySelector('.side')).toHaveClass('open');
            expect(document.querySelector('.scrim')).toHaveClass('scrim-drawer');
            fireEvent.click(document.querySelector('.scrim') as Element);
            expect(document.querySelector('.side')).not.toHaveClass('open');
            fireEvent.click(button('Stories'));
            fireEvent.click(list().getByRole('button', { name: 'Overview' }));
            expect(document.querySelector('.side')).not.toHaveClass('open');
        });
    });
});
