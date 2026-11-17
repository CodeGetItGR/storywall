import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { EVERY_SECTION_DOCUMENT, onlySection, STORY_THEME, storyInvitationMedia } from '@/.storybook/invitation';
import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';

// InvitationRenderer's "Every Section" story, one section per story, so a
// change to one section is one small diff in the visual check.
const meta = {
    title: 'SaveMyDate/InvitationRenderer Sections/Every Section',
    component: InvitationRenderer,
    parameters: { layout: 'fullscreen' },
    args: { document: EVERY_SECTION_DOCUMENT, theme: STORY_THEME, media: storyInvitationMedia },
} satisfies Meta<typeof InvitationRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

const only = (id: string): Story => ({ args: { document: onlySection(EVERY_SECTION_DOCUMENT, id) } });

export const Top = only('s-top');
export const Baby = only('s-baby');
export const ParentsPhoto = only('s-parentsPhoto');
export const Godparents = only('s-godparents');
export const ParentsSimple = only('s-parentsSimple');
export const Invitation = only('s-invitation');
export const DateSection = only('s-date');
export const Countdown = only('s-countdown');
export const Locations = only('s-locations');
export const Parents = only('s-parents');
export const Rsvp = only('s-rsvp');
export const Gift = only('s-gift');
export const Accommodation = only('s-accommodation');
export const Program = only('s-program');
export const ProgramIcons = only('s-programIcons');
export const Contact = only('s-contact');
export const Gallery = only('s-gallery');
export const Faq = only('s-faq');
export const Blank = only('s-blank');
export const Photo = only('s-photo');
export const CoupleNames = only('s-coupleNames');
export const OurStoryProposal = only('s-ourStoryProposal');
export const DressCode = only('s-dressCode');
export const CoupleContact = only('s-coupleContact');
export const WeddingSponsors = only('s-weddingSponsors');
export const CoupleProfiles = only('s-coupleProfiles');
export const CoupleProfilesSimple = only('s-coupleProfilesSimple');
export const WeddingSponsorsSimple = only('s-weddingSponsorsSimple');
export const PhotoFrame = only('s-photoFrame');
export const Footer = only('s-footer');
