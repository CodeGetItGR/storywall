import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedModeSection } from '@/components/feed/sections/FeedModeSection';
import type { FeedScheduleItem } from '@/hooks/useFeedSchedule';
import type { FeedScheduleRsvpLink } from '@/hooks/useFeedScheduleRsvp';
import type { EventDetailResponseDto } from '@/lib/api/types';
import type { InvitationSection } from '@/lib/invitation/sections';
import en from '@/messages/en.json';
import { ComposerContext, type ComposerContextValue } from '@/providers/composer/ComposerContext';

const schedule = vi.hoisted(() => ({ items: null as FeedScheduleItem[] | null }));
vi.mock('@/hooks/useFeedSchedule', () => ({ useFeedSchedule: () => schedule.items }));
const rsvp = vi.hoisted(() => ({ link: null as ((sessionId: string) => FeedScheduleRsvpLink) | null }));
vi.mock('@/hooks/useFeedScheduleRsvp', () => ({ useFeedScheduleRsvp: () => rsvp.link }));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => (key: string) => ({ name: key === 'rsvp' ? 'RSVP' : key }) }));

afterEach(() => {
    cleanup();
    schedule.items = null;
    rsvp.link = null;
});

const event = { id: 'e-1', sessions: [], schedule: { startAt: null, timezone: null } } as unknown as EventDetailResponseDto;
const media = () => undefined;
const section = (type: string, data: object) =>
    ({ id: type, type, name: type, visible: true, locked: false, data, textStyles: {}, elements: [], style: {} }) as unknown as InvitationSection;

function renderSection(node: ReactNode, composer: Partial<ComposerContextValue> = {}) {
    const value = { openPostComposer: vi.fn(), canComposePost: true, ...composer } as ComposerContextValue;
    render(
        <NextIntlClientProvider locale="en" messages={en}>
            <ComposerContext.Provider value={value}>{node}</ComposerContext.Provider>
        </NextIntlClientProvider>,
    );
    return value;
}

describe('feed sections', () => {
    it('draws the schedule with Now on the current session and the past ones greyed', () => {
        schedule.items = [
            { id: 'a', time: '16:00', title: 'Church', place: 'St. Nicholas', state: 'done', rsvpEnabled: false },
            { id: 'b', time: '19:00', title: 'Party', place: null, state: 'now', rsvpEnabled: false },
        ];
        renderSection(<FeedModeSection media={media} event={event} section={section('feedSchedule', {})} />);
        expect(screen.getByRole('heading', { name: en.InvitationEditor.sectionNames.feedSchedule })).toBeTruthy();
        expect(screen.getByText(en.ManagePage.journey.now)).toBeTruthy();
        expect(screen.getByText('Church').closest('li')?.dataset.state).toBe('done');
    });

    it('opens Add to calendar from the schedule, only while there is something to add', () => {
        schedule.items = [{ id: 'b', time: '19:00', title: 'Party', place: null, state: 'upcoming', rsvpEnabled: false }];
        const timed = {
            ...event,
            title: 'Wedding',
            schedule: { startAt: '2030-06-20T16:00:00Z', timezone: 'Europe/Athens' },
            sessions: [{ id: 'b', title: 'Party', startAt: '2030-06-20T16:00:00Z', endAt: null, locationName: null, deletedAt: null, isMain: false }],
        } as unknown as EventDetailResponseDto;
        renderSection(<FeedModeSection media={media} event={timed} section={section('feedSchedule', {})} />);
        fireEvent.click(screen.getByRole('button', { name: en.FeedPage.addToCalendar }));
        expect(screen.getByRole('dialog', { name: en.FeedPage.addToCalendar })).toBeTruthy();

        cleanup();
        renderSection(<FeedModeSection media={media} event={event} section={section('feedSchedule', {})} />);
        expect(screen.queryByRole('button', { name: en.FeedPage.addToCalendar })).toBeNull();
    });

    it("puts the RSVP button on a session that takes answers, and the guest's answer once given", () => {
        schedule.items = [
            { id: 'church', time: '16:00', title: 'Church', place: null, state: 'done', rsvpEnabled: true },
            { id: 'party', time: '19:00', title: 'Party', place: null, state: 'upcoming', rsvpEnabled: true },
            { id: 'cake', time: '22:00', title: 'Cake', place: null, state: 'upcoming', rsvpEnabled: false },
            { id: 'brunch', time: '23:00', title: 'Brunch', place: null, state: 'upcoming', rsvpEnabled: true },
        ];
        const answers: Record<string, FeedScheduleRsvpLink['answer']> = { party: 'attending', brunch: 'declined' };
        rsvp.link = (sessionId) => ({ answer: answers[sessionId] ?? null, href: `/rsvp?session=${sessionId}` });
        renderSection(<FeedModeSection media={media} event={event} section={section('feedSchedule', {})} />);
        expect(screen.getByRole('link', { name: 'RSVP', description: 'Church' }).getAttribute('href')).toBe('/rsvp?session=church');
        expect(screen.getByRole('link', { name: en.RSVPPage.stats.attending, description: 'Party' }).getAttribute('href')).toBe('/rsvp?session=party');
        expect(screen.getByRole('link', { name: en.RSVPPage.stats.declined, description: 'Brunch' }).getAttribute('href')).toBe('/rsvp?session=brunch');
        expect(screen.getAllByRole('link')).toHaveLength(3);
    });

    it("has no RSVP button for whom the form isn't", () => {
        schedule.items = [{ id: 'church', time: '16:00', title: 'Church', place: null, state: 'upcoming', rsvpEnabled: true }];
        renderSection(<FeedModeSection media={media} event={event} section={section('feedSchedule', {})} />);
        expect(screen.queryByRole('link')).toBeNull();
    });

    it("draws nothing when there's nothing to show, or the placeholder in edit mode", () => {
        const { container } = render(
            <NextIntlClientProvider locale="en" messages={en}>
                <FeedModeSection media={media} event={event} section={section('feedSchedule', {})} />
            </NextIntlClientProvider>,
        );
        expect(container.textContent).toBe('');
        renderSection(<FeedModeSection media={media} event={event} section={section('feedPrompt', { text: '' })} placeholder={<span>empty</span>} />);
        expect(screen.getByText('empty')).toBeTruthy();
    });

    it('opens the post composer from the photo prompt', () => {
        const composer = renderSection(
            <FeedModeSection media={media} event={event} section={section('feedPrompt', { text: 'Show us your best dance move' })} />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Show us your best dance move' }));
        expect(composer.openPostComposer).toHaveBeenCalledOnce();
    });

    it("shows the prompt without a button to a viewer who can't post", () => {
        renderSection(<FeedModeSection media={media} event={event} section={section('feedPrompt', { text: 'Show us' })} />, {
            canComposePost: false,
        });
        expect(screen.queryByRole('button')).toBeNull();
        expect(screen.getByText('Show us')).toBeTruthy();
    });
});
