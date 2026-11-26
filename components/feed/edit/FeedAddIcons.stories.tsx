import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const SECTIONS = [
    'invitation',
    'coupleNames',
    'coupleProfiles',
    'coupleProfilesSimple',
    'parentsSimple',
    'weddingSponsorsSimple',
    'coupleContact',
    'date',
    'countdown',
    'locations',
    'photo',
    'blank',
    'parents',
    'weddingSponsors',
    'gallery',
    'ourStoryProposal',
    'program',
    'dressCode',
    'faq',
    'accommodation',
    'gift',
    'contact',
    'baby',
    'parentsPhoto',
    'godparents',
    'feedSchedule',
    'feedPrompt',
    'feedHeOrShe',
    'feedPinned',
];
const MODULES = ['rsvp', 'wishbook', 'playlist', 'he_or_she', 'quiz_polls', 'schedule', 'wishlist', 'gallery'];
const GROUPS: [string, string[]][] = [
    ['sections', SECTIONS],
    ['modules', MODULES],
];

// Every new icon next to today's quick action icons, for the owner's review (plan 7c, Gate A). The alt is the file
// name: this is a review page, not product UI.
function Icons({ size }: { size: number }) {
    return (
        <div className="flex flex-col gap-6 bg-white p-6 text-sm text-ink">
            {/* Today's icons */}
            <div className="flex gap-4">
                {['camera', 'wishbook', 'present', 'music'].map((name) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={name} src={`/icons/${name}.svg`} alt={name} width={size} height={size} style={{ width: size, height: size }} />
                ))}
            </div>

            {/* Sections and modules */}
            {GROUPS.map(([folder, names]) => (
                <div key={folder} className="flex flex-col gap-2">
                    <p className="text-[12px] font-semibold text-ink-muted uppercase">{folder}</p>
                    <div className="grid grid-cols-4 gap-4 sm:grid-cols-8">
                        {names.map((name) => (
                            <figure key={name} className="flex flex-col items-center gap-1">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={`/icons/${folder}/${name}.svg`}
                                    alt={name}
                                    width={size}
                                    height={size}
                                    style={{ width: size, height: size }}
                                />
                                <figcaption className="text-[11px]">{name}</figcaption>
                            </figure>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

const meta = { title: 'Feed/Edit/Add section icons (review)', component: Icons, args: { size: 26 } } satisfies Meta<typeof Icons>;
export default meta;
type Story = StoryObj<typeof meta>;

export const All: Story = {};
export const Large: Story = { args: { size: 52 } };
