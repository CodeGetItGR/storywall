import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { produce } from 'immer';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BackgroundSettings } from '@/components/saveMyDate/editor/settings/BackgroundSettings';
import { DressCodeSettings } from '@/components/saveMyDate/editor/settings/DressCodeSettings';
import { FollowEventSettings } from '@/components/saveMyDate/editor/settings/FollowEventSettings';
import { LocationsSettings } from '@/components/saveMyDate/editor/settings/LocationsSettings';
import { ProgramItemsSettings } from '@/components/saveMyDate/editor/settings/ProgramItemsSettings';
import { SettingsTextField } from '@/components/saveMyDate/editor/settings/SettingsTextField';
import { StyleFields } from '@/components/saveMyDate/editor/settings/StyleFields';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import type { InvitationDocument } from '@/lib/invitation/document';
import { readEditableDraft } from '@/lib/invitation/drafts';
import { eventFieldLinks } from '@/lib/invitation/eventData';
import type { InvitationEventData } from '@/lib/invitation/eventLinks';
import { sampleDraftDto } from '@/lib/invitation/sampleDraft';
import type { InvitationSection } from '@/lib/invitation/sections';
import { type DocumentRecipe, settingsGroups } from '@/lib/invitation/sectionSettings';
import { COUNTDOWN_FIELDS } from '@/lib/invitation/sectionStyleFields';
import { keyboardDrag, layOut } from '@/lib/testing/keyboardDrag';
import en from '@/messages/en.json';

function renderIn(node: ReactNode) {
    return render(
        <NextIntlClientProvider locale="en" messages={en}>
            {node}
        </NextIntlClientProvider>,
    );
}

type HostBackgrounds = InvitationSection['style']['hostBackgrounds'];

// A settings scope over one section of the sample draft. Its edits apply to a copy of the draft.
// The theme has art for its top and content backgrounds.
function scopeFor<T extends InvitationSection['type']>(
    type: T,
    {
        isAdmin = false,
        hostBackgrounds,
        following,
        event = null,
    }: { isAdmin?: boolean; hostBackgrounds?: HostBackgrounds; following?: boolean; event?: InvitationEventData | null } = {},
) {
    const draft = readEditableDraft(sampleDraftDto());
    const theme = produce(draft.theme, (design) => {
        design.backgrounds.content.mobile = { mediaId: 'm-1' };
    });
    let document: InvitationDocument = produce(draft.document, (next) => {
        const target = next.sections.find((item) => item.type === type)!;
        if (hostBackgrounds) target.style.hostBackgrounds = hostBackgrounds;
        if (following !== undefined) target.link = { source: 'event', enabled: following };
    });
    const edit = vi.fn((recipe: DocumentRecipe) => {
        document = produce(document, recipe);
    });
    const section = document.sections.find((item) => item.type === type) as SectionOf<T>;
    const scope: SettingsScope<SectionOf<T>> = {
        section,
        edit,
        mode: isAdmin ? 'admin' : 'host',
        isAdmin,
        theme,
        media: draft.media,
        fonts: [],
        draftId: draft.id,
        addUploaded: vi.fn(),
        event,
        eventSamples: null,
        eventFieldLinks: event ? eventFieldLinks('e1') : null,
    };
    return { scope, edit, edited: () => document.sections.find((item) => item.id === section.id) as SectionOf<T> };
}

afterEach(cleanup);

describe('StyleFields', () => {
    it('leaves fonts to admins', () => {
        const onChange = vi.fn();
        const { unmount } = renderIn(<StyleFields groups={COUNTDOWN_FIELDS} values={{}} isAdmin={false} fonts={[]} onChange={onChange} />);
        expect(screen.queryByText('Font')).not.toBeInTheDocument();
        unmount();

        renderIn(<StyleFields groups={COUNTDOWN_FIELDS} values={{}} isAdmin fonts={[]} onChange={onChange} />);
        expect(screen.getByText('Font')).toBeInTheDocument();
    });

    it('applies a size in range as it is typed and keeps it in range when left', () => {
        const onChange = vi.fn();
        renderIn(<StyleFields groups={COUNTDOWN_FIELDS} values={{ size: 44 }} isAdmin={false} fonts={[]} onChange={onChange} />);
        const size = screen.getByLabelText('Number size (px)');
        expect(size).toHaveValue(44);
        expect(size).toHaveAttribute('placeholder', '48');

        fireEvent.change(size, { target: { value: '60' } });
        expect(onChange).toHaveBeenLastCalledWith('size', 60);

        onChange.mockClear();
        fireEvent.change(size, { target: { value: '900' } });
        expect(onChange).not.toHaveBeenCalled();
        fireEvent.blur(size);
        expect(onChange).toHaveBeenLastCalledWith('size', 400);
    });

    it('sets a colour and puts it back to the default', () => {
        const onChange = vi.fn();
        renderIn(<StyleFields groups={COUNTDOWN_FIELDS} values={{ color: '#2f2b2d' }} isAdmin={false} fonts={[]} onChange={onChange} />);

        fireEvent.change(screen.getByLabelText('Color'), { target: { value: '#112233' } });
        expect(onChange).toHaveBeenLastCalledWith('color', '#112233');

        fireEvent.click(screen.getByRole('button', { name: 'Default' }));
        expect(onChange).toHaveBeenLastCalledWith('color', undefined);
    });
});

