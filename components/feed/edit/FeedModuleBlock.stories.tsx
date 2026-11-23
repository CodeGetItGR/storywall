import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ChevronDown } from 'lucide-react';
import { useCallback, useState } from 'react';
import { fn } from 'storybook/test';

import { FeedEditBlock } from '@/components/feed/edit/FeedEditBlock';
import { SAMPLE_SECTIONS } from '@/lib/invitation/samples';
import type { InvitationSection } from '@/lib/invitation/sections';
import { cn } from '@/lib/utils';

// A static mockup for the owner's review (plan 7c, Gate B): the module block and the Premium tiles' arrow. Task 10
// swaps it for the real component's stories. The words are story data (the approved wording).

const TILES = [
    ['rsvp', 'RSVP'],
    ['wishbook', 'Wishbook'],
    ['playlist', 'Playlist'],
    ['he_or_she', 'Boy or Girl?'],
    ['quiz_polls', 'Quiz & Polls'],
    ['schedule', 'Schedule'],
    ['wishlist', 'Gift account'],
    ['gallery', 'Gallery'],
] as const;

function ModuleBlockMock() {
    return (
        <div className="mx-4 my-3 flex flex-col items-center gap-2 rounded-2xl bg-white px-4 py-5 text-center shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
            {/* Icon and name */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/modules/playlist.svg" alt="Playlist" width={40} height={40} className="h-10 w-10" />
            <p className="text-[15px] font-semibold text-ink">Playlist</p>

            {/* Open the tool */}
            <span className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-[14px] font-semibold text-white">Open</span>
        </div>
    );
}

function Page({ children }: { children: React.ReactNode }) {
    return <div className="min-h-[320px] bg-[#f4efe9] py-6">{children}</div>;
}

function TilesMock({ initiallyOpen }: { initiallyOpen: boolean }) {
    const [open, setOpen] = useState(initiallyOpen);
    const toggle = useCallback(() => setOpen((current) => !current), []);
    const shown = open ? TILES : TILES.slice(0, 4);

    return (
        <div className="flex flex-col gap-3 bg-white px-5 py-5 text-sm text-ink">
            {/* Premium */}
            <h3 className="text-[13px] font-semibold tracking-wide text-ink-muted uppercase">Premium</h3>

            {/* Tiles */}
            <div className="flex flex-col items-center gap-2">
                <ul className="grid w-full grid-cols-4 gap-2">
                    {shown.map(([module, name]) => (
                        <li key={module}>
                            <span className="flex min-h-20 w-full flex-col items-center justify-center gap-1.5 rounded-xl bg-surface-muted px-1 text-center text-[12px] leading-tight text-ink">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`/icons/modules/${module}.svg`} alt={name} width={26} height={26} className="h-6.5 w-6.5" />
                                {name}
                            </span>
                        </li>
                    ))}
                </ul>

                {/* The rest */}
                <button
                    type="button"
                    onClick={toggle}
                    aria-expanded={open}
                    aria-label={open ? 'Show less' : 'Show more'}
                    title={open ? 'Show less' : 'Show more'}
                    className="grid h-10 w-10 place-items-center rounded-full text-ink-muted hover:bg-surface-muted"
                >
                    <ChevronDown className={cn('h-5 w-5 transition-transform', open && 'rotate-180')} aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}

const section = { ...(SAMPLE_SECTIONS.dressCode as InvitationSection), id: 'module' };

const meta = { title: 'Feed/Edit/Module block (mockup)', component: ModuleBlockMock } satisfies Meta<typeof ModuleBlockMock>;
export default meta;
type Story = StoryObj<typeof meta>;

// The block guests see.
export const Block: Story = {
    render: () => (
        <Page>
            <ModuleBlockMock />
        </Page>
    ),
};

// In edit mode: plan 7b's tools around it, no settings.
export const InEditMode: Story = {
    render: () => (
        <Page>
            <DndContext>
                <SortableContext items={['module']}>
                    <FeedEditBlock
                        section={section}
                        name="Playlist"
                        controls={{ canHide: true, canDelete: true, movable: true, canMoveUp: true, canMoveDown: true }}
                        hasSettings={false}
                        actions={{ onToggleVisible: fn(), onDelete: fn(), onOpenSettings: fn() }}
                    >
                        <ModuleBlockMock />
                    </FeedEditBlock>
                </SortableContext>
            </DndContext>
        </Page>
    ),
};

// The Add section sheet's Premium tiles: one row, and the arrow.
export const TilesClosed: Story = { render: () => <TilesMock initiallyOpen={false} /> };
export const TilesOpen: Story = { render: () => <TilesMock initiallyOpen /> };
