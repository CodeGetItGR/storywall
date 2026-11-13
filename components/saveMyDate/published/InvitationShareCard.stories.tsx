import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { InvitationShareCard } from '@/components/saveMyDate/published/InvitationShareCard';
import el from '@/messages/el.json';

// The link preview picture of an invitation with no photo, at its real 1200×630. The share image route
// draws the same markup with Alegreya; here it falls back to the browser's serif.
const meta = {
    title: 'SaveMyDate/Published/InvitationShareCard',
    component: InvitationShareCard,
    parameters: { layout: 'fullscreen' },
    tags: ['visual-desktop-only'],
    // Γάμος 002's colours.
    args: { text: 'Άγγελος & Αλεξάνδρα', background: '#f8f3e8', color: '#703c77', accent: '#be92c3', fontFamily: 'Georgia, serif' },
} satisfies Meta<typeof InvitationShareCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CoupleNames: Story = {};

// Πριγίπισσα: a baptism theme with no top photo and no top background.
export const SingleName: Story = { args: { text: 'Αφροδίτη', background: '#ffffff', color: '#db667e', accent: '#f09d9d' } };

export const LongTitle: Story = {
    args: { text: 'Μαρία-Ελένη Παπαδοπούλου & Κωνσταντίνος-Αλέξανδρος Γεωργίου, μαζί με τις οικογένειές τους' },
};

// An invitation whose top section has no text.
export const PlainTitle: Story = { args: { text: el.PublishedInvitation.metaTitle } };