describe('SettingsTextField', () => {
    it('saves a link when left, written in full', () => {
        const onSave = vi.fn();
        renderIn(<SettingsTextField label="Website" value="" onSave={onSave} isLink />);
        const field = screen.getByLabelText('Website');

        fireEvent.change(field, { target: { value: 'hotel.gr' } });
        expect(onSave).not.toHaveBeenCalled();
        fireEvent.blur(field);
        expect(onSave).toHaveBeenCalledWith('https://hotel.gr');
    });

    it('keeps a bad link out and says so', () => {
        const onSave = vi.fn();
        renderIn(<SettingsTextField label="Website" value="https://old.gr" onSave={onSave} isLink />);
        const field = screen.getByLabelText('Website');

        fireEvent.change(field, { target: { value: 'not a link' } });
        fireEvent.blur(field);
        expect(onSave).not.toHaveBeenCalled();
        expect(field).toHaveAttribute('aria-invalid', 'true');
        expect(field).toHaveAccessibleDescription("This link isn't valid.");
    });
});

describe('BackgroundSettings', () => {
    it('gives admins automatic, every background and what the host may pick', () => {
        const { scope, edited } = scopeFor('countdown', { isAdmin: true, hostBackgrounds: { enabled: false, allowed: [] } });
        renderIn(<BackgroundSettings scope={scope} />);
        const choices = screen.getByRole('radiogroup', { name: 'Background' });
        expect(within(choices).getAllByRole('radio')).toHaveLength(3);
        expect(within(choices).getByRole('radio', { name: 'Automatic' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('switch', { name: 'The host can change it' }));
        expect(edited().style.hostBackgrounds).toEqual({ enabled: true, allowed: ['top', 'content'] });
    });

    it('shows hosts only the backgrounds the admin allowed, each with its picture', () => {
        const { scope } = scopeFor('countdown', { hostBackgrounds: { enabled: true, allowed: ['content'] } });
        renderIn(<BackgroundSettings scope={scope} />);

        const choices = screen.getByRole('radiogroup', { name: 'Background' });
        expect(within(choices).getAllByRole('radio')).toHaveLength(1);
        expect(within(choices).getByRole('img', { name: 'Background 2' })).toBeInTheDocument();
        expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    });
});

describe('FollowEventSettings', () => {
    const event: InvitationEventData = {
        eventType: 'WEDDING',
        title: 'Maria & Nikos',
        timezone: 'Europe/Athens',
        startAt: '2027-07-12T15:30:00Z',
        rsvp: null,
        cover: { mediaId: 'm-cover', width: 1600, height: 1000 },
        location: { name: null, address: null, mapsUrl: null },
        sessions: null,
        joinUrl: null,
    };

    it('is offered to hosts on a cover linked to its event, first, and never to admins, unlinked or locked sections', () => {
        const linked = scopeFor('photo', { following: true }).scope;
        expect(settingsGroups(linked.section, 'host', linked.theme)[0]).toBe('follow');
        expect(settingsGroups(linked.section, 'admin', linked.theme)).not.toContain('follow');
        const unlinked = scopeFor('photo').scope;
        expect(settingsGroups(unlinked.section, 'host', unlinked.theme)).not.toContain('follow');
        const locked = scopeFor('date', { following: true }).scope;
        expect(settingsGroups(locked.section, 'host', locked.theme)).not.toContain('follow');
    });

    it('says what following means, and stops following when switched off', () => {
        const { scope, edited } = scopeFor('photo', { following: true, event });
        renderIn(<FollowEventSettings scope={scope} />);
        expect(screen.getByText(en.InvitationEditor.sectionSettings.followEventHint)).toBeInTheDocument();
        const toggle = screen.getByRole('switch', { name: 'Follow the event' });
        expect(toggle).toBeChecked();

        fireEvent.click(toggle);
        expect(edited().link).toEqual({ source: 'event', enabled: false });
    });

    it("follows again when switched on, and shows the event's cover at once", () => {
        const { scope, edited } = scopeFor('photo', { following: false, event });
        renderIn(<FollowEventSettings scope={scope} />);
        const toggle = screen.getByRole('switch', { name: 'Follow the event' });
        expect(toggle).not.toBeChecked();

        fireEvent.click(toggle);
        expect(edited().link).toEqual({ source: 'event', enabled: true });
        expect(edited().data.photo).toEqual({ source: 'event', mediaId: 'm-cover' });
    });
});

describe('Locked by the event', () => {
    const event: InvitationEventData = {
        eventType: 'WEDDING',
        title: 'Maria & Nikos',
        timezone: 'Europe/Athens',
        startAt: '2027-07-12T15:30:00Z',
        rsvp: null,
        cover: null,
        location: { name: 'Agios Nikolaos', address: 'Plaka', mapsUrl: 'https://maps.google.com/?q=agios' },
        sessions: [
            {
                id: 'ses-1',
                title: 'Ceremony',
                description: null,
                startAt: '2027-07-12T15:30:00Z',
                locationName: 'Agios Nikolaos',
                locationAddress: 'Plaka',
                mapsUrl: 'https://maps.google.com/?q=agios',
                displayOrder: 0,
                isMain: true,
                isSecondary: false,
            },
        ],
        joinUrl: null,
    };

    it("offers no new moments on the event's schedule, and says where to change them", () => {
        renderIn(<ProgramItemsSettings scope={scopeFor('programIcons', { event }).scope} />);
        expect(screen.queryByRole('button', { name: en.InvitationEditor.sectionSettings.addMoment })).toBeNull();
        expect(screen.getByRole('link', { name: en.InvitationEditor.eventLock.schedule })).toHaveAttribute('href', '/events/e1/tools/schedule');
    });

    it("keeps the event's moments in the schedule's order", () => {
        renderIn(<ProgramItemsSettings scope={scopeFor('programIcons', { event }).scope} />);
        expect(screen.queryByRole('button', { name: en.InvitationEditor.sectionSettings.reorder })).toBeNull();
    });

    it('moves moments while the event has no schedule', async () => {
        const { scope, edited } = scopeFor('programIcons', { event: { ...event, sessions: null } });
        renderIn(<ProgramItemsSettings scope={scope} />);
        layOut(screen.getAllByRole('listitem'));
        await keyboardDrag(screen.getAllByRole('button', { name: en.InvitationEditor.sectionSettings.reorder })[0], ['ArrowDown']);
        expect(edited().data.items.map((item) => item.id)).toEqual(['p2', 'p1', 'p3']);
    });

    it('adds moments while the event has no schedule', () => {
        renderIn(<ProgramItemsSettings scope={scopeFor('programIcons', { event: { ...event, sessions: null } }).scope} />);
        expect(screen.getByRole('button', { name: en.InvitationEditor.sectionSettings.addMoment })).toBeInTheDocument();
        expect(screen.queryByText(en.InvitationEditor.eventLock.note, { exact: false })).toBeNull();
    });

    it("sends the event's place to its settings, and keeps the map link of a place the event lacks", () => {
        renderIn(<LocationsSettings scope={scopeFor('locations', { event }).scope} />);
        expect(screen.getByRole('link', { name: en.InvitationEditor.eventLock.settings })).toHaveAttribute('href', '/events/e1/manage?tab=settings');
        // No reception on the event: its map link stays the host's.
        expect(screen.getAllByLabelText(en.InvitationEditor.sectionSettings.mapLink)).toHaveLength(1);
    });

    it('keeps the map link of a place the event has no map for', () => {
        const sessions = event.sessions!.map((session) => ({ ...session, mapsUrl: null }));
        renderIn(<LocationsSettings scope={scopeFor('locations', { event: { ...event, sessions, location: { ...event.location, mapsUrl: null } } }).scope} />);
        expect(screen.queryByRole('link', { name: en.InvitationEditor.eventLock.settings })).toBeNull();
        expect(screen.getAllByLabelText(en.InvitationEditor.sectionSettings.mapLink)).toHaveLength(2);
    });
});

describe('LocationsSettings', () => {
    it('shows the welcome place with its switch, and hides it again', () => {
        const copy = en.InvitationEditor.sectionSettings;
        const { scope, edit, edited } = scopeFor('locations');
        const { rerender } = renderIn(<LocationsSettings scope={scope} />);
        const welcome = screen.getByRole('switch', { name: copy.showWelcome });
        expect(welcome).not.toBeChecked();
        expect(screen.getAllByLabelText(copy.mapLink)).toHaveLength(2);

        fireEvent.click(welcome);
        expect(edit).toHaveBeenCalledOnce();
        expect(edited().data.welcomeEnabled).toBe(true);

        rerender(
            <NextIntlClientProvider locale="en" messages={en}>
                <LocationsSettings scope={{ ...scope, section: edited() }} />
            </NextIntlClientProvider>,
        );
        expect(screen.getByRole('switch', { name: copy.showWelcome })).toBeChecked();
        expect(screen.getAllByLabelText(copy.mapLink)).toHaveLength(3);
    });
});

describe('DressCodeSettings', () => {
    it('adds a colour like the last one, and removes one', () => {
        const { scope, edited } = scopeFor('dressCode');
        const { rerender } = renderIn(<DressCodeSettings scope={scope} />);

        fireEvent.click(screen.getByRole('button', { name: 'Add color' }));
        expect(edited().data.colors).toEqual(['#b8dfd3', '#efe7ec', '#efe7ec']);

        rerender(
            <NextIntlClientProvider locale="en" messages={en}>
                <DressCodeSettings scope={{ ...scope, section: edited() }} />
            </NextIntlClientProvider>,
        );
        fireEvent.click(screen.getAllByRole('button', { name: 'Remove color #b8dfd3' })[0]);
        expect(edited().data.colors).toEqual(['#efe7ec', '#efe7ec']);
    });
});
