import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TypeStep } from '@/components/event/create/wizard/type/TypeStep';

const form = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const config = vi.hoisted(() => ({ current: null as unknown }));

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (key: string) => `${ns}.${key}` }));
vi.mock('@/providers/createEvent/CreateEventFormContext', () => ({ useCreateEventForm: () => form.current }));
vi.mock('@/hooks/useAppConfig', () => ({ useAppConfig: () => ({ data: config.current }) }));
vi.mock('@/hooks/useLocalizedAppEventTypeCopy', () => ({
    useLocalizedAppEventTypeCopy: () => (key: string) => ({ name: key === 'WEDDING' ? 'Wedding' : 'Baptism', tagline: '' }),
}));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => (key: string) => ({ name: `name:${key}` }) }));
vi.mock('@/components/common/ProtectedImage', () => ({
    // eslint-disable-next-line @next/next/no-img-element
    ProtectedImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const TYPES = [
    { id: 'w', eventTypeKey: 'WEDDING', imageUrl: null, sortOrder: 1 },
    { id: 'b', eventTypeKey: 'BAPTISM', imageUrl: null, sortOrder: 2 },
];
const MODULES = ['gallery', 'qr_cards', 'wishbook', 'rsvp', 'stories', 'playlist', 'schedule', 'co_hosts'].map((moduleKey, sortOrder) => ({
    moduleKey,
    isEnabled: true,
    sortOrder,
}));
const ALL_KEYS = MODULES.map((module) => module.moduleKey);

function plan(code: string, sortOrder: number, moduleKeys: string[]) {
    return { code, sortOrder, scope: 'EVENT', isPublic: true, isAssignable: true, eventTypeKey: 'WEDDING', moduleKeys, paidModules: [] };
}

function setup(plans = [plan('P', 1, ALL_KEYS)]) {
    const onSelectEventType = vi.fn();
    form.current = { eventTypes: TYPES, selectedEventType: 'WEDDING', onSelectEventType };
    config.current = { modules: MODULES, planTiers: plans };
    render(<TypeStep progress={<span>progress</span>} />);
    return { onSelectEventType };
}

afterEach(cleanup);

describe('TypeStep', () => {
    it('shows the picked type photo, the heading and the types as radios', () => {
        setup();
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('CreateEventPage.wizard.type.heading');
        const radios = screen.getAllByRole('radio');
        expect(radios.map((radio) => radio.textContent)).toEqual(['Wedding', 'Baptism']);
        expect(radios[0]).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByRole('radio', { name: 'Wedding' })).toBeInTheDocument();
        expect(screen.getAllByAltText('Wedding')[0]).toHaveAttribute('src', '/landing/03-wedding-ceremony-santorini.webp');
    });

    it('moves the pick with the arrow keys', () => {
        const { onSelectEventType } = setup();
        fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' });
        expect(onSelectEventType).toHaveBeenCalledWith('BAPTISM');
    });

    it('lists the big four with their lines and the small row by name', () => {
        setup();
        expect(screen.getByText('name:gallery')).toBeInTheDocument();
        expect(screen.getByText('Modules.gallery.description')).toBeInTheDocument();
        expect(screen.getByText('CreateEventPage.wizard.features.lines.qr_cards')).toBeInTheDocument();
        expect(screen.getByText('name:co_hosts')).toBeInTheDocument();
        expect(screen.queryByText('CreateEventPage.wizard.features.planNote')).toBeNull();
    });

    it('shows the plan note when a feature is not in every plan', () => {
        setup([plan('A', 1, ['gallery']), plan('B', 2, ALL_KEYS)]);
        expect(screen.getByText('CreateEventPage.wizard.features.planNote')).toBeInTheDocument();
    });
});
