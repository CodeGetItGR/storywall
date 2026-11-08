import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { onlySection } from '@/.storybook/invitation';
import { InvitationRenderer } from '@/components/saveMyDate/invitation/InvitationRenderer';
import { PREVIEW_THEME, previewDocument, previewMedia } from '@/lib/saveMyDatePreview';

// The preview page's "Greek" story, one section per story, so a change to one
// section is one small diff in the visual check.
const DOCUMENT = previewDocument();

const meta = {
    title: 'SaveMyDate/Pages/Preview Sections/Greek',
    component: InvitationRenderer,
    parameters: { layout: 'fullscreen' },
    args: { document: DOCUMENT, theme: PREVIEW_THEME, media: previewMedia },
} satisfies Meta<typeof InvitationRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

const only = (id: string): Story => ({ args: { document: onlySection(DOCUMENT, id) } });

export const Top = only('s-top');
export const BlankInvite = only('s-blank-1');
export const BlankProgram = only('s-blank-2');
export const BlankClosing = only('s-blank-3');
export const Invitation = only('s-invitation');
export const CoupleNames = only('s-coupleNames');
export const DateSection = only('s-date');
export const Countdown = only('s-countdown');
export const Faq = only('s-faq');
export const DressCode = only('s-dressCode');
export const Contact = only('s-contact');
export const CoupleContact = only('s-coupleContact');
export const Baby = only('s-baby');
export const Parents = only('s-parents');
export const ParentsSimple = only('s-parentsSimple');
export const ParentsPhoto = only('s-parentsPhoto');
export const Godparents = only('s-godparents');
export const CoupleProfiles = only('s-coupleProfiles');
export const CoupleProfilesSimple = only('s-coupleProfilesSimple');
export const WeddingSponsors = only('s-weddingSponsors');
export const WeddingSponsorsSimple = only('s-weddingSponsorsSimple');
export const OurStoryProposal = only('s-ourStoryProposal');
export const Program = only('s-program');
export const ProgramIcons = only('s-programIcons');
export const Locations = only('s-locations');
export const Accommodation = only('s-accommodation');
export const Gift = only('s-gift');
export const Rsvp = only('s-rsvp');
export const Photo = only('s-photo');
export const Gallery = only('s-gallery');
export const PhotoFrame = only('s-photoFrame');
export const Footer = only('s-footer');
