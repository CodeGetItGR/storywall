import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useFeedScheduleCardPart } from '@/hooks/useFeedScheduleCardPart';
import type { EventDetailResponseDto } from '@/lib/api/types';
import { feedModuleSection } from '@/lib/feedModuleBlocks';
import { createFeedModeSection } from '@/lib/feedSections';
import type { InvitationSection } from '@/lib/invitation/sections';
import en from '@/messages/en.json';

const viewer = vi.hoisted(() => ({ isHost: true }));
vi.mock('@/providers/EventProvider', () => ({ useIsHost: () => viewer.isHost }));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => (key: string) => ({ name: `module ${key}` }) }));

afterEach(() => {
    cleanup();
    viewer.isHost = true;
});

const block = feedModuleSection('schedule', () => 'module');
const todays = createFeedModeSection('feedSchedule', () => 'today');
const event = {
    id: 'e1',
    eventType: 'WEDDING',
    modules: [{ moduleKey: 'schedule', isAvailable: true }],
    schedule: { startAt: '2030-06-20T16:00:00Z', timezone: 'Europe/Athens' },
    sessions: [],
} as unknown as EventDetailResponseDto;

function Card({ section, shown = event, underTools }: { section: InvitationSection; shown?: EventDetailResponseDto; underTools?: boolean }) {
    return useFeedScheduleCardPart(shown, underTools)(section);
}

function draw(props: Parameters<typeof Card>[0]) {
    return render(
        <NextIntlClientProvider locale="en" messages={en}>
            <Card {...props} />
        </NextIntlClientProvider>,
    ).container;
}

describe('useFeedScheduleCardPart', () => {
    it("opens the schedule's editor from the host's card, named after its block", () => {
        draw({ section: block });
        expect(screen.getByText('module schedule')).toBeTruthy();
        expect(screen.getByRole('link', { name: en.FeedEditor.moduleOpen }).getAttribute('href')).toBe('/events/e1/tools/schedule?section=schedule');
        cleanup();
        draw({ section: todays });
        expect(screen.getByText(en.InvitationEditor.sectionNames.feedSchedule)).toBeTruthy();
    });

    it('leaves room for the tools in edit mode', () => {
        expect(draw({ section: todays, underTools: true }).firstElementChild).toHaveClass('pt-18');
    });

    it('draws nothing for a guest, another block, or an event without the module', () => {
        expect(draw({ section: feedModuleSection('playlist') }).innerHTML).toBe('');
        expect(draw({ section: block, shown: { ...event, modules: [] } }).innerHTML).toBe('');
        viewer.isHost = false;
        expect(draw({ section: block }).innerHTML).toBe('');
        expect(draw({ section: todays }).innerHTML).toBe('');
    });
});
